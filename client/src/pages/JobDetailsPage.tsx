import React, { useState, useEffect } from "react";
import { useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  ExternalLink
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

// Mock job details
const mockJobDetails: JobDetails = {
  id: 'job-001',
  name: 'Customer Analytics ETL',
  status: 'running',
  submittedAt: '2024-12-18T10:30:00Z',
  startedAt: '2024-12-18T10:30:15Z',
  duration: 1845,
  progress: 67,
  user: 'admin',
  appId: 'app-20241218103000-0001',
  mainClass: 'com.company.analytics.CustomerETL',
  appResource: '/opt/spark/jobs/customer-etl.jar',
  config: {
    executorMemory: '16g',
    executorCores: 8,
    numExecutors: 4,
    driverMemory: '8g',
    driverCores: 4,
    enableRapids: true,
  },
  stages: [
    { id: 0, name: 'Read Source Data', status: 'completed', tasks: { completed: 100, total: 100 }, inputSize: '24.5 GB', outputSize: '24.5 GB', duration: 245, shuffleRead: '0 B', shuffleWrite: '8.2 GB' },
    { id: 1, name: 'Filter & Transform', status: 'completed', tasks: { completed: 100, total: 100 }, inputSize: '8.2 GB', outputSize: '6.8 GB', duration: 312, shuffleRead: '8.2 GB', shuffleWrite: '6.8 GB' },
    { id: 2, name: 'Aggregate Metrics', status: 'running', tasks: { completed: 67, total: 100 }, inputSize: '6.8 GB', outputSize: '2.1 GB', duration: 456, shuffleRead: '6.8 GB', shuffleWrite: '2.1 GB' },
    { id: 3, name: 'Join Reference Data', status: 'pending', tasks: { completed: 0, total: 50 }, inputSize: '0 B', outputSize: '0 B', duration: 0, shuffleRead: '0 B', shuffleWrite: '0 B' },
    { id: 4, name: 'Write Output', status: 'pending', tasks: { completed: 0, total: 25 }, inputSize: '0 B', outputSize: '0 B', duration: 0, shuffleRead: '0 B', shuffleWrite: '0 B' },
  ],
  tasks: [
    { id: 450, stageId: 2, executor: 'executor-1', status: 'completed', duration: 234, gcTime: 12, inputSize: '68 MB', outputSize: '21 MB' },
    { id: 451, stageId: 2, executor: 'executor-2', status: 'completed', duration: 256, gcTime: 8, inputSize: '68 MB', outputSize: '22 MB' },
    { id: 452, stageId: 2, executor: 'executor-3', status: 'running', duration: 189, gcTime: 5, inputSize: '68 MB', outputSize: '0 B' },
    { id: 453, stageId: 2, executor: 'executor-4', status: 'running', duration: 145, gcTime: 3, inputSize: '68 MB', outputSize: '0 B' },
  ],
  metrics: {
    inputBytes: 26319749120,
    outputBytes: 2254857830,
    shuffleReadBytes: 15032385536,
    shuffleWriteBytes: 17179869184,
    peakMemory: 58720256000,
    cpuTime: 7320,
    gpuTime: 4560,
  },
};

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
  const jobId = params.id || 'job-001';
  const [job, setJob] = useState<JobDetails>(mockJobDetails);
  const [activeTab, setActiveTab] = useState('overview');

  // Simulate progress updates
  useEffect(() => {
    if (job.status !== 'running') return;

    const interval = setInterval(() => {
      setJob(prev => ({
        ...prev,
        progress: Math.min(prev.progress + 1, 100),
        duration: prev.duration + 1,
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, [job.status]);

  const handleCancel = () => {
    toast.success("Job cancellation requested");
    setJob(prev => ({ ...prev, status: 'failed' }));
  };

  const handleRestart = () => {
    toast.success("Job restart requested");
    setJob(prev => ({ ...prev, status: 'running', progress: 0, duration: 0 }));
  };

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
            <Button variant="destructive" size="sm" onClick={handleCancel}>
              <Square className="h-4 w-4 mr-1" /> Cancel
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
            <span>Stage 3 of 5: Aggregate Metrics</span>
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
            <Activity className="h-3 w-3" /> Output
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
          <div className="text-xl font-display font-bold text-green-400">{formatDuration(job.metrics.gpuTime)}</div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white/5 border border-white/10">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="stages">Stages</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
          <TabsTrigger value="cost">Cost Analysis</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Job Configuration */}
            <div className="p-4 rounded-lg bg-white/5 border border-white/10 space-y-4">
              <h3 className="font-medium flex items-center gap-2">
                <Cpu className="h-4 w-4 text-muted-foreground" />
                Job Configuration
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Main Class</span>
                  <span className="font-mono text-xs">{job.mainClass}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Application Resource</span>
                  <span className="font-mono text-xs">{job.appResource}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Executor Memory</span>
                  <span>{job.config.executorMemory}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Executor Cores</span>
                  <span>{job.config.executorCores}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Num Executors</span>
                  <span>{job.config.numExecutors}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Driver Memory</span>
                  <span>{job.config.driverMemory}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">RAPIDS Enabled</span>
                  <span className={job.config.enableRapids ? "text-green-400" : "text-muted-foreground"}>
                    {job.config.enableRapids ? "Yes" : "No"}
                  </span>
                </div>
              </div>
            </div>

            {/* Resource Metrics */}
            <div className="p-4 rounded-lg bg-white/5 border border-white/10 space-y-4">
              <h3 className="font-medium flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                Resource Metrics
              </h3>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Shuffle Read</span>
                    <span>{formatBytes(job.metrics.shuffleReadBytes)}</span>
                  </div>
                  <Progress value={60} className="h-1.5" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Shuffle Write</span>
                    <span>{formatBytes(job.metrics.shuffleWriteBytes)}</span>
                  </div>
                  <Progress value={75} className="h-1.5" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Peak Memory</span>
                    <span>{formatBytes(job.metrics.peakMemory)}</span>
                  </div>
                  <Progress value={85} className="h-1.5" />
                </div>
              </div>
            </div>
          </div>

          {/* Stage Timeline */}
          <div className="p-4 rounded-lg bg-white/5 border border-white/10">
            <h3 className="font-medium mb-4 flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-muted-foreground" />
              Stage Timeline
            </h3>
            <div className="space-y-2">
              {job.stages.map((stage, index) => (
                <div key={stage.id} className="flex items-center gap-4">
                  <div className="w-8 text-center">
                    <StageStatusIcon status={stage.status} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Stage {stage.id}: {stage.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {stage.tasks.completed}/{stage.tasks.total} tasks
                      </span>
                    </div>
                    <Progress 
                      value={(stage.tasks.completed / stage.tasks.total) * 100} 
                      className="h-1.5 mt-1"
                    />
                  </div>
                  <div className="w-20 text-right text-xs text-muted-foreground">
                    {stage.duration > 0 ? formatDuration(stage.duration) : '-'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Stages Tab */}
        <TabsContent value="stages" className="space-y-4">
          <div className="rounded-lg border border-white/10 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-white/5">
                <tr>
                  <th className="text-left p-3 font-medium">Stage</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">Tasks</th>
                  <th className="text-left p-3 font-medium">Input</th>
                  <th className="text-left p-3 font-medium">Output</th>
                  <th className="text-left p-3 font-medium">Shuffle R/W</th>
                  <th className="text-left p-3 font-medium">Duration</th>
                </tr>
              </thead>
              <tbody>
                {job.stages.map(stage => (
                  <tr key={stage.id} className="border-t border-white/5 hover:bg-white/5">
                    <td className="p-3">
                      <div className="font-medium">{stage.name}</div>
                      <div className="text-xs text-muted-foreground">Stage {stage.id}</div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <StageStatusIcon status={stage.status} />
                        <span className="capitalize">{stage.status}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="font-mono">{stage.tasks.completed}/{stage.tasks.total}</div>
                      <Progress 
                        value={(stage.tasks.completed / stage.tasks.total) * 100} 
                        className="h-1 mt-1 w-16"
                      />
                    </td>
                    <td className="p-3 font-mono text-xs">{stage.inputSize}</td>
                    <td className="p-3 font-mono text-xs">{stage.outputSize}</td>
                    <td className="p-3 font-mono text-xs">
                      <div>{stage.shuffleRead}</div>
                      <div className="text-muted-foreground">{stage.shuffleWrite}</div>
                    </td>
                    <td className="p-3 font-mono">{stage.duration > 0 ? formatDuration(stage.duration) : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* Tasks Tab */}
        <TabsContent value="tasks" className="space-y-4">
          <div className="rounded-lg border border-white/10 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-white/5">
                <tr>
                  <th className="text-left p-3 font-medium">Task ID</th>
                  <th className="text-left p-3 font-medium">Stage</th>
                  <th className="text-left p-3 font-medium">Executor</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">Duration</th>
                  <th className="text-left p-3 font-medium">GC Time</th>
                  <th className="text-left p-3 font-medium">Input</th>
                  <th className="text-left p-3 font-medium">Output</th>
                </tr>
              </thead>
              <tbody>
                {job.tasks.map(task => (
                  <tr key={task.id} className="border-t border-white/5 hover:bg-white/5">
                    <td className="p-3 font-mono">{task.id}</td>
                    <td className="p-3">{task.stageId}</td>
                    <td className="p-3 font-mono text-xs">{task.executor}</td>
                    <td className="p-3">
                      <span className={cn(
                        "px-2 py-0.5 rounded text-xs",
                        task.status === 'completed' && "bg-green-500/10 text-green-400",
                        task.status === 'running' && "bg-blue-500/10 text-blue-400",
                        task.status === 'failed' && "bg-red-500/10 text-red-400"
                      )}>
                        {task.status}
                      </span>
                    </td>
                    <td className="p-3 font-mono">{task.duration}ms</td>
                    <td className="p-3 font-mono text-muted-foreground">{task.gcTime}ms</td>
                    <td className="p-3 font-mono text-xs">{task.inputSize}</td>
                    <td className="p-3 font-mono text-xs">{task.outputSize}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs">
          <JobLogsViewer 
            jobId={job.id} 
            jobName={job.name} 
            isRunning={job.status === 'running'} 
          />
        </TabsContent>

        {/* Cost Tab */}
        <TabsContent value="cost">
          <CostEstimator 
            initialConfig={{
              ...job.config,
              estimatedDuration: Math.ceil(job.duration / 60),
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
