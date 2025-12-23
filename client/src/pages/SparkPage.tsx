import React, { useState } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Zap, 
  Clock, 
  Database, 
  Layers, 
  Play, 
  CheckCircle2, 
  AlertCircle,
  Timer,
  Plus,
  XCircle,
  RefreshCw,
  FileCode,
  Cpu,
  HardDrive,
  Settings2,
  Rocket,
  StopCircle,
  ExternalLink,
  Copy,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useWebSocketContext } from "@/contexts/WebSocketContext";
import { JobScheduler } from "@/components/spark/JobScheduler";
import { CostEstimator } from "@/components/spark/CostEstimator";

// Job Templates
const jobTemplates = [
  {
    id: 'pyspark-etl',
    name: 'PySpark ETL Job',
    description: 'Data transformation and loading with PySpark',
    mainClass: 'org.apache.spark.deploy.SparkSubmit',
    appResource: '/opt/spark/examples/src/main/python/pi.py',
    executorMemory: '8g',
    executorCores: 4,
    numExecutors: 2,
    enableRapids: true,
  },
  {
    id: 'rapids-sql',
    name: 'RAPIDS SQL Analytics',
    description: 'GPU-accelerated SQL queries with RAPIDS',
    mainClass: 'com.nvidia.spark.rapids.tool.profiling.ProfileMain',
    appResource: '/opt/spark/jars/rapids-4-spark.jar',
    executorMemory: '16g',
    executorCores: 8,
    numExecutors: 2,
    enableRapids: true,
  },
  {
    id: 'ml-training',
    name: 'ML Model Training',
    description: 'Distributed machine learning training',
    mainClass: 'org.apache.spark.examples.ml.JavaRandomForestClassifierExample',
    appResource: '/opt/spark/examples/jars/spark-examples.jar',
    executorMemory: '32g',
    executorCores: 8,
    numExecutors: 2,
    enableRapids: true,
  },
  {
    id: 'custom',
    name: 'Custom Job',
    description: 'Configure all parameters manually',
    mainClass: '',
    appResource: '',
    executorMemory: '8g',
    executorCores: 4,
    numExecutors: 2,
    enableRapids: true,
  },
];

// Active jobs will be fetched from the API

const StatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, string> = {
    RUNNING: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    SUBMITTED: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    FINISHED: "bg-green-500/10 text-green-400 border-green-500/20",
    FAILED: "bg-red-500/10 text-red-400 border-red-500/20",
    KILLED: "bg-gray-500/10 text-gray-400 border-gray-500/20",
    UNKNOWN: "bg-gray-500/10 text-gray-400 border-gray-500/20",
  };
  
  return (
    <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border", styles[status] || styles.UNKNOWN)}>
      {status}
    </span>
  );
};

// Job Submission Form Component
function JobSubmissionForm({ onClose }: { onClose: () => void }) {
  const [selectedTemplate, setSelectedTemplate] = useState('custom');
  const [formData, setFormData] = useState({
    appName: '',
    mainClass: '',
    appResource: '',
    appArgs: '',
    executorMemory: '8g',
    executorCores: 4,
    numExecutors: 2,
    driverMemory: '4g',
    driverCores: 2,
    enableRapids: true,
    rapidsPoolSize: '2G',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitJob = trpc.spark.submitJob.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success("Job submitted successfully", {
          description: `Submission ID: ${data.submissionId}`,
        });
        onClose();
      } else {
        toast.error("Job submission failed", {
          description: data.message,
        });
      }
      setIsSubmitting(false);
    },
    onError: (error) => {
      toast.error("Failed to submit job", {
        description: error.message,
      });
      setIsSubmitting(false);
    },
  });

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = jobTemplates.find(t => t.id === templateId);
    if (template && templateId !== 'custom') {
      setFormData({
        ...formData,
        appName: template.name,
        mainClass: template.mainClass,
        appResource: template.appResource,
        executorMemory: template.executorMemory,
        executorCores: template.executorCores,
        numExecutors: template.numExecutors,
        enableRapids: template.enableRapids,
      });
    }
  };

  const handleSubmit = () => {
    if (!formData.appName || !formData.mainClass || !formData.appResource) {
      toast.error("Missing required fields", {
        description: "Please fill in Application Name, Main Class, and Application Resource.",
      });
      return;
    }

    setIsSubmitting(true);
    submitJob.mutate({
      appName: formData.appName,
      mainClass: formData.mainClass,
      appResource: formData.appResource,
      appArgs: formData.appArgs ? formData.appArgs.split(' ').filter(Boolean) : undefined,
      executorMemory: formData.executorMemory,
      executorCores: formData.executorCores,
      numExecutors: formData.numExecutors,
      driverMemory: formData.driverMemory,
      driverCores: formData.driverCores,
      enableRapids: formData.enableRapids,
      rapidsPoolSize: formData.rapidsPoolSize,
    });
  };

  return (
    <div className="space-y-6">
      {/* Template Selection */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Job Template</label>
        <div className="grid grid-cols-2 gap-3">
          {jobTemplates.map((template) => (
            <button
              key={template.id}
              onClick={() => handleTemplateChange(template.id)}
              className={cn(
                "p-3 rounded-lg border text-left transition-all",
                selectedTemplate === template.id
                  ? "bg-primary/10 border-primary/50 ring-1 ring-primary/30"
                  : "bg-white/5 border-white/10 hover:bg-white/10"
              )}
            >
              <div className="font-medium text-sm">{template.name}</div>
              <div className="text-xs text-muted-foreground mt-1">{template.description}</div>
            </button>
          ))}
        </div>
      </div>

      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="bg-white/5 border border-white/10 p-1">
          <TabsTrigger value="basic" className="data-[state=active]:bg-primary data-[state=active]:text-white text-xs">
            <FileCode className="h-3 w-3 mr-1" /> Basic
          </TabsTrigger>
          <TabsTrigger value="resources" className="data-[state=active]:bg-primary data-[state=active]:text-white text-xs">
            <Cpu className="h-3 w-3 mr-1" /> Resources
          </TabsTrigger>
          <TabsTrigger value="rapids" className="data-[state=active]:bg-primary data-[state=active]:text-white text-xs">
            <Zap className="h-3 w-3 mr-1" /> RAPIDS
          </TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="mt-4 space-y-4">
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
              placeholder="org.apache.spark.examples.SparkPi"
              className="bg-black/20 border-white/10 font-mono text-xs"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Application Resource (JAR/Python) *</label>
            <Input
              value={formData.appResource}
              onChange={(e) => setFormData({ ...formData, appResource: e.target.value })}
              placeholder="/opt/spark/examples/jars/spark-examples.jar"
              className="bg-black/20 border-white/10 font-mono text-xs"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Application Arguments</label>
            <Input
              value={formData.appArgs}
              onChange={(e) => setFormData({ ...formData, appArgs: e.target.value })}
              placeholder="arg1 arg2 arg3"
              className="bg-black/20 border-white/10"
            />
            <p className="text-[10px] text-muted-foreground">Space-separated arguments</p>
          </div>
        </TabsContent>

        <TabsContent value="resources" className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
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
                  <SelectItem value="64g">64 GB</SelectItem>
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
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Number of Executors</label>
            <Select value={String(formData.numExecutors)} onValueChange={(v) => setFormData({ ...formData, numExecutors: parseInt(v) })}>
              <SelectTrigger className="bg-black/20 border-white/10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 Executor</SelectItem>
                <SelectItem value="2">2 Executors</SelectItem>
                <SelectItem value="4">4 Executors</SelectItem>
                <SelectItem value="6">6 Executors</SelectItem>
                <SelectItem value="8">8 Executors</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Driver Memory</label>
              <Select value={formData.driverMemory} onValueChange={(v) => setFormData({ ...formData, driverMemory: v })}>
                <SelectTrigger className="bg-black/20 border-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2g">2 GB</SelectItem>
                  <SelectItem value="4g">4 GB</SelectItem>
                  <SelectItem value="8g">8 GB</SelectItem>
                  <SelectItem value="16g">16 GB</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Driver Cores</label>
              <Select value={String(formData.driverCores)} onValueChange={(v) => setFormData({ ...formData, driverCores: parseInt(v) })}>
                <SelectTrigger className="bg-black/20 border-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Core</SelectItem>
                  <SelectItem value="2">2 Cores</SelectItem>
                  <SelectItem value="4">4 Cores</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="rapids" className="mt-4 space-y-4">
          <div className="p-4 rounded-lg bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Zap className="h-5 w-5 text-green-400" />
                <div>
                  <div className="font-medium text-sm">RAPIDS GPU Acceleration</div>
                  <div className="text-xs text-muted-foreground">Enable NVIDIA RAPIDS for GPU-accelerated Spark operations</div>
                </div>
              </div>
              <Switch
                checked={formData.enableRapids}
                onCheckedChange={(checked) => setFormData({ ...formData, enableRapids: checked })}
              />
            </div>
          </div>

          {formData.enableRapids && (
            <div className="space-y-4 p-4 rounded-lg bg-white/5 border border-white/10">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Pinned Memory Pool Size</label>
                <Select value={formData.rapidsPoolSize} onValueChange={(v) => setFormData({ ...formData, rapidsPoolSize: v })}>
                  <SelectTrigger className="bg-black/20 border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1G">1 GB</SelectItem>
                    <SelectItem value="2G">2 GB</SelectItem>
                    <SelectItem value="4G">4 GB</SelectItem>
                    <SelectItem value="8G">8 GB</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground">Memory allocated for GPU data transfers</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="p-3 rounded bg-black/20">
                  <div className="text-muted-foreground">GPU per Executor</div>
                  <div className="font-mono font-bold text-green-400">1</div>
                </div>
                <div className="p-3 rounded bg-black/20">
                  <div className="text-muted-foreground">GPU per Task</div>
                  <div className="font-mono font-bold text-green-400">0.5</div>
                </div>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <DialogFooter className="gap-2">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button 
          onClick={handleSubmit} 
          disabled={isSubmitting}
          className="bg-primary hover:bg-primary/90"
        >
          {isSubmitting ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Rocket className="h-4 w-4 mr-2" />
          )}
          Submit Job
        </Button>
      </DialogFooter>
    </div>
  );
}

export default function SparkPage() {
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);
  
  // Use WebSocket for real-time job status updates
  const { jobUpdates, isConnected } = useWebSocketContext();

  // Fetch active applications from Spark API (reduced polling when WebSocket connected)
  const applicationsQuery = trpc.spark.getApplications.useQuery(undefined, {
    refetchInterval: isConnected ? 10000 : 5000, // Slower polling when WebSocket provides updates
  });

  // Map API data to activeJobs format
  const activeJobs = React.useMemo(() => {
    const apps = applicationsQuery.data || [];
    return apps.map((app, index) => {
      const latestAttempt = app.attempts?.[0];
      const duration = latestAttempt?.duration || 0;
      return {
        id: app.id || `job-${Date.now()}-${index}`,
        submissionId: app.id || `driver-${Date.now()}-${index}`,
        name: app.name || 'Unknown Application',
        user: latestAttempt?.sparkUser || 'unknown',
        status: latestAttempt?.completed ? 'FINISHED' : 'RUNNING',
        duration: duration ? `${Math.floor(duration / 60000)}m ${Math.floor((duration % 60000) / 1000)}s` : '-',
        stages: '-/-',
        tasks: '-/-',
        rapids: false,
        gpuUtil: 0,
      };
    });
  }, [applicationsQuery.data]);

  // Fetch job history from API (refetch when WebSocket reports job updates)
  const jobHistoryQuery = trpc.spark.getJobHistory.useQuery(
    { limit: 20, status: 'all' },
    { refetchInterval: isConnected ? 30000 : 10000 } // Slower polling, WebSocket triggers updates
  );

  // Refetch job history when WebSocket reports a job status change
  React.useEffect(() => {
    if (jobUpdates.length > 0 && isConnected) {
      jobHistoryQuery.refetch();
    }
  }, [jobUpdates, isConnected]);

  // Fetch cluster resources
  const clusterResourcesQuery = trpc.spark.getClusterResources.useQuery(undefined, {
    refetchInterval: 5000,
  });

  const killJobMutation = trpc.spark.killJob.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success("Job killed successfully");
      } else {
        toast.error("Failed to kill job", { description: data.message });
      }
    },
  });

  const handleKillJob = (submissionId: string) => {
    killJobMutation.mutate({ submissionId });
  };

  const resources = clusterResourcesQuery.data || {
    totalCores: 40,
    usedCores: 24,
    totalMemory: '256 GB',
    usedMemory: '142 GB',
    workers: 2,
    activeApplications: 3,
    gpusAvailable: 2,
    gpusInUse: 2,
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight">Spark Engine</h1>
          <p className="text-muted-foreground">RAPIDS Accelerator for Apache Spark Monitoring</p>
        </div>
        <Dialog open={isSubmitDialogOpen} onOpenChange={setIsSubmitDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" /> Submit New Job
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-[#0a0a0f] border-white/10">
            <DialogHeader>
              <DialogTitle className="font-display text-xl">Submit Spark Job</DialogTitle>
              <DialogDescription>
                Configure and submit a new Spark job to the cluster
              </DialogDescription>
            </DialogHeader>
            <JobSubmissionForm onClose={() => setIsSubmitDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Top Metrics - Expands on ultrawide */}
      <div className="grid grid-cols-1 md:grid-cols-4 grid-cols-ultrawide-4 grid-cols-superwide-6 grid-cols-megawide-8 gap-4 2xl:gap-6">
        <GlassCard className="flex items-center gap-4">
          <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
            <Zap className="h-6 w-6 text-primary" />
          </div>
          <div>
            <div className="text-sm text-muted-foreground">RAPIDS Status</div>
            <div className="text-xl font-display font-bold text-green-400">Enabled</div>
            <div className="text-xs text-muted-foreground">Plugin v24.10</div>
          </div>
        </GlassCard>
        
        <GlassCard className="flex items-center gap-4">
          <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
            <Layers className="h-6 w-6 text-purple-400" />
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Active Executors</div>
            <div className="text-xl font-display font-bold">{resources.usedCores} / {resources.totalCores}</div>
            <div className="text-xs text-muted-foreground">{resources.workers} Workers</div>
          </div>
        </GlassCard>

        <GlassCard className="flex items-center gap-4">
          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <HardDrive className="h-6 w-6 text-blue-400" />
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Memory Used</div>
            <div className="text-xl font-display font-bold">{resources.usedMemory}</div>
            <div className="text-xs text-muted-foreground">of {resources.totalMemory}</div>
          </div>
        </GlassCard>

        <GlassCard className="flex items-center gap-4">
          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
            <Cpu className="h-6 w-6 text-green-400" />
          </div>
          <div>
            <div className="text-sm text-muted-foreground">GPUs in Use</div>
            <div className="text-xl font-display font-bold">{resources.gpusInUse} / {resources.gpusAvailable}</div>
            <div className="text-xs text-muted-foreground">RAPIDS Active</div>
          </div>
        </GlassCard>
      </div>

      {/* Active Jobs Table */}
      <GlassCard className="overflow-hidden" noPadding>
        <div className="p-6 border-b border-white/10 flex justify-between items-center">
          <h2 className="text-lg font-display font-bold flex items-center gap-2">
            <Play className="h-4 w-4 text-primary" /> Active Jobs
          </h2>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-muted-foreground">
              {resources.activeApplications} Running
            </span>
            <Button variant="ghost" size="sm" className="h-7 text-xs">
              <RefreshCw className="h-3 w-3 mr-1" /> Refresh
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-white/5">
              <tr>
                <th className="px-6 py-3">Job ID</th>
                <th className="px-6 py-3">Application Name</th>
                <th className="px-6 py-3">User</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Duration</th>
                <th className="px-6 py-3">Progress</th>
                <th className="px-6 py-3">GPU</th>
                <th className="px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {activeJobs.map((job) => (
                <tr key={job.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 font-mono text-xs">{job.id}</td>
                  <td className="px-6 py-4 font-medium">{job.name}</td>
                  <td className="px-6 py-4 text-muted-foreground">{job.user}</td>
                  <td className="px-6 py-4"><StatusBadge status={job.status} /></td>
                  <td className="px-6 py-4 font-mono">{job.duration}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1 min-w-[100px]">
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>Stages: {job.stages}</span>
                        <span>Tasks: {job.tasks}</span>
                      </div>
                      <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary transition-all" 
                          style={{ width: job.status === 'SUBMITTED' ? '0%' : '75%' }} 
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {job.rapids ? (
                      <div className="flex items-center gap-1 text-green-400 text-xs font-bold">
                        <Zap className="h-3 w-3" /> {job.gpuUtil}%
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 text-muted-foreground hover:text-red-400"
                        onClick={() => handleKillJob(job.submissionId)}
                        disabled={job.status !== 'RUNNING'}
                      >
                        <StopCircle className="h-4 w-4" />
                      </Button>
                      <Link href={`/spark/job/${job.id}`}>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7 text-muted-foreground hover:text-primary"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
              {activeJobs.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-muted-foreground">
                    No active jobs. Click "Submit New Job" to start one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* Job History and Executor Distribution - Expands on ultrawide */}
      <div className="grid grid-cols-1 lg:grid-cols-2 grid-cols-ultrawide-4 grid-cols-superwide-4 gap-6 2xl:gap-8">
        <GlassCard>
          <h2 className="text-lg font-display font-bold mb-4 flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" /> Job History
          </h2>
          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {(jobHistoryQuery.data || []).map((job: { id: string; submissionId: string; appName: string; status: string; enableRapids: boolean; completedAt?: string; submittedAt: string }) => (
              <Link key={job.id} href={`/spark/job/${job.id}`}>
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  {job.status === 'FINISHED' ? (
                    <CheckCircle2 className="h-5 w-5 text-green-400" />
                  ) : job.status === 'FAILED' ? (
                    <XCircle className="h-5 w-5 text-red-400" />
                  ) : job.status === 'KILLED' ? (
                    <StopCircle className="h-5 w-5 text-gray-400" />
                  ) : (
                    <RefreshCw className="h-5 w-5 text-blue-400 animate-spin" />
                  )}
                  <div>
                    <div className="font-medium text-sm">{job.appName}</div>
                    <div className="text-xs text-muted-foreground font-mono">{job.submissionId.slice(0, 20)}...</div>
                  </div>
                </div>
                <div className="text-right">
                  <StatusBadge status={job.status} />
                  <div className="text-xs text-muted-foreground mt-1 flex items-center justify-end gap-1">
                    {job.enableRapids && <Zap className="h-3 w-3 text-green-400" />}
                    <Timer className="h-3 w-3" /> 
                    {job.completedAt 
                      ? new Date(job.completedAt).toLocaleTimeString() 
                      : new Date(job.submittedAt).toLocaleTimeString()}
                  </div>
                </div>
              </div>
              </Link>
            ))}
            {(!jobHistoryQuery.data || jobHistoryQuery.data.length === 0) && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No job history yet
              </div>
            )}
          </div>
        </GlassCard>

        <GlassCard>
          <h2 className="text-lg font-display font-bold mb-4">Executor Distribution</h2>
          <div className="space-y-4">
            {/* Node 1 */}
            <div className="p-4 rounded-lg bg-white/5 border border-white/10">
              <div className="flex items-center justify-between mb-3">
                <div className="font-medium text-sm">DGX-SPARK-01</div>
                <span className="text-xs text-green-400">6 Executors</span>
              </div>
              <div className="grid grid-cols-6 gap-1">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div 
                    key={i} 
                    className={cn(
                      "h-8 rounded flex items-center justify-center text-[10px] font-mono",
                      i < 5 ? "bg-primary/30 border border-primary/50 text-primary" : "bg-white/5 border border-white/10 text-muted-foreground"
                    )}
                  >
                    E{i + 1}
                  </div>
                ))}
              </div>
            </div>

            {/* Node 2 */}
            <div className="p-4 rounded-lg bg-white/5 border border-white/10">
              <div className="flex items-center justify-between mb-3">
                <div className="font-medium text-sm">DGX-SPARK-02</div>
                <span className="text-xs text-green-400">6 Executors</span>
              </div>
              <div className="grid grid-cols-6 gap-1">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div 
                    key={i} 
                    className={cn(
                      "h-8 rounded flex items-center justify-center text-[10px] font-mono",
                      i < 4 ? "bg-purple-500/30 border border-purple-500/50 text-purple-400" : "bg-white/5 border border-white/10 text-muted-foreground"
                    )}
                  >
                    E{i + 7}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground pt-2">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded bg-primary/30 border border-primary/50" />
                <span>Job 1</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded bg-purple-500/30 border border-purple-500/50" />
                <span>Job 2</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded bg-white/5 border border-white/10" />
                <span>Idle</span>
              </div>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Job Scheduler Section */}
      <GlassCard>
        <JobScheduler />
      </GlassCard>

      {/* Cost Estimator Section */}
      <GlassCard>
        <CostEstimator />
      </GlassCard>
    </div>
  );
}
