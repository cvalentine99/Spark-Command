# DGX Spark Frequently Asked Questions

## General Questions

### What is the NVIDIA DGX Spark?

The NVIDIA DGX Spark is a compact AI supercomputer designed for desktop deployment. It is powered by the NVIDIA GB10 Grace Blackwell Superchip, combining an Arm-based CPU with a Blackwell GPU in a unified architecture with 128GB of shared LPDDR5x memory. It delivers up to 1 petaflop of AI compute performance in a form factor suitable for individual researchers, data scientists, and developers.

### What are the key specifications of a single DGX Spark?

A single DGX Spark unit features:
- **CPU**: 10 Cortex-X925 performance cores + 10 Cortex-A725 efficiency cores
- **GPU**: NVIDIA Blackwell with 6,144 CUDA cores and 192 Tensor Cores
- **Memory**: 128GB unified LPDDR5x (shared between CPU and GPU)
- **Storage**: 4TB NVMe SSD
- **Network**: 10GbE Ethernet + USB4/Thunderbolt
- **Power**: 265W TDP

### Can I connect two DGX Sparks together?

Yes, two DGX Spark units can be connected in a cluster configuration using USB4/Thunderbolt, providing 80 Gbps bidirectional bandwidth. This doubles the compute capacity to approximately 1.8 PFLOPS of AI performance and 256GB of total unified memory.

### What is the difference between DGX Spark and other DGX systems?

DGX Spark is designed for desktop/personal use, while DGX Station and DGX systems are enterprise-grade data center solutions. DGX Spark uses the GB10 Superchip with unified memory architecture, making it more power-efficient and compact, while larger DGX systems use discrete GPUs with dedicated HBM memory for maximum performance.

---

## Hardware Questions

### What type of memory does DGX Spark use?

DGX Spark uses 128GB of LPDDR5x unified memory running at 8533 MT/s. This memory is shared between the CPU and GPU through a hardware-coherent interface, eliminating the need for explicit data transfers and simplifying programming.

### What is the power consumption of DGX Spark?

The TDP (Thermal Design Power) is 265W under full load. Idle power consumption is approximately 25W. The system uses an external 300W power adapter with 94% efficiency (80+ Platinum rated).

### What cooling does DGX Spark require?

DGX Spark uses active cooling with dual fans. It is designed for desktop operation in environments with ambient temperatures up to 35°C. Ensure at least 10cm clearance on all sides for proper airflow.

### Can I upgrade the storage in DGX Spark?

The internal 4TB NVMe SSD is not user-upgradeable. However, you can connect external storage via USB4/Thunderbolt or use network-attached storage (NAS) for additional capacity.

### What display outputs does DGX Spark have?

DGX Spark has two DisplayPort 2.1 outputs, supporting up to 8K resolution. It can drive multiple displays simultaneously for visualization workloads.

---

## Software Questions

### What operating system does DGX Spark run?

DGX Spark runs DGX OS, NVIDIA's optimized Linux distribution based on Ubuntu 22.04 LTS. It includes pre-configured NVIDIA drivers, CUDA toolkit, and AI frameworks.

### What CUDA version is supported?

DGX Spark supports CUDA 12.x. The system comes pre-installed with the latest compatible CUDA toolkit and cuDNN libraries.

### Can I run Docker containers on DGX Spark?

Yes, Docker is pre-installed with NVIDIA Container Toolkit, enabling GPU-accelerated containers. You can pull pre-built containers from NVIDIA NGC (GPU Cloud) or build your own.

### What AI frameworks are supported?

DGX Spark supports all major AI frameworks including PyTorch, TensorFlow, JAX, and NVIDIA's NeMo. The RAPIDS ecosystem (cuDF, cuML, cuGraph) is also fully supported for GPU-accelerated data science.

### Can I run Windows on DGX Spark?

No, DGX Spark is designed exclusively for Linux. The GB10 Superchip's Arm architecture and unified memory design require the specialized DGX OS for optimal performance.

---

## Performance Questions

### What is the AI performance of DGX Spark?

A single DGX Spark delivers:
- **FP32**: 209 TFLOPS
- **FP16**: 419 TFLOPS
- **FP8**: 838 TFLOPS
- **INT8**: 838 TOPS
- **FP4**: 1.68 PFLOPS

A two-node cluster approximately doubles these figures.

### How many tokens per second can DGX Spark generate for LLMs?

Performance varies by model size and configuration. For a 7B parameter model like Llama 3, expect approximately 50-100 tokens/second for inference. Larger models will have lower throughput but can still run efficiently due to the 128GB unified memory.

### What is the maximum model size I can run?

With 128GB of unified memory, a single DGX Spark can load models up to approximately 60-70B parameters in FP16, or larger models using quantization (INT8/INT4). A two-node cluster with 256GB can handle models up to 120-140B parameters.

### How does unified memory affect performance?

Unified memory eliminates CPU-to-GPU data transfer overhead, which is particularly beneficial for:
- Large model inference where model weights exceed GPU memory
- Data preprocessing pipelines
- Applications with frequent CPU-GPU data sharing
- Simplified programming without explicit memory management

---

## Cluster Questions

### How do I connect two DGX Sparks?

Connect the USB4/Thunderbolt ports on both units using a certified USB4 40Gbps active cable (maximum 2 meters). Then configure the network interface and cluster software as described in the cluster networking guide.

### What software is needed for cluster operation?

For distributed workloads, you can use:
- **Apache Spark** with RAPIDS Accelerator for data processing
- **PyTorch Distributed** or **Horovod** for distributed training
- **Ray** for general distributed computing
- **Kubernetes** for container orchestration

### Can I add more than two nodes to the cluster?

The USB4 interconnect supports point-to-point connections between two nodes. For larger clusters, you would need to use the 10GbE network, which has higher latency and lower bandwidth than the USB4 link.

### How is workload distributed across nodes?

Workload distribution depends on the framework:
- **Spark**: Automatic partitioning with master/worker architecture
- **PyTorch DDP**: Data parallelism across GPUs
- **vLLM**: Tensor parallelism for large models
- **Kubernetes**: Pod scheduling based on resource requests

---

## Networking Questions

### What network ports need to be open?

Essential ports include:
- **22**: SSH
- **7077**: Spark Master
- **8080**: Spark Master UI
- **8081**: Spark Worker UI
- **4040**: Spark Application UI
- **8888**: Jupyter Notebook
- **9100**: Node Exporter (Prometheus)
- **9400**: DCGM Exporter

### What is the bandwidth of the cluster interconnect?

The USB4/Thunderbolt interconnect provides 80 Gbps bidirectional bandwidth with sub-2μs latency. This is sufficient for most distributed AI workloads.

### Can I use InfiniBand with DGX Spark?

No, DGX Spark does not have InfiniBand ports. The USB4 interconnect and 10GbE are the available high-speed networking options.

---

## Maintenance Questions

### How do I update the NVIDIA drivers?

```bash
sudo apt update
sudo apt install nvidia-driver-550
sudo reboot
```

### How do I monitor GPU health?

Use NVIDIA DCGM (Data Center GPU Manager):
```bash
dcgmi health -c -j
dcgmi dmon -e 155,156,203,204
```

Or use nvidia-smi:
```bash
nvidia-smi -q
nvidia-smi dmon
```

### What is the warranty coverage?

DGX Spark comes with a 3-year standard warranty, extendable to 5 years. NVIDIA Enterprise Support provides 4-hour response time for critical issues.

### How do I contact NVIDIA support?

For technical support, contact NVIDIA Enterprise Support through the NVIDIA Enterprise Portal or call the support hotline. Have your system serial number ready.

---

## Troubleshooting Questions

### Why is my GPU not detected?

Common causes include:
1. Driver not loaded - run `sudo modprobe nvidia`
2. Secure Boot enabled - disable or sign the module
3. Driver corruption - reinstall with `sudo apt install --reinstall nvidia-driver-550`

### Why is my Spark job running on CPU instead of GPU?

Ensure the RAPIDS plugin is properly configured:
1. Verify JAR files are in `$SPARK_HOME/jars/`
2. Check `spark.plugins=com.nvidia.spark.SQLPlugin` is set
3. Confirm `spark.rapids.sql.enabled=true`

### Why is the cluster interconnect slow?

Check:
1. Using certified USB4 40Gbps active cable
2. Cable length under 2 meters
3. Thunderbolt device is authorized (`boltctl list`)
4. Network interface is configured with correct MTU

### How do I reset the system if it becomes unresponsive?

1. Try SSH from another machine
2. If SSH fails, hold the power button for 10 seconds
3. After reboot, check `dmesg` and GPU status with `nvidia-smi`
4. If issues persist, contact NVIDIA support
