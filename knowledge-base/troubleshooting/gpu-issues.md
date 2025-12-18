# DGX Spark GPU Troubleshooting Guide

## Quick Diagnostic Commands

Before diving into specific issues, run these commands to gather system state:

```bash
# GPU status overview
nvidia-smi

# Detailed GPU info
nvidia-smi -q

# Check driver version
cat /proc/driver/nvidia/version

# DCGM health check
dcgmi health -c -j
```

---

## Issue: GPU Not Detected

### Symptoms
- `nvidia-smi` returns "No devices were found"
- Applications fail with "CUDA device not found"
- `lspci | grep -i nvidia` shows no output

### Diagnostic Steps

1. **Verify hardware connection**:
```bash
lspci | grep -i nvidia
dmesg | grep -i nvidia
```

2. **Check driver status**:
```bash
lsmod | grep nvidia
systemctl status nvidia-persistenced
```

3. **Review kernel messages**:
```bash
journalctl -b | grep -i "nvidia\|gpu\|cuda"
```

### Solutions

**Solution 1: Reload NVIDIA Driver**
```bash
sudo rmmod nvidia_uvm nvidia_drm nvidia_modeset nvidia
sudo modprobe nvidia
nvidia-smi
```

**Solution 2: Reinstall Driver**
```bash
sudo apt purge nvidia-*
sudo apt autoremove
sudo apt install nvidia-driver-550
sudo reboot
```

**Solution 3: Check Secure Boot**
```bash
mokutil --sb-state
# If enabled, either disable or sign the NVIDIA module
```

---

## Issue: CUDA Out of Memory (OOM)

### Symptoms
- Error: "CUDA out of memory"
- Error: "RuntimeError: CUDA error: out of memory"
- Training/inference crashes unexpectedly

### Diagnostic Steps

1. **Check current memory usage**:
```bash
nvidia-smi --query-gpu=memory.used,memory.total --format=csv
```

2. **Identify memory-consuming processes**:
```bash
nvidia-smi pmon -s m -d 1
```

3. **Check for zombie processes**:
```bash
fuser -v /dev/nvidia*
```

### Solutions

**Solution 1: Clear GPU Memory**
```bash
# Kill all GPU processes (use with caution)
sudo fuser -k /dev/nvidia*

# Or restart the NVIDIA persistence daemon
sudo systemctl restart nvidia-persistenced
```

**Solution 2: Reduce Batch Size**
```python
# In your training script
batch_size = 16  # Reduce from 32 or higher
```

**Solution 3: Enable Memory-Efficient Attention**
```python
# For transformers
model = AutoModel.from_pretrained(
    "model_name",
    torch_dtype=torch.float16,
    attn_implementation="flash_attention_2"
)
```

**Solution 4: Use Gradient Checkpointing**
```python
model.gradient_checkpointing_enable()
```

---

## Issue: GPU Temperature Too High

### Symptoms
- GPU temperature exceeds 80°C
- Thermal throttling warnings in logs
- Performance degradation under load

### Diagnostic Steps

1. **Monitor temperature**:
```bash
nvidia-smi dmon -s pt -d 1
# Or use DCGM
dcgmi dmon -e 155 -d 1000
```

2. **Check fan status**:
```bash
nvidia-smi -q -d FAN
```

3. **Review thermal history**:
```bash
nvidia-smi --query-gpu=temperature.gpu --format=csv -l 5
```

### Solutions

**Solution 1: Improve Airflow**
- Ensure adequate clearance around the unit (minimum 10cm on all sides)
- Clean dust filters and vents
- Verify ambient temperature is below 30°C

**Solution 2: Adjust Power Limit**
```bash
# Reduce power limit to lower temperature
sudo nvidia-smi -pl 200  # Reduce from 265W default
```

**Solution 3: Set Custom Fan Curve**
```bash
# Increase fan speed
sudo nvidia-settings -a "[gpu:0]/GPUFanControlState=1"
sudo nvidia-settings -a "[fan:0]/GPUTargetFanSpeed=80"
```

**Solution 4: Limit GPU Clock**
```bash
# Lock to lower clock speed
sudo nvidia-smi -lgc 1500,1500
```

---

## Issue: XID Errors

### Symptoms
- System logs show "NVRM: Xid" errors
- GPU hangs or becomes unresponsive
- Applications crash with GPU errors

### Common XID Codes

| XID | Description | Severity |
|-----|-------------|----------|
| 13 | Graphics Engine Exception | High |
| 31 | GPU memory page fault | High |
| 32 | Invalid or corrupted push buffer | High |
| 43 | GPU stopped processing | Critical |
| 45 | Preemptive cleanup | Medium |
| 48 | Double Bit ECC Error | Critical |
| 63 | ECC page retirement | Medium |
| 64 | ECC page retirement (DBE) | High |
| 79 | GPU fallen off the bus | Critical |

### Diagnostic Steps

1. **Check for XID errors**:
```bash
dmesg | grep -i xid
journalctl -b | grep -i "xid\|nvrm"
```

2. **Check ECC status**:
```bash
nvidia-smi -q -d ECC
```

3. **Run GPU diagnostics**:
```bash
dcgmi diag -r 3  # Level 3 diagnostic
```

### Solutions

**For XID 13, 31, 32 (Software/Driver Issues)**:
```bash
# Update driver
sudo apt update
sudo apt install nvidia-driver-550

# Reset GPU
sudo nvidia-smi -r
```

**For XID 43, 79 (Hardware/Power Issues)**:
```bash
# Check power supply
nvidia-smi -q -d POWER

# Reseat connections and reboot
sudo reboot
```

**For XID 48, 63, 64 (ECC Errors)**:
```bash
# Check ECC error counts
nvidia-smi -q -d ECC

# If errors persist, RMA may be required
# Contact NVIDIA support with diagnostic output
dcgmi diag -r 3 > gpu_diagnostic.txt
```

---

## Issue: CUDA Version Mismatch

### Symptoms
- Error: "CUDA driver version is insufficient for CUDA runtime version"
- PyTorch/TensorFlow fails to detect GPU
- `torch.cuda.is_available()` returns False

### Diagnostic Steps

1. **Check versions**:
```bash
# Driver CUDA version
nvidia-smi | grep "CUDA Version"

# Runtime CUDA version
nvcc --version

# PyTorch CUDA version
python -c "import torch; print(torch.version.cuda)"
```

### Solutions

**Solution 1: Update Driver**
```bash
sudo apt update
sudo apt install nvidia-driver-550
sudo reboot
```

**Solution 2: Install Matching PyTorch**
```bash
# For CUDA 12.4
pip install torch --index-url https://download.pytorch.org/whl/cu124
```

**Solution 3: Use NVIDIA Container**
```bash
# Use pre-configured container
docker run --gpus all -it nvcr.io/nvidia/pytorch:24.03-py3
```

---

## Issue: Multi-GPU Communication Failure

### Symptoms
- NCCL errors during distributed training
- Peer-to-peer access fails
- Slow multi-GPU performance

### Diagnostic Steps

1. **Check P2P support**:
```bash
nvidia-smi topo -m
```

2. **Test NCCL**:
```bash
# Run NCCL test
nccl-tests/build/all_reduce_perf -b 8 -e 256M -f 2 -g 2
```

3. **Check NVLink status** (if applicable):
```bash
nvidia-smi nvlink -s
```

### Solutions

**Solution 1: Enable P2P**
```bash
# Set environment variable
export CUDA_VISIBLE_DEVICES=0,1
export NCCL_P2P_LEVEL=NVL
```

**Solution 2: Configure NCCL**
```bash
export NCCL_DEBUG=INFO
export NCCL_IB_DISABLE=1
export NCCL_SOCKET_IFNAME=eth0
```

---

## Issue: GPU Utilization Low

### Symptoms
- GPU utilization stays below 50%
- Training is slower than expected
- CPU appears to be the bottleneck

### Diagnostic Steps

1. **Monitor utilization**:
```bash
nvidia-smi dmon -s u -d 1
```

2. **Check data loading**:
```bash
# Profile with Nsight Systems
nsys profile -o report python train.py
```

### Solutions

**Solution 1: Increase Data Loader Workers**
```python
dataloader = DataLoader(
    dataset,
    batch_size=32,
    num_workers=8,  # Increase workers
    pin_memory=True,
    prefetch_factor=4
)
```

**Solution 2: Use Mixed Precision**
```python
from torch.cuda.amp import autocast, GradScaler

scaler = GradScaler()
with autocast():
    output = model(input)
```

**Solution 3: Enable cuDNN Benchmark**
```python
torch.backends.cudnn.benchmark = True
```

---

## Emergency Recovery

### Complete GPU Reset

```bash
# Stop all GPU processes
sudo systemctl stop nvidia-persistenced
sudo fuser -k /dev/nvidia*

# Unload drivers
sudo rmmod nvidia_uvm nvidia_drm nvidia_modeset nvidia

# Reload drivers
sudo modprobe nvidia
sudo systemctl start nvidia-persistenced

# Verify
nvidia-smi
```

### Factory Reset (Last Resort)

```bash
# Reinstall entire NVIDIA stack
sudo apt purge nvidia-* cuda-* libcudnn*
sudo apt autoremove
sudo reboot

# Fresh install
sudo apt update
sudo apt install nvidia-driver-550 cuda-toolkit-12-4
sudo reboot
```
