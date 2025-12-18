#!/bin/bash
##############################################################################
# DGX Spark Node Exporter Setup Script
# Installs DCGM Exporter and Node Exporter on DGX Spark nodes
##############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}DGX Spark Monitoring Setup${NC}"
echo -e "${GREEN}========================================${NC}"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Please run as root (sudo)${NC}"
    exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi

# Check if NVIDIA Container Toolkit is installed
if ! docker info 2>/dev/null | grep -q "Runtimes.*nvidia"; then
    echo -e "${YELLOW}Warning: NVIDIA Container Toolkit may not be installed.${NC}"
    echo -e "${YELLOW}DCGM Exporter requires nvidia-container-toolkit.${NC}"
fi

##############################################################################
# Configuration
##############################################################################
DCGM_EXPORTER_VERSION="3.3.5-3.4.0-ubuntu22.04"
NODE_EXPORTER_VERSION="1.7.0"
PROMETHEUS_SERVER_IP="${PROMETHEUS_SERVER_IP:-192.168.100.1}"

echo -e "\n${YELLOW}Configuration:${NC}"
echo "  DCGM Exporter Version: ${DCGM_EXPORTER_VERSION}"
echo "  Node Exporter Version: ${NODE_EXPORTER_VERSION}"
echo "  Prometheus Server: ${PROMETHEUS_SERVER_IP}"

##############################################################################
# Stop existing containers if running
##############################################################################
echo -e "\n${YELLOW}Stopping existing exporters if running...${NC}"
docker stop dcgm-exporter 2>/dev/null || true
docker rm dcgm-exporter 2>/dev/null || true
docker stop node-exporter 2>/dev/null || true
docker rm node-exporter 2>/dev/null || true

##############################################################################
# Install DCGM Exporter
##############################################################################
echo -e "\n${GREEN}Installing DCGM Exporter...${NC}"

docker run -d \
    --name dcgm-exporter \
    --gpus all \
    --restart unless-stopped \
    -p 9400:9400 \
    --cap-add SYS_ADMIN \
    nvcr.io/nvidia/k8s/dcgm-exporter:${DCGM_EXPORTER_VERSION}

echo -e "${GREEN}✓ DCGM Exporter installed on port 9400${NC}"

##############################################################################
# Install Node Exporter
##############################################################################
echo -e "\n${GREEN}Installing Node Exporter...${NC}"

docker run -d \
    --name node-exporter \
    --restart unless-stopped \
    --net="host" \
    --pid="host" \
    -v "/:/host:ro,rslave" \
    quay.io/prometheus/node-exporter:v${NODE_EXPORTER_VERSION} \
    --path.rootfs=/host \
    --collector.filesystem.mount-points-exclude="^/(sys|proc|dev|host|etc)($$|/)" \
    --collector.netclass.ignored-devices="^(veth.*|docker.*|br-.*)$$" \
    --collector.hwmon \
    --collector.cpu.info

echo -e "${GREEN}✓ Node Exporter installed on port 9100${NC}"

##############################################################################
# Verify Installation
##############################################################################
echo -e "\n${YELLOW}Verifying installation...${NC}"

# Wait for containers to start
sleep 5

# Check DCGM Exporter
if curl -s http://localhost:9400/metrics > /dev/null 2>&1; then
    echo -e "${GREEN}✓ DCGM Exporter is responding${NC}"
    GPU_UTIL=$(curl -s http://localhost:9400/metrics | grep "DCGM_FI_DEV_GPU_UTIL" | head -1)
    if [ -n "$GPU_UTIL" ]; then
        echo -e "  Sample metric: ${GPU_UTIL:0:80}..."
    fi
else
    echo -e "${RED}✗ DCGM Exporter is not responding${NC}"
fi

# Check Node Exporter
if curl -s http://localhost:9100/metrics > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Node Exporter is responding${NC}"
    CPU_INFO=$(curl -s http://localhost:9100/metrics | grep "node_cpu_seconds_total" | head -1)
    if [ -n "$CPU_INFO" ]; then
        echo -e "  Sample metric: ${CPU_INFO:0:80}..."
    fi
else
    echo -e "${RED}✗ Node Exporter is not responding${NC}"
fi

##############################################################################
# Configure Firewall (if ufw is active)
##############################################################################
if command -v ufw &> /dev/null && ufw status | grep -q "active"; then
    echo -e "\n${YELLOW}Configuring firewall rules...${NC}"
    ufw allow from ${PROMETHEUS_SERVER_IP} to any port 9400 comment "DCGM Exporter"
    ufw allow from ${PROMETHEUS_SERVER_IP} to any port 9100 comment "Node Exporter"
    echo -e "${GREEN}✓ Firewall rules added for Prometheus server${NC}"
fi

##############################################################################
# Create systemd service files (optional, for non-Docker deployment)
##############################################################################
echo -e "\n${YELLOW}Creating systemd service files...${NC}"

cat > /etc/systemd/system/dcgm-exporter.service << 'EOF'
[Unit]
Description=DCGM Exporter Container
Requires=docker.service
After=docker.service

[Service]
Restart=always
ExecStart=/usr/bin/docker start -a dcgm-exporter
ExecStop=/usr/bin/docker stop -t 10 dcgm-exporter

[Install]
WantedBy=multi-user.target
EOF

cat > /etc/systemd/system/node-exporter.service << 'EOF'
[Unit]
Description=Node Exporter Container
Requires=docker.service
After=docker.service

[Service]
Restart=always
ExecStart=/usr/bin/docker start -a node-exporter
ExecStop=/usr/bin/docker stop -t 10 node-exporter

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable dcgm-exporter.service
systemctl enable node-exporter.service

echo -e "${GREEN}✓ Systemd services created and enabled${NC}"

##############################################################################
# Summary
##############################################################################
echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}Installation Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Exporters are now running:"
echo "  - DCGM Exporter: http://$(hostname -I | awk '{print $1}'):9400/metrics"
echo "  - Node Exporter: http://$(hostname -I | awk '{print $1}'):9100/metrics"
echo ""
echo "Add this node to your Prometheus targets:"
echo "  - DCGM: $(hostname -I | awk '{print $1}'):9400"
echo "  - Node: $(hostname -I | awk '{print $1}'):9100"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Update prometheus/targets/dcgm-targets.yml with this node's IP"
echo "2. Update prometheus/targets/node-targets.yml with this node's IP"
echo "3. Reload Prometheus configuration"
