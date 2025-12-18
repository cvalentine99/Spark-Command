# DGX Spark Best Practices Guide

## System Setup Best Practices

### Initial Configuration

When setting up a new DGX Spark system, follow these steps in order:

1. **Update the System**
```bash
sudo apt update && sudo apt upgrade -y
sudo reboot
```

2. **Verify GPU Detection**
```bash
nvidia-smi
dcgmi discovery -l
```

3. **Configure Static IP Addresses**
```bash
sudo nmcli connection modify eth0 \
  ipv4.addresses 192.168.100.10/24 \
  ipv4.gateway 192.168.100.1 \
  ipv4.dns "8.8.8.8" \
  ipv4.method manual
```

4. **Set Hostname**
```bash
sudo hostnamectl set-hostname dgx-spark-01
```

5. **Configure SSH Keys**
```bash
ssh-keygen -t ed25519 -N ""
ssh-copy-id dgx-spark-02
```

### Environment Configuration

Create a standardized environment file (`/etc/profile.d/dgx-spark.sh`):

```bash
# CUDA Configuration
export CUDA_HOME=/usr/local/cuda
export PATH=$CUDA_HOME/bin:$PATH
export LD_LIBRARY_PATH=$CUDA_HOME/lib64:$LD_LIBRARY_PATH

# Spark Configuration
export SPARK_HOME=/opt/spark
export PATH=$SPARK_HOME/bin:$PATH

# RAPIDS Configuration
export RAPIDS_NO_INITIALIZE=1

# Performance Tuning
export OMP_NUM_THREADS=10
export CUDA_DEVICE_ORDER=PCI_BUS_ID
```

---

## Memory Management Best Practices

### Unified Memory Optimization

The unified memory architecture requires different optimization strategies than discrete GPU systems.

**Do:**
- Let the hardware manage memory coherency automatically
- Use memory-mapped files for large datasets
- Leverage zero-copy data sharing between CPU and GPU

**Don't:**
- Manually copy data between CPU and GPU memory
- Over-allocate GPU memory pools
- Use explicit CUDA memory management unless necessary

### Memory Allocation Strategy

```python
# Good: Let PyTorch manage memory
import torch
torch.cuda.set_per_process_memory_fraction(0.9)

# Good: Use memory-efficient data loading
dataloader = DataLoader(
    dataset,
    batch_size=32,
    pin_memory=False,  # Not needed with unified memory
    num_workers=4
)
```

### Handling Large Models

For models approaching memory limits:

```python
# Enable gradient checkpointing
model.gradient_checkpointing_enable()

# Use mixed precision
from torch.cuda.amp import autocast
with autocast():
    output = model(input)

# Consider quantization
from transformers import BitsAndBytesConfig
quantization_config = BitsAndBytesConfig(load_in_8bit=True)
```

---

## Performance Optimization Best Practices

### GPU Utilization

Maximize GPU utilization with these techniques:

1. **Batch Size Optimization**
   - Start with the largest batch size that fits in memory
   - Use gradient accumulation for effective larger batches
   - Monitor GPU utilization with `nvidia-smi dmon`

2. **Data Pipeline Optimization**
```python
# Use multiple workers for data loading
dataloader = DataLoader(
    dataset,
    batch_size=32,
    num_workers=8,
    prefetch_factor=4,
    persistent_workers=True
)
```

3. **Enable cuDNN Autotuning**
```python
torch.backends.cudnn.benchmark = True
```

### Inference Optimization

For production inference workloads:

1. **Use TensorRT for Optimization**
```python
import torch_tensorrt

optimized_model = torch_tensorrt.compile(
    model,
    inputs=[torch_tensorrt.Input(shape=[1, 3, 224, 224])],
    enabled_precisions={torch.float16}
)
```

2. **Enable Flash Attention**
```python
model = AutoModel.from_pretrained(
    "model_name",
    attn_implementation="flash_attention_2"
)
```

3. **Use vLLM for LLM Serving**
```bash
python -m vllm.entrypoints.openai.api_server \
  --model meta-llama/Llama-3-8B-Instruct \
  --gpu-memory-utilization 0.9 \
  --max-model-len 8192
```

### Spark Performance

Optimize Apache Spark workloads:

```properties
# spark-defaults.conf best practices

# Memory settings
spark.executor.memory=64g
spark.driver.memory=16g
spark.memory.fraction=0.8

# RAPIDS settings
spark.plugins=com.nvidia.spark.SQLPlugin
spark.rapids.sql.enabled=true
spark.rapids.memory.gpu.allocFraction=0.7
spark.rapids.sql.concurrentGpuTasks=4

# Shuffle optimization
spark.sql.shuffle.partitions=200
spark.sql.adaptive.enabled=true
spark.sql.adaptive.coalescePartitions.enabled=true
```

---

## Cluster Operation Best Practices

### Workload Distribution

For two-node clusters:

1. **Designate Roles Clearly**
   - Node 1: Master + Worker
   - Node 2: Worker only

2. **Use Shared Storage**
```bash
# NFS setup on master
sudo apt install nfs-kernel-server
echo "/shared 10.0.0.0/24(rw,sync,no_subtree_check)" | sudo tee -a /etc/exports
sudo exportfs -a
```

3. **Synchronize Configurations**
```bash
# Use rsync to keep configs in sync
rsync -avz /opt/spark/conf/ dgx-spark-02:/opt/spark/conf/
```

### High Availability Considerations

While DGX Spark clusters don't have built-in HA, implement these practices:

1. **Regular Checkpointing**
```python
# Save model checkpoints frequently
torch.save({
    'epoch': epoch,
    'model_state_dict': model.state_dict(),
    'optimizer_state_dict': optimizer.state_dict(),
}, f'checkpoint_epoch_{epoch}.pt')
```

2. **Automated Health Checks**
```bash
# Add to crontab
*/5 * * * * /usr/local/bin/health_check.sh
```

3. **Log Aggregation**
   - Forward all logs to Splunk or similar
   - Set up alerting for critical events

---

## Security Best Practices

### Access Control

1. **Use SSH Key Authentication**
```bash
# Disable password authentication
sudo sed -i 's/PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo systemctl restart sshd
```

2. **Configure Firewall**
```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow from 192.168.100.0/24
sudo ufw enable
```

3. **Limit sudo Access**
```bash
# Create dedicated admin group
sudo groupadd dgx-admins
sudo usermod -aG dgx-admins username
```

### Data Protection

1. **Enable Disk Encryption**
   - Use LUKS for sensitive data volumes
   - Store encryption keys securely

2. **Secure API Endpoints**
```python
# Always use authentication for inference APIs
from fastapi import Depends, HTTPException
from fastapi.security import APIKeyHeader

api_key_header = APIKeyHeader(name="X-API-Key")

async def verify_api_key(api_key: str = Depends(api_key_header)):
    if api_key != os.environ["API_KEY"]:
        raise HTTPException(status_code=403)
```

3. **Audit Logging**
```bash
# Enable auditd
sudo apt install auditd
sudo systemctl enable auditd
```

---

## Monitoring Best Practices

### Essential Metrics to Track

| Metric | Tool | Alert Threshold |
|--------|------|-----------------|
| GPU Temperature | DCGM | > 80°C |
| GPU Utilization | DCGM | < 50% (underutilized) |
| GPU Memory | DCGM | > 90% |
| Power Draw | DCGM | > 250W |
| CPU Load | Node Exporter | > 90% |
| Disk Usage | Node Exporter | > 85% |
| Network Errors | Node Exporter | > 0 |

### Monitoring Stack Setup

1. **Deploy Prometheus + Grafana**
```bash
docker-compose up -d prometheus grafana
```

2. **Configure DCGM Exporter**
```bash
docker run -d --gpus all -p 9400:9400 \
  nvcr.io/nvidia/k8s/dcgm-exporter:3.3.0-3.2.0-ubuntu22.04
```

3. **Set Up Alerting**
```yaml
# alertmanager.yml
receivers:
  - name: 'pagerduty'
    pagerduty_configs:
      - service_key: '<your-key>'
```

### Log Management

1. **Centralize Logs**
   - Use Splunk Universal Forwarder
   - Forward to Google Chronicle for security

2. **Structured Logging**
```python
import logging
import json

class JSONFormatter(logging.Formatter):
    def format(self, record):
        return json.dumps({
            'timestamp': self.formatTime(record),
            'level': record.levelname,
            'message': record.getMessage(),
            'module': record.module
        })
```

---

## Maintenance Best Practices

### Regular Maintenance Schedule

| Task | Frequency | Command/Action |
|------|-----------|----------------|
| System Updates | Weekly | `sudo apt update && sudo apt upgrade` |
| Log Rotation | Daily | Configured via logrotate |
| Disk Cleanup | Weekly | `docker system prune -a` |
| GPU Diagnostics | Monthly | `dcgmi diag -r 3` |
| Backup Configs | Weekly | Automated rsync to NAS |
| Security Scan | Monthly | `sudo lynis audit system` |

### Pre-Maintenance Checklist

Before performing maintenance:

1. [ ] Notify users of scheduled downtime
2. [ ] Save all running jobs/checkpoints
3. [ ] Backup critical configurations
4. [ ] Document current system state
5. [ ] Prepare rollback plan

### Post-Maintenance Verification

After maintenance:

1. [ ] Verify GPU detection: `nvidia-smi`
2. [ ] Check cluster connectivity: `ping dgx-spark-02`
3. [ ] Validate services: `systemctl status nvidia-dcgm`
4. [ ] Run smoke tests for critical workloads
5. [ ] Verify monitoring is operational

---

## Development Best Practices

### Environment Management

Use conda for isolated environments:

```bash
# Create project environment
conda create -n project-name python=3.11
conda activate project-name

# Install dependencies
pip install -r requirements.txt
```

### Version Control

1. **Track Experiments**
```python
import mlflow

mlflow.set_experiment("my-experiment")
with mlflow.start_run():
    mlflow.log_params({"lr": 0.001, "batch_size": 32})
    mlflow.log_metrics({"accuracy": 0.95})
    mlflow.pytorch.log_model(model, "model")
```

2. **Use DVC for Data**
```bash
dvc init
dvc add data/training_data.parquet
git add data/training_data.parquet.dvc
```

### Code Quality

1. **Use Type Hints**
```python
def train_model(
    model: torch.nn.Module,
    dataloader: DataLoader,
    epochs: int = 10
) -> Dict[str, float]:
    ...
```

2. **Write Tests**
```python
def test_model_forward():
    model = MyModel()
    input = torch.randn(1, 3, 224, 224)
    output = model(input)
    assert output.shape == (1, 1000)
```

3. **Document Code**
```python
def process_data(df: pd.DataFrame) -> pd.DataFrame:
    """
    Process raw data for model training.
    
    Args:
        df: Raw input DataFrame
        
    Returns:
        Processed DataFrame ready for training
        
    Raises:
        ValueError: If required columns are missing
    """
    ...
```
