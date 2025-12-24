/**
 * Local Metrics Router
 * API endpoints for local DGX Spark metrics
 * Refactored to use unified MetricsService with proper error handling
 */

import { z } from 'zod';
import { publicProcedure, router } from '../_core/trpc';
import { getMetricsService } from '../services/metrics';
import { TRPCError } from '@trpc/server';

// Get singleton instance
const metricsService = getMetricsService();

// Helper for consistent error handling
function handleError(error: unknown, operation: string): never {
  console.error(`[LocalRouter] ${operation} failed:`, error);
  throw new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: `Failed to ${operation}`,
    cause: error,
  });
}

export const localRouter = router({
  /**
   * Get complete node overview for dashboard
   */
  getOverview: publicProcedure.query(async () => {
    try {
      return await metricsService.getNodeOverview();
    } catch (error) {
      handleError(error, 'get node overview');
    }
  }),

  /**
   * Get all metrics (full data)
   */
  getMetrics: publicProcedure.query(async () => {
    try {
      const [cpu, gpu, memory, storage, network, systemInfo] = await Promise.all([
        metricsService.getCPUMetrics(),
        metricsService.getGPUMetrics(),
        metricsService.getMemoryMetrics(),
        metricsService.getStorageMetrics(),
        metricsService.getNetworkMetrics(),
        metricsService.getSystemInfo(),
      ]);

      return {
        timestamp: Date.now(),
        system: systemInfo,
        cpu,
        gpu,
        memory,
        storage,
        network,
      };
    } catch (error) {
      handleError(error, 'get metrics');
    }
  }),

  /**
   * Get GPU metrics only
   */
  getGPU: publicProcedure.query(async () => {
    try {
      return await metricsService.getGPUMetrics();
    } catch (error) {
      handleError(error, 'get GPU metrics');
    }
  }),

  /**
   * Get CPU metrics only
   */
  getCPU: publicProcedure.query(async () => {
    try {
      return await metricsService.getCPUMetrics();
    } catch (error) {
      handleError(error, 'get CPU metrics');
    }
  }),

  /**
   * Get memory metrics only
   */
  getMemory: publicProcedure.query(async () => {
    try {
      return await metricsService.getMemoryMetrics();
    } catch (error) {
      handleError(error, 'get memory metrics');
    }
  }),

  /**
   * Get storage metrics only
   */
  getStorage: publicProcedure.query(async () => {
    try {
      return await metricsService.getStorageMetrics();
    } catch (error) {
      handleError(error, 'get storage metrics');
    }
  }),

  /**
   * Get network interface metrics
   */
  getNetwork: publicProcedure.query(async () => {
    try {
      return await metricsService.getNetworkMetrics();
    } catch (error) {
      handleError(error, 'get network metrics');
    }
  }),

  /**
   * Get top processes by CPU usage
   */
  getProcesses: publicProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(10) }).optional())
    .query(async ({ input }) => {
      try {
        const limit = input?.limit ?? 10;
        const processes = await metricsService.getTopProcesses(limit);
        return { processes };
      } catch (error) {
        handleError(error, 'get processes');
      }
    }),

  /**
   * Get system information
   */
  getSystemInfo: publicProcedure.query(async () => {
    try {
      const [systemInfo, gpu] = await Promise.all([
        metricsService.getSystemInfo(),
        metricsService.getGPUMetrics(),
      ]);

      return {
        ...systemInfo,
        driverVersion: gpu.driverVersion,
        cudaVersion: gpu.cudaVersion,
        gpuName: gpu.name,
      };
    } catch (error) {
      handleError(error, 'get system info');
    }
  }),

  /**
   * Get power state
   */
  getPowerState: publicProcedure.query(async () => {
    try {
      return await metricsService.getPowerState();
    } catch (error) {
      handleError(error, 'get power state');
    }
  }),

  /**
   * Health check endpoint
   */
  health: publicProcedure.query(async () => {
    try {
      const healthStatus = await metricsService.healthCheck();
      const overview = await metricsService.getNodeOverview();

      return {
        status: healthStatus.healthy ? 'healthy' : 'unhealthy',
        simulated: healthStatus.simulated,
        message: healthStatus.message,
        timestamp: Date.now(),
        checks: {
          cpu: overview.cpu.usage < 95 ? 'ok' : 'warning',
          gpu: overview.gpu.temperature < 80 ? 'ok' : 'warning',
          memory: overview.memory.percentage < 90 ? 'ok' : 'warning',
          storage: overview.storage.percentage < 90 ? 'ok' : 'warning',
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        simulated: true,
        message: 'Health check failed',
        timestamp: Date.now(),
        error: String(error),
      };
    }
  }),
});
