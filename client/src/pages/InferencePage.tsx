import React, { useState, useRef, useEffect } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";

// Mock Models
const models = [
  { id: "llama-3-70b", name: "Llama 3 (70B)", type: "Chat", context: "8k", status: "ready" },
  { id: "mistral-large", name: "Mistral Large", type: "Chat", context: "32k", status: "ready" },
  { id: "codellama-70b", name: "CodeLlama (70B)", type: "Code", context: "16k", status: "loading" },
];

// Mock Chat History
const initialMessages = [
  { role: "system", content: "System: vLLM Inference Engine initialized. Model loaded: Llama 3 (70B) - FP8 Quantization." },
  { role: "assistant", content: "Hello! I am running on the DGX Spark cluster. How can I assist you with your data analysis or code generation tasks today?" }
];

export default function InferencePage() {
  const [selectedModel, setSelectedModel] = useState(models[0]);
  const [messages, setMessages] = useState(initialMessages);
  const [inputValue, setInputValue] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [metrics, setMetrics] = useState({ tps: 0, latency: 0, queue: 0 });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    const newUserMsg = { role: "user", content: inputValue };
    setMessages(prev => [...prev, newUserMsg]);
    setInputValue("");
    setIsGenerating(true);

    // Simulate generation delay and streaming
    setTimeout(() => {
      const tps = Math.floor(Math.random() * (180 - 120) + 120);
      const latency = Math.floor(Math.random() * (45 - 15) + 15);
      setMetrics({ tps, latency, queue: 0 });

      const responseMsg = { 
        role: "assistant", 
        content: "I've analyzed the cluster telemetry. It appears that Node-02 is experiencing slightly higher memory pressure than usual during the Spark shuffle phase. I recommend checking the partition skew in your latest ETL job." 
      };
      setMessages(prev => [...prev, responseMsg]);
      setIsGenerating(false);
    }, 1500);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col gap-6">
      <div className="flex flex-col gap-2 shrink-0">
        <h1 className="text-3xl font-display font-bold tracking-tight">Inference Playground</h1>
        <p className="text-muted-foreground">Interactive model testing via vLLM Serving Engine</p>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-0">
        {/* Left Sidebar: Model Config & Metrics */}
        <div className="lg:col-span-1 flex flex-col gap-6 overflow-y-auto pr-2">
          {/* Model Selection */}
          <GlassCard className="space-y-4">
            <div className="flex items-center gap-2 font-display font-bold text-lg">
              <BrainCircuit className="h-5 w-5 text-primary" /> Model Selection
            </div>
            <div className="space-y-2">
              {models.map((model) => (
                <div 
                  key={model.id}
                  onClick={() => model.status === 'ready' && setSelectedModel(model)}
                  className={cn(
                    "p-3 rounded-lg border transition-all cursor-pointer flex justify-between items-center",
                    selectedModel.id === model.id 
                      ? "bg-primary/10 border-primary/50 shadow-[0_0_10px_-5px_var(--primary)]" 
                      : "bg-white/5 border-white/10 hover:bg-white/10",
                    model.status !== 'ready' && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <div>
                    <div className="font-medium text-sm">{model.name}</div>
                    <div className="text-xs text-muted-foreground">{model.type} • {model.context}</div>
                  </div>
                  {model.status === 'loading' && <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />}
                </div>
              ))}
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
                  {isGenerating ? Math.floor(Math.random() * (150 - 100) + 100) : metrics.tps}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-black/20 border border-white/5">
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Latency (ms)
                </div>
                <div className="text-xl font-mono font-bold text-blue-400 mt-1">
                  {metrics.latency}
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">KV Cache Usage</span>
                <span className="font-mono">42%</span>
              </div>
              <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-purple-500 w-[42%]" />
              </div>
            </div>
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
                  <span>0.7</span>
                </div>
                <input type="range" className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer" />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Top P</span>
                  <span>0.9</span>
                </div>
                <input type="range" className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer" />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Max Tokens</span>
                  <span>2048</span>
                </div>
                <input type="range" className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer" />
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Right: Chat Interface */}
        <GlassCard className="lg:col-span-3 flex flex-col min-h-0 relative overflow-hidden" noPadding>
          {/* Chat Header */}
          <div className="p-4 border-b border-white/10 bg-white/5 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_5px_#22c55e]" />
              <span className="font-mono text-sm font-bold">vLLM Serving: {selectedModel.name}</span>
            </div>
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setMessages(initialMessages)}>
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
              />
              <Button 
                size="icon" 
                className="absolute right-1 top-1 h-10 w-10 bg-primary hover:bg-primary/90 text-white"
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isGenerating}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <div className="text-[10px] text-muted-foreground mt-2 text-center">
              Running on NVIDIA DGX H100 • FP8 Precision • TensorRT-LLM Optimized
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
