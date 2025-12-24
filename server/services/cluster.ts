/**
 * Cluster Service - Unified Multi-Node Management
 * Aggregates metrics from all DGX Spark nodes in the cluster
 * Implements the cluster aggregation layer from Research Report Section 6
 */

import type {
  ClusterOverview,
  ClusterNode,
  NodeOverview,
  GPUMetrics,
  CPUMetrics,
  MemoryMetrics,
  StorageMetrics,
  AlertMessage,
} from '@shared/dgx-types';
import { getMetricsService, MetricsService } from './metrics';
import { getSSHService, SSHService } from './ssh';
import { getWebSocketService, WebSocketService } from './websocket';

// ============================================================================
// Types
// ============================================================================

interface ClusterNodeMetrics {
  id: string;
  name: string;
  hostname: string;
  ip: string;
  status: 'online' | 'offline' | 'warning';
  role: 'master' | 'worker';
  lastUpdated: Date;
  metrics: NodeOverview;
}

interface ClusterMetrics {
  clusterStatus: 'operational' | 'degraded' | 'offline';
  totalGpuCompute: number;
  activeJobs: number;
  totalMemory: number;
  usedMemory: number;
  uptime: string;
  nodes: ClusterNodeMetrics[];
}

interface AlertThresholds {
  temperatureWarning: number;
  temperatureCritical: number;
  memoryWarning: number;
  memoryCritical: number;
  gpuUtilizationWarning: number;
}

// ============================================================================
// Cluster Service
// ============================================================================

export class ClusterService {
  private metricsService: MetricsService;
  private sshService: SSHService;
  private wsService: WebSocketService | null = null;

  // Cached metrics for each node
  private nodeMetricsCache: Map<string, ClusterNodeMetrics> = new Map();
  private metricsRefreshInterval: NodeJS.Timeout | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  // Alert thresholds
  private alertThresholds: AlertThresholds = {
    temperatureWarning: 75,
    temperatureCritical: 85,
    memoryWarning: 80,
    memoryCritical: 95,
    gpuUtilizationWarning: 95,
  };

  // Track active alerts to avoid duplicates
  private activeAlerts: Set<string> = new Set();

  constructor() {
    this.metricsService = getMetricsService();
    this.sshService = getSSHService();

    // Initialize with default cluster configuration
    this.initializeCluster();
  }

  /**
   * Initialize cluster with default nodes
   */
  private initializeCluster(): void {
    // Local node (DGX Spark Alpha)
    this.nodeMetricsCache.set('local', {
      id: 'local',
      name: 'DGX Spark Alpha',
      hostname: 'dgx-spark-alpha',
      ip: process.env.DGX_SPARK_ALPHA_IP || '192.168.100.10',
      status: 'online',
      role: 'master',
      lastUpdated: new Date(),
      metrics: {
        hostname: 'dgx-spark-alpha',
        uptime: 'unknown',
        status: 'operational',
        cpu: this.getDefaultCPUMetrics(),
        gpu: this.getDefaultGPUMetrics(),
        memory: this.getDefaultMemoryMetrics(),
        storage: this.getDefaultStorageMetrics(),
      },
    });

    // Second node (DGX Spark Beta) - if configured
    if (process.env.DGX_SPARK_BETA_HOST) {
      this.nodeMetricsCache.set('dgx-spark-beta', {
        id: 'dgx-spark-beta',
        name: 'DGX Spark Beta',
        hostname: 'dgx-spark-beta',
        ip: process.env.DGX_SPARK_BETA_HOST,
        status: 'unknown' as 'online' | 'offline' | 'warning',
        role: 'worker',
        lastUpdated: new Date(),
        metrics: {
          hostname: 'dgx-spark-beta',
          uptime: 'unknown',
          status: 'operational',
          cpu: this.getDefaultCPUMetrics(),
          gpu: this.getDefaultGPUMetrics(),
          memory: this.getDefaultMemoryMetrics(),
          storage: this.getDefaultStorageMetrics(),
        },
      });
    } else {
      // Add simulated second node for demo purposes
      this.nodeMetricsCache.set('dgx-spark-beta', {
        id: 'dgx-spark-beta',
        name: 'DGX Spark Beta',
        hostname: 'dgx-spark-beta',
        ip: '192.168.100.11',
        status: 'online',
        role: 'worker',
        lastUpdated: new Date(),
        metrics: {
          hostname: 'dgx-spark-beta',
          uptime: 'up 7 days, 14 hours, 32 minutes',
          status: 'operational',
          cpu: this.getDefaultCPUMetrics(),
          gpu: this.getDefaultGPUMetrics(),
          memory: this.getDefaultMemoryMetrics(),
          storage: this.getDefaultStorageMetrics(),
        },
      });
    }
  }

  /**
   * Set WebSocket service reference for broadcasting
   */
  setWebSocketService(ws: WebSocketService): void {
    this.wsService = ws;
  }

  /**
   * Start periodic metrics refresh and health checks
   */
  startMonitoring(refreshIntervalMs: number = 2000): void {
    // Stop any existing intervals
    this.stopMonitoring();

    // Start metrics refresh
    this.metricsRefreshInterval = setInterval(async () => {
      await this.refreshAllMetrics();
    }, refreshIntervalMs);

    // Start health checks (less frequent)
    this.healthCheckInterval = setInterval(async () => {
      await this.checkNodesHealth();
    }, 30000); // Every 30 seconds

    console.log(`Cluster monitoring started (refresh: ${refreshIntervalMs}ms)`);
  }

  /**
   * Stop periodic monitoring
   */
  stopMonitoring(): void {
    if (this.metricsRefreshInterval) {
      clearInterval(this.metricsRefreshInterval);
      this.metricsRefreshInterval = null;
    }
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    console.log('Cluster monitoring stopped');
  }

  /**
   * Refresh metrics for all nodes
   */
  async refreshAllMetrics(): Promise<void> {
    const nodeIds = Array.from(this.nodeMetricsCache.keys());

    await Promise.all(nodeIds.map(async (nodeId) => {
      try {
        await this.refreshNodeMetrics(nodeId);
      } catch (error) {
        console.error(`Failed to refresh metrics for ${nodeId}:`, error);
      }
    }));
  }

  /**
   * Refresh metrics for a specific node
   */
  async refreshNodeMetrics(nodeId: string): Promise<void> {
    const nodeCache = this.nodeMetricsCache.get(nodeId);
    if (!nodeCache) return;

    try {
      let metrics: NodeOverview;

      if (nodeId === 'local') {
        // Use local metrics service
        metrics = await this.metricsService.getNodeOverview();
      } else if (process.env.DGX_SPARK_BETA_HOST) {
        // Get metrics via SSH
        metrics = await this.getRemoteNodeMetrics(nodeId);
      } else {
        // Simulate metrics for demo
        metrics = this.getSimulatedNodeMetrics(nodeId);
      }

      // Update cache
      nodeCache.metrics = metrics;
      nodeCache.lastUpdated = new Date();
      nodeCache.status = this.determineNodeStatus(metrics);

      // Check for alerts
      this.checkAlerts(nodeId, metrics);
    } catch (error) {
      console.error(`Error refreshing metrics for ${nodeId}:`, error);
      nodeCache.status = 'warning';
    }
  }

  /**
   * Get metrics from a remote node via SSH
   */
  private async getRemoteNodeMetrics(nodeId: string): Promise<NodeOverview> {
    const [gpu, cpu, memory, storage, systemInfo] = await Promise.all([
      this.sshService.getRemoteGPUMetrics(nodeId),
      this.sshService.getRemoteCPUMetrics(nodeId),
      this.sshService.getRemoteMemoryMetrics(nodeId),
      this.sshService.getRemoteStorageMetrics(nodeId),
      this.sshService.getRemoteSystemInfo(nodeId),
    ]);

    return {
      hostname: systemInfo?.hostname || nodeId,
      uptime: systemInfo?.uptime || 'unknown',
      status: 'operational',
      cpu: cpu || this.getDefaultCPUMetrics(),
      gpu: gpu || this.getDefaultGPUMetrics(),
      memory: memory || this.getDefaultMemoryMetrics(),
      storage: storage || this.getDefaultStorageMetrics(),
    };
  }

  /**
   * Get simulated metrics for demo purposes
   */
  private getSimulatedNodeMetrics(nodeId: string): NodeOverview {
    const variation = () => (Math.random() - 0.5) * 10;

    return {
      hostname: nodeId,
      uptime: 'up 7 days, 14 hours, 32 minutes',
      status: 'operational',
      cpu: {
        model: '10x Cortex-X925 + 10x Cortex-A725',
        cores: 20,
        usage: 40 + variation(),
        temperature: 52 + variation() * 0.5,
      },
      gpu: {
        name: 'NVIDIA Blackwell (GB10)',
        index: 0,
        utilization: 70 + variation(),
        memoryUsed: 75000 + Math.random() * 10000,
        memoryTotal: 128000,
        temperature: 58 + variation() * 0.5,
        powerDraw: 65 + variation(),
        powerLimit: 100,
        fanSpeed: 48 + Math.random() * 10,
        driverVersion: '550.54.15',
        cudaVersion: '12.4',
      },
      memory: {
        total: 128 * 1024 * 1024 * 1024,
        used: (65 + variation()) * 1024 * 1024 * 1024,
        percentage: 65 + variation(),
      },
      storage: {
        total: 2 * 1024 * 1024 * 1024 * 1024,
        used: 1.1 * 1024 * 1024 * 1024 * 1024,
        percentage: 55,
      },
    };
  }

  /**
   * Determine node status based on metrics
   */
  private determineNodeStatus(metrics: NodeOverview): 'online' | 'offline' | 'warning' {
    if (metrics.status === 'offline') return 'offline';
    if (metrics.status === 'degraded') return 'warning';

    // Check for warning conditions
    if (metrics.gpu.temperature > this.alertThresholds.temperatureWarning) return 'warning';
    if (metrics.memory.percentage > this.alertThresholds.memoryWarning) return 'warning';
    if (metrics.gpu.utilization > this.alertThresholds.gpuUtilizationWarning) return 'warning';

    return 'online';
  }

  /**
   * Check for alert conditions and broadcast if needed
   */
  private checkAlerts(nodeId: string, metrics: NodeOverview): void {
    // Temperature alerts
    if (metrics.gpu.temperature >= this.alertThresholds.temperatureCritical) {
      this.triggerAlert(nodeId, 'temperature', 'critical',
        `GPU temperature critical: ${metrics.gpu.temperature}°C`,
        `GPU on ${nodeId} has exceeded critical temperature threshold of ${this.alertThresholds.temperatureCritical}°C`
      );
    } else if (metrics.gpu.temperature >= this.alertThresholds.temperatureWarning) {
      this.triggerAlert(nodeId, 'temperature', 'warning',
        `GPU temperature warning: ${metrics.gpu.temperature}°C`,
        `GPU on ${nodeId} has exceeded warning temperature threshold of ${this.alertThresholds.temperatureWarning}°C`
      );
    } else {
      this.clearAlert(nodeId, 'temperature');
    }

    // Memory alerts
    if (metrics.memory.percentage >= this.alertThresholds.memoryCritical) {
      this.triggerAlert(nodeId, 'memory', 'critical',
        `Memory usage critical: ${metrics.memory.percentage.toFixed(1)}%`,
        `Memory usage on ${nodeId} has exceeded critical threshold of ${this.alertThresholds.memoryCritical}%`
      );
    } else if (metrics.memory.percentage >= this.alertThresholds.memoryWarning) {
      this.triggerAlert(nodeId, 'memory', 'warning',
        `Memory usage warning: ${metrics.memory.percentage.toFixed(1)}%`,
        `Memory usage on ${nodeId} has exceeded warning threshold of ${this.alertThresholds.memoryWarning}%`
      );
    } else {
      this.clearAlert(nodeId, 'memory');
    }
  }

  /**
   * Trigger an alert
   */
  private triggerAlert(
    nodeId: string,
    type: string,
    severity: 'info' | 'warning' | 'critical',
    title: string,
    message: string
  ): void {
    const alertKey = `${nodeId}-${type}`;

    // Skip if alert already active
    if (this.activeAlerts.has(alertKey)) return;

    this.activeAlerts.add(alertKey);

    const alert: AlertMessage = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      severity,
      title,
      message,
      source: nodeId,
      timestamp: Date.now(),
    };

    // Broadcast via WebSocket
    if (this.wsService) {
      this.wsService.broadcastAlert(alert);
    }

    console.log(`Alert triggered: [${severity}] ${title}`);
  }

  /**
   * Clear an alert
   */
  private clearAlert(nodeId: string, type: string): void {
    const alertKey = `${nodeId}-${type}`;
    this.activeAlerts.delete(alertKey);
  }

  /**
   * Check health of all nodes
   */
  async checkNodesHealth(): Promise<void> {
    const health = await this.sshService.getNodesHealth();
    const entries = Array.from(health.entries());

    for (const [nodeId, isHealthy] of entries) {
      const node = this.nodeMetricsCache.get(nodeId);
      if (node && !isHealthy && node.status === 'online') {
        node.status = 'offline';
        this.triggerAlert(nodeId, 'offline', 'critical',
          `Node offline: ${node.name}`,
          `Node ${node.name} (${node.hostname}) is not responding`
        );
      } else if (node && isHealthy && node.status === 'offline') {
        node.status = 'online';
        this.clearAlert(nodeId, 'offline');
        console.log(`Node ${node.name} is back online`);
      }
    }
  }

  /**
   * Get cluster-wide metrics overview
   */
  async getClusterMetrics(): Promise<ClusterMetrics> {
    const nodes = Array.from(this.nodeMetricsCache.values());

    // Calculate aggregated metrics
    const onlineNodes = nodes.filter(n => n.status === 'online');
    const totalGpuCompute = onlineNodes.reduce((sum, n) =>
      sum + (n.metrics.gpu.utilization / 100), 0);
    const totalMemory = nodes.reduce((sum, n) => sum + n.metrics.memory.total, 0);
    const usedMemory = nodes.reduce((sum, n) => sum + n.metrics.memory.used, 0);

    // Determine cluster status
    let clusterStatus: 'operational' | 'degraded' | 'offline' = 'operational';
    if (onlineNodes.length === 0) {
      clusterStatus = 'offline';
    } else if (onlineNodes.length < nodes.length || nodes.some(n => n.status === 'warning')) {
      clusterStatus = 'degraded';
    }

    // Get uptime from master node
    const masterNode = nodes.find(n => n.role === 'master');
    const uptime = masterNode?.metrics.uptime || 'unknown';

    return {
      clusterStatus,
      totalGpuCompute: totalGpuCompute * 1000, // Convert to TFLOPS
      activeJobs: 0, // TODO: Integrate with Spark service
      totalMemory,
      usedMemory,
      uptime,
      nodes,
    };
  }

  /**
   * Get overview for ClusterOverview type (compatible with existing API)
   */
  async getClusterOverview(): Promise<ClusterOverview> {
    const metrics = await this.getClusterMetrics();

    return {
      totalGpuCompute: metrics.totalGpuCompute,
      activeJobs: metrics.activeJobs,
      totalMemory: metrics.totalMemory,
      usedMemory: metrics.usedMemory,
      clusterStatus: metrics.clusterStatus,
      uptime: metrics.uptime,
      nodes: metrics.nodes.map(n => ({
        id: n.id,
        name: n.name,
        hostname: n.hostname,
        ip: n.ip,
        status: n.status,
        role: n.role,
      })),
    };
  }

  /**
   * Get metrics for a specific node
   */
  async getNodeMetrics(nodeId: string): Promise<NodeOverview | null> {
    const node = this.nodeMetricsCache.get(nodeId);
    if (!node) return null;

    // Refresh before returning
    await this.refreshNodeMetrics(nodeId);
    return node.metrics;
  }

  /**
   * Get all nodes
   */
  getNodes(): ClusterNodeMetrics[] {
    return Array.from(this.nodeMetricsCache.values());
  }

  /**
   * Update alert thresholds
   */
  setAlertThresholds(thresholds: Partial<AlertThresholds>): void {
    this.alertThresholds = { ...this.alertThresholds, ...thresholds };
  }

  /**
   * Get current alert thresholds
   */
  getAlertThresholds(): AlertThresholds {
    return { ...this.alertThresholds };
  }

  // Default metrics generators
  private getDefaultGPUMetrics(): GPUMetrics {
    return {
      name: 'NVIDIA Blackwell (GB10)',
      index: 0,
      utilization: 0,
      memoryUsed: 0,
      memoryTotal: 128000,
      temperature: 0,
      powerDraw: 0,
      powerLimit: 100,
      fanSpeed: 0,
    };
  }

  private getDefaultCPUMetrics(): CPUMetrics {
    return {
      model: '10x Cortex-X925 + 10x Cortex-A725',
      cores: 20,
      usage: 0,
      temperature: 0,
    };
  }

  private getDefaultMemoryMetrics(): MemoryMetrics {
    return {
      total: 128 * 1024 * 1024 * 1024,
      used: 0,
      percentage: 0,
    };
  }

  private getDefaultStorageMetrics(): StorageMetrics {
    return {
      total: 2 * 1024 * 1024 * 1024 * 1024,
      used: 0,
      percentage: 0,
    };
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let clusterServiceInstance: ClusterService | null = null;

export function getClusterService(): ClusterService {
  if (!clusterServiceInstance) {
    clusterServiceInstance = new ClusterService();
  }
  return clusterServiceInstance;
}

export default ClusterService;
