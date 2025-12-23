import React, { useState, useEffect } from "react";
import { GlassCard } from "@/components/ui/glass-card";
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
  Server
} from "lucide-react";
import { cn } from "@/lib/utils";

// Interface Stats Component
const InterfaceStat = ({ name, type, speed, tx, rx, status, ip }: {
  name: string;
  type: string;
  speed: string;
  tx: string;
  rx: string;
  status: string;
  ip?: string;
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
      <div className="text-xs text-muted-foreground mb-3 font-mono">
        IP: {ip}
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
    { remote: "127.0.0.1", port: 9090, protocol: "Prometheus", state: "LISTEN" },
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
  const [stats, setStats] = useState({
    totalRx: 1.24,
    totalTx: 0.89,
    activeConns: 127,
    blockedReqs: 3
  });

  // Simulate bandwidth updates
  useEffect(() => {
    const timer = setInterval(() => {
      setBandwidthData(prev => {
        const newData = [...prev.slice(1), Math.random() * 100 + 20];
        return newData;
      });
      setStats(prev => ({
        ...prev,
        totalRx: prev.totalRx + Math.random() * 0.01,
        totalTx: prev.totalTx + Math.random() * 0.008,
        activeConns: Math.max(100, Math.min(200, prev.activeConns + Math.floor((Math.random() - 0.5) * 10)))
      }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight">Network Monitor</h1>
          <p className="text-muted-foreground">Local interface monitoring and connectivity</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
          <Wifi className="h-4 w-4" />
          All Interfaces Online
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <GlassCard className="text-center">
          <ArrowDown className="h-5 w-5 text-blue-400 mx-auto mb-2" />
          <div className="text-2xl font-mono font-bold">{stats.totalRx.toFixed(2)} TB</div>
          <div className="text-xs text-muted-foreground">Total Received</div>
        </GlassCard>
        <GlassCard className="text-center">
          <ArrowUp className="h-5 w-5 text-primary mx-auto mb-2" />
          <div className="text-2xl font-mono font-bold">{stats.totalTx.toFixed(2)} TB</div>
          <div className="text-xs text-muted-foreground">Total Sent</div>
        </GlassCard>
        <GlassCard className="text-center">
          <Activity className="h-5 w-5 text-green-400 mx-auto mb-2" />
          <div className="text-2xl font-mono font-bold">{stats.activeConns}</div>
          <div className="text-xs text-muted-foreground">Active Connections</div>
        </GlassCard>
        <GlassCard className="text-center">
          <ShieldCheck className="h-5 w-5 text-yellow-400 mx-auto mb-2" />
          <div className="text-2xl font-mono font-bold">{stats.blockedReqs}</div>
          <div className="text-xs text-muted-foreground">Blocked (24h)</div>
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
              <span className="text-muted-foreground">Last Scan</span>
              <span className="font-mono text-muted-foreground">2 mins ago</span>
            </div>
          </div>
        </GlassCard>

        {/* Network Interfaces */}
        <GlassCard className="lg:col-span-2">
          <h2 className="text-lg font-display font-bold mb-4 flex items-center gap-2">
            <Cable className="h-5 w-5 text-primary" /> Network Interfaces
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InterfaceStat 
              name="eth0" 
              type="Ethernet (Primary)"
              speed="10 Gbps" 
              tx="125 MB/s" 
              rx="89 MB/s" 
              status="up"
              ip="192.168.1.50"
            />
            <InterfaceStat 
              name="wlan0" 
              type="WiFi 6E"
              speed="2.4 Gbps" 
              tx="45 MB/s" 
              rx="32 MB/s" 
              status="up"
              ip="192.168.1.51"
            />
            <InterfaceStat 
              name="docker0" 
              type="Docker Bridge"
              speed="Virtual" 
              tx="1.2 GB/s" 
              rx="1.2 GB/s" 
              status="up"
              ip="172.17.0.1"
            />
            <InterfaceStat 
              name="lo" 
              type="Loopback"
              speed="Local" 
              tx="500 MB/s" 
              rx="500 MB/s" 
              status="up"
              ip="127.0.0.1"
            />
          </div>
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
            { name: "Prometheus", port: 9090, status: "running" },
            { name: "DCGM Exporter", port: 9400, status: "running" },
            { name: "Node Exporter", port: 9100, status: "running" },
            { name: "Spark Master", port: 7077, status: "running" },
            { name: "Spark UI", port: 8080, status: "running" },
            { name: "Jupyter Lab", port: 8888, status: "running" },
            { name: "vLLM Server", port: 8000, status: "running" },
          ].map((service) => (
            <div key={service.name} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
              <div>
                <div className="text-sm font-medium">{service.name}</div>
                <div className="text-xs text-muted-foreground font-mono">:{service.port}</div>
              </div>
              <div className={cn(
                "h-2 w-2 rounded-full",
                service.status === "running" ? "bg-green-500 shadow-[0_0_5px_#22c55e]" : "bg-red-500"
              )} />
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
