# DGX Spark Command Center - Splunk Integration

Complete Splunk integration package for monitoring NVIDIA DGX Spark 2-node clusters. This package includes Universal Forwarder configuration, custom dashboards, alerting rules, and deployment scripts.

## Package Contents

```
splunk/
├── forwarder-config/           # Universal Forwarder configuration
│   ├── inputs.conf             # Data input definitions
│   ├── outputs.conf            # Forwarding destinations
│   ├── props.conf              # Data parsing rules
│   ├── transforms.conf         # Field extractions
│   └── bin/                    # Collection scripts
│       ├── dcgm_metrics.sh     # DCGM GPU metrics collector
│       ├── nvidia_smi.sh       # nvidia-smi metrics collector
│       ├── host_metrics.sh     # System metrics collector
│       └── network_stats.sh    # Network statistics collector
├── apps/dgx_spark_app/         # Splunk App package
│   └── default/
│       ├── app.conf            # App configuration
│       ├── indexes.conf        # Index definitions
│       ├── macros.conf         # Search macros
│       ├── savedsearches.conf  # Alerts and reports
│       ├── alert_actions.conf  # Alert action settings
│       └── data/ui/
│           ├── nav/default.xml # Navigation menu
│           └── views/          # Dashboards
│               ├── cluster_overview.xml
│               ├── gpu_details.xml
│               ├── inference_monitoring.xml
│               └── spark_jobs.xml
└── deployment-scripts/         # Deployment automation
```

## Prerequisites

- Splunk Enterprise 8.x or later (Search Head + Indexers)
- Splunk Universal Forwarder 8.x on each DGX Spark node
- NVIDIA DCGM installed on DGX Spark nodes
- Network connectivity between forwarders and indexers (port 9997)

## Quick Start

### 1. Deploy Splunk App to Search Head

```bash
# Copy the app to Splunk apps directory
cp -r apps/dgx_spark_app $SPLUNK_HOME/etc/apps/

# Restart Splunk
$SPLUNK_HOME/bin/splunk restart
```

### 2. Create Indexes on Indexers

The app requires the following indexes. Create them via Splunk Web or CLI:

| Index Name | Purpose | Retention |
|------------|---------|-----------|
| `dgx_spark_metrics` | GPU and hardware metrics | 90 days |
| `dgx_spark_logs` | System and application logs | 90 days |
| `dgx_spark_containers` | Docker container logs | 30 days |
| `dgx_spark_apps` | Spark application logs | 90 days |
| `dgx_spark_inference` | vLLM inference metrics | 30 days |
| `dgx_spark_k8s` | Kubernetes logs | 30 days |

### 3. Deploy Universal Forwarder on DGX Nodes

```bash
# On each DGX Spark node (dgx-spark-01, dgx-spark-02)

# Copy configuration files
cp forwarder-config/*.conf $SPLUNK_HOME/etc/system/local/

# Copy collection scripts
mkdir -p $SPLUNK_HOME/bin
cp forwarder-config/bin/*.sh $SPLUNK_HOME/bin/
chmod +x $SPLUNK_HOME/bin/*.sh

# Update outputs.conf with your indexer addresses
vi $SPLUNK_HOME/etc/system/local/outputs.conf

# Restart the forwarder
$SPLUNK_HOME/bin/splunk restart
```

### 4. Configure Alert Actions

Update the alert action settings in `alert_actions.conf`:

```ini
# PagerDuty
[webhook]
param.url = https://events.pagerduty.com/v2/enqueue

# Slack
[slack]
param.webhook_url = https://hooks.slack.com/services/YOUR/WEBHOOK/URL
param.channel = #dgx-spark-alerts
```

## Dashboards

### Cluster Overview
Real-time cluster health monitoring with:
- Node online/offline status
- Aggregate GPU utilization
- Total power consumption
- Temperature trends
- Recent critical events

### GPU Telemetry Details
Per-GPU detailed metrics including:
- Utilization by device
- Memory usage distribution
- Temperature and power trends
- Clock frequencies
- PCIe throughput
- ECC error tracking

### Inference Monitoring
vLLM inference server analytics:
- Request rate and throughput
- Latency distribution (P50/P95/P99)
- Token generation metrics
- Model performance comparison

### Apache Spark Jobs
Spark workload monitoring:
- Active/completed/failed job counts
- Job timeline visualization
- RAPIDS GPU acceleration status
- Executor activity tracking
- Error analysis

## Alerts

### Critical Alerts (PagerDuty)
| Alert | Condition | Suppression |
|-------|-----------|-------------|
| GPU Temperature Exceeded | Temp > 85°C | 15 min |
| Node Offline | No metrics for 10 min | 30 min |
| GPU XID Error | Any XID error detected | 1 hour |
| GPU Memory Exhausted | Memory > 95% | 15 min |

### Warning Alerts (Slack)
| Alert | Condition | Suppression |
|-------|-----------|-------------|
| GPU Temperature Warning | Temp > 75°C | 30 min |
| High Power Draw | Power > 265W | 30 min |
| Spark Job Failed | Any job failure | 15 min |
| Inference Latency Spike | P95 > 2000ms | 30 min |

## Search Macros

Use these macros for quick searches:

```spl
# All GPU metrics
`dgx_metrics` | stats avg(gpu_utilization) by host

# Cluster health summary
`cluster_health`

# Node-specific status
`node_status(dgx-spark-01)`

# Inference latency analysis
`inference_latency`
```

## Data Collection Scripts

### dcgm_metrics.sh
Collects GPU metrics via DCGM:
- GPU utilization
- Temperature
- Power usage
- Memory (used/free)
- SM/Memory clocks
- NVLink status
- XID errors

### nvidia_smi.sh
Comprehensive nvidia-smi data:
- Full GPU specifications
- ECC error counts
- Throttling status
- Process GPU memory usage

### host_metrics.sh
System-level metrics:
- CPU utilization and load averages
- Memory usage
- Disk utilization and I/O
- Process counts
- System uptime

### network_stats.sh
Network monitoring:
- Interface statistics (RX/TX)
- TCP connection states
- InfiniBand/RDMA metrics
- NVLink bandwidth

## Troubleshooting

### No Data in Indexes

1. Verify forwarder connectivity:
```bash
$SPLUNK_HOME/bin/splunk list forward-server
```

2. Check forwarder logs:
```bash
tail -f $SPLUNK_HOME/var/log/splunk/splunkd.log
```

3. Test collection scripts manually:
```bash
$SPLUNK_HOME/bin/dcgm_metrics.sh
```

### Missing GPU Metrics

1. Verify DCGM is running:
```bash
systemctl status nvidia-dcgm
```

2. Test dcgmi:
```bash
dcgmi discovery -l
```

### Alert Not Firing

1. Check saved search schedule:
```spl
| rest /services/saved/searches | search title="DGX Spark*"
```

2. Verify alert action configuration in `alert_actions.conf`

## Integration with Command Center

The DGX Spark Command Center web application includes a Settings page with Splunk integration configuration:

1. Navigate to **Settings > Integrations**
2. Enter your Splunk HEC URL and token
3. Configure which data types to forward
4. Test the connection

The Command Center can also query Splunk for historical data visualization.

## Security Considerations

- Use SSL/TLS for forwarder-to-indexer communication
- Store HEC tokens securely (use Splunk's credential storage)
- Implement RBAC for dashboard access
- Enable audit logging for compliance

## Support

For issues or feature requests, contact the DGX Spark infrastructure team.
