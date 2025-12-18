#!/bin/bash
##############################################################################
# DCGM Metrics Collection Script for Splunk
# Collects GPU metrics using dcgmi and outputs in key=value format
##############################################################################

# Get current timestamp
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%S")
HOSTNAME=$(hostname)

# Check if dcgmi is available
if ! command -v dcgmi &> /dev/null; then
    echo "timestamp=${TIMESTAMP} host=${HOSTNAME} error=\"dcgmi not found\""
    exit 1
fi

# Get GPU count
GPU_COUNT=$(nvidia-smi --query-gpu=count --format=csv,noheader,nounits 2>/dev/null | head -1)

if [ -z "$GPU_COUNT" ] || [ "$GPU_COUNT" -eq 0 ]; then
    echo "timestamp=${TIMESTAMP} host=${HOSTNAME} error=\"No GPUs detected\""
    exit 1
fi

# Collect metrics for each GPU
for ((gpu=0; gpu<GPU_COUNT; gpu++)); do
    # Get DCGM metrics
    DCGM_OUTPUT=$(dcgmi dmon -e 155,150,203,204,252,1001,1002,1003,1004,1005 -c 1 -d 1 2>/dev/null | tail -1)
    
    if [ -n "$DCGM_OUTPUT" ]; then
        # Parse DCGM output (fields: GPU, SM_CLOCK, MEM_CLOCK, TEMP, POWER, GPU_UTIL, MEM_UTIL, ENC_UTIL, DEC_UTIL, FB_USED, FB_FREE)
        read -r GPU_ID SM_CLOCK MEM_CLOCK TEMP POWER GPU_UTIL MEM_UTIL ENC_UTIL DEC_UTIL FB_USED FB_FREE <<< "$DCGM_OUTPUT"
        
        echo "timestamp=${TIMESTAMP} host=${HOSTNAME} gpu=${gpu} utilization=${GPU_UTIL:-0} temperature=${TEMP:-0} power_usage=${POWER:-0} fb_memory_used=${FB_USED:-0} fb_memory_free=${FB_FREE:-0} sm_clock=${SM_CLOCK:-0} mem_clock=${MEM_CLOCK:-0} memory_util=${MEM_UTIL:-0} encoder_util=${ENC_UTIL:-0} decoder_util=${DEC_UTIL:-0}"
    else
        # Fallback to nvidia-smi if dcgmi fails
        SMI_OUTPUT=$(nvidia-smi --query-gpu=index,utilization.gpu,temperature.gpu,power.draw,memory.used,memory.free,clocks.sm,clocks.mem --format=csv,noheader,nounits -i $gpu 2>/dev/null)
        
        if [ -n "$SMI_OUTPUT" ]; then
            IFS=',' read -r GPU_ID GPU_UTIL TEMP POWER MEM_USED MEM_FREE SM_CLOCK MEM_CLOCK <<< "$SMI_OUTPUT"
            echo "timestamp=${TIMESTAMP} host=${HOSTNAME} gpu=${gpu} utilization=${GPU_UTIL// /} temperature=${TEMP// /} power_usage=${POWER// /} fb_memory_used=${MEM_USED// /} fb_memory_free=${MEM_FREE// /} sm_clock=${SM_CLOCK// /} mem_clock=${MEM_CLOCK// /}"
        fi
    fi
done

# Collect NVLink metrics if available
NVLINK_OUTPUT=$(nvidia-smi nvlink --status 2>/dev/null)
if [ -n "$NVLINK_OUTPUT" ]; then
    # Parse NVLink status
    while IFS= read -r line; do
        if [[ $line =~ GPU[[:space:]]+([0-9]+).*Link[[:space:]]+([0-9]+).*([0-9]+)[[:space:]]*GB/s ]]; then
            GPU_ID="${BASH_REMATCH[1]}"
            LINK_ID="${BASH_REMATCH[2]}"
            BANDWIDTH="${BASH_REMATCH[3]}"
            echo "timestamp=${TIMESTAMP} host=${HOSTNAME} metric_type=nvlink gpu=${GPU_ID} link=${LINK_ID} bandwidth_gbps=${BANDWIDTH}"
        fi
    done <<< "$NVLINK_OUTPUT"
fi

# Collect XID errors from dmesg
XID_ERRORS=$(dmesg 2>/dev/null | grep -i "NVRM.*Xid" | tail -5)
if [ -n "$XID_ERRORS" ]; then
    while IFS= read -r line; do
        if [[ $line =~ Xid.*:\ ([0-9]+), ]]; then
            XID_CODE="${BASH_REMATCH[1]}"
            echo "timestamp=${TIMESTAMP} host=${HOSTNAME} metric_type=xid_error xid_code=${XID_CODE} message=\"${line}\""
        fi
    done <<< "$XID_ERRORS"
fi
