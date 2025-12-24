/**
 * Shared Types for DGX Spark Command Center
 * Consolidated type definitions used across frontend and backend
 */

// ============================================================================
// GPU Metrics Types
// ============================================================================

export interface GPUMetrics {
  name: string;
  index: number;
  utilization: number;
  memoryUsed: number;
  memoryTotal: number;
  temperature: number;
  powerDraw: number;
  powerLimit: number;
  fanSpeed: number;
  driverVersion?: string;
  cudaVersion?: string;
  smClock?: number;
  memClock?: number;
}

export interface GPUStatus {
  status: 'ok' | 'warning' | 'critical';
  message?: string;
}

// ============================================================================
// CPU Metrics Types
// ============================================================================

export interface CPUMetrics {
  model: string;
  cores: number;
  usage: number;
  temperature: number;
  frequencies?: {
    current: number;
    min: number;
    max: number;
  };
}

// ============================================================================
// Memory Metrics Types
// ============================================================================

export interface MemoryMetrics {
  total: number;
  used: number;
  free?: number;
  cached?: number;
  percentage: number;
}

export interface SwapMetrics {
  total: number;
  used: number;
  free: number;
}

// ============================================================================
// Storage Metrics Types
// ============================================================================

export interface StorageDevice {
  name: string;
  mountPoint: string;
  total: number;
  used: number;
  free: number;
  type: string;
  percentage: number;
}

export interface StorageMetrics {
  total: number;
  used: number;
  percentage: number;
  devices?: StorageDevice[];
}

// ============================================================================
// Network Metrics Types
// ============================================================================

export interface NetworkInterface {
  name: string;
  ip: string;
  mac: string;
  rxBytes: number;
  txBytes: number;
  rxPackets: number;
  txPackets: number;
  speed: string;
  status: 'up' | 'down';
}

export interface NetworkMetrics {
  interfaces: NetworkInterface[];
  totalRxBytes?: number;
  totalTxBytes?: number;
}

// ============================================================================
// System Information Types
// ============================================================================

export interface SystemInfo {
  hostname: string;
  uptime: string;
  uptimeSeconds?: number;
  os: string;
  kernel?: string;
  cudaVersion?: string;
}

// ============================================================================
// Process Types
// ============================================================================

export interface ProcessInfo {
  pid: number;
  name: string;
  cpu: number;
  memory: number;
  gpuMemory?: number;
  user: string;
}

// ============================================================================
// Node Overview Types
// ============================================================================

export interface NodeOverview {
  hostname: string;
  uptime: string;
  uptimeSeconds?: number;
  status: 'operational' | 'degraded' | 'offline';
  cpu: CPUMetrics;
  gpu: GPUMetrics;
  memory: MemoryMetrics;
  storage: StorageMetrics;
}

// ============================================================================
// Cluster Types
// ============================================================================

export interface ClusterNode {
  id: string;
  name: string;
  hostname: string;
  ip: string;
  status: 'online' | 'offline' | 'warning';
  role: 'master' | 'worker';
}

export interface ClusterOverview {
  totalGpuCompute: number;
  activeJobs: number;
  totalMemory: number;
  usedMemory: number;
  clusterStatus: 'operational' | 'degraded' | 'offline';
  uptime: string;
  nodes: ClusterNode[];
}

// ============================================================================
// Spark Job Types
// ============================================================================

export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface SparkJob {
  id: string;
  name: string;
  status: JobStatus;
  progress: number;
  startTime: string;
  endTime?: string;
  duration?: number;
  executors: number;
  gpuEnabled: boolean;
  user: string;
  stages?: {
    completed: number;
    total: number;
  };
}

export interface SparkJobSubmission {
  name: string;
  mainClass?: string;
  jarPath?: string;
  pyFile?: string;
  args?: string[];
  executorMemory: string;
  executorCores: number;
  numExecutors: number;
  gpuEnabled: boolean;
  driverMemory?: string;
  conf?: Record<string, string>;
}

export interface SparkJobHistory {
  id: string;
  name: string;
  status: JobStatus;
  startTime: string;
  endTime: string;
  duration: number;
  user: string;
  gpuHours?: number;
  cost?: number;
}

// ============================================================================
// Power Management Types
// ============================================================================

export type ThermalProfile = 'quiet' | 'balanced' | 'performance' | 'max';

export interface PowerState {
  gpuIndex: number;
  powerLimit: number;
  powerDraw: number;
  temperature: number;
  fanSpeed: number;
  fanMode: 'auto' | 'manual';
  thermalProfile: ThermalProfile;
}

export interface ThermalProfileConfig {
  id: ThermalProfile;
  name: string;
  description: string;
  powerLimit: number;
  fanSpeed: number;
  targetTemp: number;
}

// ============================================================================
// Log Types
// ============================================================================

export type LogLevel = 'error' | 'warning' | 'info' | 'debug' | 'notice';

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  service: string;
  message: string;
  source?: string;
}

export interface LogStats {
  total: number;
  byLevel: Record<LogLevel, number>;
  byService: Record<string, number>;
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface AppConfig {
  version: string;
  hostname: string;
  alerts: AlertConfig;
  integrations: IntegrationConfig;
  preferences: PreferencesConfig;
}

export interface AlertConfig {
  temperatureWarning: number;
  temperatureCritical: number;
  memoryWarning: number;
  memoryCritical: number;
  gpuUtilizationWarning: number;
  emailEnabled: boolean;
  slackEnabled: boolean;
}

export interface IntegrationConfig {
  splunkEnabled: boolean;
  splunkUrl?: string;
  prometheusEnabled: boolean;
  prometheusUrl?: string;
}

export interface PreferencesConfig {
  theme: 'dark' | 'light' | 'system';
  refreshInterval: number;
  timezone: string;
}

// ============================================================================
// WebSocket Message Types
// ============================================================================

export type WebSocketMessageType = 
  | 'gpu_metrics'
  | 'job_status'
  | 'alert'
  | 'system_status'
  | 'connection';

export interface WebSocketMessage<T = unknown> {
  type: WebSocketMessageType;
  timestamp: number;
  data: T;
}

export interface GPUMetricsMessage {
  gpus: GPUMetrics[];
  nodeId: string;
}

export interface JobStatusMessage {
  jobId: string;
  status: JobStatus;
  progress: number;
  message?: string;
}

export interface AlertMessage {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  source: string;
  timestamp: number;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ============================================================================
// Backup Types
// ============================================================================

export interface BackupMetadata {
  id: string;
  filename: string;
  createdAt: string;
  size: number;
  version: string;
  description?: string;
}

export interface BackupData {
  metadata: BackupMetadata;
  config: AppConfig;
  alertRules?: AlertConfig;
}
