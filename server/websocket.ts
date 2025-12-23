/**
 * WebSocket Server for Real-time Updates
 * Provides instant GPU metrics and job status updates
 */

import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { localMetricsService } from './services/local-metrics';

// Message types for WebSocket communication
export type WSMessageType = 
  | 'gpu_metrics'
  | 'job_status'
  | 'system_metrics'
  | 'alert'
  | 'connection';

export interface WSMessage {
  type: WSMessageType;
  timestamp: number;
  data: unknown;
}

export interface GPUMetricsData {
  name: string;
  utilization: number;
  memoryUsed: number;
  memoryTotal: number;
  temperature: number;
  powerDraw: number;
  powerLimit: number;
  fanSpeed: number;
}

export interface SystemMetricsData {
  cpu: {
    usage: number;
    temperature: number;
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  gpu: GPUMetricsData;
}

export interface JobStatusData {
  id: string;
  submissionId: string;
  appName: string;
  status: string;
  progress?: number;
}

// Store connected clients
const clients = new Set<WebSocket>();

// Broadcast intervals
let metricsInterval: NodeJS.Timeout | null = null;
let jobStatusInterval: NodeJS.Timeout | null = null;

/**
 * Broadcast a message to all connected clients
 */
function broadcast(message: WSMessage): void {
  const messageStr = JSON.stringify(message);
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(messageStr);
    }
  });
}

/**
 * Broadcast GPU and system metrics to all clients
 */
async function broadcastMetrics(): Promise<void> {
  try {
    const metrics = await localMetricsService.getMetrics();
    
    const gpuMetrics: GPUMetricsData = {
      name: metrics.gpu.name,
      utilization: metrics.gpu.utilization,
      memoryUsed: metrics.gpu.memoryUsed,
      memoryTotal: metrics.gpu.memoryTotal,
      temperature: metrics.gpu.temperature,
      powerDraw: metrics.gpu.powerDraw,
      powerLimit: metrics.gpu.powerLimit,
      fanSpeed: metrics.gpu.fanSpeed,
    };

    const systemMetrics: SystemMetricsData = {
      cpu: {
        usage: metrics.cpu.usage,
        temperature: metrics.cpu.temperature,
      },
      memory: {
        used: metrics.memory.used,
        total: metrics.memory.total,
        percentage: (metrics.memory.used / metrics.memory.total) * 100,
      },
      gpu: gpuMetrics,
    };

    // Broadcast GPU metrics
    broadcast({
      type: 'gpu_metrics',
      timestamp: Date.now(),
      data: gpuMetrics,
    });

    // Broadcast system metrics
    broadcast({
      type: 'system_metrics',
      timestamp: Date.now(),
      data: systemMetrics,
    });

    // Check for temperature alerts
    if (metrics.gpu.temperature > 80) {
      broadcast({
        type: 'alert',
        timestamp: Date.now(),
        data: {
          level: 'warning',
          message: `GPU temperature high: ${metrics.gpu.temperature}°C`,
          metric: 'gpu_temperature',
          value: metrics.gpu.temperature,
        },
      });
    }
  } catch (error) {
    console.error('Failed to broadcast metrics:', error);
  }
}

/**
 * Broadcast job status updates
 * This is called when job status changes
 */
export function broadcastJobStatus(job: JobStatusData): void {
  broadcast({
    type: 'job_status',
    timestamp: Date.now(),
    data: job,
  });
}

/**
 * Initialize WebSocket server
 */
export function initWebSocket(server: Server): WebSocketServer {
  const wss = new WebSocketServer({ 
    server,
    path: '/ws',
  });

  wss.on('connection', (ws: WebSocket) => {
    console.log('WebSocket client connected');
    clients.add(ws);

    // Send connection confirmation
    ws.send(JSON.stringify({
      type: 'connection',
      timestamp: Date.now(),
      data: { status: 'connected', message: 'WebSocket connection established' },
    }));

    // Send initial metrics immediately
    broadcastMetrics();

    // Handle client messages
    ws.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        
        // Handle subscription requests
        if (message.type === 'subscribe') {
          console.log('Client subscribed to:', message.channels);
        }
        
        // Handle ping/pong for keepalive
        if (message.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    });

    // Handle client disconnect
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
      clients.delete(ws);
    });

    // Handle errors
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      clients.delete(ws);
    });
  });

  // Start broadcasting metrics every 2 seconds
  if (!metricsInterval) {
    metricsInterval = setInterval(broadcastMetrics, 2000);
  }

  console.log('WebSocket server initialized on /ws');
  return wss;
}

/**
 * Get the number of connected clients
 */
export function getConnectedClients(): number {
  return clients.size;
}

/**
 * Create a WebSocket message (exported for testing)
 */
export function createWebSocketMessage(type: WSMessageType, data: unknown): string {
  return JSON.stringify({
    type,
    timestamp: new Date().toISOString(),
    data,
  });
}

/**
 * Broadcast GPU metrics (exported for external use)
 */
export function broadcastGpuMetrics(data: Partial<GPUMetricsData>): void {
  broadcast({
    type: 'gpu_metrics',
    timestamp: Date.now(),
    data,
  });
}

/**
 * Broadcast system metrics (exported for external use)
 */
export function broadcastSystemMetrics(data: Partial<SystemMetricsData>): void {
  broadcast({
    type: 'system_metrics',
    timestamp: Date.now(),
    data,
  });
}

/**
 * Cleanup WebSocket server
 */
export function cleanupWebSocket(): void {
  if (metricsInterval) {
    clearInterval(metricsInterval);
    metricsInterval = null;
  }
  if (jobStatusInterval) {
    clearInterval(jobStatusInterval);
    jobStatusInterval = null;
  }
  clients.forEach(client => client.close());
  clients.clear();
}
