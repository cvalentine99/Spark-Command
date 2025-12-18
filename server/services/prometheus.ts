/**
 * Prometheus Service Layer
 * Handles all communication with Prometheus server for DGX Spark metrics
 */

import axios, { AxiosInstance } from 'axios';

// Types for Prometheus responses
interface PrometheusResult {
  metric: Record<string, string>;
  value: [number, string];
}

interface PrometheusRangeResult {
  metric: Record<string, string>;
  values: [number, string][];
}

interface PrometheusResponse<T> {
  status: 'success' | 'error';
  data: {
    resultType: 'vector' | 'matrix' | 'scalar' | 'string';
    result: T[];
  };
  error?: string;
  errorType?: string;
}

// GPU Metrics interface
export interface GPUMetrics {
  node: string;
  gpuIndex: number;
  utilization: number;
  memoryUsed: number;
  memoryTotal: number;
  temperature: number;
  powerDraw: number;
  powerLimit: number;
  fanSpeed: number;
  smClock: number;
  memClock: number;
}

// Node Metrics interface
export interface NodeMetrics {
  hostname: string;
  ip: string;
  cpuUsage: number;
  memoryUsed: number;
  memoryTotal: number;
  diskUsed: number;
  diskTotal: number;
  networkRxBytes: number;
  networkTxBytes: number;
  uptime: number;
}

// Cluster Overview interface
export interface ClusterOverview {
  totalGpuCompute: number; // PFLOPS
  activeJobs: number;
  totalMemory: number; // GB
  usedMemory: number; // GB
  inferenceRps: number;
  clusterStatus: 'operational' | 'degraded' | 'offline';
  uptime: string;
  nodes: {
    name: string;
    status: 'online' | 'offline' | 'warning';
    ip: string;
  }[];
}

export class PrometheusService {
  private client: AxiosInstance;
  private baseUrl: string;

  constructor(prometheusUrl?: string) {
    this.baseUrl = prometheusUrl || process.env.PROMETHEUS_URL || 'http://localhost:9090';
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Execute an instant query
   */
  async query<T = PrometheusResult>(promql: string): Promise<T[]> {
    try {
      const response = await this.client.get<PrometheusResponse<T>>('/api/v1/query', {
        params: { query: promql },
      });
      
      if (response.data.status === 'error') {
        throw new Error(response.data.error || 'Prometheus query failed');
      }
      
      return response.data.data.result;
    } catch (error) {
      console.error(`Prometheus query failed: ${promql}`, error);
      throw error;
    }
  }

  /**
   * Execute a range query
   */
  async queryRange<T = PrometheusRangeResult>(
    promql: string,
    start: number,
    end: number,
    step: string = '15s'
  ): Promise<T[]> {
    try {
      const response = await this.client.get<PrometheusResponse<T>>('/api/v1/query_range', {
        params: { query: promql, start, end, step },
      });
      
      if (response.data.status === 'error') {
        throw new Error(response.data.error || 'Prometheus range query failed');
      }
      
      return response.data.data.result;
    } catch (error) {
      console.error(`Prometheus range query failed: ${promql}`, error);
      throw error;
    }
  }

  /**
   * Check if Prometheus is reachable
   */
  async healthCheck(): Promise<{ healthy: boolean; message: string }> {
    try {
      const response = await this.client.get('/-/healthy');
      return { healthy: response.status === 200, message: 'Prometheus is healthy' };
    } catch (error) {
      return { healthy: false, message: `Prometheus unreachable: ${error}` };
    }
  }

  /**
   * Get GPU metrics for all GPUs across all nodes
   */
  async getGPUMetrics(): Promise<GPUMetrics[]> {
    const metrics: GPUMetrics[] = [];
    
    try {
      // Query all GPU metrics in parallel
      const [utilization, memUsed, memTotal, temp, power, powerLimit, fan, smClock, memClock] = await Promise.all([
        this.query('DCGM_FI_DEV_GPU_UTIL'),
        this.query('DCGM_FI_DEV_FB_USED'),
        this.query('DCGM_FI_DEV_FB_TOTAL'),
        this.query('DCGM_FI_DEV_GPU_TEMP'),
        this.query('DCGM_FI_DEV_POWER_USAGE'),
        this.query('DCGM_FI_DEV_POWER_LIMIT'),
        this.query('DCGM_FI_DEV_FAN_SPEED'),
        this.query('DCGM_FI_DEV_SM_CLOCK'),
        this.query('DCGM_FI_DEV_MEM_CLOCK'),
      ]);

      // Build metrics map by node+gpu
      const metricsMap = new Map<string, Partial<GPUMetrics>>();
      
      const processResults = (results: PrometheusResult[], field: keyof GPUMetrics) => {
        results.forEach((r) => {
          const key = `${r.metric.instance || r.metric.Hostname}_${r.metric.gpu || '0'}`;
          if (!metricsMap.has(key)) {
            metricsMap.set(key, {
              node: r.metric.instance || r.metric.Hostname || 'unknown',
              gpuIndex: parseInt(r.metric.gpu || '0', 10),
            });
          }
          const entry = metricsMap.get(key)!;
          (entry as any)[field] = parseFloat(r.value[1]);
        });
      };

      processResults(utilization, 'utilization');
      processResults(memUsed, 'memoryUsed');
      processResults(memTotal, 'memoryTotal');
      processResults(temp, 'temperature');
      processResults(power, 'powerDraw');
      processResults(powerLimit, 'powerLimit');
      processResults(fan, 'fanSpeed');
      processResults(smClock, 'smClock');
      processResults(memClock, 'memClock');

      metricsMap.forEach((m) => {
        metrics.push({
          node: m.node || 'unknown',
          gpuIndex: m.gpuIndex || 0,
          utilization: m.utilization || 0,
          memoryUsed: m.memoryUsed || 0,
          memoryTotal: m.memoryTotal || 128000, // Default 128GB for DGX Spark
          temperature: m.temperature || 0,
          powerDraw: m.powerDraw || 0,
          powerLimit: m.powerLimit || 265,
          fanSpeed: m.fanSpeed || 0,
          smClock: m.smClock || 0,
          memClock: m.memClock || 0,
        });
      });
    } catch (error) {
      console.error('Failed to fetch GPU metrics:', error);
    }

    return metrics;
  }

  /**
   * Get node-level system metrics
   */
  async getNodeMetrics(): Promise<NodeMetrics[]> {
    const metrics: NodeMetrics[] = [];

    try {
      const [cpuUsage, memUsed, memTotal, diskUsed, diskTotal, netRx, netTx, uptime] = await Promise.all([
        this.query('100 - (avg by (instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)'),
        this.query('node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes'),
        this.query('node_memory_MemTotal_bytes'),
        this.query('node_filesystem_size_bytes{mountpoint="/"} - node_filesystem_avail_bytes{mountpoint="/"}'),
        this.query('node_filesystem_size_bytes{mountpoint="/"}'),
        this.query('rate(node_network_receive_bytes_total{device="eth0"}[5m])'),
        this.query('rate(node_network_transmit_bytes_total{device="eth0"}[5m])'),
        this.query('node_time_seconds - node_boot_time_seconds'),
      ]);

      const metricsMap = new Map<string, Partial<NodeMetrics>>();

      const processResults = (results: PrometheusResult[], field: keyof NodeMetrics) => {
        results.forEach((r) => {
          const instance = r.metric.instance || 'unknown';
          if (!metricsMap.has(instance)) {
            metricsMap.set(instance, { hostname: instance, ip: instance.split(':')[0] });
          }
          const entry = metricsMap.get(instance)!;
          (entry as any)[field] = parseFloat(r.value[1]);
        });
      };

      processResults(cpuUsage, 'cpuUsage');
      processResults(memUsed, 'memoryUsed');
      processResults(memTotal, 'memoryTotal');
      processResults(diskUsed, 'diskUsed');
      processResults(diskTotal, 'diskTotal');
      processResults(netRx, 'networkRxBytes');
      processResults(netTx, 'networkTxBytes');
      processResults(uptime, 'uptime');

      metricsMap.forEach((m) => {
        metrics.push({
          hostname: m.hostname || 'unknown',
          ip: m.ip || '0.0.0.0',
          cpuUsage: m.cpuUsage || 0,
          memoryUsed: m.memoryUsed || 0,
          memoryTotal: m.memoryTotal || 0,
          diskUsed: m.diskUsed || 0,
          diskTotal: m.diskTotal || 0,
          networkRxBytes: m.networkRxBytes || 0,
          networkTxBytes: m.networkTxBytes || 0,
          uptime: m.uptime || 0,
        });
      });
    } catch (error) {
      console.error('Failed to fetch node metrics:', error);
    }

    return metrics;
  }

  /**
   * Get cluster overview metrics
   */
  async getClusterOverview(): Promise<ClusterOverview> {
    try {
      const [gpuMetrics, nodeMetrics] = await Promise.all([
        this.getGPUMetrics(),
        this.getNodeMetrics(),
      ]);

      // Calculate totals
      const totalMemory = gpuMetrics.reduce((sum, g) => sum + g.memoryTotal, 0) / 1024; // Convert to GB
      const usedMemory = gpuMetrics.reduce((sum, g) => sum + g.memoryUsed, 0) / 1024;
      const avgUtilization = gpuMetrics.length > 0 
        ? gpuMetrics.reduce((sum, g) => sum + g.utilization, 0) / gpuMetrics.length 
        : 0;

      // Try to get Spark job count
      let activeJobs = 0;
      try {
        const sparkJobs = await this.query('spark_job_active_count');
        activeJobs = sparkJobs.length > 0 ? parseInt(sparkJobs[0].value[1], 10) : 0;
      } catch {
        // Spark metrics not available
      }

      // Try to get inference RPS
      let inferenceRps = 0;
      try {
        const rps = await this.query('rate(vllm_requests_total[1m])');
        inferenceRps = rps.length > 0 ? parseFloat(rps[0].value[1]) : 0;
      } catch {
        // vLLM metrics not available
      }

      // Calculate uptime from the longest-running node
      const maxUptime = Math.max(...nodeMetrics.map((n) => n.uptime), 0);
      const days = Math.floor(maxUptime / 86400);
      const hours = Math.floor((maxUptime % 86400) / 3600);
      const minutes = Math.floor((maxUptime % 3600) / 60);
      const uptimeStr = `${days}d ${hours}h ${minutes}m`;

      // Determine cluster status
      const onlineNodes = nodeMetrics.filter((n) => n.cpuUsage > 0).length;
      const totalNodes = nodeMetrics.length || 2; // Default to 2 for DGX Spark cluster
      let clusterStatus: 'operational' | 'degraded' | 'offline' = 'operational';
      if (onlineNodes === 0) clusterStatus = 'offline';
      else if (onlineNodes < totalNodes) clusterStatus = 'degraded';

      // Build node list
      const nodes = nodeMetrics.map((n) => ({
        name: n.hostname.includes('01') ? 'DGX-SPARK-01' : 'DGX-SPARK-02',
        status: n.cpuUsage > 0 ? 'online' as const : 'offline' as const,
        ip: n.ip,
      }));

      // If no nodes found, return defaults for 2-node cluster
      if (nodes.length === 0) {
        nodes.push(
          { name: 'DGX-SPARK-01', status: 'offline', ip: '192.168.100.10' },
          { name: 'DGX-SPARK-02', status: 'offline', ip: '192.168.100.11' }
        );
      }

      return {
        totalGpuCompute: 1.8, // 2x DGX Spark = ~1.8 PFLOPS FP8
        activeJobs,
        totalMemory: totalMemory || 256, // Default 256GB for 2-node cluster
        usedMemory,
        inferenceRps,
        clusterStatus,
        uptime: uptimeStr,
        nodes,
      };
    } catch (error) {
      console.error('Failed to get cluster overview:', error);
      // Return default offline state
      return {
        totalGpuCompute: 1.8,
        activeJobs: 0,
        totalMemory: 256,
        usedMemory: 0,
        inferenceRps: 0,
        clusterStatus: 'offline',
        uptime: '0d 0h 0m',
        nodes: [
          { name: 'DGX-SPARK-01', status: 'offline', ip: '192.168.100.10' },
          { name: 'DGX-SPARK-02', status: 'offline', ip: '192.168.100.11' },
        ],
      };
    }
  }

  /**
   * Get historical GPU utilization data
   */
  async getGPUUtilizationHistory(hours: number = 24): Promise<{ timestamp: number; value: number }[]> {
    const end = Math.floor(Date.now() / 1000);
    const start = end - hours * 3600;
    
    try {
      const results = await this.queryRange<PrometheusRangeResult>(
        'avg(DCGM_FI_DEV_GPU_UTIL)',
        start,
        end,
        '5m'
      );

      if (results.length === 0) return [];

      return results[0].values.map(([ts, val]) => ({
        timestamp: ts * 1000,
        value: parseFloat(val),
      }));
    } catch (error) {
      console.error('Failed to get GPU utilization history:', error);
      return [];
    }
  }

  /**
   * Get historical memory usage data
   */
  async getMemoryUsageHistory(hours: number = 24): Promise<{ timestamp: number; value: number }[]> {
    const end = Math.floor(Date.now() / 1000);
    const start = end - hours * 3600;
    
    try {
      const results = await this.queryRange<PrometheusRangeResult>(
        'sum(DCGM_FI_DEV_FB_USED) / sum(DCGM_FI_DEV_FB_TOTAL) * 100',
        start,
        end,
        '5m'
      );

      if (results.length === 0) return [];

      return results[0].values.map(([ts, val]) => ({
        timestamp: ts * 1000,
        value: parseFloat(val),
      }));
    } catch (error) {
      console.error('Failed to get memory usage history:', error);
      return [];
    }
  }
}

// Singleton instance
let prometheusService: PrometheusService | null = null;

export function getPrometheusService(url?: string): PrometheusService {
  if (!prometheusService || url) {
    prometheusService = new PrometheusService(url);
  }
  return prometheusService;
}

export function resetPrometheusService(): void {
  prometheusService = null;
}
