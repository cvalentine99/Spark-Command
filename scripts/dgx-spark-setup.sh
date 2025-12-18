#!/bin/bash
#===============================================================================
# DGX Spark Cluster Setup Script
# Automated installation of monitoring exporters and configuration
# 
# Usage: ./dgx-spark-setup.sh [OPTIONS]
#
# Options:
#   --node-type     master|worker (default: auto-detect)
#   --master-ip     IP address of master node (required for worker)
#   --prometheus    IP:PORT of Prometheus server (default: master:9090)
#   --skip-dcgm     Skip DCGM exporter installation
#   --skip-node     Skip Node exporter installation
#   --skip-spark    Skip Spark metrics configuration
#   --uninstall     Remove all installed components
#   --help          Show this help message
#
# Example:
#   Master: ./dgx-spark-setup.sh --node-type master
#   Worker: ./dgx-spark-setup.sh --node-type worker --master-ip 192.168.100.10
#===============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
NODE_TYPE="auto"
MASTER_IP=""
PROMETHEUS_SERVER=""
SKIP_DCGM=false
SKIP_NODE=false
SKIP_SPARK=false
UNINSTALL=false

# Versions
DCGM_EXPORTER_VERSION="3.3.5-3.4.0"
NODE_EXPORTER_VERSION="1.7.0"

# Paths
INSTALL_DIR="/opt/dgx-spark-monitoring"
CONFIG_DIR="/etc/dgx-spark"
LOG_DIR="/var/log/dgx-spark"

#-------------------------------------------------------------------------------
# Helper Functions
#-------------------------------------------------------------------------------

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "This script must be run as root (use sudo)"
        exit 1
    fi
}

check_dgx_spark() {
    # Check if this is a DGX Spark system
    if ! command -v nvidia-smi &> /dev/null; then
        log_error "NVIDIA driver not found. Is this a DGX Spark system?"
        exit 1
    fi
    
    # Check for GB10 Superchip (Blackwell GPU)
    GPU_NAME=$(nvidia-smi --query-gpu=name --format=csv,noheader | head -1)
    log_info "Detected GPU: $GPU_NAME"
}

detect_node_type() {
    # Auto-detect based on hostname or IP
    HOSTNAME=$(hostname)
    if [[ "$HOSTNAME" == *"01"* ]] || [[ "$HOSTNAME" == *"master"* ]]; then
        NODE_TYPE="master"
    elif [[ "$HOSTNAME" == *"02"* ]] || [[ "$HOSTNAME" == *"worker"* ]]; then
        NODE_TYPE="worker"
    else
        log_warn "Could not auto-detect node type from hostname: $HOSTNAME"
        read -p "Is this the master node? (y/n): " IS_MASTER
        if [[ "$IS_MASTER" =~ ^[Yy]$ ]]; then
            NODE_TYPE="master"
        else
            NODE_TYPE="worker"
        fi
    fi
    log_info "Node type: $NODE_TYPE"
}

get_local_ip() {
    # Get the primary IP address
    ip route get 1 | awk '{print $7; exit}'
}

#-------------------------------------------------------------------------------
# Installation Functions
#-------------------------------------------------------------------------------

install_prerequisites() {
    log_info "Installing prerequisites..."
    
    apt-get update -qq
    apt-get install -y -qq curl wget tar jq net-tools
    
    # Install Docker if not present (for DCGM exporter)
    if ! command -v docker &> /dev/null; then
        log_info "Installing Docker..."
        curl -fsSL https://get.docker.com | sh
        systemctl enable docker
        systemctl start docker
    fi
    
    log_success "Prerequisites installed"
}

install_dcgm_exporter() {
    if [[ "$SKIP_DCGM" == true ]]; then
        log_info "Skipping DCGM exporter installation"
        return
    fi
    
    log_info "Installing DCGM Exporter v${DCGM_EXPORTER_VERSION}..."
    
    # Stop existing container if running
    docker stop dcgm-exporter 2>/dev/null || true
    docker rm dcgm-exporter 2>/dev/null || true
    
    # Run DCGM exporter container
    docker run -d \
        --name dcgm-exporter \
        --restart unless-stopped \
        --gpus all \
        --cap-add SYS_ADMIN \
        -p 9400:9400 \
        nvcr.io/nvidia/k8s/dcgm-exporter:${DCGM_EXPORTER_VERSION}-ubuntu22.04
    
    # Verify it's running
    sleep 5
    if curl -s http://localhost:9400/metrics | grep -q "DCGM_FI"; then
        log_success "DCGM Exporter installed and running on port 9400"
    else
        log_error "DCGM Exporter failed to start"
        docker logs dcgm-exporter
        exit 1
    fi
}

install_node_exporter() {
    if [[ "$SKIP_NODE" == true ]]; then
        log_info "Skipping Node exporter installation"
        return
    fi
    
    log_info "Installing Node Exporter v${NODE_EXPORTER_VERSION}..."
    
    # Download and extract
    cd /tmp
    wget -q "https://github.com/prometheus/node_exporter/releases/download/v${NODE_EXPORTER_VERSION}/node_exporter-${NODE_EXPORTER_VERSION}.linux-arm64.tar.gz"
    tar xzf "node_exporter-${NODE_EXPORTER_VERSION}.linux-arm64.tar.gz"
    
    # Install binary
    cp "node_exporter-${NODE_EXPORTER_VERSION}.linux-arm64/node_exporter" /usr/local/bin/
    chmod +x /usr/local/bin/node_exporter
    
    # Create systemd service
    cat > /etc/systemd/system/node_exporter.service << 'EOF'
[Unit]
Description=Prometheus Node Exporter
After=network.target

[Service]
Type=simple
User=root
ExecStart=/usr/local/bin/node_exporter \
    --collector.filesystem.mount-points-exclude="^/(sys|proc|dev|host|etc)($$|/)" \
    --collector.netclass.ignored-devices="^(veth.*|docker.*|br-.*)$$" \
    --web.listen-address=:9100

Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

    # Enable and start
    systemctl daemon-reload
    systemctl enable node_exporter
    systemctl start node_exporter
    
    # Verify
    sleep 2
    if curl -s http://localhost:9100/metrics | grep -q "node_cpu"; then
        log_success "Node Exporter installed and running on port 9100"
    else
        log_error "Node Exporter failed to start"
        systemctl status node_exporter
        exit 1
    fi
    
    # Cleanup
    rm -rf /tmp/node_exporter-*
}

configure_spark_metrics() {
    if [[ "$SKIP_SPARK" == true ]]; then
        log_info "Skipping Spark metrics configuration"
        return
    fi
    
    log_info "Configuring Spark metrics..."
    
    # Find Spark installation
    SPARK_HOME="${SPARK_HOME:-/opt/spark}"
    if [[ ! -d "$SPARK_HOME" ]]; then
        SPARK_HOME=$(find /opt -maxdepth 2 -name "spark*" -type d 2>/dev/null | head -1)
    fi
    
    if [[ -z "$SPARK_HOME" || ! -d "$SPARK_HOME" ]]; then
        log_warn "Spark installation not found. Skipping Spark metrics configuration."
        return
    fi
    
    log_info "Found Spark at: $SPARK_HOME"
    
    # Create metrics configuration
    mkdir -p "$SPARK_HOME/conf"
    cat > "$SPARK_HOME/conf/metrics.properties" << EOF
# DGX Spark Prometheus Metrics Configuration
*.sink.prometheusServlet.class=org.apache.spark.metrics.sink.PrometheusServlet
*.sink.prometheusServlet.path=/metrics/prometheus

# Enable all metric sources
master.source.jvm.class=org.apache.spark.metrics.source.JvmSource
worker.source.jvm.class=org.apache.spark.metrics.source.JvmSource
driver.source.jvm.class=org.apache.spark.metrics.source.JvmSource
executor.source.jvm.class=org.apache.spark.metrics.source.JvmSource
EOF

    log_success "Spark metrics configured at $SPARK_HOME/conf/metrics.properties"
}

setup_firewall() {
    log_info "Configuring firewall rules..."
    
    # Check if ufw is active
    if command -v ufw &> /dev/null && ufw status | grep -q "active"; then
        ufw allow 9100/tcp comment "Node Exporter"
        ufw allow 9400/tcp comment "DCGM Exporter"
        
        if [[ "$NODE_TYPE" == "master" ]]; then
            ufw allow 9090/tcp comment "Prometheus"
            ufw allow 3000/tcp comment "Grafana"
            ufw allow 4040/tcp comment "Spark UI"
        fi
        
        log_success "Firewall rules configured"
    else
        log_info "UFW not active, skipping firewall configuration"
    fi
}

create_config_file() {
    log_info "Creating configuration file..."
    
    mkdir -p "$CONFIG_DIR"
    
    LOCAL_IP=$(get_local_ip)
    
    cat > "$CONFIG_DIR/dgx-spark.conf" << EOF
# DGX Spark Monitoring Configuration
# Generated by setup script on $(date)

NODE_TYPE=$NODE_TYPE
NODE_IP=$LOCAL_IP
MASTER_IP=${MASTER_IP:-$LOCAL_IP}
PROMETHEUS_URL=${PROMETHEUS_SERVER:-http://${MASTER_IP:-$LOCAL_IP}:9090}

# Exporter Ports
DCGM_EXPORTER_PORT=9400
NODE_EXPORTER_PORT=9100

# Service Status
DCGM_ENABLED=$([[ "$SKIP_DCGM" == false ]] && echo "true" || echo "false")
NODE_EXPORTER_ENABLED=$([[ "$SKIP_NODE" == false ]] && echo "true" || echo "false")
SPARK_METRICS_ENABLED=$([[ "$SKIP_SPARK" == false ]] && echo "true" || echo "false")
EOF

    log_success "Configuration saved to $CONFIG_DIR/dgx-spark.conf"
}

install_prometheus_server() {
    if [[ "$NODE_TYPE" != "master" ]]; then
        return
    fi
    
    log_info "Setting up Prometheus server on master node..."
    
    # Create Prometheus configuration directory
    mkdir -p /etc/prometheus
    mkdir -p /var/lib/prometheus
    
    LOCAL_IP=$(get_local_ip)
    
    # Generate Prometheus configuration
    cat > /etc/prometheus/prometheus.yml << EOF
# DGX Spark Cluster Prometheus Configuration
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  # DCGM GPU Metrics
  - job_name: 'dcgm'
    static_configs:
      - targets:
          - '${LOCAL_IP}:9400'
          - '${MASTER_IP:-192.168.100.11}:9400'
        labels:
          cluster: 'dgx-spark'

  # Node Exporter System Metrics
  - job_name: 'node'
    static_configs:
      - targets:
          - '${LOCAL_IP}:9100'
          - '${MASTER_IP:-192.168.100.11}:9100'
        labels:
          cluster: 'dgx-spark'

  # Spark Metrics (if available)
  - job_name: 'spark'
    metrics_path: '/metrics/prometheus'
    static_configs:
      - targets:
          - '${LOCAL_IP}:4040'
        labels:
          cluster: 'dgx-spark'
EOF

    # Run Prometheus in Docker
    docker stop prometheus 2>/dev/null || true
    docker rm prometheus 2>/dev/null || true
    
    docker run -d \
        --name prometheus \
        --restart unless-stopped \
        -p 9090:9090 \
        -v /etc/prometheus:/etc/prometheus \
        -v /var/lib/prometheus:/prometheus \
        prom/prometheus:latest \
        --config.file=/etc/prometheus/prometheus.yml \
        --storage.tsdb.path=/prometheus \
        --web.enable-lifecycle
    
    sleep 5
    if curl -s http://localhost:9090/-/healthy | grep -q "Healthy"; then
        log_success "Prometheus server running on port 9090"
    else
        log_error "Prometheus server failed to start"
        docker logs prometheus
    fi
}

print_summary() {
    echo ""
    echo "==============================================================================="
    echo -e "${GREEN}DGX Spark Monitoring Setup Complete${NC}"
    echo "==============================================================================="
    echo ""
    echo "Node Type: $NODE_TYPE"
    echo "Node IP: $(get_local_ip)"
    echo ""
    echo "Services Running:"
    
    if [[ "$SKIP_DCGM" == false ]]; then
        echo "  - DCGM Exporter:  http://$(get_local_ip):9400/metrics"
    fi
    
    if [[ "$SKIP_NODE" == false ]]; then
        echo "  - Node Exporter:  http://$(get_local_ip):9100/metrics"
    fi
    
    if [[ "$NODE_TYPE" == "master" ]]; then
        echo "  - Prometheus:     http://$(get_local_ip):9090"
    fi
    
    echo ""
    echo "Configuration: $CONFIG_DIR/dgx-spark.conf"
    echo ""
    
    if [[ "$NODE_TYPE" == "master" ]]; then
        echo "Next Steps:"
        echo "  1. Run this script on the worker node:"
        echo "     ./dgx-spark-setup.sh --node-type worker --master-ip $(get_local_ip)"
        echo ""
        echo "  2. Configure the Command Center dashboard:"
        echo "     Set PROMETHEUS_URL=http://$(get_local_ip):9090 in Settings"
        echo ""
    else
        echo "Next Steps:"
        echo "  1. Verify metrics are being scraped by Prometheus"
        echo "  2. Check the Command Center dashboard for live data"
        echo ""
    fi
    
    echo "==============================================================================="
}

uninstall_all() {
    log_info "Uninstalling DGX Spark monitoring components..."
    
    # Stop and remove Docker containers
    docker stop dcgm-exporter prometheus 2>/dev/null || true
    docker rm dcgm-exporter prometheus 2>/dev/null || true
    
    # Stop and disable Node Exporter
    systemctl stop node_exporter 2>/dev/null || true
    systemctl disable node_exporter 2>/dev/null || true
    rm -f /etc/systemd/system/node_exporter.service
    rm -f /usr/local/bin/node_exporter
    systemctl daemon-reload
    
    # Remove configuration
    rm -rf "$CONFIG_DIR"
    rm -rf /etc/prometheus
    rm -rf /var/lib/prometheus
    
    log_success "All monitoring components removed"
}

show_help() {
    head -30 "$0" | tail -25
}

#-------------------------------------------------------------------------------
# Main Script
#-------------------------------------------------------------------------------

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --node-type)
            NODE_TYPE="$2"
            shift 2
            ;;
        --master-ip)
            MASTER_IP="$2"
            shift 2
            ;;
        --prometheus)
            PROMETHEUS_SERVER="$2"
            shift 2
            ;;
        --skip-dcgm)
            SKIP_DCGM=true
            shift
            ;;
        --skip-node)
            SKIP_NODE=true
            shift
            ;;
        --skip-spark)
            SKIP_SPARK=true
            shift
            ;;
        --uninstall)
            UNINSTALL=true
            shift
            ;;
        --help|-h)
            show_help
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Main execution
echo ""
echo "==============================================================================="
echo -e "${BLUE}DGX Spark Cluster Monitoring Setup${NC}"
echo "==============================================================================="
echo ""

check_root

if [[ "$UNINSTALL" == true ]]; then
    uninstall_all
    exit 0
fi

check_dgx_spark

if [[ "$NODE_TYPE" == "auto" ]]; then
    detect_node_type
fi

# Validate worker configuration
if [[ "$NODE_TYPE" == "worker" && -z "$MASTER_IP" ]]; then
    log_error "Worker node requires --master-ip to be specified"
    exit 1
fi

install_prerequisites
install_dcgm_exporter
install_node_exporter
configure_spark_metrics
setup_firewall
create_config_file

if [[ "$NODE_TYPE" == "master" ]]; then
    install_prometheus_server
fi

print_summary
