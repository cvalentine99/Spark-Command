# DGX Spark Networking Troubleshooting Guide

## Quick Diagnostic Commands

```bash
# Network interface status
ip addr show
ip link show

# Connectivity test
ping -c 3 dgx-spark-02

# Port status
ss -tlnp
netstat -rn

# DNS resolution
nslookup dgx-spark-02
```

---

## Issue: Nodes Cannot Communicate

### Symptoms
- Ping between nodes fails
- SSH connection refused
- Spark workers cannot register with master

### Diagnostic Steps

1. **Check physical connectivity**:
```bash
# Verify link status
ip link show eth0
ethtool eth0 | grep "Link detected"
```

2. **Verify IP configuration**:
```bash
ip addr show eth0
ip route show
```

3. **Test basic connectivity**:
```bash
ping -c 5 192.168.100.11
traceroute 192.168.100.11
```

4. **Check firewall**:
```bash
sudo ufw status verbose
sudo iptables -L -n -v
```

### Solutions

**Solution 1: Fix IP Configuration**
```bash
# Set static IP
sudo nmcli connection modify eth0 \
  ipv4.addresses 192.168.100.10/24 \
  ipv4.gateway 192.168.100.1 \
  ipv4.method manual

sudo nmcli connection up eth0
```

**Solution 2: Disable Firewall Temporarily**
```bash
sudo ufw disable
# Test connectivity
ping dgx-spark-02
# Re-enable with proper rules
sudo ufw enable
sudo ufw allow from 192.168.100.0/24
```

**Solution 3: Reset Network Manager**
```bash
sudo systemctl restart NetworkManager
sudo nmcli networking off
sudo nmcli networking on
```

---

## Issue: USB4/Thunderbolt Interconnect Not Working

### Symptoms
- No thunderbolt0 interface visible
- Low bandwidth between nodes
- Cluster operations fail

### Diagnostic Steps

1. **Check Thunderbolt status**:
```bash
# List Thunderbolt devices
boltctl list
thunderbolt-tool list

# Check kernel module
lsmod | grep thunderbolt
```

2. **Verify USB4 connection**:
```bash
lsusb -t
dmesg | grep -i thunderbolt
```

3. **Check interface**:
```bash
ip link show | grep thunder
```

### Solutions

**Solution 1: Authorize Thunderbolt Device**
```bash
# List unauthorized devices
boltctl list

# Authorize device
boltctl authorize <device-uuid>

# Or authorize all
boltctl enroll --policy auto <device-uuid>
```

**Solution 2: Load Thunderbolt Modules**
```bash
sudo modprobe thunderbolt
sudo modprobe thunderbolt-net
```

**Solution 3: Create Network Interface**
```bash
# If interface exists but not configured
sudo ip link set thunderbolt0 up
sudo ip addr add 10.0.0.1/24 dev thunderbolt0
```

**Solution 4: Check Cable**
- Ensure using certified USB4 40Gbps active cable
- Maximum cable length: 2 meters
- Try different USB4 port

---

## Issue: Slow Network Performance

### Symptoms
- File transfers slower than expected
- High latency between nodes
- Network bottleneck during distributed training

### Diagnostic Steps

1. **Bandwidth test**:
```bash
# On server
iperf3 -s

# On client
iperf3 -c dgx-spark-02 -t 30 -P 4
```

2. **Check for errors**:
```bash
ip -s link show eth0
ethtool -S eth0 | grep -i error
```

3. **Monitor network usage**:
```bash
iftop -i eth0
nethogs eth0
```

### Solutions

**Solution 1: Enable Jumbo Frames**
```bash
# Set MTU to 9000
sudo ip link set eth0 mtu 9000

# Make permanent
sudo nmcli connection modify eth0 802-3-ethernet.mtu 9000
```

**Solution 2: Tune Network Stack**
```bash
# Add to /etc/sysctl.conf
net.core.rmem_max=134217728
net.core.wmem_max=134217728
net.ipv4.tcp_rmem=4096 87380 134217728
net.ipv4.tcp_wmem=4096 65536 134217728
net.core.netdev_max_backlog=250000

# Apply
sudo sysctl -p
```

**Solution 3: Disable TCP Offloading (if causing issues)**
```bash
sudo ethtool -K eth0 tso off gso off gro off
```

**Solution 4: Check for Duplex Mismatch**
```bash
ethtool eth0 | grep -i duplex
# Should show "Full"
```

---

## Issue: DNS Resolution Failure

### Symptoms
- Cannot resolve hostnames
- Error: "Name or service not known"
- Works with IP but not hostname

### Diagnostic Steps

1. **Test DNS resolution**:
```bash
nslookup dgx-spark-02
dig dgx-spark-02
host dgx-spark-02
```

2. **Check DNS configuration**:
```bash
cat /etc/resolv.conf
systemd-resolve --status
```

3. **Verify /etc/hosts**:
```bash
cat /etc/hosts
getent hosts dgx-spark-02
```

### Solutions

**Solution 1: Update /etc/hosts**
```bash
sudo tee -a /etc/hosts << EOF
192.168.100.10  dgx-spark-01 master
192.168.100.11  dgx-spark-02 worker
10.0.0.1        dgx-spark-01-tb
10.0.0.2        dgx-spark-02-tb
EOF
```

**Solution 2: Configure DNS Servers**
```bash
sudo nmcli connection modify eth0 ipv4.dns "8.8.8.8 8.8.4.4"
sudo nmcli connection up eth0
```

**Solution 3: Fix systemd-resolved**
```bash
sudo systemctl restart systemd-resolved
sudo ln -sf /run/systemd/resolve/resolv.conf /etc/resolv.conf
```

---

## Issue: NFS Mount Failure

### Symptoms
- Cannot mount shared storage
- Error: "mount.nfs: Connection timed out"
- Stale NFS handle errors

### Diagnostic Steps

1. **Check NFS server status**:
```bash
# On server
systemctl status nfs-kernel-server
showmount -e localhost
```

2. **Test NFS connectivity**:
```bash
# On client
showmount -e dgx-spark-01
rpcinfo -p dgx-spark-01
```

3. **Check firewall for NFS ports**:
```bash
sudo ufw status | grep -E "111|2049|20048"
```

### Solutions

**Solution 1: Start NFS Services**
```bash
# On server
sudo systemctl start nfs-kernel-server
sudo exportfs -ra
```

**Solution 2: Open NFS Ports**
```bash
sudo ufw allow from 192.168.100.0/24 to any port 111
sudo ufw allow from 192.168.100.0/24 to any port 2049
sudo ufw allow from 192.168.100.0/24 to any port 20048
```

**Solution 3: Fix Stale Mount**
```bash
# Force unmount
sudo umount -f /shared
# Or lazy unmount
sudo umount -l /shared
# Remount
sudo mount dgx-spark-01:/shared /shared
```

**Solution 4: Check Export Configuration**
```bash
# On server, verify /etc/exports
cat /etc/exports
# Should contain:
# /shared 192.168.100.0/24(rw,sync,no_subtree_check,no_root_squash)

# Re-export
sudo exportfs -ra
```

---

## Issue: SSH Connection Problems

### Symptoms
- SSH connection refused
- SSH hangs during connection
- Permission denied errors

### Diagnostic Steps

1. **Test SSH verbosely**:
```bash
ssh -vvv dgx-spark-02
```

2. **Check SSH service**:
```bash
systemctl status sshd
```

3. **Verify SSH keys**:
```bash
ls -la ~/.ssh/
ssh-add -l
```

### Solutions

**Solution 1: Restart SSH Service**
```bash
sudo systemctl restart sshd
```

**Solution 2: Fix SSH Key Permissions**
```bash
chmod 700 ~/.ssh
chmod 600 ~/.ssh/id_ed25519
chmod 644 ~/.ssh/id_ed25519.pub
chmod 600 ~/.ssh/authorized_keys
```

**Solution 3: Regenerate Host Keys**
```bash
sudo rm /etc/ssh/ssh_host_*
sudo dpkg-reconfigure openssh-server
```

**Solution 4: Clear Known Hosts**
```bash
ssh-keygen -R dgx-spark-02
```

---

## Issue: Port Already in Use

### Symptoms
- Error: "Address already in use"
- Service fails to start
- Cannot bind to port

### Diagnostic Steps

1. **Find process using port**:
```bash
sudo lsof -i :8080
sudo ss -tlnp | grep 8080
sudo fuser 8080/tcp
```

### Solutions

**Solution 1: Kill Process Using Port**
```bash
sudo fuser -k 8080/tcp
```

**Solution 2: Find and Stop Service**
```bash
# Identify service
sudo lsof -i :8080
# Stop it
sudo systemctl stop <service-name>
```

**Solution 3: Change Application Port**
```bash
# Configure application to use different port
export SPARK_MASTER_WEBUI_PORT=8090
```

---

## Network Diagnostic Tools

### Comprehensive Network Check Script

```bash
#!/bin/bash
echo "=== Network Diagnostic Report ==="
echo ""
echo "=== Interface Status ==="
ip addr show
echo ""
echo "=== Routing Table ==="
ip route show
echo ""
echo "=== DNS Configuration ==="
cat /etc/resolv.conf
echo ""
echo "=== Connectivity Tests ==="
ping -c 3 dgx-spark-02 2>&1
echo ""
echo "=== Open Ports ==="
ss -tlnp
echo ""
echo "=== Firewall Status ==="
sudo ufw status verbose
echo ""
echo "=== Network Statistics ==="
ip -s link show eth0
```

### Continuous Monitoring

```bash
# Monitor all network traffic
sudo tcpdump -i any -n

# Monitor specific host
sudo tcpdump -i eth0 host 192.168.100.11

# Monitor specific port
sudo tcpdump -i eth0 port 7077
```
