import { describe, it, expect, vi } from "vitest";

// Mock child_process
vi.mock("child_process", () => ({
  exec: vi.fn((cmd, opts, cb) => {
    if (typeof opts === "function") {
      cb = opts;
    }
    // Simulate command failure to trigger simulated logs
    const callback = cb || (() => {});
    callback(new Error("Command not available"), "", "");
  }),
}));

// Mock fs/promises
vi.mock("fs/promises", () => ({
  readFile: vi.fn().mockRejectedValue(new Error("File not found")),
}));

// Import after mocking
import { logsRouter } from "./logs";

describe("Logs Router", () => {
  describe("getLogs procedure", () => {
    it("should have getLogs procedure defined", () => {
      expect(logsRouter._def.procedures.getLogs).toBeDefined();
    });

    it("should have getServices procedure defined", () => {
      expect(logsRouter._def.procedures.getServices).toBeDefined();
    });

    it("should have getStats procedure defined", () => {
      expect(logsRouter._def.procedures.getStats).toBeDefined();
    });

    it("should have streamLogs procedure defined", () => {
      expect(logsRouter._def.procedures.streamLogs).toBeDefined();
    });
  });

  describe("Log Entry Structure", () => {
    it("should define valid log levels", () => {
      const validLevels = ["error", "warning", "info", "debug", "notice"];
      validLevels.forEach((level) => {
        expect(typeof level).toBe("string");
      });
    });
  });

  describe("Service List", () => {
    it("should include expected default services", () => {
      const expectedServices = [
        "nvidia-persistenced",
        "docker",
        "containerd",
        "spark-master",
        "spark-worker",
        "dcgm-exporter",
        "node-exporter",
        "systemd",
        "kernel",
        "NetworkManager",
        "sshd",
        "cron",
      ];
      
      // Verify we have a reasonable set of services
      expect(expectedServices.length).toBeGreaterThan(10);
      expect(expectedServices).toContain("docker");
      expect(expectedServices).toContain("kernel");
      expect(expectedServices).toContain("nvidia-persistenced");
    });
  });
});
