# DGX Spark Command Center - Frontend-Backend Audit Report

## Executive Summary

This audit identifies all stubs, incomplete implementations, and code that needs to be finished to connect the frontend to real backend APIs. Currently, most frontend pages use **simulated/mock data** instead of calling the backend APIs.

---

## Backend Status

### Implemented Routers (server/routers/)

| Router | Status | Notes |
|--------|--------|-------|
| `metrics.ts` | ✅ Implemented | Connects to Prometheus service, falls back to simulated data |
| `spark.ts` | ✅ Implemented | Full Spark REST API integration, in-memory job history |
| `logs.ts` | ✅ Implemented | Falls back to simulated logs when journalctl unavailable |
| `power.ts` | ✅ Implemented | Falls back to simulated data when nvidia-smi unavailable |
| `config.ts` | ✅ Implemented | File-based backup/restore system |
| `local.ts` | ✅ Implemented | Local system info endpoints |

### Backend Services (server/services/)

| Service | Status | Notes |
|---------|--------|-------|
| `prometheus.ts` | ⚠️ Partial | Works when Prometheus available, simulates otherwise |
| `local-metrics.ts` | ⚠️ Partial | Falls back to simulation when nvidia-smi unavailable |
| `spark.ts` | ✅ Implemented | Full Spark REST API client |

---

## Frontend Pages - API Connection Status

### 1. DashboardPage.tsx
**Status: ❌ NOT CONNECTED**

**Current State:**
- Uses `useState` with hardcoded initial values
- Simulates metric updates with `setInterval` and `Math.random()`

**Required Changes:**
```typescript
// Current (simulated):
const [metrics, setMetrics] = useState({
  gpuUtil: 72,
  gpuTemp: 58,
  ...
});

// Needed:
const metricsQuery = trpc.metrics.gpuMetrics.useQuery();
const nodeQuery = trpc.metrics.nodeMetrics.useQuery();
```

**Backend Endpoints Available:**
- `trpc.metrics.gpuMetrics` - GPU utilization, temp, power
- `trpc.metrics.nodeMetrics` - CPU, memory, disk
- `trpc.metrics.clusterOverview` - Overall cluster status

---

### 2. NodesPage.tsx (Hardware)
**Status: ❌ NOT CONNECTED**

**Current State:**
- Uses `useState` with hardcoded telemetry values
- Simulates updates with `setInterval`

**Required Changes:**
```typescript
// Current (simulated):
const [telemetry, setTelemetry] = useState({
  cpuLoad: 45,
  memoryUsed: 78,
  gpuUtil: 72,
  ...
});

// Needed:
const gpuMetrics = trpc.metrics.gpuMetrics.useQuery(undefined, { refetchInterval: 2000 });
const nodeMetrics = trpc.metrics.nodeMetrics.useQuery(undefined, { refetchInterval: 2000 });
```

---

### 3. SparkPage.tsx
**Status: ✅ PARTIALLY CONNECTED**

**Connected:**
- `trpc.spark.submitJob.useMutation()` - Job submission
- `trpc.spark.getJobHistory.useQuery()` - Job history
- `trpc.spark.getClusterResources.useQuery()` - Cluster resources
- `trpc.spark.killJob.useMutation()` - Kill jobs

**Not Connected:**
- Active jobs list uses `mockActiveJobs` array instead of API
- Should use `trpc.spark.getApplications.useQuery()`

---

### 4. InferencePage.tsx
**Status: ❌ NOT CONNECTED**

**Current State:**
- Uses hardcoded `models` array
- Simulates chat responses with `setTimeout`
- No actual vLLM/inference backend integration

**Required Backend:**
- Need to create `inference` router with:
  - `listModels` - List available models
  - `chat` - Send messages to vLLM
  - `getMetrics` - Inference throughput/latency

---

### 5. NetworkPage.tsx
**Status: ❌ NOT CONNECTED**

**Current State:**
- Uses `useState` with hardcoded values
- Simulates bandwidth with `setInterval`
- Hardcoded connection list

**Backend Available (not used):**
- ExtraHop service exists but not connected to this page
- Should use `trpc.extrahop.getDGXClusterNetwork` (if router added)

---

### 6. LogsPage.tsx
**Status: ❌ NOT CONNECTED**

**Current State:**
- Uses `generateSimulatedLogs()` function
- No API calls to backend

**Backend Available:**
- `trpc.logs.getLogs` - Fetch system logs
- `trpc.logs.getStats` - Log statistics
- `trpc.logs.streamLogs` - Real-time log streaming

**Required Changes:**
```typescript
// Current:
useEffect(() => {
  setLogs(generateSimulatedLogs(100));
}, []);

// Needed:
const logsQuery = trpc.logs.getLogs.useQuery({
  limit: 100,
  services: selectedServices,
  levels: selectedLevels,
});
```

---

### 7. PowerPage.tsx
**Status: ❌ NOT CONNECTED**

**Current State:**
- Uses `defaultPowerState` constant
- Simulates updates with `setInterval`
- Actions only update local state

**Backend Available:**
- `trpc.power.getState` - Current power state
- `trpc.power.setPowerLimit` - Set GPU power limit
- `trpc.power.setFanSpeed` - Set fan speed
- `trpc.power.applyProfile` - Apply thermal profile
- `trpc.power.getHistory` - Power/temp history

---

### 8. BackupPage.tsx
**Status: ❌ NOT CONNECTED**

**Current State:**
- Uses `defaultConfig` constant
- Uses `initialBackups` array
- Export/import only works with local state

**Backend Available:**
- `trpc.config.exportConfig` - Export configuration
- `trpc.config.importConfig` - Import configuration
- `trpc.config.listBackups` - List saved backups
- `trpc.config.createBackup` - Create new backup
- `trpc.config.restoreBackup` - Restore from backup
- `trpc.config.deleteBackup` - Delete backup

---

### 9. SettingsPage.tsx
**Status: ✅ PARTIALLY CONNECTED**

**Connected:**
- `trpc.metrics.updateConfig.useMutation()` - Prometheus config
- `trpc.metrics.healthCheck.useQuery()` - Connection status

**Not Connected:**
- Splunk integration (local state only)
- Alert rules (local state only)
- Chronicle integration (local state only)

---

### 10. SupportPage.tsx
**Status: ❌ NOT CONNECTED**

**Current State:**
- Uses hardcoded `knowledgeIndex` object
- Simulates AI responses with pattern matching
- No actual AI/LLM backend

**Required Backend:**
- Need AI chat endpoint or integrate with vLLM
- Could use local knowledge base search

---

### 11. JobDetailsPage.tsx
**Status: ❌ NOT CONNECTED**

**Current State:**
- Uses `mockJobDetails` constant
- No API calls

**Backend Available:**
- `trpc.spark.getJobStatus` - Get job status
- `trpc.spark.getApplicationDetails` - Get application details

---

## Priority Implementation Order

### High Priority (Core Functionality)
1. **DashboardPage** - Main landing page, should show real metrics
2. **NodesPage** - Hardware monitoring is critical
3. **LogsPage** - System logs are essential for debugging
4. **PowerPage** - Power management needs real GPU control

### Medium Priority (Feature Pages)
5. **SparkPage** - Partially done, finish active jobs list
6. **BackupPage** - Connect to backend for persistence
7. **NetworkPage** - Connect to ExtraHop or local network stats

### Lower Priority (Enhancement)
8. **InferencePage** - Requires vLLM backend setup
9. **SupportPage** - AI chat is nice-to-have
10. **SettingsPage** - Mostly UI, backend partially connected

---

## Code Patterns to Use

### Query Pattern (Read Data)
```typescript
const { data, isLoading, error, refetch } = trpc.router.endpoint.useQuery(
  { param: value },
  { 
    refetchInterval: 5000,  // Auto-refresh every 5s
    enabled: true,          // Conditional fetching
  }
);
```

### Mutation Pattern (Write Data)
```typescript
const mutation = trpc.router.endpoint.useMutation({
  onSuccess: (data) => {
    toast.success("Action completed");
    queryClient.invalidateQueries(['router.endpoint']);
  },
  onError: (error) => {
    toast.error(error.message);
  },
});

// Usage:
mutation.mutate({ param: value });
```

---

## Summary Table

| Page | API Connected | Backend Ready | Work Needed |
|------|--------------|---------------|-------------|
| DashboardPage | ❌ | ✅ | Connect to metrics API |
| NodesPage | ❌ | ✅ | Connect to metrics API |
| SparkPage | ⚠️ Partial | ✅ | Connect active jobs list |
| InferencePage | ❌ | ❌ | Create inference router |
| NetworkPage | ❌ | ⚠️ | Add ExtraHop router or local stats |
| LogsPage | ❌ | ✅ | Connect to logs API |
| PowerPage | ❌ | ✅ | Connect to power API |
| BackupPage | ❌ | ✅ | Connect to config API |
| SettingsPage | ⚠️ Partial | ⚠️ | Connect remaining integrations |
| SupportPage | ❌ | ❌ | Create AI/knowledge router |
| JobDetailsPage | ❌ | ✅ | Connect to spark API |

---

## Estimated Work

| Task | Complexity | Time Estimate |
|------|------------|---------------|
| Connect DashboardPage | Medium | 1-2 hours |
| Connect NodesPage | Medium | 1-2 hours |
| Connect LogsPage | Low | 30 min |
| Connect PowerPage | Medium | 1 hour |
| Connect BackupPage | Medium | 1 hour |
| Finish SparkPage | Low | 30 min |
| Connect NetworkPage | Medium | 1-2 hours |
| Create Inference Router | High | 3-4 hours |
| Create Support AI Router | High | 2-3 hours |

**Total Estimated: 12-18 hours**
