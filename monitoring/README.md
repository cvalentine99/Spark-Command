# DGX Spark Cluster Monitoring Stack

A complete Prometheus + Grafana monitoring solution for NVIDIA DGX Spark 2-node clusters.

## Quick Start

### 1. Deploy the Monitoring Stack

```bash
cd monitoring
docker-compose up -d
```

### 2. Install Exporters on DGX Spark Nodes

Run on each DGX Spark node:

```bash
# Copy the setup script to each node
scp node-scripts/setup-exporters.sh user@dgx-spark-01:/tmp/
scp node-scripts/setup-exporters.sh user@dgx-spark-02:/tmp/

# SSH to each node and run
ssh user@dgx-spark-01 "sudo PROMETHEUS_SERVER_IP=<your-prometheus-ip> bash /tmp/setup-exporters.sh"
ssh user@dgx-spark-02 "sudo PROMETHEUS_SERVER_IP=<your-prometheus-ip> bash /tmp/setup-exporters.sh"
```

### 3. Update Target Configuration

Edit the target files to match your node IPs:

```bash
# Edit prometheus/targets/dcgm-targets.yml
# Edit prometheus/targets/node-targets.yml
```

### 4. Access the Dashboards

| Service | URL | Credentials |
|---------|-----|-------------|
| Prometheus | http://localhost:9090 | None |
| Grafana | http://localhost:3001 | admin / dgxspark2024 |
| Alertmanager | http://localhost:9093 | None |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DGX Spark Cluster (2 Nodes)                         │
├─────────────────────────────────┬───────────────────────────────────────────┤
│       DGX-SPARK-01 (Master)     │         DGX-SPARK-02 (Worker)             │
│  ┌───────────────────────────┐  │  ┌───────────────────────────────────┐    │
│  │   DCGM Exporter (:9400)   │  │  │     DCGM Exporter (:9400)         │    │
│  │   Node Exporter (:9100)   │  │  │     Node Exporter (:9100)         │    │
│  │   Spark Metrics (:4040)   │  │  │     Spark Metrics (:4040)         │    │
│  └───────────────────────────┘  │  └───────────────────────────────────┘    │
└─────────────────────────────────┴───────────────────────────────────────────┘
                    │                              │
                    ▼                              ▼
          ┌─────────────────────────────────────────────────┐
          │              Prometheus Server (:9090)          │
          │  - 15s scrape interval                          │
          │  - 30-day retention                             │
          │  - Recording rules for aggregations             │
          └─────────────────────────────────────────────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    ▼                             ▼
          ┌─────────────────────┐      ┌─────────────────────┐
          │  Grafana (:3001)    │      │  Alertmanager       │
          │  - 3 Dashboards     │      │  (:9093)            │
          │  - Auto-provisioned │      │  - PagerDuty        │
          └─────────────────────┘      │  - Slack            │
                                       └─────────────────────┘
```

---

## Components

### Prometheus Configuration

| File | Description |
|------|-------------|
| `prometheus/prometheus.yml` | Main configuration with scrape jobs |
| `prometheus/rules/recording-rules.yml` | Pre-computed aggregations |
| `prometheus/rules/alerting-rules.yml` | Alert definitions |
| `prometheus/targets/*.yml` | Service discovery targets |

### Grafana Dashboards

| Dashboard | UID | Description |
|-----------|-----|-------------|
| Cluster Overview | `dgx-spark-overview` | High-level cluster health |
| GPU Details | `dgx-spark-gpu-details` | Per-node GPU telemetry |
| Inference Monitoring | `dgx-spark-inference` | vLLM metrics |

### Alerting Rules

#### Critical Alerts
- **GPUTemperatureCritical**: GPU temp > 85°C for 2 minutes
- **GPUMemoryExhausted**: GPU memory > 95% for 5 minutes
- **DGXSparkNodeDown**: Node unreachable for 1 minute
- **GPUXIDError**: XID error detected

#### Warning Alerts
- **GPUTemperatureWarning**: GPU temp > 75°C for 5 minutes
- **GPUMemoryHigh**: GPU memory > 85% for 10 minutes
- **GPUUnderutilized**: GPU util < 10% for 1 hour
- **HighCPUUsage**: CPU > 90% for 15 minutes
- **HighMemoryUsage**: System memory > 90% for 10 minutes

---

## Metrics Reference

### DCGM Exporter Metrics

| Metric | Description | Unit |
|--------|-------------|------|
| `DCGM_FI_DEV_GPU_UTIL` | GPU utilization | % |
| `DCGM_FI_DEV_MEM_COPY_UTIL` | Memory copy utilization | % |
| `DCGM_FI_DEV_FB_USED` | Framebuffer memory used | MiB |
| `DCGM_FI_DEV_FB_FREE` | Framebuffer memory free | MiB |
| `DCGM_FI_DEV_GPU_TEMP` | GPU temperature | °C |
| `DCGM_FI_DEV_POWER_USAGE` | Power draw | W |
| `DCGM_FI_DEV_SM_CLOCK` | SM clock frequency | MHz |
| `DCGM_FI_DEV_MEM_CLOCK` | Memory clock frequency | MHz |
| `DCGM_FI_DEV_PCIE_TX_THROUGHPUT` | PCIe TX throughput | KB/s |
| `DCGM_FI_DEV_PCIE_RX_THROUGHPUT` | PCIe RX throughput | KB/s |
| `DCGM_FI_DEV_NVLINK_BANDWIDTH_TOTAL` | NVLink bandwidth | B/s |

### Recording Rules (Pre-computed)

| Rule | Description |
|------|-------------|
| `cluster:gpu_utilization:avg` | Average GPU utilization across cluster |
| `cluster:gpu_memory_used_bytes:sum` | Total GPU memory used |
| `cluster:power_watts:sum` | Total power consumption |
| `cluster:gpu_temperature:max` | Maximum GPU temperature |
| `node:gpu_utilization:avg` | GPU utilization per node |
| `node:cpu_utilization:avg` | CPU utilization per node |
| `node:memory_utilization:percent` | Memory utilization per node |

---

## Configuration

### Alertmanager Setup

Edit `alertmanager/alertmanager.yml` to configure notifications:

#### PagerDuty
```yaml
receivers:
  - name: 'pagerduty-critical'
    pagerduty_configs:
      - service_key: 'YOUR_PAGERDUTY_SERVICE_KEY'
```

#### Slack
```yaml
global:
  slack_api_url: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK'
```

### Adding New Nodes

1. Run `setup-exporters.sh` on the new node
2. Add the node IP to target files:
   - `prometheus/targets/dcgm-targets.yml`
   - `prometheus/targets/node-targets.yml`
3. Reload Prometheus: `curl -X POST http://localhost:9090/-/reload`

### Spark Metrics

Copy `node-scripts/spark-metrics.properties` to `$SPARK_HOME/conf/metrics.properties` on each node, then restart Spark.

---

## Troubleshooting

### DCGM Exporter Not Starting

```bash
# Check NVIDIA driver
nvidia-smi

# Check NVIDIA Container Toolkit
docker run --rm --gpus all nvidia/cuda:12.0-base nvidia-smi

# Check DCGM logs
docker logs dcgm-exporter
```

### Prometheus Not Scraping

```bash
# Check targets status
curl http://localhost:9090/api/v1/targets

# Verify exporter is accessible
curl http://<node-ip>:9400/metrics
curl http://<node-ip>:9100/metrics
```

### Grafana Dashboard Not Loading

```bash
# Check Grafana logs
docker logs dgx-grafana

# Verify datasource
curl -u admin:dgxspark2024 http://localhost:3001/api/datasources
```

---

## Maintenance

### Backup

```bash
# Backup Prometheus data
docker run --rm -v prometheus_data:/data -v $(pwd):/backup alpine \
  tar czf /backup/prometheus-backup.tar.gz /data

# Backup Grafana data
docker run --rm -v grafana_data:/data -v $(pwd):/backup alpine \
  tar czf /backup/grafana-backup.tar.gz /data
```

### Upgrade

```bash
# Pull latest images
docker-compose pull

# Restart with new images
docker-compose up -d
```

### Retention Management

Prometheus is configured for 30-day retention and 50GB max storage. Adjust in `docker-compose.yml`:

```yaml
command:
  - '--storage.tsdb.retention.time=30d'
  - '--storage.tsdb.retention.size=50GB'
```

---

## Integration with Command Center

The monitoring stack is designed to integrate with the DGX Spark Command Center frontend. Add these environment variables to your Command Center backend:

```bash
PROMETHEUS_URL=http://localhost:9090
GRAFANA_URL=http://localhost:3001
```

See `docs/prometheus-grafana-integration.md` for detailed API integration instructions.

---

## License

This monitoring configuration is provided as part of the DGX Spark Command Center project.
