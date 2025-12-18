/**
 * Spark REST API Service
 * Handles job submission, status tracking, and management via Spark's REST API
 */

// Spark REST API configuration
let sparkMasterUrl = process.env.SPARK_MASTER_URL || 'http://192.168.100.10:6066';

export function setSparkMasterUrl(url: string) {
  sparkMasterUrl = url;
}

export function getSparkMasterUrl() {
  return sparkMasterUrl;
}

// Types for Spark job submission
export interface SparkJobConfig {
  appName: string;
  mainClass: string;
  appResource: string;  // Path to JAR or Python file
  appArgs?: string[];
  sparkProperties?: Record<string, string>;
  environmentVariables?: Record<string, string>;
  // Executor configuration
  executorMemory?: string;
  executorCores?: number;
  numExecutors?: number;
  // Driver configuration
  driverMemory?: string;
  driverCores?: number;
  // RAPIDS configuration
  enableRapids?: boolean;
  rapidsPoolSize?: string;
}

export interface SparkJobSubmissionResponse {
  success: boolean;
  submissionId?: string;
  message: string;
  driverState?: string;
}

export interface SparkJobStatus {
  submissionId: string;
  driverState: string;
  workerHostPort?: string;
  workerId?: string;
  message?: string;
}

export interface SparkApplication {
  id: string;
  name: string;
  attempts: {
    attemptId: string;
    startTime: string;
    endTime?: string;
    duration: number;
    sparkUser: string;
    completed: boolean;
  }[];
}

/**
 * Submit a Spark job via the REST API
 */
export async function submitSparkJob(config: SparkJobConfig): Promise<SparkJobSubmissionResponse> {
  const sparkProperties: Record<string, string> = {
    'spark.app.name': config.appName,
    'spark.master': `spark://${new URL(sparkMasterUrl).hostname}:7077`,
    'spark.submit.deployMode': 'cluster',
    ...(config.sparkProperties || {}),
  };

  // Add executor configuration
  if (config.executorMemory) {
    sparkProperties['spark.executor.memory'] = config.executorMemory;
  }
  if (config.executorCores) {
    sparkProperties['spark.executor.cores'] = String(config.executorCores);
  }
  if (config.numExecutors) {
    sparkProperties['spark.executor.instances'] = String(config.numExecutors);
  }

  // Add driver configuration
  if (config.driverMemory) {
    sparkProperties['spark.driver.memory'] = config.driverMemory;
  }
  if (config.driverCores) {
    sparkProperties['spark.driver.cores'] = String(config.driverCores);
  }

  // Add RAPIDS configuration if enabled
  if (config.enableRapids) {
    sparkProperties['spark.plugins'] = 'com.nvidia.spark.SQLPlugin';
    sparkProperties['spark.rapids.sql.enabled'] = 'true';
    sparkProperties['spark.rapids.memory.pinnedPool.size'] = config.rapidsPoolSize || '2G';
    sparkProperties['spark.rapids.sql.concurrentGpuTasks'] = '2';
    sparkProperties['spark.executor.resource.gpu.amount'] = '1';
    sparkProperties['spark.task.resource.gpu.amount'] = '0.5';
    sparkProperties['spark.rapids.sql.explain'] = 'NOT_ON_GPU';
  }

  const submissionPayload = {
    action: 'CreateSubmissionRequest',
    appArgs: config.appArgs || [],
    appResource: config.appResource,
    clientSparkVersion: '3.5.0',
    environmentVariables: {
      SPARK_ENV_LOADED: '1',
      ...(config.environmentVariables || {}),
    },
    mainClass: config.mainClass,
    sparkProperties,
  };

  try {
    const response = await fetch(`${sparkMasterUrl}/v1/submissions/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(submissionPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        message: `Spark API error: ${response.status} - ${errorText}`,
      };
    }

    const result = await response.json();
    
    return {
      success: result.success === true,
      submissionId: result.submissionId,
      message: result.message || (result.success ? 'Job submitted successfully' : 'Job submission failed'),
      driverState: result.driverState,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      message: `Failed to connect to Spark master: ${errorMessage}`,
    };
  }
}

/**
 * Get the status of a submitted Spark job
 */
export async function getSparkJobStatus(submissionId: string): Promise<SparkJobStatus | null> {
  try {
    const response = await fetch(`${sparkMasterUrl}/v1/submissions/status/${submissionId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return null;
    }

    const result = await response.json();
    
    return {
      submissionId: result.submissionId,
      driverState: result.driverState,
      workerHostPort: result.workerHostPort,
      workerId: result.workerId,
      message: result.message,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Kill a running Spark job
 */
export async function killSparkJob(submissionId: string): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(`${sparkMasterUrl}/v1/submissions/kill/${submissionId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        message: `Failed to kill job: ${response.status} - ${errorText}`,
      };
    }

    const result = await response.json();
    
    return {
      success: result.success === true,
      message: result.message || (result.success ? 'Job killed successfully' : 'Failed to kill job'),
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      message: `Failed to connect to Spark master: ${errorMessage}`,
    };
  }
}

/**
 * Get list of running applications from Spark UI API
 */
export async function getSparkApplications(): Promise<SparkApplication[]> {
  // Spark UI runs on port 8080 by default
  const sparkUiUrl = sparkMasterUrl.replace(':6066', ':8080');
  
  try {
    const response = await fetch(`${sparkUiUrl}/api/v1/applications`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      return [];
    }

    const applications = await response.json();
    return applications;
  } catch (error) {
    return [];
  }
}

/**
 * Get application details including executors
 */
export async function getSparkApplicationDetails(appId: string): Promise<any | null> {
  const sparkUiUrl = sparkMasterUrl.replace(':6066', ':8080');
  
  try {
    const [appResponse, executorsResponse] = await Promise.all([
      fetch(`${sparkUiUrl}/api/v1/applications/${appId}`),
      fetch(`${sparkUiUrl}/api/v1/applications/${appId}/executors`),
    ]);

    if (!appResponse.ok) {
      return null;
    }

    const app = await appResponse.json();
    const executors = executorsResponse.ok ? await executorsResponse.json() : [];

    return {
      ...app,
      executors,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Test connection to Spark master
 */
export async function testSparkConnection(): Promise<{ success: boolean; message: string; version?: string }> {
  try {
    // Try to get the Spark version/status
    const response = await fetch(`${sparkMasterUrl}/v1/submissions/status/test`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Even a 404 means the server is reachable
    if (response.status === 404 || response.ok) {
      return {
        success: true,
        message: 'Connected to Spark master',
        version: '3.5.0',
      };
    }

    return {
      success: false,
      message: `Spark master returned status ${response.status}`,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      message: `Cannot connect to Spark master at ${sparkMasterUrl}: ${errorMessage}`,
    };
  }
}

// Job templates for common workloads
export const sparkJobTemplates = {
  'pyspark-etl': {
    name: 'PySpark ETL Job',
    description: 'Data transformation and loading with PySpark',
    mainClass: 'org.apache.spark.deploy.SparkSubmit',
    appResource: '/opt/spark/examples/src/main/python/pi.py',
    executorMemory: '8g',
    executorCores: 4,
    numExecutors: 2,
    enableRapids: true,
  },
  'rapids-sql': {
    name: 'RAPIDS SQL Analytics',
    description: 'GPU-accelerated SQL queries with RAPIDS',
    mainClass: 'com.nvidia.spark.rapids.tool.profiling.ProfileMain',
    appResource: '/opt/spark/jars/rapids-4-spark.jar',
    executorMemory: '16g',
    executorCores: 8,
    numExecutors: 2,
    enableRapids: true,
    rapidsPoolSize: '4G',
  },
  'ml-training': {
    name: 'ML Model Training',
    description: 'Distributed machine learning training',
    mainClass: 'org.apache.spark.examples.ml.JavaRandomForestClassifierExample',
    appResource: '/opt/spark/examples/jars/spark-examples.jar',
    executorMemory: '32g',
    executorCores: 8,
    numExecutors: 2,
    enableRapids: true,
    rapidsPoolSize: '8G',
  },
  'streaming': {
    name: 'Spark Streaming',
    description: 'Real-time data processing pipeline',
    mainClass: 'org.apache.spark.examples.streaming.JavaNetworkWordCount',
    appResource: '/opt/spark/examples/jars/spark-examples.jar',
    executorMemory: '4g',
    executorCores: 2,
    numExecutors: 4,
    enableRapids: false,
  },
};
