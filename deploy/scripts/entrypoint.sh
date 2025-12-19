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
# Environment Variable Substitution
# =============================================================================
echo "[1/5] Configuring environment..."

# Substitute environment variables in Prometheus config
if [ -f /etc/prometheus/prometheus.yml ]; then
    envsubst < /etc/prometheus/prometheus.yml > /tmp/prometheus.yml
    mv /tmp/prometheus.yml /etc/prometheus/prometheus.yml
fi

# Set defaults if not provided
export DGX_SPARK_01_IP=${DGX_SPARK_01_IP:-192.168.100.10}
export DGX_SPARK_02_IP=${DGX_SPARK_02_IP:-192.168.100.11}
export PROMETHEUS_URL=${PROMETHEUS_URL:-http://localhost:9090}
export SPARK_MASTER_URL=${SPARK_MASTER_URL:-spark://${DGX_SPARK_01_IP}:7077}
export SPARK_REST_URL=${SPARK_REST_URL:-http://${DGX_SPARK_01_IP}:6066}

echo "  DGX Spark Node 1: $DGX_SPARK_01_IP"
echo "  DGX Spark Node 2: $DGX_SPARK_02_IP"
echo "  Spark Master: $SPARK_MASTER_URL"

# =============================================================================
# Directory Setup
# =============================================================================
echo "[2/5] Setting up directories..."

mkdir -p /var/log/supervisor
mkdir -p /var/log/nginx
mkdir -p /data/prometheus
mkdir -p /etc/prometheus/targets
mkdir -p /etc/prometheus/rules

# Set permissions
chown -R nobody:nogroup /data/prometheus 2>/dev/null || true

# =============================================================================
# Generate Dynamic Prometheus Targets
# =============================================================================
echo "[3/5] Generating Prometheus targets..."

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

# =============================================================================
# Nginx Configuration Check
# =============================================================================
echo "[4/5] Validating Nginx configuration..."

nginx -t || {
    echo "ERROR: Nginx configuration is invalid!"
    exit 1
}

# =============================================================================
# Health Check Function
# =============================================================================
wait_for_service() {
    local service=$1
    local url=$2
    local max_attempts=${3:-30}
    local attempt=1
    
    echo "  Waiting for $service..."
    while [ $attempt -le $max_attempts ]; do
        if curl -sf "$url" > /dev/null 2>&1; then
            echo "  $service is ready!"
            return 0
        fi
        sleep 1
        attempt=$((attempt + 1))
    done
    echo "  WARNING: $service did not become ready in time"
    return 1
}

# =============================================================================
# Start Services
# =============================================================================
echo "[5/5] Starting services..."
echo ""
echo "=============================================="
echo "  Services Starting:"
echo "  - Nginx (port 80)"
echo "  - Node.js App (port 3000)"
echo "  - Prometheus (port 9090)"
echo "  - Node Exporter (port 9100)"
echo "=============================================="
echo ""

# Execute the main command (supervisord)
exec "$@"
