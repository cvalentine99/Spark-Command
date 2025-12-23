/**
 * Local Metrics Router
 * API endpoints for local DGX Spark metrics
 */

import { z } from 'zod';
import { publicProcedure, router } from '../_core/trpc';
import { localMetricsService } from '../services/local-metrics';

export const localRouter = router({
  /**
   * Get all local system metrics
   */
  getMetrics: publicProcedure.query(async () => {
    return await localMetricsService.getMetrics();
  }),

  /**
   * Get system overview for dashboard
   */
  getOverview: publicProcedure.query(async () => {
    const metrics = await localMetricsService.getMetrics();
    
    return {
      hostname: metrics.system.hostname,
      uptime: metrics.system.uptime,
      status: 'operational' as const,
      cpu: {
        model: metrics.cpu.model,
        cores: metrics.cpu.cores,
        usage: metrics.cpu.usage,
        temperature: metrics.cpu.temperature,
      },
      gpu: {
        name: metrics.gpu.name,
        utilization: metrics.gpu.utilization,
        memoryUsed: metrics.gpu.memoryUsed,
        memoryTotal: metrics.gpu.memoryTotal,
        temperature: metrics.gpu.temperature,
        powerDraw: metrics.gpu.powerDraw,
        powerLimit: metrics.gpu.powerLimit,
      },
      memory: {
        total: metrics.memory.total,
        used: metrics.memory.used,
        percentage: (metrics.memory.used / metrics.memory.total) * 100,
      },
      storage: {
        total: metrics.storage.devices[0]?.total || 0,
        used: metrics.storage.devices[0]?.used || 0,
        percentage: metrics.storage.devices[0] 
          ? (metrics.storage.devices[0].used / metrics.storage.devices[0].total) * 100 
          : 0,
      },
    };
  }),

  /**
   * Get GPU details
   */
  getGPU: publicProcedure.query(async () => {
    const metrics = await localMetricsService.getMetrics();
    return metrics.gpu;
  }),

  /**
   * Get CPU details
   */
  getCPU: publicProcedure.query(async () => {
    const metrics = await localMetricsService.getMetrics();
    return metrics.cpu;
  }),

  /**
   * Get memory details
   */
  getMemory: publicProcedure.query(async () => {
    const metrics = await localMetricsService.getMetrics();
    return metrics.memory;
  }),

  /**
   * Get storage details
   */
  getStorage: publicProcedure.query(async () => {
    const metrics = await localMetricsService.getMetrics();
    return metrics.storage;
  }),

  /**
   * Get network interfaces
   */
  getNetwork: publicProcedure.query(async () => {
    const metrics = await localMetricsService.getMetrics();
    return metrics.network;
  }),

  /**
   * Get top processes
   */
  getProcesses: publicProcedure.query(async () => {
    const metrics = await localMetricsService.getMetrics();
    return metrics.processes;
  }),

  /**
   * Get system info
   */
  getSystemInfo: publicProcedure.query(async () => {
    const metrics = await localMetricsService.getMetrics();
    return {
      ...metrics.system,
      cpu: metrics.cpu.model,
      gpu: metrics.gpu.name,
      memory: `${Math.round(metrics.memory.total / (1024 * 1024 * 1024))} GB`,
      storage: `${Math.round(metrics.storage.devices[0]?.total / (1024 * 1024 * 1024 * 1024) || 0)} TB`,
      driverVersion: metrics.gpu.driverVersion,
      cudaVersion: metrics.gpu.cudaVersion,
    };
  }),

  /**
   * Health check
   */
  health: publicProcedure.query(async () => {
    try {
      const metrics = await localMetricsService.getMetrics();
      return {
        status: 'healthy',
        timestamp: metrics.timestamp,
        checks: {
          cpu: metrics.cpu.usage < 95 ? 'ok' : 'warning',
          gpu: metrics.gpu.temperature < 80 ? 'ok' : 'warning',
          memory: (metrics.memory.used / metrics.memory.total) < 0.9 ? 'ok' : 'warning',
          storage: (metrics.storage.devices[0]?.used / metrics.storage.devices[0]?.total) < 0.9 ? 'ok' : 'warning',
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: Date.now(),
        error: String(error),
      };
    }
  }),
});
