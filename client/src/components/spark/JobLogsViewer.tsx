import React, { useState, useEffect, useRef } from "react";
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
  Terminal, 
  Search, 
  Download, 
  Pause, 
  Play, 
  Trash2,
  Filter,
  ChevronDown,
  AlertTriangle,
  Info,
  Bug,
  XCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

interface LogEntry {
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  source: string;
  message: string;
}

interface JobLogsViewerProps {
  jobId: string;
  jobName: string;
  isRunning?: boolean;
}

// Simulated log generation for demo
const generateMockLogs = (jobId: string): LogEntry[] => {
  const sources = ['Driver', 'Executor-1', 'Executor-2', 'Executor-3', 'Executor-4', 'RAPIDS', 'Shuffle'];
  const levels: LogEntry['level'][] = ['INFO', 'INFO', 'INFO', 'WARN', 'DEBUG', 'ERROR'];
  
  const messages = {
    INFO: [
      'Starting task 0.0 in stage 12.0 (TID 450)',
      'Finished task 0.0 in stage 12.0 (TID 450) in 234 ms on executor 192.168.100.10',
      'Block broadcast_15 stored as values in memory (estimated size 4.2 MiB)',
      'RAPIDS: GPU memory allocated: 2.4 GiB / 128.0 GiB',
      'Shuffle read: 1.2 GiB from 4 partitions',
      'Task serialized as 4.8 KiB in 2 ms',
      'Running SQL query: SELECT * FROM dataset WHERE timestamp > ...',
      'Partition 45/100 completed successfully',
      'Checkpoint saved to hdfs://cluster/checkpoints/job-001',
      'Broadcast variable created with 128 MiB data',
    ],
    WARN: [
      'Lost executor 3 on 192.168.100.11: Container killed by YARN',
      'Shuffle fetch failed, retrying...',
      'GC overhead exceeded threshold, consider increasing memory',
      'Speculative task launched for slow running task',
      'Disk space low on executor node',
    ],
    ERROR: [
      'Task failed due to OutOfMemoryError',
      'Connection refused to executor 192.168.100.12',
      'RAPIDS: GPU kernel execution failed',
      'Stage 15 failed after 4 retries',
    ],
    DEBUG: [
      'Serializing RDD partition 45',
      'Fetching shuffle block from remote executor',
      'Memory manager: Acquired 512 MiB for execution',
      'Task metrics: shuffleReadBytes=1234567, shuffleWriteBytes=987654',
    ],
  };

  const logs: LogEntry[] = [];
  const now = new Date();
  
  for (let i = 0; i < 50; i++) {
    const level = levels[Math.floor(Math.random() * levels.length)];
    const source = sources[Math.floor(Math.random() * sources.length)];
    const messageList = messages[level];
    const message = messageList[Math.floor(Math.random() * messageList.length)];
    
    const timestamp = new Date(now.getTime() - (50 - i) * 1000);
    
    logs.push({
      timestamp: timestamp.toISOString(),
      level,
      source,
      message: `[${jobId}] ${message}`,
    });
  }
  
  return logs;
};

const LogLevelIcon = ({ level }: { level: LogEntry['level'] }) => {
  switch (level) {
    case 'ERROR':
      return <XCircle className="h-3 w-3 text-red-400" />;
    case 'WARN':
      return <AlertTriangle className="h-3 w-3 text-yellow-400" />;
    case 'DEBUG':
      return <Bug className="h-3 w-3 text-purple-400" />;
    default:
      return <Info className="h-3 w-3 text-blue-400" />;
  }
};

const LogLevelBadge = ({ level }: { level: LogEntry['level'] }) => {
  const styles = {
    INFO: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    WARN: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    ERROR: 'bg-red-500/10 text-red-400 border-red-500/20',
    DEBUG: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  };

  return (
    <span className={cn(
      "px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border",
      styles[level]
    )}>
      {level}
    </span>
  );
};

export function JobLogsViewer({ jobId, jobName, isRunning = true }: JobLogsViewerProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [isStreaming, setIsStreaming] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize logs
  useEffect(() => {
    setLogs(generateMockLogs(jobId));
  }, [jobId]);

  // Simulate real-time log streaming
  useEffect(() => {
    if (!isStreaming || !isRunning) return;

    const interval = setInterval(() => {
      const sources = ['Driver', 'Executor-1', 'Executor-2', 'RAPIDS'];
      const levels: LogEntry['level'][] = ['INFO', 'INFO', 'INFO', 'WARN', 'DEBUG'];
      const messages = [
        'Processing partition data...',
        'Task completed successfully',
        'Shuffle write: 256 MiB',
        'GPU kernel execution time: 45ms',
        'Memory usage: 4.2 GiB / 8.0 GiB',
      ];

      const newLog: LogEntry = {
        timestamp: new Date().toISOString(),
        level: levels[Math.floor(Math.random() * levels.length)],
        source: sources[Math.floor(Math.random() * sources.length)],
        message: `[${jobId}] ${messages[Math.floor(Math.random() * messages.length)]}`,
      };

      setLogs(prev => [...prev.slice(-500), newLog]); // Keep last 500 logs
    }, 2000);

    return () => clearInterval(interval);
  }, [isStreaming, isRunning, jobId]);

  // Filter logs
  useEffect(() => {
    let filtered = logs;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(log => 
        log.message.toLowerCase().includes(query) ||
        log.source.toLowerCase().includes(query)
      );
    }

    if (levelFilter !== 'all') {
      filtered = filtered.filter(log => log.level === levelFilter);
    }

    if (sourceFilter !== 'all') {
      filtered = filtered.filter(log => log.source === sourceFilter);
    }

    setFilteredLogs(filtered);
  }, [logs, searchQuery, levelFilter, sourceFilter]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [filteredLogs, autoScroll]);

  const handleDownload = () => {
    const content = filteredLogs.map(log => 
      `${log.timestamp} [${log.level}] [${log.source}] ${log.message}`
    ).join('\n');
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${jobName}-logs-${new Date().toISOString().split('T')[0]}.log`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    setLogs([]);
  };

  const uniqueSources = Array.from(new Set(logs.map(l => l.source)));

  const logCounts = {
    total: logs.length,
    info: logs.filter(l => l.level === 'INFO').length,
    warn: logs.filter(l => l.level === 'WARN').length,
    error: logs.filter(l => l.level === 'ERROR').length,
  };

  return (
    <div className="flex flex-col h-full bg-black/40 rounded-lg border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-white/10 bg-white/5">
        <div className="flex items-center gap-3">
          <Terminal className="h-4 w-4 text-primary" />
          <span className="font-medium text-sm">Job Logs</span>
          <span className="text-xs text-muted-foreground font-mono">{jobName}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-[10px]">
            <span className="text-muted-foreground">{logCounts.total} total</span>
            <span className="text-blue-400">{logCounts.info} info</span>
            <span className="text-yellow-400">{logCounts.warn} warn</span>
            <span className="text-red-400">{logCounts.error} error</span>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 p-2 border-b border-white/10 bg-white/5">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search logs..."
            className="h-7 pl-7 text-xs bg-black/20 border-white/10"
          />
        </div>

        <Select value={levelFilter} onValueChange={setLevelFilter}>
          <SelectTrigger className="h-7 w-[100px] text-xs bg-black/20 border-white/10">
            <Filter className="h-3 w-3 mr-1" />
            <SelectValue placeholder="Level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            <SelectItem value="INFO">INFO</SelectItem>
            <SelectItem value="WARN">WARN</SelectItem>
            <SelectItem value="ERROR">ERROR</SelectItem>
            <SelectItem value="DEBUG">DEBUG</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="h-7 w-[120px] text-xs bg-black/20 border-white/10">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            {uniqueSources.map(source => (
              <SelectItem key={source} value={source}>{source}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1 border-l border-white/10 pl-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setIsStreaming(!isStreaming)}
            title={isStreaming ? 'Pause streaming' : 'Resume streaming'}
          >
            {isStreaming ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleDownload}
            title="Download logs"
          >
            <Download className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-red-400 hover:text-red-300"
            onClick={handleClear}
            title="Clear logs"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>

        <div className="flex items-center gap-2 border-l border-white/10 pl-2">
          <span className="text-[10px] text-muted-foreground">Auto-scroll</span>
          <Switch
            checked={autoScroll}
            onCheckedChange={setAutoScroll}
            className="scale-75"
          />
        </div>
      </div>

      {/* Log Content */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-auto font-mono text-xs p-2 space-y-0.5"
        style={{ maxHeight: '400px' }}
      >
        {filteredLogs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            {logs.length === 0 ? 'No logs yet...' : 'No logs match your filters'}
          </div>
        ) : (
          filteredLogs.map((log, index) => (
            <div 
              key={index}
              className={cn(
                "flex items-start gap-2 py-1 px-2 rounded hover:bg-white/5 transition-colors",
                log.level === 'ERROR' && "bg-red-500/5",
                log.level === 'WARN' && "bg-yellow-500/5"
              )}
            >
              <span className="text-muted-foreground whitespace-nowrap">
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>
              <LogLevelBadge level={log.level} />
              <span className="text-cyan-400 whitespace-nowrap min-w-[80px]">
                [{log.source}]
              </span>
              <span className={cn(
                "flex-1 break-all",
                log.level === 'ERROR' && "text-red-300",
                log.level === 'WARN' && "text-yellow-300"
              )}>
                {log.message}
              </span>
            </div>
          ))
        )}
        <div ref={logsEndRef} />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between p-2 border-t border-white/10 bg-white/5 text-[10px] text-muted-foreground">
        <span>Showing {filteredLogs.length} of {logs.length} logs</span>
        <div className="flex items-center gap-2">
          {isStreaming && isRunning && (
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
              Live
            </span>
          )}
          <span>Last updated: {new Date().toLocaleTimeString()}</span>
        </div>
      </div>
    </div>
  );
}

export default JobLogsViewer;
