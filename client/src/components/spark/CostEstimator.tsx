import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { 
  Calculator, 
  Cpu, 
  HardDrive, 
  Zap, 
  Clock,
  DollarSign,
  TrendingUp,
  Info,
  BarChart3
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ResourceConfig {
  executorMemory: string;
  executorCores: number;
  numExecutors: number;
  driverMemory: string;
  driverCores: number;
  enableRapids: boolean;
  estimatedDuration: number; // in minutes
}

interface CostBreakdown {
  cpuHours: number;
  gpuHours: number;
  memoryGBHours: number;
  totalCost: number;
  cpuCost: number;
  gpuCost: number;
  memoryCost: number;
}

// Cost rates (example rates - would be configurable in production)
const COST_RATES = {
  cpuPerHour: 0.05,      // $ per core-hour
  gpuPerHour: 2.50,      // $ per GPU-hour (Blackwell GPU)
  memoryPerGBHour: 0.01, // $ per GB-hour
};

const parseMemory = (mem: string): number => {
  const match = mem.match(/^(\d+)([gG])$/);
  return match ? parseInt(match[1]) : 8;
};

const calculateCost = (config: ResourceConfig): CostBreakdown => {
  const durationHours = config.estimatedDuration / 60;
  const executorMemoryGB = parseMemory(config.executorMemory);
  const driverMemoryGB = parseMemory(config.driverMemory);
  
  // CPU hours = (executor cores * num executors + driver cores) * duration
  const cpuHours = (config.executorCores * config.numExecutors + config.driverCores) * durationHours;
  
  // GPU hours = num executors * duration (if RAPIDS enabled)
  const gpuHours = config.enableRapids ? config.numExecutors * durationHours : 0;
  
  // Memory GB-hours = (executor memory * num executors + driver memory) * duration
  const memoryGBHours = (executorMemoryGB * config.numExecutors + driverMemoryGB) * durationHours;
  
  const cpuCost = cpuHours * COST_RATES.cpuPerHour;
  const gpuCost = gpuHours * COST_RATES.gpuPerHour;
  const memoryCost = memoryGBHours * COST_RATES.memoryPerGBHour;
  const totalCost = cpuCost + gpuCost + memoryCost;
  
  return {
    cpuHours,
    gpuHours,
    memoryGBHours,
    totalCost,
    cpuCost,
    gpuCost,
    memoryCost,
  };
};

interface CostEstimatorProps {
  initialConfig?: Partial<ResourceConfig>;
  onConfigChange?: (config: ResourceConfig) => void;
  compact?: boolean;
}

export function CostEstimator({ initialConfig, onConfigChange, compact = false }: CostEstimatorProps) {
  const [config, setConfig] = useState<ResourceConfig>({
    executorMemory: initialConfig?.executorMemory || '8g',
    executorCores: initialConfig?.executorCores || 4,
    numExecutors: initialConfig?.numExecutors || 2,
    driverMemory: initialConfig?.driverMemory || '4g',
    driverCores: initialConfig?.driverCores || 2,
    enableRapids: initialConfig?.enableRapids ?? true,
    estimatedDuration: initialConfig?.estimatedDuration || 60,
  });

  const cost = useMemo(() => calculateCost(config), [config]);

  const updateConfig = (updates: Partial<ResourceConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    onConfigChange?.(newConfig);
  };

  if (compact) {
    return (
      <div className="p-4 rounded-lg bg-gradient-to-br from-primary/10 to-purple-500/10 border border-primary/20">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Calculator className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm">Estimated Cost</span>
          </div>
          <div className="text-2xl font-display font-bold text-primary">
            ${cost.totalCost.toFixed(2)}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="p-2 rounded bg-black/20">
            <div className="text-muted-foreground">CPU</div>
            <div className="font-mono">{cost.cpuHours.toFixed(1)}h</div>
            <div className="text-primary">${cost.cpuCost.toFixed(2)}</div>
          </div>
          <div className="p-2 rounded bg-black/20">
            <div className="text-muted-foreground">GPU</div>
            <div className="font-mono">{cost.gpuHours.toFixed(1)}h</div>
            <div className="text-green-400">${cost.gpuCost.toFixed(2)}</div>
          </div>
          <div className="p-2 rounded bg-black/20">
            <div className="text-muted-foreground">Memory</div>
            <div className="font-mono">{cost.memoryGBHours.toFixed(0)}GB·h</div>
            <div className="text-blue-400">${cost.memoryCost.toFixed(2)}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Calculator className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-display font-bold">Resource Cost Estimator</h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration Panel */}
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-white/5 border border-white/10 space-y-4">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <Cpu className="h-4 w-4 text-muted-foreground" />
              Executor Configuration
            </h4>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Memory</label>
                <Select 
                  value={config.executorMemory} 
                  onValueChange={(v) => updateConfig({ executorMemory: v })}
                >
                  <SelectTrigger className="h-8 bg-black/20 border-white/10 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="4g">4 GB</SelectItem>
                    <SelectItem value="8g">8 GB</SelectItem>
                    <SelectItem value="16g">16 GB</SelectItem>
                    <SelectItem value="32g">32 GB</SelectItem>
                    <SelectItem value="64g">64 GB</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Cores</label>
                <Select 
                  value={String(config.executorCores)} 
                  onValueChange={(v) => updateConfig({ executorCores: parseInt(v) })}
                >
                  <SelectTrigger className="h-8 bg-black/20 border-white/10 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2">2 Cores</SelectItem>
                    <SelectItem value="4">4 Cores</SelectItem>
                    <SelectItem value="8">8 Cores</SelectItem>
                    <SelectItem value="10">10 Cores</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Number of Executors</label>
              <Select 
                value={String(config.numExecutors)} 
                onValueChange={(v) => updateConfig({ numExecutors: parseInt(v) })}
              >
                <SelectTrigger className="h-8 bg-black/20 border-white/10 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Executor</SelectItem>
                  <SelectItem value="2">2 Executors</SelectItem>
                  <SelectItem value="4">4 Executors</SelectItem>
                  <SelectItem value="6">6 Executors</SelectItem>
                  <SelectItem value="8">8 Executors</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-white/5 border border-white/10 space-y-4">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-muted-foreground" />
              Driver Configuration
            </h4>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Memory</label>
                <Select 
                  value={config.driverMemory} 
                  onValueChange={(v) => updateConfig({ driverMemory: v })}
                >
                  <SelectTrigger className="h-8 bg-black/20 border-white/10 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2g">2 GB</SelectItem>
                    <SelectItem value="4g">4 GB</SelectItem>
                    <SelectItem value="8g">8 GB</SelectItem>
                    <SelectItem value="16g">16 GB</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Cores</label>
                <Select 
                  value={String(config.driverCores)} 
                  onValueChange={(v) => updateConfig({ driverCores: parseInt(v) })}
                >
                  <SelectTrigger className="h-8 bg-black/20 border-white/10 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 Core</SelectItem>
                    <SelectItem value="2">2 Cores</SelectItem>
                    <SelectItem value="4">4 Cores</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-white/5 border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-green-400" />
                <span className="font-medium text-sm">RAPIDS GPU Acceleration</span>
              </div>
              <Switch
                checked={config.enableRapids}
                onCheckedChange={(checked) => updateConfig({ enableRapids: checked })}
              />
            </div>
            {config.enableRapids && (
              <p className="text-xs text-muted-foreground">
                Each executor will use 1 GPU from the Blackwell accelerator
              </p>
            )}
          </div>

          <div className="p-4 rounded-lg bg-white/5 border border-white/10 space-y-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">Estimated Duration</span>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={config.estimatedDuration}
                onChange={(e) => updateConfig({ estimatedDuration: parseInt(e.target.value) || 0 })}
                className="h-8 w-24 bg-black/20 border-white/10 text-xs"
                min={1}
              />
              <span className="text-xs text-muted-foreground">minutes</span>
            </div>
          </div>
        </div>

        {/* Cost Breakdown Panel */}
        <div className="space-y-4">
          <div className="p-6 rounded-lg bg-gradient-to-br from-primary/10 via-purple-500/10 to-green-500/10 border border-primary/20">
            <div className="text-center mb-6">
              <div className="text-sm text-muted-foreground mb-1">Estimated Total Cost</div>
              <div className="text-4xl font-display font-bold text-primary">
                ${cost.totalCost.toFixed(2)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                for {config.estimatedDuration} minute job
              </div>
            </div>

            <div className="space-y-3">
              {/* CPU Cost */}
              <div className="flex items-center justify-between p-3 rounded bg-black/20">
                <div className="flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-blue-400" />
                  <div>
                    <div className="text-sm font-medium">CPU Resources</div>
                    <div className="text-xs text-muted-foreground">
                      {cost.cpuHours.toFixed(1)} core-hours @ ${COST_RATES.cpuPerHour}/hr
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-blue-400">${cost.cpuCost.toFixed(2)}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {((cost.cpuCost / cost.totalCost) * 100).toFixed(0)}%
                  </div>
                </div>
              </div>

              {/* GPU Cost */}
              <div className={cn(
                "flex items-center justify-between p-3 rounded bg-black/20",
                !config.enableRapids && "opacity-50"
              )}>
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-green-400" />
                  <div>
                    <div className="text-sm font-medium">GPU Resources</div>
                    <div className="text-xs text-muted-foreground">
                      {cost.gpuHours.toFixed(1)} GPU-hours @ ${COST_RATES.gpuPerHour}/hr
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-green-400">${cost.gpuCost.toFixed(2)}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {cost.totalCost > 0 ? ((cost.gpuCost / cost.totalCost) * 100).toFixed(0) : 0}%
                  </div>
                </div>
              </div>

              {/* Memory Cost */}
              <div className="flex items-center justify-between p-3 rounded bg-black/20">
                <div className="flex items-center gap-2">
                  <HardDrive className="h-4 w-4 text-purple-400" />
                  <div>
                    <div className="text-sm font-medium">Memory Resources</div>
                    <div className="text-xs text-muted-foreground">
                      {cost.memoryGBHours.toFixed(0)} GB-hours @ ${COST_RATES.memoryPerGBHour}/hr
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-purple-400">${cost.memoryCost.toFixed(2)}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {((cost.memoryCost / cost.totalCost) * 100).toFixed(0)}%
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Resource Summary */}
          <div className="p-4 rounded-lg bg-white/5 border border-white/10">
            <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              Resource Summary
            </h4>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2 rounded bg-black/20">
                <div className="text-muted-foreground">Total Cores</div>
                <div className="font-mono font-bold">
                  {config.executorCores * config.numExecutors + config.driverCores}
                </div>
              </div>
              <div className="p-2 rounded bg-black/20">
                <div className="text-muted-foreground">Total Memory</div>
                <div className="font-mono font-bold">
                  {parseMemory(config.executorMemory) * config.numExecutors + parseMemory(config.driverMemory)} GB
                </div>
              </div>
              <div className="p-2 rounded bg-black/20">
                <div className="text-muted-foreground">GPUs Used</div>
                <div className="font-mono font-bold">
                  {config.enableRapids ? config.numExecutors : 0}
                </div>
              </div>
              <div className="p-2 rounded bg-black/20">
                <div className="text-muted-foreground">Cost/Hour</div>
                <div className="font-mono font-bold text-primary">
                  ${(cost.totalCost / (config.estimatedDuration / 60)).toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          {/* Info Note */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs">
            <Info className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-muted-foreground">
              Cost estimates are based on internal resource allocation rates. 
              Actual costs may vary based on cluster utilization and job efficiency.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CostEstimator;
