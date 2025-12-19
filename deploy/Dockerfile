# =============================================================================
# DGX Spark Command Center - Production Container
# Single container with Nginx, Node.js app, Prometheus, and monitoring stack
# Optimized for NVIDIA DGX Spark deployment
# =============================================================================

# Stage 1: Build the application
FROM node:22-bookworm-slim AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.4.1 --activate

# Copy package files first for better layer caching
COPY package.json pnpm-lock.yaml ./

# Copy patches directory if it exists
COPY patches/ ./patches/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy all source code
COPY client/ ./client/
COPY server/ ./server/
COPY shared/ ./shared/
COPY drizzle/ ./drizzle/
COPY tsconfig.json ./
COPY vite.config.ts ./
COPY drizzle.config.ts ./

# Build the application (frontend + backend)
RUN pnpm build

# =============================================================================
# Stage 2: Production runtime
# =============================================================================
FROM ubuntu:22.04 AS runtime

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
    gettext-base \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 22.x
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Install Prometheus manually (more reliable than apt)
ARG PROMETHEUS_VERSION=2.48.0
RUN wget -q https://github.com/prometheus/prometheus/releases/download/v${PROMETHEUS_VERSION}/prometheus-${PROMETHEUS_VERSION}.linux-amd64.tar.gz \
    && tar xzf prometheus-${PROMETHEUS_VERSION}.linux-amd64.tar.gz \
    && mv prometheus-${PROMETHEUS_VERSION}.linux-amd64/prometheus /usr/local/bin/ \
    && mv prometheus-${PROMETHEUS_VERSION}.linux-amd64/promtool /usr/local/bin/ \
    && mkdir -p /etc/prometheus /var/lib/prometheus \
    && rm -rf prometheus-${PROMETHEUS_VERSION}.linux-amd64*

# Install Node Exporter
ARG NODE_EXPORTER_VERSION=1.7.0
RUN wget -q https://github.com/prometheus/node_exporter/releases/download/v${NODE_EXPORTER_VERSION}/node_exporter-${NODE_EXPORTER_VERSION}.linux-amd64.tar.gz \
    && tar xzf node_exporter-${NODE_EXPORTER_VERSION}.linux-amd64.tar.gz \
    && mv node_exporter-${NODE_EXPORTER_VERSION}.linux-amd64/node_exporter /usr/local/bin/ \
    && rm -rf node_exporter-${NODE_EXPORTER_VERSION}.linux-amd64*

# Install Python dependencies for simulators
RUN pip3 install --no-cache-dir flask prometheus_client werkzeug

# Create app directory
WORKDIR /app

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/drizzle ./drizzle

# Create necessary directories
RUN mkdir -p /var/log/supervisor /var/log/nginx /data/prometheus /etc/prometheus/targets /etc/prometheus/rules

# Copy Nginx configuration
COPY deploy/nginx/nginx.conf /etc/nginx/nginx.conf
COPY deploy/nginx/default.conf /etc/nginx/sites-available/default
RUN rm -f /etc/nginx/sites-enabled/default && \
    ln -s /etc/nginx/sites-available/default /etc/nginx/sites-enabled/default

# Copy Prometheus configuration
COPY deploy/config/prometheus.yml /etc/prometheus/prometheus.yml

# Copy supervisor configuration
COPY deploy/config/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Copy scripts
COPY deploy/scripts/entrypoint.sh /entrypoint.sh
COPY deploy/scripts/healthcheck.sh /healthcheck.sh
COPY deploy/scripts/spark-simulator.py /opt/spark-simulator.py
COPY deploy/scripts/gpu-simulator.py /opt/gpu-simulator.py

# Make scripts executable
RUN chmod +x /entrypoint.sh /healthcheck.sh /opt/*.py

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
CMD ["/usr/bin/supervisord", "-n", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
