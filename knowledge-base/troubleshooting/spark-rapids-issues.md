# Apache Spark & RAPIDS Troubleshooting Guide

## Quick Diagnostic Commands

```bash
# Check Spark status
spark-submit --version
pgrep -a spark

# Check RAPIDS plugin
ls -la $SPARK_HOME/jars/*rapids*

# View Spark logs
tail -f /var/log/spark/spark-*.log
```

---

## Issue: Spark Job Fails to Start

### Symptoms
- Job hangs at "Submitted application"
- No executors are allocated
- Spark UI shows 0 active executors

### Diagnostic Steps

1. **Check Spark master status**:
```bash
curl http://localhost:8080/json
```

2. **Verify worker registration**:
```bash
curl http://localhost:8081/json
```

3. **Review driver logs**:
```bash
tail -100 /var/log/spark/spark-driver.log
```

### Solutions

**Solution 1: Restart Spark Services**
```bash
$SPARK_HOME/sbin/stop-all.sh
$SPARK_HOME/sbin/start-all.sh
```

**Solution 2: Check Resource Allocation**
```bash
# Verify memory settings
cat $SPARK_HOME/conf/spark-defaults.conf | grep memory

# Adjust if needed
spark.executor.memory=64g
spark.driver.memory=16g
```

**Solution 3: Clear Spark Work Directory**
```bash
rm -rf /tmp/spark-*
rm -rf $SPARK_HOME/work/*
```

---

## Issue: RAPIDS Plugin Not Loading

### Symptoms
- Jobs run on CPU instead of GPU
- No GPU utilization during Spark jobs
- Warning: "RAPIDS Accelerator not found"

### Diagnostic Steps

1. **Verify plugin JAR**:
```bash
ls -la $SPARK_HOME/jars/rapids-4-spark*.jar
```

2. **Check Spark configuration**:
```bash
grep -i rapids $SPARK_HOME/conf/spark-defaults.conf
```

3. **Review executor logs for GPU detection**:
```bash
grep -i "gpu\|rapids\|cuda" /var/log/spark/executor-*.log
```

### Solutions

**Solution 1: Install RAPIDS Plugin**
```bash
# Download latest plugin
wget https://repo1.maven.org/maven2/com/nvidia/rapids-4-spark_2.12/24.04.0/rapids-4-spark_2.12-24.04.0.jar \
  -O $SPARK_HOME/jars/rapids-4-spark.jar

# Download cuDF
wget https://repo1.maven.org/maven2/ai/rapids/cudf/24.04.0/cudf-24.04.0-cuda12.jar \
  -O $SPARK_HOME/jars/cudf.jar
```

**Solution 2: Configure spark-defaults.conf**
```properties
# Add to $SPARK_HOME/conf/spark-defaults.conf
spark.plugins=com.nvidia.spark.SQLPlugin
spark.rapids.sql.enabled=true
spark.rapids.memory.pinnedPool.size=2G
spark.executor.resource.gpu.amount=1
spark.task.resource.gpu.amount=0.25
spark.rapids.sql.concurrentGpuTasks=4
```

**Solution 3: Submit with Explicit Configuration**
```bash
spark-submit \
  --conf spark.plugins=com.nvidia.spark.SQLPlugin \
  --conf spark.rapids.sql.enabled=true \
  --conf spark.executor.resource.gpu.amount=1 \
  --conf spark.task.resource.gpu.amount=0.25 \
  your_application.py
```

---

## Issue: GPU Out of Memory During Spark Job

### Symptoms
- Error: "ai.rapids.cudf.CudfException: std::bad_alloc"
- Executors killed with OOM
- Job fails partway through

### Diagnostic Steps

1. **Monitor GPU memory during job**:
```bash
watch -n 1 nvidia-smi
```

2. **Check RAPIDS memory configuration**:
```bash
grep -i "rapids.*memory" $SPARK_HOME/conf/spark-defaults.conf
```

### Solutions

**Solution 1: Adjust RAPIDS Memory Settings**
```properties
# Reduce GPU memory pool
spark.rapids.memory.gpu.pool=ASYNC
spark.rapids.memory.gpu.allocFraction=0.7
spark.rapids.memory.gpu.maxAllocFraction=0.9

# Enable spilling to host memory
spark.rapids.memory.host.spillStorageSize=4G
```

**Solution 2: Reduce Concurrent GPU Tasks**
```properties
spark.rapids.sql.concurrentGpuTasks=2  # Reduce from 4
spark.task.resource.gpu.amount=0.5     # Increase from 0.25
```

**Solution 3: Increase Partitions**
```python
# In your Spark application
df = df.repartition(200)  # Increase partition count
```

---

## Issue: Slow Spark Performance

### Symptoms
- Jobs take longer than expected
- GPU utilization is low during Spark jobs
- Frequent data shuffles

### Diagnostic Steps

1. **Check Spark UI for bottlenecks**:
   - Navigate to http://localhost:4040
   - Review Stage timeline
   - Check Shuffle Read/Write sizes

2. **Monitor GPU utilization**:
```bash
nvidia-smi dmon -s u -d 1
```

3. **Profile with Spark event logs**:
```bash
# Enable event logging
spark.eventLog.enabled=true
spark.eventLog.dir=/tmp/spark-events
```

### Solutions

**Solution 1: Optimize Shuffle**
```properties
spark.sql.shuffle.partitions=200
spark.rapids.sql.shuffle.spillThreads=4
spark.rapids.shuffle.transport.enabled=true
```

**Solution 2: Enable AQE (Adaptive Query Execution)**
```properties
spark.sql.adaptive.enabled=true
spark.sql.adaptive.coalescePartitions.enabled=true
spark.sql.adaptive.skewJoin.enabled=true
```

**Solution 3: Use GPU-Optimized File Formats**
```python
# Write as Parquet with GPU-friendly settings
df.write \
  .option("compression", "snappy") \
  .parquet("/data/output")
```

**Solution 4: Broadcast Small Tables**
```python
from pyspark.sql.functions import broadcast

result = large_df.join(broadcast(small_df), "key")
```

---

## Issue: Executor Lost / Heartbeat Timeout

### Symptoms
- Error: "ExecutorLostFailure"
- Error: "Heartbeat timeout"
- Executors disappear from Spark UI

### Diagnostic Steps

1. **Check executor logs**:
```bash
tail -100 /var/log/spark/executor-*.log
```

2. **Check system resources**:
```bash
free -h
df -h
```

3. **Check for OOM killer**:
```bash
dmesg | grep -i "killed process"
```

### Solutions

**Solution 1: Increase Heartbeat Timeout**
```properties
spark.network.timeout=600s
spark.executor.heartbeatInterval=60s
```

**Solution 2: Adjust Memory Settings**
```properties
spark.executor.memory=64g
spark.executor.memoryOverhead=8g
spark.memory.fraction=0.8
```

**Solution 3: Enable Speculation**
```properties
spark.speculation=true
spark.speculation.interval=100ms
spark.speculation.multiplier=1.5
```

---

## Issue: Data Skew

### Symptoms
- Some tasks take much longer than others
- Uneven partition sizes in Spark UI
- Single executor doing most of the work

### Diagnostic Steps

1. **Check partition sizes**:
```python
df.groupBy(spark_partition_id()).count().show()
```

2. **Identify skewed keys**:
```python
df.groupBy("key_column").count().orderBy("count", ascending=False).show(20)
```

### Solutions

**Solution 1: Salting**
```python
from pyspark.sql.functions import concat, lit, rand

# Add salt to skewed key
df_salted = df.withColumn(
    "salted_key",
    concat(col("key"), lit("_"), (rand() * 10).cast("int"))
)
```

**Solution 2: Use AQE Skew Join**
```properties
spark.sql.adaptive.enabled=true
spark.sql.adaptive.skewJoin.enabled=true
spark.sql.adaptive.skewJoin.skewedPartitionFactor=5
spark.sql.adaptive.skewJoin.skewedPartitionThresholdInBytes=256MB
```

**Solution 3: Custom Partitioning**
```python
df.repartition(200, "key_column")
```

---

## Issue: Cluster Communication Failure

### Symptoms
- Workers cannot connect to master
- Error: "Connection refused"
- Executors fail to register

### Diagnostic Steps

1. **Check network connectivity**:
```bash
ping dgx-spark-02
telnet dgx-spark-01 7077
```

2. **Verify firewall rules**:
```bash
sudo ufw status
sudo iptables -L -n
```

3. **Check Spark master binding**:
```bash
netstat -tlnp | grep 7077
```

### Solutions

**Solution 1: Configure Spark Networking**
```properties
# In spark-defaults.conf
spark.driver.host=dgx-spark-01
spark.driver.bindAddress=0.0.0.0
spark.blockManager.port=7100
```

**Solution 2: Open Required Ports**
```bash
sudo ufw allow 7077/tcp
sudo ufw allow 7078/tcp
sudo ufw allow 7100/tcp
sudo ufw allow 4040/tcp
```

**Solution 3: Use Hostname Resolution**
```bash
# Ensure /etc/hosts is correct on all nodes
192.168.100.10  dgx-spark-01
192.168.100.11  dgx-spark-02
```

---

## RAPIDS-Specific Diagnostics

### Check RAPIDS Compatibility

```bash
# Verify CUDA version compatibility
nvidia-smi | grep "CUDA Version"
java -cp $SPARK_HOME/jars/cudf*.jar:$SPARK_HOME/jars/rapids*.jar \
  com.nvidia.spark.rapids.tool.profiling.Profiler --help
```

### Generate RAPIDS Diagnostic Report

```bash
# Run RAPIDS qualification tool
spark-submit \
  --class com.nvidia.spark.rapids.tool.qualification.QualificationMain \
  $SPARK_HOME/jars/rapids-4-spark-tools*.jar \
  --output-directory /tmp/rapids-qual \
  /path/to/spark-event-logs
```

### RAPIDS Debug Logging

```properties
# Enable verbose RAPIDS logging
spark.rapids.sql.explain=ALL
spark.rapids.sql.debug.enabled=true
```
