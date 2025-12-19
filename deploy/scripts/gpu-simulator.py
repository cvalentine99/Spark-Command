#!/usr/bin/env python3
"""
DCGM GPU Metrics Simulator for DGX Spark Command Center
Simulates NVIDIA GPU metrics for testing without real hardware
Mimics DGX Spark GB10 Superchip characteristics
"""

from flask import Flask
from prometheus_client import make_wsgi_app, Gauge, generate_latest, CONTENT_TYPE_LATEST
from werkzeug.middleware.dispatcher import DispatcherMiddleware
import random
import time
import threading
import math

app = Flask(__name__)

# =============================================================================
# DGX Spark GB10 Specifications
# =============================================================================
# Each DGX Spark has:
# - 1x Blackwell GPU (integrated in GB10 Superchip)
# - 10x Cortex-X925 (performance cores)
# - 10x Cortex-A725 (efficiency cores)
# - 128GB LPDDR5x unified memory

NODES = {
    "dgx-spark-01": {"gpu_index": 0, "role": "master", "port": 9400},
    "dgx-spark-02": {"gpu_index": 0, "role": "worker", "port": 9401}
}

# =============================================================================
# DCGM Prometheus Metrics (matching real DCGM exporter format)
# =============================================================================

# GPU Utilization
DCGM_FI_DEV_GPU_UTIL = Gauge('DCGM_FI_DEV_GPU_UTIL', 'GPU utilization %', 
                              ['gpu', 'UUID', 'device', 'modelName', 'Hostname'])
DCGM_FI_DEV_MEM_COPY_UTIL = Gauge('DCGM_FI_DEV_MEM_COPY_UTIL', 'Memory copy utilization %',
                                   ['gpu', 'UUID', 'device', 'modelName', 'Hostname'])

# Memory
DCGM_FI_DEV_FB_FREE = Gauge('DCGM_FI_DEV_FB_FREE', 'Free framebuffer memory (MiB)',
                            ['gpu', 'UUID', 'device', 'modelName', 'Hostname'])
DCGM_FI_DEV_FB_USED = Gauge('DCGM_FI_DEV_FB_USED', 'Used framebuffer memory (MiB)',
                            ['gpu', 'UUID', 'device', 'modelName', 'Hostname'])
DCGM_FI_DEV_FB_TOTAL = Gauge('DCGM_FI_DEV_FB_TOTAL', 'Total framebuffer memory (MiB)',
                              ['gpu', 'UUID', 'device', 'modelName', 'Hostname'])

# Temperature
DCGM_FI_DEV_GPU_TEMP = Gauge('DCGM_FI_DEV_GPU_TEMP', 'GPU temperature (C)',
                              ['gpu', 'UUID', 'device', 'modelName', 'Hostname'])
DCGM_FI_DEV_MEMORY_TEMP = Gauge('DCGM_FI_DEV_MEMORY_TEMP', 'Memory temperature (C)',
                                 ['gpu', 'UUID', 'device', 'modelName', 'Hostname'])

# Power
DCGM_FI_DEV_POWER_USAGE = Gauge('DCGM_FI_DEV_POWER_USAGE', 'Power usage (W)',
                                 ['gpu', 'UUID', 'device', 'modelName', 'Hostname'])
DCGM_FI_DEV_TOTAL_ENERGY_CONSUMPTION = Gauge('DCGM_FI_DEV_TOTAL_ENERGY_CONSUMPTION', 
                                              'Total energy consumption (mJ)',
                                              ['gpu', 'UUID', 'device', 'modelName', 'Hostname'])

# Clocks
DCGM_FI_DEV_SM_CLOCK = Gauge('DCGM_FI_DEV_SM_CLOCK', 'SM clock speed (MHz)',
                              ['gpu', 'UUID', 'device', 'modelName', 'Hostname'])
DCGM_FI_DEV_MEM_CLOCK = Gauge('DCGM_FI_DEV_MEM_CLOCK', 'Memory clock speed (MHz)',
                               ['gpu', 'UUID', 'device', 'modelName', 'Hostname'])

# PCIe
DCGM_FI_DEV_PCIE_TX_THROUGHPUT = Gauge('DCGM_FI_DEV_PCIE_TX_THROUGHPUT', 'PCIe TX throughput (KB/s)',
                                        ['gpu', 'UUID', 'device', 'modelName', 'Hostname'])
DCGM_FI_DEV_PCIE_RX_THROUGHPUT = Gauge('DCGM_FI_DEV_PCIE_RX_THROUGHPUT', 'PCIe RX throughput (KB/s)',
                                        ['gpu', 'UUID', 'device', 'modelName', 'Hostname'])

# NVLink (simulated for cluster interconnect)
DCGM_FI_DEV_NVLINK_BANDWIDTH_TOTAL = Gauge('DCGM_FI_DEV_NVLINK_BANDWIDTH_TOTAL', 
                                            'NVLink bandwidth (GB/s)',
                                            ['gpu', 'UUID', 'device', 'modelName', 'Hostname'])

# Tensor Core utilization
DCGM_FI_PROF_PIPE_TENSOR_ACTIVE = Gauge('DCGM_FI_PROF_PIPE_TENSOR_ACTIVE', 
                                         'Tensor core utilization %',
                                         ['gpu', 'UUID', 'device', 'modelName', 'Hostname'])

# FP operations
DCGM_FI_PROF_DRAM_ACTIVE = Gauge('DCGM_FI_PROF_DRAM_ACTIVE', 'DRAM active %',
                                  ['gpu', 'UUID', 'device', 'modelName', 'Hostname'])

# Errors
DCGM_FI_DEV_ECC_SBE_VOL_TOTAL = Gauge('DCGM_FI_DEV_ECC_SBE_VOL_TOTAL', 
                                       'Single bit ECC errors',
                                       ['gpu', 'UUID', 'device', 'modelName', 'Hostname'])
DCGM_FI_DEV_ECC_DBE_VOL_TOTAL = Gauge('DCGM_FI_DEV_ECC_DBE_VOL_TOTAL', 
                                       'Double bit ECC errors',
                                       ['gpu', 'UUID', 'device', 'modelName', 'Hostname'])

# XID Errors
DCGM_FI_DEV_XID_ERRORS = Gauge('DCGM_FI_DEV_XID_ERRORS', 'XID errors',
                                ['gpu', 'UUID', 'device', 'modelName', 'Hostname'])

# =============================================================================
# Simulation State
# =============================================================================
class GPUState:
    def __init__(self, hostname, gpu_index):
        self.hostname = hostname
        self.gpu_index = gpu_index
        self.uuid = f"GPU-{hostname}-{gpu_index:04d}-{random.randint(1000,9999)}"
        self.model = "NVIDIA GB10 Blackwell"
        
        # Base values with some variation
        self.base_util = random.uniform(60, 90)
        self.base_temp = random.uniform(45, 55)
        self.base_power = random.uniform(80, 120)
        self.total_memory = 128 * 1024  # 128GB in MiB
        self.energy = 0
        
    def get_labels(self):
        return {
            'gpu': str(self.gpu_index),
            'UUID': self.uuid,
            'device': f'nvidia{self.gpu_index}',
            'modelName': self.model,
            'Hostname': self.hostname
        }

gpu_states = {
    name: GPUState(name, info['gpu_index']) 
    for name, info in NODES.items()
}

# =============================================================================
# Metrics Update Loop
# =============================================================================
def update_metrics():
    """Update all GPU metrics with realistic variations"""
    t = time.time()
    
    for hostname, state in gpu_states.items():
        labels = state.get_labels()
        
        # Add time-based variation (simulates workload changes)
        workload_factor = 0.5 + 0.5 * math.sin(t / 60)  # Cycles every ~6 minutes
        noise = random.uniform(-5, 5)
        
        # GPU Utilization (60-95%)
        util = min(99, max(10, state.base_util * workload_factor + noise + 30))
        DCGM_FI_DEV_GPU_UTIL.labels(**labels).set(util)
        
        # Memory copy utilization
        mem_util = util * random.uniform(0.3, 0.6)
        DCGM_FI_DEV_MEM_COPY_UTIL.labels(**labels).set(mem_util)
        
        # Memory usage (correlates with utilization)
        mem_used = int(state.total_memory * (0.3 + 0.5 * (util / 100)))
        mem_free = state.total_memory - mem_used
        DCGM_FI_DEV_FB_USED.labels(**labels).set(mem_used)
        DCGM_FI_DEV_FB_FREE.labels(**labels).set(mem_free)
        DCGM_FI_DEV_FB_TOTAL.labels(**labels).set(state.total_memory)
        
        # Temperature (correlates with utilization)
        temp = state.base_temp + (util / 100) * 25 + random.uniform(-2, 2)
        DCGM_FI_DEV_GPU_TEMP.labels(**labels).set(temp)
        DCGM_FI_DEV_MEMORY_TEMP.labels(**labels).set(temp - random.uniform(5, 10))
        
        # Power (correlates with utilization)
        power = state.base_power + (util / 100) * 80 + random.uniform(-5, 5)
        DCGM_FI_DEV_POWER_USAGE.labels(**labels).set(power)
        state.energy += power * 5 * 1000  # 5 second intervals, convert to mJ
        DCGM_FI_DEV_TOTAL_ENERGY_CONSUMPTION.labels(**labels).set(state.energy)
        
        # Clocks (boost when utilized)
        sm_clock = 1500 + int((util / 100) * 800) + random.randint(-50, 50)
        mem_clock = 1600 + int((util / 100) * 400) + random.randint(-20, 20)
        DCGM_FI_DEV_SM_CLOCK.labels(**labels).set(sm_clock)
        DCGM_FI_DEV_MEM_CLOCK.labels(**labels).set(mem_clock)
        
        # PCIe throughput
        pcie_tx = int((util / 100) * 15000000) + random.randint(-100000, 100000)
        pcie_rx = int((util / 100) * 12000000) + random.randint(-100000, 100000)
        DCGM_FI_DEV_PCIE_TX_THROUGHPUT.labels(**labels).set(pcie_tx)
        DCGM_FI_DEV_PCIE_RX_THROUGHPUT.labels(**labels).set(pcie_rx)
        
        # NVLink bandwidth (for cluster communication)
        nvlink_bw = (util / 100) * 200 + random.uniform(-10, 10)
        DCGM_FI_DEV_NVLINK_BANDWIDTH_TOTAL.labels(**labels).set(nvlink_bw)
        
        # Tensor core utilization (high during ML workloads)
        tensor_util = util * random.uniform(0.7, 0.95)
        DCGM_FI_PROF_PIPE_TENSOR_ACTIVE.labels(**labels).set(tensor_util)
        
        # DRAM activity
        dram_active = util * random.uniform(0.4, 0.7)
        DCGM_FI_PROF_DRAM_ACTIVE.labels(**labels).set(dram_active)
        
        # ECC errors (very rare)
        DCGM_FI_DEV_ECC_SBE_VOL_TOTAL.labels(**labels).set(0)
        DCGM_FI_DEV_ECC_DBE_VOL_TOTAL.labels(**labels).set(0)
        DCGM_FI_DEV_XID_ERRORS.labels(**labels).set(0)

def metrics_loop():
    """Background thread to update metrics"""
    while True:
        update_metrics()
        time.sleep(5)

# Start background thread
threading.Thread(target=metrics_loop, daemon=True).start()

# =============================================================================
# Flask Routes
# =============================================================================

@app.route('/metrics')
def metrics():
    """Prometheus metrics endpoint"""
    update_metrics()
    return generate_latest(), 200, {'Content-Type': CONTENT_TYPE_LATEST}

@app.route('/health')
def health():
    return {"status": "healthy", "service": "gpu-simulator", "gpus": len(gpu_states)}

@app.route('/')
def index():
    return """
    <html>
    <head><title>DGX Spark GPU Simulator</title></head>
    <body>
        <h1>DGX Spark GPU Metrics Simulator</h1>
        <p>Simulating DCGM metrics for DGX Spark GB10 Superchip</p>
        <ul>
            <li><a href="/metrics">Prometheus Metrics</a></li>
            <li><a href="/health">Health Check</a></li>
        </ul>
        <h2>Simulated GPUs:</h2>
        <ul>
    """ + "\n".join(f"<li>{name}: {state.model} ({state.uuid})</li>" 
                    for name, state in gpu_states.items()) + """
        </ul>
    </body>
    </html>
    """

if __name__ == '__main__':
    print("Starting DGX Spark GPU Metrics Simulator...")
    print("  Metrics: http://0.0.0.0:9400/metrics")
    print("  Health:  http://0.0.0.0:9400/health")
    print(f"  Simulating {len(gpu_states)} GPU(s)")
    app.run(host='0.0.0.0', port=9400, threaded=True)
