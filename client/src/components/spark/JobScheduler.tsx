import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Calendar, 
  Clock, 
  Plus, 
  Trash2, 
  Play, 
  Pause,
  Edit2,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Zap
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ScheduledJob {
  id: string;
  name: string;
  jobConfig: {
    appName: string;
    mainClass: string;
    appResource: string;
    executorMemory: string;
    executorCores: number;
    numExecutors: number;
    enableRapids: boolean;
  };
  schedule: {
    type: 'cron' | 'interval';
    expression: string;
    timezone: string;
  };
  enabled: boolean;
  lastRun?: string;
  nextRun?: string;
  lastStatus?: 'success' | 'failed' | 'running';
  runCount: number;
  createdAt: string;
}

// Mock scheduled jobs
const mockScheduledJobs: ScheduledJob[] = [
  {
    id: 'sched-001',
    name: 'Nightly ETL Pipeline',
    jobConfig: {
      appName: 'etl-nightly',
      mainClass: 'com.company.etl.NightlyJob',
      appResource: '/opt/spark/jobs/etl-pipeline.jar',
      executorMemory: '16g',
      executorCores: 8,
      numExecutors: 4,
      enableRapids: true,
    },
    schedule: {
      type: 'cron',
      expression: '0 2 * * *',
      timezone: 'America/New_York',
    },
    enabled: true,
    lastRun: '2024-12-17T02:00:00Z',
    nextRun: '2024-12-18T02:00:00Z',
    lastStatus: 'success',
    runCount: 45,
    createdAt: '2024-11-01T10:00:00Z',
  },
  {
    id: 'sched-002',
    name: 'Hourly Metrics Aggregation',
    jobConfig: {
      appName: 'metrics-agg',
      mainClass: 'com.company.analytics.MetricsAggregator',
      appResource: '/opt/spark/jobs/metrics.jar',
      executorMemory: '8g',
      executorCores: 4,
      numExecutors: 2,
      enableRapids: true,
    },
    schedule: {
      type: 'cron',
      expression: '0 * * * *',
      timezone: 'UTC',
    },
    enabled: true,
    lastRun: '2024-12-18T10:00:00Z',
    nextRun: '2024-12-18T11:00:00Z',
    lastStatus: 'success',
    runCount: 720,
    createdAt: '2024-10-15T08:00:00Z',
  },
  {
    id: 'sched-003',
    name: 'Weekly Model Retraining',
    jobConfig: {
      appName: 'ml-retrain',
      mainClass: 'com.company.ml.ModelTrainer',
      appResource: '/opt/spark/jobs/ml-training.jar',
      executorMemory: '32g',
      executorCores: 10,
      numExecutors: 4,
      enableRapids: true,
    },
    schedule: {
      type: 'cron',
      expression: '0 4 * * 0',
      timezone: 'America/Los_Angeles',
    },
    enabled: false,
    lastRun: '2024-12-15T04:00:00Z',
    nextRun: '2024-12-22T04:00:00Z',
    lastStatus: 'failed',
    runCount: 12,
    createdAt: '2024-09-20T14:00:00Z',
  },
];

// Common cron presets
const cronPresets = [
  { label: 'Every hour', value: '0 * * * *' },
  { label: 'Every 6 hours', value: '0 */6 * * *' },
  { label: 'Daily at midnight', value: '0 0 * * *' },
  { label: 'Daily at 2 AM', value: '0 2 * * *' },
  { label: 'Weekly (Sunday)', value: '0 0 * * 0' },
  { label: 'Monthly (1st)', value: '0 0 1 * *' },
  { label: 'Custom', value: 'custom' },
];

const parseCronExpression = (cron: string): string => {
  const parts = cron.split(' ');
  if (parts.length !== 5) return cron;
  
  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
  
  if (cron === '0 * * * *') return 'Every hour at minute 0';
  if (cron === '0 */6 * * *') return 'Every 6 hours';
  if (cron === '0 0 * * *') return 'Daily at midnight';
  if (cron === '0 2 * * *') return 'Daily at 2:00 AM';
  if (cron === '0 0 * * 0') return 'Weekly on Sunday at midnight';
  if (cron === '0 0 1 * *') return 'Monthly on the 1st at midnight';
  
  return `At ${hour}:${minute.padStart(2, '0')}`;
};

interface CreateScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (job: Partial<ScheduledJob>) => void;
  editJob?: ScheduledJob;
}

function CreateScheduleDialog({ open, onOpenChange, onSave, editJob }: CreateScheduleDialogProps) {
  const [formData, setFormData] = useState({
    name: editJob?.name || '',
    appName: editJob?.jobConfig.appName || '',
    mainClass: editJob?.jobConfig.mainClass || '',
    appResource: editJob?.jobConfig.appResource || '',
    executorMemory: editJob?.jobConfig.executorMemory || '8g',
    executorCores: editJob?.jobConfig.executorCores || 4,
    numExecutors: editJob?.jobConfig.numExecutors || 2,
    enableRapids: editJob?.jobConfig.enableRapids ?? true,
    cronPreset: 'custom',
    cronExpression: editJob?.schedule.expression || '0 0 * * *',
    timezone: editJob?.schedule.timezone || 'UTC',
  });

  const handlePresetChange = (preset: string) => {
    setFormData(prev => ({
      ...prev,
      cronPreset: preset,
      cronExpression: preset === 'custom' ? prev.cronExpression : preset,
    }));
  };

  const handleSave = () => {
    if (!formData.name || !formData.appName || !formData.mainClass || !formData.appResource) {
      toast.error("Missing required fields");
      return;
    }

    onSave({
      name: formData.name,
      jobConfig: {
        appName: formData.appName,
        mainClass: formData.mainClass,
        appResource: formData.appResource,
        executorMemory: formData.executorMemory,
        executorCores: formData.executorCores,
        numExecutors: formData.numExecutors,
        enableRapids: formData.enableRapids,
      },
      schedule: {
        type: 'cron',
        expression: formData.cronExpression,
        timezone: formData.timezone,
      },
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-[#0a0a0f] border-white/10">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {editJob ? 'Edit Scheduled Job' : 'Create Scheduled Job'}
          </DialogTitle>
          <DialogDescription>
            Configure a recurring Spark job with cron-based scheduling
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Schedule Name */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Schedule Name *</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Nightly ETL Pipeline"
              className="bg-black/20 border-white/10"
            />
          </div>

          {/* Schedule Configuration */}
          <div className="p-4 rounded-lg bg-white/5 border border-white/10 space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Calendar className="h-4 w-4 text-primary" />
              Schedule Configuration
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Frequency Preset</label>
                <Select value={formData.cronPreset} onValueChange={handlePresetChange}>
                  <SelectTrigger className="bg-black/20 border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {cronPresets.map(preset => (
                      <SelectItem key={preset.value} value={preset.value}>
                        {preset.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Timezone</label>
                <Select value={formData.timezone} onValueChange={(v) => setFormData({ ...formData, timezone: v })}>
                  <SelectTrigger className="bg-black/20 border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UTC">UTC</SelectItem>
                    <SelectItem value="America/New_York">Eastern Time</SelectItem>
                    <SelectItem value="America/Chicago">Central Time</SelectItem>
                    <SelectItem value="America/Denver">Mountain Time</SelectItem>
                    <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Cron Expression</label>
              <Input
                value={formData.cronExpression}
                onChange={(e) => setFormData({ ...formData, cronExpression: e.target.value, cronPreset: 'custom' })}
                placeholder="0 0 * * *"
                className="bg-black/20 border-white/10 font-mono"
              />
              <p className="text-[10px] text-muted-foreground">
                Format: minute hour day-of-month month day-of-week | 
                <span className="text-primary ml-1">{parseCronExpression(formData.cronExpression)}</span>
              </p>
            </div>
          </div>

          {/* Job Configuration */}
          <div className="p-4 rounded-lg bg-white/5 border border-white/10 space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Zap className="h-4 w-4 text-green-400" />
              Job Configuration
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Application Name *</label>
                <Input
                  value={formData.appName}
                  onChange={(e) => setFormData({ ...formData, appName: e.target.value })}
                  placeholder="my-spark-job"
                  className="bg-black/20 border-white/10"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Main Class *</label>
                <Input
                  value={formData.mainClass}
                  onChange={(e) => setFormData({ ...formData, mainClass: e.target.value })}
                  placeholder="com.company.MainClass"
                  className="bg-black/20 border-white/10 font-mono text-xs"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Application Resource *</label>
              <Input
                value={formData.appResource}
                onChange={(e) => setFormData({ ...formData, appResource: e.target.value })}
                placeholder="/opt/spark/jobs/my-job.jar"
                className="bg-black/20 border-white/10 font-mono text-xs"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Executor Memory</label>
                <Select value={formData.executorMemory} onValueChange={(v) => setFormData({ ...formData, executorMemory: v })}>
                  <SelectTrigger className="bg-black/20 border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="4g">4 GB</SelectItem>
                    <SelectItem value="8g">8 GB</SelectItem>
                    <SelectItem value="16g">16 GB</SelectItem>
                    <SelectItem value="32g">32 GB</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Executor Cores</label>
                <Select value={String(formData.executorCores)} onValueChange={(v) => setFormData({ ...formData, executorCores: parseInt(v) })}>
                  <SelectTrigger className="bg-black/20 border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2">2 Cores</SelectItem>
                    <SelectItem value="4">4 Cores</SelectItem>
                    <SelectItem value="8">8 Cores</SelectItem>
                    <SelectItem value="10">10 Cores</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Num Executors</label>
                <Select value={String(formData.numExecutors)} onValueChange={(v) => setFormData({ ...formData, numExecutors: parseInt(v) })}>
                  <SelectTrigger className="bg-black/20 border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1</SelectItem>
                    <SelectItem value="2">2</SelectItem>
                    <SelectItem value="4">4</SelectItem>
                    <SelectItem value="6">6</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded bg-green-500/10 border border-green-500/20">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-green-400" />
                <span className="text-sm">RAPIDS GPU Acceleration</span>
              </div>
              <Switch
                checked={formData.enableRapids}
                onCheckedChange={(checked) => setFormData({ ...formData, enableRapids: checked })}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} className="bg-primary hover:bg-primary/90">
            {editJob ? 'Update Schedule' : 'Create Schedule'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function JobScheduler() {
  const [scheduledJobs, setScheduledJobs] = useState<ScheduledJob[]>(mockScheduledJobs);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<ScheduledJob | undefined>();

  const handleToggleEnabled = (jobId: string) => {
    setScheduledJobs(prev => prev.map(job => 
      job.id === jobId ? { ...job, enabled: !job.enabled } : job
    ));
    toast.success("Schedule updated");
  };

  const handleDelete = (jobId: string) => {
    setScheduledJobs(prev => prev.filter(job => job.id !== jobId));
    toast.success("Schedule deleted");
  };

  const handleRunNow = (job: ScheduledJob) => {
    toast.success(`Job "${job.name}" triggered manually`);
  };

  const handleSaveSchedule = (jobData: Partial<ScheduledJob>) => {
    if (editingJob) {
      setScheduledJobs(prev => prev.map(job => 
        job.id === editingJob.id ? { ...job, ...jobData } : job
      ));
      toast.success("Schedule updated");
    } else {
      const newJob: ScheduledJob = {
        id: `sched-${Date.now()}`,
        name: jobData.name!,
        jobConfig: jobData.jobConfig!,
        schedule: jobData.schedule!,
        enabled: true,
        runCount: 0,
        createdAt: new Date().toISOString(),
        nextRun: new Date(Date.now() + 3600000).toISOString(),
      };
      setScheduledJobs(prev => [newJob, ...prev]);
      toast.success("Schedule created");
    }
    setEditingJob(undefined);
  };

  const handleEdit = (job: ScheduledJob) => {
    setEditingJob(job);
    setIsCreateDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-display font-bold">Scheduled Jobs</h3>
          <p className="text-xs text-muted-foreground">Manage recurring Spark job schedules</p>
        </div>
        <Button 
          onClick={() => { setEditingJob(undefined); setIsCreateDialogOpen(true); }}
          className="bg-primary hover:bg-primary/90"
          size="sm"
        >
          <Plus className="h-4 w-4 mr-1" /> New Schedule
        </Button>
      </div>

      <div className="space-y-3">
        {scheduledJobs.map(job => (
          <div 
            key={job.id}
            className={cn(
              "p-4 rounded-lg border transition-all",
              job.enabled 
                ? "bg-white/5 border-white/10 hover:bg-white/10" 
                : "bg-white/2 border-white/5 opacity-60"
            )}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{job.name}</span>
                  {job.jobConfig.enableRapids && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-green-500/10 text-green-400 border border-green-500/20">
                      RAPIDS
                    </span>
                  )}
                  {!job.enabled && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-gray-500/10 text-gray-400 border border-gray-500/20">
                      PAUSED
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-1 font-mono">
                  {job.jobConfig.appName}
                </div>

                <div className="flex flex-wrap items-center gap-4 mt-3 text-xs">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{parseCronExpression(job.schedule.expression)}</span>
                    <span className="text-[10px]">({job.schedule.timezone})</span>
                  </div>
                  
                  {job.lastRun && (
                    <div className="flex items-center gap-1">
                      {job.lastStatus === 'success' ? (
                        <CheckCircle2 className="h-3 w-3 text-green-400" />
                      ) : job.lastStatus === 'failed' ? (
                        <AlertCircle className="h-3 w-3 text-red-400" />
                      ) : (
                        <RefreshCw className="h-3 w-3 text-blue-400 animate-spin" />
                      )}
                      <span className="text-muted-foreground">
                        Last: {new Date(job.lastRun).toLocaleDateString()}
                      </span>
                    </div>
                  )}

                  {job.nextRun && job.enabled && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>Next: {new Date(job.nextRun).toLocaleString()}</span>
                    </div>
                  )}

                  <div className="text-muted-foreground">
                    {job.runCount} runs
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-3 text-[10px] text-muted-foreground">
                  <span>{job.jobConfig.executorMemory} mem</span>
                  <span>•</span>
                  <span>{job.jobConfig.executorCores} cores</span>
                  <span>•</span>
                  <span>{job.jobConfig.numExecutors} executors</span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleRunNow(job)}
                  title="Run now"
                >
                  <Play className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleEdit(job)}
                  title="Edit"
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleToggleEnabled(job.id)}
                  title={job.enabled ? 'Pause' : 'Resume'}
                >
                  {job.enabled ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-red-400 hover:text-red-300"
                  onClick={() => handleDelete(job.id)}
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}

        {scheduledJobs.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No scheduled jobs yet</p>
            <p className="text-xs mt-1">Create a schedule to run Spark jobs automatically</p>
          </div>
        )}
      </div>

      <CreateScheduleDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSave={handleSaveSchedule}
        editJob={editingJob}
      />
    </div>
  );
}

export default JobScheduler;
