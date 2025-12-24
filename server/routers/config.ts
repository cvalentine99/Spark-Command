import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import * as fs from "fs/promises";
import * as path from "path";

// Configuration schema
const ConfigSchema = z.object({
  version: z.string(),
  exportedAt: z.string(),
  system: z.object({
    hostname: z.string().optional(),
    timezone: z.string().optional(),
  }),
  monitoring: z.object({
    prometheusUrl: z.string().optional(),
    grafanaUrl: z.string().optional(),
    refreshInterval: z.number().optional(),
  }),
  alerts: z.object({
    enabled: z.boolean(),
    rules: z.array(z.object({
      id: z.string(),
      name: z.string(),
      condition: z.string(),
      threshold: z.number(),
      severity: z.enum(["critical", "warning", "info"]),
      enabled: z.boolean(),
    })),
  }),
  integrations: z.object({
    pagerduty: z.object({
      enabled: z.boolean(),
      serviceKey: z.string().optional(),
    }),
    slack: z.object({
      enabled: z.boolean(),
      webhookUrl: z.string().optional(),
      channel: z.string().optional(),
    }),
    splunk: z.object({
      enabled: z.boolean(),
      serverUrl: z.string().optional(),
      hecToken: z.string().optional(),
      index: z.string().optional(),
      sourcetype: z.string().optional(),
      sslVerify: z.boolean().optional(),
    }),
    chronicle: z.object({
      enabled: z.boolean(),
      customerId: z.string().optional(),
      serviceAccountKey: z.string().optional(),
    }),
    prometheus: z.object({
      url: z.string().optional(),
      scrapeInterval: z.number().optional(),
      refreshRate: z.number().optional(),
    }),
  }),
  logging: z.object({
    retention: z.number().optional(),
    forwardSystemLogs: z.boolean().optional(),
    forwardContainerLogs: z.boolean().optional(),
    forwardAuditLogs: z.boolean().optional(),
  }).optional(),
  spark: z.object({
    masterUrl: z.string().optional(),
    defaultExecutorMemory: z.string().optional(),
    defaultExecutorCores: z.number().optional(),
    rapidsEnabled: z.boolean().optional(),
  }),
  power: z.object({
    defaultProfile: z.string().optional(),
    customPowerLimit: z.number().optional(),
  }),
  ui: z.object({
    theme: z.enum(["dark", "light"]).optional(),
    refreshRate: z.number().optional(),
    showDebugInfo: z.boolean().optional(),
  }),
});

type Config = z.infer<typeof ConfigSchema>;

// Default configuration
const defaultConfig: Config = {
  version: "1.0.0",
  exportedAt: new Date().toISOString(),
  system: {
    hostname: "dgx-spark-01",
    timezone: "UTC",
  },
  monitoring: {
    prometheusUrl: "http://localhost:9090",
    grafanaUrl: "http://localhost:3001",
    refreshInterval: 5000,
  },
  alerts: {
    enabled: true,
    rules: [
      {
        id: "gpu-temp-critical",
        name: "GPU Temperature Critical",
        condition: "temperature > threshold",
        threshold: 85,
        severity: "critical",
        enabled: true,
      },
      {
        id: "gpu-temp-warning",
        name: "GPU Temperature Warning",
        condition: "temperature > threshold",
        threshold: 75,
        severity: "warning",
        enabled: true,
      },
      {
        id: "gpu-memory-high",
        name: "GPU Memory Usage High",
        condition: "memory_used_percent > threshold",
        threshold: 90,
        severity: "warning",
        enabled: true,
      },
      {
        id: "gpu-power-limit",
        name: "GPU Power Near Limit",
        condition: "power_draw_percent > threshold",
        threshold: 95,
        severity: "warning",
        enabled: true,
      },
      {
        id: "spark-job-failed",
        name: "Spark Job Failed",
        condition: "job_status == failed",
        threshold: 1,
        severity: "critical",
        enabled: true,
      },
    ],
  },
  integrations: {
    pagerduty: {
      enabled: false,
    },
    slack: {
      enabled: false,
    },
    splunk: {
      enabled: false,
      serverUrl: "https://splunk.example.com:8088",
      index: "dgx_spark_metrics",
      sourcetype: "dcgm:metrics",
      sslVerify: true,
    },
    chronicle: {
      enabled: false,
    },
    prometheus: {
      url: "http://localhost:9090",
      scrapeInterval: 15,
      refreshRate: 5,
    },
  },
  logging: {
    retention: 90,
    forwardSystemLogs: true,
    forwardContainerLogs: true,
    forwardAuditLogs: true,
  },
  spark: {
    masterUrl: "spark://localhost:7077",
    defaultExecutorMemory: "8g",
    defaultExecutorCores: 4,
    rapidsEnabled: true,
  },
  power: {
    defaultProfile: "Balanced",
  },
  ui: {
    theme: "dark",
    refreshRate: 5000,
    showDebugInfo: false,
  },
};

// Config file path
const CONFIG_DIR = "/tmp/dgx-spark-config";
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");
const BACKUP_DIR = path.join(CONFIG_DIR, "backups");

// Ensure directories exist
async function ensureDirectories() {
  await fs.mkdir(CONFIG_DIR, { recursive: true });
  await fs.mkdir(BACKUP_DIR, { recursive: true });
}

// Load current config
async function loadConfig(): Promise<Config> {
  try {
    await ensureDirectories();
    const content = await fs.readFile(CONFIG_FILE, "utf-8");
    return ConfigSchema.parse(JSON.parse(content));
  } catch {
    return { ...defaultConfig, exportedAt: new Date().toISOString() };
  }
}

// Save config
async function saveConfig(config: Config): Promise<void> {
  await ensureDirectories();
  await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
}

export const configRouter = router({
  // Get current configuration
  getConfig: publicProcedure.query(async () => {
    const config = await loadConfig();
    return { config };
  }),

  // Update configuration
  updateConfig: publicProcedure
    .input(ConfigSchema.partial())
    .mutation(async ({ input }) => {
      const current = await loadConfig();
      const updated: Config = {
        ...current,
        ...input,
        exportedAt: new Date().toISOString(),
      };
      await saveConfig(updated);
      return { success: true, config: updated };
    }),

  // Export configuration as JSON
  exportConfig: publicProcedure.query(async () => {
    const config = await loadConfig();
    const exportData = {
      ...config,
      exportedAt: new Date().toISOString(),
    };
    return {
      config: exportData,
      json: JSON.stringify(exportData, null, 2),
      filename: `dgx-spark-config-${new Date().toISOString().split("T")[0]}.json`,
    };
  }),

  // Import configuration
  importConfig: publicProcedure
    .input(z.object({ configJson: z.string() }))
    .mutation(async ({ input }) => {
      try {
        const parsed = JSON.parse(input.configJson);
        const validated = ConfigSchema.parse(parsed);
        
        // Create backup before importing
        const current = await loadConfig();
        const backupName = `backup-${Date.now()}.json`;
        await fs.writeFile(
          path.join(BACKUP_DIR, backupName),
          JSON.stringify(current, null, 2)
        );

        // Save imported config
        await saveConfig({
          ...validated,
          exportedAt: new Date().toISOString(),
        });

        return {
          success: true,
          message: "Configuration imported successfully",
          backupCreated: backupName,
        };
      } catch (error: any) {
        return {
          success: false,
          message: `Import failed: ${error.message}`,
        };
      }
    }),

  // Create backup
  createBackup: publicProcedure
    .input(z.object({ name: z.string().optional() }))
    .mutation(async ({ input }) => {
      await ensureDirectories();
      const config = await loadConfig();
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const backupName = input.name
        ? `${input.name}-${timestamp}.json`
        : `backup-${timestamp}.json`;
      
      await fs.writeFile(
        path.join(BACKUP_DIR, backupName),
        JSON.stringify(config, null, 2)
      );

      return {
        success: true,
        backupName,
        message: `Backup created: ${backupName}`,
      };
    }),

  // List backups
  listBackups: publicProcedure.query(async () => {
    await ensureDirectories();
    try {
      const files = await fs.readdir(BACKUP_DIR);
      const backups = await Promise.all(
        files
          .filter((f) => f.endsWith(".json"))
          .map(async (filename) => {
            const filepath = path.join(BACKUP_DIR, filename);
            const stat = await fs.stat(filepath);
            return {
              filename,
              createdAt: stat.mtime.toISOString(),
              size: stat.size,
            };
          })
      );
      return {
        backups: backups.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ),
      };
    } catch {
      return { backups: [] };
    }
  }),

  // Restore from backup
  restoreBackup: publicProcedure
    .input(z.object({ filename: z.string() }))
    .mutation(async ({ input }) => {
      try {
        const backupPath = path.join(BACKUP_DIR, input.filename);
        const content = await fs.readFile(backupPath, "utf-8");
        const config = ConfigSchema.parse(JSON.parse(content));
        
        // Create a backup of current before restoring
        const current = await loadConfig();
        const preRestoreBackup = `pre-restore-${Date.now()}.json`;
        await fs.writeFile(
          path.join(BACKUP_DIR, preRestoreBackup),
          JSON.stringify(current, null, 2)
        );

        await saveConfig(config);

        return {
          success: true,
          message: `Restored from ${input.filename}`,
          preRestoreBackup,
        };
      } catch (error: any) {
        return {
          success: false,
          message: `Restore failed: ${error.message}`,
        };
      }
    }),

  // Delete backup
  deleteBackup: publicProcedure
    .input(z.object({ filename: z.string() }))
    .mutation(async ({ input }) => {
      try {
        await fs.unlink(path.join(BACKUP_DIR, input.filename));
        return { success: true, message: `Deleted ${input.filename}` };
      } catch (error: any) {
        return { success: false, message: `Delete failed: ${error.message}` };
      }
    }),

  // Reset to defaults
  resetToDefaults: publicProcedure.mutation(async () => {
    // Create backup first
    const current = await loadConfig();
    const backupName = `pre-reset-${Date.now()}.json`;
    await fs.writeFile(
      path.join(BACKUP_DIR, backupName),
      JSON.stringify(current, null, 2)
    );

    await saveConfig({ ...defaultConfig, exportedAt: new Date().toISOString() });

    return {
      success: true,
      message: "Configuration reset to defaults",
      backupCreated: backupName,
    };
  }),

  // Validate configuration JSON
  validateConfig: publicProcedure
    .input(z.object({ configJson: z.string() }))
    .mutation(async ({ input }) => {
      try {
        const parsed = JSON.parse(input.configJson);
        ConfigSchema.parse(parsed);
        return { valid: true, errors: [] };
      } catch (error: any) {
        if (error.errors) {
          return {
            valid: false,
            errors: error.errors.map((e: any) => ({
              path: e.path.join("."),
              message: e.message,
            })),
          };
        }
        return { valid: false, errors: [{ path: "root", message: error.message }] };
      }
    }),
});
