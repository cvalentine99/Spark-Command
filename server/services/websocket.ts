/**
 * WebSocket Service for Real-Time Metrics Streaming
 * Implements bidirectional communication for GPU telemetry dashboards
 * Based on research report Section 7 - Real-Time Streaming Architecture
 */

import { WebSocketServer, WebSocket } from 'ws';
import type { Server as HttpServer } from 'http';
import type {
  WebSocketMessage,
  WebSocketMessageType,
  GPUMetricsMessage,
  JobStatusMessage,
  AlertMessage,
  GPUMetrics,
  NodeOverview,
} from '@shared/dgx-types';
import { getMetricsService } from './metrics';
import { getClusterService } from './cluster';

// ============================================================================
// Types
// ============================================================================

interface ClientSubscription {
  topics: Set<WebSocketMessageType>;
  nodeIds: Set<string>; // Empty means all nodes
  authenticated: boolean;
  userId?: string;
}

interface WebSocketClient extends WebSocket {
  id: string;
  subscription: ClientSubscription;
  isAlive: boolean;
  lastPing: number;
}

type ClientMessage =
  | { type: 'subscribe'; topics: WebSocketMessageType[]; nodeIds?: string[] }
  | { type: 'unsubscribe'; topics: WebSocketMessageType[] }
  | { type: 'ping' }
  | { type: 'authenticate'; token: string }
  | { type: 'command'; action: string; params: Record<string, unknown> };

// ============================================================================
// WebSocket Service
// ============================================================================

export class WebSocketService {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, WebSocketClient> = new Map();
  private metricsInterval: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private metricsRefreshMs: number = 2000; // 2 seconds as per research
  private allowedOrigins: Set<string>;

  constructor() {
    // Configure allowed origins for CSWSH prevention
    this.allowedOrigins = new Set([
      'http://localhost:3000',
      'http://localhost:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173',
    ]);

    // Add custom origins from environment
    if (process.env.ALLOWED_ORIGINS) {
      process.env.ALLOWED_ORIGINS.split(',').forEach(origin => {
        this.allowedOrigins.add(origin.trim());
      });
    }
  }

  /**
   * Initialize WebSocket server attached to HTTP server
   */
  initialize(server: HttpServer): void {
    if (this.wss) {
      console.warn('WebSocket server already initialized');
      return;
    }

    this.wss = new WebSocketServer({
      server,
      path: '/ws',
      verifyClient: (info, callback) => {
        // Origin validation to prevent CSWSH attacks
        const origin = info.origin || info.req.headers.origin;

        // In development, be more permissive
        if (process.env.NODE_ENV === 'development') {
          callback(true);
          return;
        }

        if (!origin || !this.allowedOrigins.has(origin)) {
          console.warn(`WebSocket connection rejected from origin: ${origin}`);
          callback(false, 403, 'Forbidden');
          return;
        }

        callback(true);
      }
    });

    this.wss.on('connection', (ws: WebSocket, req) => {
      this.handleConnection(ws as WebSocketClient, req);
    });

    this.wss.on('error', (error) => {
      console.error('WebSocket server error:', error);
    });

    // Start metrics broadcasting
    this.startMetricsBroadcast();

    // Start heartbeat for connection health
    this.startHeartbeat();

    console.log('WebSocket server initialized on /ws');
  }

  /**
   * Handle new client connection
   */
  private handleConnection(ws: WebSocketClient, req: import('http').IncomingMessage): void {
    // Generate unique client ID
    ws.id = this.generateClientId();
    ws.isAlive = true;
    ws.lastPing = Date.now();

    // Initialize subscription with default topics
    ws.subscription = {
      topics: new Set<WebSocketMessageType>(['gpu_metrics', 'system_status']),
      nodeIds: new Set<string>(),
      authenticated: false,
    };

    this.clients.set(ws.id, ws);

    console.log(`WebSocket client connected: ${ws.id} from ${req.socket.remoteAddress}`);

    // Send connection acknowledgment
    this.sendToClient(ws, {
      type: 'connection',
      timestamp: Date.now(),
      data: {
        clientId: ws.id,
        message: 'Connected to DGX Spark Command Center',
        serverTime: new Date().toISOString(),
      },
    });

    // Handle incoming messages
    ws.on('message', (data) => {
      this.handleMessage(ws, data);
    });

    // Handle pong responses for heartbeat
    ws.on('pong', () => {
      ws.isAlive = true;
      ws.lastPing = Date.now();
    });

    // Handle client disconnect
    ws.on('close', (code, reason) => {
      console.log(`WebSocket client disconnected: ${ws.id} (code: ${code})`);
      this.clients.delete(ws.id);
    });

    // Handle errors
    ws.on('error', (error) => {
      console.error(`WebSocket client error (${ws.id}):`, error);
      this.clients.delete(ws.id);
    });
  }

  /**
   * Handle incoming client messages
   */
  private handleMessage(ws: WebSocketClient, data: import('ws').RawData): void {
    try {
      const message = JSON.parse(data.toString()) as ClientMessage;

      switch (message.type) {
        case 'subscribe':
          this.handleSubscribe(ws, message.topics, message.nodeIds);
          break;

        case 'unsubscribe':
          this.handleUnsubscribe(ws, message.topics);
          break;

        case 'ping':
          ws.isAlive = true;
          this.sendToClient(ws, {
            type: 'connection',
            timestamp: Date.now(),
            data: { pong: true },
          });
          break;

        case 'authenticate':
          this.handleAuthenticate(ws, message.token);
          break;

        case 'command':
          this.handleCommand(ws, message.action, message.params);
          break;

        default:
          console.warn(`Unknown message type from ${ws.id}`);
      }
    } catch (error) {
      console.error(`Failed to parse message from ${ws.id}:`, error);
      this.sendToClient(ws, {
        type: 'connection',
        timestamp: Date.now(),
        data: { error: 'Invalid message format' },
      });
    }
  }

  /**
   * Handle topic subscription
   */
  private handleSubscribe(
    ws: WebSocketClient,
    topics: WebSocketMessageType[],
    nodeIds?: string[]
  ): void {
    topics.forEach(topic => ws.subscription.topics.add(topic));

    if (nodeIds) {
      nodeIds.forEach(id => ws.subscription.nodeIds.add(id));
    }

    console.log(`Client ${ws.id} subscribed to: ${topics.join(', ')}`);

    this.sendToClient(ws, {
      type: 'connection',
      timestamp: Date.now(),
      data: {
        subscribed: Array.from(ws.subscription.topics),
        nodeIds: Array.from(ws.subscription.nodeIds),
      },
    });
  }

  /**
   * Handle topic unsubscription
   */
  private handleUnsubscribe(ws: WebSocketClient, topics: WebSocketMessageType[]): void {
    topics.forEach(topic => ws.subscription.topics.delete(topic));

    console.log(`Client ${ws.id} unsubscribed from: ${topics.join(', ')}`);
  }

  /**
   * Handle authentication (JWT validation)
   */
  private async handleAuthenticate(ws: WebSocketClient, token: string): Promise<void> {
    try {
      // In a production system, validate JWT here
      // For now, we'll accept any non-empty token
      if (token && token.length > 0) {
        ws.subscription.authenticated = true;
        ws.subscription.userId = 'authenticated-user';

        this.sendToClient(ws, {
          type: 'connection',
          timestamp: Date.now(),
          data: { authenticated: true },
        });
      } else {
        this.sendToClient(ws, {
          type: 'connection',
          timestamp: Date.now(),
          data: { authenticated: false, error: 'Invalid token' },
        });
      }
    } catch (error) {
      this.sendToClient(ws, {
        type: 'connection',
        timestamp: Date.now(),
        data: { authenticated: false, error: 'Authentication failed' },
      });
    }
  }

  /**
   * Handle command requests (requires authentication for sensitive commands)
   */
  private async handleCommand(
    ws: WebSocketClient,
    action: string,
    params: Record<string, unknown>
  ): Promise<void> {
    // Sensitive commands require authentication
    const sensitiveCommands = ['setPowerLimit', 'setFanSpeed', 'killJob'];

    if (sensitiveCommands.includes(action) && !ws.subscription.authenticated) {
      this.sendToClient(ws, {
        type: 'connection',
        timestamp: Date.now(),
        data: { error: 'Authentication required for this command' },
      });
      return;
    }

    // Command handling would be implemented here
    console.log(`Command from ${ws.id}: ${action}`, params);

    this.sendToClient(ws, {
      type: 'connection',
      timestamp: Date.now(),
      data: { command: action, status: 'received' },
    });
  }

  /**
   * Start periodic metrics broadcast
   */
  private startMetricsBroadcast(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }

    this.metricsInterval = setInterval(async () => {
      await this.broadcastMetrics();
    }, this.metricsRefreshMs);
  }

  /**
   * Broadcast GPU metrics to subscribed clients
   */
  private async broadcastMetrics(): Promise<void> {
    if (this.clients.size === 0) return;

    try {
      const clusterService = getClusterService();
      const clusterMetrics = await clusterService.getClusterMetrics();

      // Broadcast GPU metrics per node
      for (const node of clusterMetrics.nodes) {
        const message: WebSocketMessage<GPUMetricsMessage> = {
          type: 'gpu_metrics',
          timestamp: Date.now(),
          data: {
            nodeId: node.id,
            gpus: [node.metrics.gpu],
          },
        };

        this.broadcastToSubscribers('gpu_metrics', message, node.id);
      }

      // Broadcast system status
      const systemMessage: WebSocketMessage = {
        type: 'system_status',
        timestamp: Date.now(),
        data: {
          clusterStatus: clusterMetrics.clusterStatus,
          totalNodes: clusterMetrics.nodes.length,
          onlineNodes: clusterMetrics.nodes.filter(n => n.status === 'online').length,
          totalGpuCompute: clusterMetrics.totalGpuCompute,
          activeJobs: clusterMetrics.activeJobs,
        },
      };

      this.broadcastToSubscribers('system_status', systemMessage);
    } catch (error) {
      console.error('Failed to broadcast metrics:', error);
    }
  }

  /**
   * Broadcast job status update
   */
  broadcastJobStatus(jobId: string, status: string, progress: number, message?: string): void {
    const wsMessage: WebSocketMessage<JobStatusMessage> = {
      type: 'job_status',
      timestamp: Date.now(),
      data: {
        jobId,
        status: status as JobStatusMessage['status'],
        progress,
        message,
      },
    };

    this.broadcastToSubscribers('job_status', wsMessage);
  }

  /**
   * Broadcast alert to all clients
   */
  broadcastAlert(alert: AlertMessage): void {
    const message: WebSocketMessage<AlertMessage> = {
      type: 'alert',
      timestamp: Date.now(),
      data: alert,
    };

    this.broadcastToSubscribers('alert', message);
  }

  /**
   * Broadcast message to clients subscribed to a specific topic
   */
  private broadcastToSubscribers<T>(
    topic: WebSocketMessageType,
    message: WebSocketMessage<T>,
    nodeId?: string
  ): void {
    const clients = Array.from(this.clients.values());
    for (const client of clients) {
      // Check if client is subscribed to this topic
      if (!client.subscription.topics.has(topic)) continue;

      // Check if client wants updates for this specific node
      if (nodeId && client.subscription.nodeIds.size > 0) {
        if (!client.subscription.nodeIds.has(nodeId)) continue;
      }

      this.sendToClient(client, message);
    }
  }

  /**
   * Send message to specific client
   */
  private sendToClient<T>(client: WebSocketClient, message: WebSocketMessage<T>): void {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(JSON.stringify(message));
      } catch (error) {
        console.error(`Failed to send to client ${client.id}:`, error);
      }
    }
  }

  /**
   * Start heartbeat to detect dead connections
   */
  private startHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      const clients = Array.from(this.clients.values());
      for (const client of clients) {
        if (!client.isAlive) {
          console.log(`Terminating inactive client: ${client.id}`);
          client.terminate();
          this.clients.delete(client.id);
          continue;
        }

        client.isAlive = false;
        client.ping();
      }
    }, 30000); // 30 second heartbeat
  }

  /**
   * Generate unique client ID
   */
  private generateClientId(): string {
    return `ws-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Get connected client count
   */
  getClientCount(): number {
    return this.clients.size;
  }

  /**
   * Get client statistics
   */
  getStats(): {
    clients: number;
    authenticated: number;
    subscriptions: Record<string, number>;
  } {
    const stats = {
      clients: this.clients.size,
      authenticated: 0,
      subscriptions: {} as Record<string, number>,
    };

    const clients = Array.from(this.clients.values());
    for (const client of clients) {
      if (client.subscription.authenticated) stats.authenticated++;

      const topics = Array.from(client.subscription.topics);
      for (const topic of topics) {
        stats.subscriptions[topic] = (stats.subscriptions[topic] || 0) + 1;
      }
    }

    return stats;
  }

  /**
   * Shutdown WebSocket server
   */
  shutdown(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    // Close all client connections
    const clients = Array.from(this.clients.values());
    for (const client of clients) {
      client.close(1001, 'Server shutting down');
    }
    this.clients.clear();

    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }

    console.log('WebSocket server shut down');
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let wsServiceInstance: WebSocketService | null = null;

export function getWebSocketService(): WebSocketService {
  if (!wsServiceInstance) {
    wsServiceInstance = new WebSocketService();
  }
  return wsServiceInstance;
}

export default WebSocketService;
