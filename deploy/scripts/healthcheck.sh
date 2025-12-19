#!/bin/bash
# =============================================================================
# DGX Spark Command Center - Health Check
# =============================================================================

# Check Nginx
if ! curl -sf http://localhost/health > /dev/null 2>&1; then
    echo "Nginx health check failed"
    exit 1
fi

# Check Node.js app
if ! curl -sf http://localhost:3000 > /dev/null 2>&1; then
    echo "Node.js app health check failed"
    exit 1
fi

# Check Prometheus
if ! curl -sf http://localhost:9090/-/healthy > /dev/null 2>&1; then
    echo "Prometheus health check failed"
    exit 1
fi

echo "All services healthy"
exit 0
