import React, { useState } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Bell, 
  ShieldAlert, 
  Mail, 
  Slack, 
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
  AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Splunk Logo SVG Component
const SplunkLogo = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
  </svg>
);

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

export default function SettingsPage() {
  const [pagerDutyKey, setPagerDutyKey] = useState("pd_integration_key_xxxxxxxx");
  const [slackWebhook, setSlackWebhook] = useState("https://hooks.slack.com/services/...");
  const [rules, setRules] = useState(initialRules);
  const [activeTab, setActiveTab] = useState("integrations");
  
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
    // Simulate API call
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

            {/* Slack Integration */}
            <GlassCard>
              <div className="flex items-center gap-2 font-display font-bold text-lg mb-4">
                <Slack className="h-5 w-5 text-purple-400" /> Slack Notifications
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Webhook URL</label>
                  <Input 
                    value={slackWebhook} 
                    onChange={(e) => setSlackWebhook(e.target.value)}
                    className="bg-black/20 border-white/10 font-mono text-xs"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Notify on Critical</span>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Notify on Warning</span>
                  <Switch />
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
