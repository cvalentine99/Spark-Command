# =============================================================================
# DGX Spark Command Center - Production Container
# Single container with Nginx, Node.js app, Prometheus, and monitoring stack
# Optimized for NVIDIA DGX Spark deployment
# =============================================================================

# Stage 1: Build the application
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches/

# Install pnpm and dependencies
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN pnpm build

# =============================================================================
# Stage 2: Production runtime with NVIDIA CUDA support
# =============================================================================
FROM nvidia/cuda:12.4.0-runtime-ubuntu22.04

LABEL maintainer="DGX Spark Command Center"
LABEL description="All-in-one monitoring dashboard for NVIDIA DGX Spark clusters"
LABEL version="1.0.0"

# Prevent interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    nginx \
    curl \
    wget \
    ca-certificates \
    gnupg \
    supervisor \
    prometheus \
    prometheus-node-exporter \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 22.x
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Install DCGM for GPU monitoring (if available)
RUN distribution=$(. /etc/os-release;echo $ID$VERSION_ID) \
    && curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg \
    && curl -s -L https://nvidia.github.io/libnvidia-container/$distribution/libnvidia-container.list | \
       sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
       tee /etc/apt/sources.list.d/nvidia-container-toolkit.list \
    && apt-get update \
    && apt-get install -y datacenter-gpu-manager || true \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Copy configuration files
COPY deploy/nginx/nginx.conf /etc/nginx/nginx.conf
COPY deploy/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY deploy/config/prometheus.yml /etc/prometheus/prometheus.yml
COPY deploy/config/supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY deploy/scripts/entrypoint.sh /entrypoint.sh
COPY deploy/scripts/healthcheck.sh /healthcheck.sh

# Make scripts executable
RUN chmod +x /entrypoint.sh /healthcheck.sh

# Create necessary directories
RUN mkdir -p /var/log/supervisor /var/log/nginx /data/prometheus

# Environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV PROMETHEUS_URL=http://localhost:9090
ENV SPARK_MASTER_URL=spark://localhost:7077
ENV SPARK_REST_URL=http://localhost:6066

# Expose ports
# 80   - Nginx (HTTP)
# 443  - Nginx (HTTPS)
# 3000 - Node.js app (internal)
# 9090 - Prometheus (internal)
# 9100 - Node Exporter (internal)
EXPOSE 80 443

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD /healthcheck.sh

# Start all services via supervisor
ENTRYPOINT ["/entrypoint.sh"]
CMD ["supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
