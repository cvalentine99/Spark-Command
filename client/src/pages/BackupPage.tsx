import { useState, useEffect } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Archive,
  Download,
  Upload,
  RotateCcw,
  Trash2,
  Save,
  Clock,
  FileJson,
  Check,
  X,
  AlertTriangle,
  Copy,
  RefreshCw,
  Settings,
  Shield,
  Zap,
  Bell,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

// Types
interface Config {
  version: string;
  exportedAt: string;
  system: {
    hostname?: string;
    timezone?: string;
  };
  monitoring: {
    prometheusUrl?: string;
    grafanaUrl?: string;
    refreshInterval?: number;
  };
  alerts: {
    enabled: boolean;
    rules: {
      id: string;
      name: string;
      condition: string;
      threshold: number;
      severity: "critical" | "warning" | "info";
      enabled: boolean;
    }[];
  };
  integrations: {
    pagerduty: { enabled: boolean; serviceKey?: string };
    slack: { enabled: boolean; webhookUrl?: string; channel?: string };
    splunk: { enabled: boolean; host?: string; token?: string };
  };
  spark: {
    masterUrl?: string;
    defaultExecutorMemory?: string;
    defaultExecutorCores?: number;
    rapidsEnabled?: boolean;
  };
  power: {
    defaultProfile?: string;
    customPowerLimit?: number;
  };
  ui: {
    theme?: "dark" | "light";
    refreshRate?: number;
    showDebugInfo?: boolean;
  };
}

interface Backup {
  filename: string;
  createdAt: string;
  size: number;
}

// Default config
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
    ],
  },
  integrations: {
    pagerduty: { enabled: false },
    slack: { enabled: false },
    splunk: { enabled: false },
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

// Simulated backups
const initialBackups: Backup[] = [
  {
    filename: "backup-2024-12-22T10-30-00.json",
    createdAt: "2024-12-22T10:30:00Z",
    size: 2456,
  },
  {
    filename: "backup-2024-12-21T15-45-00.json",
    createdAt: "2024-12-21T15:45:00Z",
    size: 2389,
  },
  {
    filename: "pre-update-2024-12-20.json",
    createdAt: "2024-12-20T09:00:00Z",
    size: 2512,
  },
];

// Format file size
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Config section component
function ConfigSection({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="p-4 bg-black/30 rounded-lg border border-white/10">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-orange-500" />
        <span className="font-semibold text-white">{title}</span>
      </div>
      <div className="space-y-2 text-sm">{children}</div>
    </div>
  );
}

export default function BackupPage() {
  const [config, setConfig] = useState<Config>(defaultConfig);
  const [backups, setBackups] = useState<Backup[]>(initialBackups);
  const [importJson, setImportJson] = useState("");
  const [backupName, setBackupName] = useState("");
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState<{
    open: boolean;
    backup: Backup | null;
  }>({ open: false, backup: null });
  const [showResetDialog, setShowResetDialog] = useState(false);

  // Export configuration
  const exportConfig = () => {
    const exportData = { ...config, exportedAt: new Date().toISOString() };
    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dgx-spark-config-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Configuration exported successfully");
  };

  // Copy to clipboard
  const copyToClipboard = () => {
    const json = JSON.stringify(config, null, 2);
    navigator.clipboard.writeText(json);
    toast.success("Configuration copied to clipboard");
  };

  // Validate import JSON
  const validateImport = (json: string): string[] => {
    const errors: string[] = [];
    try {
      const parsed = JSON.parse(json);
      if (!parsed.version) errors.push("Missing version field");
      if (!parsed.system) errors.push("Missing system configuration");
      if (!parsed.monitoring) errors.push("Missing monitoring configuration");
      if (!parsed.alerts) errors.push("Missing alerts configuration");
      if (!parsed.integrations) errors.push("Missing integrations configuration");
    } catch (e: any) {
      errors.push(`Invalid JSON: ${e.message}`);
    }
    return errors;
  };

  // Handle import
  const handleImport = () => {
    const errors = validateImport(importJson);
    setValidationErrors(errors);

    if (errors.length === 0) {
      try {
        const imported = JSON.parse(importJson);
        // Create backup before import
        const backupName = `pre-import-${Date.now()}.json`;
        setBackups((prev) => [
          {
            filename: backupName,
            createdAt: new Date().toISOString(),
            size: JSON.stringify(config).length,
          },
          ...prev,
        ]);
        setConfig(imported);
        setShowImportDialog(false);
        setImportJson("");
        toast.success("Configuration imported successfully");
      } catch (e) {
        toast.error("Failed to import configuration");
      }
    }
  };

  // Create backup
  const createBackup = () => {
    const name = backupName || `backup-${new Date().toISOString().replace(/[:.]/g, "-")}`;
    const newBackup: Backup = {
      filename: `${name}.json`,
      createdAt: new Date().toISOString(),
      size: JSON.stringify(config).length,
    };
    setBackups((prev) => [newBackup, ...prev]);
    setBackupName("");
    toast.success(`Backup created: ${newBackup.filename}`);
  };

  // Restore backup
  const restoreBackup = (backup: Backup) => {
    // In real implementation, this would load from storage
    // For demo, we just show success
    setShowRestoreDialog({ open: false, backup: null });
    toast.success(`Restored from ${backup.filename}`);
  };

  // Delete backup
  const deleteBackup = (filename: string) => {
    setBackups((prev) => prev.filter((b) => b.filename !== filename));
    toast.success(`Deleted ${filename}`);
  };

  // Reset to defaults
  const resetToDefaults = () => {
    // Create backup first
    const backupName = `pre-reset-${Date.now()}.json`;
    setBackups((prev) => [
      {
        filename: backupName,
        createdAt: new Date().toISOString(),
        size: JSON.stringify(config).length,
      },
      ...prev,
    ]);
    setConfig({ ...defaultConfig, exportedAt: new Date().toISOString() });
    setShowResetDialog(false);
    toast.success("Configuration reset to defaults");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Archive className="w-8 h-8 text-orange-500" />
            Backup & Restore
          </h1>
          <p className="text-gray-400 mt-1">
            Export, import, and manage system configurations
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => setShowResetDialog(true)}>
            <RotateCcw className="w-4 h-4 mr-2" /> Reset to Defaults
          </Button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-4">
        <GlassCard
          className="p-6 cursor-pointer hover:border-orange-500/50 transition-colors"
          onClick={exportConfig}
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-orange-500/20 rounded-lg">
              <Download className="w-6 h-6 text-orange-500" />
            </div>
            <div>
              <div className="font-semibold text-white">Export Configuration</div>
              <div className="text-sm text-gray-400">Download as JSON file</div>
            </div>
          </div>
        </GlassCard>

        <GlassCard
          className="p-6 cursor-pointer hover:border-blue-500/50 transition-colors"
          onClick={() => setShowImportDialog(true)}
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500/20 rounded-lg">
              <Upload className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <div className="font-semibold text-white">Import Configuration</div>
              <div className="text-sm text-gray-400">Load from JSON</div>
            </div>
          </div>
        </GlassCard>

        <GlassCard
          className="p-6 cursor-pointer hover:border-green-500/50 transition-colors"
          onClick={copyToClipboard}
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-500/20 rounded-lg">
              <Copy className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <div className="font-semibold text-white">Copy to Clipboard</div>
              <div className="text-sm text-gray-400">Copy current config</div>
            </div>
          </div>
        </GlassCard>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Current Configuration */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Current Configuration</h3>
            <Badge variant="outline" className="text-green-400 border-green-400/30">
              v{config.version}
            </Badge>
          </div>

          <div className="space-y-4">
            <ConfigSection title="System" icon={Settings}>
              <div className="flex justify-between">
                <span className="text-gray-400">Hostname</span>
                <span className="text-white">{config.system.hostname}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Timezone</span>
                <span className="text-white">{config.system.timezone}</span>
              </div>
            </ConfigSection>

            <ConfigSection title="Monitoring" icon={RefreshCw}>
              <div className="flex justify-between">
                <span className="text-gray-400">Prometheus</span>
                <span className="text-white font-mono text-xs">
                  {config.monitoring.prometheusUrl}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Refresh Interval</span>
                <span className="text-white">{config.monitoring.refreshInterval}ms</span>
              </div>
            </ConfigSection>

            <ConfigSection title="Alerts" icon={Bell}>
              <div className="flex justify-between">
                <span className="text-gray-400">Status</span>
                <Badge
                  variant="outline"
                  className={
                    config.alerts.enabled
                      ? "text-green-400 border-green-400/30"
                      : "text-gray-400 border-gray-400/30"
                  }
                >
                  {config.alerts.enabled ? "Enabled" : "Disabled"}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Active Rules</span>
                <span className="text-white">
                  {config.alerts.rules.filter((r) => r.enabled).length} /{" "}
                  {config.alerts.rules.length}
                </span>
              </div>
            </ConfigSection>

            <ConfigSection title="Power" icon={Zap}>
              <div className="flex justify-between">
                <span className="text-gray-400">Default Profile</span>
                <span className="text-orange-400">{config.power.defaultProfile}</span>
              </div>
            </ConfigSection>

            <ConfigSection title="Integrations" icon={Shield}>
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant="outline"
                  className={
                    config.integrations.pagerduty.enabled
                      ? "text-green-400 border-green-400/30"
                      : "text-gray-500 border-gray-500/30"
                  }
                >
                  PagerDuty
                </Badge>
                <Badge
                  variant="outline"
                  className={
                    config.integrations.slack.enabled
                      ? "text-green-400 border-green-400/30"
                      : "text-gray-500 border-gray-500/30"
                  }
                >
                  Slack
                </Badge>
                <Badge
                  variant="outline"
                  className={
                    config.integrations.splunk.enabled
                      ? "text-green-400 border-green-400/30"
                      : "text-gray-500 border-gray-500/30"
                  }
                >
                  Splunk
                </Badge>
              </div>
            </ConfigSection>
          </div>

          <div className="mt-4 pt-4 border-t border-white/10 text-xs text-gray-500">
            Last exported: {new Date(config.exportedAt).toLocaleString()}
          </div>
        </GlassCard>

        {/* Backup Management */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Backup History</h3>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Backup name (optional)"
                value={backupName}
                onChange={(e) => setBackupName(e.target.value)}
                className="w-48 h-8 text-sm bg-black/30 border-white/10"
              />
              <Button size="sm" onClick={createBackup}>
                <Save className="w-4 h-4 mr-1" /> Create
              </Button>
            </div>
          </div>

          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            <AnimatePresence>
              {backups.map((backup, index) => (
                <motion.div
                  key={backup.filename}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center justify-between p-3 bg-black/30 rounded-lg border border-white/10 hover:border-white/20 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <FileJson className="w-5 h-5 text-orange-500" />
                    <div>
                      <div className="text-sm text-white font-mono">
                        {backup.filename}
                      </div>
                      <div className="text-xs text-gray-500 flex items-center gap-2">
                        <Clock className="w-3 h-3" />
                        {new Date(backup.createdAt).toLocaleString()}
                        <span>•</span>
                        {formatSize(backup.size)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowRestoreDialog({ open: true, backup })}
                      className="text-blue-400 hover:text-blue-300"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteBackup(backup.filename)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {backups.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No backups yet. Create one to get started.
              </div>
            )}
          </div>
        </GlassCard>
      </div>

      {/* Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="bg-[#0a0a0a] border-white/10 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Upload className="w-5 h-5 text-blue-500" />
              Import Configuration
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Paste your configuration JSON below. A backup will be created automatically.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Textarea
              placeholder='{"version": "1.0.0", "system": {...}, ...}'
              value={importJson}
              onChange={(e) => {
                setImportJson(e.target.value);
                setValidationErrors([]);
              }}
              className="h-64 font-mono text-sm bg-black/50 border-white/10"
            />

            {validationErrors.length > 0 && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <div className="flex items-center gap-2 text-red-400 font-semibold mb-2">
                  <X className="w-4 h-4" /> Validation Errors
                </div>
                <ul className="text-sm text-red-300 space-y-1">
                  {validationErrors.map((error, i) => (
                    <li key={i}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}

            {importJson && validationErrors.length === 0 && (
              <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                <div className="flex items-center gap-2 text-green-400">
                  <Check className="w-4 h-4" /> JSON is valid
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={!importJson}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Upload className="w-4 h-4 mr-2" /> Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore Dialog */}
      <Dialog
        open={showRestoreDialog.open}
        onOpenChange={(open) => setShowRestoreDialog({ open, backup: null })}
      >
        <DialogContent className="bg-[#0a0a0a] border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-blue-500" />
              Restore Backup
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Are you sure you want to restore from{" "}
              <span className="text-white font-mono">
                {showRestoreDialog.backup?.filename}
              </span>
              ? Current configuration will be backed up first.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRestoreDialog({ open: false, backup: null })}
            >
              Cancel
            </Button>
            <Button
              onClick={() =>
                showRestoreDialog.backup && restoreBackup(showRestoreDialog.backup)
              }
              className="bg-blue-600 hover:bg-blue-700"
            >
              <RotateCcw className="w-4 h-4 mr-2" /> Restore
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Dialog */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent className="bg-[#0a0a0a] border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              Reset to Defaults
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              This will reset all configuration to factory defaults. A backup of your
              current configuration will be created automatically.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={resetToDefaults}
              className="bg-yellow-600 hover:bg-yellow-700"
            >
              <RotateCcw className="w-4 h-4 mr-2" /> Reset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
