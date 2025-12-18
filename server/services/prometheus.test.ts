import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock axios
vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      get: vi.fn(),
    })),
  },
}));

import axios from 'axios';
import { PrometheusService } from './prometheus';

describe('PrometheusService', () => {
  let service: PrometheusService;
  let mockGet: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGet = vi.fn();
    (axios.create as ReturnType<typeof vi.fn>).mockReturnValue({
      get: mockGet,
    });
    service = new PrometheusService('http://localhost:9090');
  });

  describe('query', () => {
    it('should execute instant query and return results', async () => {
      mockGet.mockResolvedValueOnce({
        data: {
          status: 'success',
          data: {
            resultType: 'vector',
            result: [
              {
                metric: { instance: 'dgx-spark-01:9400', gpu: '0' },
                value: [1702900000, '85.5'],
              },
            ],
          },
        },
      });

      const result = await service.query('DCGM_FI_DEV_GPU_UTIL');

      expect(result).toHaveLength(1);
      expect(result[0].value[1]).toBe('85.5');
      expect(mockGet).toHaveBeenCalledWith('/api/v1/query', {
        params: { query: 'DCGM_FI_DEV_GPU_UTIL' },
      });
    });

    it('should throw error on Prometheus query failure', async () => {
      mockGet.mockResolvedValueOnce({
        data: {
          status: 'error',
          error: 'invalid query',
          errorType: 'bad_data',
        },
      });

      await expect(service.query('invalid{{')).rejects.toThrow('invalid query');
    });

    it('should handle connection errors', async () => {
      mockGet.mockRejectedValueOnce(new Error('Connection refused'));

      await expect(service.query('DCGM_FI_DEV_GPU_UTIL')).rejects.toThrow('Connection refused');
    });
  });

  describe('queryRange', () => {
    it('should execute range query with time parameters', async () => {
      mockGet.mockResolvedValueOnce({
        data: {
          status: 'success',
          data: {
            resultType: 'matrix',
            result: [
              {
                metric: { instance: 'dgx-spark-01:9400' },
                values: [
                  [1702900000, '80'],
                  [1702900060, '82'],
                  [1702900120, '85'],
                ],
              },
            ],
          },
        },
      });

      const start = Date.now() - 3600000;
      const end = Date.now();
      const result = await service.queryRange('DCGM_FI_DEV_GPU_UTIL', start, end, '1m');

      expect(result).toHaveLength(1);
      expect(result[0].values).toHaveLength(3);
      expect(mockGet).toHaveBeenCalledWith('/api/v1/query_range', {
        params: { query: 'DCGM_FI_DEV_GPU_UTIL', start, end, step: '1m' },
      });
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status when Prometheus is reachable', async () => {
      mockGet.mockResolvedValueOnce({ status: 200 });

      const result = await service.healthCheck();

      expect(result.healthy).toBe(true);
      expect(result.message).toBe('Prometheus is healthy');
    });

    it('should return unhealthy status when Prometheus is unreachable', async () => {
      mockGet.mockRejectedValueOnce(new Error('ECONNREFUSED'));

      const result = await service.healthCheck();

      expect(result.healthy).toBe(false);
      expect(result.message).toContain('unreachable');
    });
  });

  describe('getGPUMetrics', () => {
    it('should aggregate GPU metrics from multiple queries', async () => {
      // Mock all the GPU metric queries
      const mockResponse = (value: string) => ({
        data: {
          status: 'success',
          data: {
            resultType: 'vector',
            result: [
              { metric: { instance: 'dgx-spark-01:9400', gpu: '0' }, value: [0, value] },
            ],
          },
        },
      });

      mockGet
        .mockResolvedValueOnce(mockResponse('85')) // utilization
        .mockResolvedValueOnce(mockResponse('64000')) // memUsed
        .mockResolvedValueOnce(mockResponse('128000')) // memTotal
        .mockResolvedValueOnce(mockResponse('65')) // temp
        .mockResolvedValueOnce(mockResponse('200')) // power
        .mockResolvedValueOnce(mockResponse('265')) // powerLimit
        .mockResolvedValueOnce(mockResponse('50')) // fan
        .mockResolvedValueOnce(mockResponse('1500')) // smClock
        .mockResolvedValueOnce(mockResponse('1200')); // memClock

      const result = await service.getGPUMetrics();

      expect(result).toHaveLength(1);
      expect(result[0].utilization).toBe(85);
      expect(result[0].temperature).toBe(65);
      expect(result[0].memoryUsed).toBe(64000);
    });

    it('should return empty array when queries fail', async () => {
      mockGet.mockRejectedValue(new Error('Connection refused'));

      const result = await service.getGPUMetrics();

      expect(result).toEqual([]);
    });
  });

  describe('getNodeMetrics', () => {
    it('should aggregate node metrics from multiple queries', async () => {
      const mockResponse = (value: string) => ({
        data: {
          status: 'success',
          data: {
            resultType: 'vector',
            result: [
              { metric: { instance: 'dgx-spark-01:9100' }, value: [0, value] },
            ],
          },
        },
      });

      mockGet
        .mockResolvedValueOnce(mockResponse('45')) // cpuUsage
        .mockResolvedValueOnce(mockResponse('64000000000')) // memUsed
        .mockResolvedValueOnce(mockResponse('128000000000')) // memTotal
        .mockResolvedValueOnce(mockResponse('500000000000')) // diskUsed
        .mockResolvedValueOnce(mockResponse('1000000000000')) // diskTotal
        .mockResolvedValueOnce(mockResponse('1000000')) // netRx
        .mockResolvedValueOnce(mockResponse('500000')) // netTx
        .mockResolvedValueOnce(mockResponse('86400')); // uptime

      const result = await service.getNodeMetrics();

      expect(result).toHaveLength(1);
      expect(result[0].cpuUsage).toBe(45);
      expect(result[0].hostname).toBe('dgx-spark-01:9100');
    });
  });
});
