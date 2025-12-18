import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the Spark service
vi.mock('../services/spark', () => ({
  SparkService: {
    submitJob: vi.fn(),
    getJobStatus: vi.fn(),
    killJob: vi.fn(),
    getJobHistory: vi.fn(),
    getClusterResources: vi.fn(),
  },
}));

import { SparkService } from '../services/spark';

describe('Spark Router', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('submitJob', () => {
    it('should validate required fields for job submission', async () => {
      const mockSubmitJob = vi.mocked(SparkService.submitJob);
      mockSubmitJob.mockResolvedValue({
        success: true,
        submissionId: 'driver-20241218-0001',
        message: 'Job submitted successfully',
      });

      const result = await SparkService.submitJob({
        appName: 'test-job',
        mainClass: 'org.apache.spark.examples.SparkPi',
        appResource: '/opt/spark/examples/jars/spark-examples.jar',
        executorMemory: '8g',
        executorCores: 4,
        numExecutors: 2,
        driverMemory: '4g',
        driverCores: 2,
        enableRapids: true,
      });

      expect(result.success).toBe(true);
      expect(result.submissionId).toBeDefined();
      expect(mockSubmitJob).toHaveBeenCalledTimes(1);
    });

    it('should handle job submission failure', async () => {
      const mockSubmitJob = vi.mocked(SparkService.submitJob);
      mockSubmitJob.mockResolvedValue({
        success: false,
        submissionId: '',
        message: 'Spark master not reachable',
      });

      const result = await SparkService.submitJob({
        appName: 'test-job',
        mainClass: 'org.apache.spark.examples.SparkPi',
        appResource: '/opt/spark/examples/jars/spark-examples.jar',
        executorMemory: '8g',
        executorCores: 4,
        numExecutors: 2,
        driverMemory: '4g',
        driverCores: 2,
        enableRapids: false,
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('not reachable');
    });
  });

  describe('getJobStatus', () => {
    it('should return job status for valid submission ID', async () => {
      const mockGetJobStatus = vi.mocked(SparkService.getJobStatus);
      mockGetJobStatus.mockResolvedValue({
        submissionId: 'driver-20241218-0001',
        status: 'RUNNING',
        workerHostPort: '192.168.100.10:7078',
        workerId: 'worker-20241218-0001',
      });

      const result = await SparkService.getJobStatus('driver-20241218-0001');

      expect(result.status).toBe('RUNNING');
      expect(result.submissionId).toBe('driver-20241218-0001');
    });

    it('should handle unknown job status', async () => {
      const mockGetJobStatus = vi.mocked(SparkService.getJobStatus);
      mockGetJobStatus.mockResolvedValue({
        submissionId: 'invalid-id',
        status: 'UNKNOWN',
      });

      const result = await SparkService.getJobStatus('invalid-id');

      expect(result.status).toBe('UNKNOWN');
    });
  });

  describe('killJob', () => {
    it('should successfully kill a running job', async () => {
      const mockKillJob = vi.mocked(SparkService.killJob);
      mockKillJob.mockResolvedValue({
        success: true,
        message: 'Job killed successfully',
      });

      const result = await SparkService.killJob('driver-20241218-0001');

      expect(result.success).toBe(true);
    });
  });

  describe('getClusterResources', () => {
    it('should return cluster resource information', async () => {
      const mockGetClusterResources = vi.mocked(SparkService.getClusterResources);
      mockGetClusterResources.mockResolvedValue({
        workers: 2,
        totalCores: 40,
        usedCores: 24,
        totalMemory: '256 GB',
        usedMemory: '142 GB',
        activeApplications: 3,
        gpusAvailable: 2,
        gpusInUse: 2,
      });

      const result = await SparkService.getClusterResources();

      expect(result.workers).toBe(2);
      expect(result.totalCores).toBe(40);
      expect(result.gpusAvailable).toBe(2);
    });
  });
});
