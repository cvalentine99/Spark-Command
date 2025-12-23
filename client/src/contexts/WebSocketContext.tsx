/**
 * WebSocket Context Provider
 * Provides real-time data to all components in the app
 */

import React, { createContext, useContext, useCallback, useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';

// Types
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
  timestamp: number;
}

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

interface WebSocketContextValue {
  status: ConnectionStatus;
  gpuMetrics: GPUMetricsData | null;
  systemMetrics: SystemMetricsData | null;
  jobUpdates: JobStatusData[];
  alerts: AlertData[];
  isConnected: boolean;
  reconnect: () => void;
  clearAlerts: () => void;
}

const WebSocketContext = createContext<WebSocketContextValue | null>(null);

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [gpuMetrics, setGPUMetrics] = useState<GPUMetricsData | null>(null);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetricsData | null>(null);
  const [jobUpdates, setJobUpdates] = useState<JobStatusData[]>([]);
  const [alerts, setAlerts] = useState<AlertData[]>([]);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 10;

  const getWebSocketUrl = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/ws`;
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

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    cleanup();
    setStatus('connecting');
    
    try {
      const ws = new WebSocket(getWebSocketUrl());
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        setStatus('connected');
        reconnectAttempts.current = 0;
        
        // Start ping interval for keepalive
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
          }
        }, 30000);
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          switch (message.type) {
            case 'gpu_metrics':
              setGPUMetrics(message.data as GPUMetricsData);
              break;
              
            case 'system_metrics':
              setSystemMetrics(message.data as SystemMetricsData);
              break;
              
            case 'job_status':
              const jobData = message.data as JobStatusData;
              setJobUpdates(prev => {
                // Update existing job or add new one
                const existing = prev.findIndex(j => j.id === jobData.id);
                if (existing >= 0) {
                  const updated = [...prev];
                  updated[existing] = jobData;
                  return updated;
                }
                return [...prev.slice(-19), jobData]; // Keep last 20
              });
              
              // Show toast for job status changes
              if (jobData.status === 'FINISHED') {
                toast.success(`Job completed: ${jobData.appName}`);
              } else if (jobData.status === 'FAILED') {
                toast.error(`Job failed: ${jobData.appName}`);
              }
              break;
              
            case 'alert':
              const alertData = {
                ...message.data,
                timestamp: message.timestamp,
              } as AlertData;
              
              setAlerts(prev => [...prev.slice(-9), alertData]);
              
              // Show toast for alerts
              if (alertData.level === 'warning') {
                toast.warning(alertData.message);
              } else if (alertData.level === 'error') {
                toast.error(alertData.message);
              }
              break;
              
            case 'connection':
              console.log('WebSocket connection confirmed');
              break;
              
            case 'pong':
              // Keepalive response
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
        
        // Auto reconnect with exponential backoff
        if (reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          reconnectAttempts.current++;
          console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current})`);
          reconnectTimeoutRef.current = setTimeout(connect, delay);
        } else {
          setStatus('error');
          toast.error('WebSocket connection lost. Please refresh the page.');
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      setStatus('error');
    }
  }, [getWebSocketUrl, cleanup]);

  const reconnect = useCallback(() => {
    cleanup();
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    reconnectAttempts.current = 0;
    connect();
  }, [cleanup, connect]);

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

  const value: WebSocketContextValue = {
    status,
    gpuMetrics,
    systemMetrics,
    jobUpdates,
    alerts,
    isConnected: status === 'connected',
    reconnect,
    clearAlerts,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocketContext() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocketContext must be used within a WebSocketProvider');
  }
  return context;
}
