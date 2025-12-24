# Frontend-Backend Integration Assessment

## Executive Summary

This document provides a comprehensive assessment of the DGX Spark Command Center's frontend-backend integration. The application uses **tRPC** for type-safe API communication between a React frontend and Node.js/Express backend.

---

## Current Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                     Frontend (React + Vite)                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐               │
│  │ Pages       │  │ Hooks       │  │ Components  │               │
│  │ - Dashboard │  │ - useMetrics│  │ - UI        │               │
│  │ - Nodes     │  │ - useAuth   │  │ - Metrics   │               │
│  │ - Spark     │  │             │  │ - Spark     │               │
│  │ - Logs      │  │             │  │             │               │
│  │ - Power     │  │             │  │             │               │
│  │ - Network   │  │             │  │             │               │
│  │ - Backup    │  │             │  │             │               │
│  │ - Settings  │  │             │  │             │               │
│  │ - Inference │  │             │  │             │               │
│  └──────┬──────┘  └──────┬──────┘  └─────────────┘               │
│         │                │                                        │
│         └────────┬───────┘                                        │
│                  ▼                                                │
│         ┌───────────────┐                                         │
│         │ tRPC Client   │  ← httpBatchLink to /api/trpc          │
│         │ + TanStack    │                                         │
│         │   Query       │                                         │
│         └───────┬───────┘                                         │
└─────────────────┼────────────────────────────────────────────────┘
                  │ POST /api/trpc
┌─────────────────┼────────────────────────────────────────────────┐
│                 ▼                   Backend (Express + tRPC)      │
│         ┌───────────────┐                                         │
│         │ tRPC Router   │                                         │
│         └───────┬───────┘                                         │
│                 │                                                 │
│  ┌──────────────┼──────────────┐                                  │
│  ▼              ▼              ▼                                  │
│ ┌────────┐ ┌─────────┐ ┌───────────┐ ┌────────┐ ┌───────┐        │
│ │metrics │ │ spark   │ │  local    │ │ logs   │ │ power │        │
│ │ Router │ │ Router  │ │  Router   │ │ Router │ │ Router│        │
│ └────────┘ └─────────┘ └───────────┘ └────────┘ └───────┘        │
│                                                                   │
│ ┌────────┐ ┌─────────┐                                            │
│ │ config │ │ auth    │                                            │
│ │ Router │ │ Router  │                                            │
│ └────────┘ └─────────┘                                            │
│                                                                   │
│         ┌───────────────┐                                         │
│         │   Services    │                                         │
│         │ - metrics.ts  │                                         │
│         │ - spark.ts    │                                         │
│         │ - local-*.ts  │                                         │
│         └───────────────┘                                         │
└───────────────────────────────────────────────────────────────────┘
```

---

## Integration Status by Page

### ✅ Fully Wired Pages

| Page | Backend Routers Used | Status |
|------|---------------------|--------|
| **DashboardPage** | `local.getOverview`, `spark.getClusterResources`, `spark.getJobHistory`, `local.getStorage` | ✅ Complete |
| **NodesPage** | `local.getMetrics`, `local.getSystemInfo`, `local.health`, `local.getProcesses` | ✅ Complete |
| **SparkPage** | `spark.getApplications`, `spark.getJobHistory`, `spark.getClusterResources`, `spark.submitJob`, `spark.killJob`, `spark.getJobTemplates` | ✅ Complete |
| **LogsPage** | `logs.getLogs`, `logs.getServices`, `logs.getStats` | ✅ Complete |
| **PowerPage** | `power.getPowerState`, `power.getThermalProfiles`, `power.getPowerHistory`, `power.setPowerLimit`, `power.setFanSpeed`, `power.resetFanAuto`, `power.applyThermalProfile` | ✅ Complete |
| **NetworkPage** | `local.getNetwork`, `local.health` | ✅ Partial (see gaps) |
| **BackupPage** | `config.getConfig`, `config.listBackups`, `config.exportConfig`, `config.importConfig`, `config.createBackup`, `config.restoreBackup`, `config.deleteBackup`, `config.resetToDefaults`, `config.validateConfig` | ✅ Complete |

### ⚠️ Partially Wired Pages

| Page | Connected | Missing |
|------|-----------|---------|
| **SettingsPage** | `metrics.testConnection`, `metrics.healthCheck` | Alert rules not persisted, Splunk/Chronicle config not persisted to config router |
| **NetworkPage** | Network interfaces via `local.getNetwork` | Active connections (hardcoded mock), Local services status (hardcoded mock) |

### ❌ Not Wired Pages

| Page | Current State | Required Backend |
|------|---------------|------------------|
| **InferencePage** | 100% mock data, simulated chat responses | Needs LLM service integration (vLLM API) |

---

## Detailed Gap Analysis

### 1. InferencePage - No Backend Connection

**Current State:**
- Mock models array (Llama 3, Mistral, CodeLlama)
- Simulated chat responses with random delays
- Mock performance metrics (tokens/sec, latency)

**Required Backend Endpoints:**
```typescript
// Suggested: server/routers/inference.ts
inferenceRouter = {
  getModels: publicProcedure.query() // List available models
  chat: publicProcedure.input(chatSchema).mutation() // Send message, stream response
  getMetrics: publicProcedure.query() // Real-time inference metrics
  loadModel: protectedProcedure.input(modelSchema).mutation() // Load/unload models
}
```

**Integration Notes:**
- vLLM typically runs on port 8000
- Supports OpenAI-compatible API
- Can stream responses via SSE

---

### 2. NetworkPage - Partial Mock Data

**Connected:**
- `local.getNetwork` - Real network interface data ✅
- `local.health` - Health status ✅

**Mock Data Still Used:**
```typescript
// Lines 97-104: Hardcoded active connections
const connections = [
  { remote: "192.168.1.100", port: 22, protocol: "SSH", state: "ESTABLISHED" },
  // ...
];

// Lines 344-353: Hardcoded local services
const services = [
  { name: "Command Center", port: 3000, status: "running" },
  // ...
];
```

**Required Backend Endpoints:**
```typescript
// Suggested additions to server/routers/local.ts
getConnections: publicProcedure.query() // netstat/ss output
getServices: publicProcedure.query() // systemctl status of key services
```

---

### 3. SettingsPage - Partial Persistence

**Connected:**
- `metrics.testConnection` - Test Prometheus connection ✅
- `metrics.healthCheck` - Health check ✅

**Not Persisted:**
- Alert rules (lines 34-40) - Local state only
- Splunk configuration (lines 76-85) - Local state only
- Prometheus configuration (lines 67-72) - Local state only
- Chronicle configuration - Local state only

**Required Changes:**
1. Store alert rules in `config.ts` schema under `alerts.rules`
2. Add integrations config for Splunk/Chronicle
3. Connect UI state to `config.updateConfig` mutation

---

### 4. useMetrics Hook - Fallback Mock Data

**File:** `client/src/hooks/useMetrics.ts`

The hook properly calls tRPC endpoints but has fallback mock data. This is acceptable for resilience but should log when falling back:

```typescript
// Current pattern (acceptable):
const { data, isLoading, isError } = trpc.metrics.clusterOverview.useQuery(...)

// Fallback to mock when real data unavailable
if (!data && !isLoading) {
  return mockClusterOverview;
}
```

---

## Backend Router Inventory

### Existing Routers & Endpoints

| Router | Endpoints | Status |
|--------|-----------|--------|
| **metrics** | `healthCheck`, `clusterOverview`, `gpuMetrics`, `nodeMetrics`, `gpuUtilizationHistory`, `memoryUsageHistory`, `testConnection` | ✅ Implemented (history data is simulated) |
| **spark** | `getApplications`, `getJobHistory`, `getJobStatus`, `getClusterResources`, `submitJob`, `killJob`, `getJobTemplates` | ✅ Implemented |
| **local** | `getGPU`, `getCPU`, `getOverview`, `getNetwork`, `getStorage`, `getMetrics`, `getSystemInfo`, `getProcesses`, `health` | ✅ Implemented |
| **logs** | `getLogs`, `getServices`, `getStats` | ✅ Implemented |
| **power** | `getPowerState`, `getThermalProfiles`, `getPowerHistory`, `setPowerLimit`, `setFanSpeed`, `resetFanAuto`, `applyThermalProfile` | ✅ Implemented |
| **config** | `getConfig`, `updateConfig`, `exportConfig`, `importConfig`, `createBackup`, `listBackups`, `restoreBackup`, `deleteBackup`, `resetToDefaults`, `validateConfig` | ✅ Implemented |
| **auth** | `me`, `logout` | ✅ Implemented |
| **system** | Health check | ✅ Implemented |

### Missing Routers

| Router | Purpose | Priority |
|--------|---------|----------|
| **inference** | LLM/vLLM integration | High |
| **services** | Local service status (systemctl) | Medium |
| **connections** | Active network connections | Low |

---

## Recommended Wiring Tasks

### High Priority

1. **Create `inference` Router**
   - Connect to vLLM API (OpenAI-compatible)
   - Implement streaming responses
   - Add model management endpoints

2. **Wire SettingsPage to Config Router**
   - Add `integrations` section to ConfigSchema
   - Persist alert rules, Splunk, Chronicle settings
   - Call `config.updateConfig` on save

### Medium Priority

3. **Add Network Connections Endpoint**
   - Parse `ss` or `netstat` output
   - Filter for relevant connections

4. **Add Services Status Endpoint**
   - Check status of DCGM Exporter, Node Exporter, Spark, vLLM
   - Use `systemctl status` or process checks

### Low Priority

5. **Replace History Mock Data**
   - Connect `gpuUtilizationHistory` to real Prometheus queries
   - Connect `memoryUsageHistory` to real Prometheus queries

---

## Implementation Checklist

```
Frontend-Backend Wiring Tasks:
□ Create server/routers/inference.ts
  □ GET /models - List available LLM models
  □ POST /chat - Send message, receive streaming response
  □ GET /metrics - Real-time inference metrics

□ Update server/routers/local.ts
  □ Add getConnections endpoint (parse ss/netstat)
  □ Add getServiceStatus endpoint (systemctl checks)

□ Update server/routers/config.ts
  □ Add integrations schema (Splunk, Chronicle, PagerDuty)
  □ Add alerts.rules persistence

□ Update client/src/pages/InferencePage.tsx
  □ Replace mock models with trpc.inference.getModels
  □ Replace simulated chat with trpc.inference.chat
  □ Connect metrics display to real backend

□ Update client/src/pages/SettingsPage.tsx
  □ Load alert rules from config
  □ Save alert rules to config
  □ Load/save integration configs

□ Update client/src/pages/NetworkPage.tsx
  □ Replace mock connections with trpc.local.getConnections
  □ Replace mock services with trpc.local.getServiceStatus
```

---

## Architecture Recommendations

### Type Safety
The current tRPC setup provides excellent type safety. Continue using:
- Zod schemas for input validation
- Shared types in `/shared/dgx-types.ts`
- Automatic type inference from router definitions

### Error Handling
Current pattern is good:
- TRPCClientError interception in main.tsx
- Automatic redirect on auth errors
- Toast notifications for mutations

### Data Fetching Strategy
Current `refetchInterval` polling is appropriate for real-time monitoring:
- Dashboard: 3-5 seconds
- Metrics: 2-3 seconds
- Logs: 5 seconds
- Config: 30 seconds

Consider WebSocket for:
- Streaming inference responses
- Real-time log tailing
- Critical alerts

---

## Conclusion

The DGX Spark Command Center has a solid frontend-backend integration foundation using tRPC. **70-80% of pages are fully wired** to real backend data. The main gaps are:

1. **InferencePage** - Needs complete backend implementation
2. **SettingsPage** - Needs config persistence
3. **NetworkPage** - Minor mock data replacement

With the recommended changes, the application will achieve full frontend-backend integration.
