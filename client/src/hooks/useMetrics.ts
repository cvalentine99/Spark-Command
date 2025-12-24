/**
 * Custom hooks for fetching DGX Spark metrics from Prometheus
 */

import { trpc } from "@/lib/trpc";
import { useState } from "react";

// Types matching the backend
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

export interface ClusterOverview {
  totalGpuCompute: number;
  activeJobs: number;
  totalMemory: number;
  usedMemory: number;
  inferenceRps: number;
  clusterStatus: 'operational' | 'degraded' | 'offline';
  uptime: string;
  nodes: {
    name: string;
    status: 'online' | 'offline' | 'warning';
    ip: string;
  }[];
}

// Mock data for when Prometheus is not connected
const mockClusterOverview: ClusterOverview = {
  totalGpuCompute: 1.8,
  activeJobs: 8,
  totalMemory: 256,
  usedMemory: 142,
  inferenceRps: 425,
  clusterStatus: 'operational',
  uptime: '14d 2h 15m',
  nodes: [
    { name: 'DGX-SPARK-01', status: 'online', ip: '192.168.100.10' },
    { name: 'DGX-SPARK-02', status: 'online', ip: '192.168.100.11' },
  ],
};

const mockGPUMetrics: GPUMetrics[] = [
  {
    node: 'DGX-SPARK-01',
    gpuIndex: 0,
    utilization: 92,
    memoryUsed: 62000,
    memoryTotal: 128000,
    temperature: 72,
    powerDraw: 245,
    powerLimit: 265,
    fanSpeed: 45,
    smClock: 2100,
    memClock: 9500,
  },
  {
    node: 'DGX-SPARK-02',
    gpuIndex: 0,
    utilization: 88,
    memoryUsed: 58000,
    memoryTotal: 128000,
    temperature: 68,
    powerDraw: 235,
    powerLimit: 265,
    fanSpeed: 42,
    smClock: 2050,
    memClock: 9500,
  },
];

const mockNodeMetrics: NodeMetrics[] = [
  {
    hostname: 'dgx-spark-01',
    ip: '192.168.100.10',
    cpuUsage: 45,
    memoryUsed: 62 * 1024 * 1024 * 1024,
    memoryTotal: 128 * 1024 * 1024 * 1024,
    diskUsed: 500 * 1024 * 1024 * 1024,
    diskTotal: 2000 * 1024 * 1024 * 1024,
    networkRxBytes: 125000000,
    networkTxBytes: 98000000,
    uptime: 1234567,
  },
  {
    hostname: 'dgx-spark-02',
    ip: '192.168.100.11',
    cpuUsage: 42,
    memoryUsed: 58 * 1024 * 1024 * 1024,
    memoryTotal: 128 * 1024 * 1024 * 1024,
    diskUsed: 450 * 1024 * 1024 * 1024,
    diskTotal: 2000 * 1024 * 1024 * 1024,
    networkRxBytes: 115000000,
    networkTxBytes: 92000000,
    uptime: 1234567,
  },
];

/**
 * Hook for cluster overview metrics with polling
 */
export function useClusterOverview(pollingInterval: number = 5000) {
  const [useMock, setUseMock] = useState(true);
  
  const query = trpc.metrics.clusterOverview.useQuery(undefined, {
    refetchInterval: pollingInterval,
    retry: 1,
  });

  // Determine if we should use mock data
  const shouldUseMock = useMock || query.isError || !query.data;
  
  // Check if we got real data
  if (query.data && query.data.nodes.some(n => n.status === 'online') && useMock) {
    setUseMock(false);
  }

  return {
    data: shouldUseMock ? mockClusterOverview : query.data!,
    isLoading: query.isLoading,
    isError: query.isError,
    isLive: !shouldUseMock,
    refetch: query.refetch,
  };
}

/**
 * Hook for GPU metrics with polling
 */
export function useGPUMetrics(pollingInterval: number = 5000) {
  const [useMock, setUseMock] = useState(true);

  const query = trpc.metrics.gpuMetrics.useQuery(undefined, {
    refetchInterval: pollingInterval,
    retry: 1,
  });

  // Check if we got real data
  if (query.data && query.data.length > 0 && useMock) {
    setUseMock(false);
  }

  const shouldUseMock = useMock || query.isError || !query.data || query.data.length === 0;

  return {
    data: shouldUseMock ? mockGPUMetrics : query.data!,
    isLoading: query.isLoading,
    isError: query.isError,
    isLive: !shouldUseMock,
    refetch: query.refetch,
  };
}

/**
 * Hook for node metrics with polling
 */
export function useNodeMetrics(pollingInterval: number = 5000) {
  const [useMock, setUseMock] = useState(true);

  const query = trpc.metrics.nodeMetrics.useQuery(undefined, {
    refetchInterval: pollingInterval,
    retry: 1,
  });

  // Check if we got real data
  if (query.data && query.data.length > 0 && useMock) {
    setUseMock(false);
  }

  const shouldUseMock = useMock || query.isError || !query.data || query.data.length === 0;

  return {
    data: shouldUseMock ? mockNodeMetrics : query.data!,
    isLoading: query.isLoading,
    isError: query.isError,
    isLive: !shouldUseMock,
    refetch: query.refetch,
  };
}

/**
 * Hook for GPU utilization history
 */
export function useGPUUtilizationHistory(hours: number = 24) {
  const query = trpc.metrics.gpuUtilizationHistory.useQuery(
    { hours },
    {
      refetchInterval: 60000, // Refresh every minute
      retry: 1,
    }
  );

  // Generate mock history data
  const mockHistory = Array.from({ length: 24 }, (_, i) => ({
    timestamp: Date.now() - (23 - i) * 3600000,
    value: 70 + Math.random() * 25,
  }));

  const hasData = query.data && query.data.length > 0;

  return {
    data: hasData ? query.data! : mockHistory,
    isLoading: query.isLoading,
    isError: query.isError,
    isLive: hasData,
  };
}

/**
 * Hook for memory usage history
 */
export function useMemoryUsageHistory(hours: number = 24) {
  const query = trpc.metrics.memoryUsageHistory.useQuery(
    { hours },
    {
      refetchInterval: 60000,
      retry: 1,
    }
  );

  // Generate mock history data
  const mockHistory = Array.from({ length: 24 }, (_, i) => ({
    timestamp: Date.now() - (23 - i) * 3600000,
    value: 40 + Math.random() * 30,
  }));

  const hasData = query.data && query.data.length > 0;

  return {
    data: hasData ? query.data! : mockHistory,
    isLoading: query.isLoading,
    isError: query.isError,
    isLive: hasData,
  };
}

/**
 * Hook for Prometheus health check
 */
export function usePrometheusHealth() {
  const query = trpc.metrics.healthCheck.useQuery(undefined, {
    refetchInterval: 30000,
    retry: 1,
  });

  return {
    isHealthy: query.data?.healthy ?? false,
    message: query.data?.message ?? 'Not connected',
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}

/**
 * Utility function to format bytes to human readable
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Utility function to format uptime
 */
export function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${days}d ${hours}h ${minutes}m`;
}

// =============================================================================
// Local Metrics Hooks (New unified API)
// =============================================================================

const FAST_REFRESH = 5000;
const NORMAL_REFRESH = 15000;
const SLOW_REFRESH = 30000;

/**
 * Hook for local GPU metrics
 */
export function useLocalGPU(options?: { enabled?: boolean }) {
  const query = trpc.local.getGPU.useQuery(undefined, {
    refetchInterval: FAST_REFRESH,
    enabled: options?.enabled ?? true,
  });

  return {
    gpu: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}

/**
 * Hook for local CPU metrics
 */
export function useLocalCPU(options?: { enabled?: boolean }) {
  const query = trpc.local.getCPU.useQuery(undefined, {
    refetchInterval: NORMAL_REFRESH,
    enabled: options?.enabled ?? true,
  });

  return {
    cpu: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}

/**
 * Hook for node overview
 */
export function useNodeOverview(options?: { enabled?: boolean }) {
  const query = trpc.local.getOverview.useQuery(undefined, {
    refetchInterval: FAST_REFRESH,
    enabled: options?.enabled ?? true,
  });

  return {
    overview: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}

/**
 * Hook for health status
 */
export function useHealthStatus(options?: { enabled?: boolean }) {
  const query = trpc.local.health.useQuery(undefined, {
    refetchInterval: NORMAL_REFRESH,
    enabled: options?.enabled ?? true,
  });

  return {
    health: query.data,
    isHealthy: query.data?.status === 'healthy',
    isSimulated: query.data?.simulated ?? true,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}
