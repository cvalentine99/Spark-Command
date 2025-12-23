import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs/promises";

const execAsync = promisify(exec);

// Input sanitization helpers to prevent command injection
function sanitizeTimestamp(input: string): string | null {
  // Only allow ISO 8601 timestamps or relative time formats like "1 hour ago"
  const isoPattern = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/;
  const relativePattern = /^\d+\s+(second|minute|hour|day|week|month)s?\s+ago$/i;
  if (isoPattern.test(input) || relativePattern.test(input)) {
    return input;
  }
  return null;
}

function sanitizeServiceName(input: string): string | null {
  // Only allow alphanumeric, hyphens, underscores, and dots
  const servicePattern = /^[a-zA-Z0-9_.-]+$/;
  if (servicePattern.test(input) && input.length <= 64) {
    return input;
  }
  return null;
}

function sanitizeNumber(input: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.floor(input)));
}

// Log entry schema
const LogEntrySchema = z.object({
  timestamp: z.string(),
  level: z.enum(["error", "warning", "info", "debug", "notice"]),
  service: z.string(),
  message: z.string(),
  raw: z.string(),
});

type LogEntry = z.infer<typeof LogEntrySchema>;

// Parse journalctl JSON output
function parseJournalEntry(entry: any): LogEntry {
  const priority = parseInt(entry.PRIORITY || "6");
  let level: LogEntry["level"] = "info";
  if (priority <= 3) level = "error";
  else if (priority === 4) level = "warning";
  else if (priority === 5) level = "notice";
  else if (priority >= 7) level = "debug";

  return {
    timestamp: entry.__REALTIME_TIMESTAMP
      ? new Date(parseInt(entry.__REALTIME_TIMESTAMP) / 1000).toISOString()
      : new Date().toISOString(),
    level,
    service: entry.SYSLOG_IDENTIFIER || entry._SYSTEMD_UNIT || "system",
    message: entry.MESSAGE || "",
    raw: JSON.stringify(entry),
  };
}

// Parse syslog line
function parseSyslogLine(line: string): LogEntry | null {
  // Format: "Dec 23 12:34:56 hostname service[pid]: message"
  const match = line.match(
    /^(\w+\s+\d+\s+\d+:\d+:\d+)\s+(\S+)\s+(\S+?)(?:\[\d+\])?:\s*(.*)$/
  );
  if (!match) return null;

  const [, timestamp, , service, message] = match;
  let level: LogEntry["level"] = "info";
  const lowerMsg = message.toLowerCase();
  if (lowerMsg.includes("error") || lowerMsg.includes("fail")) level = "error";
  else if (lowerMsg.includes("warn")) level = "warning";
  else if (lowerMsg.includes("debug")) level = "debug";

  return {
    timestamp: new Date().toISOString(), // Approximate
    level,
    service: service.replace(/\[\d+\]$/, ""),
    message,
    raw: line,
  };
}

// Simulated logs for demo mode
function generateSimulatedLogs(
  count: number,
  services?: string[],
  levels?: string[]
): LogEntry[] {
  const allServices = [
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
  ];
  const allLevels: LogEntry["level"][] = [
    "error",
    "warning",
    "info",
    "debug",
    "notice",
  ];

  const messages: Record<string, string[]> = {
    "nvidia-persistenced": [
      "GPU 0 initialized successfully",
      "Persistence mode enabled",
      "Driver version 550.54.15 loaded",
      "ECC memory check passed",
      "Power management initialized",
    ],
    docker: [
      "Container dgx-spark-cc started",
      "Image pulled successfully",
      "Network bridge configured",
      "Volume mounted at /data",
      "Health check passed",
    ],
    "spark-master": [
      "Master started at spark://localhost:7077",
      "Worker registered: worker-1",
      "Application submitted: app-001",
      "Job completed successfully",
      "Executor allocated: 4 cores, 8GB memory",
    ],
    "spark-worker": [
      "Worker started with 20 cores",
      "Connected to master",
      "Executor launched for app-001",
      "Task completed: stage 1, partition 0",
      "Shuffle write: 256MB",
    ],
    kernel: [
      "NVRM: GPU at PCI:0000:01:00.0 initialized",
      "Memory: 128GB available",
      "CPU: 20 cores online",
      "Thermal zone 0: temperature 45C",
      "NVMe: Samsung 980 PRO detected",
    ],
    systemd: [
      "Started NVIDIA Persistence Daemon",
      "Started Docker Application Container Engine",
      "Reached target Multi-User System",
      "Started OpenSSH server daemon",
      "Started System Logging Service",
    ],
  };

  const logs: LogEntry[] = [];
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const service =
      services && services.length > 0
        ? services[Math.floor(Math.random() * services.length)]
        : allServices[Math.floor(Math.random() * allServices.length)];

    const level =
      levels && levels.length > 0
        ? (levels[Math.floor(Math.random() * levels.length)] as LogEntry["level"])
        : allLevels[Math.floor(Math.random() * allLevels.length)];

    const serviceMessages = messages[service] || [
      "Service operation completed",
      "Processing request",
      "Status check passed",
    ];
    const message =
      serviceMessages[Math.floor(Math.random() * serviceMessages.length)];

    logs.push({
      timestamp: new Date(now - i * 1000 * Math.random() * 60).toISOString(),
      level,
      service,
      message:
        level === "error"
          ? `Error: ${message}`
          : level === "warning"
            ? `Warning: ${message}`
            : message,
      raw: `${new Date().toISOString()} ${service}: ${message}`,
    });
  }

  return logs.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

export const logsRouter = router({
  // Get recent logs
  getLogs: publicProcedure
    .input(
      z.object({
        limit: z.number().min(10).max(1000).default(100),
        services: z.array(z.string()).optional(),
        levels: z
          .array(z.enum(["error", "warning", "info", "debug", "notice"]))
          .optional(),
        since: z.string().optional(), // ISO timestamp
        search: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const { limit, services, levels, since, search } = input;

      try {
        // Try journalctl first - sanitize all inputs to prevent command injection
        const safeLimit = sanitizeNumber(limit, 10, 1000);
        const args: string[] = ['journalctl', '--output=json', `-n`, `${safeLimit}`, '--no-pager'];
        
        if (since) {
          const safeSince = sanitizeTimestamp(since);
          if (safeSince) {
            args.push(`--since=${safeSince}`);
          }
        }
        
        if (services && services.length > 0) {
          for (const service of services) {
            const safeService = sanitizeServiceName(service);
            if (safeService) {
              args.push('-t', safeService);
            }
          }
        }

        const { stdout } = await execAsync(args.join(' '), { timeout: 5000 });
        const lines = stdout.trim().split("\n").filter(Boolean);
        let logs = lines
          .map((line) => {
            try {
              return parseJournalEntry(JSON.parse(line));
            } catch {
              return null;
            }
          })
          .filter((log): log is LogEntry => log !== null);

        // Filter by level
        if (levels && levels.length > 0) {
          logs = logs.filter((log) => levels.includes(log.level));
        }

        // Filter by search
        if (search) {
          const searchLower = search.toLowerCase();
          logs = logs.filter(
            (log) =>
              log.message.toLowerCase().includes(searchLower) ||
              log.service.toLowerCase().includes(searchLower)
          );
        }

        return { logs, source: "journalctl" };
      } catch (error) {
        // Fall back to syslog
        try {
          const content = await fs.readFile("/var/log/syslog", "utf-8");
          const lines = content.trim().split("\n").slice(-limit);
          let logs = lines
            .map(parseSyslogLine)
            .filter((log): log is LogEntry => log !== null);

          if (levels && levels.length > 0) {
            logs = logs.filter((log) => levels.includes(log.level));
          }

          if (search) {
            const searchLower = search.toLowerCase();
            logs = logs.filter(
              (log) =>
                log.message.toLowerCase().includes(searchLower) ||
                log.service.toLowerCase().includes(searchLower)
            );
          }

          return { logs: logs.reverse(), source: "syslog" };
        } catch {
          // Return simulated logs
          return {
            logs: generateSimulatedLogs(limit, services, levels),
            source: "simulated",
          };
        }
      }
    }),

  // Get available services
  getServices: publicProcedure.query(async () => {
    try {
      const { stdout } = await execAsync(
        "journalctl --field=SYSLOG_IDENTIFIER 2>/dev/null | head -50",
        { timeout: 3000 }
      );
      const services = stdout
        .trim()
        .split("\n")
        .filter(Boolean)
        .sort();
      return { services, source: "journalctl" };
    } catch {
      return {
        services: [
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
        ],
        source: "default",
      };
    }
  }),

  // Get log statistics
  getStats: publicProcedure.query(async () => {
    try {
      const { stdout: errorCount } = await execAsync(
        'journalctl -p err --since "1 hour ago" --no-pager -q | wc -l',
        { timeout: 3000 }
      );
      const { stdout: warnCount } = await execAsync(
        'journalctl -p warning --since "1 hour ago" --no-pager -q | wc -l',
        { timeout: 3000 }
      );

      return {
        errorsLastHour: parseInt(errorCount.trim()) || 0,
        warningsLastHour: parseInt(warnCount.trim()) || 0,
        source: "journalctl",
      };
    } catch {
      return {
        errorsLastHour: Math.floor(Math.random() * 5),
        warningsLastHour: Math.floor(Math.random() * 15),
        source: "simulated",
      };
    }
  }),

  // Stream logs (poll-based for compatibility)
  streamLogs: publicProcedure
    .input(
      z.object({
        lastTimestamp: z.string().optional(),
        services: z.array(z.string()).optional(),
        levels: z
          .array(z.enum(["error", "warning", "info", "debug", "notice"]))
          .optional(),
      })
    )
    .query(async ({ input }) => {
      const { lastTimestamp, services, levels } = input;

      try {
        // Sanitize inputs to prevent command injection
        const args: string[] = ['journalctl', '--output=json', '-n', '20', '--no-pager'];
        
        if (lastTimestamp) {
          const safeSince = sanitizeTimestamp(lastTimestamp);
          if (safeSince) {
            args.push(`--since=${safeSince}`);
          }
        }

        const { stdout } = await execAsync(args.join(' '), { timeout: 3000 });
        const lines = stdout.trim().split("\n").filter(Boolean);
        let logs = lines
          .map((line) => {
            try {
              return parseJournalEntry(JSON.parse(line));
            } catch {
              return null;
            }
          })
          .filter((log): log is LogEntry => log !== null);

        if (services && services.length > 0) {
          logs = logs.filter((log) => services.includes(log.service));
        }

        if (levels && levels.length > 0) {
          logs = logs.filter((log) => levels.includes(log.level));
        }

        return { logs, hasNew: logs.length > 0 };
      } catch {
        // Generate a few new simulated logs
        const newLogs = generateSimulatedLogs(
          Math.floor(Math.random() * 3) + 1,
          services,
          levels
        );
        return { logs: newLogs, hasNew: true };
      }
    }),
});
