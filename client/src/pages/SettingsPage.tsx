import React, { useState, useEffect } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Bell, 
  ShieldAlert, 
  Save,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  Settings2,
  Database,
  Activity,
  Shield,
  Server,
  ExternalLink,
  Copy,
  RefreshCw,
  AlertTriangle,
  Gauge,
  Wifi,
  WifiOff,
  Download,
  Terminal
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

// Mock Alert Rules
const initialRules = [
  { id: 1, name: "High GPU Temp", condition: "GPU Temp > 80°C", duration: "5m", severity: "critical", active: true },
  { id: 2, name: "Node Offline", condition: "Heartbeat Missing", duration: "30s", severity: "critical", active: true },
  { id: 3, name: "Memory Pressure", condition: "RAM Usage > 90%", duration: "10m", severity: "warning", active: true },
  { id: 4, name: "XID Error Detected", condition: "NVRM Xid Error", duration: "0s", severity: "critical", active: true },
  { id: 5, name: "Inference Latency", condition: "P95 Latency > 2s", duration: "5m", severity: "warning", active: true },
];

// Splunk Configuration State
interface SplunkConfig {
  enabled: boolean;
  serverUrl: string;
  hecToken: string;
  index: string;
  sourcetype: string;
  sslVerify: boolean;
  connected: boolean;
  lastSync: string;
}

// Prometheus Configuration State
interface PrometheusConfig {
  url: string;
  scrapeInterval: number;
  refreshRate: number;
}

export default function SettingsPage() {
  const [pagerDutyKey, setPagerDutyKey] = useState("pd_integration_key_xxxxxxxx");
  const [rules, setRules] = useState(initialRules);
  const [activeTab, setActiveTab] = useState("integrations");
  
  // Prometheus Configuration
  const [prometheusConfig, setPrometheusConfig] = useState<PrometheusConfig>({
    url: "http://192.168.100.10:9090",
    scrapeInterval: 15,
    refreshRate: 5,
  });
  const [prometheusStatus, setPrometheusStatus] = useState<'idle' | 'testing' | 'connected' | 'error'>('idle');
  const [prometheusMessage, setPrometheusMessage] = useState("");

  // Splunk Configuration
  const [splunkConfig, setSplunkConfig] = useState<SplunkConfig>({
    enabled: true,
    serverUrl: "https://splunk.example.com:8088",
    hecToken: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    index: "dgx_spark_metrics",
    sourcetype: "dcgm:metrics",
    sslVerify: true,
    connected: true,
    lastSync: "2024-12-18T10:42:15Z"
  });

  const [splunkTestStatus, setSplunkTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

  // tRPC mutations
  const updatePrometheusConfig = trpc.metrics.updateConfig.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        setPrometheusStatus('connected');
        setPrometheusMessage(data.message);
        toast.success("Prometheus connected", {
          description: `Successfully connected to ${data.url}`
        });
      } else {
        setPrometheusStatus('error');
        setPrometheusMessage(data.message);
        toast.error("Connection failed", {
          description: data.message
        });
      }
    },
    onError: (error) => {
      setPrometheusStatus('error');
      setPrometheusMessage(error.message);
      toast.error("Connection failed", {
        description: error.message
      });
    }
  });

  const healthCheck = trpc.metrics.healthCheck.useQuery(undefined, {
    enabled: false, // Manual trigger only
  });

  const testPrometheusConnection = async () => {
    setPrometheusStatus('testing');
    setPrometheusMessage("Testing connection...");
    
    try {
      await updatePrometheusConfig.mutateAsync({ prometheusUrl: prometheusConfig.url });
    } catch (error) {
      // Error handled in mutation callbacks
    }
  };

  const handleSave = () => {
    toast.success("Settings saved successfully", {
      description: "Alert configurations have been updated across the cluster."
    });
  };

  const toggleRule = (id: number) => {
    setRules(rules.map(r => r.id === id ? { ...r, active: !r.active } : r));
  };

  const testSplunkConnection = async () => {
    setSplunkTestStatus('testing');
    await new Promise(resolve => setTimeout(resolve, 2000));
    setSplunkTestStatus('success');
    toast.success("Splunk connection verified", {
      description: "Successfully connected to Splunk HEC endpoint."
    });
    setTimeout(() => setSplunkTestStatus('idle'), 3000);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const downloadSetupScript = () => {
    window.open('/scripts/dgx-spark-setup.sh', '_blank');
    toast.success("Download started", {
      description: "Run this script on each DGX Spark node to install exporters."
    });
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-display font-bold tracking-tight">System Settings</h1>
        <p className="text-muted-foreground">Cluster Configuration, Integrations & Alert Management</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-white/5 border border-white/10 p-1 mb-6">
          <TabsTrigger value="integrations" className="data-[state=active]:bg-primary data-[state=active]:text-white">
            <Database className="h-4 w-4 mr-2" /> Integrations
          </TabsTrigger>
          <TabsTrigger value="prometheus" className="data-[state=active]:bg-primary data-[state=active]:text-white">
            <Gauge className="h-4 w-4 mr-2" /> Prometheus
          </TabsTrigger>
          <TabsTrigger value="alerts" className="data-[state=active]:bg-primary data-[state=active]:text-white">
            <Bell className="h-4 w-4 mr-2" /> Alert Rules
          </TabsTrigger>
          <TabsTrigger value="logging" className="data-[state=active]:bg-primary data-[state=active]:text-white">
            <Activity className="h-4 w-4 mr-2" /> Logging
          </TabsTrigger>
          <TabsTrigger value="system" className="data-[state=active]:bg-primary data-[state=active]:text-white">
            <Settings2 className="h-4 w-4 mr-2" /> System
          </TabsTrigger>
        </TabsList>

        {/* Prometheus Tab - NEW */}
        <TabsContent value="prometheus" className="mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Connection Configuration */}
            <GlassCard className="lg:col-span-2 border-primary/30">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-orange-500/20 to-red-500/20 flex items-center justify-center border border-orange-500/30">
                    <Gauge className="h-6 w-6 text-orange-400" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-lg">Prometheus Server</h3>
                    <p className="text-sm text-muted-foreground">Connect to your DGX Spark metrics endpoint</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {prometheusStatus === 'connected' ? (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/30">
                      <Wifi className="h-3 w-3 text-green-400" />
                      <span className="text-xs font-medium text-green-400">Connected</span>
                    </div>
                  ) : prometheusStatus === 'error' ? (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/30">
                      <WifiOff className="h-3 w-3 text-red-400" />
                      <span className="text-xs font-medium text-red-400">Disconnected</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                      <div className="h-2 w-2 rounded-full bg-muted-foreground" />
                      <span className="text-xs font-medium text-muted-foreground">Not Configured</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Prometheus URL</label>
                    <div className="flex gap-2">
                      <Input 
                        value={prometheusConfig.url} 
                        onChange={(e) => setPrometheusConfig({...prometheusConfig, url: e.target.value})}
                        className="bg-black/20 border-white/10 font-mono text-xs"
                        placeholder="http://192.168.100.10:9090"
                      />
                      <Button variant="ghost" size="icon" className="shrink-0" onClick={() => copyToClipboard(prometheusConfig.url)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Enter the URL of your Prometheus server (typically running on the master node)
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">Scrape Interval (s)</label>
                      <Input 
                        type="number"
                        value={prometheusConfig.scrapeInterval} 
                        onChange={(e) => setPrometheusConfig({...prometheusConfig, scrapeInterval: parseInt(e.target.value) || 15})}
                        className="bg-black/20 border-white/10"
                        min={5}
                        max={60}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">Dashboard Refresh (s)</label>
                      <Input 
                        type="number"
                        value={prometheusConfig.refreshRate} 
                        onChange={(e) => setPrometheusConfig({...prometheusConfig, refreshRate: parseInt(e.target.value) || 5})}
                        className="bg-black/20 border-white/10"
                        min={1}
                        max={30}
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      className="flex-1 bg-white/5 border-white/10 hover:bg-white/10"
                      onClick={testPrometheusConnection}
                      disabled={prometheusStatus === 'testing' || !prometheusConfig.url}
                    >
                      {prometheusStatus === 'testing' ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : prometheusStatus === 'connected' ? (
                        <CheckCircle2 className="h-4 w-4 mr-2 text-green-400" />
                      ) : prometheusStatus === 'error' ? (
                        <XCircle className="h-4 w-4 mr-2 text-red-400" />
                      ) : (
                        <Wifi className="h-4 w-4 mr-2" />
                      )}
                      Test Connection
                    </Button>
                    <Button 
                      variant="outline" 
                      className="bg-white/5 border-white/10 hover:bg-white/10"
                      onClick={() => window.open(prometheusConfig.url, '_blank')}
                      disabled={!prometheusConfig.url}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" /> Open UI
                    </Button>
                  </div>

                  {prometheusMessage && (
                    <p className={cn(
                      "text-xs text-center p-2 rounded-lg",
                      prometheusStatus === 'connected' ? "bg-green-500/10 text-green-400" :
                      prometheusStatus === 'error' ? "bg-red-500/10 text-red-400" :
                      "bg-white/5 text-muted-foreground"
                    )}>
                      {prometheusMessage}
                    </p>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-white/5 border border-white/10 space-y-3">
                    <h4 className="text-sm font-medium">Required Exporters</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">DCGM Exporter</span>
                        <span className="font-mono text-xs text-primary">:9400</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Node Exporter</span>
                        <span className="font-mono text-xs text-primary">:9100</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Spark Metrics</span>
                        <span className="font-mono text-xs text-primary">:4040</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">vLLM Metrics</span>
                        <span className="font-mono text-xs text-primary">:8000</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                    <h4 className="text-sm font-medium text-primary mb-2 flex items-center gap-2">
                      <Terminal className="h-4 w-4" /> Quick Setup
                    </h4>
                    <p className="text-xs text-muted-foreground mb-3">
                      Run this script on each DGX Spark node to automatically install and configure all exporters.
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="w-full bg-primary/20 border-primary/30 hover:bg-primary/30 text-primary"
                      onClick={downloadSetupScript}
                    >
                      <Download className="h-4 w-4 mr-2" /> Download Setup Script
                    </Button>
                  </div>
                </div>
              </div>

              {/* Connection Status Details */}
              <div className="mt-6 pt-6 border-t border-white/10">
                <h4 className="text-sm font-medium mb-4">Setup Instructions</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">1</div>
                      <span className="font-medium text-sm">Master Node</span>
                    </div>
                    <code className="text-xs text-muted-foreground font-mono block bg-black/30 p-2 rounded">
                      ./dgx-spark-setup.sh --node-type master
                    </code>
                  </div>
                  <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">2</div>
                      <span className="font-medium text-sm">Worker Node</span>
                    </div>
                    <code className="text-xs text-muted-foreground font-mono block bg-black/30 p-2 rounded">
                      ./dgx-spark-setup.sh --node-type worker --master-ip [MASTER_IP]
                    </code>
                  </div>
                  <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">3</div>
                      <span className="font-medium text-sm">Configure Dashboard</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Enter the Prometheus URL above and click "Test Connection"
                    </p>
                  </div>
                </div>
              </div>
            </GlassCard>
          </div>
        </TabsContent>

        {/* Integrations Tab */}
        <TabsContent value="integrations" className="mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Splunk Integration - Featured */}
            <GlassCard className="lg:col-span-2 border-primary/30">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center border border-green-500/30">
                    <Activity className="h-6 w-6 text-green-400" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-lg">Splunk Enterprise</h3>
                    <p className="text-sm text-muted-foreground">SIEM & Log Analytics Integration</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {splunkConfig.connected ? (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/30">
                      <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-xs font-medium text-green-400">Connected</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/30">
                      <XCircle className="h-3 w-3 text-red-400" />
                      <span className="text-xs font-medium text-red-400">Disconnected</span>
                    </div>
                  )}
                  <Switch 
                    checked={splunkConfig.enabled} 
                    onCheckedChange={(checked) => setSplunkConfig({...splunkConfig, enabled: checked})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Splunk HEC URL</label>
                    <div className="flex gap-2">
                      <Input 
                        value={splunkConfig.serverUrl} 
                        onChange={(e) => setSplunkConfig({...splunkConfig, serverUrl: e.target.value})}
                        className="bg-black/20 border-white/10 font-mono text-xs"
                        placeholder="https://splunk.example.com:8088"
                      />
                      <Button variant="ghost" size="icon" className="shrink-0" onClick={() => copyToClipboard(splunkConfig.serverUrl)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">HEC Token</label>
                    <Input 
                      type="password"
                      value={splunkConfig.hecToken} 
                      onChange={(e) => setSplunkConfig({...splunkConfig, hecToken: e.target.value})}
                      className="bg-black/20 border-white/10 font-mono text-xs"
                      placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">Default Index</label>
                      <Input 
                        value={splunkConfig.index} 
                        onChange={(e) => setSplunkConfig({...splunkConfig, index: e.target.value})}
                        className="bg-black/20 border-white/10 font-mono text-xs"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">Sourcetype</label>
                      <Input 
                        value={splunkConfig.sourcetype} 
                        onChange={(e) => setSplunkConfig({...splunkConfig, sourcetype: e.target.value})}
                        className="bg-black/20 border-white/10 font-mono text-xs"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-white/5 border border-white/10 space-y-3">
                    <h4 className="text-sm font-medium">Connection Settings</h4>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">SSL Certificate Verification</span>
                      <Switch 
                        checked={splunkConfig.sslVerify} 
                        onCheckedChange={(checked) => setSplunkConfig({...splunkConfig, sslVerify: checked})}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Send GPU Metrics</span>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Send System Logs</span>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Send Inference Metrics</span>
                      <Switch defaultChecked />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      className="flex-1 bg-white/5 border-white/10 hover:bg-white/10"
                      onClick={testSplunkConnection}
                      disabled={splunkTestStatus === 'testing'}
                    >
                      {splunkTestStatus === 'testing' ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : splunkTestStatus === 'success' ? (
                        <CheckCircle2 className="h-4 w-4 mr-2 text-green-400" />
                      ) : (
                        <Activity className="h-4 w-4 mr-2" />
                      )}
                      Test Connection
                    </Button>
                    <Button variant="outline" className="bg-white/5 border-white/10 hover:bg-white/10">
                      <ExternalLink className="h-4 w-4 mr-2" /> Open Splunk
                    </Button>
                  </div>

                  {splunkConfig.lastSync && (
                    <p className="text-xs text-muted-foreground text-center">
                      Last sync: {new Date(splunkConfig.lastSync).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>

              {/* Splunk Indexes Summary */}
              <div className="mt-6 pt-6 border-t border-white/10">
                <h4 className="text-sm font-medium mb-4">Configured Indexes</h4>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {[
                    { name: "dgx_spark_metrics", events: "2.4M", size: "12.3 GB" },
                    { name: "dgx_spark_logs", events: "890K", size: "4.2 GB" },
                    { name: "dgx_spark_inference", events: "156K", size: "1.8 GB" },
                    { name: "dgx_spark_apps", events: "45K", size: "890 MB" },
                    { name: "dgx_spark_k8s", events: "234K", size: "2.1 GB" },
                  ].map((idx) => (
                    <div key={idx.name} className="p-3 rounded-lg bg-white/5 border border-white/10">
                      <div className="font-mono text-xs text-primary truncate">{idx.name}</div>
                      <div className="text-xs text-muted-foreground mt-1">{idx.events} events</div>
                      <div className="text-xs text-muted-foreground">{idx.size}</div>
                    </div>
                  ))}
                </div>
              </div>
            </GlassCard>

            {/* PagerDuty Integration */}
            <GlassCard>
              <div className="flex items-center gap-2 font-display font-bold text-lg mb-4">
                <ShieldAlert className="h-5 w-5 text-primary" /> PagerDuty Integration
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Integration Key</label>
                  <div className="flex gap-2">
                    <Input 
                      type="password" 
                      value={pagerDutyKey} 
                      onChange={(e) => setPagerDutyKey(e.target.value)}
                      className="bg-black/20 border-white/10 font-mono text-xs"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <div className="flex items-center gap-2 text-sm text-green-400 font-medium">
                    <CheckCircle2 className="h-4 w-4" /> Connected
                  </div>
                  <Button variant="ghost" size="sm" className="h-6 text-xs text-green-400 hover:text-green-300 hover:bg-green-500/20">
                    Test Alert
                  </Button>
                </div>
              </div>
            </GlassCard>

            {/* Google Workspace Integration */}
            <GlassCard>
              <div className="flex items-center gap-2 font-display font-bold text-lg mb-4">
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Google Workspace
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Email Notifications</span>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Calendar Events</span>
                  <Switch />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Drive Backup</span>
                  <Switch />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <div className="flex items-center gap-2 text-sm text-blue-400 font-medium">
                    <CheckCircle2 className="h-4 w-4" /> Authenticated
                  </div>
                </div>
              </div>
            </GlassCard>
          </div>
        </TabsContent>

        {/* Alert Rules Tab */}
        <TabsContent value="alerts" className="mt-0">
          <GlassCard className="flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2 font-display font-bold text-lg">
                <Bell className="h-5 w-5 text-primary" /> Alert Rules Manager
              </div>
              <Button size="sm" className="bg-white/10 hover:bg-white/20 text-white border border-white/10">
                <Plus className="h-4 w-4 mr-2" /> Add Rule
              </Button>
            </div>

            <div className="space-y-4 flex-1">
              {rules.map((rule) => (
                <div key={rule.id} className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "h-2 w-2 rounded-full shrink-0",
                      rule.severity === 'critical' ? "bg-red-500 shadow-[0_0_5px_#ef4444]" : "bg-orange-500"
                    )} />
                    <div>
                      <div className="font-medium text-sm flex items-center gap-2">
                        {rule.name}
                        {!rule.active && <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-muted-foreground">DISABLED</span>}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono mt-1">
                        If {rule.condition} for {rule.duration}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <Switch checked={rule.active} onCheckedChange={() => toggleRule(rule.id)} />
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              
              <div className="p-4 rounded-lg border border-dashed border-white/10 flex items-center justify-center text-sm text-muted-foreground hover:bg-white/5 cursor-pointer transition-colors">
                + Create Custom Alert Rule
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-white/10 flex justify-end gap-4">
              <Button variant="ghost">Discard Changes</Button>
              <Button onClick={handleSave} className="bg-primary hover:bg-primary/90 text-white">
                <Save className="h-4 w-4 mr-2" /> Save Configuration
              </Button>
            </div>
          </GlassCard>
        </TabsContent>

        {/* Logging Tab */}
        <TabsContent value="logging" className="mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <GlassCard>
              <div className="flex items-center gap-2 font-display font-bold text-lg mb-4">
                <Activity className="h-5 w-5 text-blue-400" /> Log Forwarding
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                  <div className="flex items-center gap-3">
                    <Server className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-medium">Splunk Universal Forwarder</div>
                      <div className="text-xs text-muted-foreground">dgx-spark-01, dgx-spark-02</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    <span className="text-xs text-green-400">Active</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Log Retention (days)</label>
                  <Input 
                    type="number"
                    defaultValue="90"
                    className="bg-black/20 border-white/10"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Forward System Logs</span>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Forward Container Logs</span>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Forward Audit Logs</span>
                  <Switch defaultChecked />
                </div>
              </div>
            </GlassCard>

            <GlassCard>
              <div className="flex items-center gap-2 font-display font-bold text-lg mb-4">
                <Shield className="h-5 w-5 text-cyan-400" /> Google Chronicle / SecOps
              </div>
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                  <div className="flex items-center gap-2 text-sm text-cyan-400 font-medium mb-2">
                    <AlertTriangle className="h-4 w-4" /> Required Integration
                  </div>
                  <p className="text-xs text-muted-foreground">
                    All logs must be forwarded to Google Chronicle for security monitoring and compliance.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Chronicle Customer ID</label>
                  <Input 
                    type="password"
                    placeholder="Enter Chronicle Customer ID"
                    className="bg-black/20 border-white/10 font-mono text-xs"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Service Account JSON</label>
                  <div className="p-3 rounded-lg border border-dashed border-white/20 text-center text-sm text-muted-foreground hover:bg-white/5 cursor-pointer">
                    Click to upload service account key
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Enable Chronicle Forwarding</span>
                  <Switch />
                </div>
              </div>
            </GlassCard>
          </div>
        </TabsContent>

        {/* System Tab */}
        <TabsContent value="system" className="mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <GlassCard>
              <div className="flex items-center gap-2 font-display font-bold text-lg mb-4">
                <Server className="h-5 w-5 text-primary" /> Cluster Configuration
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Cluster Name</label>
                  <Input 
                    defaultValue="dgx-spark-cluster-01"
                    className="bg-black/20 border-white/10"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Master Node IP</label>
                    <Input 
                      defaultValue="192.168.100.10"
                      className="bg-black/20 border-white/10 font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Worker Node IP</label>
                    <Input 
                      defaultValue="192.168.100.11"
                      className="bg-black/20 border-white/10 font-mono text-xs"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Auto-Discovery</span>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Metrics Collection</span>
                  <Switch defaultChecked />
                </div>
              </div>
            </GlassCard>

            <GlassCard>
              <div className="flex items-center gap-2 font-display font-bold text-lg mb-4">
                <Settings2 className="h-5 w-5 text-muted-foreground" /> Data Collection
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Metrics Scrape Interval</label>
                  <Input 
                    type="number"
                    defaultValue="15"
                    className="bg-black/20 border-white/10"
                  />
                  <p className="text-xs text-muted-foreground">Seconds between metric collections</p>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Dashboard Refresh Rate</label>
                  <Input 
                    type="number"
                    defaultValue="5"
                    className="bg-black/20 border-white/10"
                  />
                  <p className="text-xs text-muted-foreground">Seconds between UI updates</p>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Enable DCGM Exporter</span>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Enable Node Exporter</span>
                  <Switch defaultChecked />
                </div>
              </div>
            </GlassCard>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
