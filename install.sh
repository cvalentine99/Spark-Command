#!/bin/bash
# ============================================================================
# DGX Spark Command Center - One-Command Local Installation
# ============================================================================
# Run this script directly on your DGX Spark unit:
#   curl -fsSL https://your-domain/install.sh | bash
# Or locally:
#   chmod +x install.sh && ./install.sh
# ============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Banner
echo -e "${CYAN}"
echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║                                                                   ║"
echo "║     ██████╗  ██████╗ ██╗  ██╗    ███████╗██████╗  █████╗ ██████╗ ██╗  ██╗ ║"
echo "║     ██╔══██╗██╔════╝ ╚██╗██╔╝    ██╔════╝██╔══██╗██╔══██╗██╔══██╗██║ ██╔╝ ║"
echo "║     ██║  ██║██║  ███╗ ╚███╔╝     ███████╗██████╔╝███████║██████╔╝█████╔╝  ║"
echo "║     ██║  ██║██║   ██║ ██╔██╗     ╚════██║██╔═══╝ ██╔══██║██╔══██╗██╔═██╗  ║"
echo "║     ██████╔╝╚██████╔╝██╔╝ ██╗    ███████║██║     ██║  ██║██║  ██║██║  ██╗ ║"
echo "║     ╚═════╝  ╚═════╝ ╚═╝  ╚═╝    ╚══════╝╚═╝     ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝ ║"
echo "║                                                                   ║"
echo "║                    COMMAND CENTER INSTALLER                       ║"
echo "║                                                                   ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${YELLOW}Note: Running without root. Some features may require sudo.${NC}"
fi

# Detect system
echo -e "${BLUE}[1/6] Detecting system...${NC}"
if command -v nvidia-smi &> /dev/null; then
    GPU_INFO=$(nvidia-smi --query-gpu=name --format=csv,noheader 2>/dev/null || echo "Unknown GPU")
    echo -e "${GREEN}  ✓ NVIDIA GPU detected: ${GPU_INFO}${NC}"
else
    echo -e "${YELLOW}  ⚠ nvidia-smi not found. Running in simulation mode.${NC}"
fi

# Check for Docker
echo -e "${BLUE}[2/6] Checking Docker...${NC}"
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version | cut -d' ' -f3 | tr -d ',')
    echo -e "${GREEN}  ✓ Docker ${DOCKER_VERSION} installed${NC}"
else
    echo -e "${RED}  ✗ Docker not found. Installing...${NC}"
    curl -fsSL https://get.docker.com | sh
    sudo usermod -aG docker $USER
    echo -e "${GREEN}  ✓ Docker installed${NC}"
fi

# Check for Docker Compose
echo -e "${BLUE}[3/6] Checking Docker Compose...${NC}"
if docker compose version &> /dev/null; then
    COMPOSE_VERSION=$(docker compose version --short)
    echo -e "${GREEN}  ✓ Docker Compose ${COMPOSE_VERSION} installed${NC}"
else
    echo -e "${RED}  ✗ Docker Compose not found. Installing...${NC}"
    sudo apt-get update && sudo apt-get install -y docker-compose-plugin
    echo -e "${GREEN}  ✓ Docker Compose installed${NC}"
fi

# Check for NVIDIA Container Toolkit
echo -e "${BLUE}[4/6] Checking NVIDIA Container Toolkit...${NC}"
if docker run --rm --gpus all nvidia/cuda:12.4.0-base-ubuntu22.04 nvidia-smi &> /dev/null; then
    echo -e "${GREEN}  ✓ NVIDIA Container Toolkit working${NC}"
else
    echo -e "${YELLOW}  ⚠ NVIDIA Container Toolkit not configured. Installing...${NC}"
    distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
    curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
    curl -s -L https://nvidia.github.io/libnvidia-container/$distribution/libnvidia-container.list | \
        sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
        sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list
    sudo apt-get update && sudo apt-get install -y nvidia-container-toolkit
    sudo nvidia-ctk runtime configure --runtime=docker
    sudo systemctl restart docker
    echo -e "${GREEN}  ✓ NVIDIA Container Toolkit installed${NC}"
fi

# Create installation directory
INSTALL_DIR="${HOME}/dgx-spark-command-center"
echo -e "${BLUE}[5/6] Setting up installation directory...${NC}"
mkdir -p "${INSTALL_DIR}"
cd "${INSTALL_DIR}"

# Check if we're in the source directory or need to download
if [ -f "deploy/docker-compose.local.yml" ]; then
    echo -e "${GREEN}  ✓ Source files found${NC}"
else
    echo -e "${YELLOW}  Downloading Command Center...${NC}"
    # If running from curl, download the package
    if [ -n "${DOWNLOAD_URL}" ]; then
        curl -fsSL "${DOWNLOAD_URL}" -o dgx-spark-cc.tar.gz
        tar -xzf dgx-spark-cc.tar.gz --strip-components=1
        rm dgx-spark-cc.tar.gz
    else
        echo -e "${RED}  ✗ Source files not found. Please run from the project directory.${NC}"
        exit 1
    fi
fi

# Build and start
echo -e "${BLUE}[6/6] Building and starting Command Center...${NC}"
cd deploy

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    cat > .env << EOF
# DGX Spark Command Center Configuration
NODE_ENV=production
JWT_SECRET=$(openssl rand -hex 32)
EOF
    echo -e "${GREEN}  ✓ Created .env configuration${NC}"
fi

# Build and start the container
echo -e "${CYAN}  Building Docker image (this may take a few minutes)...${NC}"
docker compose -f docker-compose.local.yml build

echo -e "${CYAN}  Starting Command Center...${NC}"
docker compose -f docker-compose.local.yml up -d

# Wait for startup
echo -e "${CYAN}  Waiting for services to start...${NC}"
sleep 5

# Check if running
if docker compose -f docker-compose.local.yml ps | grep -q "running"; then
    echo ""
    echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                                                                   ║${NC}"
    echo -e "${GREEN}║   ✓ DGX SPARK COMMAND CENTER INSTALLED SUCCESSFULLY!             ║${NC}"
    echo -e "${GREEN}║                                                                   ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    # Get IP address
    IP_ADDR=$(hostname -I | awk '{print $1}')
    
    echo -e "${CYAN}Access your Command Center at:${NC}"
    echo -e "  ${YELLOW}→ http://localhost${NC}"
    echo -e "  ${YELLOW}→ http://${IP_ADDR}${NC}"
    echo ""
    echo -e "${CYAN}Useful commands:${NC}"
    echo -e "  ${BLUE}View logs:${NC}      docker compose -f ${INSTALL_DIR}/deploy/docker-compose.local.yml logs -f"
    echo -e "  ${BLUE}Stop:${NC}           docker compose -f ${INSTALL_DIR}/deploy/docker-compose.local.yml down"
    echo -e "  ${BLUE}Restart:${NC}        docker compose -f ${INSTALL_DIR}/deploy/docker-compose.local.yml restart"
    echo -e "  ${BLUE}Update:${NC}         docker compose -f ${INSTALL_DIR}/deploy/docker-compose.local.yml pull && docker compose -f ${INSTALL_DIR}/deploy/docker-compose.local.yml up -d"
    echo ""
else
    echo -e "${RED}✗ Installation failed. Check logs with:${NC}"
    echo -e "  docker compose -f ${INSTALL_DIR}/deploy/docker-compose.local.yml logs"
    exit 1
fi
