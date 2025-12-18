import { useState, useRef, useEffect } from 'react';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  MessageCircle,
  Send,
  Bot,
  User,
  Search,
  BookOpen,
  AlertTriangle,
  Terminal,
  Lightbulb,
  ChevronRight,
  Cpu,
  Network,
  Flame,
  Database,
  FileText,
  Clock,
  ThumbsUp,
  ThumbsDown,
  Copy,
  ExternalLink,
  Sparkles,
  Zap,
  HelpCircle,
} from 'lucide-react';

// Knowledge base data
const knowledgeIndex = {
  quickAnswers: [
    {
      question: "What is the memory capacity of DGX Spark?",
      answer: "DGX Spark has 128GB of unified LPDDR5x memory shared between CPU and GPU. A two-node cluster has 256GB total.",
      category: "hardware"
    },
    {
      question: "How do I check GPU status?",
      answer: "Run `nvidia-smi` for basic status or `dcgmi health -c -j` for detailed health check.",
      category: "monitoring"
    },
    {
      question: "What is the TDP of DGX Spark?",
      answer: "The TDP (Thermal Design Power) is 265W under full load. Idle power is approximately 25W.",
      category: "hardware"
    },
    {
      question: "How do I connect two DGX Sparks?",
      answer: "Connect the USB4/Thunderbolt ports using a certified USB4 40Gbps active cable (max 2m length), then configure the network interface.",
      category: "networking"
    },
    {
      question: "What CUDA version is supported?",
      answer: "DGX Spark supports CUDA 12.x. The system comes pre-installed with the latest compatible CUDA toolkit.",
      category: "software"
    },
    {
      question: "How do I fix GPU not detected?",
      answer: "Try: 1) `sudo modprobe nvidia`, 2) Check secure boot status, 3) Reinstall driver with `sudo apt install nvidia-driver-550`.",
      category: "troubleshooting"
    },
    {
      question: "What is the cluster interconnect bandwidth?",
      answer: "The USB4/Thunderbolt interconnect provides 80 Gbps bidirectional bandwidth with sub-2μs latency.",
      category: "networking"
    },
    {
      question: "How do I enable RAPIDS for Spark?",
      answer: "Add `spark.plugins=com.nvidia.spark.SQLPlugin` and `spark.rapids.sql.enabled=true` to spark-defaults.conf.",
      category: "spark"
    },
  ],
  errorCodes: [
    { code: "XID 13", description: "Graphics Engine Exception", severity: "high", solution: "Update driver or reset GPU with `sudo nvidia-smi -r`" },
    { code: "XID 31", description: "GPU memory page fault", severity: "high", solution: "Check for memory corruption, update driver" },
    { code: "XID 43", description: "GPU stopped processing", severity: "critical", solution: "Check power supply, reseat connections, reboot" },
    { code: "XID 48", description: "Double Bit ECC Error", severity: "critical", solution: "Run diagnostics, may require RMA" },
    { code: "XID 79", description: "GPU fallen off the bus", severity: "critical", solution: "Check hardware connections, power supply, contact support" },
    { code: "CUDA OOM", description: "CUDA out of memory", severity: "medium", solution: "Reduce batch size, enable gradient checkpointing, clear GPU memory" },
  ],
  commands: [
    { command: "nvidia-smi", description: "Display GPU status, utilization, and memory usage" },
    { command: "nvidia-smi -q", description: "Display detailed GPU information" },
    { command: "nvidia-smi dmon -s u -d 1", description: "Monitor GPU utilization in real-time" },
    { command: "dcgmi health -c -j", description: "Run DCGM health check with JSON output" },
    { command: "dcgmi diag -r 3", description: "Run comprehensive GPU diagnostics" },
    { command: "sudo nvidia-smi -r", description: "Reset GPU" },
    { command: "boltctl list", description: "List Thunderbolt devices" },
    { command: "iperf3 -c <host> -t 30", description: "Test network bandwidth" },
  ],
  categories: [
    { id: "hardware", name: "Hardware", icon: Cpu, color: "text-blue-400" },
    { id: "software", name: "Software", icon: Database, color: "text-green-400" },
    { id: "networking", name: "Networking", icon: Network, color: "text-purple-400" },
    { id: "troubleshooting", name: "Troubleshooting", icon: AlertTriangle, color: "text-orange-400" },
    { id: "spark", name: "Spark/RAPIDS", icon: Flame, color: "text-red-400" },
    { id: "monitoring", name: "Monitoring", icon: Terminal, color: "text-cyan-400" },
  ]
};

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: string[];
  commands?: string[];
}

// Simulated RAG response generation
function generateResponse(query: string): { content: string; sources: string[]; commands: string[] } {
  const queryLower = query.toLowerCase();
  const sources: string[] = [];
  const commands: string[] = [];
  let content = '';

  // Check for error codes
  const errorMatch = knowledgeIndex.errorCodes.find(e => 
    queryLower.includes(e.code.toLowerCase()) || queryLower.includes(e.description.toLowerCase())
  );
  if (errorMatch) {
    content = `## ${errorMatch.code}: ${errorMatch.description}\n\n**Severity:** ${errorMatch.severity.toUpperCase()}\n\n**Solution:**\n${errorMatch.solution}\n\n`;
    sources.push('troubleshooting/gpu-issues.md');
    if (errorMatch.solution.includes('`')) {
      const cmdMatch = errorMatch.solution.match(/`([^`]+)`/);
      if (cmdMatch) commands.push(cmdMatch[1]);
    }
  }

  // Check quick answers
  const quickMatch = knowledgeIndex.quickAnswers.find(qa =>
    queryLower.includes(qa.question.toLowerCase().split(' ').slice(0, 3).join(' ')) ||
    qa.question.toLowerCase().split(' ').some(word => word.length > 4 && queryLower.includes(word))
  );
  if (quickMatch && !content) {
    content = `${quickMatch.answer}\n\n`;
    sources.push(`${quickMatch.category}/documentation.md`);
    const cmdMatches = quickMatch.answer.match(/`([^`]+)`/g);
    if (cmdMatches) {
      cmdMatches.forEach(cmd => commands.push(cmd.replace(/`/g, '')));
    }
  }

  // Check for command queries
  if (queryLower.includes('command') || queryLower.includes('how to')) {
    const relevantCmds = knowledgeIndex.commands.filter(c =>
      queryLower.includes(c.description.toLowerCase().split(' ')[0]) ||
      c.description.toLowerCase().includes(queryLower.split(' ').find(w => w.length > 3) || '')
    );
    if (relevantCmds.length > 0) {
      content += `\n### Relevant Commands\n\n`;
      relevantCmds.forEach(cmd => {
        content += `- \`${cmd.command}\` - ${cmd.description}\n`;
        commands.push(cmd.command);
      });
      sources.push('best-practices/operations-guide.md');
    }
  }

  // Memory-related queries
  if (queryLower.includes('memory') || queryLower.includes('ram') || queryLower.includes('oom')) {
    content = `## DGX Spark Memory Architecture\n\nDGX Spark features **128GB of unified LPDDR5x memory** running at 8533 MT/s, shared between the CPU and GPU through a hardware-coherent interface.\n\n### Key Benefits:\n- No explicit CPU-GPU data transfers needed\n- Simplified programming model\n- Efficient for memory-bound workloads\n\n### Memory Management Tips:\n1. Let the hardware manage coherency automatically\n2. Use memory-mapped files for large datasets\n3. Enable gradient checkpointing for large models\n4. Consider INT8/INT4 quantization for inference\n\n`;
    sources.push('hardware/dgx-spark-specifications.md', 'best-practices/operations-guide.md');
    commands.push('nvidia-smi --query-gpu=memory.used,memory.total --format=csv');
  }

  // GPU-related queries
  if (queryLower.includes('gpu') && (queryLower.includes('check') || queryLower.includes('status') || queryLower.includes('monitor'))) {
    content = `## GPU Monitoring Commands\n\n### Quick Status Check\n\`\`\`bash\nnvidia-smi\n\`\`\`\n\n### Detailed Information\n\`\`\`bash\nnvidia-smi -q\n\`\`\`\n\n### Real-time Monitoring\n\`\`\`bash\nnvidia-smi dmon -s u -d 1\n\`\`\`\n\n### DCGM Health Check\n\`\`\`bash\ndcgmi health -c -j\n\`\`\`\n\n`;
    sources.push('troubleshooting/gpu-issues.md');
    commands.push('nvidia-smi', 'nvidia-smi -q', 'dcgmi health -c -j');
  }

  // Temperature queries
  if (queryLower.includes('temperature') || queryLower.includes('thermal') || queryLower.includes('hot') || queryLower.includes('cooling')) {
    content = `## GPU Temperature Management\n\n### Monitoring Temperature\n\`\`\`bash\nnvidia-smi dmon -s pt -d 1\ndcgmi dmon -e 155 -d 1000\n\`\`\`\n\n### Safe Operating Range\n- **Normal:** 30-70°C\n- **Warning:** 70-80°C\n- **Critical:** >80°C (throttling may occur)\n\n### Cooling Solutions:\n1. Ensure adequate clearance (10cm on all sides)\n2. Clean dust filters regularly\n3. Reduce power limit: \`sudo nvidia-smi -pl 200\`\n4. Increase fan speed if needed\n\n`;
    sources.push('troubleshooting/gpu-issues.md', 'best-practices/operations-guide.md');
    commands.push('nvidia-smi dmon -s pt -d 1', 'sudo nvidia-smi -pl 200');
  }

  // Cluster/networking queries
  if (queryLower.includes('cluster') || queryLower.includes('connect') || queryLower.includes('network') || queryLower.includes('node')) {
    content = `## DGX Spark Cluster Configuration\n\n### Interconnect Specifications\n- **Protocol:** USB4/Thunderbolt 4\n- **Bandwidth:** 80 Gbps bidirectional\n- **Latency:** <2μs\n\n### Setup Steps:\n1. Connect USB4 ports with certified cable (max 2m)\n2. Authorize Thunderbolt device: \`boltctl authorize <uuid>\`\n3. Configure network interface:\n\`\`\`bash\nsudo ip link set thunderbolt0 up\nsudo ip addr add 10.0.0.1/24 dev thunderbolt0\n\`\`\`\n\n### Verify Connection:\n\`\`\`bash\nboltctl list\niperf3 -c <peer-ip> -t 30\n\`\`\`\n\n`;
    sources.push('networking/cluster-networking.md');
    commands.push('boltctl list', 'iperf3 -c <peer-ip> -t 30');
  }

  // Spark/RAPIDS queries
  if (queryLower.includes('spark') || queryLower.includes('rapids')) {
    content = `## Apache Spark with RAPIDS Acceleration\n\n### Enable RAPIDS Plugin\nAdd to \`spark-defaults.conf\`:\n\`\`\`properties\nspark.plugins=com.nvidia.spark.SQLPlugin\nspark.rapids.sql.enabled=true\nspark.rapids.memory.gpu.allocFraction=0.7\nspark.executor.resource.gpu.amount=1\nspark.task.resource.gpu.amount=0.25\n\`\`\`\n\n### Submit with RAPIDS:\n\`\`\`bash\nspark-submit \\\n  --conf spark.plugins=com.nvidia.spark.SQLPlugin \\\n  --conf spark.rapids.sql.enabled=true \\\n  your_application.py\n\`\`\`\n\n### Verify GPU Usage:\nCheck Spark UI at http://localhost:4040 for GPU task execution.\n\n`;
    sources.push('troubleshooting/spark-rapids-issues.md', 'software/software-stack.md');
  }

  // Default response if no specific match
  if (!content) {
    content = `I can help you with DGX Spark questions about:\n\n- **Hardware:** Specifications, memory, power requirements\n- **Software:** CUDA, PyTorch, TensorFlow, RAPIDS\n- **Networking:** Cluster setup, USB4 interconnect, firewall\n- **Troubleshooting:** GPU issues, error codes, performance\n- **Spark/RAPIDS:** Configuration, optimization, debugging\n\nPlease ask a specific question or describe the issue you're experiencing.\n\n### Quick Commands:\n- \`nvidia-smi\` - Check GPU status\n- \`dcgmi health -c -j\` - Health check\n- \`boltctl list\` - Check cluster connection\n`;
    sources.push('faq/general-faq.md');
  }

  return { content, sources, commands };
}

export default function SupportPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hello! I'm your DGX Spark Support Assistant. I can help you with hardware specifications, software configuration, troubleshooting, and best practices. How can I assist you today?",
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // Simulate RAG processing delay
    await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 700));

    const response = generateResponse(input);
    
    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: response.content,
      timestamp: new Date(),
      sources: response.sources,
      commands: response.commands,
    };

    setIsTyping(false);
    setMessages(prev => [...prev, assistantMessage]);
  };

  const handleQuickQuestion = (question: string) => {
    setInput(question);
    inputRef.current?.focus();
  };

  const copyCommand = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
  };

  const suggestedQuestions = [
    "How do I check GPU temperature?",
    "What is XID 43 error?",
    "How to enable RAPIDS for Spark?",
    "Connect two DGX Sparks",
    "GPU out of memory fix",
    "Check cluster bandwidth",
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-display text-white flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-orange-500" />
            Support Assistant
          </h1>
          <p className="text-gray-400 mt-1">AI-powered support for your DGX Spark cluster</p>
        </div>
        <Badge variant="outline" className="border-green-500/50 text-green-400">
          <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
          RAG System Online
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chat Area */}
        <div className="lg:col-span-2">
          <GlassCard className="h-[700px] flex flex-col">
            {/* Chat Messages */}
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {message.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center flex-shrink-0">
                        <Bot className="w-5 h-5 text-white" />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-xl p-4 ${
                        message.role === 'user'
                          ? 'bg-orange-500/20 border border-orange-500/30'
                          : 'bg-white/5 border border-white/10'
                      }`}
                    >
                      <div className="prose prose-invert prose-sm max-w-none">
                        <div className="whitespace-pre-wrap text-sm text-gray-200">
                          {message.content.split('```').map((part, i) => {
                            if (i % 2 === 1) {
                              const [lang, ...code] = part.split('\n');
                              return (
                                <pre key={i} className="bg-black/50 rounded-lg p-3 my-2 overflow-x-auto">
                                  <code className="text-green-400 text-xs font-mono">
                                    {code.join('\n')}
                                  </code>
                                </pre>
                              );
                            }
                            return <span key={i}>{part}</span>;
                          })}
                        </div>
                      </div>
                      
                      {/* Sources */}
                      {message.sources && message.sources.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-white/10">
                          <p className="text-xs text-gray-500 mb-2">Sources:</p>
                          <div className="flex flex-wrap gap-2">
                            {message.sources.map((source, i) => (
                              <Badge key={i} variant="outline" className="text-xs border-blue-500/30 text-blue-400">
                                <FileText className="w-3 h-3 mr-1" />
                                {source}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Quick Commands */}
                      {message.commands && message.commands.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-white/10">
                          <p className="text-xs text-gray-500 mb-2">Quick Commands:</p>
                          <div className="flex flex-wrap gap-2">
                            {message.commands.slice(0, 3).map((cmd, i) => (
                              <button
                                key={i}
                                onClick={() => copyCommand(cmd)}
                                className="flex items-center gap-1 px-2 py-1 rounded bg-black/30 text-xs font-mono text-green-400 hover:bg-black/50 transition-colors"
                              >
                                <Terminal className="w-3 h-3" />
                                {cmd.length > 30 ? cmd.slice(0, 30) + '...' : cmd}
                                <Copy className="w-3 h-3 ml-1 opacity-50" />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Feedback */}
                      {message.role === 'assistant' && message.id !== '1' && (
                        <div className="mt-3 pt-3 border-t border-white/10 flex items-center gap-2">
                          <span className="text-xs text-gray-500">Was this helpful?</span>
                          <button className="p-1 hover:bg-white/10 rounded transition-colors">
                            <ThumbsUp className="w-4 h-4 text-gray-400 hover:text-green-400" />
                          </button>
                          <button className="p-1 hover:bg-white/10 rounded transition-colors">
                            <ThumbsDown className="w-4 h-4 text-gray-400 hover:text-red-400" />
                          </button>
                        </div>
                      )}

                      <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {message.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                    {message.role === 'user' && (
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-white" />
                      </div>
                    )}
                  </div>
                ))}

                {isTyping && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Suggested Questions */}
            <div className="px-4 py-2 border-t border-white/10">
              <div className="flex gap-2 overflow-x-auto pb-2">
                {suggestedQuestions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => handleQuickQuestion(q)}
                    className="flex-shrink-0 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-gray-300 hover:bg-white/10 hover:border-orange-500/30 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-white/10">
              <div className="flex gap-3">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Ask about DGX Spark hardware, software, or troubleshooting..."
                  className="flex-1 bg-white/5 border-white/10 focus:border-orange-500/50"
                />
                <Button
                  onClick={handleSend}
                  disabled={!input.trim() || isTyping}
                  className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Reference */}
          <GlassCard className="p-4">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-orange-500" />
              Quick Reference
            </h3>
            <Tabs defaultValue="errors" className="w-full">
              <TabsList className="w-full bg-white/5">
                <TabsTrigger value="errors" className="flex-1 text-xs">Errors</TabsTrigger>
                <TabsTrigger value="commands" className="flex-1 text-xs">Commands</TabsTrigger>
              </TabsList>
              <TabsContent value="errors" className="mt-4">
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {knowledgeIndex.errorCodes.map((error, i) => (
                    <button
                      key={i}
                      onClick={() => handleQuickQuestion(`What is ${error.code}?`)}
                      className="w-full text-left p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-sm text-orange-400">{error.code}</span>
                        <Badge
                          variant="outline"
                          className={
                            error.severity === 'critical' ? 'border-red-500/50 text-red-400' :
                            error.severity === 'high' ? 'border-orange-500/50 text-orange-400' :
                            'border-yellow-500/50 text-yellow-400'
                          }
                        >
                          {error.severity}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">{error.description}</p>
                    </button>
                  ))}
                </div>
              </TabsContent>
              <TabsContent value="commands" className="mt-4">
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {knowledgeIndex.commands.map((cmd, i) => (
                    <button
                      key={i}
                      onClick={() => copyCommand(cmd.command)}
                      className="w-full text-left p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group"
                    >
                      <div className="flex items-center justify-between">
                        <code className="text-xs text-green-400 font-mono">{cmd.command}</code>
                        <Copy className="w-3 h-3 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <p className="text-xs text-gray-400 mt-1">{cmd.description}</p>
                    </button>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </GlassCard>

          {/* Knowledge Categories */}
          <GlassCard className="p-4">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-orange-500" />
              Knowledge Base
            </h3>
            <div className="space-y-2">
              {knowledgeIndex.categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleQuickQuestion(`Tell me about ${cat.name.toLowerCase()}`)}
                  className="w-full flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <cat.icon className={`w-5 h-5 ${cat.color}`} />
                    <span className="text-sm text-gray-300">{cat.name}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-orange-500 transition-colors" />
                </button>
              ))}
            </div>
          </GlassCard>

          {/* Help Links */}
          <GlassCard className="p-4">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-orange-500" />
              Additional Resources
            </h3>
            <div className="space-y-2">
              <a
                href="https://docs.nvidia.com/dgx/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              >
                <span className="text-sm text-gray-300">NVIDIA DGX Documentation</span>
                <ExternalLink className="w-4 h-4 text-gray-500" />
              </a>
              <a
                href="https://github.com/NVIDIA/dgx-spark-playbooks"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              >
                <span className="text-sm text-gray-300">DGX Spark Playbooks</span>
                <ExternalLink className="w-4 h-4 text-gray-500" />
              </a>
              <a
                href="https://forums.developer.nvidia.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              >
                <span className="text-sm text-gray-300">NVIDIA Developer Forums</span>
                <ExternalLink className="w-4 h-4 text-gray-500" />
              </a>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
