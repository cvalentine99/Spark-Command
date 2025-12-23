import React, { useState, useEffect } from "react";
import { GlassCard } from "@/components/ui/glass-card";
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
  Fan,
  Gauge,
  MemoryStick,
  MonitorDot,
  Wifi
} from "lucide-react";
import { cn } from "@/lib/utils";

// Stat Card Component
const StatCard = ({ title, value, subValue, icon: Icon, trend, trendValue }: {
  title: string;
  value: string;
  subValue?: string;
  icon: any;
  trend?: "up" | "down";
  trendValue?: string;
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
      <div className="text-2xl font-display font-bold tracking-wide">{value}</div>
      {subValue && <div className="text-xs text-muted-foreground mt-1">{subValue}</div>}
    </div>
  </GlassCard>
);

// System Status Banner
const SystemStatus = ({ hostname, uptime, status }: { hostname: string; uptime: string; status: string }) => (
  <GlassCard className="relative overflow-hidden">
    <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-transparent" />
    <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
      <div className="flex items-center gap-4">
        <div className="relative">
          <div className={cn(
            "h-3 w-3 rounded-full animate-ping absolute inset-0",
            status === "online" ? "bg-green-500" : "bg-red-500"
          )} />
          <div className={cn(
            "h-3 w-3 rounded-full relative",
            status === "online" ? "bg-green-500 shadow-[0_0_10px_#22c55e]" : "bg-red-500 shadow-[0_0_10px_#ef4444]"
          )} />
        </div>
        <div>
          <h2 className="text-lg font-display font-bold">DGX Spark: {status === "online" ? "Operational" : "Offline"}</h2>
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
const GB10SuperchipCard = ({ gpuUtil, gpuTemp, gpuPower, memUsed, memTotal }: {
  gpuUtil: number;
  gpuTemp: number;
  gpuPower: number;
  memUsed: number;
  memTotal: number;
}) => (
  <GlassCard className="relative overflow-hidden">
    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
    <h3 className="font-display font-bold text-lg mb-4 flex items-center gap-2">
      <Cpu className="h-5 w-5 text-primary" />
      NVIDIA GB10 Superchip
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
            <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-green-500 animate-pulse" />
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
          <span className="font-mono text-primary">{gpuUtil}%</span>
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
            {gpuTemp}°C
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
          <span className="font-mono">{gpuPower}W / 100W</span>
        </div>
        <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
          <div 
            className="h-full bg-purple-500 transition-all duration-500" 
            style={{ width: `${(gpuPower / 100) * 100}%` }}
          />
        </div>
      </div>
      
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground flex items-center gap-1"><MemoryStick className="h-3 w-3" /> Unified Memory (LPDDR5x)</span>
          <span className="font-mono">{memUsed}GB / {memTotal}GB</span>
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
        { label: "View Logs", icon: MonitorDot, href: "/support" },
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

// Recent Activity Card
const RecentActivityCard = () => (
  <GlassCard>
    <h3 className="font-display font-bold text-lg mb-4">Recent Activity</h3>
    <div className="space-y-3">
      {[
        { type: "job", message: "Spark job 'etl-pipeline-daily' completed", time: "2 mins ago", status: "success" },
        { type: "inference", message: "Llama-3.1-8B model loaded", time: "15 mins ago", status: "info" },
        { type: "alert", message: "GPU temperature normalized", time: "1 hour ago", status: "warning" },
        { type: "system", message: "System update applied", time: "3 hours ago", status: "info" },
      ].map((activity, i) => (
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
      ))}
    </div>
  </GlassCard>
);

// Storage Card
const StorageCard = () => (
  <GlassCard>
    <h3 className="font-display font-bold text-lg mb-4 flex items-center gap-2">
      <HardDrive className="h-5 w-5 text-primary" />
      Storage
    </h3>
    <div className="space-y-4">
      <div>
        <div className="flex justify-between text-xs mb-1">
          <span className="text-muted-foreground">NVMe SSD</span>
          <span className="font-mono">1.2TB / 2TB</span>
        </div>
        <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-green-500 to-emerald-500 w-[60%]" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 text-xs">
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
  </GlassCard>
);

export default function DashboardPage() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [metrics, setMetrics] = useState({
    gpuUtil: 72,
    gpuTemp: 58,
    gpuPower: 65,
    memUsed: 78,
    memTotal: 128,
    uptime: "14d 2h 15m"
  });

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Simulate metric updates
  useEffect(() => {
    const timer = setInterval(() => {
      setMetrics(prev => ({
        ...prev,
        gpuUtil: Math.min(100, Math.max(0, prev.gpuUtil + (Math.random() - 0.5) * 10)),
        gpuTemp: Math.min(85, Math.max(45, prev.gpuTemp + (Math.random() - 0.5) * 3)),
        gpuPower: Math.min(100, Math.max(30, prev.gpuPower + (Math.random() - 0.5) * 8)),
        memUsed: Math.min(128, Math.max(20, prev.memUsed + (Math.random() - 0.5) * 5)),
      }));
    }, 3000);
    return () => clearInterval(timer);
  }, []);

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
        hostname="dgx-spark-local" 
        uptime={metrics.uptime} 
        status="online" 
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="GPU Compute" 
          value="1000 TOPS" 
          subValue="Blackwell Architecture"
          icon={Zap} 
          trend="up" 
          trendValue="Active" 
        />
        <StatCard 
          title="Active Workloads" 
          value="3 Running" 
          subValue="2 Spark, 1 Inference"
          icon={Activity} 
          trend="up" 
          trendValue="2 Queued" 
        />
        <StatCard 
          title="Unified Memory" 
          value={`${Math.round(metrics.memUsed)} GB`}
          subValue={`${Math.round((metrics.memUsed / metrics.memTotal) * 100)}% of 128GB LPDDR5x`}
          icon={MemoryStick} 
        />
        <StatCard 
          title="Inference Throughput" 
          value="215 RPS" 
          subValue="Llama-3.1-8B"
          icon={BrainCircuit} 
          trend="up" 
          trendValue="+8%" 
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* GB10 Superchip - Takes 2 columns */}
        <div className="lg:col-span-2">
          <GB10SuperchipCard 
            gpuUtil={Math.round(metrics.gpuUtil)}
            gpuTemp={Math.round(metrics.gpuTemp)}
            gpuPower={Math.round(metrics.gpuPower)}
            memUsed={Math.round(metrics.memUsed)}
            memTotal={metrics.memTotal}
          />
        </div>

        {/* Quick Actions */}
        <QuickActionsCard />

        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <RecentActivityCard />
        </div>

        {/* Storage */}
        <StorageCard />
      </div>
    </div>
  );
}
