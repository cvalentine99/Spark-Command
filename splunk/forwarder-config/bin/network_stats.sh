#!/bin/bash
##############################################################################
# Network Statistics Collection Script for Splunk
# Collects network interface metrics and connection stats
##############################################################################

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%S")
HOSTNAME=$(hostname)

#=============================================================================
# Network Interface Statistics
#=============================================================================

# Read network interface stats from /proc/net/dev
cat /proc/net/dev | tail -n +3 | while read -r line; do
    # Parse interface stats
    interface=$(echo "$line" | awk -F: '{print $1}' | tr -d ' ')
    stats=$(echo "$line" | awk -F: '{print $2}')
    
    read -r rx_bytes rx_packets rx_errs rx_drop rx_fifo rx_frame rx_compressed rx_multicast tx_bytes tx_packets tx_errs tx_drop tx_fifo tx_colls tx_carrier tx_compressed <<< "$stats"
    
    # Skip loopback and virtual interfaces unless they have traffic
    if [[ "$interface" == "lo" ]] || [[ "$interface" =~ ^(veth|docker|br-) ]]; then
        if [ "$rx_bytes" -eq 0 ] && [ "$tx_bytes" -eq 0 ]; then
            continue
        fi
    fi
    
    # Convert bytes to MB
    rx_mb=$(echo "scale=2; $rx_bytes / 1048576" | bc)
    tx_mb=$(echo "scale=2; $tx_bytes / 1048576" | bc)
    
    echo "timestamp=${TIMESTAMP} host=${HOSTNAME} metric_type=network_interface interface=${interface} rx_bytes=${rx_bytes} rx_mb=${rx_mb} rx_packets=${rx_packets} rx_errors=${rx_errs} rx_dropped=${rx_drop} tx_bytes=${tx_bytes} tx_mb=${tx_mb} tx_packets=${tx_packets} tx_errors=${tx_errs} tx_dropped=${tx_drop}"
done

#=============================================================================
# TCP Connection Statistics
#=============================================================================

# Get TCP connection states
TCP_ESTABLISHED=$(ss -t state established 2>/dev/null | wc -l)
TCP_TIME_WAIT=$(ss -t state time-wait 2>/dev/null | wc -l)
TCP_CLOSE_WAIT=$(ss -t state close-wait 2>/dev/null | wc -l)
TCP_LISTEN=$(ss -t state listening 2>/dev/null | wc -l)

echo "timestamp=${TIMESTAMP} host=${HOSTNAME} metric_type=tcp_connections established=$((TCP_ESTABLISHED - 1)) time_wait=${TCP_TIME_WAIT} close_wait=${TCP_CLOSE_WAIT} listening=$((TCP_LISTEN - 1))"

#=============================================================================
# Network Latency to Key Endpoints
#=============================================================================

# Ping test to the other DGX Spark node (update IP as needed)
PEER_IP="${DGX_PEER_IP:-192.168.100.11}"
if ping -c 1 -W 1 "$PEER_IP" &> /dev/null; then
    LATENCY=$(ping -c 3 -W 2 "$PEER_IP" 2>/dev/null | tail -1 | awk -F'/' '{print $5}')
    if [ -n "$LATENCY" ]; then
        echo "timestamp=${TIMESTAMP} host=${HOSTNAME} metric_type=network_latency target=${PEER_IP} latency_ms=${LATENCY} status=reachable"
    fi
else
    echo "timestamp=${TIMESTAMP} host=${HOSTNAME} metric_type=network_latency target=${PEER_IP} latency_ms=-1 status=unreachable"
fi

#=============================================================================
# InfiniBand/RDMA Statistics (if available)
#=============================================================================

if [ -d /sys/class/infiniband ]; then
    for hca in /sys/class/infiniband/*; do
        HCA_NAME=$(basename "$hca")
        for port in "$hca"/ports/*; do
            PORT_NUM=$(basename "$port")
            
            # Read port state
            STATE=$(cat "$port/state" 2>/dev/null | awk '{print $2}')
            RATE=$(cat "$port/rate" 2>/dev/null)
            
            # Read counters if available
            if [ -d "$port/counters" ]; then
                RX_BYTES=$(cat "$port/counters/port_rcv_data" 2>/dev/null || echo 0)
                TX_BYTES=$(cat "$port/counters/port_xmit_data" 2>/dev/null || echo 0)
                RX_PACKETS=$(cat "$port/counters/port_rcv_packets" 2>/dev/null || echo 0)
                TX_PACKETS=$(cat "$port/counters/port_xmit_packets" 2>/dev/null || echo 0)
                
                echo "timestamp=${TIMESTAMP} host=${HOSTNAME} metric_type=infiniband hca=${HCA_NAME} port=${PORT_NUM} state=${STATE} rate=\"${RATE}\" rx_bytes=${RX_BYTES} tx_bytes=${TX_BYTES} rx_packets=${RX_PACKETS} tx_packets=${TX_PACKETS}"
            fi
        done
    done
fi

#=============================================================================
# NVLink Bandwidth (for multi-GPU communication)
#=============================================================================

if command -v nvidia-smi &> /dev/null; then
    # Check NVLink status
    NVLINK_STATUS=$(nvidia-smi nvlink --status 2>/dev/null)
    if [ -n "$NVLINK_STATUS" ]; then
        echo "$NVLINK_STATUS" | grep -E "Link [0-9]+" | while read -r line; do
            if [[ $line =~ GPU\ ([0-9]+).*Link\ ([0-9]+):\ ([A-Za-z]+) ]]; then
                GPU_ID="${BASH_REMATCH[1]}"
                LINK_ID="${BASH_REMATCH[2]}"
                LINK_STATE="${BASH_REMATCH[3]}"
                echo "timestamp=${TIMESTAMP} host=${HOSTNAME} metric_type=nvlink gpu=${GPU_ID} link=${LINK_ID} state=${LINK_STATE}"
            fi
        done
    fi
fi
