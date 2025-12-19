# DGX Spark Command Center - Complete Deployment Guide

## Package Contents

This package contains **EVERYTHING** needed to deploy the DGX Spark Command Center:

```
dgx-spark-command-center/
├── package.json              # Node.js dependencies
├── pnpm-lock.yaml            # Locked dependency versions
├── tsconfig.json             # TypeScript configuration
├── vite.config.ts            # Vite build configuration
├── drizzle.config.ts         # Database ORM configuration
├── docker-compose.yml        # Root compose file (USE THIS)
├── env-config.txt            # Environment template (copy to .env)
├── client/                   # React frontend source
│   ├── src/                  # Source code
│   └── public/               # Static assets
├── server/                   # Node.js backend source
│   ├── routers/              # tRPC API routes
│   └── services/             # Business logic
├── shared/                   # Shared types/constants
├── drizzle/                  # Database schema/migrations
├── deploy/                   # Docker deployment configs
│   ├── Dockerfile            # Main container build
│   ├── nginx/                # Nginx configuration
│   ├── config/               # Prometheus & Supervisor configs
│   └── scripts/              # Entrypoint & health scripts
├── scripts/                  # Node setup scripts
├── monitoring/               # Prometheus/Grafana stack
├── splunk/                   # Splunk integration
└── knowledge-base/           # Support RAG content
```

## Quick Start

### Option 1: Demo Mode (No Hardware Required)

```bash
# 1. Extract the package
unzip dgx-spark-complete-package.zip
cd dgx-spark-command-center

# 2. Create environment file
cp env-config.txt .env
echo "DEMO_MODE=true" >> .env

# 3. Build and run
docker compose up -d

# 4. Access at http://localhost
```

### Option 2: Production Mode (With DGX Spark Hardware)

```bash
# 1. Extract the package
unzip dgx-spark-complete-package.zip
cd dgx-spark-command-center

# 2. Create environment file with your node IPs
cp env-config.txt .env
# Edit .env with your actual DGX Spark IPs:
#   DGX_SPARK_01_IP=10.0.0.10
#   DGX_SPARK_02_IP=10.0.0.11
#   DEMO_MODE=false

# 3. Install exporters on each DGX Spark node
scp scripts/dgx-spark-setup.sh admin@10.0.0.10:/tmp/
ssh admin@10.0.0.10 "sudo /tmp/dgx-spark-setup.sh --node-type master"

scp scripts/dgx-spark-setup.sh admin@10.0.0.11:/tmp/
ssh admin@10.0.0.11 "sudo /tmp/dgx-spark-setup.sh --node-type worker --master-ip 10.0.0.10"

# 4. Build and run
docker compose up -d

# 5. Access at http://localhost
```

## Build Requirements

| Requirement | Version |
|-------------|---------|
| Docker | 20.10+ |
| Docker Compose | v2.0+ |
| RAM | 4GB minimum |
| Disk | 20GB minimum |

## What Gets Built

The Dockerfile performs a multi-stage build:

1. **Stage 1 (Builder)**: 
   - Installs Node.js 20 and pnpm
   - Copies all source files
   - Runs `pnpm install` to fetch dependencies
   - Runs `pnpm build` to compile TypeScript and bundle React

2. **Stage 2 (Runtime)**:
   - Uses Ubuntu 22.04 base
   - Installs Nginx, Prometheus, Node Exporter
   - Copies built artifacts from Stage 1
   - Configures supervisord to manage all services

## Services Inside the Container

| Service | Port | Description |
|---------|------|-------------|
| Nginx | 80 | Reverse proxy, static files |
| Node.js App | 3000 | Backend API |
| Prometheus | 9090 | Metrics collection |
| Node Exporter | 9100 | System metrics |
| GPU Simulator | 9400 | Mock DCGM (demo mode) |
| Spark Simulator | 6066 | Mock Spark API (demo mode) |

## Verifying the Deployment

```bash
# Check container is running
docker ps | grep dgx-spark

# Check all services inside container
docker exec dgx-spark-command-center supervisorctl status

# View logs
docker compose logs -f

# Test endpoints
curl http://localhost/health
curl http://localhost/api/health
```

## Troubleshooting

### Build fails with "pnpm not found"
The Dockerfile installs pnpm via corepack. Ensure Docker has internet access.

### "Cannot find module" errors
The build requires all source files. Verify client/, server/, shared/ directories exist.

### Container starts but no UI
Check Nginx is serving the built files:
```bash
docker exec dgx-spark-command-center ls -la /app/dist/public/
```

### No metrics showing
1. Verify Prometheus is running: `curl http://localhost:9090/-/healthy`
2. Check targets: `curl http://localhost:9090/api/v1/targets`
3. Ensure DGX nodes have exporters running on ports 9100 and 9400

## Manual Build (Without Docker)

If you need to build manually:

```bash
# Install dependencies
corepack enable
pnpm install

# Build frontend and backend
pnpm build

# The output is in dist/
# - dist/public/ contains the React frontend
# - dist/index.js is the Node.js backend

# Run with Node.js
NODE_ENV=production node dist/index.js
```

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| DGX_SPARK_01_IP | Yes | 192.168.100.10 | Master node IP |
| DGX_SPARK_02_IP | Yes | 192.168.100.11 | Worker node IP |
| DEMO_MODE | No | false | Use simulators |
| SPARK_MASTER_URL | No | spark://node1:7077 | Spark master |
| SPARK_REST_URL | No | http://node1:6066 | Spark REST API |
| DATABASE_URL | No | - | PostgreSQL URL |
| JWT_SECRET | Yes | - | Auth secret |
| PAGERDUTY_SERVICE_KEY | No | - | PagerDuty alerts |
| SLACK_WEBHOOK_URL | No | - | Slack alerts |
