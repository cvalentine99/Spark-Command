/**
 * Cluster Router - Multi-Node Cluster Management API
 * Provides tRPC endpoints for cluster-wide operations
 */

import { z } from 'zod';
import { router, publicProcedure, protectedProcedure, adminProcedure } from '../_core/trpc';
import { getClusterService } from '../services/cluster';
import { getSSHService } from '../services/ssh';
import { getWebSocketService } from '../services/websocket';

// ============================================================================
// Input Schemas
// ============================================================================

const nodeIdSchema = z.string().min(1).max(64);

const addNodeSchema = z.object({
  id: nodeIdSchema,
  name: z.string().min(1).max(128),
  hostname: z.string().min(1).max(256),
  port: z.number().int().min(1).max(65535).default(22),
  username: z.string().min(1).max(64),
  role: z.enum(['master', 'worker']).default('worker'),
});

const alertThresholdsSchema = z.object({
  temperatureWarning: z.number().min(50).max(100).optional(),
  temperatureCritical: z.number().min(60).max(110).optional(),
  memoryWarning: z.number().min(50).max(100).optional(),
  memoryCritical: z.number().min(70).max(100).optional(),
  gpuUtilizationWarning: z.number().min(50).max(100).optional(),
});

// ============================================================================
// Router
// ============================================================================

export const clusterRouter = router({
  /**
   * Get cluster-wide overview
   * Returns aggregated metrics for all nodes
   */
  getOverview: publicProcedure.query(async () => {
    const clusterService = getClusterService();
    return await clusterService.getClusterOverview();
  }),

  /**
   * Get detailed cluster metrics
   * Returns full metrics including per-node data
   */
  getMetrics: publicProcedure.query(async () => {
    const clusterService = getClusterService();
    return await clusterService.getClusterMetrics();
  }),

  /**
   * Get all nodes in the cluster
   */
  getNodes: publicProcedure.query(async () => {
    const clusterService = getClusterService();
    return clusterService.getNodes();
  }),

  /**
   * Get metrics for a specific node
   */
  getNodeMetrics: publicProcedure
    .input(z.object({ nodeId: nodeIdSchema }))
    .query(async ({ input }) => {
      const clusterService = getClusterService();
      const metrics = await clusterService.getNodeMetrics(input.nodeId);
      if (!metrics) {
        throw new Error(`Node ${input.nodeId} not found`);
      }
      return metrics;
    }),

  /**
   * Add a new node to the cluster
   * Requires admin privileges
   */
  addNode: adminProcedure
    .input(addNodeSchema)
    .mutation(async ({ input }) => {
      const sshService = getSSHService();

      // Add SSH configuration
      sshService.addNode({
        id: input.id,
        name: input.name,
        hostname: input.hostname,
        port: input.port,
        username: input.username,
      });

      // Test connection
      const connected = await sshService.pingNode(input.id);

      return {
        success: true,
        nodeId: input.id,
        connected,
        message: connected
          ? `Node ${input.name} added and connected successfully`
          : `Node ${input.name} added but connection failed`,
      };
    }),

  /**
   * Remove a node from the cluster
   * Requires admin privileges
   */
  removeNode: adminProcedure
    .input(z.object({ nodeId: nodeIdSchema }))
    .mutation(async ({ input }) => {
      // Prevent removing the local node
      if (input.nodeId === 'local') {
        throw new Error('Cannot remove the local node');
      }

      const sshService = getSSHService();
      sshService.removeNode(input.nodeId);

      return {
        success: true,
        message: `Node ${input.nodeId} removed from cluster`,
      };
    }),

  /**
   * Test connection to a node
   */
  testConnection: protectedProcedure
    .input(z.object({ nodeId: nodeIdSchema }))
    .query(async ({ input }) => {
      const sshService = getSSHService();
      const connected = await sshService.pingNode(input.nodeId);
      const state = sshService.getConnectionState(input.nodeId);

      return {
        nodeId: input.nodeId,
        connected,
        lastConnected: state?.lastConnected,
        lastError: state?.lastError,
        connectionAttempts: state?.connectionAttempts || 0,
      };
    }),

  /**
   * Execute a command on a specific node
   * Requires admin privileges
   * SECURITY: Only allows safe diagnostic commands
   */
  executeCommand: adminProcedure
    .input(z.object({
      nodeId: nodeIdSchema,
      command: z.enum([
        'nvidia-smi',
        'uptime',
        'df -h',
        'free -h',
        'hostname',
        'uname -a',
        'cat /proc/cpuinfo | head -20',
        'top -bn1 | head -20',
      ]),
    }))
    .mutation(async ({ input }) => {
      const sshService = getSSHService();
      const result = await sshService.executeCommand(input.nodeId, input.command);

      return {
        nodeId: input.nodeId,
        command: input.command,
        success: result.success,
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.code,
        duration: result.duration,
      };
    }),

  /**
   * Get cluster health status
   */
  getHealth: publicProcedure.query(async () => {
    const sshService = getSSHService();
    const health = await sshService.getNodesHealth();

    const nodes: { nodeId: string; healthy: boolean }[] = [];
    const entries = Array.from(health.entries());
    for (const [nodeId, healthy] of entries) {
      nodes.push({ nodeId, healthy });
    }

    const allHealthy = nodes.every(n => n.healthy);
    const healthyCount = nodes.filter(n => n.healthy).length;

    return {
      status: allHealthy ? 'healthy' : healthyCount > 0 ? 'degraded' : 'unhealthy',
      totalNodes: nodes.length,
      healthyNodes: healthyCount,
      nodes,
    };
  }),

  /**
   * Get alert thresholds
   */
  getAlertThresholds: publicProcedure.query(async () => {
    const clusterService = getClusterService();
    return clusterService.getAlertThresholds();
  }),

  /**
   * Update alert thresholds
   * Requires admin privileges
   */
  setAlertThresholds: adminProcedure
    .input(alertThresholdsSchema)
    .mutation(async ({ input }) => {
      const clusterService = getClusterService();
      clusterService.setAlertThresholds(input);

      return {
        success: true,
        thresholds: clusterService.getAlertThresholds(),
      };
    }),

  /**
   * Get WebSocket connection statistics
   */
  getWebSocketStats: protectedProcedure.query(async () => {
    const wsService = getWebSocketService();
    return wsService.getStats();
  }),

  /**
   * Force refresh metrics for all nodes
   */
  refreshMetrics: protectedProcedure.mutation(async () => {
    const clusterService = getClusterService();
    await clusterService.refreshAllMetrics();

    return {
      success: true,
      message: 'Metrics refreshed for all nodes',
    };
  }),
});

export type ClusterRouter = typeof clusterRouter;
