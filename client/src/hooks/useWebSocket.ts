/**
 * WebSocket Hook for Real-time Updates
 * Provides connection management and message handling
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// Message types matching server
export type WSMessageType = 
  | 'gpu_metrics'
  | 'job_status'
  | 'system_metrics'
  | 'alert'
  | 'connection'
  | 'pong';

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

export interface AlertData {
  level: 'info' | 'warning' | 'error';
  message: string;
  metric: string;
  value: number;
}

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

interface UseWebSocketOptions {
  onGPUMetrics?: (data: GPUMetricsData) => void;
  onSystemMetrics?: (data: SystemMetricsData) => void;
  onJobStatus?: (data: JobStatusData) => void;
  onAlert?: (data: AlertData) => void;
  autoReconnect?: boolean;
  reconnectInterval?: number;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const {
    onGPUMetrics,
    onSystemMetrics,
    onJobStatus,
    onAlert,
    autoReconnect = true,
    reconnectInterval = 3000,
  } = options;

  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [lastMessage, setLastMessage] = useState<WSMessage | null>(null);
  const [gpuMetrics, setGPUMetrics] = useState<GPUMetricsData | null>(null);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetricsData | null>(null);
  const [alerts, setAlerts] = useState<AlertData[]>([]);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const getWebSocketUrl = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/ws`;
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setStatus('connecting');
    
    try {
      const ws = new WebSocket(getWebSocketUrl());
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        setStatus('connected');
        
        // Start ping interval for keepalive
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
          }
        }, 30000);
      };

      ws.onmessage = (event) => {
        try {
          const message: WSMessage = JSON.parse(event.data);
          setLastMessage(message);

          switch (message.type) {
            case 'gpu_metrics':
              const gpuData = message.data as GPUMetricsData;
              setGPUMetrics(gpuData);
              onGPUMetrics?.(gpuData);
              break;
              
            case 'system_metrics':
              const sysData = message.data as SystemMetricsData;
              setSystemMetrics(sysData);
              onSystemMetrics?.(sysData);
              break;
              
            case 'job_status':
              const jobData = message.data as JobStatusData;
              onJobStatus?.(jobData);
              break;
              
            case 'alert':
              const alertData = message.data as AlertData;
              setAlerts(prev => [...prev.slice(-9), alertData]); // Keep last 10 alerts
              onAlert?.(alertData);
              break;
              
            case 'connection':
              console.log('WebSocket connection confirmed:', message.data);
              break;
              
            case 'pong':
              // Keepalive response received
              break;
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setStatus('disconnected');
        cleanup();
        
        // Auto reconnect
        if (autoReconnect) {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('Attempting to reconnect...');
            connect();
          }, reconnectInterval);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setStatus('error');
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      setStatus('error');
    }
  }, [getWebSocketUrl, autoReconnect, reconnectInterval, onGPUMetrics, onSystemMetrics, onJobStatus, onAlert]);

  const disconnect = useCallback(() => {
    cleanup();
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setStatus('disconnected');
  }, []);

  const cleanup = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
  }, []);

  const send = useCallback((message: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  const clearAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  // Connect on mount
  useEffect(() => {
    connect();
    return () => {
      cleanup();
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect, cleanup]);

  return {
    status,
    lastMessage,
    gpuMetrics,
    systemMetrics,
    alerts,
    connect,
    disconnect,
    send,
    clearAlerts,
    isConnected: status === 'connected',
  };
}
