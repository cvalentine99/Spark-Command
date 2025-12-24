/**
 * WebSocket Hook for Real-Time Metrics
 * Provides reactive WebSocket connection to the DGX Spark Command Center backend
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  WebSocketMessage,
  WebSocketMessageType,
  GPUMetricsMessage,
  JobStatusMessage,
  AlertMessage,
  GPUMetrics,
} from '@shared/dgx-types';

// ============================================================================
// Types
// ============================================================================

interface UseWebSocketOptions {
  /** Topics to subscribe to */
  topics?: WebSocketMessageType[];
  /** Node IDs to filter updates for */
  nodeIds?: string[];
  /** Auto-reconnect on disconnect */
  autoReconnect?: boolean;
  /** Reconnect delay in ms */
  reconnectDelay?: number;
  /** Max reconnect attempts */
  maxReconnectAttempts?: number;
  /** Enable debug logging */
  debug?: boolean;
}

interface WebSocketState {
  connected: boolean;
  connecting: boolean;
  error: string | null;
  lastMessage: WebSocketMessage | null;
  clientId: string | null;
}

interface GPUMetricsState {
  [nodeId: string]: GPUMetrics[];
}

interface AlertState {
  alerts: AlertMessage[];
  unreadCount: number;
}

// ============================================================================
// WebSocket Hook
// ============================================================================

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const {
    topics = ['gpu_metrics', 'system_status', 'alert'],
    nodeIds = [],
    autoReconnect = true,
    reconnectDelay = 3000,
    maxReconnectAttempts = 10,
    debug = false,
  } = options;

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [state, setState] = useState<WebSocketState>({
    connected: false,
    connecting: false,
    error: null,
    lastMessage: null,
    clientId: null,
  });

  const [gpuMetrics, setGpuMetrics] = useState<GPUMetricsState>({});
  const [systemStatus, setSystemStatus] = useState<Record<string, unknown> | null>(null);
  const [alerts, setAlerts] = useState<AlertState>({ alerts: [], unreadCount: 0 });
  const [jobUpdates, setJobUpdates] = useState<Map<string, JobStatusMessage>>(new Map());

  const log = useCallback((...args: unknown[]) => {
    if (debug) {
      console.log('[WebSocket]', ...args);
    }
  }, [debug]);

  /**
   * Connect to WebSocket server
   */
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      log('Already connected');
      return;
    }

    setState(prev => ({ ...prev, connecting: true, error: null }));

    // Determine WebSocket URL based on current location
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;

    log('Connecting to', wsUrl);

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        log('Connected');
        reconnectAttemptsRef.current = 0;
        setState(prev => ({
          ...prev,
          connected: true,
          connecting: false,
          error: null,
        }));

        // Subscribe to topics
        ws.send(JSON.stringify({
          type: 'subscribe',
          topics,
          nodeIds: nodeIds.length > 0 ? nodeIds : undefined,
        }));
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage;
          handleMessage(message);
        } catch (err) {
          log('Failed to parse message:', err);
        }
      };

      ws.onclose = (event) => {
        log('Disconnected:', event.code, event.reason);
        wsRef.current = null;
        setState(prev => ({
          ...prev,
          connected: false,
          connecting: false,
          clientId: null,
        }));

        // Auto-reconnect
        if (autoReconnect && reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = reconnectDelay * Math.pow(1.5, reconnectAttemptsRef.current);
          log(`Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})`);
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, delay);
        }
      };

      ws.onerror = (event) => {
        log('Error:', event);
        setState(prev => ({
          ...prev,
          error: 'WebSocket connection error',
        }));
      };
    } catch (err) {
      log('Failed to create WebSocket:', err);
      setState(prev => ({
        ...prev,
        connecting: false,
        error: err instanceof Error ? err.message : 'Failed to connect',
      }));
    }
  }, [topics, nodeIds, autoReconnect, reconnectDelay, maxReconnectAttempts, log]);

  /**
   * Handle incoming messages
   */
  const handleMessage = useCallback((message: WebSocketMessage) => {
    setState(prev => ({ ...prev, lastMessage: message }));

    switch (message.type) {
      case 'connection':
        const connData = message.data as { clientId?: string };
        if (connData.clientId) {
          setState(prev => ({ ...prev, clientId: connData.clientId ?? null }));
        }
        log('Connection data:', connData);
        break;

      case 'gpu_metrics':
        const gpuData = message.data as GPUMetricsMessage;
        setGpuMetrics(prev => ({
          ...prev,
          [gpuData.nodeId]: gpuData.gpus,
        }));
        break;

      case 'system_status':
        setSystemStatus(message.data as Record<string, unknown>);
        break;

      case 'alert':
        const alertData = message.data as AlertMessage;
        setAlerts(prev => ({
          alerts: [alertData, ...prev.alerts].slice(0, 100), // Keep last 100 alerts
          unreadCount: prev.unreadCount + 1,
        }));
        break;

      case 'job_status':
        const jobData = message.data as JobStatusMessage;
        setJobUpdates(prev => new Map(prev).set(jobData.jobId, jobData));
        break;

      default:
        log('Unknown message type:', message.type);
    }
  }, [log]);

  /**
   * Disconnect from WebSocket server
   */
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    reconnectAttemptsRef.current = maxReconnectAttempts; // Prevent auto-reconnect

    if (wsRef.current) {
      wsRef.current.close(1000, 'Client disconnect');
      wsRef.current = null;
    }
  }, [maxReconnectAttempts]);

  /**
   * Send a message to the server
   */
  const sendMessage = useCallback((message: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      return true;
    }
    log('Cannot send: not connected');
    return false;
  }, [log]);

  /**
   * Subscribe to additional topics
   */
  const subscribe = useCallback((newTopics: WebSocketMessageType[], newNodeIds?: string[]) => {
    sendMessage({
      type: 'subscribe',
      topics: newTopics,
      nodeIds: newNodeIds,
    });
  }, [sendMessage]);

  /**
   * Unsubscribe from topics
   */
  const unsubscribe = useCallback((topicsToRemove: WebSocketMessageType[]) => {
    sendMessage({
      type: 'unsubscribe',
      topics: topicsToRemove,
    });
  }, [sendMessage]);

  /**
   * Authenticate with the server
   */
  const authenticate = useCallback((token: string) => {
    sendMessage({
      type: 'authenticate',
      token,
    });
  }, [sendMessage]);

  /**
   * Clear alerts and reset unread count
   */
  const clearAlerts = useCallback(() => {
    setAlerts({ alerts: [], unreadCount: 0 });
  }, []);

  /**
   * Mark alerts as read
   */
  const markAlertsRead = useCallback(() => {
    setAlerts(prev => ({ ...prev, unreadCount: 0 }));
  }, []);

  // Connect on mount
  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, []);

  return {
    // Connection state
    connected: state.connected,
    connecting: state.connecting,
    error: state.error,
    clientId: state.clientId,

    // Real-time data
    gpuMetrics,
    systemStatus,
    alerts: alerts.alerts,
    unreadAlertCount: alerts.unreadCount,
    jobUpdates,
    lastMessage: state.lastMessage,

    // Actions
    connect,
    disconnect,
    subscribe,
    unsubscribe,
    authenticate,
    sendMessage,
    clearAlerts,
    markAlertsRead,
  };
}

// ============================================================================
// Specialized Hooks
// ============================================================================

/**
 * Hook for GPU metrics only
 */
export function useGPUMetricsStream(nodeIds?: string[]) {
  const { gpuMetrics, connected, error } = useWebSocket({
    topics: ['gpu_metrics'],
    nodeIds,
  });

  return { gpuMetrics, connected, error };
}

/**
 * Hook for alerts only
 */
export function useAlertStream() {
  const { alerts, unreadAlertCount, connected, clearAlerts, markAlertsRead } = useWebSocket({
    topics: ['alert'],
  });

  return { alerts, unreadCount: unreadAlertCount, connected, clearAlerts, markAlertsRead };
}

/**
 * Hook for job status updates
 */
export function useJobStatusStream(jobIds?: string[]) {
  const { jobUpdates, connected } = useWebSocket({
    topics: ['job_status'],
  });

  // Filter by job IDs if provided
  const filteredUpdates = jobIds
    ? new Map(Array.from(jobUpdates.entries()).filter(([id]) => jobIds.includes(id)))
    : jobUpdates;

  return { jobUpdates: filteredUpdates, connected };
}

/**
 * Hook for system status
 */
export function useSystemStatusStream() {
  const { systemStatus, connected, error } = useWebSocket({
    topics: ['system_status'],
  });

  return { systemStatus, connected, error };
}

export default useWebSocket;
