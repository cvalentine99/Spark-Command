import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  float,
  bigint,
  boolean,
  json,
  index,
} from "drizzle-orm/mysql-core";

// ============================================================================
// User Authentication Table
// ============================================================================

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ============================================================================
// GPU Metrics Table (Research Report Section 8.4)
// ============================================================================

/**
 * GPU metrics history for trend analysis and historical queries.
 * Stores periodic snapshots of GPU state from all cluster nodes.
 */
export const gpuMetrics = mysqlTable("gpu_metrics", {
  id: int("id").autoincrement().primaryKey(),

  /** Node identifier (e.g., "dgx-spark-alpha", "dgx-spark-beta") */
  nodeId: varchar("nodeId", { length: 64 }).notNull(),

  /** GPU index on the node (0 for single GPU systems) */
  gpuIndex: int("gpuIndex").notNull().default(0),

  /** Timestamp of the metric snapshot */
  timestamp: timestamp("timestamp").defaultNow().notNull(),

  /** GPU name/model */
  gpuName: varchar("gpuName", { length: 128 }),

  /** GPU core temperature in Celsius */
  temperature: int("temperature"),

  /** GPU compute utilization percentage (0-100) */
  utilization: int("utilization"),

  /** Memory used in MiB */
  memoryUsed: int("memoryUsed"),

  /** Total memory in MiB */
  memoryTotal: int("memoryTotal"),

  /** Current power draw in Watts */
  powerDraw: float("powerDraw"),

  /** Power limit in Watts */
  powerLimit: float("powerLimit"),

  /** Fan speed percentage (0-100) */
  fanSpeed: int("fanSpeed"),

  /** SM clock speed in MHz */
  smClock: int("smClock"),

  /** Memory clock speed in MHz */
  memClock: int("memClock"),
}, (table) => [
  index("idx_gpu_metrics_node_time").on(table.nodeId, table.timestamp),
  index("idx_gpu_metrics_timestamp").on(table.timestamp),
]);

export type GpuMetric = typeof gpuMetrics.$inferSelect;
export type InsertGpuMetric = typeof gpuMetrics.$inferInsert;

// ============================================================================
// System Metrics Table
// ============================================================================

/**
 * System-wide metrics (CPU, memory, storage) for historical analysis.
 */
export const systemMetrics = mysqlTable("system_metrics", {
  id: int("id").autoincrement().primaryKey(),

  /** Node identifier */
  nodeId: varchar("nodeId", { length: 64 }).notNull(),

  /** Timestamp of the metric snapshot */
  timestamp: timestamp("timestamp").defaultNow().notNull(),

  /** CPU utilization percentage */
  cpuUsage: float("cpuUsage"),

  /** CPU temperature in Celsius */
  cpuTemperature: float("cpuTemperature"),

  /** Memory used in bytes */
  memoryUsed: bigint("memoryUsed", { mode: "number" }),

  /** Total memory in bytes */
  memoryTotal: bigint("memoryTotal", { mode: "number" }),

  /** Memory percentage used */
  memoryPercentage: float("memoryPercentage"),

  /** Storage used in bytes */
  storageUsed: bigint("storageUsed", { mode: "number" }),

  /** Total storage in bytes */
  storageTotal: bigint("storageTotal", { mode: "number" }),

  /** Storage percentage used */
  storagePercentage: float("storagePercentage"),

  /** Network RX bytes since boot */
  networkRxBytes: bigint("networkRxBytes", { mode: "number" }),

  /** Network TX bytes since boot */
  networkTxBytes: bigint("networkTxBytes", { mode: "number" }),
}, (table) => [
  index("idx_system_metrics_node_time").on(table.nodeId, table.timestamp),
  index("idx_system_metrics_timestamp").on(table.timestamp),
]);

export type SystemMetric = typeof systemMetrics.$inferSelect;
export type InsertSystemMetric = typeof systemMetrics.$inferInsert;

// ============================================================================
// Alerts Table (Research Report Section 8.4)
// ============================================================================

/**
 * Alert records for threshold violations and system events.
 * Supports acknowledgment workflow and alert history.
 */
export const alerts = mysqlTable("alerts", {
  id: int("id").autoincrement().primaryKey(),

  /** Node that triggered the alert */
  nodeId: varchar("nodeId", { length: 64 }).notNull(),

  /** GPU index if GPU-related alert */
  gpuIndex: int("gpuIndex"),

  /** Alert type (e.g., "temperature", "memory", "power", "offline") */
  alertType: varchar("alertType", { length: 64 }).notNull(),

  /** Severity level */
  severity: mysqlEnum("severity", ["info", "warning", "critical"]).notNull(),

  /** Human-readable alert title */
  title: varchar("title", { length: 256 }).notNull(),

  /** Detailed alert message */
  message: text("message").notNull(),

  /** The metric value that triggered the alert */
  triggerValue: float("triggerValue"),

  /** The threshold that was exceeded */
  thresholdValue: float("thresholdValue"),

  /** When the alert was created */
  timestamp: timestamp("timestamp").defaultNow().notNull(),

  /** Whether the alert has been acknowledged */
  acknowledged: boolean("acknowledged").default(false).notNull(),

  /** User who acknowledged the alert */
  acknowledgedBy: varchar("acknowledgedBy", { length: 64 }),

  /** When the alert was acknowledged */
  acknowledgedAt: timestamp("acknowledgedAt"),

  /** When the alert condition was resolved */
  resolvedAt: timestamp("resolvedAt"),

  /** Additional metadata as JSON */
  metadata: json("metadata"),
}, (table) => [
  index("idx_alerts_node").on(table.nodeId),
  index("idx_alerts_timestamp").on(table.timestamp),
  index("idx_alerts_severity").on(table.severity),
  index("idx_alerts_acknowledged").on(table.acknowledged),
]);

export type Alert = typeof alerts.$inferSelect;
export type InsertAlert = typeof alerts.$inferInsert;

// ============================================================================
// Spark Job History Table
// ============================================================================

/**
 * Persistent storage for Spark job history.
 * Replaces the in-memory job history in the Spark service.
 */
export const jobHistory = mysqlTable("job_history", {
  id: int("id").autoincrement().primaryKey(),

  /** Unique job identifier (from Spark) */
  jobId: varchar("jobId", { length: 128 }).notNull().unique(),

  /** Submission ID returned by Spark */
  submissionId: varchar("submissionId", { length: 128 }),

  /** Human-readable job name */
  name: varchar("name", { length: 256 }).notNull(),

  /** Current job status */
  status: mysqlEnum("status", ["pending", "running", "completed", "failed", "cancelled"]).notNull(),

  /** Job progress percentage (0-100) */
  progress: int("progress").default(0).notNull(),

  /** When the job was submitted */
  submittedAt: timestamp("submittedAt").defaultNow().notNull(),

  /** When the job started executing */
  startedAt: timestamp("startedAt"),

  /** When the job completed/failed/was cancelled */
  completedAt: timestamp("completedAt"),

  /** Duration in milliseconds */
  durationMs: bigint("durationMs", { mode: "number" }),

  /** User who submitted the job */
  userId: varchar("userId", { length: 64 }),

  /** Username for display */
  userName: varchar("userName", { length: 128 }),

  /** Number of executors requested */
  executors: int("executors").default(1).notNull(),

  /** Whether GPU acceleration was enabled */
  gpuEnabled: boolean("gpuEnabled").default(false).notNull(),

  /** Executor memory (e.g., "16g") */
  executorMemory: varchar("executorMemory", { length: 32 }),

  /** Executor cores */
  executorCores: int("executorCores"),

  /** Main class or Python file */
  mainClassOrFile: varchar("mainClassOrFile", { length: 512 }),

  /** Job arguments as JSON array */
  args: json("args"),

  /** Spark configuration as JSON object */
  sparkConf: json("sparkConf"),

  /** GPU hours consumed (for cost estimation) */
  gpuHours: float("gpuHours"),

  /** Estimated cost in dollars */
  estimatedCost: float("estimatedCost"),

  /** Error message if job failed */
  errorMessage: text("errorMessage"),

  /** Spark application ID */
  applicationId: varchar("applicationId", { length: 128 }),

  /** Completed stages count */
  stagesCompleted: int("stagesCompleted").default(0),

  /** Total stages count */
  stagesTotal: int("stagesTotal").default(0),
}, (table) => [
  index("idx_job_history_status").on(table.status),
  index("idx_job_history_user").on(table.userId),
  index("idx_job_history_submitted").on(table.submittedAt),
]);

export type JobHistoryRecord = typeof jobHistory.$inferSelect;
export type InsertJobHistory = typeof jobHistory.$inferInsert;

// ============================================================================
// Cluster Nodes Configuration Table
// ============================================================================

/**
 * Configuration for cluster nodes, including SSH credentials.
 * Used for multi-node management (Research Report Section 6).
 */
export const clusterNodes = mysqlTable("cluster_nodes", {
  id: int("id").autoincrement().primaryKey(),

  /** Unique node identifier */
  nodeId: varchar("nodeId", { length: 64 }).notNull().unique(),

  /** Display name for the node */
  name: varchar("name", { length: 128 }).notNull(),

  /** Node hostname */
  hostname: varchar("hostname", { length: 256 }).notNull(),

  /** Node IP address */
  ipAddress: varchar("ipAddress", { length: 45 }).notNull(),

  /** SSH port (default 22) */
  sshPort: int("sshPort").default(22).notNull(),

  /** SSH username for connections */
  sshUsername: varchar("sshUsername", { length: 64 }),

  /** Node role in the cluster */
  role: mysqlEnum("role", ["master", "worker"]).default("worker").notNull(),

  /** Current node status */
  status: mysqlEnum("status", ["online", "offline", "warning", "unknown"]).default("unknown").notNull(),

  /** Last successful health check */
  lastSeen: timestamp("lastSeen"),

  /** When the node was added to the cluster */
  addedAt: timestamp("addedAt").defaultNow().notNull(),

  /** Node-specific configuration as JSON */
  config: json("config"),

  /** Whether the node is enabled for monitoring */
  enabled: boolean("enabled").default(true).notNull(),
});

export type ClusterNode = typeof clusterNodes.$inferSelect;
export type InsertClusterNode = typeof clusterNodes.$inferInsert;

// ============================================================================
// Audit Log Table
// ============================================================================

/**
 * Audit log for security-sensitive operations.
 * Tracks power management, configuration changes, and admin actions.
 */
export const auditLogs = mysqlTable("audit_logs", {
  id: int("id").autoincrement().primaryKey(),

  /** Timestamp of the action */
  timestamp: timestamp("timestamp").defaultNow().notNull(),

  /** User who performed the action */
  userId: varchar("userId", { length: 64 }),

  /** Username for display */
  userName: varchar("userName", { length: 128 }),

  /** Action type (e.g., "power_limit_change", "config_update") */
  action: varchar("action", { length: 64 }).notNull(),

  /** Resource affected (e.g., node ID, job ID) */
  resource: varchar("resource", { length: 128 }),

  /** Action details as JSON */
  details: json("details"),

  /** Client IP address */
  ipAddress: varchar("ipAddress", { length: 45 }),

  /** Whether the action succeeded */
  success: boolean("success").default(true).notNull(),

  /** Error message if action failed */
  errorMessage: text("errorMessage"),
}, (table) => [
  index("idx_audit_timestamp").on(table.timestamp),
  index("idx_audit_user").on(table.userId),
  index("idx_audit_action").on(table.action),
]);