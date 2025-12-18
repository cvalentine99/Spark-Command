#!/bin/bash
##############################################################################
# Host Metrics Collection Script for Splunk
# Collects CPU, Memory, Disk, and System metrics
##############################################################################

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%S")
HOSTNAME=$(hostname)

#=============================================================================
# CPU Metrics
#=============================================================================

# Get CPU utilization from /proc/stat
CPU_LINE=$(head -1 /proc/stat)
read -r cpu user nice system idle iowait irq softirq steal guest guest_nice <<< "$CPU_LINE"
TOTAL=$((user + nice + system + idle + iowait + irq + softirq + steal))
IDLE_PERCENT=$((idle * 100 / TOTAL))
CPU_UTIL=$((100 - IDLE_PERCENT))

# Get load averages
LOAD_AVG=$(cat /proc/loadavg)
read -r LOAD_1 LOAD_5 LOAD_15 PROCS LAST_PID <<< "$LOAD_AVG"

# Get CPU count
CPU_COUNT=$(nproc)

# Get CPU frequency
CPU_FREQ=$(cat /proc/cpuinfo | grep "cpu MHz" | head -1 | awk '{print $4}')

echo "timestamp=${TIMESTAMP} host=${HOSTNAME} metric_type=cpu cpu_utilization=${CPU_UTIL} load_1m=${LOAD_1} load_5m=${LOAD_5} load_15m=${LOAD_15} cpu_count=${CPU_COUNT} cpu_freq_mhz=${CPU_FREQ:-0}"

#=============================================================================
# Memory Metrics
#=============================================================================

# Read memory info
MEM_TOTAL=$(grep MemTotal /proc/meminfo | awk '{print $2}')
MEM_FREE=$(grep MemFree /proc/meminfo | awk '{print $2}')
MEM_AVAILABLE=$(grep MemAvailable /proc/meminfo | awk '{print $2}')
MEM_BUFFERS=$(grep Buffers /proc/meminfo | awk '{print $2}')
MEM_CACHED=$(grep "^Cached:" /proc/meminfo | awk '{print $2}')
SWAP_TOTAL=$(grep SwapTotal /proc/meminfo | awk '{print $2}')
SWAP_FREE=$(grep SwapFree /proc/meminfo | awk '{print $2}')

MEM_USED=$((MEM_TOTAL - MEM_AVAILABLE))
MEM_UTIL=$((MEM_USED * 100 / MEM_TOTAL))
SWAP_USED=$((SWAP_TOTAL - SWAP_FREE))
SWAP_UTIL=0
if [ "$SWAP_TOTAL" -gt 0 ]; then
    SWAP_UTIL=$((SWAP_USED * 100 / SWAP_TOTAL))
fi

# Convert to GB
MEM_TOTAL_GB=$(echo "scale=2; $MEM_TOTAL / 1048576" | bc)
MEM_USED_GB=$(echo "scale=2; $MEM_USED / 1048576" | bc)
MEM_AVAILABLE_GB=$(echo "scale=2; $MEM_AVAILABLE / 1048576" | bc)

echo "timestamp=${TIMESTAMP} host=${HOSTNAME} metric_type=memory memory_total_gb=${MEM_TOTAL_GB} memory_used_gb=${MEM_USED_GB} memory_available_gb=${MEM_AVAILABLE_GB} memory_utilization=${MEM_UTIL} swap_total_kb=${SWAP_TOTAL} swap_used_kb=${SWAP_USED} swap_utilization=${SWAP_UTIL}"

#=============================================================================
# Disk Metrics
#=============================================================================

# Get disk usage for important mount points
df -BG --output=target,size,used,avail,pcent 2>/dev/null | tail -n +2 | while read -r mount size used avail pcent; do
    # Skip pseudo filesystems
    if [[ "$mount" =~ ^/(dev|proc|sys|run|snap) ]]; then
        continue
    fi
    
    # Remove 'G' suffix and '%' from values
    size_gb=${size%G}
    used_gb=${used%G}
    avail_gb=${avail%G}
    util=${pcent%\%}
    
    echo "timestamp=${TIMESTAMP} host=${HOSTNAME} metric_type=disk mount_point=\"${mount}\" disk_size_gb=${size_gb} disk_used_gb=${used_gb} disk_available_gb=${avail_gb} disk_utilization=${util}"
done

#=============================================================================
# Disk I/O Metrics
#=============================================================================

# Get disk I/O stats from /proc/diskstats
cat /proc/diskstats | awk '{print $3, $4, $8, $6, $10}' | while read -r device reads_completed writes_completed sectors_read sectors_written; do
    # Only report on physical disks (nvme, sd*)
    if [[ "$device" =~ ^(nvme[0-9]+n[0-9]+|sd[a-z]+)$ ]]; then
        echo "timestamp=${TIMESTAMP} host=${HOSTNAME} metric_type=disk_io device=${device} reads_completed=${reads_completed} writes_completed=${writes_completed} sectors_read=${sectors_read} sectors_written=${sectors_written}"
    fi
done

#=============================================================================
# Process Metrics
#=============================================================================

# Get process count
PROC_TOTAL=$(ps aux | wc -l)
PROC_RUNNING=$(ps aux | awk '$8 ~ /R/' | wc -l)
PROC_SLEEPING=$(ps aux | awk '$8 ~ /S/' | wc -l)
PROC_ZOMBIE=$(ps aux | awk '$8 ~ /Z/' | wc -l)

echo "timestamp=${TIMESTAMP} host=${HOSTNAME} metric_type=processes total=${PROC_TOTAL} running=${PROC_RUNNING} sleeping=${PROC_SLEEPING} zombie=${PROC_ZOMBIE}"

#=============================================================================
# System Uptime
#=============================================================================

UPTIME_SECONDS=$(cat /proc/uptime | awk '{print int($1)}')
UPTIME_DAYS=$((UPTIME_SECONDS / 86400))
UPTIME_HOURS=$(((UPTIME_SECONDS % 86400) / 3600))

echo "timestamp=${TIMESTAMP} host=${HOSTNAME} metric_type=uptime uptime_seconds=${UPTIME_SECONDS} uptime_days=${UPTIME_DAYS} uptime_hours=${UPTIME_HOURS}"

#=============================================================================
# Temperature Sensors (if available)
#=============================================================================

if command -v sensors &> /dev/null; then
    CPU_TEMP=$(sensors 2>/dev/null | grep -i "core 0" | head -1 | awk '{print $3}' | tr -d '+°C')
    if [ -n "$CPU_TEMP" ]; then
        echo "timestamp=${TIMESTAMP} host=${HOSTNAME} metric_type=temperature cpu_temp_celsius=${CPU_TEMP}"
    fi
fi
