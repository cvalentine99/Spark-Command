import { useState, useEffect } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { useWebSocketContext } from "@/contexts/WebSocketContext";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Zap,
  Thermometer,
  Fan,
  Activity,
  AlertTriangle,
  RotateCcw,
  Volume2,
  Gauge,
  Flame,
  Loader2,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// Types
interface ThermalProfile {
  name: string;
  powerLimit: number;
  fanCurve: { temp: number; fanSpeed: number }[];
  description: string;
}

// Profile icon
function ProfileIcon({ name }: { name: string }) {
  switch (name) {
    case "Quiet":
      return <Volume2 className="w-5 h-5 text-blue-400" />;
    case "Balanced":
      return <Gauge className="w-5 h-5 text-green-400" />;
    case "Performance":
      return <Flame className="w-5 h-5 text-orange-400" />;
    case "Max Performance":
      return <Zap className="w-5 h-5 text-red-400" />;
    default:
      return <Activity className="w-5 h-5" />;
  }
}

export default function PowerPage() {
  const [powerLimit, setPowerLimit] = useState(250);
  const [fanSpeed, setFanSpeed] = useState(55);
  const [manualFan, setManualFan] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<string>("Balanced");
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    action: () => void;
  }>({ open: false, title: "", description: "", action: () => {} });

  // Use WebSocket for real-time GPU metrics
  const { gpuMetrics, isConnected } = useWebSocketContext();

  // Fetch power state from backend (reduced polling when WebSocket connected)
  const powerStateQuery = trpc.power.getPowerState.useQuery(undefined, {
    refetchInterval: isConnected ? false : 3000, // Only poll if WebSocket disconnected
    enabled: !isConnected || !gpuMetrics,
  });

  // Fetch thermal profiles from backend
  const profilesQuery = trpc.power.getThermalProfiles.useQuery();

  // Fetch power history
  const historyQuery = trpc.power.getPowerHistory.useQuery({ minutes: 10 }, {
    refetchInterval: 10000,
  });

  // Mutations
  const setPowerLimitMutation = trpc.power.setPowerLimit.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      powerStateQuery.refetch();
    },
    onError: (error) => {
      toast.error(`Failed to set power limit: ${error.message}`);
    },
  });

  const setFanSpeedMutation = trpc.power.setFanSpeed.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      powerStateQuery.refetch();
    },
    onError: (error) => {
      toast.error(`Failed to set fan speed: ${error.message}`);
    },
  });

  const resetFanAutoMutation = trpc.power.resetFanAuto.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setManualFan(false);
      powerStateQuery.refetch();
    },
    onError: (error) => {
      toast.error(`Failed to reset fan: ${error.message}`);
    },
  });

  const applyProfileMutation = trpc.power.applyThermalProfile.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      if (data.profile) {
        setPowerLimit(data.profile.powerLimit);
        setSelectedProfile(data.profile.name);
      }
      powerStateQuery.refetch();
    },
    onError: (error) => {
      toast.error(`Failed to apply profile: ${error.message}`);
    },
  });

  const resetToDefaultsMutation = trpc.power.resetToDefaults.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setPowerLimit(250);
      setFanSpeed(55);
      setManualFan(false);
      setSelectedProfile("Performance");
      powerStateQuery.refetch();
    },
    onError: (error) => {
      toast.error(`Failed to reset: ${error.message}`);
    },
  });

  // Prefer WebSocket data for real-time metrics, fall back to API data
  const apiPowerState = powerStateQuery.data?.state;
  const powerState = gpuMetrics ? {
    ...apiPowerState,
    temperature: gpuMetrics.temperature,
    powerDraw: gpuMetrics.powerDraw,
    powerLimit: gpuMetrics.powerLimit || apiPowerState?.powerLimit || 250,
    fanSpeed: gpuMetrics.fanSpeed,
    fanMode: apiPowerState?.fanMode || 'auto',
    utilization: gpuMetrics.utilization,
  } : apiPowerState;
  
  const thermalProfiles = profilesQuery.data?.profiles || [];
  const powerHistory = historyQuery.data?.history.map(p => ({
    time: new Date(p.timestamp).toLocaleTimeString(),
    power: p.power,
    temp: p.temp,
  })) || [];

  // Update local state when power state changes
  useEffect(() => {
    if (powerState) {
      setPowerLimit(powerState.powerLimit);
      setFanSpeed(powerState.fanSpeed);
      setManualFan(powerState.fanMode === "manual");
    }
  }, [powerState?.powerLimit, powerState?.fanSpeed, powerState?.fanMode]);

  // Apply power limit
  const applyPowerLimit = () => {
    setConfirmDialog({
      open: true,
      title: "Apply Power Limit",
      description: `Are you sure you want to set the GPU power limit to ${powerLimit}W? This may affect system performance and stability.`,
      action: () => {
        setPowerLimitMutation.mutate({ gpuIndex: 0, powerLimit });
        setConfirmDialog((prev) => ({ ...prev, open: false }));
      },
    });
  };

  // Apply fan speed
  const applyFanSpeed = () => {
    setConfirmDialog({
      open: true,
      title: "Apply Fan Speed",
      description: `Are you sure you want to set the fan speed to ${fanSpeed}%? Manual fan control overrides automatic thermal management.`,
      action: () => {
        setFanSpeedMutation.mutate({ gpuIndex: 0, fanSpeed });
        setConfirmDialog((prev) => ({ ...prev, open: false }));
      },
    });
  };

  // Apply thermal profile
  const applyProfile = (profileName: string) => {
    const profile = thermalProfiles.find((p) => p.name === profileName);
    if (!profile) return;

    setConfirmDialog({
      open: true,
      title: `Apply "${profileName}" Profile`,
      description: `${profile.description}\n\nPower Limit: ${profile.powerLimit}W`,
      action: () => {
        applyProfileMutation.mutate({ profileName });
        setConfirmDialog((prev) => ({ ...prev, open: false }));
      },
    });
  };

  // Reset to defaults
  const resetToDefaults = () => {
    setConfirmDialog({
      open: true,
      title: "Reset to Defaults",
      description: "This will reset power limit to default and enable automatic fan control. Continue?",
      action: () => {
        resetToDefaultsMutation.mutate();
        setConfirmDialog((prev) => ({ ...prev, open: false }));
      },
    });
  };

  // Toggle manual fan
  const toggleManualFan = (enabled: boolean) => {
    if (!enabled) {
      resetFanAutoMutation.mutate({ gpuIndex: 0 });
    } else {
      setManualFan(true);
    }
  };

  // Get temperature color
  const getTempColor = (temp: number) => {
    if (temp < 60) return "text-green-400";
    if (temp < 75) return "text-yellow-400";
    return "text-red-400";
  };

  // Get power utilization percentage
  const currentPower = powerState?.currentPower ?? 0;
  const currentPowerLimit = powerState?.powerLimit ?? 250;
  const powerUtilization = (currentPower / currentPowerLimit) * 100;

  const isLoading = powerStateQuery.isLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Zap className="w-8 h-8 text-orange-500" />
            Power Management
          </h1>
          <p className="text-gray-400 mt-1">
            GPU power limits, thermal profiles, and fan control
            {powerStateQuery.data?.source && (
              <span className="ml-2 text-xs text-muted-foreground">
                (Source: {powerStateQuery.data.source})
              </span>
            )}
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={resetToDefaults}
          disabled={resetToDefaultsMutation.isPending}
        >
          {resetToDefaultsMutation.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <RotateCcw className="w-4 h-4 mr-2" />
          )}
          Reset to Defaults
        </Button>
      </div>

      {/* Current Status */}
      <div className="grid grid-cols-4 gap-4">
        <GlassCard className="p-4">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <Zap className="w-4 h-4" /> Power Draw
          </div>
          {isLoading ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          ) : (
            <>
              <div className="text-2xl font-bold text-white">
                {currentPower.toFixed(0)}W
              </div>
              <div className="text-sm text-gray-500">
                of {currentPowerLimit}W ({powerUtilization.toFixed(0)}%)
              </div>
              <div className="mt-2 h-2 bg-black/50 rounded-full overflow-hidden">
                <motion.div
                  className={cn(
                    "h-full",
                    powerUtilization > 90 ? "bg-red-500" : powerUtilization > 70 ? "bg-yellow-500" : "bg-green-500"
                  )}
                  initial={{ width: 0 }}
                  animate={{ width: `${powerUtilization}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </>
          )}
        </GlassCard>

        <GlassCard className="p-4">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <Thermometer className="w-4 h-4" /> Temperature
          </div>
          {isLoading ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          ) : (
            <>
              <div className={cn("text-2xl font-bold", getTempColor(powerState?.temperature ?? 0))}>
                {(powerState?.temperature ?? 0).toFixed(0)}°C
              </div>
              <div className="text-sm text-gray-500">
                {(powerState?.temperature ?? 0) < 60
                  ? "Optimal"
                  : (powerState?.temperature ?? 0) < 75
                    ? "Elevated"
                    : "High"}
              </div>
              {powerState?.throttleReason && (
                <Badge variant="outline" className="mt-2 text-yellow-400 border-yellow-400/30">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Throttling
                </Badge>
              )}
            </>
          )}
        </GlassCard>

        <GlassCard className="p-4">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <Fan className="w-4 h-4" /> Fan Speed
          </div>
          {isLoading ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          ) : (
            <>
              <div className="text-2xl font-bold text-white">
                {(powerState?.fanSpeed ?? 0).toFixed(0)}%
              </div>
              <div className="text-sm text-gray-500">
                {powerState?.fanMode === "manual" ? "Manual" : "Auto"}
              </div>
            </>
          )}
        </GlassCard>

        <GlassCard className="p-4">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <Activity className="w-4 h-4" /> Performance State
          </div>
          {isLoading ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          ) : (
            <>
              <div className="text-2xl font-bold text-white">
                {powerState?.performanceState ?? "P0"}
              </div>
              <div className="text-sm text-gray-500">
                {powerState?.performanceState === "P0" ? "Maximum" : "Power Saving"}
              </div>
            </>
          )}
        </GlassCard>
      </div>

      {/* Main Controls */}
      <div className="grid grid-cols-2 gap-6">
        {/* Power Limit Control */}
        <GlassCard className="p-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-orange-500" />
            Power Limit
          </h3>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-400">Target Power Limit</span>
                <span className="text-white font-bold">{powerLimit}W</span>
              </div>
              <Slider
                value={[powerLimit]}
                onValueChange={([value]) => setPowerLimit(value)}
                min={powerState?.minPowerLimit ?? 100}
                max={powerState?.maxPowerLimit ?? 300}
                step={10}
                className="my-4"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>{powerState?.minPowerLimit ?? 100}W (Min)</span>
                <span>{powerState?.defaultPowerLimit ?? 250}W (Default)</span>
                <span>{powerState?.maxPowerLimit ?? 300}W (Max)</span>
              </div>
            </div>
            <Button 
              onClick={applyPowerLimit} 
              className="w-full"
              disabled={setPowerLimitMutation.isPending}
            >
              {setPowerLimitMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Zap className="w-4 h-4 mr-2" />
              )}
              Apply Power Limit
            </Button>
          </div>
        </GlassCard>

        {/* Fan Control */}
        <GlassCard className="p-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Fan className="w-5 h-5 text-cyan-500" />
            Fan Control
          </h3>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Manual Fan Control</span>
              <Switch
                checked={manualFan}
                onCheckedChange={toggleManualFan}
                disabled={resetFanAutoMutation.isPending}
              />
            </div>
            <div className={cn(!manualFan && "opacity-50 pointer-events-none")}>
              <div className="flex justify-between mb-2">
                <span className="text-gray-400">Target Fan Speed</span>
                <span className="text-white font-bold">{fanSpeed}%</span>
              </div>
              <Slider
                value={[fanSpeed]}
                onValueChange={([value]) => setFanSpeed(value)}
                min={20}
                max={100}
                step={5}
                className="my-4"
                disabled={!manualFan}
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>20% (Quiet)</span>
                <span>60% (Balanced)</span>
                <span>100% (Max)</span>
              </div>
            </div>
            <Button
              onClick={applyFanSpeed}
              className="w-full"
              disabled={!manualFan || setFanSpeedMutation.isPending}
            >
              {setFanSpeedMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Fan className="w-4 h-4 mr-2" />
              )}
              Apply Fan Speed
            </Button>
          </div>
        </GlassCard>
      </div>

      {/* Thermal Profiles */}
      <GlassCard className="p-6">
        <h3 className="text-lg font-bold text-white mb-4">Thermal Profiles</h3>
        {profilesQuery.isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-4">
            {thermalProfiles.map((profile) => (
              <div
                key={profile.name}
                className={cn(
                  "p-4 rounded-lg border cursor-pointer transition-all",
                  selectedProfile === profile.name
                    ? "bg-primary/10 border-primary"
                    : "bg-white/5 border-white/10 hover:border-white/30"
                )}
                onClick={() => applyProfile(profile.name)}
              >
                <div className="flex items-center gap-2 mb-2">
                  <ProfileIcon name={profile.name} />
                  <span className="font-bold text-white">{profile.name}</span>
                </div>
                <div className="text-sm text-gray-400 mb-2">{profile.description}</div>
                <div className="text-xs text-gray-500">
                  Power Limit: {profile.powerLimit}W
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {/* Power History Chart */}
      <GlassCard className="p-6">
        <h3 className="text-lg font-bold text-white mb-4">Power & Temperature History</h3>
        {historyQuery.isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={powerHistory}>
              <defs>
                <linearGradient id="powerGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="time" stroke="#666" fontSize={10} />
              <YAxis yAxisId="power" stroke="#f97316" fontSize={10} />
              <YAxis yAxisId="temp" orientation="right" stroke="#06b6d4" fontSize={10} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1a1a1a",
                  border: "1px solid #333",
                  borderRadius: "8px",
                }}
              />
              <Area
                yAxisId="power"
                type="monotone"
                dataKey="power"
                stroke="#f97316"
                fill="url(#powerGradient)"
                name="Power (W)"
              />
              <Area
                yAxisId="temp"
                type="monotone"
                dataKey="temp"
                stroke="#06b6d4"
                fill="url(#tempGradient)"
                name="Temp (°C)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </GlassCard>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog((prev) => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              {confirmDialog.title}
            </DialogTitle>
            <DialogDescription className="whitespace-pre-line">
              {confirmDialog.description}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog((prev) => ({ ...prev, open: false }))}>
              Cancel
            </Button>
            <Button onClick={confirmDialog.action}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
