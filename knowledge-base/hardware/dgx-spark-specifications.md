# NVIDIA DGX Spark Hardware Specifications

## Overview

The NVIDIA DGX Spark is a compact AI supercomputer designed for desktop deployment, powered by the NVIDIA GB10 Grace Blackwell Superchip. It delivers up to 1 petaflop of AI compute performance in a form factor suitable for individual researchers, data scientists, and developers.

## GB10 Grace Blackwell Superchip

The GB10 Superchip combines NVIDIA's latest Blackwell GPU architecture with an Arm-based CPU in a unified package with shared memory architecture.

### CPU Specifications

| Specification | Value |
|---------------|-------|
| Architecture | Arm v9.2-A |
| Performance Cores | 10x Cortex-X925 |
| Efficiency Cores | 10x Cortex-A725 |
| Total Cores | 20 |
| Max Frequency | 3.8 GHz (X925) / 2.8 GHz (A725) |
| L3 Cache | 36 MB |
| Process Node | TSMC 4nm |

The big.LITTLE architecture enables optimal power efficiency by routing background tasks to efficiency cores while reserving performance cores for compute-intensive workloads.

### GPU Specifications

| Specification | Value |
|---------------|-------|
| Architecture | NVIDIA Blackwell |
| CUDA Cores | 6,144 |
| Tensor Cores | 192 (5th Generation) |
| RT Cores | 48 (4th Generation) |
| FP32 Performance | 209 TFLOPS |
| FP16 Performance | 419 TFLOPS |
| FP8 Performance | 838 TFLOPS |
| INT8 Performance | 838 TOPS |
| FP4 Performance | 1,676 TOPS |
| Memory Bus | 256-bit |
| Memory Bandwidth | 273 GB/s |

### Unified Memory Architecture

| Specification | Value |
|---------------|-------|
| Memory Type | LPDDR5x |
| Total Capacity | 128 GB |
| Memory Speed | 8533 MT/s |
| Memory Bandwidth | 273 GB/s |
| CPU-GPU Coherency | Hardware Coherent |

The unified memory architecture eliminates the need for explicit data transfers between CPU and GPU memory, significantly simplifying programming and improving performance for memory-bound workloads.

## System Specifications

### Physical Dimensions

| Specification | Value |
|---------------|-------|
| Form Factor | Desktop Workstation |
| Dimensions | 200mm x 200mm x 50mm |
| Weight | 1.5 kg |
| Cooling | Active (Dual Fan) |
| Noise Level | < 35 dB |

### Power Requirements

| Specification | Value |
|---------------|-------|
| TDP | 265W |
| Idle Power | ~25W |
| Power Supply | External 300W Adapter |
| Input Voltage | 100-240V AC |
| Efficiency | 94% (80+ Platinum) |

### Connectivity

| Interface | Specification |
|-----------|---------------|
| USB | 4x USB 3.2 Gen 2 (10 Gbps) |
| USB-C | 2x USB4 (40 Gbps) |
| Display | 2x DisplayPort 2.1 |
| Network | 1x 10GbE RJ45 |
| Storage | 1x NVMe M.2 (PCIe 5.0 x4) |
| Expansion | 1x USB4/Thunderbolt |

### Storage

| Specification | Value |
|---------------|-------|
| Internal Storage | 4 TB NVMe SSD |
| Interface | PCIe 5.0 x4 |
| Sequential Read | 12,000 MB/s |
| Sequential Write | 10,000 MB/s |
| Endurance | 2,400 TBW |

## Two-Node Cluster Specifications

When two DGX Spark units are connected in a cluster configuration:

### Aggregate Compute

| Specification | Single Node | Two-Node Cluster |
|---------------|-------------|------------------|
| CPU Cores | 20 | 40 |
| CUDA Cores | 6,144 | 12,288 |
| Tensor Cores | 192 | 384 |
| Unified Memory | 128 GB | 256 GB |
| FP8 Performance | 838 TFLOPS | 1.68 PFLOPS |
| FP4 Performance | 1.68 PFLOPS | 3.36 PFLOPS |

### Cluster Interconnect

| Specification | Value |
|---------------|-------|
| Connection Type | USB4/Thunderbolt |
| Bandwidth | 80 Gbps (bidirectional) |
| Latency | < 2 μs |
| Topology | Point-to-Point |

## Environmental Specifications

| Specification | Value |
|---------------|-------|
| Operating Temperature | 5°C to 35°C |
| Storage Temperature | -20°C to 60°C |
| Humidity | 10% to 90% (non-condensing) |
| Altitude | Up to 3,000m |
| Certifications | FCC, CE, UL, RoHS |

## Supported Software Stack

- NVIDIA AI Enterprise
- CUDA Toolkit 12.x
- cuDNN 9.x
- TensorRT 10.x
- NVIDIA Container Toolkit
- RAPIDS (cuDF, cuML, cuGraph)
- Apache Spark with RAPIDS Accelerator
- vLLM for inference serving
- PyTorch, TensorFlow, JAX

## Warranty and Support

| Coverage | Duration |
|----------|----------|
| Standard Warranty | 3 Years |
| Extended Warranty | Up to 5 Years |
| Support Level | NVIDIA Enterprise Support |
| Response Time | 4 Hours (Critical) |
