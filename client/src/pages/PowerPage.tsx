import { useState, useEffect } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Save,
  Play,
  Volume2,
  Gauge,
  Flame,
  Snowflake,
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

// Types
interface PowerState {
  gpuIndex: number;
  powerLimit: number;
  currentPower: number;
  defaultPowerLimit: number;
  minPowerLimit: number;
  maxPowerLimit: number;
  temperature: number;
  fanSpeed: number;
  fanMode: "auto" | "manual";
  performanceState: string;
  throttleReason: string | null;
}

interface ThermalProfile {
  name: string;
  powerLimit: number;
  fanCurve: { temp: number; fanSpeed: number }[];
  description: string;
}

// Simulated data
const defaultPowerState: PowerState = {
  gpuIndex: 0,
  powerLimit: 250,
  currentPower: 195,
  defaultPowerLimit: 250,
  minPowerLimit: 100,
  maxPowerLimit: 300,
  temperature: 62,
  fanSpeed: 55,
  fanMode: "auto",
  performanceState: "P0",
  throttleReason: null,
};

const thermalProfiles: ThermalProfile[] = [
  {
    name: "Quiet",
    powerLimit: 150,
    fanCurve: [
      { temp: 40, fanSpeed: 30 },
      { temp: 50, fanSpeed: 40 },
      { temp: 60, fanSpeed: 50 },
      { temp: 70, fanSpeed: 60 },
      { temp: 80, fanSpeed: 80 },
    ],
    description: "Reduced power for minimal noise. Best for light workloads.",
  },
  {
    name: "Balanced",
    powerLimit: 200,
    fanCurve: [
      { temp: 40, fanSpeed: 35 },
      { temp: 50, fanSpeed: 45 },
      { temp: 60, fanSpeed: 60 },
      { temp: 70, fanSpeed: 75 },
      { temp: 80, fanSpeed: 90 },
    ],
    description: "Optimal balance between performance and acoustics.",
  },
  {
    name: "Performance",
    powerLimit: 250,
    fanCurve: [
      { temp: 40, fanSpeed: 50 },
      { temp: 50, fanSpeed: 60 },
      { temp: 60, fanSpeed: 75 },
      { temp: 70, fanSpeed: 90 },
      { temp: 80, fanSpeed: 100 },
    ],
    description: "Maximum performance with aggressive cooling.",
  },
  {
    name: "Max Performance",
    powerLimit: 300,
    fanCurve: [
      { temp: 40, fanSpeed: 60 },
      { temp: 50, fanSpeed: 75 },
      { temp: 60, fanSpeed: 85 },
      { temp: 70, fanSpeed: 95 },
      { temp: 80, fanSpeed: 100 },
    ],
    description: "Full power draw. Use for demanding AI workloads.",
  },
];

// Generate power history
function generatePowerHistory(minutes: number = 10) {
  const points = [];
  const now = Date.now();
  for (let i = minutes * 6; i >= 0; i--) {
    points.push({
      time: new Date(now - i * 10000).toLocaleTimeString(),
      power: 180 + Math.sin(i * 0.1) * 30 + Math.random() * 20,
      temp: 55 + Math.sin(i * 0.05) * 10 + Math.random() * 5,
    });
  }
  return points;
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
  const [powerState, setPowerState] = useState<PowerState>(defaultPowerState);
  const [powerLimit, setPowerLimit] = useState(250);
  const [fanSpeed, setFanSpeed] = useState(55);
  const [manualFan, setManualFan] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<string>("Balanced");
  const [powerHistory, setPowerHistory] = useState(generatePowerHistory());
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    action: () => void;
  }>({ open: false, title: "", description: "", action: () => {} });

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setPowerState((prev) => ({
        ...prev,
        currentPower: powerLimit * 0.7 + Math.random() * powerLimit * 0.2,
        temperature: 50 + (powerLimit / 300) * 30 + Math.random() * 5,
        fanSpeed: manualFan ? fanSpeed : 40 + (powerLimit / 300) * 40 + Math.random() * 10,
      }));

      setPowerHistory((prev) => {
        const newPoint = {
          time: new Date().toLocaleTimeString(),
          power: powerLimit * 0.7 + Math.random() * powerLimit * 0.2,
          temp: 50 + (powerLimit / 300) * 30 + Math.random() * 5,
        };
        return [...prev.slice(1), newPoint];
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [powerLimit, manualFan, fanSpeed]);

  // Apply power limit
  const applyPowerLimit = () => {
    setConfirmDialog({
      open: true,
      title: "Apply Power Limit",
      description: `Are you sure you want to set the GPU power limit to ${powerLimit}W? This may affect system performance and stability.`,
      action: () => {
        setPowerState((prev) => ({ ...prev, powerLimit }));
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
        setPowerState((prev) => ({ ...prev, fanSpeed, fanMode: "manual" }));
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
        setPowerLimit(profile.powerLimit);
        setSelectedProfile(profileName);
        setPowerState((prev) => ({
          ...prev,
          powerLimit: profile.powerLimit,
        }));
        setManualFan(false);
        setConfirmDialog((prev) => ({ ...prev, open: false }));
      },
    });
  };

  // Reset to defaults
  const resetToDefaults = () => {
    setConfirmDialog({
      open: true,
      title: "Reset to Defaults",
      description: "This will reset power limit to 250W and enable automatic fan control. Continue?",
      action: () => {
        setPowerLimit(250);
        setFanSpeed(55);
        setManualFan(false);
        setSelectedProfile("Performance");
        setPowerState(defaultPowerState);
        setConfirmDialog((prev) => ({ ...prev, open: false }));
      },
    });
  };

  // Get temperature color
  const getTempColor = (temp: number) => {
    if (temp < 60) return "text-green-400";
    if (temp < 75) return "text-yellow-400";
    return "text-red-400";
  };

  // Get power utilization percentage
  const powerUtilization = (powerState.currentPower / powerState.powerLimit) * 100;

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
          </p>
        </div>
        <Button variant="outline" onClick={resetToDefaults}>
          <RotateCcw className="w-4 h-4 mr-2" /> Reset to Defaults
        </Button>
      </div>

      {/* Current Status */}
      <div className="grid grid-cols-4 gap-4">
        <GlassCard className="p-4">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <Zap className="w-4 h-4" /> Power Draw
          </div>
          <div className="text-2xl font-bold text-white">
            {powerState.currentPower.toFixed(0)}W
          </div>
          <div className="text-sm text-gray-500">
            of {powerState.powerLimit}W ({powerUtilization.toFixed(0)}%)
          </div>
          <div className="mt-2 h-2 bg-black/50 rounded-full overflow-hidden">
            <motion.div
              className={`h-full ${powerUtilization > 90 ? "bg-red-500" : powerUtilization > 70 ? "bg-yellow-500" : "bg-green-500"}`}
              initial={{ width: 0 }}
              animate={{ width: `${powerUtilization}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <Thermometer className="w-4 h-4" /> Temperature
          </div>
          <div className={`text-2xl font-bold ${getTempColor(powerState.temperature)}`}>
            {powerState.temperature.toFixed(0)}°C
          </div>
          <div className="text-sm text-gray-500">
            {powerState.temperature < 60
              ? "Optimal"
              : powerState.temperature < 75
                ? "Elevated"
                : "High"}
          </div>
          {powerState.throttleReason && (
            <Badge variant="outline" className="mt-2 text-yellow-400 border-yellow-400/30">
              <AlertTriangle className="w-3 h-3 mr-1" /> Throttling
            </Badge>
          )}
        </GlassCard>

        <GlassCard className="p-4">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <Fan className="w-4 h-4" /> Fan Speed
          </div>
          <div className="text-2xl font-bold text-white">
            {powerState.fanSpeed.toFixed(0)}%
          </div>
          <div className="text-sm text-gray-500">
            Mode: {powerState.fanMode === "auto" ? "Automatic" : "Manual"}
          </div>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <Activity className="w-4 h-4" /> Performance State
          </div>
          <div className="text-2xl font-bold text-orange-400">
            {powerState.performanceState}
          </div>
          <div className="text-sm text-gray-500">
            {powerState.performanceState === "P0"
              ? "Maximum Performance"
              : "Power Saving"}
          </div>
        </GlassCard>
      </div>

      {/* Power & Temperature History */}
      <GlassCard className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">
          Power & Temperature History
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={powerHistory}>
              <defs>
                <linearGradient id="powerGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FF6B00" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#FF6B00" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="time" stroke="#666" tick={{ fill: "#666" }} />
              <YAxis
                yAxisId="power"
                stroke="#FF6B00"
                tick={{ fill: "#FF6B00" }}
                domain={[0, 350]}
                label={{ value: "Power (W)", angle: -90, position: "insideLeft", fill: "#FF6B00" }}
              />
              <YAxis
                yAxisId="temp"
                orientation="right"
                stroke="#3B82F6"
                tick={{ fill: "#3B82F6" }}
                domain={[30, 100]}
                label={{ value: "Temp (°C)", angle: 90, position: "insideRight", fill: "#3B82F6" }}
              />
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
                stroke="#FF6B00"
                fill="url(#powerGradient)"
                strokeWidth={2}
              />
              <Area
                yAxisId="temp"
                type="monotone"
                dataKey="temp"
                stroke="#3B82F6"
                fill="url(#tempGradient)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>

      <div className="grid grid-cols-2 gap-6">
        {/* Power Limit Control */}
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-orange-500" /> Power Limit
          </h3>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-400">Current Limit</span>
                <span className="text-white font-mono">{powerLimit}W</span>
              </div>
              <Slider
                value={[powerLimit]}
                onValueChange={([value]) => setPowerLimit(value)}
                min={powerState.minPowerLimit}
                max={powerState.maxPowerLimit}
                step={10}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>{powerState.minPowerLimit}W</span>
                <span>Default: {powerState.defaultPowerLimit}W</span>
                <span>{powerState.maxPowerLimit}W</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-black/30 rounded-lg">
              <div>
                <div className="text-sm text-gray-400">Estimated Performance</div>
                <div className="text-lg font-semibold text-white">
                  {((powerLimit / powerState.maxPowerLimit) * 100).toFixed(0)}%
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-400">Power Savings</div>
                <div className="text-lg font-semibold text-green-400">
                  {powerLimit < powerState.defaultPowerLimit
                    ? `${powerState.defaultPowerLimit - powerLimit}W`
                    : "0W"}
                </div>
              </div>
            </div>

            <Button onClick={applyPowerLimit} className="w-full bg-orange-600 hover:bg-orange-700">
              <Save className="w-4 h-4 mr-2" /> Apply Power Limit
            </Button>
          </div>
        </GlassCard>

        {/* Fan Control */}
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Fan className="w-5 h-5 text-blue-400" /> Fan Control
          </h3>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-white">Manual Fan Control</div>
                <div className="text-xs text-gray-500">
                  Override automatic thermal management
                </div>
              </div>
              <Switch checked={manualFan} onCheckedChange={setManualFan} />
            </div>

            <div className={manualFan ? "" : "opacity-50 pointer-events-none"}>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-400">Fan Speed</span>
                <span className="text-white font-mono">{fanSpeed}%</span>
              </div>
              <Slider
                value={[fanSpeed]}
                onValueChange={([value]) => setFanSpeed(value)}
                min={30}
                max={100}
                step={5}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span className="flex items-center gap-1">
                  <Snowflake className="w-3 h-3" /> Quiet
                </span>
                <span className="flex items-center gap-1">
                  <Flame className="w-3 h-3" /> Aggressive
                </span>
              </div>
            </div>

            <div className="p-3 bg-black/30 rounded-lg">
              <div className="text-sm text-gray-400 mb-2">Fan Curve Preview</div>
              <div className="flex items-end justify-between h-16 gap-1">
                {[40, 50, 60, 70, 80].map((temp) => {
                  const profile = thermalProfiles.find((p) => p.name === selectedProfile);
                  const point = profile?.fanCurve.find((c) => c.temp === temp);
                  const height = point ? (point.fanSpeed / 100) * 64 : 32;
                  return (
                    <div key={temp} className="flex flex-col items-center flex-1">
                      <div
                        className="w-full bg-blue-500/50 rounded-t"
                        style={{ height: `${height}px` }}
                      />
                      <span className="text-xs text-gray-500 mt-1">{temp}°</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <Button
              onClick={applyFanSpeed}
              disabled={!manualFan}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              <Save className="w-4 h-4 mr-2" /> Apply Fan Settings
            </Button>
          </div>
        </GlassCard>
      </div>

      {/* Thermal Profiles */}
      <GlassCard className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Thermal Profiles</h3>
        <div className="grid grid-cols-4 gap-4">
          {thermalProfiles.map((profile) => (
            <motion.div
              key={profile.name}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`p-4 rounded-lg border cursor-pointer transition-all ${
                selectedProfile === profile.name
                  ? "bg-orange-500/20 border-orange-500"
                  : "bg-black/30 border-white/10 hover:border-white/30"
              }`}
              onClick={() => applyProfile(profile.name)}
            >
              <div className="flex items-center gap-2 mb-2">
                <ProfileIcon name={profile.name} />
                <span className="font-semibold text-white">{profile.name}</span>
              </div>
              <div className="text-2xl font-bold text-orange-400 mb-1">
                {profile.powerLimit}W
              </div>
              <p className="text-xs text-gray-400 line-clamp-2">
                {profile.description}
              </p>
              {selectedProfile === profile.name && (
                <Badge className="mt-2 bg-orange-500/30 text-orange-400 border-orange-500/50">
                  Active
                </Badge>
              )}
            </motion.div>
          ))}
        </div>
      </GlassCard>

      {/* Warning Banner */}
      <GlassCard className="p-4 border-yellow-500/30 bg-yellow-500/5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-yellow-500">Power Management Warning</div>
            <p className="text-sm text-gray-400 mt-1">
              Modifying power limits and fan settings can affect system stability and hardware
              longevity. High power limits may cause thermal throttling, while low fan speeds
              can lead to overheating. Always monitor temperatures when making changes.
            </p>
          </div>
        </div>
      </GlassCard>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog((prev) => ({ ...prev, open }))}
      >
        <DialogContent className="bg-[#0a0a0a] border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">{confirmDialog.title}</DialogTitle>
            <DialogDescription className="text-gray-400 whitespace-pre-line">
              {confirmDialog.description}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDialog((prev) => ({ ...prev, open: false }))}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmDialog.action}
              className="bg-orange-600 hover:bg-orange-700"
            >
              <Play className="w-4 h-4 mr-2" /> Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
