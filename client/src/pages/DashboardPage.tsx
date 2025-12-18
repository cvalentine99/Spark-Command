import React from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { 
  Activity, 
  Cpu, 
  Database, 
  HardDrive, 
  Server, 
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  BrainCircuit
} from "lucide-react";
import { cn } from "@/lib/utils";

// Mock Data Components
const StatCard = ({ title, value, change, icon: Icon, trend }: any) => (
  <GlassCard className="flex flex-col justify-between h-full">
    <div className="flex justify-between items-start mb-4">
      <div className="p-2 rounded-lg bg-white/5 border border-white/10">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      {change && (
        <div className={cn(
          "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full border",
          trend === "up" 
            ? "text-green-400 border-green-400/20 bg-green-400/10" 
            : "text-red-400 border-red-400/20 bg-red-400/10"
        )}>
          {trend === "up" ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          {change}
        </div>
      )}
    </div>
    <div>
      <h3 className="text-muted-foreground text-sm font-medium mb-1">{title}</h3>
      <div className="text-2xl font-display font-bold tracking-wide">{value}</div>
    </div>
  </GlassCard>
);

const ClusterHealth = () => (
  <GlassCard className="col-span-1 md:col-span-2 lg:col-span-3 relative overflow-hidden">
    <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-transparent" />
    <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
      <div className="flex items-center gap-4">
        <div className="relative">
          <div className="h-3 w-3 rounded-full bg-green-500 animate-ping absolute inset-0" />
          <div className="h-3 w-3 rounded-full bg-green-500 relative shadow-[0_0_10px_#22c55e]" />
        </div>
        <div>
          <h2 className="text-lg font-display font-bold">Cluster Status: Operational</h2>
          <p className="text-sm text-muted-foreground">All systems normal. Uptime: 14d 2h 15m</p>
        </div>
      </div>
      
      <div className="flex gap-8 text-sm">
        <div className="flex flex-col items-end">
          <span className="text-muted-foreground">Active Jobs</span>
          <span className="font-mono font-bold text-lg">12</span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-muted-foreground">GPU Load</span>
          <span className="font-mono font-bold text-lg text-primary">87%</span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-muted-foreground">Power Draw</span>
          <span className="font-mono font-bold text-lg">265W</span>
        </div>
      </div>
    </div>
  </GlassCard>
);

const NodeStatus = ({ name, ip, role, status }: any) => (
  <GlassCard noPadding className="flex flex-col">
    <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
      <div className="flex items-center gap-3">
        <Server className="h-5 w-5 text-muted-foreground" />
        <div>
          <h3 className="font-display font-bold">{name}</h3>
          <div className="text-xs font-mono text-muted-foreground">{ip}</div>
        </div>
      </div>
      <div className={cn(
        "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border",
        status === "online" ? "border-green-500/30 text-green-400 bg-green-500/10" : "border-red-500/30 text-red-400"
      )}>
        {status}
      </div>
    </div>
    <div className="p-4 space-y-4">
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">CPU Usage</span>
          <span className="font-mono">45%</span>
        </div>
        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-blue-500 w-[45%]" />
        </div>
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Memory (UMA)</span>
          <span className="font-mono">62GB / 128GB</span>
        </div>
        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-purple-500 w-[48%]" />
        </div>
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">GPU Util</span>
          <span className="font-mono text-primary">92%</span>
        </div>
        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-primary w-[92%] shadow-[0_0_10px_var(--primary)]" />
        </div>
      </div>
    </div>
  </GlassCard>
);

export default function DashboardPage() {
  return (
    <div className="space-y-6 pb-10">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight">Command Center</h1>
          <p className="text-muted-foreground mt-1">Real-time monitoring for DGX Spark Cluster</p>
        </div>
        <div className="flex items-center gap-2 text-sm font-mono bg-black/40 border border-white/10 px-3 py-1.5 rounded-lg text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>UTC 10:42:15</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Total GPU Compute" 
          value="1.8 PFLOPS" 
          icon={Zap} 
          change="+12%" 
          trend="up" 
        />
        <StatCard 
          title="Active Spark Jobs" 
          value="8 Running" 
          icon={Activity} 
          change="4 Queued" 
          trend="up" 
        />
        <StatCard 
          title="Memory Usage" 
          value="142 GB" 
          icon={HardDrive} 
          change="55% Total" 
          trend="up" 
        />
        <StatCard 
          title="Inference Req/s" 
          value="425 RPS" 
          icon={BrainCircuit} 
          change="+5%" 
          trend="up" 
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cluster Health - Full Width on Mobile, 2/3 on Desktop */}
        <ClusterHealth />

        {/* Node Status Cards */}
        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6">
          <NodeStatus 
            name="DGX-SPARK-01 (Master)" 
            ip="192.168.100.10" 
            role="Control Plane" 
            status="online" 
          />
          <NodeStatus 
            name="DGX-SPARK-02 (Worker)" 
            ip="192.168.100.11" 
            role="Worker" 
            status="online" 
          />
        </div>

        {/* Recent Activity / Logs Placeholder */}
        <GlassCard className="lg:col-span-2 min-h-[300px]">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-display font-bold text-lg">System Telemetry</h3>
            <div className="flex gap-2">
              <span className="h-2 w-2 rounded-full bg-primary" />
              <span className="h-2 w-2 rounded-full bg-purple-500" />
              <span className="h-2 w-2 rounded-full bg-blue-500" />
            </div>
          </div>
          <div className="h-[250px] w-full flex items-center justify-center border border-dashed border-white/10 rounded-lg bg-black/20">
            <p className="text-muted-foreground text-sm">Real-time Chart Visualization Placeholder</p>
          </div>
        </GlassCard>

        <GlassCard className="lg:col-span-1">
          <h3 className="font-display font-bold text-lg mb-4">Recent Alerts</h3>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3 items-start p-3 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-colors cursor-pointer">
                <div className="mt-1 h-2 w-2 rounded-full bg-orange-500 shrink-0" />
                <div>
                  <div className="text-sm font-medium">High Memory Pressure</div>
                  <div className="text-xs text-muted-foreground mt-1">Node-01 memory usage exceeded 90% threshold.</div>
                  <div className="text-[10px] font-mono text-muted-foreground mt-2 opacity-60">10 mins ago</div>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
