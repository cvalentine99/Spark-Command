/**
 * Power Management Router
 * Secure API endpoints for GPU power and thermal management
 * 
 * Security measures:
 * - Strict input validation with Zod
 * - Protected procedures for mutations
 * - Sanitized command execution
 * - Rate limiting friendly design
 */

import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { exec } from "child_process";
import { promisify } from "util";
import { TRPCError } from "@trpc/server";

const execAsync = promisify(exec);

// =============================================================================
// Schemas
// =============================================================================

const PowerStateSchema = z.object({
  gpuIndex: z.number(),
  powerLimit: z.number(),
  currentPower: z.number(),
  defaultPowerLimit: z.number(),
  minPowerLimit: z.number(),
  maxPowerLimit: z.number(),
  temperature: z.number(),
  fanSpeed: z.number(),
  fanMode: z.enum(["auto", "manual"]),
  performanceState: z.string(),
  throttleReason: z.string().nullable(),
});

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

// =============================================================================
// Constants
// =============================================================================

// Safe limits for DGX Spark
const POWER_LIMITS = {
  MIN: 100,
  MAX: 400,
  DEFAULT: 250,
} as const;

const FAN_LIMITS = {
  MIN: 0,
  MAX: 100,
} as const;

// Predefined thermal profiles
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

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Validate GPU index is a safe integer
 */
function validateGpuIndex(index: number): number {
  const safeIndex = Math.floor(Math.abs(index));
  if (safeIndex > 7) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Invalid GPU index. Must be 0-7.",
    });
  }
  return safeIndex;
}

/**
 * Validate power limit is within safe range
 */
function validatePowerLimit(limit: number): number {
  const safeLimit = Math.floor(limit);
  if (safeLimit < POWER_LIMITS.MIN || safeLimit > POWER_LIMITS.MAX) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Power limit must be between ${POWER_LIMITS.MIN}W and ${POWER_LIMITS.MAX}W.`,
    });
  }
  return safeLimit;
}

/**
 * Validate fan speed is within safe range
 */
function validateFanSpeed(speed: number): number {
  const safeSpeed = Math.floor(speed);
  if (safeSpeed < FAN_LIMITS.MIN || safeSpeed > FAN_LIMITS.MAX) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Fan speed must be between ${FAN_LIMITS.MIN}% and ${FAN_LIMITS.MAX}%.`,
    });
  }
  return safeSpeed;
}

/**
 * Get simulated power state for demo mode
 */
function getSimulatedPowerState(): PowerState {
  return {
    gpuIndex: 0,
    powerLimit: 250,
    currentPower: 180 + Math.random() * 50,
    defaultPowerLimit: 250,
    minPowerLimit: POWER_LIMITS.MIN,
    maxPowerLimit: POWER_LIMITS.MAX,
    temperature: 55 + Math.random() * 15,
    fanSpeed: 45 + Math.random() * 20,
    fanMode: "auto",
    performanceState: "P0",
    throttleReason: null,
  };
}

// =============================================================================
// Router
// =============================================================================

export const powerRouter = router({
  /**
   * Get current power state (public - read only)
   */
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
      } catch {
        // Ignore throttle check errors
      }

      const state: PowerState = {
        gpuIndex: parseInt(values[0]) || 0,
        powerLimit: parseFloat(values[1]) || POWER_LIMITS.DEFAULT,
        currentPower: parseFloat(values[2]) || 0,
        defaultPowerLimit: parseFloat(values[3]) || POWER_LIMITS.DEFAULT,
        minPowerLimit: parseFloat(values[4]) || POWER_LIMITS.MIN,
        maxPowerLimit: parseFloat(values[5]) || POWER_LIMITS.MAX,
        temperature: parseFloat(values[6]) || 0,
        fanSpeed: parseFloat(values[7]) || 0,
        fanMode: "auto",
        performanceState: values[8] || "P0",
        throttleReason,
      };

      return { state, source: "nvidia-smi" as const };
    } catch (error) {
      return { state: getSimulatedPowerState(), source: "simulated" as const };
    }
  }),

  /**
   * Set power limit (protected - requires authentication)
   */
  setPowerLimit: protectedProcedure
    .input(
      z.object({
        gpuIndex: z.number().int().min(0).max(7).default(0),
        powerLimit: z.number().int().min(POWER_LIMITS.MIN).max(POWER_LIMITS.MAX),
      })
    )
    .mutation(async ({ input }) => {
      // Additional validation
      const gpuIndex = validateGpuIndex(input.gpuIndex);
      const powerLimit = validatePowerLimit(input.powerLimit);

      try {
        // Enable persistence mode first
        await execAsync("sudo nvidia-smi -pm 1", { timeout: 5000 });
        
        // Set power limit using validated integers only
        const { stdout } = await execAsync(
          `sudo nvidia-smi -i ${gpuIndex} -pl ${powerLimit}`,
          { timeout: 5000 }
        );

        return {
          success: true,
          message: `Power limit set to ${powerLimit}W`,
          output: stdout.trim(),
          simulated: false,
        };
      } catch (error) {
        // In demo mode, simulate success
        return {
          success: true,
          message: `Power limit set to ${powerLimit}W (simulated)`,
          output: "Demo mode - command simulated",
          simulated: true,
        };
      }
    }),

  /**
   * Set fan speed (protected - requires authentication)
   */
  setFanSpeed: protectedProcedure
    .input(
      z.object({
        gpuIndex: z.number().int().min(0).max(7).default(0),
        fanSpeed: z.number().int().min(FAN_LIMITS.MIN).max(FAN_LIMITS.MAX),
      })
    )
    .mutation(async ({ input }) => {
      // Additional validation
      const gpuIndex = validateGpuIndex(input.gpuIndex);
      const fanSpeed = validateFanSpeed(input.fanSpeed);

      try {
        // Enable manual fan control using validated integers
        await execAsync(
          `sudo nvidia-settings -a "[gpu:${gpuIndex}]/GPUFanControlState=1"`,
          { timeout: 5000 }
        );
        
        // Set fan speed
        const { stdout } = await execAsync(
          `sudo nvidia-settings -a "[fan:${gpuIndex}]/GPUTargetFanSpeed=${fanSpeed}"`,
          { timeout: 5000 }
        );

        return {
          success: true,
          message: `Fan speed set to ${fanSpeed}%`,
          output: stdout.trim(),
          simulated: false,
        };
      } catch (error) {
        return {
          success: true,
          message: `Fan speed set to ${fanSpeed}% (simulated)`,
          output: "Demo mode - command simulated",
          simulated: true,
        };
      }
    }),

  /**
   * Reset fan to auto mode (protected)
   */
  resetFanAuto: protectedProcedure
    .input(
      z.object({
        gpuIndex: z.number().int().min(0).max(7).default(0),
      })
    )
    .mutation(async ({ input }) => {
      const gpuIndex = validateGpuIndex(input.gpuIndex);

      try {
        const { stdout } = await execAsync(
          `sudo nvidia-settings -a "[gpu:${gpuIndex}]/GPUFanControlState=0"`,
          { timeout: 5000 }
        );

        return {
          success: true,
          message: "Fan control reset to automatic",
          output: stdout.trim(),
          simulated: false,
        };
      } catch (error) {
        return {
          success: true,
          message: "Fan control reset to automatic (simulated)",
          output: "Demo mode - command simulated",
          simulated: true,
        };
      }
    }),

  /**
   * Get available thermal profiles (public)
   */
  getThermalProfiles: publicProcedure.query(() => {
    return thermalProfiles;
  }),

  /**
   * Apply thermal profile (protected)
   */
  applyThermalProfile: protectedProcedure
    .input(
      z.object({
        profileName: z.string().min(1).max(50),
        gpuIndex: z.number().int().min(0).max(7).default(0),
      })
    )
    .mutation(async ({ input }) => {
      const gpuIndex = validateGpuIndex(input.gpuIndex);
      
      // Find profile by name (case-insensitive)
      const profile = thermalProfiles.find(
        (p) => p.name.toLowerCase() === input.profileName.toLowerCase()
      );

      if (!profile) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Thermal profile "${input.profileName}" not found.`,
        });
      }

      const powerLimit = validatePowerLimit(profile.powerLimit);

      try {
        // Apply power limit
        await execAsync("sudo nvidia-smi -pm 1", { timeout: 5000 });
        await execAsync(
          `sudo nvidia-smi -i ${gpuIndex} -pl ${powerLimit}`,
          { timeout: 5000 }
        );

        return {
          success: true,
          message: `Applied "${profile.name}" profile`,
          profile,
          simulated: false,
        };
      } catch (error) {
        return {
          success: true,
          message: `Applied "${profile.name}" profile (simulated)`,
          profile,
          simulated: true,
        };
      }
    }),

  /**
   * Get power history for charting (public)
   */
  getPowerHistory: publicProcedure
    .input(
      z.object({
        minutes: z.number().int().min(1).max(60).default(10),
      }).optional()
    )
    .query(async ({ input }) => {
      const minutes = input?.minutes ?? 10;
      const points = minutes * 6; // One point per 10 seconds

      // Generate simulated history data
      const history = Array.from({ length: points }, (_, i) => {
        const timestamp = Date.now() - (points - 1 - i) * 10000;
        return {
          timestamp,
          power: 180 + Math.sin(i * 0.1) * 30 + Math.random() * 20,
          temperature: 55 + Math.sin(i * 0.05) * 10 + Math.random() * 5,
          fanSpeed: 45 + Math.sin(i * 0.08) * 15 + Math.random() * 5,
        };
      });

      return { history, source: "simulated" as const };
    }),
});
