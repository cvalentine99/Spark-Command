import React from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { 
  Cpu, 
  Thermometer, 
  Zap, 
  Activity, 
  Microchip, 
  Fan,
  Server
} from "lucide-react";
import { cn } from "@/lib/utils";

// Mock Data for Nodes
const nodes = [
  {
    id: "node-01",
    name: "DGX-SPARK-01",
    role: "Master / Control Plane",
    ip: "192.168.100.10",
    status: "online",
    uptime: "14d 2h 15m",
    specs: {
      cpu: "NVIDIA Grace (72 Cores)",
      gpu: "NVIDIA Blackwell (GB10)",
      memory: "128GB LPDDR5x (UMA)"
    },
    telemetry: {
      cpuLoad: 45,
      memoryUsed: 62,
      gpuUtil: 92,
      gpuTemp: 72,
      gpuPower: 135, // Watts (TDP 140W)
      fanSpeed: 65
    }
  },
  {
    id: "node-02",
    name: "DGX-SPARK-02",
    role: "Worker / Compute",
    ip: "192.168.100.11",
    status: "online",
    uptime: "14d 2h 10m",
    specs: {
      cpu: "NVIDIA Grace (72 Cores)",
      gpu: "NVIDIA Blackwell (GB10)",
      memory: "128GB LPDDR5x (UMA)"
    },
    telemetry: {
      cpuLoad: 88,
      memoryUsed: 94,
      gpuUtil: 98,
      gpuTemp: 78,
      gpuPower: 138, // Near TDP limit
      fanSpeed: 85
    }
  }
];

const TelemetryGauge = ({ label, value, unit, max, icon: Icon, colorClass }: any) => {
  const percentage = Math.min((value / max) * 100, 100);
  
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-center text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Icon className="h-4 w-4" />
          <span>{label}</span>
        </div>
        <span className="font-mono font-bold">
          {value}<span className="text-xs text-muted-foreground ml-0.5">{unit}</span>
        </span>
      </div>
      <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
        <div 
          className={cn("h-full transition-all duration-500", colorClass)} 
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

const GpuVisualizer = ({ telemetry }: { telemetry: any }) => {
  // Visual representation of the GB10 Superchip
  return (
    <div className="relative h-48 w-full bg-black/40 rounded-xl border border-white/10 flex items-center justify-center overflow-hidden group">
      {/* Abstract Circuit Background */}
      <div className="absolute inset-0 opacity-20" 
           style={{ backgroundImage: 'radial-gradient(circle at center, var(--primary) 0%, transparent 70%)' }} 
      />
      
      {/* Chip Package */}
      <div className="relative z-10 w-32 h-32 bg-white/5 backdrop-blur-md rounded-lg border border-white/20 flex flex-col items-center justify-center shadow-[0_0_30px_-5px_rgba(0,0,0,0.5)]">
        <Microchip className={cn("h-12 w-12 mb-2 transition-colors duration-300", telemetry.gpuUtil > 90 ? "text-primary animate-pulse" : "text-muted-foreground")} />
        <div className="text-xs font-display font-bold tracking-widest">GB10</div>
        <div className="text-[10px] text-muted-foreground mt-1">SUPERCHIP</div>
        
        {/* Heat Indicator */}
        <div className={cn(
          "absolute -bottom-8 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-mono border backdrop-blur-md transition-all",
          telemetry.gpuTemp > 75 ? "bg-red-500/20 border-red-500/50 text-red-400" : "bg-green-500/20 border-green-500/50 text-green-400"
        )}>
          {telemetry.gpuTemp}°C
        </div>
      </div>

      {/* Memory Modules (UMA) */}
      <div className="absolute top-1/2 left-4 -translate-y-1/2 w-2 h-16 bg-white/10 rounded-full" />
      <div className="absolute top-1/2 right-4 -translate-y-1/2 w-2 h-16 bg-white/10 rounded-full" />
    </div>
  );
};

export default function NodesPage() {
  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-display font-bold tracking-tight">Node Telemetry</h1>
        <p className="text-muted-foreground">Granular hardware monitoring for Grace Blackwell Superchips</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {nodes.map((node) => (
          <GlassCard key={node.id} className="flex flex-col gap-6">
            {/* Node Header */}
            <div className="flex justify-between items-start border-b border-white/10 pb-4">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                  <Server className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-display font-bold">{node.name}</h2>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="font-mono">{node.ip}</span>
                    <span>•</span>
                    <span>{node.role}</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-2 px-2 py-1 rounded bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-bold uppercase tracking-wider">
                  <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                  {node.status}
                </div>
                <span className="text-xs text-muted-foreground font-mono">Up: {node.uptime}</span>
              </div>
            </div>

            {/* Main Content Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Visualizer & Specs */}
              <div className="space-y-4">
                <GpuVisualizer telemetry={node.telemetry} />
                
                <div className="p-4 rounded-lg bg-black/20 border border-white/5 space-y-2">
                  <h3 className="text-xs font-bold uppercase text-muted-foreground tracking-wider mb-3">Hardware Specs</h3>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">CPU</span>
                    <span className="font-mono text-xs">{node.specs.cpu}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">GPU</span>
                    <span className="font-mono text-xs">{node.specs.gpu}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Memory</span>
                    <span className="font-mono text-xs">{node.specs.memory}</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Telemetry Gauges */}
              <div className="space-y-6">
                <TelemetryGauge 
                  label="GPU Utilization" 
                  value={node.telemetry.gpuUtil} 
                  unit="%" 
                  max={100} 
                  icon={Zap} 
                  colorClass="bg-primary shadow-[0_0_10px_var(--primary)]" 
                />
                <TelemetryGauge 
                  label="Memory Usage (UMA)" 
                  value={node.telemetry.memoryUsed} 
                  unit="GB" 
                  max={128} 
                  icon={Microchip} 
                  colorClass="bg-purple-500" 
                />
                <TelemetryGauge 
                  label="CPU Load" 
                  value={node.telemetry.cpuLoad} 
                  unit="%" 
                  max={100} 
                  icon={Cpu} 
                  colorClass="bg-blue-500" 
                />
                
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="p-3 rounded-lg bg-white/5 border border-white/10 flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Thermometer className="h-3 w-3" /> Temp
                    </div>
                    <div className={cn("text-lg font-mono font-bold", node.telemetry.gpuTemp > 75 ? "text-red-400" : "text-foreground")}>
                      {node.telemetry.gpuTemp}°C
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-white/5 border border-white/10 flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Zap className="h-3 w-3" /> Power
                    </div>
                    <div className={cn("text-lg font-mono font-bold", node.telemetry.gpuPower > 135 ? "text-orange-400" : "text-foreground")}>
                      {node.telemetry.gpuPower}W
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2">
                  <Fan className={cn("h-3 w-3", node.telemetry.fanSpeed > 80 && "animate-spin")} />
                  <span>Fan Speed: {node.telemetry.fanSpeed}%</span>
                </div>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
