import React from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { trpc } from "@/lib/trpc";
import { 
  Cpu, 
  Thermometer, 
  Zap, 
  Activity, 
  Microchip, 
  Fan,
  Server,
  MemoryStick,
  HardDrive,
  Gauge,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";

// Telemetry Gauge Component
const TelemetryGauge = ({ label, value, unit, max, icon: Icon, colorClass, warning, critical, isLoading }: {
  label: string;
  value: number;
  unit: string;
  max: number;
  icon: any;
  colorClass: string;
  warning?: number;
  critical?: number;
  isLoading?: boolean;
}) => {
  const percentage = Math.min((value / max) * 100, 100);
  const isWarning = warning && value >= warning;
  const isCritical = critical && value >= critical;
  
  const barColor = isCritical ? "bg-red-500" : isWarning ? "bg-yellow-500" : colorClass;
  
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-center text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Icon className="h-4 w-4" />
          <span>{label}</span>
        </div>
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          <span className={cn(
            "font-mono font-bold",
            isCritical ? "text-red-400" : isWarning ? "text-yellow-400" : ""
          )}>
            {typeof value === 'number' ? value.toFixed(1) : value}<span className="text-xs text-muted-foreground ml-0.5">{unit}</span>
          </span>
        )}
      </div>
      <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
        <div 
          className={cn("h-full transition-all duration-500", barColor)} 
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

// GB10 Superchip Visualizer
const GB10Visualizer = ({ telemetry }: { telemetry: { cpuLoad: number; gpuUtil: number; gpuTemp: number; memoryUsed: number } }) => {
  return (
    <div className="relative h-64 w-full bg-black/40 rounded-xl border border-white/10 flex items-center justify-center overflow-hidden">
      {/* Background Glow */}
      <div className="absolute inset-0 opacity-30" 
           style={{ backgroundImage: 'radial-gradient(circle at center, var(--primary) 0%, transparent 60%)' }} 
      />
      
      {/* Main Chip Package */}
      <div className="relative z-10 flex flex-col items-center">
        {/* CPU Cores Visualization */}
        <div className="flex gap-4 mb-4">
          {/* Performance Cores */}
          <div className="flex flex-col items-center">
            <div className="text-[10px] text-muted-foreground mb-1">Cortex-X925</div>
            <div className="grid grid-cols-5 gap-1">
              {Array.from({ length: 10 }).map((_, i) => (
                <div 
                  key={`perf-${i}`} 
                  className={cn(
                    "h-3 w-3 rounded-sm border transition-all duration-300",
                    telemetry.cpuLoad > (i * 10) 
                      ? "bg-blue-500 border-blue-400 shadow-[0_0_5px_#3b82f6]" 
                      : "bg-blue-500/20 border-blue-500/30"
                  )}
                />
              ))}
            </div>
          </div>
          
          {/* Efficiency Cores */}
          <div className="flex flex-col items-center">
            <div className="text-[10px] text-muted-foreground mb-1">Cortex-A725</div>
            <div className="grid grid-cols-5 gap-1">
              {Array.from({ length: 10 }).map((_, i) => (
                <div 
                  key={`eff-${i}`} 
                  className={cn(
                    "h-3 w-3 rounded-sm border transition-all duration-300",
                    telemetry.cpuLoad > 50 && telemetry.cpuLoad > (50 + i * 5)
                      ? "bg-cyan-500 border-cyan-400 shadow-[0_0_5px_#06b6d4]" 
                      : "bg-cyan-500/20 border-cyan-500/30"
                  )}
                />
              ))}
            </div>
          </div>
        </div>

        {/* GPU Die */}
        <div className="relative w-40 h-24 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md rounded-lg border border-white/20 flex flex-col items-center justify-center shadow-[0_0_40px_-10px_var(--primary)]">
          <div className={cn(
            "absolute inset-0 rounded-lg transition-opacity duration-500",
            telemetry.gpuUtil > 80 ? "opacity-100" : "opacity-0"
          )} style={{ background: 'linear-gradient(45deg, transparent, rgba(255,107,0,0.1), transparent)' }} />
          
          <Microchip className={cn(
            "h-8 w-8 mb-1 transition-all duration-300",
            telemetry.gpuUtil > 90 ? "text-primary animate-pulse" : "text-muted-foreground"
          )} />
          <div className="text-sm font-display font-bold tracking-widest">BLACKWELL</div>
          <div className="text-[10px] text-muted-foreground">1000 AI TOPS</div>
          
          {/* Status Indicator */}
          <div className={cn(
            "absolute -top-2 -right-2 h-4 w-4 rounded-full border-2 border-black",
            telemetry.gpuUtil > 0 ? "bg-green-500 animate-pulse" : "bg-gray-500"
          )} />
        </div>

        {/* Temperature Badge */}
        <div className={cn(
          "mt-4 px-4 py-1.5 rounded-full text-xs font-mono border backdrop-blur-md flex items-center gap-2",
          telemetry.gpuTemp > 80 ? "bg-red-500/20 border-red-500/50 text-red-400" :
          telemetry.gpuTemp > 65 ? "bg-yellow-500/20 border-yellow-500/50 text-yellow-400" :
          "bg-green-500/20 border-green-500/50 text-green-400"
        )}>
          <Thermometer className="h-3 w-3" />
          {telemetry.gpuTemp.toFixed(0)}°C
        </div>
      </div>

      {/* Memory Modules (UMA) */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col gap-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <div 
            key={`mem-l-${i}`}
            className={cn(
              "w-2 h-8 rounded-sm border transition-all",
              telemetry.memoryUsed > (i * 32) 
                ? "bg-purple-500/60 border-purple-400/50" 
                : "bg-white/10 border-white/10"
            )}
          />
        ))}
      </div>
      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <div 
            key={`mem-r-${i}`}
            className={cn(
              "w-2 h-8 rounded-sm border transition-all",
              telemetry.memoryUsed > (i * 32) 
                ? "bg-purple-500/60 border-purple-400/50" 
                : "bg-white/10 border-white/10"
            )}
          />
        ))}
      </div>
    </div>
  );
};

// Process List Component - Now connected to API
const ProcessList = () => {
  const processesQuery = trpc.local.getProcesses.useQuery(undefined, {
    refetchInterval: 5000,
  });

  const processes = processesQuery.data?.processes || [];

  return (
    <GlassCard>
      <h3 className="font-display font-bold text-lg mb-4 flex items-center gap-2">
        <Activity className="h-5 w-5 text-primary" />
        Active Processes
        {processesQuery.isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground ml-2" />}
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-muted-foreground text-xs border-b border-white/10">
              <th className="text-left py-2 font-medium">Process</th>
              <th className="text-right py-2 font-medium">PID</th>
              <th className="text-right py-2 font-medium">CPU %</th>
              <th className="text-right py-2 font-medium">MEM GB</th>
              <th className="text-right py-2 font-medium">GPU %</th>
            </tr>
          </thead>
          <tbody>
            {processes.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-muted-foreground">
                  {processesQuery.isLoading ? "Loading processes..." : "No active processes"}
                </td>
              </tr>
            ) : (
              processes.map((proc) => (
                <tr key={proc.pid} className="border-b border-white/5 hover:bg-white/5">
                  <td className="py-2 font-mono text-xs">{proc.name}</td>
                  <td className="py-2 text-right font-mono text-xs text-muted-foreground">{proc.pid}</td>
                  <td className="py-2 text-right font-mono text-xs">{proc.cpu.toFixed(1)}%</td>
                  <td className="py-2 text-right font-mono text-xs">{proc.memory.toFixed(1)}</td>
                  <td className="py-2 text-right font-mono text-xs">
                    {proc.gpuMemory && proc.gpuMemory > 0 ? <span className="text-primary">{proc.gpuMemory}%</span> : "-"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
};

export default function NodesPage() {
  // Fetch real metrics from backend
  const metricsQuery = trpc.local.getMetrics.useQuery(undefined, {
    refetchInterval: 2000, // Refresh every 2 seconds
  });

  const systemInfoQuery = trpc.local.getSystemInfo.useQuery(undefined, {
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const healthQuery = trpc.local.health.useQuery(undefined, {
    refetchInterval: 5000,
  });

  const metrics = metricsQuery.data;
  const systemInfo = systemInfoQuery.data;
  const health = healthQuery.data;

  // Extract telemetry values
  const telemetry = {
    cpuLoad: metrics?.cpu.usage ?? 0,
    memoryUsed: metrics?.memory.used ? metrics.memory.used / (1024 * 1024 * 1024) : 0,
    gpuUtil: metrics?.gpu.utilization ?? 0,
    gpuTemp: metrics?.gpu.temperature ?? 0,
    gpuPower: metrics?.gpu.powerDraw ?? 0,
    fanSpeed: metrics?.gpu.fanSpeed ?? 0,
    nvmeUsed: metrics?.storage.devices?.[0] ? metrics.storage.devices[0].used / (1024 * 1024 * 1024 * 1024) : 0,
    nvmeTotal: metrics?.storage.devices?.[0] ? metrics.storage.devices[0].total / (1024 * 1024 * 1024 * 1024) : 2,
    networkRx: metrics?.network.interfaces[0]?.rxBytes ? metrics.network.interfaces[0].rxBytes / (1024 * 1024) : 0,
    networkTx: metrics?.network.interfaces[0]?.txBytes ? metrics.network.interfaces[0].txBytes / (1024 * 1024) : 0,
  };

  const isLoading = metricsQuery.isLoading;
  const isHealthy = health?.status === 'healthy';

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight">Hardware Telemetry</h1>
          <p className="text-muted-foreground">NVIDIA GB10 Superchip monitoring</p>
        </div>
        <div className="flex items-center gap-4">
          {isLoading ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 border border-white/20 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading...
            </div>
          ) : (
            <div className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm",
              isHealthy 
                ? "bg-green-500/10 border border-green-500/20 text-green-400"
                : "bg-yellow-500/10 border border-yellow-500/20 text-yellow-400"
            )}>
              <div className={cn(
                "h-2 w-2 rounded-full animate-pulse",
                isHealthy ? "bg-green-500" : "bg-yellow-500"
              )} />
              {isHealthy ? "System Online" : "System Warning"}
            </div>
          )}
        </div>
      </div>

      {/* System Info Banner */}
      <GlassCard className="flex flex-wrap gap-6 items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-lg bg-white/5 border border-white/10">
            <Server className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-display font-bold">DGX Spark</h2>
            <div className="text-sm text-muted-foreground font-mono">
              {systemInfo?.hostname ?? "dgx-spark-local"} • {metrics?.network.interfaces[0]?.ip ?? "127.0.0.1"}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-6 text-sm">
          <div className="flex flex-col">
            <span className="text-muted-foreground text-xs">CPU</span>
            <span className="font-mono">{systemInfo?.gpuName ?? "10x X925 + 10x A725"}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-muted-foreground text-xs">GPU</span>
            <span className="font-mono">{metrics?.gpu.name ?? "Blackwell (1000 TOPS)"}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-muted-foreground text-xs">Memory</span>
            <span className="font-mono">128GB LPDDR5x</span>
          </div>
          <div className="flex flex-col">
            <span className="text-muted-foreground text-xs">Uptime</span>
            <span className="font-mono">{systemInfo?.uptime ?? "Loading..."}</span>
          </div>
        </div>
      </GlassCard>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* GB10 Visualizer */}
        <GlassCard className="lg:row-span-2">
          <h3 className="font-display font-bold text-lg mb-4 flex items-center gap-2">
            <Microchip className="h-5 w-5 text-primary" />
            GB10 Superchip Status
            {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground ml-2" />}
          </h3>
          <GB10Visualizer telemetry={telemetry} />
          
          {/* Legend */}
          <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded-sm bg-blue-500" />
              <span>Performance Cores (X925)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded-sm bg-cyan-500" />
              <span>Efficiency Cores (A725)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded-sm bg-purple-500" />
              <span>Unified Memory</span>
            </div>
          </div>
        </GlassCard>

        {/* Telemetry Gauges */}
        <GlassCard>
          <h3 className="font-display font-bold text-lg mb-4 flex items-center gap-2">
            <Gauge className="h-5 w-5 text-primary" />
            Live Telemetry
          </h3>
          <div className="space-y-5">
            <TelemetryGauge 
              label="GPU Utilization" 
              value={telemetry.gpuUtil} 
              unit="%" 
              max={100} 
              icon={Zap} 
              colorClass="bg-primary shadow-[0_0_10px_var(--primary)]"
              isLoading={isLoading}
            />
            <TelemetryGauge 
              label="CPU Load" 
              value={telemetry.cpuLoad} 
              unit="%" 
              max={100} 
              icon={Cpu} 
              colorClass="bg-blue-500"
              warning={80}
              critical={95}
              isLoading={isLoading}
            />
            <TelemetryGauge 
              label="Unified Memory" 
              value={telemetry.memoryUsed} 
              unit="GB" 
              max={128} 
              icon={MemoryStick} 
              colorClass="bg-purple-500"
              warning={100}
              critical={120}
              isLoading={isLoading}
            />
            <TelemetryGauge 
              label="GPU Power" 
              value={telemetry.gpuPower} 
              unit="W" 
              max={100} 
              icon={Zap} 
              colorClass="bg-yellow-500"
              warning={85}
              critical={95}
              isLoading={isLoading}
            />
            <TelemetryGauge 
              label="GPU Temperature" 
              value={telemetry.gpuTemp} 
              unit="°C" 
              max={100} 
              icon={Thermometer} 
              colorClass="bg-green-500"
              warning={70}
              critical={85}
              isLoading={isLoading}
            />
            <TelemetryGauge 
              label="Fan Speed" 
              value={telemetry.fanSpeed} 
              unit="%" 
              max={100} 
              icon={Fan} 
              colorClass="bg-cyan-500"
              isLoading={isLoading}
            />
          </div>
        </GlassCard>

        {/* Storage & Network */}
        <GlassCard>
          <h3 className="font-display font-bold text-lg mb-4 flex items-center gap-2">
            <HardDrive className="h-5 w-5 text-primary" />
            Storage & Network
          </h3>
          <div className="space-y-5">
            <TelemetryGauge 
              label="NVMe SSD" 
              value={telemetry.nvmeUsed} 
              unit="TB" 
              max={telemetry.nvmeTotal} 
              icon={HardDrive} 
              colorClass="bg-emerald-500"
              warning={telemetry.nvmeTotal * 0.8}
              critical={telemetry.nvmeTotal * 0.95}
              isLoading={isLoading}
            />
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                <div className="text-xs text-muted-foreground mb-1">Network RX</div>
                <div className="text-lg font-mono font-bold">
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : `${(telemetry.networkRx / 1024).toFixed(1)} GB`}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                <div className="text-xs text-muted-foreground mb-1">Network TX</div>
                <div className="text-lg font-mono font-bold">
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : `${(telemetry.networkTx / 1024).toFixed(1)} GB`}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                <div className="text-xs text-muted-foreground mb-1">Read Speed</div>
                <div className="text-lg font-mono font-bold">7.0 GB/s</div>
              </div>
              <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                <div className="text-xs text-muted-foreground mb-1">Write Speed</div>
                <div className="text-lg font-mono font-bold">6.5 GB/s</div>
              </div>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Process List */}
      <ProcessList />
    </div>
  );
}
