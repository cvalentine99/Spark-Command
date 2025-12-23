
## Splunk Integration
- [x] Create Splunk Universal Forwarder configuration for DGX nodes
- [x] Create inputs.conf for GPU metrics and system logs
- [x] Create props.conf and transforms.conf for data parsing
- [x] Create Splunk dashboards for cluster monitoring
- [x] Create saved searches and reports
- [x] Create Splunk alerting rules
- [x] Add Splunk integration to Command Center Settings page
- [x] Create deployment documentation

## Support RAG Knowledge Base
- [x] Create core DGX Spark hardware specifications documentation
- [x] Create software stack and CUDA documentation
- [x] Create cluster configuration and networking guides
- [x] Build troubleshooting database for common GPU issues
- [x] Build troubleshooting database for networking issues
- [x] Build troubleshooting database for Spark/RAPIDS issues
- [x] Create FAQ content for operations and maintenance
- [x] Create best practices documentation
- [x] Implement RAG support chat interface in Command Center
- [x] Create knowledge base JSON structure for RAG retrieval

## Prometheus Live Data Integration
- [x] Create backend Prometheus API routes for metrics queries
- [x] Create Prometheus service layer with query helpers
- [x] Generate automated node setup script for exporters
- [x] Add Prometheus endpoint configuration to Settings page
- [x] Update Dashboard to fetch live data from API
- [x] Update Nodes page to fetch live GPU telemetry
- [x] Add connection status indicator

## Spark Job Submission Feature
- [x] Create backend API route for Spark job submission
- [x] Create Spark service layer for REST API integration
- [x] Build job submission form UI with configuration options
- [x] Add RAPIDS acceleration toggle and executor settings
- [x] Implement job history table with status tracking
- [x] Add job cancellation functionality

## Complete Job Management System
- [x] Create job logs viewer component with real-time streaming
- [x] Add log filtering and search functionality
- [x] Implement job scheduling with cron expressions
- [x] Create scheduled jobs management UI
- [x] Build cost estimation calculator for job resources
- [x] Add GPU-hours and resource consumption tracking
- [x] Create dedicated job details page with full telemetry
- [x] Add stage/task breakdown visualization
- [x] Implement job comparison feature
- [x] Add job templates management

## Docker Single-Container Deployment
- [x] Create production Dockerfile with NVIDIA CUDA base, Nginx, Node.js
- [x] Create Nginx reverse proxy configuration
- [x] Create docker-compose.yml with all services (Prometheus, Grafana, Spark simulators)
- [x] Create entrypoint script for service orchestration
- [x] Create one-command deployment script
- [x] Create comprehensive deployment documentation

## Docker Deployment Fix
- [x] Rewrite Dockerfile to include application source code
- [x] Add proper multi-stage build for frontend and backend
- [x] Update docker-compose with correct volume mounts
- [x] Test build locally to verify all components work

## Single-Node Local Command Center Refactor
- [x] Update Dashboard to show single DGX Spark unit (remove dual-node view)
- [x] Update Nodes page to show local GPU only (GB10 Superchip)
- [x] Simplify Network page for local interfaces only
- [x] Update backend to query localhost metrics only
- [x] Create local-only deployment script (install.sh)
- [x] Create Dockerfile.local for single-node deployment
- [x] Create docker-compose.local.yml for local installation
- [x] Add local system info (hostname, uptime, OS version)

## System Logs Viewer
- [x] Create backend API for reading journalctl and syslog
- [x] Implement real-time log streaming with WebSocket or polling
- [x] Build LogsPage UI with filtering and search
- [x] Add log level filtering (error, warning, info, debug)
- [x] Add service-specific log filtering (nvidia, docker, spark)

## Power Management Controls
- [x] Create backend API for nvidia-smi power management commands
- [x] Implement GPU power limit adjustment controls
- [x] Add fan curve visualization and controls
- [x] Create thermal profile presets (quiet, balanced, performance)
- [x] Add safety limits and confirmation dialogs

## Backup/Restore Configuration
- [x] Create backend API for exporting configuration as JSON
- [x] Implement configuration import with validation
- [x] Add UI for backup/restore in Settings page
- [x] Include alert rules, integrations, and preferences in backup
- [x] Add backup history and versioning

## Frontend-Backend API Connections
- [x] DashboardPage - Connect to trpc.local.getOverview and spark.getClusterResources
- [x] NodesPage (Hardware) - Connect to trpc.local.getMetrics, getSystemInfo, getProcesses
- [x] LogsPage - Connect to trpc.logs.getLogs, getServices, getStats
- [x] PowerPage - Connect to trpc.power.getPowerState, setPowerLimit, setFanSpeed, getThermalProfiles
- [x] BackupPage - Connect to trpc.config.getConfig, exportConfig, importConfig, listBackups, createBackup, restoreBackup, deleteBackup, resetToDefaults
- [x] NetworkPage - Connect to trpc.local.getNetwork, local.health
- [x] SparkPage - Connect active jobs list to trpc.spark.getApplications, getJobHistory, getClusterResources
- [x] JobDetailsPage - Connect to trpc.spark.getJobHistory, getJobStatus, killJob

## Real-time WebSocket Updates
- [x] Set up WebSocket server with ws library
- [x] Create WebSocket message types and handlers
- [x] Implement GPU metrics broadcasting (temperature, utilization, memory)
- [x] Implement job status broadcasting (running, completed, failed)
- [x] Create useWebSocket client hook
- [x] Create WebSocketProvider context
- [x] Update DashboardPage to use WebSocket for GPU metrics
- [x] Update NodesPage to use WebSocket for hardware metrics
- [x] Update SparkPage to use WebSocket for job status
- [x] Update PowerPage to use WebSocket for power/temperature data
- [x] Remove polling intervals from updated pages (polling reduced when WebSocket connected)
- [x] Add reconnection logic and error handling (in WebSocketContext)
