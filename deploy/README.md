# DGX Spark Command Center - Deployment Guide

## Quick Start (One Command)

```bash
# Production deployment (requires DGX Spark nodes)
./deploy.sh --node1 192.168.100.10 --node2 192.168.100.11

# Demo mode (no hardware required - uses simulators)
./deploy.sh --demo
```

## Prerequisites

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| Docker | 20.10+ | 24.0+ |
| Docker Compose | 2.0+ | 2.20+ |
| RAM | 2GB | 4GB |
| Disk | 10GB | 20GB |
| Network | Access to DGX nodes | 10GbE |

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Docker Container                              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                      Nginx (Port 80)                     │   │
│  │   - Reverse proxy to Node.js app                        │   │
│  │   - Static file serving with caching                    │   │
│  │   - WebSocket support for real-time updates             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │               Node.js App (Port 3000)                    │   │
│  │   - React frontend (SSR)                                │   │
│  │   - tRPC API backend                                    │   │
│  │   - Prometheus query proxy                              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Prometheus (Port 9090)                      │   │
│  │   - Scrapes DCGM metrics from DGX nodes                 │   │
│  │   - Scrapes Node Exporter for system metrics            │   │
│  │   - 15-day retention                                    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │            Node Exporter (Port 9100)                     │   │
│  │   - Local system metrics                                │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DGX Spark Cluster                           │
│  ┌───────────────────────┐    ┌───────────────────────┐        │
│  │   DGX-SPARK-01        │    │   DGX-SPARK-02        │        │
│  │   (Master Node)       │    │   (Worker Node)       │        │
│  │                       │    │                       │        │
│  │   DCGM Exporter:9400  │    │   DCGM Exporter:9400  │        │
│  │   Node Exporter:9100  │    │   Node Exporter:9100  │        │
│  │   Spark Master:7077   │    │   Spark Worker:7078   │        │
│  │   Spark UI:8080       │    │                       │        │
│  └───────────────────────┘    └───────────────────────┘        │
└─────────────────────────────────────────────────────────────────┘
```

## Deployment Options

### Option 1: Production Deployment

For deployment with real DGX Spark hardware:

```bash
# 1. Clone or copy the deploy directory to your server
cd /opt/dgx-spark-command-center/deploy

# 2. Configure your node IPs
./deploy.sh --node1 <DGX_NODE_1_IP> --node2 <DGX_NODE_2_IP>

# 3. Set up exporters on each DGX Spark node
# On DGX-SPARK-01 (master):
scp scripts/dgx-spark-setup.sh dgx-admin@<NODE1_IP>:/tmp/
ssh dgx-admin@<NODE1_IP> "sudo /tmp/dgx-spark-setup.sh --node-type master"

# On DGX-SPARK-02 (worker):
scp scripts/dgx-spark-setup.sh dgx-admin@<NODE2_IP>:/tmp/
ssh dgx-admin@<NODE2_IP> "sudo /tmp/dgx-spark-setup.sh --node-type worker --master-ip <NODE1_IP>"
```

### Option 2: Demo Mode

For testing without real hardware:

```bash
./deploy.sh --demo
```

This starts:
- Command Center with mock data
- Spark REST API simulator
- GPU metrics simulator

### Option 3: Manual Docker Compose

```bash
# Create environment file
cat > .env << EOF
DGX_SPARK_01_IP=192.168.100.10
DGX_SPARK_02_IP=192.168.100.11
EOF

# Build and start
docker-compose build
docker-compose up -d

# With Grafana (optional)
docker-compose --profile full up -d
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DGX_SPARK_01_IP` | IP of master node | 192.168.100.10 |
| `DGX_SPARK_02_IP` | IP of worker node | 192.168.100.11 |
| `SPARK_MASTER_URL` | Spark master URL | spark://NODE1:7077 |
| `SPARK_REST_URL` | Spark REST API URL | http://NODE1:6066 |
| `PROMETHEUS_URL` | Internal Prometheus URL | http://localhost:9090 |
| `PAGERDUTY_SERVICE_KEY` | PagerDuty integration key | (empty) |
| `SLACK_WEBHOOK_URL` | Slack webhook for alerts | (empty) |
| `GRAFANA_USER` | Grafana admin username | admin |
| `GRAFANA_PASSWORD` | Grafana admin password | dgxspark |

### SSL/TLS Configuration

To enable HTTPS:

1. Place your certificates in `./ssl/`:
   ```
   ssl/
   ├── cert.pem
   └── key.pem
   ```

2. Uncomment the HTTPS server block in `nginx/default.conf`

3. Restart the container:
   ```bash
   docker-compose restart
   ```

### Custom Prometheus Targets

Add additional scrape targets in `config/targets/`:

```yaml
# config/targets/custom.yml
- targets:
    - "10.0.0.50:9100"
  labels:
    job: "custom-node"
    environment: "production"
```

## Operations

### Common Commands

```bash
# View logs
./deploy.sh --logs
# or
docker-compose logs -f command-center

# Check status
./deploy.sh --status
# or
docker-compose ps

# Stop services
./deploy.sh --stop
# or
docker-compose down

# Restart services
docker-compose restart

# Rebuild after code changes
docker-compose build --no-cache
docker-compose up -d
```

### Health Checks

```bash
# Container health
docker inspect dgx-spark-command-center --format='{{.State.Health.Status}}'

# Service endpoints
curl http://localhost/health          # Nginx
curl http://localhost:3000            # Node.js app
curl http://localhost:9090/-/healthy  # Prometheus
```

### Backup & Restore

```bash
# Backup Prometheus data
docker run --rm -v dgx-spark-command-center_prometheus-data:/data \
  -v $(pwd):/backup alpine tar czf /backup/prometheus-backup.tar.gz /data

# Restore
docker run --rm -v dgx-spark-command-center_prometheus-data:/data \
  -v $(pwd):/backup alpine tar xzf /backup/prometheus-backup.tar.gz -C /
```

## Troubleshooting

### Container won't start

```bash
# Check logs
docker-compose logs command-center

# Common issues:
# - Port 80 already in use: Stop other web servers
# - Permission denied: Run with sudo
# - Build failed: Check Dockerfile syntax
```

### No metrics from DGX nodes

1. Verify exporters are running on nodes:
   ```bash
   ssh dgx-admin@<NODE_IP> "systemctl status dcgm-exporter node_exporter"
   ```

2. Check network connectivity:
   ```bash
   curl http://<NODE_IP>:9400/metrics
   curl http://<NODE_IP>:9100/metrics
   ```

3. Verify Prometheus targets:
   ```bash
   curl http://localhost:9090/api/v1/targets
   ```

### Dashboard shows mock data

The dashboard falls back to mock data when:
- Prometheus is unreachable
- No metrics are being scraped
- DGX nodes are offline

Check Settings → Data Sources to verify connection status.

## Updating

```bash
# Pull latest changes
git pull

# Rebuild and restart
docker-compose build --no-cache
docker-compose up -d
```

## Security Considerations

1. **Network Isolation**: Deploy in a private network segment
2. **Firewall**: Only expose port 80/443 externally
3. **Authentication**: Configure OAuth or basic auth in Nginx
4. **TLS**: Always use HTTPS in production
5. **Secrets**: Use Docker secrets or environment files (not in git)

## Support

For issues and feature requests, please refer to the project documentation or contact your system administrator.
