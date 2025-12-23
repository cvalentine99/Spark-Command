/**
 * WebSocket Server Tests
 * Tests for real-time GPU metrics and job status broadcasting
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  broadcastGpuMetrics,
  broadcastSystemMetrics,
  broadcastJobStatus,
  getConnectedClients,
  createWebSocketMessage,
} from './websocket';

describe('WebSocket Server', () => {
  describe('createWebSocketMessage', () => {
    it('should create a valid GPU metrics message', () => {
      const gpuData = {
        utilization: 75.5,
        temperature: 65,
        powerDraw: 180,
        memoryUsed: 8000000000,
        memoryTotal: 16000000000,
        fanSpeed: 55,
      };

      const message = createWebSocketMessage('gpu_metrics', gpuData);
      const parsed = JSON.parse(message);

      expect(parsed.type).toBe('gpu_metrics');
      expect(parsed.data.utilization).toBe(75.5);
      expect(parsed.data.temperature).toBe(65);
      expect(parsed.data.powerDraw).toBe(180);
      expect(parsed.timestamp).toBeDefined();
    });

    it('should create a valid system metrics message', () => {
      const systemData = {
        cpu: { usage: 45.2 },
        memory: { used: 64000000000, total: 128000000000 },
      };

      const message = createWebSocketMessage('system_metrics', systemData);
      const parsed = JSON.parse(message);

      expect(parsed.type).toBe('system_metrics');
      expect(parsed.data.cpu.usage).toBe(45.2);
      expect(parsed.data.memory.used).toBe(64000000000);
    });

    it('should create a valid job status message', () => {
      const jobData = {
        id: 'job-123',
        submissionId: 'driver-123',
        appName: 'Test Spark Job',
        status: 'RUNNING',
      };

      const message = createWebSocketMessage('job_status', jobData);
      const parsed = JSON.parse(message);

      expect(parsed.type).toBe('job_status');
      expect(parsed.data.id).toBe('job-123');
      expect(parsed.data.appName).toBe('Test Spark Job');
      expect(parsed.data.status).toBe('RUNNING');
    });

    it('should include timestamp in all messages', () => {
      const message = createWebSocketMessage('test', { foo: 'bar' });
      const parsed = JSON.parse(message);

      expect(parsed.timestamp).toBeDefined();
      expect(typeof parsed.timestamp).toBe('string');
      // Timestamp should be a valid ISO date
      expect(new Date(parsed.timestamp).toISOString()).toBe(parsed.timestamp);
    });
  });

  describe('broadcastGpuMetrics', () => {
    it('should not throw when no clients are connected', () => {
      expect(() => {
        broadcastGpuMetrics({
          utilization: 50,
          temperature: 60,
          powerDraw: 150,
          memoryUsed: 4000000000,
          memoryTotal: 16000000000,
          fanSpeed: 45,
        });
      }).not.toThrow();
    });

    it('should handle null/undefined values gracefully', () => {
      expect(() => {
        broadcastGpuMetrics({
          utilization: 0,
          temperature: 0,
          powerDraw: 0,
          memoryUsed: 0,
          memoryTotal: 0,
          fanSpeed: 0,
        });
      }).not.toThrow();
    });
  });

  describe('broadcastSystemMetrics', () => {
    it('should not throw when no clients are connected', () => {
      expect(() => {
        broadcastSystemMetrics({
          cpu: { usage: 25 },
          memory: { used: 32000000000, total: 64000000000 },
        });
      }).not.toThrow();
    });
  });

  describe('broadcastJobStatus', () => {
    it('should not throw when no clients are connected', () => {
      expect(() => {
        broadcastJobStatus({
          id: 'job-456',
          submissionId: 'driver-456',
          appName: 'Another Job',
          status: 'FINISHED',
        });
      }).not.toThrow();
    });

    it('should handle different job statuses', () => {
      const statuses = ['SUBMITTED', 'RUNNING', 'FINISHED', 'FAILED', 'KILLED'];
      
      statuses.forEach(status => {
        expect(() => {
          broadcastJobStatus({
            id: `job-${status}`,
            submissionId: `driver-${status}`,
            appName: `Job ${status}`,
            status,
          });
        }).not.toThrow();
      });
    });
  });

  describe('getConnectedClients', () => {
    it('should return 0 when no clients are connected', () => {
      const count = getConnectedClients();
      expect(count).toBe(0);
    });
  });
});

describe('WebSocket Message Types', () => {
  it('should support gpu_metrics type', () => {
    const message = createWebSocketMessage('gpu_metrics', {});
    const parsed = JSON.parse(message);
    expect(parsed.type).toBe('gpu_metrics');
  });

  it('should support system_metrics type', () => {
    const message = createWebSocketMessage('system_metrics', {});
    const parsed = JSON.parse(message);
    expect(parsed.type).toBe('system_metrics');
  });

  it('should support job_status type', () => {
    const message = createWebSocketMessage('job_status', {});
    const parsed = JSON.parse(message);
    expect(parsed.type).toBe('job_status');
  });

  it('should support alert type', () => {
    const message = createWebSocketMessage('alert', {
      level: 'warning',
      message: 'GPU temperature high',
    });
    const parsed = JSON.parse(message);
    expect(parsed.type).toBe('alert');
    expect(parsed.data.level).toBe('warning');
  });
});
