import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
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
      host: z.string().optional(),
      token: z.string().optional(),
    }),
  }),
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
    },
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

// Config file path - use secure location instead of /tmp
const CONFIG_DIR = process.env.CONFIG_DIR || path.join(process.cwd(), ".dgx-spark-config");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");
const BACKUP_DIR = path.join(CONFIG_DIR, "backups");

// Validate filename to prevent path traversal attacks
function validateFilename(filename: string): string {
  // Only allow alphanumeric, hyphens, underscores, dots, and must end with .json
  const safePattern = /^[a-zA-Z0-9_.-]+\.json$/;
  if (!safePattern.test(filename)) {
    throw new Error('Invalid filename: must be alphanumeric with .json extension');
  }
  // Ensure no path separators
  if (filename.includes('/') || filename.includes('\\') || filename.includes('..')) {
    throw new Error('Invalid filename: path traversal not allowed');
  }
  // Limit filename length
  if (filename.length > 128) {
    throw new Error('Invalid filename: too long');
  }
  return filename;
}

// Validate backup name input
function validateBackupName(name: string | undefined): string | undefined {
  if (!name) return undefined;
  // Only allow alphanumeric, hyphens, underscores
  const safePattern = /^[a-zA-Z0-9_-]+$/;
  if (!safePattern.test(name) || name.length > 64) {
    throw new Error('Invalid backup name: must be alphanumeric with hyphens/underscores only');
  }
  return name;
}

// Ensure directories exist
async function ensureDirectories() {
  await fs.mkdir(CONFIG_DIR, { recursive: true, mode: 0o700 });
  await fs.mkdir(BACKUP_DIR, { recursive: true, mode: 0o700 });
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

  // Update configuration - requires authentication
  updateConfig: protectedProcedure
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

  // Import configuration - requires authentication
  importConfig: protectedProcedure
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

  // Create backup - requires authentication
  createBackup: protectedProcedure
    .input(z.object({ name: z.string().optional() }))
    .mutation(async ({ input }) => {
      await ensureDirectories();
      const config = await loadConfig();
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      
      // Validate backup name to prevent injection
      const safeName = validateBackupName(input.name);
      const backupName = safeName
        ? `${safeName}-${timestamp}.json`
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

  // Restore from backup - requires authentication
  restoreBackup: protectedProcedure
    .input(z.object({ filename: z.string() }))
    .mutation(async ({ input }) => {
      try {
        // Validate filename to prevent path traversal
        const safeFilename = validateFilename(input.filename);
        const backupPath = path.join(BACKUP_DIR, safeFilename);
        
        // Verify the resolved path is within BACKUP_DIR
        const resolvedPath = path.resolve(backupPath);
        const resolvedBackupDir = path.resolve(BACKUP_DIR);
        if (!resolvedPath.startsWith(resolvedBackupDir)) {
          throw new Error('Invalid backup path');
        }
        
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

  // Delete backup - requires authentication
  deleteBackup: protectedProcedure
    .input(z.object({ filename: z.string() }))
    .mutation(async ({ input }) => {
      try {
        // Validate filename to prevent path traversal
        const safeFilename = validateFilename(input.filename);
        const filePath = path.join(BACKUP_DIR, safeFilename);
        
        // Verify the resolved path is within BACKUP_DIR
        const resolvedPath = path.resolve(filePath);
        const resolvedBackupDir = path.resolve(BACKUP_DIR);
        if (!resolvedPath.startsWith(resolvedBackupDir)) {
          throw new Error('Invalid backup path');
        }
        
        await fs.unlink(filePath);
        return { success: true, message: `Deleted ${input.filename}` };
      } catch (error: any) {
        return { success: false, message: `Delete failed: ${error.message}` };
      }
    }),

  // Reset to defaults - requires authentication
  resetToDefaults: protectedProcedure.mutation(async () => {
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
