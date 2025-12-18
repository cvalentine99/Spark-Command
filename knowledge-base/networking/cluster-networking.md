# DGX Spark Cluster Networking Guide

## Network Architecture Overview

A two-node DGX Spark cluster uses a combination of high-speed node-to-node interconnect and standard Ethernet for external connectivity.

### Network Topology

```
                    ┌─────────────────────────────────────┐
                    │         External Network            │
                    │         (10GbE Switch)              │
                    └──────────────┬──────────────────────┘
                                   │
              ┌────────────────────┴────────────────────┐
              │                                         │
    ┌─────────┴─────────┐                   ┌──────────┴────────┐
    │   DGX-SPARK-01    │                   │   DGX-SPARK-02    │
    │     (Master)      │                   │     (Worker)      │
    │  192.168.100.10   │                   │  192.168.100.11   │
    └─────────┬─────────┘                   └──────────┬────────┘
              │                                         │
              │         USB4/Thunderbolt                │
              │         80 Gbps Link                    │
              └─────────────────────────────────────────┘
```

## Node-to-Node Interconnect

### USB4/Thunderbolt Connection

The primary cluster interconnect uses USB4/Thunderbolt for high-bandwidth, low-latency communication.

| Specification | Value |
|---------------|-------|
| Protocol | USB4 / Thunderbolt 4 |
| Bandwidth | 80 Gbps (bidirectional) |
| Effective Throughput | ~9.5 GB/s |
| Latency | < 2 μs |
| Cable Type | USB4 40Gbps Active Cable |
| Max Cable Length | 2 meters (active) |

### Connection Setup

1. **Physical Connection**: Connect the USB4 ports on both nodes using a certified USB4 active cable.

2. **Verify Connection**:
```bash
# On both nodes
lsusb -t
thunderbolt-tool list
```

3. **Configure Network Interface**:
```bash
# Create thunderbolt network interface
sudo nmcli connection add type ethernet \
  con-name tb-cluster \
  ifname thunderbolt0 \
  ip4 10.0.0.1/24  # Use 10.0.0.2/24 on second node
```

### Performance Tuning

```bash
# Increase MTU for better throughput
sudo ip link set thunderbolt0 mtu 9000

# Enable jumbo frames permanently
echo 'MTU=9000' | sudo tee -a /etc/sysconfig/network-scripts/ifcfg-thunderbolt0
```

## External Network Configuration

### 10 Gigabit Ethernet

Each DGX Spark has a 10GbE port for external connectivity.

| Specification | Value |
|---------------|-------|
| Interface | RJ45 |
| Speed | 10 Gbps |
| Standards | 10GBASE-T |
| Cable | Cat6a or better |

### Static IP Configuration

```bash
# Configure static IP on eth0
sudo nmcli connection modify eth0 \
  ipv4.addresses 192.168.100.10/24 \
  ipv4.gateway 192.168.100.1 \
  ipv4.dns "8.8.8.8,8.8.4.4" \
  ipv4.method manual

# Apply changes
sudo nmcli connection up eth0
```

### Network Bonding (Optional)

For redundancy, bond multiple interfaces:

```bash
# Create bond interface
sudo nmcli connection add type bond \
  con-name bond0 \
  ifname bond0 \
  bond.options "mode=802.3ad,miimon=100"

# Add slave interfaces
sudo nmcli connection add type ethernet \
  slave-type bond \
  con-name bond0-eth0 \
  ifname eth0 \
  master bond0
```

## Firewall Configuration

### Required Ports

| Port | Protocol | Service | Direction |
|------|----------|---------|-----------|
| 22 | TCP | SSH | Inbound |
| 8888 | TCP | Jupyter | Inbound |
| 8080 | TCP | Spark UI | Inbound |
| 7077 | TCP | Spark Master | Internal |
| 6066 | TCP | Spark REST | Internal |
| 8081 | TCP | Spark Worker UI | Inbound |
| 9100 | TCP | Node Exporter | Internal |
| 9400 | TCP | DCGM Exporter | Internal |
| 5555 | TCP | DCGM | Internal |
| 8000-8002 | TCP | Triton | Inbound |
| 9997 | TCP | Splunk Forwarder | Outbound |

### UFW Configuration

```bash
# Enable UFW
sudo ufw enable

# Allow SSH
sudo ufw allow 22/tcp

# Allow Spark ports
sudo ufw allow 7077/tcp
sudo ufw allow 8080/tcp
sudo ufw allow 8081/tcp

# Allow monitoring
sudo ufw allow from 192.168.100.0/24 to any port 9100
sudo ufw allow from 192.168.100.0/24 to any port 9400

# Allow cluster traffic
sudo ufw allow from 10.0.0.0/24
```

## DNS and Hostname Configuration

### Set Hostnames

```bash
# On master node
sudo hostnamectl set-hostname dgx-spark-01

# On worker node
sudo hostnamectl set-hostname dgx-spark-02
```

### Configure /etc/hosts

Add to `/etc/hosts` on both nodes:

```
# DGX Spark Cluster
192.168.100.10  dgx-spark-01  master
192.168.100.11  dgx-spark-02  worker

# Cluster interconnect
10.0.0.1  dgx-spark-01-tb
10.0.0.2  dgx-spark-02-tb
```

## SSH Configuration

### Passwordless SSH

```bash
# On master node, generate key
ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519 -N ""

# Copy to worker
ssh-copy-id dgx-spark-02

# Test connection
ssh dgx-spark-02 hostname
```

### SSH Config

Create `~/.ssh/config`:

```
Host dgx-spark-01
    HostName 192.168.100.10
    User ubuntu
    IdentityFile ~/.ssh/id_ed25519

Host dgx-spark-02
    HostName 192.168.100.11
    User ubuntu
    IdentityFile ~/.ssh/id_ed25519

Host *
    ServerAliveInterval 60
    ServerAliveCountMax 3
```

## Network Performance Testing

### iperf3 Bandwidth Test

```bash
# On server (dgx-spark-02)
iperf3 -s

# On client (dgx-spark-01)
iperf3 -c dgx-spark-02-tb -t 30 -P 4
```

Expected results for USB4 interconnect: ~9.5 GB/s

### Latency Test

```bash
# Ping test
ping -c 100 dgx-spark-02-tb

# Expected: < 0.1ms average
```

## NFS Shared Storage

### Configure NFS Server (Master)

```bash
# Install NFS server
sudo apt install nfs-kernel-server

# Create shared directory
sudo mkdir -p /shared/data
sudo chown -R ubuntu:ubuntu /shared

# Export directory
echo "/shared 10.0.0.0/24(rw,sync,no_subtree_check)" | sudo tee -a /etc/exports
sudo exportfs -a
sudo systemctl restart nfs-kernel-server
```

### Configure NFS Client (Worker)

```bash
# Install NFS client
sudo apt install nfs-common

# Mount shared directory
sudo mkdir -p /shared
sudo mount dgx-spark-01-tb:/shared /shared

# Add to fstab for persistence
echo "dgx-spark-01-tb:/shared /shared nfs defaults 0 0" | sudo tee -a /etc/fstab
```

## Troubleshooting Network Issues

### Check Interface Status

```bash
# View all interfaces
ip addr show

# Check link status
ethtool eth0
ethtool thunderbolt0
```

### Diagnose Connectivity

```bash
# Test basic connectivity
ping -c 3 dgx-spark-02

# Trace route
traceroute dgx-spark-02

# Check open ports
ss -tlnp
```

### Monitor Network Traffic

```bash
# Real-time bandwidth
iftop -i thunderbolt0

# Network statistics
netstat -s

# Connection tracking
conntrack -L
```
