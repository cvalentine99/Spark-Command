import React, { useState, useEffect } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { trpc } from "@/lib/trpc";
import { 
  Network, 
  ArrowRightLeft, 
  Activity, 
  ShieldCheck,
  Globe,
  Wifi,
  Cable,
  Router,
  ArrowUp,
  ArrowDown,
  Server,
  Loader2,
  RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// Format bytes to human readable
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Interface Stats Component
const InterfaceStat = ({ name, type, speed, tx, rx, status, ip, mac }: {
  name: string;
  type: string;
  speed: string;
  tx: string;
  rx: string;
  status: string;
  ip?: string;
  mac?: string;
}) => (
  <div className="p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-3">
        <div className={cn("h-2 w-2 rounded-full", status === 'up' ? "bg-green-500 shadow-[0_0_5px_#22c55e]" : "bg-red-500")} />
        <div>
          <div className="font-mono text-sm font-bold">{name}</div>
          <div className="text-xs text-muted-foreground">{type}</div>
        </div>
      </div>
      <div className="text-xs font-mono px-2 py-1 rounded bg-white/5 border border-white/10">
        {speed}
      </div>
    </div>
    {ip && (
      <div className="text-xs text-muted-foreground mb-1 font-mono">
        IP: {ip}
      </div>
    )}
    {mac && (
      <div className="text-xs text-muted-foreground mb-3 font-mono">
        MAC: {mac}
      </div>
    )}
    <div className="grid grid-cols-2 gap-3">
      <div className="flex items-center gap-2 text-xs">
        <ArrowUp className="h-3 w-3 text-primary" />
        <span className="text-muted-foreground">TX:</span>
        <span className="font-mono text-primary">{tx}</span>
      </div>
      <div className="flex items-center gap-2 text-xs">
        <ArrowDown className="h-3 w-3 text-blue-400" />
        <span className="text-muted-foreground">RX:</span>
        <span className="font-mono text-blue-400">{rx}</span>
      </div>
    </div>
  </div>
);

// Bandwidth Chart Component
const BandwidthChart = ({ data }: { data: number[] }) => {
  const max = Math.max(...data, 1);
  return (
    <div className="h-24 flex items-end gap-1">
      {data.map((value, i) => (
        <div 
          key={i}
          className="flex-1 bg-gradient-to-t from-primary/80 to-primary/40 rounded-t transition-all duration-300"
          style={{ height: `${(value / max) * 100}%` }}
        />
      ))}
    </div>
  );
};

// Connection List Component
const ConnectionList = () => {
  const connections = [
    { remote: "192.168.1.100", port: 22, protocol: "SSH", state: "ESTABLISHED" },
    { remote: "192.168.1.1", port: 443, protocol: "HTTPS", state: "ESTABLISHED" },
    { remote: "172.17.0.2", port: 8080, protocol: "HTTP", state: "ESTABLISHED" },
    { remote: "127.0.0.1", port: 3000, protocol: "Node.js", state: "LISTEN" },
  ];

  return (
    <div className="space-y-2">
      {connections.map((conn, i) => (
        <div key={i} className="flex items-center justify-between p-2 rounded bg-white/5 text-xs">
          <div className="flex items-center gap-2">
            <span className={cn(
              "h-1.5 w-1.5 rounded-full",
              conn.state === "ESTABLISHED" ? "bg-green-500" : "bg-blue-500"
            )} />
            <span className="font-mono">{conn.remote}:{conn.port}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground">{conn.protocol}</span>
            <span className={cn(
              "px-1.5 py-0.5 rounded text-[10px]",
              conn.state === "ESTABLISHED" ? "bg-green-500/20 text-green-400" : "bg-blue-500/20 text-blue-400"
            )}>
              {conn.state}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default function NetworkPage() {
  const [bandwidthData, setBandwidthData] = useState<number[]>(Array(20).fill(0));
  
  // Fetch network data from backend
  const networkQuery = trpc.local.getNetwork.useQuery(undefined, {
    refetchInterval: 5000,
  });

  // Fetch health status
  const healthQuery = trpc.local.health.useQuery(undefined, {
    refetchInterval: 10000,
  });

  const interfaces = networkQuery.data?.interfaces || [];
  
  // Calculate totals from interfaces
  const totalRx = interfaces.reduce((sum, iface) => sum + iface.rxBytes, 0);
  const totalTx = interfaces.reduce((sum, iface) => sum + iface.txBytes, 0);
  const activeInterfaces = interfaces.filter(iface => iface.status === 'up').length;

  // Simulate bandwidth updates for the chart
  useEffect(() => {
    const timer = setInterval(() => {
      setBandwidthData(prev => {
        const newData = [...prev.slice(1), Math.random() * 100 + 20];
        return newData;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Determine interface type from name
  const getInterfaceType = (name: string): string => {
    if (name.startsWith('eth') || name.startsWith('enp') || name.startsWith('eno')) return 'Ethernet';
    if (name.startsWith('wlan') || name.startsWith('wlp')) return 'WiFi';
    if (name.startsWith('docker') || name.startsWith('br-')) return 'Docker Bridge';
    if (name === 'lo') return 'Loopback';
    if (name.startsWith('veth')) return 'Virtual Ethernet';
    if (name.startsWith('virbr')) return 'Virtual Bridge';
    return 'Network Interface';
  };

  const isLoading = networkQuery.isLoading;

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight">Network Monitor</h1>
          <p className="text-muted-foreground">
            Local interface monitoring and connectivity
            {networkQuery.data && (
              <span className="ml-2 text-xs text-muted-foreground">
                (Source: local)
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => networkQuery.refetch()}
            disabled={networkQuery.isFetching}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", networkQuery.isFetching && "animate-spin")} />
            Refresh
          </Button>
          <div className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm",
            activeInterfaces > 0 
              ? "bg-green-500/10 border border-green-500/20 text-green-400"
              : "bg-red-500/10 border border-red-500/20 text-red-400"
          )}>
            <Wifi className="h-4 w-4" />
            {activeInterfaces > 0 ? `${activeInterfaces} Interface${activeInterfaces > 1 ? 's' : ''} Online` : 'No Interfaces'}
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <GlassCard className="text-center">
          <ArrowDown className="h-5 w-5 text-blue-400 mx-auto mb-2" />
          {isLoading ? (
            <Loader2 className="h-6 w-6 animate-spin mx-auto" />
          ) : (
            <div className="text-2xl font-mono font-bold">{formatBytes(totalRx)}</div>
          )}
          <div className="text-xs text-muted-foreground">Total Received</div>
        </GlassCard>
        <GlassCard className="text-center">
          <ArrowUp className="h-5 w-5 text-primary mx-auto mb-2" />
          {isLoading ? (
            <Loader2 className="h-6 w-6 animate-spin mx-auto" />
          ) : (
            <div className="text-2xl font-mono font-bold">{formatBytes(totalTx)}</div>
          )}
          <div className="text-xs text-muted-foreground">Total Sent</div>
        </GlassCard>
        <GlassCard className="text-center">
          <Activity className="h-5 w-5 text-green-400 mx-auto mb-2" />
          {isLoading ? (
            <Loader2 className="h-6 w-6 animate-spin mx-auto" />
          ) : (
            <div className="text-2xl font-mono font-bold">{interfaces.length}</div>
          )}
          <div className="text-xs text-muted-foreground">Interfaces</div>
        </GlassCard>
        <GlassCard className="text-center">
          <ShieldCheck className="h-5 w-5 text-yellow-400 mx-auto mb-2" />
          <div className="text-2xl font-mono font-bold">{activeInterfaces}</div>
          <div className="text-xs text-muted-foreground">Active</div>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bandwidth Chart */}
        <GlassCard className="lg:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-display font-bold flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" /> Real-Time Bandwidth
            </h2>
            <div className="text-xs text-muted-foreground font-mono">Last 20 seconds</div>
          </div>
          <BandwidthChart data={bandwidthData} />
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>-20s</span>
            <span>Now</span>
          </div>
        </GlassCard>

        {/* Security Status */}
        <GlassCard>
          <h2 className="text-lg font-display font-bold mb-4 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-green-400" /> Security
          </h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Firewall</span>
              <span className="text-green-400 font-bold flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-green-500" /> Active
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">SSH Access</span>
              <span className="font-mono">Key-based only</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Open Ports</span>
              <span className="font-mono">22, 80, 443, 3000</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Health Status</span>
              <span className={cn(
                "font-mono",
                healthQuery.data?.status === 'healthy' ? "text-green-400" : "text-yellow-400"
              )}>
                {healthQuery.data?.status || 'checking...'}
              </span>
            </div>
          </div>
        </GlassCard>

        {/* Network Interfaces */}
        <GlassCard className="lg:col-span-2">
          <h2 className="text-lg font-display font-bold mb-4 flex items-center gap-2">
            <Cable className="h-5 w-5 text-primary" /> Network Interfaces
          </h2>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : interfaces.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Cable className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No network interfaces found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {interfaces.map((iface) => (
                <InterfaceStat 
                  key={iface.name}
                  name={iface.name} 
                  type={getInterfaceType(iface.name)}
                  speed={iface.speed || 'N/A'} 
                  tx={formatBytes(iface.txBytes)} 
                  rx={formatBytes(iface.rxBytes)} 
                  status={iface.status}
                  ip={iface.ip !== 'N/A' ? iface.ip : undefined}
                  mac={iface.mac !== 'N/A' ? iface.mac : undefined}
                />
              ))}
            </div>
          )}
        </GlassCard>

        {/* Active Connections */}
        <GlassCard>
          <h2 className="text-lg font-display font-bold mb-4 flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" /> Active Connections
          </h2>
          <ConnectionList />
        </GlassCard>
      </div>

      {/* Local Services */}
      <GlassCard>
        <h2 className="text-lg font-display font-bold mb-4 flex items-center gap-2">
          <Server className="h-5 w-5 text-primary" /> Local Services
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { name: "Command Center", port: 3000, status: "running" },
            { name: "DCGM Exporter", port: 9400, status: "running" },
            { name: "Node Exporter", port: 9100, status: "running" },
            { name: "Spark Master", port: 7077, status: "running" },
            { name: "Spark UI", port: 8080, status: "running" },
            { name: "Jupyter Lab", port: 8888, status: "running" },
            { name: "vLLM Server", port: 8000, status: "running" },
            { name: "ExtraHop Agent", port: 443, status: "pending" },
          ].map((service) => (
            <div key={service.name} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
              <div>
                <div className="text-sm font-medium">{service.name}</div>
                <div className="text-xs text-muted-foreground font-mono">:{service.port}</div>
              </div>
              <div className={cn(
                "h-2 w-2 rounded-full",
                service.status === "running" ? "bg-green-500 shadow-[0_0_5px_#22c55e]" : 
                service.status === "pending" ? "bg-yellow-500" : "bg-red-500"
              )} />
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
