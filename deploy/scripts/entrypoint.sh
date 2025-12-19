#!/bin/bash
# =============================================================================
# DGX Spark Command Center - Container Entrypoint
# Initializes all services and handles environment configuration
# =============================================================================

set -e

echo "=============================================="
echo "  DGX Spark Command Center"
echo "  Starting services..."
echo "=============================================="

# =============================================================================
# Environment Variable Setup
# =============================================================================
echo "[1/6] Configuring environment..."

# Set defaults if not provided
export DGX_SPARK_01_IP=${DGX_SPARK_01_IP:-192.168.100.10}
export DGX_SPARK_02_IP=${DGX_SPARK_02_IP:-192.168.100.11}
export PROMETHEUS_URL=${PROMETHEUS_URL:-http://localhost:9090}
export SPARK_MASTER_URL=${SPARK_MASTER_URL:-spark://${DGX_SPARK_01_IP}:7077}
export SPARK_REST_URL=${SPARK_REST_URL:-http://${DGX_SPARK_01_IP}:6066}
export DEMO_MODE=${DEMO_MODE:-false}

echo "  DGX Spark Node 1: $DGX_SPARK_01_IP"
echo "  DGX Spark Node 2: $DGX_SPARK_02_IP"
echo "  Demo Mode: $DEMO_MODE"

# =============================================================================
# Directory Setup
# =============================================================================
echo "[2/6] Setting up directories..."

mkdir -p /var/log/supervisor
mkdir -p /var/log/nginx
mkdir -p /data/prometheus
mkdir -p /etc/prometheus/targets
mkdir -p /etc/prometheus/rules
mkdir -p /run/nginx

# Set permissions
chown -R www-data:www-data /var/log/nginx 2>/dev/null || true
chmod 755 /data/prometheus

# =============================================================================
# Generate Dynamic Prometheus Targets
# =============================================================================
echo "[3/6] Generating Prometheus targets..."

if [ "$DEMO_MODE" = "true" ]; then
    # Demo mode - use local simulators
    cat > /etc/prometheus/targets/dgx-nodes.json << EOF
[
  {
    "targets": ["localhost:9400"],
    "labels": {
      "job": "dcgm",
      "cluster": "dgx-spark-demo"
    }
  },
  {
    "targets": ["localhost:9100"],
    "labels": {
      "job": "node",
      "cluster": "dgx-spark-demo"
    }
  }
]
EOF
else
    # Production mode - use real nodes
    cat > /etc/prometheus/targets/dgx-nodes.json << EOF
[
  {
    "targets": ["${DGX_SPARK_01_IP}:9400", "${DGX_SPARK_02_IP}:9400"],
    "labels": {
      "job": "dcgm",
      "cluster": "dgx-spark"
    }
  },
  {
    "targets": ["${DGX_SPARK_01_IP}:9100", "${DGX_SPARK_02_IP}:9100"],
    "labels": {
      "job": "node",
      "cluster": "dgx-spark"
    }
  }
]
EOF
fi

# =============================================================================
# Update Prometheus Config with Environment Variables
# =============================================================================
echo "[4/6] Updating Prometheus configuration..."

if [ -f /etc/prometheus/prometheus.yml ]; then
    sed -i "s|\${DGX_SPARK_01_IP}|${DGX_SPARK_01_IP}|g" /etc/prometheus/prometheus.yml
    sed -i "s|\${DGX_SPARK_02_IP}|${DGX_SPARK_02_IP}|g" /etc/prometheus/prometheus.yml
fi

# =============================================================================
# Nginx Configuration Check
# =============================================================================
echo "[5/6] Validating Nginx configuration..."

nginx -t || {
    echo "ERROR: Nginx configuration is invalid!"
    cat /etc/nginx/nginx.conf
    exit 1
}

# =============================================================================
# Start Services
# =============================================================================
echo "[6/6] Starting services..."
echo ""
echo "=============================================="
echo "  Services Starting:"
echo "  - Nginx (port 80)"
echo "  - Node.js App (port 3000)"
echo "  - Prometheus (port 9090)"
echo "  - Node Exporter (port 9100)"
if [ "$DEMO_MODE" = "true" ]; then
    echo "  - GPU Simulator (port 9400)"
    echo "  - Spark Simulator (port 6066)"
fi
echo "=============================================="
echo ""
echo "  Access the dashboard at: http://localhost"
echo ""

# Execute the main command (supervisord)
exec "$@"
