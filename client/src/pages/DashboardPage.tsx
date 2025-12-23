import React, { useState, useEffect } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { trpc } from "@/lib/trpc";
import { useWebSocketContext } from "@/contexts/WebSocketContext";
import { 
  Activity, 
  Cpu, 
  HardDrive, 
  Server, 
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  BrainCircuit,
  Thermometer,
  Gauge,
  MemoryStick,
  MonitorDot,
  Wifi,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";

// Stat Card Component
const StatCard = ({ title, value, subValue, icon: Icon, trend, trendValue, isLoading }: {
  title: string;
  value: string;
  subValue?: string;
  icon: any;
  trend?: "up" | "down";
  trendValue?: string;
  isLoading?: boolean;
}) => (
  <GlassCard className="flex flex-col justify-between h-full">
    <div className="flex justify-between items-start mb-4">
      <div className="p-2 rounded-lg bg-white/5 border border-white/10">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      {trendValue && trend && (
        <div className={cn(
          "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full border",
          trend === "up" 
            ? "text-green-400 border-green-400/20 bg-green-400/10" 
            : "text-red-400 border-red-400/20 bg-red-400/10"
        )}>
          {trend === "up" ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          {trendValue}
        </div>
      )}
    </div>
    <div>
      <h3 className="text-muted-foreground text-sm font-medium mb-1">{title}</h3>
      {isLoading ? (
        <div className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="text-muted-foreground">Loading...</span>
        </div>
      ) : (
        <>
          <div className="text-2xl font-display font-bold tracking-wide">{value}</div>
          {subValue && <div className="text-xs text-muted-foreground mt-1">{subValue}</div>}
        </>
      )}
    </div>
  </GlassCard>
);

// System Status Banner
const SystemStatus = ({ hostname, uptime, status, isLoading }: { 
  hostname: string; 
  uptime: string; 
  status: string;
  isLoading?: boolean;
}) => (
  <GlassCard className="relative overflow-hidden">
    <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-transparent" />
    <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
      <div className="flex items-center gap-4">
        <div className="relative">
          {isLoading ? (
            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
          ) : (
            <>
              <div className={cn(
                "h-3 w-3 rounded-full animate-ping absolute inset-0",
                status === "operational" ? "bg-green-500" : status === "degraded" ? "bg-yellow-500" : "bg-red-500"
              )} />
              <div className={cn(
                "h-3 w-3 rounded-full relative",
                status === "operational" ? "bg-green-500 shadow-[0_0_10px_#22c55e]" : 
                status === "degraded" ? "bg-yellow-500 shadow-[0_0_10px_#eab308]" : 
                "bg-red-500 shadow-[0_0_10px_#ef4444]"
              )} />
            </>
          )}
        </div>
        <div>
          <h2 className="text-lg font-display font-bold">
            DGX Spark: {status === "operational" ? "Operational" : status === "degraded" ? "Degraded" : "Offline"}
          </h2>
          <p className="text-sm text-muted-foreground font-mono">{hostname}</p>
        </div>
      </div>
      
      <div className="flex gap-8 text-sm">
        <div className="flex flex-col items-center md:items-end">
          <span className="text-muted-foreground">Uptime</span>
          <span className="font-mono font-bold text-lg">{uptime}</span>
        </div>
        <div className="flex flex-col items-center md:items-end">
          <span className="text-muted-foreground">OS</span>
          <span className="font-mono font-bold text-lg">Ubuntu 22.04</span>
        </div>
        <div className="flex flex-col items-center md:items-end">
          <span className="text-muted-foreground">CUDA</span>
          <span className="font-mono font-bold text-lg">12.4</span>
        </div>
      </div>
    </div>
  </GlassCard>
);

// GB10 Superchip Visualization
const GB10SuperchipCard = ({ gpuUtil, gpuTemp, gpuPower, memUsed, memTotal, isLoading }: {
  gpuUtil: number;
  gpuTemp: number;
  gpuPower: number;
  memUsed: number;
  memTotal: number;
  isLoading?: boolean;
}) => (
  <GlassCard className="relative overflow-hidden">
    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
    <h3 className="font-display font-bold text-lg mb-4 flex items-center gap-2">
      <Cpu className="h-5 w-5 text-primary" />
      NVIDIA GB10 Superchip
      {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground ml-2" />}
    </h3>
    
    <div className="grid grid-cols-2 gap-4 mb-6">
      {/* CPU Cores */}
      <div className="p-4 rounded-lg bg-white/5 border border-white/10">
        <div className="text-xs text-muted-foreground mb-2">ARM CPU Cores</div>
        <div className="grid grid-cols-5 gap-1">
          {/* Performance Cores - Cortex-X925 */}
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={`perf-${i}`} className="h-4 w-4 rounded bg-blue-500/80 border border-blue-400/50" title="Cortex-X925" />
          ))}
          {/* Efficiency Cores - Cortex-A725 */}
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={`eff-${i}`} className="h-4 w-4 rounded bg-cyan-500/60 border border-cyan-400/50" title="Cortex-A725" />
          ))}
        </div>
        <div className="flex gap-4 mt-2 text-[10px]">
          <span className="flex items-center gap-1"><span className="h-2 w-2 bg-blue-500 rounded" /> 10x X925</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 bg-cyan-500 rounded" /> 10x A725</span>
        </div>
      </div>
      
      {/* Blackwell GPU */}
      <div className="p-4 rounded-lg bg-white/5 border border-white/10">
        <div className="text-xs text-muted-foreground mb-2">Blackwell GPU</div>
        <div className="flex items-center justify-center h-16">
          <div className="relative">
            <div className="h-12 w-20 rounded-lg bg-gradient-to-br from-primary/40 to-primary/20 border border-primary/50 flex items-center justify-center">
              <span className="text-xs font-bold text-primary">GPU</span>
            </div>
            <div className={cn(
              "absolute -top-1 -right-1 h-3 w-3 rounded-full",
              gpuUtil > 0 ? "bg-green-500 animate-pulse" : "bg-gray-500"
            )} />
          </div>
        </div>
        <div className="text-center text-[10px] text-muted-foreground mt-1">1000 AI TOPS</div>
      </div>
    </div>

    {/* Metrics */}
    <div className="space-y-4">
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground flex items-center gap-1"><Gauge className="h-3 w-3" /> GPU Utilization</span>
          <span className="font-mono text-primary">{gpuUtil.toFixed(1)}%</span>
        </div>
        <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-primary to-orange-500 transition-all duration-500" 
            style={{ width: `${gpuUtil}%` }}
          />
        </div>
      </div>
      
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground flex items-center gap-1"><Thermometer className="h-3 w-3" /> Temperature</span>
          <span className={cn("font-mono", gpuTemp > 80 ? "text-red-400" : gpuTemp > 65 ? "text-yellow-400" : "text-green-400")}>
            {gpuTemp.toFixed(0)}°C
          </span>
        </div>
        <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
          <div 
            className={cn(
              "h-full transition-all duration-500",
              gpuTemp > 80 ? "bg-red-500" : gpuTemp > 65 ? "bg-yellow-500" : "bg-green-500"
            )}
            style={{ width: `${(gpuTemp / 100) * 100}%` }}
          />
        </div>
      </div>
      
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground flex items-center gap-1"><Zap className="h-3 w-3" /> Power Draw</span>
          <span className="font-mono">{gpuPower.toFixed(0)}W / 100W</span>
        </div>
        <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
          <div 
            className="h-full bg-purple-500 transition-all duration-500" 
            style={{ width: `${gpuPower}%` }}
          />
        </div>
      </div>
      
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground flex items-center gap-1"><MemoryStick className="h-3 w-3" /> Unified Memory (LPDDR5x)</span>
          <span className="font-mono">{memUsed.toFixed(0)}GB / {memTotal}GB</span>
        </div>
        <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
          <div 
            className="h-full bg-blue-500 transition-all duration-500" 
            style={{ width: `${(memUsed / memTotal) * 100}%` }}
          />
        </div>
      </div>
    </div>
  </GlassCard>
);

// Quick Actions Card
const QuickActionsCard = () => (
  <GlassCard>
    <h3 className="font-display font-bold text-lg mb-4">Quick Actions</h3>
    <div className="grid grid-cols-2 gap-3">
      {[
        { label: "New Spark Job", icon: Activity, href: "/spark" },
        { label: "Model Inference", icon: BrainCircuit, href: "/inference" },
        { label: "View Logs", icon: MonitorDot, href: "/logs" },
        { label: "Network Stats", icon: Wifi, href: "/network" },
      ].map((action) => (
        <a
          key={action.label}
          href={action.href}
          className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-primary/30 transition-all group"
        >
          <action.icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
          <span className="text-sm">{action.label}</span>
        </a>
      ))}
    </div>
  </GlassCard>
);

// Recent Activity Card - Now connected to Spark job history
const RecentActivityCard = () => {
  const jobHistory = trpc.spark.getJobHistory.useQuery({ limit: 5, status: 'all' }, {
    refetchInterval: 10000,
  });

  const activities = jobHistory.data?.map(job => ({
    type: "job",
    message: `Spark job '${job.appName}' ${job.status.toLowerCase()}`,
    time: new Date(job.submittedAt).toLocaleTimeString(),
    status: job.status === 'FINISHED' ? 'success' : 
            job.status === 'FAILED' ? 'error' : 
            job.status === 'RUNNING' ? 'info' : 'warning'
  })) || [];

  return (
    <GlassCard>
      <h3 className="font-display font-bold text-lg mb-4">Recent Activity</h3>
      <div className="space-y-3">
        {jobHistory.isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No recent activity</p>
          </div>
        ) : (
          activities.map((activity, i) => (
            <div key={i} className="flex gap-3 items-start p-3 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
              <div className={cn(
                "mt-1 h-2 w-2 rounded-full shrink-0",
                activity.status === "success" ? "bg-green-500" :
                activity.status === "warning" ? "bg-yellow-500" :
                activity.status === "error" ? "bg-red-500" : "bg-blue-500"
              )} />
              <div className="flex-1 min-w-0">
                <div className="text-sm truncate">{activity.message}</div>
                <div className="text-[10px] font-mono text-muted-foreground mt-1">{activity.time}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </GlassCard>
  );
};

// Storage Card - Now connected to local API
const StorageCard = () => {
  const storageQuery = trpc.local.getStorage.useQuery(undefined, {
    refetchInterval: 30000,
  });

  const device = storageQuery.data?.devices[0];
  const usedTB = device ? device.used / (1024 * 1024 * 1024 * 1024) : 0;
  const totalTB = device ? device.total / (1024 * 1024 * 1024 * 1024) : 2;
  const percentage = device ? (device.used / device.total) * 100 : 0;

  return (
    <GlassCard>
      <h3 className="font-display font-bold text-lg mb-4 flex items-center gap-2">
        <HardDrive className="h-5 w-5 text-primary" />
        Storage
        {storageQuery.isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground ml-2" />}
      </h3>
      <div className="space-y-4">
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">NVMe SSD</span>
            <span className="font-mono">{usedTB.toFixed(1)} / {totalTB.toFixed(1)} TB</span>
          </div>
          <div className="h-3 w-full bg-white/10 rounded-full overflow-hidden">
            <div 
              className={cn(
                "h-full transition-all duration-500",
                percentage > 90 ? "bg-red-500" : percentage > 75 ? "bg-yellow-500" : "bg-primary"
              )}
              style={{ width: `${percentage}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>{percentage.toFixed(1)}% used</span>
            <span>{(totalTB - usedTB).toFixed(1)} TB free</span>
          </div>
        </div>
        
        <div className="pt-4 border-t border-white/10">
          <div className="text-xs text-muted-foreground mb-2">Performance</div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Read Speed</span>
              <div className="font-mono font-bold">7.0 GB/s</div>
            </div>
            <div>
              <span className="text-muted-foreground">Write Speed</span>
              <div className="font-mono font-bold">6.5 GB/s</div>
            </div>
          </div>
        </div>
      </div>
    </GlassCard>
  );
};

// Cluster Overview Card - Extra panel for ultrawide displays
const ClusterOverviewCard = ({ clusterResources, isLoading }: { 
  clusterResources: { totalCores: number; usedCores: number; totalMemory: string; usedMemory: string; workers: number; activeApplications: number; gpusAvailable: number; gpusInUse: number } | undefined;
  isLoading: boolean;
}) => (
  <GlassCard>
    <h3 className="font-display font-bold text-lg mb-4 flex items-center gap-2">
      <Server className="h-5 w-5 text-primary" />
      Cluster Resources
      {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground ml-2" />}
    </h3>
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="p-3 rounded-lg bg-white/5 border border-white/10">
          <div className="text-xs text-muted-foreground">CPU Cores</div>
          <div className="text-xl font-mono font-bold">{clusterResources?.usedCores ?? 0}/{clusterResources?.totalCores ?? 0}</div>
        </div>
        <div className="p-3 rounded-lg bg-white/5 border border-white/10">
          <div className="text-xs text-muted-foreground">Workers</div>
          <div className="text-xl font-mono font-bold">{clusterResources?.workers ?? 0}</div>
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Memory Usage</span>
          <span className="font-mono">{clusterResources?.usedMemory ?? '0 GB'} / {clusterResources?.totalMemory ?? '0 GB'}</span>
        </div>
        <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-primary transition-all duration-500" style={{ width: '55%' }} />
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">GPUs Available</span>
          <span className="font-mono">{clusterResources?.gpusInUse ?? 0} / {clusterResources?.gpusAvailable ?? 0} in use</span>
        </div>
        <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-green-500 transition-all duration-500" style={{ width: `${((clusterResources?.gpusInUse ?? 0) / (clusterResources?.gpusAvailable ?? 1)) * 100}%` }} />
        </div>
      </div>
    </div>
  </GlassCard>
);

// Format uptime from seconds
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${days}d ${hours}h ${minutes}m`;
}

export default function DashboardPage() {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Use WebSocket for real-time GPU metrics
  const { gpuMetrics, systemMetrics, isConnected, status } = useWebSocketContext();

  // Fetch initial data and fallback from backend (only when WebSocket not connected)
  const overviewQuery = trpc.local.getOverview.useQuery(undefined, {
    refetchInterval: isConnected ? false : 5000, // Only poll if WebSocket disconnected
    enabled: !isConnected || !gpuMetrics, // Disable when WebSocket is providing data
  });

  const clusterResourcesQuery = trpc.spark.getClusterResources.useQuery(undefined, {
    refetchInterval: 5000,
  });

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Extract metrics - prefer WebSocket data, fallback to API data
  const overview = overviewQuery.data;
  const clusterResources = clusterResourcesQuery.data;
  
  // Use WebSocket data if available, otherwise fall back to API data
  const gpuUtil = gpuMetrics?.utilization ?? overview?.gpu.utilization ?? 0;
  const gpuTemp = gpuMetrics?.temperature ?? overview?.gpu.temperature ?? 0;
  const gpuPower = gpuMetrics?.powerDraw ?? overview?.gpu.powerDraw ?? 0;
  const memUsedGB = systemMetrics?.memory.used 
    ? systemMetrics.memory.used / (1024 * 1024 * 1024) 
    : overview?.memory.used 
      ? overview.memory.used / (1024 * 1024 * 1024) 
      : 0;
  const memTotalGB = systemMetrics?.memory.total 
    ? systemMetrics.memory.total / (1024 * 1024 * 1024) 
    : overview?.memory.total 
      ? overview.memory.total / (1024 * 1024 * 1024) 
      : 128;
  const uptime = overview?.uptime ?? "Loading...";
  const hostname = overview?.hostname ?? "dgx-spark-local";
  const systemStatus = overview?.status ?? "operational";
  
  // Show WebSocket connection status indicator
  const wsStatusColor = isConnected ? 'bg-green-500' : status === 'connecting' ? 'bg-yellow-500' : 'bg-red-500';;

  return (
    <div className="space-y-6 pb-10">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight">DGX Spark Command Center</h1>
          <p className="text-muted-foreground mt-1">Local system monitoring and management</p>
        </div>
        <div className="flex items-center gap-2 text-sm font-mono bg-black/40 border border-white/10 px-3 py-1.5 rounded-lg text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>{currentTime.toLocaleTimeString()}</span>
        </div>
      </div>

      {/* System Status Banner */}
      <SystemStatus 
        hostname={hostname} 
        uptime={uptime} 
        status={systemStatus}
        isLoading={overviewQuery.isLoading && !isConnected}
      />

      {/* Stats Grid - Expands on ultrawide */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 grid-cols-ultrawide-4 grid-cols-superwide-6 grid-cols-megawide-8 gap-4 2xl:gap-6">
        <StatCard 
          title="GPU Compute" 
          value="1000 TOPS" 
          subValue="Blackwell Architecture"
          icon={Zap} 
          trend="up" 
          trendValue={gpuUtil > 0 ? "Active" : "Idle"} 
          isLoading={overviewQuery.isLoading && !isConnected}
        />
        <StatCard 
          title="Active Workloads" 
          value={`${clusterResources?.activeApplications ?? 0} Running`}
          subValue={`${clusterResources?.gpusInUse ?? 0} using GPU`}
          icon={Activity} 
          trend="up" 
          trendValue={clusterResources?.activeApplications ? `${clusterResources.activeApplications} Active` : undefined}
          isLoading={clusterResourcesQuery.isLoading}
        />
        <StatCard 
          title="Unified Memory" 
          value={`${Math.round(memUsedGB)} GB`}
          subValue={`${Math.round((memUsedGB / memTotalGB) * 100)}% of ${Math.round(memTotalGB)}GB LPDDR5x`}
          icon={MemoryStick} 
          isLoading={overviewQuery.isLoading}
        />
        <StatCard 
          title="GPU Temperature" 
          value={`${gpuTemp.toFixed(0)}°C`}
          subValue={gpuTemp > 80 ? "High - Check cooling" : gpuTemp > 65 ? "Warm" : "Normal"}
          icon={Thermometer} 
          trend={gpuTemp > 65 ? "up" : "down"}
          trendValue={gpuTemp > 80 ? "Warning" : gpuTemp > 65 ? "Elevated" : "OK"}
          isLoading={overviewQuery.isLoading && !isConnected}
        />
      </div>

      {/* Main Content Grid - Expands on ultrawide */}
      <div className="grid grid-cols-1 lg:grid-cols-3 grid-cols-ultrawide-4 grid-cols-superwide-5 grid-cols-megawide-6 gap-6 2xl:gap-8">
        {/* GB10 Superchip - Takes 2 columns, more on ultrawide */}
        <div className="lg:col-span-2 [&]:[@media(min-width:1920px)]:col-span-2 [&]:[@media(min-width:2560px)]:col-span-3 [&]:[@media(min-width:3440px)]:col-span-3">
          <GB10SuperchipCard 
            gpuUtil={gpuUtil}
            gpuTemp={gpuTemp}
            gpuPower={gpuPower}
            memUsed={memUsedGB}
            memTotal={Math.round(memTotalGB)}
            isLoading={overviewQuery.isLoading && !isConnected}
          />
        </div>

        {/* Quick Actions */}
        <QuickActionsCard />

        {/* Recent Activity - Takes more columns on ultrawide */}
        <div className="lg:col-span-2 [&]:[@media(min-width:1920px)]:col-span-2 [&]:[@media(min-width:2560px)]:col-span-2 [&]:[@media(min-width:3440px)]:col-span-3">
          <RecentActivityCard />
        </div>

        {/* Storage */}
        <StorageCard />

        {/* Additional panels for ultrawide - show cluster overview */}
        <div className="hidden [@media(min-width:2560px)]:block">
          <ClusterOverviewCard clusterResources={clusterResources} isLoading={clusterResourcesQuery.isLoading} />
        </div>
      </div>
    </div>
  );
}
