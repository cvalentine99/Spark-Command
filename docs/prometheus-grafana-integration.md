# Technical Requirements: Prometheus/Grafana Integration

## DGX Spark Command Center — Live Telemetry Backend

---

## 1. Architecture Overview

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
          │  - Scrape configs for all exporters             │
          │  - 15s scrape interval (GPU metrics)            │
          │  - 30-day retention                             │
          └─────────────────────────────────────────────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    ▼                             ▼
          ┌─────────────────────┐      ┌─────────────────────┐
          │  Grafana (:3001)    │      │  Command Center     │
          │  (Visualization)    │      │  Backend (tRPC)     │
          └─────────────────────┘      └─────────────────────┘
                                                 │
                                                 ▼
                                       ┌─────────────────────┐
                                       │  Command Center     │
                                       │  Frontend (React)   │
                                       └─────────────────────┘
```

---

## 2. Required Exporters on DGX Spark Nodes

### 2.1 NVIDIA DCGM Exporter (GPU Metrics)

The DCGM (Data Center GPU Manager) Exporter is the primary source for GPU telemetry.

**Installation:**
```bash
# On each DGX Spark node
docker run -d --gpus all --rm \
  -p 9400:9400 \
  --name dcgm-exporter \
  nvcr.io/nvidia/k8s/dcgm-exporter:3.3.5-3.4.0-ubuntu22.04
```

**Key Metrics Exposed:**

| Metric Name | Description | Unit |
|-------------|-------------|------|
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
| `DCGM_FI_DEV_NVLINK_BANDWIDTH_TOTAL` | NVLink bandwidth | GB/s |

### 2.2 Node Exporter (System Metrics)

Standard Prometheus node exporter for CPU, memory, disk, and network metrics.

**Installation:**
```bash
# On each DGX Spark node
docker run -d --net="host" --pid="host" \
  -v "/:/host:ro,rslave" \
  --name node-exporter \
  quay.io/prometheus/node-exporter:latest \
  --path.rootfs=/host
```

**Key Metrics for DGX Spark:**

| Metric Name | Description | Mapping |
|-------------|-------------|---------|
| `node_cpu_seconds_total` | CPU time per core | CPU Usage |
| `node_memory_MemTotal_bytes` | Total system memory | 128GB UMA |
| `node_memory_MemAvailable_bytes` | Available memory | Memory Usage |
| `node_network_receive_bytes_total` | Network RX | ConnectX-7 stats |
| `node_network_transmit_bytes_total` | Network TX | ConnectX-7 stats |
| `node_disk_io_time_seconds_total` | Disk I/O time | NVMe stats |
| `node_hwmon_temp_celsius` | Hardware temperatures | Thermal monitoring |
| `node_hwmon_fan_rpm` | Fan speeds | Cooling status |

### 2.3 Spark Metrics (Optional - for Spark Engine Page)

Apache Spark exposes metrics via its built-in metrics system.

**spark-defaults.conf:**
```properties
spark.metrics.conf.*.sink.prometheusServlet.class=org.apache.spark.metrics.sink.PrometheusServlet
spark.metrics.conf.*.sink.prometheusServlet.path=/metrics/prometheus
spark.ui.prometheus.enabled=true
```

**Key Spark Metrics:**

| Metric Name | Description |
|-------------|-------------|
| `spark_executor_cpuTime_total` | Executor CPU time |
| `spark_executor_memoryUsed_bytes` | Executor memory |
| `spark_job_numActiveTasks` | Active tasks |
| `spark_job_numCompletedTasks` | Completed tasks |
| `spark_stage_shuffleReadBytes_total` | Shuffle read |
| `spark_stage_shuffleWriteBytes_total` | Shuffle write |

---

## 3. Prometheus Server Configuration

### 3.1 prometheus.yml

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  # DCGM Exporter - GPU Metrics (both nodes)
  - job_name: 'dcgm-exporter'
    static_configs:
      - targets:
          - '192.168.100.10:9400'  # DGX-SPARK-01
          - '192.168.100.11:9400'  # DGX-SPARK-02
        labels:
          cluster: 'dgx-spark-cluster'

  # Node Exporter - System Metrics (both nodes)
  - job_name: 'node-exporter'
    static_configs:
      - targets:
          - '192.168.100.10:9100'  # DGX-SPARK-01
          - '192.168.100.11:9100'  # DGX-SPARK-02
        labels:
          cluster: 'dgx-spark-cluster'

  # Spark Metrics (Master node)
  - job_name: 'spark'
    metrics_path: '/metrics/prometheus'
    static_configs:
      - targets:
          - '192.168.100.10:4040'  # Spark UI
        labels:
          cluster: 'dgx-spark-cluster'
          role: 'spark-master'

  # vLLM Inference Server (if running)
  - job_name: 'vllm'
    static_configs:
      - targets:
          - '192.168.100.10:8000'  # vLLM metrics endpoint
        labels:
          cluster: 'dgx-spark-cluster'
          service: 'inference'
```

### 3.2 Recording Rules (prometheus.rules.yml)

Pre-compute expensive queries for dashboard performance:

```yaml
groups:
  - name: dgx_spark_aggregations
    interval: 15s
    rules:
      # Total cluster GPU utilization
      - record: cluster:gpu_utilization:avg
        expr: avg(DCGM_FI_DEV_GPU_UTIL{cluster="dgx-spark-cluster"})

      # Total cluster memory usage
      - record: cluster:memory_used_bytes:sum
        expr: sum(DCGM_FI_DEV_FB_USED{cluster="dgx-spark-cluster"}) * 1024 * 1024

      # Total cluster power draw
      - record: cluster:power_watts:sum
        expr: sum(DCGM_FI_DEV_POWER_USAGE{cluster="dgx-spark-cluster"})

      # Per-node GPU utilization
      - record: node:gpu_utilization:avg
        expr: avg by (instance) (DCGM_FI_DEV_GPU_UTIL{cluster="dgx-spark-cluster"})
```

---

## 4. Backend Integration (tRPC Procedures)

### 4.1 Prometheus Client Setup

**server/lib/prometheus.ts:**
```typescript
import axios from 'axios';

const PROMETHEUS_URL = process.env.PROMETHEUS_URL || 'http://localhost:9090';

interface PrometheusQueryResult {
  status: string;
  data: {
    resultType: string;
    result: Array<{
      metric: Record<string, string>;
      value: [number, string];
    }>;
  };
}

export async function queryPrometheus(query: string): Promise<PrometheusQueryResult> {
  const response = await axios.get(`${PROMETHEUS_URL}/api/v1/query`, {
    params: { query },
    timeout: 5000,
  });
  return response.data;
}

export async function queryPrometheusRange(
  query: string,
  start: number,
  end: number,
  step: string = '15s'
): Promise<PrometheusQueryResult> {
  const response = await axios.get(`${PROMETHEUS_URL}/api/v1/query_range`, {
    params: { query, start, end, step },
    timeout: 10000,
  });
  return response.data;
}
```

### 4.2 tRPC Router for Telemetry

**server/routers/telemetry.ts:**
```typescript
import { z } from 'zod';
import { router, publicProcedure } from '../_core/trpc';
import { queryPrometheus, queryPrometheusRange } from '../lib/prometheus';

export const telemetryRouter = router({
  // Cluster overview metrics
  clusterOverview: publicProcedure.query(async () => {
    const [gpuUtil, memUsed, powerDraw, activeJobs] = await Promise.all([
      queryPrometheus('cluster:gpu_utilization:avg'),
      queryPrometheus('cluster:memory_used_bytes:sum'),
      queryPrometheus('cluster:power_watts:sum'),
      queryPrometheus('spark_job_numActiveTasks'),
    ]);

    return {
      gpuUtilization: parseFloat(gpuUtil.data.result[0]?.value[1] || '0'),
      memoryUsedGB: parseFloat(memUsed.data.result[0]?.value[1] || '0') / (1024 ** 3),
      powerDrawW: parseFloat(powerDraw.data.result[0]?.value[1] || '0'),
      activeJobs: parseInt(activeJobs.data.result[0]?.value[1] || '0'),
    };
  }),

  // Per-node GPU metrics
  nodeGpuMetrics: publicProcedure
    .input(z.object({ nodeIp: z.string() }))
    .query(async ({ input }) => {
      const [util, temp, power, memUsed, memFree] = await Promise.all([
        queryPrometheus(`DCGM_FI_DEV_GPU_UTIL{instance="${input.nodeIp}:9400"}`),
        queryPrometheus(`DCGM_FI_DEV_GPU_TEMP{instance="${input.nodeIp}:9400"}`),
        queryPrometheus(`DCGM_FI_DEV_POWER_USAGE{instance="${input.nodeIp}:9400"}`),
        queryPrometheus(`DCGM_FI_DEV_FB_USED{instance="${input.nodeIp}:9400"}`),
        queryPrometheus(`DCGM_FI_DEV_FB_FREE{instance="${input.nodeIp}:9400"}`),
      ]);

      return {
        utilization: parseFloat(util.data.result[0]?.value[1] || '0'),
        temperature: parseFloat(temp.data.result[0]?.value[1] || '0'),
        powerDraw: parseFloat(power.data.result[0]?.value[1] || '0'),
        memoryUsedMB: parseFloat(memUsed.data.result[0]?.value[1] || '0'),
        memoryFreeMB: parseFloat(memFree.data.result[0]?.value[1] || '0'),
      };
    }),

  // Historical GPU utilization (for charts)
  gpuUtilizationHistory: publicProcedure
    .input(z.object({
      nodeIp: z.string(),
      duration: z.enum(['1h', '6h', '24h', '7d']),
    }))
    .query(async ({ input }) => {
      const durationMap = { '1h': 3600, '6h': 21600, '24h': 86400, '7d': 604800 };
      const end = Math.floor(Date.now() / 1000);
      const start = end - durationMap[input.duration];
      const step = input.duration === '7d' ? '5m' : '1m';

      const result = await queryPrometheusRange(
        `DCGM_FI_DEV_GPU_UTIL{instance="${input.nodeIp}:9400"}`,
        start,
        end,
        step
      );

      return result.data.result.map((series) => ({
        metric: series.metric,
        values: series.values.map(([ts, val]: [number, string]) => ({
          timestamp: ts * 1000,
          value: parseFloat(val),
        })),
      }));
    }),

  // Network interface stats
  networkStats: publicProcedure.query(async () => {
    const [rxBytes, txBytes] = await Promise.all([
      queryPrometheus('rate(node_network_receive_bytes_total{device="eth0"}[1m])'),
      queryPrometheus('rate(node_network_transmit_bytes_total{device="eth0"}[1m])'),
    ]);

    return {
      rxBytesPerSec: parseFloat(rxBytes.data.result[0]?.value[1] || '0'),
      txBytesPerSec: parseFloat(txBytes.data.result[0]?.value[1] || '0'),
    };
  }),
});
```

### 4.3 Environment Variables

Add to `.env`:
```bash
# Prometheus Configuration
PROMETHEUS_URL=http://prometheus-server:9090

# Optional: Grafana for embedding dashboards
GRAFANA_URL=http://grafana:3001
GRAFANA_API_KEY=your-grafana-api-key
```

---

## 5. Frontend Integration

### 5.1 React Query Hooks

**client/src/hooks/useTelemetry.ts:**
```typescript
import { trpc } from '@/lib/trpc';

export function useClusterOverview() {
  return trpc.telemetry.clusterOverview.useQuery(undefined, {
    refetchInterval: 5000, // Poll every 5 seconds
    staleTime: 3000,
  });
}

export function useNodeGpuMetrics(nodeIp: string) {
  return trpc.telemetry.nodeGpuMetrics.useQuery(
    { nodeIp },
    {
      refetchInterval: 5000,
      staleTime: 3000,
      enabled: !!nodeIp,
    }
  );
}

export function useGpuUtilizationHistory(nodeIp: string, duration: '1h' | '6h' | '24h' | '7d') {
  return trpc.telemetry.gpuUtilizationHistory.useQuery(
    { nodeIp, duration },
    {
      refetchInterval: 60000, // Refresh every minute for historical data
      staleTime: 30000,
      enabled: !!nodeIp,
    }
  );
}
```

### 5.2 Dashboard Component Updates

Replace mock data in `DashboardPage.tsx`:

```typescript
import { useClusterOverview } from '@/hooks/useTelemetry';

export default function DashboardPage() {
  const { data: cluster, isLoading } = useClusterOverview();

  if (isLoading) return <DashboardSkeleton />;

  return (
    <div>
      <MetricCard
        title="GPU Utilization"
        value={`${cluster?.gpuUtilization.toFixed(1)}%`}
      />
      <MetricCard
        title="Memory Usage"
        value={`${cluster?.memoryUsedGB.toFixed(1)} GB`}
      />
      {/* ... */}
    </div>
  );
}
```

---

## 6. Deployment Checklist

### 6.1 On Each DGX Spark Node

- [ ] Install and start DCGM Exporter (port 9400)
- [ ] Install and start Node Exporter (port 9100)
- [ ] Configure firewall to allow Prometheus scraping
- [ ] Verify metrics endpoints: `curl http://localhost:9400/metrics`

### 6.2 Prometheus Server

- [ ] Deploy Prometheus with provided `prometheus.yml`
- [ ] Add recording rules for aggregations
- [ ] Configure retention period (recommend 30 days)
- [ ] Set up alerting rules for critical thresholds
- [ ] Verify targets are UP in Prometheus UI

### 6.3 Command Center Backend

- [ ] Add `PROMETHEUS_URL` environment variable
- [ ] Implement telemetry router with Prometheus queries
- [ ] Add error handling for Prometheus unavailability
- [ ] Test all tRPC endpoints

### 6.4 Command Center Frontend

- [ ] Replace mock data with tRPC hooks
- [ ] Add loading states and error boundaries
- [ ] Configure appropriate polling intervals
- [ ] Test real-time updates

---

## 7. Security Considerations

| Concern | Recommendation |
|---------|----------------|
| **Network Exposure** | Run Prometheus on internal network only; expose via reverse proxy with auth |
| **Authentication** | Use Prometheus basic auth or OAuth2 proxy for external access |
| **TLS** | Enable HTTPS for Prometheus API if accessed over untrusted networks |
| **Rate Limiting** | Implement rate limiting on tRPC telemetry endpoints |
| **Data Sensitivity** | GPU metrics are generally non-sensitive; review before exposing |

---

## 8. Grafana Integration (Optional)

For advanced visualization, embed Grafana panels directly:

```typescript
// Embed Grafana panel in React
<iframe
  src={`${GRAFANA_URL}/d-solo/dgx-spark/gpu-metrics?orgId=1&panelId=2&from=now-1h&to=now`}
  width="100%"
  height="300"
  frameBorder="0"
/>
```

Or use Grafana's HTTP API to fetch rendered panel images for static dashboards.

---

**Document Version:** 1.0  
**Last Updated:** December 2024  
**Author:** Manus AI
