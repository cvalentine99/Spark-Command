/**
 * Spark Job Management Router
 * Handles job submission, status tracking, and management via tRPC
 */

import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import {
  submitSparkJob,
  getSparkJobStatus,
  killSparkJob,
  getSparkApplications,
  getSparkApplicationDetails,
  testSparkConnection,
  setSparkMasterUrl,
  getSparkMasterUrl,
  sparkJobTemplates,
  type SparkJobConfig,
} from "../services/spark";

// In-memory job history (in production, this would be stored in a database)
interface JobHistoryEntry {
  id: string;
  submissionId: string;
  appName: string;
  mainClass: string;
  appResource: string;
  status: 'SUBMITTED' | 'RUNNING' | 'FINISHED' | 'FAILED' | 'KILLED' | 'UNKNOWN';
  submittedAt: string;
  completedAt?: string;
  executorMemory: string;
  executorCores: number;
  numExecutors: number;
  enableRapids: boolean;
  submittedBy: string;
}

let jobHistory: JobHistoryEntry[] = [];

export const sparkRouter = router({
  // Submit a new Spark job
  submitJob: publicProcedure
    .input(z.object({
      appName: z.string().min(1, "Application name is required"),
      mainClass: z.string().min(1, "Main class is required"),
      appResource: z.string().min(1, "Application resource path is required"),
      appArgs: z.array(z.string()).optional(),
      executorMemory: z.string().default("8g"),
      executorCores: z.number().min(1).max(20).default(4),
      numExecutors: z.number().min(1).max(10).default(2),
      driverMemory: z.string().default("4g"),
      driverCores: z.number().min(1).max(8).default(2),
      enableRapids: z.boolean().default(true),
      rapidsPoolSize: z.string().default("2G"),
      sparkProperties: z.record(z.string(), z.string()).optional(),
    }))
    .mutation(async ({ input }) => {
      const config: SparkJobConfig = {
        appName: input.appName,
        mainClass: input.mainClass,
        appResource: input.appResource,
        appArgs: input.appArgs,
        executorMemory: input.executorMemory,
        executorCores: input.executorCores,
        numExecutors: input.numExecutors,
        driverMemory: input.driverMemory,
        driverCores: input.driverCores,
        enableRapids: input.enableRapids,
        rapidsPoolSize: input.rapidsPoolSize,
        sparkProperties: input.sparkProperties,
      };

      const result = await submitSparkJob(config);

      // Add to job history
      if (result.submissionId) {
        const historyEntry: JobHistoryEntry = {
          id: `job-${Date.now()}`,
          submissionId: result.submissionId,
          appName: input.appName,
          mainClass: input.mainClass,
          appResource: input.appResource,
          status: result.success ? 'SUBMITTED' : 'FAILED',
          submittedAt: new Date().toISOString(),
          executorMemory: input.executorMemory,
          executorCores: input.executorCores,
          numExecutors: input.numExecutors,
          enableRapids: input.enableRapids,
          submittedBy: 'Admin User',
        };
        jobHistory.unshift(historyEntry);
        
        // Keep only last 100 jobs
        if (jobHistory.length > 100) {
          jobHistory = jobHistory.slice(0, 100);
        }
      }

      return result;
    }),

  // Get job status by submission ID
  getJobStatus: publicProcedure
    .input(z.object({
      submissionId: z.string(),
    }))
    .query(async ({ input }) => {
      const status = await getSparkJobStatus(input.submissionId);
      
      // Update job history with latest status
      if (status) {
        const historyIndex = jobHistory.findIndex(j => j.submissionId === input.submissionId);
        if (historyIndex !== -1) {
          const driverState = status.driverState.toUpperCase();
          if (driverState === 'FINISHED' || driverState === 'FAILED' || driverState === 'KILLED') {
            jobHistory[historyIndex].status = driverState as any;
            jobHistory[historyIndex].completedAt = new Date().toISOString();
          } else if (driverState === 'RUNNING') {
            jobHistory[historyIndex].status = 'RUNNING';
          }
        }
      }

      return status;
    }),

  // Kill a running job
  killJob: publicProcedure
    .input(z.object({
      submissionId: z.string(),
    }))
    .mutation(async ({ input }) => {
      const result = await killSparkJob(input.submissionId);
      
      // Update job history
      if (result.success) {
        const historyIndex = jobHistory.findIndex(j => j.submissionId === input.submissionId);
        if (historyIndex !== -1) {
          jobHistory[historyIndex].status = 'KILLED';
          jobHistory[historyIndex].completedAt = new Date().toISOString();
        }
      }

      return result;
    }),

  // Get job history
  getJobHistory: publicProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(20),
      status: z.enum(['all', 'SUBMITTED', 'RUNNING', 'FINISHED', 'FAILED', 'KILLED']).default('all'),
    }))
    .query(({ input }) => {
      let filtered = jobHistory;
      
      if (input.status !== 'all') {
        filtered = jobHistory.filter(j => j.status === input.status);
      }

      return filtered.slice(0, input.limit);
    }),

  // Get running applications from Spark UI
  getApplications: publicProcedure
    .query(async () => {
      return await getSparkApplications();
    }),

  // Get application details
  getApplicationDetails: publicProcedure
    .input(z.object({
      appId: z.string(),
    }))
    .query(async ({ input }) => {
      return await getSparkApplicationDetails(input.appId);
    }),

  // Test Spark connection
  testConnection: publicProcedure
    .query(async () => {
      return await testSparkConnection();
    }),

  // Update Spark master URL
  updateConfig: publicProcedure
    .input(z.object({
      sparkMasterUrl: z.string().url("Invalid Spark master URL"),
    }))
    .mutation(async ({ input }) => {
      setSparkMasterUrl(input.sparkMasterUrl);
      const testResult = await testSparkConnection();
      
      return {
        success: testResult.success,
        message: testResult.message,
        url: getSparkMasterUrl(),
      };
    }),

  // Get current Spark configuration
  getConfig: publicProcedure
    .query(() => {
      return {
        sparkMasterUrl: getSparkMasterUrl(),
      };
    }),

  // Get job templates
  getTemplates: publicProcedure
    .query(() => {
      return Object.entries(sparkJobTemplates).map(([key, template]) => ({
        id: key,
        ...template,
      }));
    }),

  // Get cluster resources (mock for now, would query Spark master)
  getClusterResources: publicProcedure
    .query(() => {
      return {
        totalCores: 40,
        usedCores: 24,
        totalMemory: '256 GB',
        usedMemory: '142 GB',
        workers: 2,
        activeApplications: jobHistory.filter(j => j.status === 'RUNNING').length,
        gpusAvailable: 2,
        gpusInUse: jobHistory.filter(j => j.status === 'RUNNING' && j.enableRapids).length,
      };
    }),
});

export type SparkRouter = typeof sparkRouter;
