import React from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { 
  Network, 
  ArrowRightLeft, 
  Activity, 
  ShieldCheck,
  Globe
} from "lucide-react";
import { cn } from "@/lib/utils";

const InterfaceStat = ({ name, speed, tx, rx, status }: any) => (
  <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
    <div className="flex items-center gap-3">
      <div className={cn("h-2 w-2 rounded-full", status === 'up' ? "bg-green-500 shadow-[0_0_5px_#22c55e]" : "bg-red-500")} />
      <div>
        <div className="font-mono text-sm font-bold">{name}</div>
        <div className="text-xs text-muted-foreground">{speed}</div>
      </div>
    </div>
    <div className="flex gap-4 text-xs font-mono">
      <div className="flex flex-col items-end">
        <span className="text-muted-foreground">TX</span>
        <span className="text-primary">{tx}</span>
      </div>
      <div className="flex flex-col items-end">
        <span className="text-muted-foreground">RX</span>
        <span className="text-blue-400">{rx}</span>
      </div>
    </div>
  </div>
);

export default function NetworkPage() {
  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-display font-bold tracking-tight">Network Topology</h1>
        <p className="text-muted-foreground">Cluster Interconnect & Bandwidth Monitoring</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Topology Map */}
        <GlassCard className="lg:col-span-2 min-h-[500px] relative overflow-hidden flex flex-col">
          <div className="flex justify-between items-center mb-4 relative z-10">
            <h2 className="text-lg font-display font-bold flex items-center gap-2">
              <Network className="h-5 w-5 text-primary" /> Cluster Map
            </h2>
            <div className="flex gap-2 text-xs">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-500" /> Online</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-orange-500" /> Warning</span>
            </div>
          </div>
          
          {/* Visual Placeholder for Topology */}
          <div className="flex-1 relative rounded-lg border border-white/10 bg-black/40 overflow-hidden group">
            <div className="absolute inset-0 opacity-30" 
                 style={{ 
                   backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(255, 107, 0, 0.1) 0%, transparent 60%)',
                   backgroundSize: '100% 100%'
                 }} 
            />
            
            {/* Simulated Nodes */}
            <div className="absolute top-1/2 left-1/4 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
              <div className="h-16 w-16 rounded-xl bg-white/10 backdrop-blur-md border border-primary/50 flex items-center justify-center shadow-[0_0_20px_-5px_var(--primary)] z-10">
                <ServerIcon className="h-8 w-8 text-white" />
              </div>
              <span className="text-xs font-mono font-bold">NODE-01</span>
            </div>

            <div className="absolute top-1/2 right-1/4 -translate-y-1/2 translate-x-1/2 flex flex-col items-center gap-2">
              <div className="h-16 w-16 rounded-xl bg-white/10 backdrop-blur-md border border-primary/50 flex items-center justify-center shadow-[0_0_20px_-5px_var(--primary)] z-10">
                <ServerIcon className="h-8 w-8 text-white" />
              </div>
              <span className="text-xs font-mono font-bold">NODE-02</span>
            </div>

            {/* Connection Line */}
            <div className="absolute top-1/2 left-1/4 right-1/4 h-1 bg-gradient-to-r from-primary/20 via-primary to-primary/20 -translate-y-1/2">
               <div className="absolute top-0 left-0 h-full w-20 bg-white/50 blur-sm animate-shimmer" />
            </div>
            
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/60 border border-white/10 text-xs font-mono text-muted-foreground backdrop-blur-md">
              Interconnect: 400Gb/s NDDR
            </div>
          </div>
        </GlassCard>

        {/* Interface Stats */}
        <div className="space-y-6">
          <GlassCard>
            <h2 className="text-lg font-display font-bold mb-4 flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" /> Interface Status
            </h2>
            <div className="space-y-3">
              <InterfaceStat 
                name="ib0 (InfiniBand)" 
                speed="400 Gbps" 
                tx="12.5 GB/s" 
                rx="14.2 GB/s" 
                status="up" 
              />
              <InterfaceStat 
                name="eth0 (Mgmt)" 
                speed="10 Gbps" 
                tx="120 MB/s" 
                rx="45 MB/s" 
                status="up" 
              />
              <InterfaceStat 
                name="docker0" 
                speed="Virtual" 
                tx="1.2 GB/s" 
                rx="1.2 GB/s" 
                status="up" 
              />
            </div>
          </GlassCard>

          <GlassCard>
            <h2 className="text-lg font-display font-bold mb-4 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-green-400" /> Security
            </h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Firewall Status</span>
                <span className="text-green-400 font-bold">Active</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Active Connections</span>
                <span className="font-mono">1,245</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Blocked Requests</span>
                <span className="font-mono text-orange-400">23 (Last 1h)</span>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

function ServerIcon({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <rect width="20" height="8" x="2" y="2" rx="2" ry="2" />
      <rect width="20" height="8" x="2" y="14" rx="2" ry="2" />
      <line x1="6" x2="6.01" y1="6" y2="6" />
      <line x1="6" x2="6.01" y1="18" y2="18" />
    </svg>
  );
}
