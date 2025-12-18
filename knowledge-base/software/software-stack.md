# DGX Spark Software Stack

## Operating System

### DGX OS

DGX Spark runs DGX OS, NVIDIA's optimized Linux distribution based on Ubuntu 22.04 LTS.

| Component | Version |
|-----------|---------|
| Base OS | Ubuntu 22.04 LTS |
| Kernel | 6.5.x (NVIDIA optimized) |
| NVIDIA Driver | 550.x |
| Container Runtime | Docker 24.x + NVIDIA Container Toolkit |

### Key OS Features

The DGX OS includes several optimizations specific to AI workloads:

1. **Kernel Optimizations**: Custom kernel with reduced latency scheduling, optimized memory management, and GPU-aware NUMA policies.

2. **Security Hardening**: SELinux policies, secure boot, and encrypted storage support.

3. **Remote Management**: BMC integration for out-of-band management and monitoring.

## CUDA Platform

### CUDA Toolkit

| Component | Version | Description |
|-----------|---------|-------------|
| CUDA Driver | 550.x | GPU kernel driver |
| CUDA Runtime | 12.4 | Runtime API |
| nvcc | 12.4 | CUDA compiler |
| cuBLAS | 12.4 | Linear algebra library |
| cuFFT | 12.4 | FFT library |
| cuRAND | 12.4 | Random number generation |
| cuSPARSE | 12.4 | Sparse matrix operations |
| cuSOLVER | 12.4 | Dense/sparse solvers |

### Deep Learning Libraries

| Library | Version | Purpose |
|---------|---------|---------|
| cuDNN | 9.0 | Deep neural network primitives |
| TensorRT | 10.0 | Inference optimization |
| NCCL | 2.20 | Multi-GPU communication |
| cuTENSOR | 2.0 | Tensor operations |

## AI Frameworks

### PyTorch

PyTorch is pre-installed with full GPU acceleration support.

```bash
# Check PyTorch installation
python3 -c "import torch; print(torch.cuda.is_available())"

# Verify GPU detection
python3 -c "import torch; print(torch.cuda.get_device_name(0))"
```

| Component | Version |
|-----------|---------|
| PyTorch | 2.3.x |
| torchvision | 0.18.x |
| torchaudio | 2.3.x |

### TensorFlow

TensorFlow with GPU support is available via containers.

```bash
# Run TensorFlow container
docker run --gpus all -it nvcr.io/nvidia/tensorflow:24.03-tf2-py3
```

### JAX

JAX with GPU acceleration for high-performance numerical computing.

```bash
# Install JAX with CUDA support
pip install jax[cuda12_pip] -f https://storage.googleapis.com/jax-releases/jax_cuda_releases.html
```

## RAPIDS Ecosystem

RAPIDS provides GPU-accelerated data science libraries.

### Core Libraries

| Library | Purpose | CPU Equivalent |
|---------|---------|----------------|
| cuDF | DataFrames | pandas |
| cuML | Machine Learning | scikit-learn |
| cuGraph | Graph Analytics | NetworkX |
| cuSpatial | Geospatial | GeoPandas |
| cuSignal | Signal Processing | SciPy Signal |

### Installation

```bash
# Install RAPIDS via conda
conda install -c rapidsai -c conda-forge -c nvidia rapids=24.04 python=3.11 cuda-version=12.0

# Or via pip
pip install cudf-cu12 cuml-cu12 cugraph-cu12
```

### RAPIDS Accelerator for Apache Spark

Enables GPU acceleration for Spark SQL and DataFrame operations.

```bash
# Download the plugin
wget https://repo1.maven.org/maven2/com/nvidia/rapids-4-spark_2.12/24.04.0/rapids-4-spark_2.12-24.04.0.jar

# Configure Spark
spark-submit \
  --conf spark.plugins=com.nvidia.spark.SQLPlugin \
  --conf spark.rapids.sql.enabled=true \
  your_application.py
```

## Inference Serving

### vLLM

vLLM provides high-throughput LLM inference serving.

```bash
# Install vLLM
pip install vllm

# Start server
python -m vllm.entrypoints.openai.api_server \
  --model meta-llama/Llama-3-8B-Instruct \
  --tensor-parallel-size 1 \
  --gpu-memory-utilization 0.9
```

### Triton Inference Server

NVIDIA Triton for production inference deployment.

```bash
# Run Triton container
docker run --gpus all -p 8000:8000 -p 8001:8001 -p 8002:8002 \
  -v /path/to/models:/models \
  nvcr.io/nvidia/tritonserver:24.03-py3 \
  tritonserver --model-repository=/models
```

### TensorRT-LLM

Optimized LLM inference with TensorRT.

```bash
# Build TensorRT-LLM engine
python build.py --model_dir ./llama-3-8b \
  --dtype float16 \
  --use_gpt_attention_plugin float16 \
  --output_dir ./engines
```

## Container Ecosystem

### NVIDIA Container Toolkit

Enables GPU access within Docker containers.

```bash
# Verify installation
nvidia-ctk --version

# Test GPU access in container
docker run --rm --gpus all nvidia/cuda:12.4-base-ubuntu22.04 nvidia-smi
```

### NGC Containers

Pre-built containers from NVIDIA GPU Cloud.

| Container | Use Case |
|-----------|----------|
| nvcr.io/nvidia/pytorch | PyTorch development |
| nvcr.io/nvidia/tensorflow | TensorFlow development |
| nvcr.io/nvidia/tritonserver | Inference serving |
| nvcr.io/nvidia/rapidsai | Data science |
| nvcr.io/nvidia/nemo | NLP/Speech AI |

## Development Tools

### NVIDIA Nsight Systems

System-wide performance analysis.

```bash
# Profile application
nsys profile -o report python train.py

# View report
nsys-ui report.nsys-rep
```

### NVIDIA Nsight Compute

Detailed GPU kernel analysis.

```bash
# Profile specific kernels
ncu --set full -o profile python inference.py
```

### DCGM (Data Center GPU Manager)

GPU monitoring and management.

```bash
# Start DCGM
systemctl start nvidia-dcgm

# Query GPU metrics
dcgmi dmon -e 155,156,203,204 -d 1000
```

## Package Management

### Conda

Recommended for managing Python environments.

```bash
# Create environment
conda create -n dgx-spark python=3.11

# Activate
conda activate dgx-spark
```

### pip

Standard Python package manager.

```bash
# Install with CUDA support
pip install torch --index-url https://download.pytorch.org/whl/cu124
```

## System Services

| Service | Purpose | Port |
|---------|---------|------|
| nvidia-dcgm | GPU monitoring | 5555 |
| docker | Container runtime | - |
| prometheus-node-exporter | System metrics | 9100 |
| dcgm-exporter | GPU metrics | 9400 |
| jupyter | Notebook server | 8888 |
