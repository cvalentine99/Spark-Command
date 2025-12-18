import React from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { 
  Zap, 
  Clock, 
  Database, 
  Layers, 
  Play, 
  CheckCircle2, 
  AlertCircle,
  Timer
} from "lucide-react";
import { cn } from "@/lib/utils";

// Mock Data for Spark Jobs
const activeJobs = [
  {
    id: "job-20241218-001",
    name: "ETL_LargeScale_Processing",
    user: "data_scientist_01",
    status: "running",
    duration: "45m 12s",
    stages: "12/15",
    tasks: "450/600",
    rapids: true,
    gpuUtil: 85
  },
  {
    id: "job-20241218-002",
    name: "Training_Data_Prep_V2",
    user: "ml_engineer_03",
    status: "running",
    duration: "12m 05s",
    stages: "2/8",
    tasks: "120/800",
    rapids: true,
    gpuUtil: 92
  },
  {
    id: "job-20241218-003",
    name: "Log_Analysis_Hourly",
    user: "system_admin",
    status: "pending",
    duration: "-",
    stages: "0/5",
    tasks: "0/200",
    rapids: false,
    gpuUtil: 0
  }
];

const completedJobs = [
  {
    id: "job-20241217-998",
    name: "Daily_Aggregation",
    status: "success",
    duration: "1h 20m",
    rapids: true
  },
  {
    id: "job-20241217-999",
    name: "Anomaly_Detection_Batch",
    status: "failed",
    duration: "5m 30s",
    rapids: true
  }
];

const StatusBadge = ({ status }: { status: string }) => {
  const styles = {
    running: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    pending: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    success: "bg-green-500/10 text-green-400 border-green-500/20",
    failed: "bg-red-500/10 text-red-400 border-red-500/20"
  };
  
  return (
    <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border", styles[status as keyof typeof styles])}>
      {status}
    </span>
  );
};

export default function SparkPage() {
  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-display font-bold tracking-tight">Spark Engine</h1>
        <p className="text-muted-foreground">RAPIDS Accelerator for Apache Spark Monitoring</p>
      </div>

      {/* Top Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <GlassCard className="flex items-center gap-4">
          <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
            <Zap className="h-6 w-6 text-primary" />
          </div>
          <div>
            <div className="text-sm text-muted-foreground">RAPIDS Acceleration</div>
            <div className="text-2xl font-display font-bold">Enabled</div>
            <div className="text-xs text-green-400">Plugin Active v24.10</div>
          </div>
        </GlassCard>
        
        <GlassCard className="flex items-center gap-4">
          <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
            <Layers className="h-6 w-6 text-purple-400" />
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Active Executors</div>
            <div className="text-2xl font-display font-bold">12 / 16</div>
            <div className="text-xs text-muted-foreground">4 Idle</div>
          </div>
        </GlassCard>

        <GlassCard className="flex items-center gap-4">
          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <Database className="h-6 w-6 text-blue-400" />
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Shuffle Data</div>
            <div className="text-2xl font-display font-bold">4.2 TB</div>
            <div className="text-xs text-muted-foreground">Last 24h</div>
          </div>
        </GlassCard>
      </div>

      {/* Active Jobs Table */}
      <GlassCard className="overflow-hidden" noPadding>
        <div className="p-6 border-b border-white/10 flex justify-between items-center">
          <h2 className="text-lg font-display font-bold flex items-center gap-2">
            <Play className="h-4 w-4 text-primary" /> Active Jobs
          </h2>
          <span className="text-xs font-mono text-muted-foreground">Refreshing in 5s...</span>
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
                          className="h-full bg-primary" 
                          style={{ width: job.status === 'pending' ? '0%' : '75%' }} 
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* Recent History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard>
          <h2 className="text-lg font-display font-bold mb-4 flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" /> Recent History
          </h2>
          <div className="space-y-3">
            {completedJobs.map((job) => (
              <div key={job.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
                <div className="flex items-center gap-3">
                  {job.status === 'success' ? (
                    <CheckCircle2 className="h-5 w-5 text-green-400" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-400" />
                  )}
                  <div>
                    <div className="font-medium text-sm">{job.name}</div>
                    <div className="text-xs text-muted-foreground font-mono">{job.id}</div>
                  </div>
                </div>
                <div className="text-right">
                  <StatusBadge status={job.status} />
                  <div className="text-xs text-muted-foreground mt-1 flex items-center justify-end gap-1">
                    <Timer className="h-3 w-3" /> {job.duration}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard>
          <h2 className="text-lg font-display font-bold mb-4">Executor Distribution</h2>
          <div className="h-[200px] flex items-center justify-center border border-dashed border-white/10 rounded-lg bg-black/20">
            <p className="text-muted-foreground text-sm">Executor Resource Map Placeholder</p>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
