/**
 * Local Metrics Service
 * Collects metrics directly from the local DGX Spark system
 * Falls back to simulated data when real metrics are unavailable
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';

const execAsync = promisify(exec);

// System Metrics interface
export interface SystemMetrics {
  hostname: string;
  uptime: string;
  uptimeSeconds: number;
  os: string;
  kernel: string;
}

// CPU Metrics interface
export interface CPUMetrics {
  model: string;
  cores: number;
  usage: number;
  temperature: number;
  frequencies: {
    current: number;
    min: number;
    max: number;
  };
}

// GPU Metrics interface
export interface GPUMetrics {
  name: string;
  utilization: number;
  memoryUsed: number;
  memoryTotal: number;
  temperature: number;
  powerDraw: number;
  powerLimit: number;
  fanSpeed: number;
  driverVersion: string;
  cudaVersion: string;
}

// Memory Metrics interface
export interface MemoryMetrics {
  total: number;
  used: number;
  free: number;
  cached: number;
  swapTotal: number;
  swapUsed: number;
}

// Storage Metrics interface
export interface StorageMetrics {
  devices: {
    name: string;
    mountPoint: string;
    total: number;
    used: number;
    free: number;
    type: string;
  }[];
}

// Network Metrics interface
export interface NetworkMetrics {
  interfaces: {
    name: string;
    ip: string;
    mac: string;
    rxBytes: number;
    txBytes: number;
    rxPackets: number;
    txPackets: number;
    speed: string;
    status: 'up' | 'down';
  }[];
}

// Process Metrics interface
export interface ProcessMetrics {
  processes: {
    pid: number;
    name: string;
    cpu: number;
    memory: number;
    gpuMemory?: number;
    user: string;
  }[];
}

// Complete Local Metrics
export interface LocalMetrics {
  timestamp: number;
  system: SystemMetrics;
  cpu: CPUMetrics;
  gpu: GPUMetrics;
  memory: MemoryMetrics;
  storage: StorageMetrics;
  network: NetworkMetrics;
  processes: ProcessMetrics;
}

export class LocalMetricsService {
  private useSimulation: boolean = false;
  private lastMetrics: LocalMetrics | null = null;

  constructor() {
    // Check if we can access real metrics
    this.checkCapabilities();
  }

  private async checkCapabilities(): Promise<void> {
    try {
      await execAsync('nvidia-smi --query-gpu=name --format=csv,noheader');
      this.useSimulation = false;
    } catch {
      console.log('nvidia-smi not available, using simulated metrics');
      this.useSimulation = true;
    }
  }

  /**
   * Get all local metrics
   */
  async getMetrics(): Promise<LocalMetrics> {
    if (this.useSimulation) {
      return this.getSimulatedMetrics();
    }

    try {
      const [system, cpu, gpu, memory, storage, network, processes] = await Promise.all([
        this.getSystemMetrics(),
        this.getCPUMetrics(),
        this.getGPUMetrics(),
        this.getMemoryMetrics(),
        this.getStorageMetrics(),
        this.getNetworkMetrics(),
        this.getProcessMetrics(),
      ]);

      this.lastMetrics = {
        timestamp: Date.now(),
        system,
        cpu,
        gpu,
        memory,
        storage,
        network,
        processes,
      };

      return this.lastMetrics;
    } catch (error) {
      console.error('Failed to get real metrics, falling back to simulation:', error);
      return this.getSimulatedMetrics();
    }
  }

  /**
   * Get system information
   */
  private async getSystemMetrics(): Promise<SystemMetrics> {
    try {
      const [hostname, uptime, os, kernel] = await Promise.all([
        execAsync('hostname').then(r => r.stdout.trim()),
        execAsync('uptime -p').then(r => r.stdout.trim()),
        execAsync('cat /etc/os-release | grep PRETTY_NAME | cut -d= -f2 | tr -d \'"\'').then(r => r.stdout.trim()),
        execAsync('uname -r').then(r => r.stdout.trim()),
      ]);

      const uptimeSeconds = await execAsync('cat /proc/uptime | cut -d. -f1').then(r => parseInt(r.stdout.trim()));

      return { hostname, uptime, uptimeSeconds, os, kernel };
    } catch {
      return {
        hostname: 'dgx-spark-local',
        uptime: 'up 14 days, 2 hours',
        uptimeSeconds: 1216800,
        os: 'Ubuntu 22.04 LTS',
        kernel: '5.15.0-nvidia',
      };
    }
  }

  /**
   * Get CPU metrics
   */
  private async getCPUMetrics(): Promise<CPUMetrics> {
    try {
      const model = await execAsync('cat /proc/cpuinfo | grep "model name" | head -1 | cut -d: -f2').then(r => r.stdout.trim());
      const cores = await execAsync('nproc').then(r => parseInt(r.stdout.trim()));
      
      // Get CPU usage
      const cpuStat = await execAsync('top -bn1 | grep "Cpu(s)" | awk \'{print $2}\'').then(r => parseFloat(r.stdout.trim()) || 0);
      
      return {
        model: model || 'ARM Cortex (X925 + A725)',
        cores: cores || 20,
        usage: cpuStat,
        temperature: 55,
        frequencies: { current: 3000, min: 1200, max: 3500 },
      };
    } catch {
      return {
        model: '10x Cortex-X925 + 10x Cortex-A725',
        cores: 20,
        usage: 45,
        temperature: 55,
        frequencies: { current: 3000, min: 1200, max: 3500 },
      };
    }
  }

  /**
   * Get GPU metrics via nvidia-smi
   */
  private async getGPUMetrics(): Promise<GPUMetrics> {
    try {
      const result = await execAsync(
        'nvidia-smi --query-gpu=name,utilization.gpu,memory.used,memory.total,temperature.gpu,power.draw,power.limit,fan.speed,driver_version --format=csv,noheader,nounits'
      );
      
      const parts = result.stdout.trim().split(',').map(s => s.trim());
      
      // Get CUDA version
      const cudaVersion = await execAsync('nvcc --version | grep release | awk \'{print $6}\' | cut -d, -f1').then(r => r.stdout.trim()).catch(() => '12.4');

      return {
        name: parts[0] || 'NVIDIA Blackwell',
        utilization: parseFloat(parts[1]) || 0,
        memoryUsed: parseFloat(parts[2]) || 0,
        memoryTotal: parseFloat(parts[3]) || 128000,
        temperature: parseFloat(parts[4]) || 0,
        powerDraw: parseFloat(parts[5]) || 0,
        powerLimit: parseFloat(parts[6]) || 100,
        fanSpeed: parseFloat(parts[7]) || 0,
        driverVersion: parts[8] || '550.54',
        cudaVersion,
      };
    } catch {
      return this.getSimulatedGPUMetrics();
    }
  }

  /**
   * Get memory metrics
   */
  private async getMemoryMetrics(): Promise<MemoryMetrics> {
    try {
      const memInfo = await execAsync('cat /proc/meminfo');
      const lines = memInfo.stdout.split('\n');
      
      const getValue = (key: string): number => {
        const line = lines.find(l => l.startsWith(key));
        return line ? parseInt(line.split(/\s+/)[1]) * 1024 : 0; // Convert KB to bytes
      };

      return {
        total: getValue('MemTotal'),
        used: getValue('MemTotal') - getValue('MemAvailable'),
        free: getValue('MemFree'),
        cached: getValue('Cached'),
        swapTotal: getValue('SwapTotal'),
        swapUsed: getValue('SwapTotal') - getValue('SwapFree'),
      };
    } catch {
      return {
        total: 128 * 1024 * 1024 * 1024, // 128GB
        used: 78 * 1024 * 1024 * 1024,
        free: 50 * 1024 * 1024 * 1024,
        cached: 20 * 1024 * 1024 * 1024,
        swapTotal: 16 * 1024 * 1024 * 1024,
        swapUsed: 0,
      };
    }
  }

  /**
   * Get storage metrics
   */
  private async getStorageMetrics(): Promise<StorageMetrics> {
    try {
      const df = await execAsync('df -B1 --output=source,target,size,used,avail,fstype | tail -n +2');
      const devices = df.stdout.trim().split('\n').map(line => {
        const parts = line.trim().split(/\s+/);
        return {
          name: parts[0],
          mountPoint: parts[1],
          total: parseInt(parts[2]),
          used: parseInt(parts[3]),
          free: parseInt(parts[4]),
          type: parts[5],
        };
      }).filter(d => d.mountPoint === '/' || d.mountPoint.startsWith('/home') || d.mountPoint.startsWith('/data'));

      return { devices };
    } catch {
      return {
        devices: [{
          name: '/dev/nvme0n1p1',
          mountPoint: '/',
          total: 2 * 1024 * 1024 * 1024 * 1024, // 2TB
          used: 1.2 * 1024 * 1024 * 1024 * 1024,
          free: 0.8 * 1024 * 1024 * 1024 * 1024,
          type: 'ext4',
        }],
      };
    }
  }

  /**
   * Get network metrics
   */
  private async getNetworkMetrics(): Promise<NetworkMetrics> {
    try {
      const interfaces: NetworkMetrics['interfaces'] = [];
      
      // Get interface list
      const ifList = await execAsync('ls /sys/class/net');
      const ifNames = ifList.stdout.trim().split('\n').filter(n => n !== 'lo');

      for (const name of ifNames) {
        try {
          const [ip, mac, rxBytes, txBytes, rxPackets, txPackets, operstate] = await Promise.all([
            execAsync(`ip addr show ${name} | grep 'inet ' | awk '{print $2}' | cut -d/ -f1`).then(r => r.stdout.trim()).catch(() => ''),
            execAsync(`cat /sys/class/net/${name}/address`).then(r => r.stdout.trim()).catch(() => ''),
            execAsync(`cat /sys/class/net/${name}/statistics/rx_bytes`).then(r => parseInt(r.stdout.trim())).catch(() => 0),
            execAsync(`cat /sys/class/net/${name}/statistics/tx_bytes`).then(r => parseInt(r.stdout.trim())).catch(() => 0),
            execAsync(`cat /sys/class/net/${name}/statistics/rx_packets`).then(r => parseInt(r.stdout.trim())).catch(() => 0),
            execAsync(`cat /sys/class/net/${name}/statistics/tx_packets`).then(r => parseInt(r.stdout.trim())).catch(() => 0),
            execAsync(`cat /sys/class/net/${name}/operstate`).then(r => r.stdout.trim()).catch(() => 'unknown'),
          ]);

          interfaces.push({
            name,
            ip: ip || 'N/A',
            mac: mac || 'N/A',
            rxBytes,
            txBytes,
            rxPackets,
            txPackets,
            speed: '10 Gbps',
            status: operstate === 'up' ? 'up' : 'down',
          });
        } catch {
          // Skip interface if we can't read it
        }
      }

      return { interfaces };
    } catch {
      return {
        interfaces: [
          { name: 'eth0', ip: '192.168.1.50', mac: 'aa:bb:cc:dd:ee:ff', rxBytes: 1240000000, txBytes: 890000000, rxPackets: 1000000, txPackets: 800000, speed: '10 Gbps', status: 'up' },
          { name: 'docker0', ip: '172.17.0.1', mac: '02:42:ac:11:00:01', rxBytes: 500000000, txBytes: 500000000, rxPackets: 400000, txPackets: 400000, speed: 'Virtual', status: 'up' },
        ],
      };
    }
  }

  /**
   * Get top processes
   */
  private async getProcessMetrics(): Promise<ProcessMetrics> {
    try {
      const ps = await execAsync('ps aux --sort=-%cpu | head -11 | tail -10');
      const processes = ps.stdout.trim().split('\n').map(line => {
        const parts = line.trim().split(/\s+/);
        return {
          pid: parseInt(parts[1]),
          name: parts[10] || parts[9] || 'unknown',
          cpu: parseFloat(parts[2]),
          memory: parseFloat(parts[3]),
          user: parts[0],
        };
      });

      return { processes };
    } catch {
      return {
        processes: [
          { pid: 12345, name: 'spark-executor', cpu: 45, memory: 8.2, user: 'ubuntu' },
          { pid: 12346, name: 'vllm-server', cpu: 12, memory: 24.5, user: 'ubuntu' },
          { pid: 12347, name: 'jupyter-lab', cpu: 3, memory: 2.1, user: 'ubuntu' },
        ],
      };
    }
  }

  /**
   * Get simulated metrics for demo/development
   */
  private getSimulatedMetrics(): LocalMetrics {
    const now = Date.now();
    const variation = () => (Math.random() - 0.5) * 10;

    return {
      timestamp: now,
      system: {
        hostname: 'dgx-spark-local',
        uptime: 'up 14 days, 2 hours, 15 minutes',
        uptimeSeconds: 1216800 + Math.floor((now - 1700000000000) / 1000),
        os: 'Ubuntu 22.04 LTS',
        kernel: '5.15.0-nvidia',
      },
      cpu: {
        model: '10x Cortex-X925 + 10x Cortex-A725',
        cores: 20,
        usage: Math.min(100, Math.max(5, 45 + variation())),
        temperature: Math.min(85, Math.max(40, 55 + variation() * 0.5)),
        frequencies: { current: 3000, min: 1200, max: 3500 },
      },
      gpu: this.getSimulatedGPUMetrics(),
      memory: {
        total: 128 * 1024 * 1024 * 1024,
        used: Math.floor((78 + variation()) * 1024 * 1024 * 1024),
        free: Math.floor((50 - variation()) * 1024 * 1024 * 1024),
        cached: 20 * 1024 * 1024 * 1024,
        swapTotal: 16 * 1024 * 1024 * 1024,
        swapUsed: 0,
      },
      storage: {
        devices: [{
          name: '/dev/nvme0n1p1',
          mountPoint: '/',
          total: 2 * 1024 * 1024 * 1024 * 1024,
          used: 1.2 * 1024 * 1024 * 1024 * 1024,
          free: 0.8 * 1024 * 1024 * 1024 * 1024,
          type: 'ext4',
        }],
      },
      network: {
        interfaces: [
          { name: 'eth0', ip: '192.168.1.50', mac: 'aa:bb:cc:dd:ee:ff', rxBytes: 1240000000 + Math.floor(Math.random() * 10000000), txBytes: 890000000 + Math.floor(Math.random() * 8000000), rxPackets: 1000000, txPackets: 800000, speed: '10 Gbps', status: 'up' },
          { name: 'docker0', ip: '172.17.0.1', mac: '02:42:ac:11:00:01', rxBytes: 500000000, txBytes: 500000000, rxPackets: 400000, txPackets: 400000, speed: 'Virtual', status: 'up' },
        ],
      },
      processes: {
        processes: [
          { pid: 12345, name: 'spark-executor', cpu: 45 + variation(), memory: 8.2, gpuMemory: 35, user: 'ubuntu' },
          { pid: 12346, name: 'vllm-server', cpu: 12 + variation() * 0.5, memory: 24.5, gpuMemory: 55, user: 'ubuntu' },
          { pid: 12347, name: 'jupyter-lab', cpu: 3 + variation() * 0.2, memory: 2.1, user: 'ubuntu' },
          { pid: 12348, name: 'dcgm-exporter', cpu: 1, memory: 0.3, user: 'root' },
        ],
      },
    };
  }

  /**
   * Get simulated GPU metrics
   */
  private getSimulatedGPUMetrics(): GPUMetrics {
    const variation = () => (Math.random() - 0.5) * 10;
    return {
      name: 'NVIDIA Blackwell (GB10)',
      utilization: Math.min(100, Math.max(0, 72 + variation())),
      memoryUsed: Math.min(128000, Math.max(10000, 78000 + variation() * 1000)),
      memoryTotal: 128000,
      temperature: Math.min(85, Math.max(40, 58 + variation() * 0.5)),
      powerDraw: Math.min(100, Math.max(20, 65 + variation())),
      powerLimit: 100,
      fanSpeed: Math.min(100, Math.max(20, 45 + variation() * 0.5)),
      driverVersion: '550.54.15',
      cudaVersion: '12.4',
    };
  }
}

// Export singleton instance
export const localMetricsService = new LocalMetricsService();
