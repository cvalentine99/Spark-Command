/**
 * Prometheus Metrics Router
 * API endpoints for fetching DGX Spark cluster metrics
 */

import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { getPrometheusService, resetPrometheusService } from "../services/prometheus";

export const metricsRouter = router({
  /**
   * Health check for Prometheus connection
   */
  healthCheck: publicProcedure.query(async () => {
    const prometheus = getPrometheusService();
    return prometheus.healthCheck();
  }),

  /**
   * Get cluster overview metrics
   */
  clusterOverview: publicProcedure.query(async () => {
    const prometheus = getPrometheusService();
    return prometheus.getClusterOverview();
  }),

  /**
   * Get GPU metrics for all GPUs
   */
  gpuMetrics: publicProcedure.query(async () => {
    const prometheus = getPrometheusService();
    return prometheus.getGPUMetrics();
  }),

  /**
   * Get node-level system metrics
   */
  nodeMetrics: publicProcedure.query(async () => {
    const prometheus = getPrometheusService();
    return prometheus.getNodeMetrics();
  }),

  /**
   * Get GPU utilization history
   */
  gpuUtilizationHistory: publicProcedure
    .input(z.object({ hours: z.number().min(1).max(168).default(24) }))
    .query(async ({ input }) => {
      const prometheus = getPrometheusService();
      return prometheus.getGPUUtilizationHistory(input.hours);
    }),

  /**
   * Get memory usage history
   */
  memoryUsageHistory: publicProcedure
    .input(z.object({ hours: z.number().min(1).max(168).default(24) }))
    .query(async ({ input }) => {
      const prometheus = getPrometheusService();
      return prometheus.getMemoryUsageHistory(input.hours);
    }),

  /**
   * Execute a custom PromQL query (for advanced users)
   */
  customQuery: publicProcedure
    .input(z.object({ query: z.string().min(1).max(1000) }))
    .query(async ({ input }) => {
      const prometheus = getPrometheusService();
      return prometheus.query(input.query);
    }),

  /**
   * Update Prometheus URL configuration
   */
  updateConfig: publicProcedure
    .input(z.object({ prometheusUrl: z.string().url() }))
    .mutation(async ({ input }) => {
      // Reset the service with new URL
      resetPrometheusService();
      const prometheus = getPrometheusService(input.prometheusUrl);
      const health = await prometheus.healthCheck();
      
      return {
        success: health.healthy,
        message: health.message,
        url: input.prometheusUrl,
      };
    }),
});
