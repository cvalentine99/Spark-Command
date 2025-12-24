import React, { useState, useRef, useEffect } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import {
  BrainCircuit,
  Send,
  Bot,
  User,
  Sparkles,
  Zap,
  Clock,
  BarChart3,
  Settings2,
  RefreshCw,
  Loader2,
  WifiOff,
  Wifi
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface Model {
  id: string;
  name: string;
  type: string;
  contextLength: string;
  status: string;
  quantization?: string;
  parameters?: string;
}

export default function InferencePage() {
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [temperature, setTemperature] = useState(0.7);
  const [topP, setTopP] = useState(0.9);
  const [maxTokens, setMaxTokens] = useState(2048);
  const [metrics, setMetrics] = useState({ tps: 0, latency: 0, kvCache: 0 });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch available models from backend
  const modelsQuery = trpc.inference.getModels.useQuery(undefined, {
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch inference health status
  const healthQuery = trpc.inference.health.useQuery(undefined, {
    refetchInterval: 10000,
  });

  // Fetch real-time metrics
  const metricsQuery = trpc.inference.getMetrics.useQuery(undefined, {
    refetchInterval: 5000,
  });

  // Chat mutation
  const chatMutation = trpc.inference.chat.useMutation({
    onSuccess: (data) => {
      if (data.success && data.response) {
        setMessages(prev => [...prev, data.response]);
        setMetrics({
          tps: data.metrics.tokensPerSecond,
          latency: data.metrics.latencyMs,
          kvCache: metricsQuery.data?.kvCacheUsagePercent || 0,
        });
      }
    },
  });

  const models = modelsQuery.data?.models || [];
  const isVLLMConnected = healthQuery.data?.status === "healthy";

  // Initialize with first available model
  useEffect(() => {
    if (models.length > 0 && !selectedModel) {
      const firstReady = models.find(m => m.status === "ready") || models[0];
      setSelectedModel(firstReady);

      // Initialize messages based on connection status
      const initMessages: ChatMessage[] = [
        {
          role: "system",
          content: `System: vLLM Inference Engine ${isVLLMConnected ? 'connected' : 'simulated'}. Model: ${firstReady.name} - ${firstReady.quantization || 'FP16'}.`
        },
        {
          role: "assistant",
          content: "Hello! I am running on the DGX Spark cluster. How can I assist you with your data analysis or code generation tasks today?"
        }
      ];
      setMessages(initMessages);
    }
  }, [models, isVLLMConnected]);

  // Update metrics from query
  useEffect(() => {
    if (metricsQuery.data) {
      setMetrics(prev => ({
        ...prev,
        kvCache: metricsQuery.data?.kvCacheUsagePercent || 0,
      }));
    }
  }, [metricsQuery.data]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !selectedModel) return;

    const newUserMsg: ChatMessage = { role: "user", content: inputValue };
    setMessages(prev => [...prev, newUserMsg]);
    setInputValue("");

    // Build messages array for API call
    const apiMessages = messages
      .filter(m => m.role !== "system")
      .concat(newUserMsg)
      .map(m => ({ role: m.role, content: m.content }));

    chatMutation.mutate({
      modelId: selectedModel.id,
      messages: apiMessages,
      temperature,
      maxTokens,
      topP,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const resetChat = () => {
    const initMessages: ChatMessage[] = [
      {
        role: "system",
        content: `System: vLLM Inference Engine ${isVLLMConnected ? 'connected' : 'simulated'}. Model: ${selectedModel?.name || 'Unknown'}.`
      },
      {
        role: "assistant",
        content: "Hello! I am running on the DGX Spark cluster. How can I assist you with your data analysis or code generation tasks today?"
      }
    ];
    setMessages(initMessages);
  };

  const isGenerating = chatMutation.isPending;
  const isLoading = modelsQuery.isLoading;

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col gap-6">
      <div className="flex flex-col gap-2 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold tracking-tight">Inference Playground</h1>
            <p className="text-muted-foreground">
              Interactive model testing via vLLM Serving Engine
              {modelsQuery.data?.source === 'vllm' && (
                <span className="ml-2 text-xs text-green-400">(Connected to vLLM)</span>
              )}
              {modelsQuery.data?.source === 'default' && (
                <span className="ml-2 text-xs text-yellow-400">(Simulated Mode)</span>
              )}
            </p>
          </div>
          <div className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs",
            isVLLMConnected
              ? "bg-green-500/10 border border-green-500/30 text-green-400"
              : "bg-yellow-500/10 border border-yellow-500/30 text-yellow-400"
          )}>
            {isVLLMConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            {isVLLMConnected ? "vLLM Connected" : "Simulated Mode"}
          </div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-0">
        {/* Left Sidebar: Model Config & Metrics */}
        <div className="lg:col-span-1 flex flex-col gap-6 overflow-y-auto pr-2">
          {/* Model Selection */}
          <GlassCard className="space-y-4">
            <div className="flex items-center gap-2 font-display font-bold text-lg">
              <BrainCircuit className="h-5 w-5 text-primary" /> Model Selection
              {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
            <div className="space-y-2">
              {isLoading ? (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  Loading models...
                </div>
              ) : models.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  No models available
                </div>
              ) : (
                models.map((model) => (
                  <div
                    key={model.id}
                    onClick={() => model.status === 'ready' && setSelectedModel(model)}
                    className={cn(
                      "p-3 rounded-lg border transition-all cursor-pointer flex justify-between items-center",
                      selectedModel?.id === model.id
                        ? "bg-primary/10 border-primary/50 shadow-[0_0_10px_-5px_var(--primary)]"
                        : "bg-white/5 border-white/10 hover:bg-white/10",
                      model.status !== 'ready' && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <div>
                      <div className="font-medium text-sm">{model.name}</div>
                      <div className="text-xs text-muted-foreground">{model.type} • {model.contextLength}</div>
                    </div>
                    {model.status === 'loading' && <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />}
                    {model.status === 'offline' && <WifiOff className="h-3 w-3 text-muted-foreground" />}
                    {model.status === 'ready' && <div className="h-2 w-2 rounded-full bg-green-500" />}
                  </div>
                ))
              )}
            </div>
          </GlassCard>

          {/* Real-time Metrics */}
          <GlassCard className="space-y-4">
            <div className="flex items-center gap-2 font-display font-bold text-lg">
              <BarChart3 className="h-5 w-5 text-purple-400" /> Live Performance
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-black/20 border border-white/5">
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Zap className="h-3 w-3" /> Tokens/sec
                </div>
                <div className="text-xl font-mono font-bold text-primary mt-1">
                  {isGenerating ? (
                    <span className="animate-pulse">{Math.floor(Math.random() * 60 + 100)}</span>
                  ) : (
                    metrics.tps || metricsQuery.data?.avgGenerationThroughput?.toFixed(0) || 0
                  )}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-black/20 border border-white/5">
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Latency (ms)
                </div>
                <div className="text-xl font-mono font-bold text-blue-400 mt-1">
                  {metrics.latency || 0}
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">KV Cache Usage</span>
                <span className="font-mono">{(metricsQuery.data?.kvCacheUsagePercent || 0).toFixed(0)}%</span>
              </div>
              <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500 transition-all duration-500"
                  style={{ width: `${metricsQuery.data?.kvCacheUsagePercent || 0}%` }}
                />
              </div>
            </div>

            {metricsQuery.data && (
              <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t border-white/10">
                <div className="flex justify-between">
                  <span>Requests Running</span>
                  <span className="font-mono">{metricsQuery.data.requestsRunning}</span>
                </div>
                <div className="flex justify-between">
                  <span>Requests Waiting</span>
                  <span className="font-mono">{metricsQuery.data.requestsWaiting}</span>
                </div>
              </div>
            )}
          </GlassCard>

          {/* Parameters */}
          <GlassCard className="space-y-4">
            <div className="flex items-center gap-2 font-display font-bold text-lg">
              <Settings2 className="h-5 w-5 text-muted-foreground" /> Parameters
            </div>
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Temperature</span>
                  <span>{temperature.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Top P</span>
                  <span>{topP.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={topP}
                  onChange={(e) => setTopP(parseFloat(e.target.value))}
                  className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Max Tokens</span>
                  <span>{maxTokens}</span>
                </div>
                <input
                  type="range"
                  min="256"
                  max="4096"
                  step="256"
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                  className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Right: Chat Interface */}
        <GlassCard className="lg:col-span-3 flex flex-col min-h-0 relative overflow-hidden" noPadding>
          {/* Chat Header */}
          <div className="p-4 border-b border-white/10 bg-white/5 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className={cn(
                "h-2 w-2 rounded-full",
                isVLLMConnected ? "bg-green-500 shadow-[0_0_5px_#22c55e]" : "bg-yellow-500"
              )} />
              <span className="font-mono text-sm font-bold">
                vLLM Serving: {selectedModel?.name || "Loading..."}
              </span>
            </div>
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={resetChat}>
              <RefreshCw className="h-3 w-3 mr-2" /> Reset Context
            </Button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            {messages.map((msg, idx) => (
              <div key={idx} className={cn("flex gap-4 max-w-3xl", msg.role === "user" ? "ml-auto flex-row-reverse" : "")}>
                <div className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                  msg.role === "user" ? "bg-primary text-white" : "bg-purple-600 text-white"
                )}>
                  {msg.role === "user" ? <User className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
                </div>
                <div className={cn(
                  "p-4 rounded-2xl text-sm leading-relaxed",
                  msg.role === "user"
                    ? "bg-primary/10 border border-primary/20 text-foreground rounded-tr-none"
                    : "bg-white/5 border border-white/10 text-muted-foreground rounded-tl-none"
                )}>
                  {msg.role === "system" ? (
                    <div className="font-mono text-xs opacity-70 flex items-center gap-2">
                      <Sparkles className="h-3 w-3" /> {msg.content}
                    </div>
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            ))}
            {isGenerating && (
              <div className="flex gap-4 max-w-3xl">
                <div className="h-8 w-8 rounded-full bg-purple-600 flex items-center justify-center shrink-0">
                  <Bot className="h-5 w-5 text-white" />
                </div>
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 rounded-tl-none flex items-center gap-1">
                  <span className="h-2 w-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="h-2 w-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="h-2 w-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-white/10 bg-black/20 backdrop-blur-md">
            <div className="relative">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your prompt here..."
                className="pr-12 bg-white/5 border-white/10 focus-visible:ring-primary h-12"
                disabled={isGenerating || !selectedModel}
              />
              <Button
                size="icon"
                className="absolute right-1 top-1 h-10 w-10 bg-primary hover:bg-primary/90 text-white"
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isGenerating || !selectedModel}
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div className="text-[10px] text-muted-foreground mt-2 text-center">
              Running on NVIDIA DGX Spark • {selectedModel?.quantization || 'FP16'} Precision • {isVLLMConnected ? 'vLLM' : 'Simulated'}
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
