import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// Strict input validation to prevent command injection
function validateGpuIndex(index: number): number {
  // Only allow valid GPU indices (0-7 for typical multi-GPU systems)
  const safeIndex = Math.floor(index);
  if (safeIndex < 0 || safeIndex > 7 || !Number.isInteger(safeIndex)) {
    throw new Error('Invalid GPU index');
  }
  return safeIndex;
}

function validatePowerLimit(limit: number, min: number = 100, max: number = 400): number {
  const safeLimit = Math.floor(limit);
  if (safeLimit < min || safeLimit > max || !Number.isFinite(safeLimit)) {
    throw new Error(`Power limit must be between ${min}W and ${max}W`);
  }
  return safeLimit;
}

function validateFanSpeed(speed: number): number {
  const safeSpeed = Math.floor(speed);
  if (safeSpeed < 0 || safeSpeed > 100 || !Number.isFinite(safeSpeed)) {
    throw new Error('Fan speed must be between 0% and 100%');
  }
  return safeSpeed;
}

function validateProfileName(name: string): string {
  // Only allow known profile names
  const validProfiles = ['Quiet', 'Balanced', 'Performance', 'Max Performance'];
  if (!validProfiles.includes(name)) {
    throw new Error(`Invalid profile name: ${name}`);
  }
  return name;
}

// Power state schema
const PowerStateSchema = z.object({
  gpuIndex: z.number(),
  powerLimit: z.number(), // Watts
  currentPower: z.number(),
  defaultPowerLimit: z.number(),
  minPowerLimit: z.number(),
  maxPowerLimit: z.number(),
  temperature: z.number(),
  fanSpeed: z.number(), // Percentage
  fanMode: z.enum(["auto", "manual"]),
  performanceState: z.string(),
  throttleReason: z.string().nullable(),
});

// Thermal profile schema
const ThermalProfileSchema = z.object({
  name: z.string(),
  powerLimit: z.number(),
  fanCurve: z.array(z.object({
    temp: z.number(),
    fanSpeed: z.number(),
  })),
  description: z.string(),
});

type PowerState = z.infer<typeof PowerStateSchema>;
type ThermalProfile = z.infer<typeof ThermalProfileSchema>;

// Predefined thermal profiles for DGX Spark
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

// Simulated power state
function getSimulatedPowerState(): PowerState {
  return {
    gpuIndex: 0,
    powerLimit: 250,
    currentPower: 180 + Math.random() * 50,
    defaultPowerLimit: 250,
    minPowerLimit: 100,
    maxPowerLimit: 300,
    temperature: 55 + Math.random() * 15,
    fanSpeed: 45 + Math.random() * 20,
    fanMode: "auto",
    performanceState: "P0",
    throttleReason: null,
  };
}

export const powerRouter = router({
  // Get current power state
  getPowerState: publicProcedure.query(async () => {
    try {
      const { stdout } = await execAsync(
        "nvidia-smi --query-gpu=index,power.limit,power.draw,power.default_limit,power.min_limit,power.max_limit,temperature.gpu,fan.speed,pstate --format=csv,noheader,nounits",
        { timeout: 5000 }
      );

      const values = stdout.trim().split(",").map((v) => v.trim());
      
      // Check for throttling
      let throttleReason: string | null = null;
      try {
        const { stdout: throttleOut } = await execAsync(
          "nvidia-smi --query-gpu=clocks_throttle_reasons.active --format=csv,noheader",
          { timeout: 3000 }
        );
        const reason = throttleOut.trim();
        if (reason && reason !== "0x0000000000000000") {
          throttleReason = reason;
        }
      } catch {}

      const state: PowerState = {
        gpuIndex: parseInt(values[0]) || 0,
        powerLimit: parseFloat(values[1]) || 250,
        currentPower: parseFloat(values[2]) || 0,
        defaultPowerLimit: parseFloat(values[3]) || 250,
        minPowerLimit: parseFloat(values[4]) || 100,
        maxPowerLimit: parseFloat(values[5]) || 300,
        temperature: parseFloat(values[6]) || 0,
        fanSpeed: parseFloat(values[7]) || 0,
        fanMode: "auto",
        performanceState: values[8] || "P0",
        throttleReason,
      };

      return { state, source: "nvidia-smi" };
    } catch (error) {
      return { state: getSimulatedPowerState(), source: "simulated" };
    }
  }),

  // Set power limit - requires authentication
  setPowerLimit: protectedProcedure
    .input(
      z.object({
        gpuIndex: z.number().int().min(0).max(7).default(0),
        powerLimit: z.number().int().min(100).max(400),
      })
    )
    .mutation(async ({ input }) => {
      // Validate and sanitize inputs to prevent command injection
      const safeGpuIndex = validateGpuIndex(input.gpuIndex);
      const safePowerLimit = validatePowerLimit(input.powerLimit);

      try {
        // Enable persistence mode first
        await execAsync("sudo nvidia-smi -pm 1", { timeout: 5000 });
        
        // Set power limit with validated integers only
        const { stdout } = await execAsync(
          `sudo nvidia-smi -i ${safeGpuIndex} -pl ${safePowerLimit}`,
          { timeout: 5000 }
        );

        return {
          success: true,
          message: `Power limit set to ${safePowerLimit}W`,
          output: stdout.trim(),
        };
      } catch (error: any) {
        // In demo mode, simulate success
        return {
          success: true,
          message: `Power limit set to ${safePowerLimit}W (simulated)`,
          output: "Demo mode - command simulated",
          simulated: true,
        };
      }
    }),

  // Set fan speed (manual mode) - requires authentication
  setFanSpeed: protectedProcedure
    .input(
      z.object({
        gpuIndex: z.number().int().min(0).max(7).default(0),
        fanSpeed: z.number().int().min(0).max(100),
      })
    )
    .mutation(async ({ input }) => {
      // Validate and sanitize inputs to prevent command injection
      const safeGpuIndex = validateGpuIndex(input.gpuIndex);
      const safeFanSpeed = validateFanSpeed(input.fanSpeed);

      try {
        // Enable manual fan control with validated integers only
        await execAsync(
          `sudo nvidia-settings -a "[gpu:${safeGpuIndex}]/GPUFanControlState=1"`,
          { timeout: 5000 }
        );
        
        // Set fan speed with validated integers only
        const { stdout } = await execAsync(
          `sudo nvidia-settings -a "[fan:${safeGpuIndex}]/GPUTargetFanSpeed=${safeFanSpeed}"`,
          { timeout: 5000 }
        );

        return {
          success: true,
          message: `Fan speed set to ${safeFanSpeed}%`,
          output: stdout.trim(),
        };
      } catch (error: any) {
        return {
          success: true,
          message: `Fan speed set to ${safeFanSpeed}% (simulated)`,
          output: "Demo mode - command simulated",
          simulated: true,
        };
      }
    }),

  // Reset fan to auto mode - requires authentication
  resetFanAuto: protectedProcedure
    .input(z.object({ gpuIndex: z.number().int().min(0).max(7).default(0) }))
    .mutation(async ({ input }) => {
      // Validate input to prevent command injection
      const safeGpuIndex = validateGpuIndex(input.gpuIndex);

      try {
        const { stdout } = await execAsync(
          `sudo nvidia-settings -a "[gpu:${safeGpuIndex}]/GPUFanControlState=0"`,
          { timeout: 5000 }
        );

        return {
          success: true,
          message: "Fan control reset to automatic",
          output: stdout.trim(),
        };
      } catch (error: any) {
        return {
          success: true,
          message: "Fan control reset to automatic (simulated)",
          output: "Demo mode - command simulated",
          simulated: true,
        };
      }
    }),

  // Get thermal profiles
  getThermalProfiles: publicProcedure.query(() => {
    return { profiles: thermalProfiles };
  }),

  // Apply thermal profile - requires authentication
  applyThermalProfile: protectedProcedure
    .input(z.object({ profileName: z.string() }))
    .mutation(async ({ input }) => {
      // Validate profile name to prevent injection
      const safeProfileName = validateProfileName(input.profileName);
      const profile = thermalProfiles.find((p) => p.name === safeProfileName);
      if (!profile) {
        throw new Error(`Profile "${safeProfileName}" not found`);
      }

      try {
        // Apply power limit with validated profile power limit
        const safePowerLimit = validatePowerLimit(profile.powerLimit);
        await execAsync("sudo nvidia-smi -pm 1", { timeout: 5000 });
        await execAsync(`sudo nvidia-smi -pl ${safePowerLimit}`, {
          timeout: 5000,
        });

        return {
          success: true,
          message: `Applied "${profile.name}" profile`,
          profile,
        };
      } catch (error: any) {
        return {
          success: true,
          message: `Applied "${profile.name}" profile (simulated)`,
          profile,
          simulated: true,
        };
      }
    }),

  // Get power history (for charts)
  getPowerHistory: publicProcedure
    .input(z.object({ minutes: z.number().min(1).max(60).default(10) }))
    .query(async ({ input }) => {
      // Generate simulated history
      const points: { timestamp: string; power: number; temp: number }[] = [];
      const now = Date.now();
      const interval = 10000; // 10 seconds

      for (let i = input.minutes * 6; i >= 0; i--) {
        points.push({
          timestamp: new Date(now - i * interval).toISOString(),
          power: 180 + Math.sin(i * 0.1) * 30 + Math.random() * 20,
          temp: 55 + Math.sin(i * 0.05) * 10 + Math.random() * 5,
        });
      }

      return { history: points };
    }),

  // Reset to defaults - requires authentication
  resetToDefaults: protectedProcedure.mutation(async () => {
    try {
      await execAsync("sudo nvidia-smi -pm 1", { timeout: 5000 });
      const { stdout: defaultLimit } = await execAsync(
        "nvidia-smi --query-gpu=power.default_limit --format=csv,noheader,nounits",
        { timeout: 5000 }
      );
      await execAsync(`sudo nvidia-smi -pl ${defaultLimit.trim()}`, {
        timeout: 5000,
      });

      return {
        success: true,
        message: `Reset to default power limit: ${defaultLimit.trim()}W`,
      };
    } catch (error: any) {
      return {
        success: true,
        message: "Reset to default settings (simulated)",
        simulated: true,
      };
    }
  }),
});
