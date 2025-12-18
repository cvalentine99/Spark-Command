# DGX Spark Command Center - Architecture & Component Structure

## 1. Application Architecture

The application follows a **Single Page Application (SPA)** architecture using **React 19** and **Wouter** for client-side routing. It is designed to be a "Glassmorphism" style command center with real-time data visualization capabilities.

### Tech Stack
- **Frontend**: React 19, TypeScript, Tailwind CSS 4
- **Routing**: Wouter
- **State Management**: React Context + Hooks (for local state), TanStack Query (recommended for future API integration)
- **UI Library**: shadcn/ui (customized for "Neural Glass" theme)
- **Visualization**: Recharts (for metrics), Framer Motion (for animations)
- **Icons**: Lucide React

## 2. Navigation Structure

The application is divided into the following key views:

1.  **Dashboard (Overview)** `/`
    -   High-level cluster health (Heartbeat, Online Status).
    -   Aggregate GPU/CPU utilization.
    -   Active Job count.
    -   Recent Alerts.
2.  **Nodes (Hardware)** `/nodes`
    -   Detailed view of Node A and Node B.
    -   Per-GPU telemetry (Temp, Power, Memory).
    -   Thermal status.
3.  **Spark (Data Engine)** `/spark`
    -   Job Queue & History.
    -   Executor status.
    -   RAPIDS acceleration metrics.
4.  **Inference (AI/ML)** `/inference`
    -   vLLM Service Status.
    -   Model Serving metrics (Token/sec, Latency).
    -   Interactive Playground.
5.  **Network (Topology)** `/network`
    -   Visual topology map (Node A <-> Node B).
    -   ConnectX-7 Bandwidth utilization.
    -   Latency heatmaps.
6.  **Settings (Admin)** `/settings`
    -   Cluster configuration.
    -   User management.
    -   Logs & Diagnostics.

## 3. Component Hierarchy

```
App
├── Layout (MainLayout)
│   ├── Sidebar (Navigation)
│   ├── Header (HUD, Global Search, User Profile)
│   └── MainContent (Page Container)
│       ├── DashboardPage
│       │   ├── ClusterHealthWidget
│       │   ├── ResourceOverview (CPU/GPU/RAM)
│       │   └── ActiveJobsList
│       ├── NodesPage
│       │   ├── NodeCard (Node A)
│       │   └── NodeCard (Node B)
│       ├── SparkPage
│       │   ├── JobTable
│       │   └── ExecutorGrid
│       └── ...
└── Toaster (Notifications)
```

## 4. Key Reusable Components

-   **`GlassCard`**: The fundamental building block. A container with backdrop-blur, semi-transparent background, and subtle border.
-   **`MetricGauge`**: Circular or linear gauge for displaying percentages (GPU Util, RAM).
-   **`SparkLine`**: Mini line chart for trend visualization within cards.
-   **`StatusIndicator`**: Glowing dot (Green/Orange/Red) to indicate system state.
-   **`TerminalBlock`**: A styled container for displaying logs or code snippets with syntax highlighting.
-   **`DataStream`**: An animated background element simulating data flow.

## 5. Data Model (Mock/Types)

Since this is currently a static frontend, we will define TypeScript interfaces for our data entities to ensure type safety and easy API integration later.

-   `NodeStatus`: { id, name, ip, status, cpuLoad, memoryUsage, gpuList[] }
-   `GpuTelemetry`: { id, model, utilization, memoryUsed, memoryTotal, temp, power }
-   `SparkJob`: { id, name, status, duration, executors, gpuAccelerated }
-   `InferenceMetric`: { modelName, tokensPerSec, latencyMs, activeRequests }

## 6. Design Tokens (Neural Glass)

-   **Colors**:
    -   Primary: Electric Orange (`oklch(0.65 0.22 35.0)`)
    -   Background: Void Black (`oklch(0.10 0.01 280.0)`)
    -   Glass: `oklch(0.15 0.02 280.0 / 0.6)`
-   **Typography**:
    -   Headers: `Rajdhani` (Technical, Futuristic)
    -   Body: `Inter` (Clean, Readable)
    -   Code: `JetBrains Mono`
-   **Effects**:
    -   `backdrop-filter: blur(12px)` for cards.
    -   `box-shadow: 0 0 20px -5px var(--primary)` for active elements.
