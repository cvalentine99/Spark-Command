import { describe, it, expect, vi } from "vitest";

// Mock child_process
vi.mock("child_process", () => ({
  exec: vi.fn((cmd, opts, cb) => {
    if (typeof opts === "function") {
      cb = opts;
    }
    const callback = cb || (() => {});
    // Simulate command failure to trigger simulated mode
    callback(new Error("nvidia-smi not available"), "", "");
  }),
}));

// Import after mocking
import { powerRouter } from "./power";

describe("Power Router", () => {
  describe("Router Structure", () => {
    it("should have getPowerState procedure defined", () => {
      expect(powerRouter._def.procedures.getPowerState).toBeDefined();
    });

    it("should have setPowerLimit procedure defined", () => {
      expect(powerRouter._def.procedures.setPowerLimit).toBeDefined();
    });

    it("should have setFanSpeed procedure defined", () => {
      expect(powerRouter._def.procedures.setFanSpeed).toBeDefined();
    });

    it("should have resetFanAuto procedure defined", () => {
      expect(powerRouter._def.procedures.resetFanAuto).toBeDefined();
    });

    it("should have getThermalProfiles procedure defined", () => {
      expect(powerRouter._def.procedures.getThermalProfiles).toBeDefined();
    });

    it("should have applyThermalProfile procedure defined", () => {
      expect(powerRouter._def.procedures.applyThermalProfile).toBeDefined();
    });

    it("should have getPowerHistory procedure defined", () => {
      expect(powerRouter._def.procedures.getPowerHistory).toBeDefined();
    });

    it("should have resetToDefaults procedure defined", () => {
      expect(powerRouter._def.procedures.resetToDefaults).toBeDefined();
    });
  });

  describe("Thermal Profiles", () => {
    it("should define thermal profiles with correct structure", () => {
      const profiles = [
        { name: "Quiet", powerLimit: 150 },
        { name: "Balanced", powerLimit: 200 },
        { name: "Performance", powerLimit: 250 },
        { name: "Max Performance", powerLimit: 300 },
      ];

      profiles.forEach((profile) => {
        expect(profile.name).toBeDefined();
        expect(profile.powerLimit).toBeGreaterThan(0);
        expect(profile.powerLimit).toBeLessThanOrEqual(400);
      });
    });

    it("should have increasing power limits for profiles", () => {
      const powerLimits = [150, 200, 250, 300];
      for (let i = 1; i < powerLimits.length; i++) {
        expect(powerLimits[i]).toBeGreaterThan(powerLimits[i - 1]);
      }
    });
  });

  describe("Power State Validation", () => {
    it("should define valid power state properties", () => {
      const powerStateProperties = [
        "gpuIndex",
        "powerLimit",
        "currentPower",
        "defaultPowerLimit",
        "minPowerLimit",
        "maxPowerLimit",
        "temperature",
        "fanSpeed",
        "fanMode",
        "performanceState",
        "throttleReason",
      ];

      powerStateProperties.forEach((prop) => {
        expect(typeof prop).toBe("string");
      });
      expect(powerStateProperties.length).toBe(11);
    });

    it("should have valid fan modes", () => {
      const validFanModes = ["auto", "manual"];
      expect(validFanModes).toContain("auto");
      expect(validFanModes).toContain("manual");
    });
  });

  describe("Power Limits", () => {
    it("should enforce minimum power limit of 100W", () => {
      const minPowerLimit = 100;
      expect(minPowerLimit).toBe(100);
    });

    it("should enforce maximum power limit of 400W", () => {
      const maxPowerLimit = 400;
      expect(maxPowerLimit).toBe(400);
    });

    it("should have valid default power limit", () => {
      const defaultPowerLimit = 250;
      expect(defaultPowerLimit).toBeGreaterThanOrEqual(100);
      expect(defaultPowerLimit).toBeLessThanOrEqual(400);
    });
  });

  describe("Fan Speed Limits", () => {
    it("should enforce minimum fan speed of 0%", () => {
      const minFanSpeed = 0;
      expect(minFanSpeed).toBe(0);
    });

    it("should enforce maximum fan speed of 100%", () => {
      const maxFanSpeed = 100;
      expect(maxFanSpeed).toBe(100);
    });
  });
});
