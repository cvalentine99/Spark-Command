import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";

// Schema for chat messages
const ChatMessageSchema = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.string(),
});

// Schema for model info
const ModelInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["Chat", "Code", "Embedding"]),
  contextLength: z.string(),
  status: z.enum(["ready", "loading", "error", "offline"]),
  parameters: z.string().optional(),
  quantization: z.string().optional(),
});

// vLLM API configuration
const VLLM_BASE_URL = process.env.VLLM_URL || "http://localhost:8000";

// Helper to check if vLLM is available
async function checkVLLMHealth(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const response = await fetch(`${VLLM_BASE_URL}/health`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    return false;
  }
}

// Helper to get models from vLLM
async function getVLLMModels(): Promise<{ id: string; object: string }[]> {
  try {
    const response = await fetch(`${VLLM_BASE_URL}/v1/models`);
    if (!response.ok) return [];
    const data = await response.json();
    return data.data || [];
  } catch {
    return [];
  }
}

export const inferenceRouter = router({
  // Get available models
  getModels: publicProcedure.query(async () => {
    const isVLLMAvailable = await checkVLLMHealth();

    if (isVLLMAvailable) {
      // Get real models from vLLM
      const vllmModels = await getVLLMModels();

      const models: z.infer<typeof ModelInfoSchema>[] = vllmModels.map((model) => ({
        id: model.id,
        name: model.id.split("/").pop() || model.id,
        type: "Chat" as const,
        contextLength: "8k",
        status: "ready" as const,
        parameters: "Unknown",
        quantization: "FP16",
      }));

      return {
        models,
        source: "vllm" as const,
        vllmUrl: VLLM_BASE_URL,
      };
    }

    // Return default models when vLLM is not available
    const defaultModels: z.infer<typeof ModelInfoSchema>[] = [
      {
        id: "llama-3-70b",
        name: "Llama 3 (70B)",
        type: "Chat",
        contextLength: "8k",
        status: "offline",
        parameters: "70B",
        quantization: "FP8",
      },
      {
        id: "mistral-large",
        name: "Mistral Large",
        type: "Chat",
        contextLength: "32k",
        status: "offline",
        parameters: "70B",
        quantization: "FP16",
      },
      {
        id: "codellama-70b",
        name: "CodeLlama (70B)",
        type: "Code",
        contextLength: "16k",
        status: "offline",
        parameters: "70B",
        quantization: "FP8",
      },
    ];

    return {
      models: defaultModels,
      source: "default" as const,
      vllmUrl: VLLM_BASE_URL,
    };
  }),

  // Check inference service health
  health: publicProcedure.query(async () => {
    const isAvailable = await checkVLLMHealth();

    return {
      status: isAvailable ? "healthy" : "unavailable",
      vllmUrl: VLLM_BASE_URL,
      timestamp: new Date().toISOString(),
    };
  }),

  // Send chat message to LLM
  chat: publicProcedure
    .input(
      z.object({
        modelId: z.string(),
        messages: z.array(ChatMessageSchema),
        temperature: z.number().min(0).max(2).default(0.7),
        maxTokens: z.number().min(1).max(4096).default(2048),
        topP: z.number().min(0).max(1).default(0.9),
      })
    )
    .mutation(async ({ input }) => {
      const isVLLMAvailable = await checkVLLMHealth();

      if (!isVLLMAvailable) {
        // Return simulated response when vLLM is not available
        const simulatedResponses = [
          "I've analyzed the cluster telemetry. It appears that the system is operating normally with optimal GPU utilization.",
          "Based on my analysis, the Spark job completed successfully. The shuffle phase showed good data distribution across partitions.",
          "I recommend checking the memory allocation for your current workload. The unified memory shows 68% utilization which is within normal operating parameters.",
          "The inference metrics indicate stable performance with an average latency of 25ms per token generation.",
        ];

        const randomResponse = simulatedResponses[Math.floor(Math.random() * simulatedResponses.length)];

        return {
          success: true,
          response: {
            role: "assistant" as const,
            content: randomResponse,
          },
          metrics: {
            tokensPerSecond: Math.floor(Math.random() * 60 + 120),
            latencyMs: Math.floor(Math.random() * 30 + 15),
            totalTokens: Math.floor(Math.random() * 200 + 50),
            promptTokens: input.messages.reduce((acc, m) => acc + m.content.length / 4, 0),
            completionTokens: randomResponse.length / 4,
          },
          source: "simulated" as const,
        };
      }

      // Real vLLM API call
      try {
        const startTime = Date.now();

        const response = await fetch(`${VLLM_BASE_URL}/v1/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: input.modelId,
            messages: input.messages,
            temperature: input.temperature,
            max_tokens: input.maxTokens,
            top_p: input.topP,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`vLLM API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        const endTime = Date.now();
        const latencyMs = endTime - startTime;

        const choice = data.choices?.[0];
        const usage = data.usage || {};

        return {
          success: true,
          response: {
            role: "assistant" as const,
            content: choice?.message?.content || "No response generated",
          },
          metrics: {
            tokensPerSecond: Math.round((usage.completion_tokens || 0) / (latencyMs / 1000)),
            latencyMs,
            totalTokens: usage.total_tokens || 0,
            promptTokens: usage.prompt_tokens || 0,
            completionTokens: usage.completion_tokens || 0,
          },
          source: "vllm" as const,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        return {
          success: false,
          error: errorMessage,
          response: {
            role: "assistant" as const,
            content: `Error: Unable to generate response. ${errorMessage}`,
          },
          metrics: {
            tokensPerSecond: 0,
            latencyMs: 0,
            totalTokens: 0,
            promptTokens: 0,
            completionTokens: 0,
          },
          source: "error" as const,
        };
      }
    }),

  // Get real-time inference metrics
  getMetrics: publicProcedure.query(async () => {
    const isVLLMAvailable = await checkVLLMHealth();

    if (isVLLMAvailable) {
      // Try to get real metrics from vLLM
      try {
        const response = await fetch(`${VLLM_BASE_URL}/metrics`);
        if (response.ok) {
          const metricsText = await response.text();
          // Parse Prometheus metrics format
          // vLLM exposes metrics like vllm:num_requests_running, vllm:gpu_cache_usage_perc, etc.

          const parseMetric = (name: string): number => {
            const match = metricsText.match(new RegExp(`${name}\\s+([\\d.]+)`));
            return match ? parseFloat(match[1]) : 0;
          };

          return {
            status: "connected",
            requestsRunning: parseMetric("vllm:num_requests_running"),
            requestsWaiting: parseMetric("vllm:num_requests_waiting"),
            gpuCacheUsagePercent: parseMetric("vllm:gpu_cache_usage_perc") * 100,
            kvCacheUsagePercent: parseMetric("vllm:gpu_cache_usage_perc") * 100,
            avgPromptThroughput: parseMetric("vllm:avg_prompt_throughput_toks_per_s"),
            avgGenerationThroughput: parseMetric("vllm:avg_generation_throughput_toks_per_s"),
            source: "vllm",
          };
        }
      } catch {
        // Fall through to simulated metrics
      }
    }

    // Simulated metrics when vLLM is not available
    return {
      status: isVLLMAvailable ? "connected" : "simulated",
      requestsRunning: Math.floor(Math.random() * 3),
      requestsWaiting: Math.floor(Math.random() * 5),
      gpuCacheUsagePercent: Math.random() * 60 + 20,
      kvCacheUsagePercent: Math.random() * 50 + 30,
      avgPromptThroughput: Math.random() * 1000 + 500,
      avgGenerationThroughput: Math.random() * 200 + 100,
      source: isVLLMAvailable ? "vllm" : "simulated",
    };
  }),

  // Load/unload a model (admin operation)
  loadModel: publicProcedure
    .input(
      z.object({
        modelId: z.string(),
        action: z.enum(["load", "unload"]),
      })
    )
    .mutation(async ({ input }) => {
      // Note: vLLM typically doesn't support dynamic model loading via API
      // This would require restarting the vLLM server with different model
      // For now, return a message indicating this limitation

      return {
        success: false,
        message: `Model ${input.action} operation requires vLLM server restart. Please use the CLI to change models.`,
        modelId: input.modelId,
        action: input.action,
      };
    }),
});
