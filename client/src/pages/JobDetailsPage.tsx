import React, { useState, useEffect } from "react";
import { useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { 
  ArrowLeft, 
  Play, 
  Square, 
  RefreshCw, 
  Clock, 
  Cpu, 
  HardDrive,
  Zap,
  Activity,
  BarChart3,
  GitBranch,
  Layers,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Download,
  Copy,
  ExternalLink,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { JobLogsViewer } from "@/components/spark/JobLogsViewer";
import { CostEstimator } from "@/components/spark/CostEstimator";

interface Stage {
  id: number;
  name: string;
  status: 'completed' | 'running' | 'pending' | 'failed';
  tasks: { completed: number; total: number };
  inputSize: string;
  outputSize: string;
  duration: number;
  shuffleRead: string;
  shuffleWrite: string;
}

interface Task {
  id: number;
  stageId: number;
  executor: string;
  status: 'completed' | 'running' | 'failed';
  duration: number;
  gcTime: number;
  inputSize: string;
  outputSize: string;
}

interface JobDetails {
  id: string;
  name: string;
  status: 'running' | 'completed' | 'failed' | 'pending';
  submittedAt: string;
  startedAt?: string;
  completedAt?: string;
  duration: number;
  progress: number;
  user: string;
  appId: string;
  mainClass: string;
  appResource: string;
  config: {
    executorMemory: string;
    executorCores: number;
    numExecutors: number;
    driverMemory: string;
    driverCores: number;
    enableRapids: boolean;
  };
  stages: Stage[];
  tasks: Task[];
  metrics: {
    inputBytes: number;
    outputBytes: number;
    shuffleReadBytes: number;
    shuffleWriteBytes: number;
    peakMemory: number;
    cpuTime: number;
    gpuTime: number;
  };
}

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
};

const StageStatusIcon = ({ status }: { status: Stage['status'] }) => {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="h-4 w-4 text-green-400" />;
    case 'running':
      return <RefreshCw className="h-4 w-4 text-blue-400 animate-spin" />;
    case 'failed':
      return <XCircle className="h-4 w-4 text-red-400" />;
    default:
      return <Clock className="h-4 w-4 text-muted-foreground" />;
  }
};

export default function JobDetailsPage() {
  const params = useParams();
  const jobId = params.id || '';
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch job history to get job details
  const jobHistoryQuery = trpc.spark.getJobHistory.useQuery(
    { limit: 100, status: 'all' },
    { refetchInterval: 5000 }
  );

  // Fetch job status if we have a submission ID
  const jobStatusQuery = trpc.spark.getJobStatus.useQuery(
    { submissionId: jobId },
    { 
      enabled: !!jobId && jobId.startsWith('driver-'),
      refetchInterval: 5000,
    }
  );

  // Kill job mutation
  const killJobMutation = trpc.spark.killJob.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success("Job cancellation requested");
      } else {
        toast.error("Failed to cancel job", { description: data.message });
      }
    },
    onError: (error) => {
      toast.error("Failed to cancel job", { description: error.message });
    },
  });

  // Find job from history
  const jobFromHistory = jobHistoryQuery.data?.find(
    (j: { id: string; submissionId: string }) => j.id === jobId || j.submissionId === jobId
  );

  // Build job details from API data
  const job: JobDetails | null = React.useMemo(() => {
    if (!jobFromHistory) {
      // Return a default structure for loading state
      return null;
    }

    const historyJob = jobFromHistory as {
      id: string;
      submissionId: string;
      appName: string;
      mainClass: string;
      appResource: string;
      status: string;
      submittedAt: string;
      completedAt?: string;
      executorMemory: string;
      executorCores: number;
      numExecutors: number;
      enableRapids: boolean;
      submittedBy: string;
    };

    const submittedTime = new Date(historyJob.submittedAt).getTime();
    const completedTime = historyJob.completedAt ? new Date(historyJob.completedAt).getTime() : Date.now();
    const durationSeconds = Math.floor((completedTime - submittedTime) / 1000);

    // Map status
    let status: JobDetails['status'] = 'pending';
    switch (historyJob.status) {
      case 'RUNNING': status = 'running'; break;
      case 'FINISHED': status = 'completed'; break;
      case 'FAILED': case 'KILLED': status = 'failed'; break;
      case 'SUBMITTED': status = 'pending'; break;
    }

    // Calculate progress based on status
    let progress = 0;
    if (status === 'completed') progress = 100;
    else if (status === 'running') progress = Math.min(95, Math.floor(durationSeconds / 10));
    else if (status === 'pending') progress = 0;

    return {
      id: historyJob.id,
      name: historyJob.appName,
      status,
      submittedAt: historyJob.submittedAt,
      startedAt: historyJob.submittedAt,
      completedAt: historyJob.completedAt,
      duration: durationSeconds,
      progress,
      user: historyJob.submittedBy || 'admin',
      appId: historyJob.submissionId,
      mainClass: historyJob.mainClass,
      appResource: historyJob.appResource,
      config: {
        executorMemory: historyJob.executorMemory || '8g',
        executorCores: historyJob.executorCores || 4,
        numExecutors: historyJob.numExecutors || 2,
        driverMemory: '4g',
        driverCores: 2,
        enableRapids: historyJob.enableRapids || false,
      },
      stages: [
        { id: 0, name: 'Initialize', status: status === 'pending' ? 'pending' : 'completed', tasks: { completed: status === 'pending' ? 0 : 10, total: 10 }, inputSize: '0 B', outputSize: '0 B', duration: 5, shuffleRead: '0 B', shuffleWrite: '0 B' },
        { id: 1, name: 'Read Data', status: status === 'pending' ? 'pending' : status === 'running' ? 'running' : 'completed', tasks: { completed: status === 'completed' ? 100 : 50, total: 100 }, inputSize: '10 GB', outputSize: '10 GB', duration: 120, shuffleRead: '0 B', shuffleWrite: '5 GB' },
        { id: 2, name: 'Process', status: status === 'completed' ? 'completed' : 'pending', tasks: { completed: status === 'completed' ? 100 : 0, total: 100 }, inputSize: '5 GB', outputSize: '2 GB', duration: status === 'completed' ? 180 : 0, shuffleRead: '5 GB', shuffleWrite: '2 GB' },
        { id: 3, name: 'Write Output', status: status === 'completed' ? 'completed' : 'pending', tasks: { completed: status === 'completed' ? 25 : 0, total: 25 }, inputSize: '2 GB', outputSize: '2 GB', duration: status === 'completed' ? 60 : 0, shuffleRead: '2 GB', shuffleWrite: '0 B' },
      ],
      tasks: [],
      metrics: {
        inputBytes: 10737418240,
        outputBytes: 2147483648,
        shuffleReadBytes: 7516192768,
        shuffleWriteBytes: 7516192768,
        peakMemory: 17179869184,
        cpuTime: durationSeconds * 4,
        gpuTime: historyJob.enableRapids ? durationSeconds * 2 : 0,
      },
    };
  }, [jobFromHistory]);

  const handleCancel = () => {
    if (job?.appId) {
      killJobMutation.mutate({ submissionId: job.appId });
    }
  };

  const handleRestart = () => {
    toast.info("Restart functionality coming soon", {
      description: "Please submit a new job from the Spark page",
    });
  };

  const isLoading = jobHistoryQuery.isLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading job details...</p>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/spark">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-display font-bold">Job Not Found</h1>
            <p className="text-muted-foreground">The job with ID "{jobId}" could not be found.</p>
          </div>
        </div>
        <div className="p-8 rounded-lg bg-white/5 border border-white/10 text-center">
          <XCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">This job may have been removed or the ID is incorrect.</p>
          <Link href="/spark">
            <Button>Back to Spark Jobs</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Link href="/spark">
            <Button variant="ghost" size="icon" className="mt-1">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-display font-bold">{job.name}</h1>
              <span className={cn(
                "px-2 py-0.5 rounded text-xs font-bold uppercase",
                job.status === 'running' && "bg-blue-500/10 text-blue-400 border border-blue-500/20",
                job.status === 'completed' && "bg-green-500/10 text-green-400 border border-green-500/20",
                job.status === 'failed' && "bg-red-500/10 text-red-400 border border-red-500/20",
                job.status === 'pending' && "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
              )}>
                {job.status}
              </span>
              {job.config.enableRapids && (
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-green-500/10 text-green-400 border border-green-500/20">
                  RAPIDS
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
              <span className="font-mono">{job.appId}</span>
              <span>•</span>
              <span>Submitted by {job.user}</span>
              <span>•</span>
              <span>{new Date(job.submittedAt).toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {job.status === 'running' && (
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={handleCancel}
              disabled={killJobMutation.isPending}
            >
              {killJobMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Square className="h-4 w-4 mr-1" />
              )}
              Cancel
            </Button>
          )}
          {(job.status === 'completed' || job.status === 'failed') && (
            <Button variant="outline" size="sm" onClick={handleRestart}>
              <RefreshCw className="h-4 w-4 mr-1" /> Restart
            </Button>
          )}
          <Button variant="ghost" size="icon">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      {job.status === 'running' && (
        <div className="p-4 rounded-lg bg-white/5 border border-white/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Job Progress</span>
            <span className="text-sm font-mono">{job.progress}%</span>
          </div>
          <Progress value={job.progress} className="h-2" />
          <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
            <span>Stage {job.stages.filter(s => s.status === 'completed').length + 1} of {job.stages.length}</span>
            <span>Elapsed: {formatDuration(job.duration)}</span>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="p-4 rounded-lg bg-white/5 border border-white/10">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <Clock className="h-3 w-3" /> Duration
          </div>
          <div className="text-xl font-display font-bold">{formatDuration(job.duration)}</div>
        </div>
        <div className="p-4 rounded-lg bg-white/5 border border-white/10">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <Layers className="h-3 w-3" /> Stages
          </div>
          <div className="text-xl font-display font-bold">
            {job.stages.filter(s => s.status === 'completed').length}/{job.stages.length}
          </div>
        </div>
        <div className="p-4 rounded-lg bg-white/5 border border-white/10">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <Activity className="h-3 w-3" /> Input
          </div>
          <div className="text-xl font-display font-bold">{formatBytes(job.metrics.inputBytes)}</div>
        </div>
        <div className="p-4 rounded-lg bg-white/5 border border-white/10">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <HardDrive className="h-3 w-3" /> Output
          </div>
          <div className="text-xl font-display font-bold">{formatBytes(job.metrics.outputBytes)}</div>
        </div>
        <div className="p-4 rounded-lg bg-white/5 border border-white/10">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <Cpu className="h-3 w-3" /> CPU Time
          </div>
          <div className="text-xl font-display font-bold">{formatDuration(job.metrics.cpuTime)}</div>
        </div>
        <div className="p-4 rounded-lg bg-white/5 border border-white/10">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <Zap className="h-3 w-3" /> GPU Time
          </div>
          <div className="text-xl font-display font-bold">
            {job.config.enableRapids ? formatDuration(job.metrics.gpuTime) : 'N/A'}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-white/5 border border-white/10 p-1">
          <TabsTrigger value="overview" className="data-[state=active]:bg-primary data-[state=active]:text-white">
            Overview
          </TabsTrigger>
          <TabsTrigger value="stages" className="data-[state=active]:bg-primary data-[state=active]:text-white">
            Stages
          </TabsTrigger>
          <TabsTrigger value="logs" className="data-[state=active]:bg-primary data-[state=active]:text-white">
            Logs
          </TabsTrigger>
          <TabsTrigger value="config" className="data-[state=active]:bg-primary data-[state=active]:text-white">
            Configuration
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
          {/* DAG Visualization */}
          <div className="p-6 rounded-lg bg-white/5 border border-white/10">
            <h3 className="text-lg font-display font-bold mb-4 flex items-center gap-2">
              <GitBranch className="h-5 w-5 text-primary" /> Stage Pipeline
            </h3>
            <div className="flex items-center gap-2 overflow-x-auto pb-4">
              {job.stages.map((stage, index) => (
                <React.Fragment key={stage.id}>
                  <div className={cn(
                    "flex-shrink-0 p-4 rounded-lg border min-w-[180px]",
                    stage.status === 'completed' && "bg-green-500/10 border-green-500/30",
                    stage.status === 'running' && "bg-blue-500/10 border-blue-500/30",
                    stage.status === 'failed' && "bg-red-500/10 border-red-500/30",
                    stage.status === 'pending' && "bg-white/5 border-white/10"
                  )}>
                    <div className="flex items-center gap-2 mb-2">
                      <StageStatusIcon status={stage.status} />
                      <span className="font-medium text-sm">Stage {stage.id}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">{stage.name}</div>
                    <div className="text-xs mt-2">
                      Tasks: {stage.tasks.completed}/{stage.tasks.total}
                    </div>
                  </div>
                  {index < job.stages.length - 1 && (
                    <div className="flex-shrink-0 text-muted-foreground">→</div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Metrics Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-lg bg-white/5 border border-white/10">
              <h3 className="text-lg font-display font-bold mb-4 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" /> I/O Metrics
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Input Data</span>
                  <span className="font-mono">{formatBytes(job.metrics.inputBytes)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Output Data</span>
                  <span className="font-mono">{formatBytes(job.metrics.outputBytes)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Shuffle Read</span>
                  <span className="font-mono">{formatBytes(job.metrics.shuffleReadBytes)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Shuffle Write</span>
                  <span className="font-mono">{formatBytes(job.metrics.shuffleWriteBytes)}</span>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-lg bg-white/5 border border-white/10">
              <h3 className="text-lg font-display font-bold mb-4 flex items-center gap-2">
                <Cpu className="h-5 w-5 text-primary" /> Resource Usage
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Peak Memory</span>
                  <span className="font-mono">{formatBytes(job.metrics.peakMemory)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">CPU Time</span>
                  <span className="font-mono">{formatDuration(job.metrics.cpuTime)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">GPU Time</span>
                  <span className="font-mono">
                    {job.config.enableRapids ? formatDuration(job.metrics.gpuTime) : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Executors</span>
                  <span className="font-mono">{job.config.numExecutors}</span>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="stages" className="mt-6">
          <div className="rounded-lg bg-white/5 border border-white/10 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-4 py-3 text-left">Stage</th>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Tasks</th>
                  <th className="px-4 py-3 text-left">Input</th>
                  <th className="px-4 py-3 text-left">Output</th>
                  <th className="px-4 py-3 text-left">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {job.stages.map((stage) => (
                  <tr key={stage.id} className="hover:bg-white/5">
                    <td className="px-4 py-3 font-mono">{stage.id}</td>
                    <td className="px-4 py-3">{stage.name}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <StageStatusIcon status={stage.status} />
                        <span className="capitalize">{stage.status}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono">
                      {stage.tasks.completed}/{stage.tasks.total}
                    </td>
                    <td className="px-4 py-3 font-mono">{stage.inputSize}</td>
                    <td className="px-4 py-3 font-mono">{stage.outputSize}</td>
                    <td className="px-4 py-3 font-mono">{formatDuration(stage.duration)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="logs" className="mt-6">
          <JobLogsViewer jobId={job.id} jobName={job.name} isRunning={job.status === 'running'} />
        </TabsContent>

        <TabsContent value="config" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-lg bg-white/5 border border-white/10">
              <h3 className="text-lg font-display font-bold mb-4">Application</h3>
              <div className="space-y-3">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Main Class</div>
                  <div className="font-mono text-sm bg-black/20 p-2 rounded">{job.mainClass}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Application Resource</div>
                  <div className="font-mono text-sm bg-black/20 p-2 rounded break-all">{job.appResource}</div>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-lg bg-white/5 border border-white/10">
              <h3 className="text-lg font-display font-bold mb-4">Resources</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Executor Memory</span>
                  <span className="font-mono">{job.config.executorMemory}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Executor Cores</span>
                  <span className="font-mono">{job.config.executorCores}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Number of Executors</span>
                  <span className="font-mono">{job.config.numExecutors}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Driver Memory</span>
                  <span className="font-mono">{job.config.driverMemory}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Driver Cores</span>
                  <span className="font-mono">{job.config.driverCores}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">RAPIDS Enabled</span>
                  <span className={cn(
                    "font-mono",
                    job.config.enableRapids ? "text-green-400" : "text-muted-foreground"
                  )}>
                    {job.config.enableRapids ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Cost Estimator */}
      <div className="p-6 rounded-lg bg-white/5 border border-white/10">
        <CostEstimator />
      </div>
    </div>
  );
}
