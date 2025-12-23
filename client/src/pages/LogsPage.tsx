import { useState, useEffect, useRef } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { trpc } from "@/lib/trpc";
import {
  FileText,
  Search,
  Download,
  Pause,
  Play,
  Filter,
  AlertCircle,
  AlertTriangle,
  Info,
  Bug,
  Bell,
  ChevronDown,
  ChevronUp,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

// Log entry type
interface LogEntry {
  timestamp: string;
  level: "error" | "warning" | "info" | "debug" | "notice";
  service: string;
  message: string;
  raw: string;
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

  // Fetch logs from backend
  const logsQuery = trpc.logs.getLogs.useQuery(
    {
      limit: 200,
      levels: selectedLevels.length > 0 ? selectedLevels : undefined,
      services: selectedServices.length > 0 ? selectedServices : undefined,
      search: searchQuery || undefined,
    },
    {
      refetchInterval: isStreaming ? 2000 : false,
    }
  );

  // Fetch available services
  const servicesQuery = trpc.logs.getServices.useQuery();

  // Fetch log stats
  const statsQuery = trpc.logs.getStats.useQuery(undefined, {
    refetchInterval: 10000,
  });

  const logs = logsQuery.data?.logs || [];
  const allServices = servicesQuery.data?.services || [];
  const logSource = logsQuery.data?.source || "unknown";

  // Auto-scroll
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [logs, autoScroll]);

  // Stats
  const stats = {
    total: logs.length,
    errors: statsQuery.data?.errorsLastHour ?? 0,
    warnings: statsQuery.data?.warningsLastHour ?? 0,
  };

  // Export logs
  const exportLogs = () => {
    const content = logs
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
            {logSource !== "unknown" && (
              <span className="ml-2 text-xs text-muted-foreground">
                (Source: {logSource})
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => logsQuery.refetch()}
            disabled={logsQuery.isFetching}
          >
            <RefreshCw className={cn("w-4 h-4 mr-2", logsQuery.isFetching && "animate-spin")} />
            Refresh
          </Button>
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
          <div className="text-2xl font-bold text-red-500">
            {statsQuery.isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats.errors}
          </div>
        </GlassCard>
        <GlassCard className="p-4">
          <div className="text-sm text-gray-400">Warnings (Last Hour)</div>
          <div className="text-2xl font-bold text-yellow-500">
            {statsQuery.isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats.warnings}
          </div>
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
        <div className="flex flex-col gap-4">
          {/* Search Bar */}
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white/5 border-white/10"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className={showFilters ? "border-primary text-primary" : ""}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
              {showFilters ? (
                <ChevronUp className="w-4 h-4 ml-2" />
              ) : (
                <ChevronDown className="w-4 h-4 ml-2" />
              )}
            </Button>
          </div>

          {/* Level Filters */}
          <div className="flex flex-wrap gap-2">
            {(["error", "warning", "info", "debug", "notice"] as const).map((level) => (
              <Badge
                key={level}
                variant="outline"
                className={cn(
                  "cursor-pointer transition-all",
                  selectedLevels.includes(level)
                    ? getLevelColor(level)
                    : "opacity-50 hover:opacity-75"
                )}
                onClick={() => toggleLevel(level)}
              >
                <LevelIcon level={level} />
                <span className="ml-1 capitalize">{level}</span>
              </Badge>
            ))}
          </div>

          {/* Service Filters */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-4 border-t border-white/10">
                  <div className="text-sm text-gray-400 mb-3">Filter by Service</div>
                  <div className="flex flex-wrap gap-3">
                    {servicesQuery.isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    ) : (
                      allServices.map((service) => (
                        <label
                          key={service}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <Checkbox
                            checked={selectedServices.includes(service)}
                            onCheckedChange={() => toggleService(service)}
                          />
                          <span className="text-sm">{service}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </GlassCard>

      {/* Logs List */}
      <GlassCard className="p-0 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="text-sm text-gray-400">
            Showing {logs.length} logs
            {logsQuery.isFetching && (
              <Loader2 className="inline-block ml-2 h-4 w-4 animate-spin" />
            )}
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox
              checked={autoScroll}
              onCheckedChange={(checked) => setAutoScroll(!!checked)}
            />
            Auto-scroll
          </label>
        </div>

        <ScrollArea className="h-[500px]" ref={scrollRef}>
          <div className="divide-y divide-white/5">
            {logsQuery.isLoading && logs.length === 0 ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <FileText className="h-12 w-12 mb-4 opacity-50" />
                <p>No logs found</p>
                <p className="text-sm">Try adjusting your filters</p>
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {logs.map((log, index) => (
                  <motion.div
                    key={`${log.timestamp}-${index}`}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={cn(
                      "p-3 hover:bg-white/5 cursor-pointer transition-colors",
                      expandedLog === `${log.timestamp}-${index}` && "bg-white/5"
                    )}
                    onClick={() =>
                      setExpandedLog(
                        expandedLog === `${log.timestamp}-${index}`
                          ? null
                          : `${log.timestamp}-${index}`
                      )
                    }
                  >
                    <div className="flex items-start gap-3">
                      <LevelIcon level={log.level} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge
                            variant="outline"
                            className={cn("text-xs", getLevelColor(log.level))}
                          >
                            {log.level}
                          </Badge>
                          <span className="text-xs text-gray-500 font-mono">
                            {log.service}
                          </span>
                          <span className="text-xs text-gray-600 font-mono">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-300 mt-1 break-words">
                          {log.message}
                        </p>

                        {/* Expanded details */}
                        <AnimatePresence>
                          {expandedLog === `${log.timestamp}-${index}` && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="mt-3 p-3 bg-black/40 rounded-lg border border-white/10">
                                <div className="text-xs text-gray-400 mb-2">
                                  Full Timestamp
                                </div>
                                <div className="text-xs font-mono text-gray-300 mb-3">
                                  {log.timestamp}
                                </div>
                                <div className="text-xs text-gray-400 mb-2">
                                  Raw Log Entry
                                </div>
                                <pre className="text-xs font-mono text-gray-300 whitespace-pre-wrap break-all">
                                  {log.raw}
                                </pre>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </ScrollArea>
      </GlassCard>
    </div>
  );
}
