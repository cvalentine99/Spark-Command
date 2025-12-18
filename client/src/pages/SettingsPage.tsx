import React, { useState } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { 
  Bell, 
  ShieldAlert, 
  Webhook, 
  Mail, 
  Slack, 
  Save,
  Plus,
  Trash2,
  CheckCircle2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Mock Alert Rules
const initialRules = [
  { id: 1, name: "High GPU Temp", condition: "GPU Temp > 80°C", duration: "5m", severity: "critical", active: true },
  { id: 2, name: "Node Offline", condition: "Heartbeat Missing", duration: "30s", severity: "critical", active: true },
  { id: 3, name: "Memory Pressure", condition: "RAM Usage > 90%", duration: "10m", severity: "warning", active: true },
];

export default function SettingsPage() {
  const [pagerDutyKey, setPagerDutyKey] = useState("pd_integration_key_xxxxxxxx");
  const [slackWebhook, setSlackWebhook] = useState("https://hooks.slack.com/services/...");
  const [rules, setRules] = useState(initialRules);

  const handleSave = () => {
    toast.success("Settings saved successfully", {
      description: "Alert configurations have been updated across the cluster."
    });
  };

  const toggleRule = (id: number) => {
    setRules(rules.map(r => r.id === id ? { ...r, active: !r.active } : r));
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-display font-bold tracking-tight">System Settings</h1>
        <p className="text-muted-foreground">Cluster Configuration & Alert Management</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Integrations */}
        <div className="space-y-6">
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

        {/* Right Column: Alert Rules Manager */}
        <GlassCard className="lg:col-span-2 flex flex-col h-full">
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
      </div>
    </div>
  );
}
