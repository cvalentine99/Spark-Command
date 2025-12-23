import { useState } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
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
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
  const [importJson, setImportJson] = useState("");
  const [backupName, setBackupName] = useState("");
  const [validationErrors, setValidationErrors] = useState<{ path: string; message: string }[]>([]);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState<{
    open: boolean;
    backup: { filename: string; createdAt: string; size: number } | null;
  }>({ open: false, backup: null });
  const [showResetDialog, setShowResetDialog] = useState(false);

  // Fetch current config
  const configQuery = trpc.config.getConfig.useQuery();

  // Fetch backups list
  const backupsQuery = trpc.config.listBackups.useQuery();

  // Mutations
  const exportConfigMutation = trpc.config.exportConfig.useQuery();

  const importConfigMutation = trpc.config.importConfig.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message);
        setShowImportDialog(false);
        setImportJson("");
        setValidationErrors([]);
        configQuery.refetch();
        backupsQuery.refetch();
      } else {
        toast.error(data.message);
      }
    },
    onError: (error) => {
      toast.error(`Import failed: ${error.message}`);
    },
  });

  const createBackupMutation = trpc.config.createBackup.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setBackupName("");
      backupsQuery.refetch();
    },
    onError: (error) => {
      toast.error(`Backup failed: ${error.message}`);
    },
  });

  const restoreBackupMutation = trpc.config.restoreBackup.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message);
        setShowRestoreDialog({ open: false, backup: null });
        configQuery.refetch();
        backupsQuery.refetch();
      } else {
        toast.error(data.message);
      }
    },
    onError: (error) => {
      toast.error(`Restore failed: ${error.message}`);
    },
  });

  const deleteBackupMutation = trpc.config.deleteBackup.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message);
        backupsQuery.refetch();
      } else {
        toast.error(data.message);
      }
    },
    onError: (error) => {
      toast.error(`Delete failed: ${error.message}`);
    },
  });

  const resetToDefaultsMutation = trpc.config.resetToDefaults.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setShowResetDialog(false);
      configQuery.refetch();
      backupsQuery.refetch();
    },
    onError: (error) => {
      toast.error(`Reset failed: ${error.message}`);
    },
  });

  const validateConfigMutation = trpc.config.validateConfig.useMutation({
    onSuccess: (data) => {
      if (data.valid) {
        setValidationErrors([]);
      } else {
        setValidationErrors(data.errors);
      }
    },
  });

  const config = configQuery.data?.config;
  const backups = backupsQuery.data?.backups || [];

  // Export configuration
  const exportConfig = () => {
    if (exportConfigMutation.data) {
      const json = exportConfigMutation.data.json;
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = exportConfigMutation.data.filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Configuration exported successfully");
    }
  };

  // Copy to clipboard
  const copyToClipboard = () => {
    if (config) {
      const json = JSON.stringify(config, null, 2);
      navigator.clipboard.writeText(json);
      toast.success("Configuration copied to clipboard");
    }
  };

  // Handle import
  const handleImport = () => {
    validateConfigMutation.mutate({ configJson: importJson }, {
      onSuccess: (data) => {
        if (data.valid) {
          importConfigMutation.mutate({ configJson: importJson });
        }
      },
    });
  };

  // Create backup
  const createBackup = () => {
    createBackupMutation.mutate({ name: backupName || undefined });
  };

  // Restore backup
  const restoreBackup = () => {
    if (showRestoreDialog.backup) {
      restoreBackupMutation.mutate({ filename: showRestoreDialog.backup.filename });
    }
  };

  // Delete backup
  const deleteBackup = (filename: string) => {
    deleteBackupMutation.mutate({ filename });
  };

  // Reset to defaults
  const resetToDefaults = () => {
    resetToDefaultsMutation.mutate();
  };

  const isLoading = configQuery.isLoading || backupsQuery.isLoading;

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
          <Button 
            variant="outline" 
            onClick={() => setShowResetDialog(true)}
            disabled={resetToDefaultsMutation.isPending}
          >
            {resetToDefaultsMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RotateCcw className="w-4 h-4 mr-2" />
            )}
            Reset to Defaults
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
              <h3 className="font-semibold text-white">Export Config</h3>
              <p className="text-sm text-gray-400">Download as JSON file</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard
          className="p-6 cursor-pointer hover:border-orange-500/50 transition-colors"
          onClick={() => setShowImportDialog(true)}
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500/20 rounded-lg">
              <Upload className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Import Config</h3>
              <p className="text-sm text-gray-400">Load from JSON file</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard
          className="p-6 cursor-pointer hover:border-orange-500/50 transition-colors"
          onClick={copyToClipboard}
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-500/20 rounded-lg">
              <Copy className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Copy to Clipboard</h3>
              <p className="text-sm text-gray-400">Copy current config</p>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Current Configuration */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FileJson className="w-5 h-5 text-orange-500" />
            Current Configuration
          </h2>
          <Badge variant="outline" className="text-gray-400">
            v{config?.version || "1.0.0"}
          </Badge>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <ConfigSection title="System" icon={Settings}>
              <div className="flex justify-between">
                <span className="text-gray-400">Hostname</span>
                <span className="text-white">{config?.system?.hostname || "dgx-spark-01"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Timezone</span>
                <span className="text-white">{config?.system?.timezone || "UTC"}</span>
              </div>
            </ConfigSection>

            <ConfigSection title="Alerts" icon={Bell}>
              <div className="flex justify-between">
                <span className="text-gray-400">Status</span>
                <Badge variant={config?.alerts?.enabled ? "default" : "secondary"}>
                  {config?.alerts?.enabled ? "Enabled" : "Disabled"}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Rules</span>
                <span className="text-white">{config?.alerts?.rules?.length || 0} configured</span>
              </div>
            </ConfigSection>

            <ConfigSection title="Spark" icon={Zap}>
              <div className="flex justify-between">
                <span className="text-gray-400">Master URL</span>
                <span className="text-white font-mono text-xs">{config?.spark?.masterUrl || "spark://localhost:7077"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">RAPIDS</span>
                <Badge variant={config?.spark?.rapidsEnabled ? "default" : "secondary"}>
                  {config?.spark?.rapidsEnabled ? "Enabled" : "Disabled"}
                </Badge>
              </div>
            </ConfigSection>

            <ConfigSection title="Power" icon={Shield}>
              <div className="flex justify-between">
                <span className="text-gray-400">Default Profile</span>
                <span className="text-white">{config?.power?.defaultProfile || "Balanced"}</span>
              </div>
              {config?.power?.customPowerLimit && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Custom Limit</span>
                  <span className="text-white">{config.power.customPowerLimit}W</span>
                </div>
              )}
            </ConfigSection>
          </div>
        )}
      </GlassCard>

      {/* Backup Management */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Archive className="w-5 h-5 text-orange-500" />
            Backup History
          </h2>
          <div className="flex items-center gap-3">
            <Input
              placeholder="Backup name (optional)"
              value={backupName}
              onChange={(e) => setBackupName(e.target.value)}
              className="w-48 bg-white/5 border-white/10"
            />
            <Button 
              onClick={createBackup}
              disabled={createBackupMutation.isPending}
            >
              {createBackupMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Create Backup
            </Button>
          </div>
        </div>

        {backupsQuery.isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : backups.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Archive className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No backups found</p>
            <p className="text-sm">Create your first backup to get started</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-white/10">
                <TableHead className="text-gray-400">Filename</TableHead>
                <TableHead className="text-gray-400">Created</TableHead>
                <TableHead className="text-gray-400">Size</TableHead>
                <TableHead className="text-gray-400 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {backups.map((backup) => (
                <TableRow key={backup.filename} className="border-white/5 hover:bg-white/5">
                  <TableCell className="font-mono text-sm">{backup.filename}</TableCell>
                  <TableCell className="text-gray-400">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      {new Date(backup.createdAt).toLocaleString()}
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-400">{formatSize(backup.size)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowRestoreDialog({ open: true, backup })}
                        disabled={restoreBackupMutation.isPending}
                      >
                        <RefreshCw className="w-4 h-4 mr-1" /> Restore
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteBackup(backup.filename)}
                        disabled={deleteBackupMutation.isPending}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </GlassCard>

      {/* Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-blue-500" />
              Import Configuration
            </DialogTitle>
            <DialogDescription>
              Paste your configuration JSON below. A backup will be created before importing.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder='{"version": "1.0.0", ...}'
              value={importJson}
              onChange={(e) => {
                setImportJson(e.target.value);
                setValidationErrors([]);
              }}
              className="h-64 font-mono text-sm bg-black/50 border-white/10"
            />
            {validationErrors.length > 0 && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <div className="flex items-center gap-2 text-red-400 mb-2">
                  <X className="w-4 h-4" />
                  <span className="font-semibold">Validation Errors</span>
                </div>
                <ul className="text-sm text-red-300 space-y-1">
                  {validationErrors.map((error, i) => (
                    <li key={i}>• {error.path}: {error.message}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleImport}
              disabled={!importJson || importConfigMutation.isPending || validateConfigMutation.isPending}
            >
              {(importConfigMutation.isPending || validateConfigMutation.isPending) ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Upload className="w-4 h-4 mr-2" />
              )}
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore Dialog */}
      <Dialog
        open={showRestoreDialog.open}
        onOpenChange={(open) => setShowRestoreDialog({ open, backup: showRestoreDialog.backup })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              Restore Configuration
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to restore from{" "}
              <span className="font-mono text-white">{showRestoreDialog.backup?.filename}</span>?
              A backup of the current configuration will be created first.
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
              onClick={restoreBackup}
              disabled={restoreBackupMutation.isPending}
            >
              {restoreBackupMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Restore
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Dialog */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Reset to Defaults
            </DialogTitle>
            <DialogDescription>
              This will reset all configuration to factory defaults. A backup will be created
              before resetting. This action cannot be undone without restoring from backup.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={resetToDefaults}
              disabled={resetToDefaultsMutation.isPending}
            >
              {resetToDefaultsMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RotateCcw className="w-4 h-4 mr-2" />
              )}
              Reset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
