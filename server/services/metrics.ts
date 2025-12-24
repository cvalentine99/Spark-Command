/**
 * Unified Metrics Service
 * Consolidates local system metrics collection with optional Prometheus integration
 * Provides a single interface for all DGX Spark metrics
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import type {
  GPUMetrics,
  CPUMetrics,
  MemoryMetrics,
  StorageMetrics,
  NetworkMetrics,
  NetworkInterface,
  StorageDevice,
  SystemInfo,
  ProcessInfo,
  NodeOverview,
  PowerState,
  ThermalProfile,
} from '@shared/dgx-types';

const execAsync = promisify(exec);

// ============================================================================
// Service Configuration
// ============================================================================

interface MetricsServiceConfig {
  useSimulation?: boolean;
  prometheusUrl?: string;
  refreshInterval?: number;
}

// ============================================================================
// Metrics Service Class
// ============================================================================

export class MetricsService {
  private useSimulation: boolean = true;
  private prometheusUrl: string | null = null;
  private initialized: boolean = false;

  constructor(config?: MetricsServiceConfig) {
    this.prometheusUrl = config?.prometheusUrl || process.env.PROMETHEUS_URL || null;
    this.useSimulation = config?.useSimulation ?? true;
  }

  /**
   * Initialize the service and check capabilities
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await execAsync('nvidia-smi --query-gpu=name --format=csv,noheader');
      this.useSimulation = false;
      console.log('nvidia-smi available, using real metrics');
    } catch {
      console.log('nvidia-smi not available, using simulated metrics');
      this.useSimulation = true;
    }

    this.initialized = true;
  }

  /**
   * Check if using simulated data
   */
  isSimulated(): boolean {
    return this.useSimulation;
  }

  // ==========================================================================
  // GPU Metrics
  // ==========================================================================

  async getGPUMetrics(): Promise<GPUMetrics> {
    await this.initialize();

    if (this.useSimulation) {
      return this.getSimulatedGPUMetrics();
    }

    try {
      const result = await execAsync(
        'nvidia-smi --query-gpu=name,utilization.gpu,memory.used,memory.total,temperature.gpu,power.draw,power.limit,fan.speed,driver_version --format=csv,noheader,nounits'
      );

      const parts = result.stdout.trim().split(',').map(s => s.trim());
      const cudaVersion = await this.getCudaVersion();

      return {
        name: parts[0] || 'NVIDIA Blackwell (GB10)',
        index: 0,
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
    } catch (error) {
      console.error('Failed to get GPU metrics:', error);
      return this.getSimulatedGPUMetrics();
    }
  }

  private getSimulatedGPUMetrics(): GPUMetrics {
    const baseTemp = 55;
    const baseUtil = 65;
    const basePower = 60;
    const variation = () => (Math.random() - 0.5) * 10;

    return {
      name: 'NVIDIA Blackwell (GB10)',
      index: 0,
      utilization: Math.min(100, Math.max(0, baseUtil + variation())),
      memoryUsed: 70000 + Math.random() * 10000,
      memoryTotal: 128000,
      temperature: Math.min(90, Math.max(30, baseTemp + variation())),
      powerDraw: Math.min(100, Math.max(20, basePower + variation())),
      powerLimit: 100,
      fanSpeed: 45 + Math.random() * 15,
      driverVersion: '550.54.15',
      cudaVersion: '12.4',
    };
  }

  private async getCudaVersion(): Promise<string> {
    try {
      const result = await execAsync('nvcc --version | grep release | awk \'{print $6}\' | cut -d, -f1');
      return result.stdout.trim() || '12.4';
    } catch {
      return '12.4';
    }
  }

  // ==========================================================================
  // CPU Metrics
  // ==========================================================================

  async getCPUMetrics(): Promise<CPUMetrics> {
    await this.initialize();

    if (this.useSimulation) {
      return this.getSimulatedCPUMetrics();
    }

    try {
      const [model, cores, usage] = await Promise.all([
        execAsync('cat /proc/cpuinfo | grep "model name" | head -1 | cut -d: -f2').then(r => r.stdout.trim()),
        execAsync('nproc').then(r => parseInt(r.stdout.trim())),
        execAsync('top -bn1 | grep "Cpu(s)" | awk \'{print $2}\'').then(r => parseFloat(r.stdout.trim()) || 0),
      ]);

      return {
        model: model || '10x Cortex-X925 + 10x Cortex-A725',
        cores: cores || 20,
        usage,
        temperature: 52 + Math.random() * 8,
        frequencies: { current: 3000, min: 1200, max: 3500 },
      };
    } catch (error) {
      console.error('Failed to get CPU metrics:', error);
      return this.getSimulatedCPUMetrics();
    }
  }

  private getSimulatedCPUMetrics(): CPUMetrics {
    return {
      model: '10x Cortex-X925 + 10x Cortex-A725',
      cores: 20,
      usage: 35 + Math.random() * 20,
      temperature: 50 + Math.random() * 10,
      frequencies: { current: 3000, min: 1200, max: 3500 },
    };
  }

  // ==========================================================================
  // Memory Metrics
  // ==========================================================================

  async getMemoryMetrics(): Promise<MemoryMetrics> {
    await this.initialize();

    if (this.useSimulation) {
      return this.getSimulatedMemoryMetrics();
    }

    try {
      const memInfo = await execAsync('cat /proc/meminfo');
      const lines = memInfo.stdout.split('\n');

      const getValue = (key: string): number => {
        const line = lines.find(l => l.startsWith(key));
        return line ? parseInt(line.split(/\s+/)[1]) * 1024 : 0;
      };

      const total = getValue('MemTotal');
      const used = total - getValue('MemAvailable');

      return {
        total,
        used,
        free: getValue('MemFree'),
        cached: getValue('Cached'),
        percentage: total > 0 ? (used / total) * 100 : 0,
      };
    } catch (error) {
      console.error('Failed to get memory metrics:', error);
      return this.getSimulatedMemoryMetrics();
    }
  }

  private getSimulatedMemoryMetrics(): MemoryMetrics {
    const total = 128 * 1024 * 1024 * 1024; // 128GB
    const used = (60 + Math.random() * 15) * 1024 * 1024 * 1024;
    return {
      total,
      used,
      free: total - used,
      cached: 20 * 1024 * 1024 * 1024,
      percentage: (used / total) * 100,
    };
  }

  // ==========================================================================
  // Storage Metrics
  // ==========================================================================

  async getStorageMetrics(): Promise<StorageMetrics> {
    await this.initialize();

    if (this.useSimulation) {
      return this.getSimulatedStorageMetrics();
    }

    try {
      const df = await execAsync('df -B1 --output=source,target,size,used,avail,fstype | tail -n +2');
      const devices: StorageDevice[] = df.stdout.trim().split('\n')
        .map(line => {
          const parts = line.trim().split(/\s+/);
          const total = parseInt(parts[2]);
          const used = parseInt(parts[3]);
          return {
            name: parts[0],
            mountPoint: parts[1],
            total,
            used,
            free: parseInt(parts[4]),
            type: parts[5],
            percentage: total > 0 ? (used / total) * 100 : 0,
          };
        })
        .filter(d => d.mountPoint === '/' || d.mountPoint.startsWith('/home') || d.mountPoint.startsWith('/data'));

      const total = devices.reduce((sum, d) => sum + d.total, 0);
      const used = devices.reduce((sum, d) => sum + d.used, 0);

      return {
        total,
        used,
        percentage: total > 0 ? (used / total) * 100 : 0,
        devices,
      };
    } catch (error) {
      console.error('Failed to get storage metrics:', error);
      return this.getSimulatedStorageMetrics();
    }
  }

  private getSimulatedStorageMetrics(): StorageMetrics {
    const total = 2 * 1024 * 1024 * 1024 * 1024; // 2TB
    const used = 1.2 * 1024 * 1024 * 1024 * 1024;
    return {
      total,
      used,
      percentage: (used / total) * 100,
      devices: [{
        name: '/dev/nvme0n1p1',
        mountPoint: '/',
        total,
        used,
        free: total - used,
        type: 'ext4',
        percentage: (used / total) * 100,
      }],
    };
  }

  // ==========================================================================
  // Network Metrics
  // ==========================================================================

  async getNetworkMetrics(): Promise<NetworkMetrics> {
    await this.initialize();

    if (this.useSimulation) {
      return this.getSimulatedNetworkMetrics();
    }

    try {
      const ifList = await execAsync('ls /sys/class/net');
      const ifNames = ifList.stdout.trim().split('\n').filter(n => n !== 'lo');

      const interfaces: NetworkInterface[] = [];

      for (const name of ifNames.slice(0, 4)) { // Limit to 4 interfaces
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
          // Skip interface on error
        }
      }

      return {
        interfaces,
        totalRxBytes: interfaces.reduce((sum, i) => sum + i.rxBytes, 0),
        totalTxBytes: interfaces.reduce((sum, i) => sum + i.txBytes, 0),
      };
    } catch (error) {
      console.error('Failed to get network metrics:', error);
      return this.getSimulatedNetworkMetrics();
    }
  }

  private getSimulatedNetworkMetrics(): NetworkMetrics {
    const interfaces: NetworkInterface[] = [
      {
        name: 'eth0',
        ip: '192.168.50.100',
        mac: '00:1A:2B:3C:4D:5E',
        rxBytes: 1024 * 1024 * 1024 * 50,
        txBytes: 1024 * 1024 * 1024 * 30,
        rxPackets: 50000000,
        txPackets: 30000000,
        speed: '10 Gbps',
        status: 'up',
      },
      {
        name: 'eth1',
        ip: '10.0.0.100',
        mac: '00:1A:2B:3C:4D:5F',
        rxBytes: 1024 * 1024 * 1024 * 20,
        txBytes: 1024 * 1024 * 1024 * 15,
        rxPackets: 20000000,
        txPackets: 15000000,
        speed: '10 Gbps',
        status: 'up',
      },
    ];

    return {
      interfaces,
      totalRxBytes: interfaces.reduce((sum, i) => sum + i.rxBytes, 0),
      totalTxBytes: interfaces.reduce((sum, i) => sum + i.txBytes, 0),
    };
  }

  // ==========================================================================
  // System Information
  // ==========================================================================

  async getSystemInfo(): Promise<SystemInfo> {
    await this.initialize();

    if (this.useSimulation) {
      return this.getSimulatedSystemInfo();
    }

    try {
      const [hostname, uptime, os, kernel, uptimeSeconds] = await Promise.all([
        execAsync('hostname').then(r => r.stdout.trim()),
        execAsync('uptime -p').then(r => r.stdout.trim()),
        execAsync('cat /etc/os-release | grep PRETTY_NAME | cut -d= -f2 | tr -d \'"\'').then(r => r.stdout.trim()),
        execAsync('uname -r').then(r => r.stdout.trim()),
        execAsync('cat /proc/uptime | cut -d. -f1').then(r => parseInt(r.stdout.trim())),
      ]);

      const cudaVersion = await this.getCudaVersion();

      return {
        hostname,
        uptime,
        uptimeSeconds,
        os,
        kernel,
        cudaVersion,
      };
    } catch (error) {
      console.error('Failed to get system info:', error);
      return this.getSimulatedSystemInfo();
    }
  }

  private getSimulatedSystemInfo(): SystemInfo {
    return {
      hostname: 'dgx-spark-local',
      uptime: 'up 14 days, 2 hours, 15 minutes',
      uptimeSeconds: 1216800,
      os: 'Ubuntu 22.04',
      kernel: '5.15.0-nvidia',
      cudaVersion: '12.4',
    };
  }

  // ==========================================================================
  // Process Information
  // ==========================================================================

  async getTopProcesses(limit: number = 10): Promise<ProcessInfo[]> {
    await this.initialize();

    if (this.useSimulation) {
      return this.getSimulatedProcesses(limit);
    }

    try {
      const result = await execAsync(`ps aux --sort=-%cpu | head -${limit + 1} | tail -${limit}`);
      const lines = result.stdout.trim().split('\n');

      return lines.map(line => {
        const parts = line.trim().split(/\s+/);
        return {
          pid: parseInt(parts[1]),
          name: parts[10] || 'unknown',
          cpu: parseFloat(parts[2]) || 0,
          memory: parseFloat(parts[3]) || 0,
          user: parts[0],
        };
      });
    } catch (error) {
      console.error('Failed to get processes:', error);
      return this.getSimulatedProcesses(limit);
    }
  }

  private getSimulatedProcesses(limit: number): ProcessInfo[] {
    const processes: ProcessInfo[] = [
      { pid: 1234, name: 'python3', cpu: 45.2, memory: 12.5, gpuMemory: 32000, user: 'ubuntu' },
      { pid: 2345, name: 'spark-worker', cpu: 23.1, memory: 8.3, gpuMemory: 16000, user: 'spark' },
      { pid: 3456, name: 'jupyter', cpu: 5.2, memory: 4.1, user: 'ubuntu' },
      { pid: 4567, name: 'tensorrt', cpu: 35.8, memory: 6.7, gpuMemory: 24000, user: 'ubuntu' },
      { pid: 5678, name: 'vllm', cpu: 28.4, memory: 15.2, gpuMemory: 48000, user: 'ubuntu' },
    ];
    return processes.slice(0, limit);
  }

  // ==========================================================================
  // Node Overview (Combined Metrics)
  // ==========================================================================

  async getNodeOverview(): Promise<NodeOverview> {
    const [systemInfo, cpu, gpu, memory, storage] = await Promise.all([
      this.getSystemInfo(),
      this.getCPUMetrics(),
      this.getGPUMetrics(),
      this.getMemoryMetrics(),
      this.getStorageMetrics(),
    ]);

    // Determine status based on metrics
    let status: 'operational' | 'degraded' | 'offline' = 'operational';
    if (gpu.temperature > 85 || cpu.temperature > 90) {
      status = 'degraded';
    }
    if (gpu.utilization === 0 && cpu.usage === 0) {
      status = 'offline';
    }

    return {
      hostname: systemInfo.hostname,
      uptime: systemInfo.uptime,
      status,
      cpu,
      gpu,
      memory,
      storage,
    };
  }

  // ==========================================================================
  // Power State
  // ==========================================================================

  async getPowerState(): Promise<PowerState> {
    const gpu = await this.getGPUMetrics();

    return {
      gpuIndex: 0,
      powerLimit: gpu.powerLimit,
      powerDraw: gpu.powerDraw,
      temperature: gpu.temperature,
      fanSpeed: gpu.fanSpeed,
      fanMode: 'auto',
      thermalProfile: 'balanced',
    };
  }

  // ==========================================================================
  // Health Check
  // ==========================================================================

  async healthCheck(): Promise<{ healthy: boolean; message: string; simulated: boolean }> {
    await this.initialize();

    return {
      healthy: true,
      message: this.useSimulation ? 'Using simulated metrics' : 'Real metrics available',
      simulated: this.useSimulation,
    };
  }
}

// Singleton instance
let metricsServiceInstance: MetricsService | null = null;

export function getMetricsService(): MetricsService {
  if (!metricsServiceInstance) {
    metricsServiceInstance = new MetricsService();
  }
  return metricsServiceInstance;
}

export default MetricsService;
