import { useState, useEffect, useRef } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  Search,
  RefreshCw,
  Download,
  Pause,
  Play,
  Filter,
  AlertCircle,
  AlertTriangle,
  Info,
  Bug,
  Bell,
  Trash2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Log entry type
interface LogEntry {
  timestamp: string;
  level: "error" | "warning" | "info" | "debug" | "notice";
  service: string;
  message: string;
  raw: string;
}

// Simulated logs for demo
function generateSimulatedLogs(count: number): LogEntry[] {
  const services = [
    "nvidia-persistenced",
    "docker",
    "spark-master",
    "spark-worker",
    "kernel",
    "systemd",
    "dcgm-exporter",
    "containerd",
  ];
  const levels: LogEntry["level"][] = ["error", "warning", "info", "debug", "notice"];
  
  const messages: Record<string, Record<LogEntry["level"], string[]>> = {
    "nvidia-persistenced": {
      info: ["GPU 0 initialized successfully", "Persistence mode enabled", "Driver loaded"],
      warning: ["GPU temperature elevated: 72°C", "Power draw near limit"],
      error: ["Failed to initialize GPU 1", "ECC error detected"],
      debug: ["Checking GPU state", "Memory allocation: 45GB"],
      notice: ["Configuration updated", "Service restart scheduled"],
    },
    docker: {
      info: ["Container started: dgx-spark-cc", "Image pulled", "Network configured"],
      warning: ["Container memory usage high", "Disk space low"],
      error: ["Container crashed: app-001", "Network unreachable"],
      debug: ["Health check running", "Volume mounted"],
      notice: ["Pruning unused images", "Updating container"],
    },
    "spark-master": {
      info: ["Master started at spark://localhost:7077", "Worker registered", "Job completed"],
      warning: ["Worker heartbeat delayed", "Memory pressure detected"],
      error: ["Worker disconnected", "Job failed: OutOfMemory"],
      debug: ["Scheduling task", "Executor status check"],
      notice: ["New application submitted", "Cluster state updated"],
    },
    kernel: {
      info: ["NVMe device initialized", "Network interface up", "CPU frequency scaling"],
      warning: ["Thermal throttling activated", "Memory pressure"],
      error: ["Hardware error detected", "Driver fault"],
      debug: ["IRQ handler registered", "DMA buffer allocated"],
      notice: ["Kernel module loaded", "System time synchronized"],
    },
  };

  const logs: LogEntry[] = [];
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const service = services[Math.floor(Math.random() * services.length)];
    const level = levels[Math.floor(Math.random() * levels.length)];
    const serviceMessages = messages[service]?.[level] || ["Operation completed"];
    const message = serviceMessages[Math.floor(Math.random() * serviceMessages.length)];

    logs.push({
      timestamp: new Date(now - i * 1000 * (Math.random() * 30 + 1)).toISOString(),
      level,
      service,
      message,
      raw: `${new Date().toISOString()} ${service}: ${message}`,
    });
  }

  return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

// Level icon component
function LevelIcon({ level }: { level: LogEntry["level"] }) {
  switch (level) {
    case "error":
      return <AlertCircle className="w-4 h-4 text-red-500" />;
    case "warning":
      return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    case "info":
      return <Info className="w-4 h-4 text-blue-400" />;
    case "debug":
      return <Bug className="w-4 h-4 text-gray-400" />;
    case "notice":
      return <Bell className="w-4 h-4 text-purple-400" />;
  }
}

// Level badge colors
function getLevelColor(level: LogEntry["level"]) {
  switch (level) {
    case "error":
      return "bg-red-500/20 text-red-400 border-red-500/30";
    case "warning":
      return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    case "info":
      return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    case "debug":
      return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    case "notice":
      return "bg-purple-500/20 text-purple-400 border-purple-500/30";
  }
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isStreaming, setIsStreaming] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLevels, setSelectedLevels] = useState<LogEntry["level"][]>([
    "error",
    "warning",
    "info",
    "notice",
  ]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

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

  // Initial load
  useEffect(() => {
    setLogs(generateSimulatedLogs(100));
  }, []);

  // Streaming simulation
  useEffect(() => {
    if (!isStreaming) return;

    const interval = setInterval(() => {
      const newLogs = generateSimulatedLogs(Math.floor(Math.random() * 3) + 1);
      setLogs((prev) => [...newLogs, ...prev].slice(0, 500));
    }, 2000);

    return () => clearInterval(interval);
  }, [isStreaming]);

  // Auto-scroll
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [logs, autoScroll]);

  // Filter logs
  const filteredLogs = logs.filter((log) => {
    if (selectedLevels.length > 0 && !selectedLevels.includes(log.level)) {
      return false;
    }
    if (selectedServices.length > 0 && !selectedServices.includes(log.service)) {
      return false;
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        log.message.toLowerCase().includes(query) ||
        log.service.toLowerCase().includes(query)
      );
    }
    return true;
  });

  // Stats
  const stats = {
    total: logs.length,
    errors: logs.filter((l) => l.level === "error").length,
    warnings: logs.filter((l) => l.level === "warning").length,
  };

  // Export logs
  const exportLogs = () => {
    const content = filteredLogs
      .map((log) => `${log.timestamp} [${log.level.toUpperCase()}] ${log.service}: ${log.message}`)
      .join("\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dgx-spark-logs-${new Date().toISOString().split("T")[0]}.log`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Toggle level filter
  const toggleLevel = (level: LogEntry["level"]) => {
    setSelectedLevels((prev) =>
      prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level]
    );
  };

  // Toggle service filter
  const toggleService = (service: string) => {
    setSelectedServices((prev) =>
      prev.includes(service) ? prev.filter((s) => s !== service) : [...prev, service]
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <FileText className="w-8 h-8 text-orange-500" />
            System Logs
          </h1>
          <p className="text-gray-400 mt-1">
            Real-time system and application logs
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsStreaming(!isStreaming)}
            className={isStreaming ? "border-green-500 text-green-500" : ""}
          >
            {isStreaming ? (
              <>
                <Pause className="w-4 h-4 mr-2" /> Pause
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" /> Resume
              </>
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={exportLogs}>
            <Download className="w-4 h-4 mr-2" /> Export
          </Button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-4 gap-4">
        <GlassCard className="p-4">
          <div className="text-sm text-gray-400">Total Logs</div>
          <div className="text-2xl font-bold text-white">{stats.total}</div>
        </GlassCard>
        <GlassCard className="p-4">
          <div className="text-sm text-gray-400">Errors (Last Hour)</div>
          <div className="text-2xl font-bold text-red-500">{stats.errors}</div>
        </GlassCard>
        <GlassCard className="p-4">
          <div className="text-sm text-gray-400">Warnings (Last Hour)</div>
          <div className="text-2xl font-bold text-yellow-500">{stats.warnings}</div>
        </GlassCard>
        <GlassCard className="p-4">
          <div className="text-sm text-gray-400">Stream Status</div>
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${isStreaming ? "bg-green-500 animate-pulse" : "bg-gray-500"}`}
            />
            <span className={isStreaming ? "text-green-500" : "text-gray-500"}>
              {isStreaming ? "Live" : "Paused"}
            </span>
          </div>
        </GlassCard>
      </div>

      {/* Search and Filters */}
      <GlassCard className="p-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-black/30 border-white/10"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
            {showFilters ? (
              <ChevronUp className="w-4 h-4 ml-2" />
            ) : (
              <ChevronDown className="w-4 h-4 ml-2" />
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLogs([])}
            className="text-red-400 border-red-400/30 hover:bg-red-500/10"
          >
            <Trash2 className="w-4 h-4 mr-2" /> Clear
          </Button>
        </div>

        {/* Expanded Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-4 pt-4 border-t border-white/10 space-y-4">
                {/* Level Filters */}
                <div>
                  <div className="text-sm text-gray-400 mb-2">Log Levels</div>
                  <div className="flex flex-wrap gap-2">
                    {(["error", "warning", "info", "debug", "notice"] as const).map(
                      (level) => (
                        <button
                          key={level}
                          onClick={() => toggleLevel(level)}
                          className={`px-3 py-1 rounded-full text-sm border transition-all ${
                            selectedLevels.includes(level)
                              ? getLevelColor(level)
                              : "border-white/10 text-gray-500"
                          }`}
                        >
                          <span className="flex items-center gap-1">
                            <LevelIcon level={level} />
                            {level.charAt(0).toUpperCase() + level.slice(1)}
                          </span>
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* Service Filters */}
                <div>
                  <div className="text-sm text-gray-400 mb-2">Services</div>
                  <div className="flex flex-wrap gap-2">
                    {allServices.map((service) => (
                      <button
                        key={service}
                        onClick={() => toggleService(service)}
                        className={`px-3 py-1 rounded-full text-sm border transition-all ${
                          selectedServices.includes(service)
                            ? "bg-orange-500/20 text-orange-400 border-orange-500/30"
                            : "border-white/10 text-gray-500 hover:border-white/30"
                        }`}
                      >
                        {service}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </GlassCard>

      {/* Log Viewer */}
      <GlassCard className="p-0 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-black/30">
          <div className="text-sm text-gray-400">
            Showing {filteredLogs.length} of {logs.length} logs
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="autoscroll"
              checked={autoScroll}
              onCheckedChange={(checked) => setAutoScroll(checked as boolean)}
            />
            <label htmlFor="autoscroll" className="text-sm text-gray-400 cursor-pointer">
              Auto-scroll
            </label>
          </div>
        </div>

        <ScrollArea className="h-[500px]" ref={scrollRef}>
          <div className="font-mono text-sm">
            <AnimatePresence initial={false}>
              {filteredLogs.map((log, index) => (
                <motion.div
                  key={`${log.timestamp}-${index}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`px-4 py-2 border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors ${
                    expandedLog === `${log.timestamp}-${index}` ? "bg-white/5" : ""
                  }`}
                  onClick={() =>
                    setExpandedLog(
                      expandedLog === `${log.timestamp}-${index}`
                        ? null
                        : `${log.timestamp}-${index}`
                    )
                  }
                >
                  <div className="flex items-start gap-3">
                    <span className="text-gray-500 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <LevelIcon level={log.level} />
                    <Badge
                      variant="outline"
                      className={`${getLevelColor(log.level)} text-xs`}
                    >
                      {log.level.toUpperCase()}
                    </Badge>
                    <span className="text-orange-400 whitespace-nowrap">
                      [{log.service}]
                    </span>
                    <span
                      className={`flex-1 ${
                        log.level === "error"
                          ? "text-red-300"
                          : log.level === "warning"
                            ? "text-yellow-300"
                            : "text-gray-300"
                      }`}
                    >
                      {log.message}
                    </span>
                  </div>

                  {/* Expanded Details */}
                  <AnimatePresence>
                    {expandedLog === `${log.timestamp}-${index}` && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="mt-2 pl-8 overflow-hidden"
                      >
                        <div className="p-3 bg-black/50 rounded border border-white/10 text-xs">
                          <div className="grid grid-cols-2 gap-2 mb-2">
                            <div>
                              <span className="text-gray-500">Timestamp:</span>{" "}
                              <span className="text-white">{log.timestamp}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Service:</span>{" "}
                              <span className="text-orange-400">{log.service}</span>
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-500">Raw:</span>
                            <pre className="mt-1 text-gray-400 whitespace-pre-wrap break-all">
                              {log.raw}
                            </pre>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </AnimatePresence>

            {filteredLogs.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                No logs match your filters
              </div>
            )}
          </div>
        </ScrollArea>
      </GlassCard>
    </div>
  );
}
