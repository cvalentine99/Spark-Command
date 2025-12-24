/**
 * Local Metrics Router
 * API endpoints for local DGX Spark metrics
 * Refactored to use unified MetricsService with proper error handling
 */

import { z } from 'zod';
import { publicProcedure, router } from '../_core/trpc';
import { getMetricsService } from '../services/metrics';
import { TRPCError } from '@trpc/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

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

  /**
   * Get active network connections using ss command
   */
  getConnections: publicProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(20),
      state: z.enum(['all', 'established', 'listen']).default('all'),
    }).optional())
    .query(async ({ input }) => {
      const limit = input?.limit ?? 20;
      const state = input?.state ?? 'all';

      try {
        // Use ss command to get network connections
        // -t = TCP, -u = UDP, -n = numeric, -a = all states
        let cmd = 'ss -tunap 2>/dev/null';

        const { stdout } = await execAsync(cmd, { timeout: 5000 });
        const lines = stdout.trim().split('\n').slice(1); // Skip header

        const connections = lines
          .map(line => {
            const parts = line.split(/\s+/);
            if (parts.length < 5) return null;

            const [netid, recvQ, sendQ, local, peer] = parts;
            const processInfo = parts.slice(5).join(' ');

            // Parse local and peer addresses
            const localParts = local.split(':');
            const peerParts = peer.split(':');

            const localPort = localParts.pop() || '';
            const localAddr = localParts.join(':') || '*';
            const peerPort = peerParts.pop() || '';
            const peerAddr = peerParts.join(':') || '*';

            // Extract process name if available
            const processMatch = processInfo.match(/users:\(\("([^"]+)"/);
            const processName = processMatch ? processMatch[1] : undefined;

            // Determine connection state
            let connectionState = 'UNKNOWN';
            if (peerAddr === '*' || peerAddr === '0.0.0.0' || peerAddr === '::') {
              connectionState = 'LISTEN';
            } else if (peerAddr) {
              connectionState = 'ESTABLISHED';
            }

            // Skip if filtering by state
            if (state === 'established' && connectionState !== 'ESTABLISHED') return null;
            if (state === 'listen' && connectionState !== 'LISTEN') return null;

            // Determine protocol type based on port
            let protocol = 'TCP';
            if (netid === 'udp') protocol = 'UDP';

            // Common protocol detection
            const portNum = parseInt(peerPort) || parseInt(localPort);
            if (portNum === 22) protocol = 'SSH';
            else if (portNum === 80) protocol = 'HTTP';
            else if (portNum === 443) protocol = 'HTTPS';
            else if (portNum === 3000) protocol = 'Node.js';
            else if (portNum === 5432) protocol = 'PostgreSQL';
            else if (portNum === 3306) protocol = 'MySQL';
            else if (portNum === 6379) protocol = 'Redis';
            else if (portNum === 8080) protocol = 'HTTP-Alt';
            else if (portNum === 9090) protocol = 'Prometheus';
            else if (portNum === 9100) protocol = 'Node Exporter';
            else if (portNum === 9400) protocol = 'DCGM';
            else if (portNum === 8000) protocol = 'vLLM';
            else if (portNum === 7077) protocol = 'Spark Master';

            return {
              remote: peerAddr === '*' ? localAddr : peerAddr,
              port: parseInt(peerPort) || parseInt(localPort),
              localPort: parseInt(localPort),
              protocol,
              state: connectionState,
              process: processName,
            };
          })
          .filter((conn): conn is NonNullable<typeof conn> => conn !== null)
          .slice(0, limit);

        return {
          connections,
          total: lines.length,
          source: 'ss',
        };
      } catch (error) {
        // Return simulated data if ss command fails
        const simulatedConnections = [
          { remote: '127.0.0.1', port: 3000, localPort: 3000, protocol: 'Node.js', state: 'LISTEN', process: 'node' },
          { remote: '127.0.0.1', port: 9400, localPort: 9400, protocol: 'DCGM', state: 'LISTEN', process: 'dcgm-exporter' },
          { remote: '127.0.0.1', port: 9100, localPort: 9100, protocol: 'Node Exporter', state: 'LISTEN', process: 'node_exporter' },
          { remote: '127.0.0.1', port: 7077, localPort: 7077, protocol: 'Spark Master', state: 'LISTEN', process: 'java' },
        ];

        return {
          connections: simulatedConnections.slice(0, limit),
          total: simulatedConnections.length,
          source: 'simulated',
        };
      }
    }),

  /**
   * Get status of local services
   */
  getServiceStatus: publicProcedure.query(async () => {
    // List of services to check
    const servicesToCheck = [
      { name: 'Command Center', port: 3000, process: 'node', systemd: null },
      { name: 'DCGM Exporter', port: 9400, process: 'dcgm-exporter', systemd: 'nvidia-dcgm' },
      { name: 'Node Exporter', port: 9100, process: 'node_exporter', systemd: 'node_exporter' },
      { name: 'Spark Master', port: 7077, process: 'java', systemd: 'spark-master' },
      { name: 'Spark UI', port: 8080, process: 'java', systemd: null },
      { name: 'Jupyter Lab', port: 8888, process: 'jupyter', systemd: 'jupyter' },
      { name: 'vLLM Server', port: 8000, process: 'python', systemd: 'vllm' },
      { name: 'Prometheus', port: 9090, process: 'prometheus', systemd: 'prometheus' },
    ];

    const checkPort = async (port: number): Promise<boolean> => {
      try {
        const { stdout } = await execAsync(`ss -tlnp 2>/dev/null | grep :${port}`, { timeout: 2000 });
        return stdout.trim().length > 0;
      } catch {
        return false;
      }
    };

    const checkProcess = async (processName: string): Promise<boolean> => {
      try {
        const { stdout } = await execAsync(`pgrep -x ${processName} 2>/dev/null || pgrep -f ${processName} 2>/dev/null | head -1`, { timeout: 2000 });
        return stdout.trim().length > 0;
      } catch {
        return false;
      }
    };

    try {
      const services = await Promise.all(
        servicesToCheck.map(async (service) => {
          const [portActive, processRunning] = await Promise.all([
            checkPort(service.port),
            checkProcess(service.process),
          ]);

          let status: 'running' | 'stopped' | 'unknown' = 'unknown';
          if (portActive || processRunning) {
            status = 'running';
          } else {
            status = 'stopped';
          }

          return {
            name: service.name,
            port: service.port,
            status,
            checked: true,
          };
        })
      );

      return {
        services,
        source: 'system',
        timestamp: Date.now(),
      };
    } catch (error) {
      // Return simulated data if checks fail
      return {
        services: servicesToCheck.map(s => ({
          name: s.name,
          port: s.port,
          status: 'unknown' as const,
          checked: false,
        })),
        source: 'simulated',
        timestamp: Date.now(),
      };
    }
  }),
});
