#!/bin/bash
##############################################################################
# NVIDIA-SMI Metrics Collection Script for Splunk
# Comprehensive GPU metrics collection
##############################################################################

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%S")
HOSTNAME=$(hostname)

# Check if nvidia-smi is available
if ! command -v nvidia-smi &> /dev/null; then
    echo "timestamp=${TIMESTAMP} host=${HOSTNAME} error=\"nvidia-smi not found\""
    exit 1
fi

# Collect comprehensive GPU metrics
nvidia-smi --query-gpu=index,name,uuid,driver_version,pci.bus_id,pci.device_id,pci.sub_device_id,pcie.link.gen.current,pcie.link.gen.max,pcie.link.width.current,pcie.link.width.max,display_mode,display_active,persistence_mode,accounting.mode,accounting.buffer_size,mig.mode.current,mig.mode.pending,fan.speed,pstate,clocks_throttle_reasons.supported,clocks_throttle_reasons.active,clocks_throttle_reasons.gpu_idle,clocks_throttle_reasons.applications_clocks_setting,clocks_throttle_reasons.sw_power_cap,clocks_throttle_reasons.hw_slowdown,clocks_throttle_reasons.hw_thermal_slowdown,clocks_throttle_reasons.hw_power_brake_slowdown,clocks_throttle_reasons.sync_boost,clocks_throttle_reasons.sw_thermal_slowdown,memory.total,memory.reserved,memory.used,memory.free,compute_mode,utilization.gpu,utilization.memory,encoder.stats.sessionCount,encoder.stats.averageFps,encoder.stats.averageLatency,ecc.mode.current,ecc.mode.pending,ecc.errors.corrected.volatile.device_memory,ecc.errors.corrected.volatile.dram,ecc.errors.corrected.volatile.register_file,ecc.errors.corrected.volatile.l1_cache,ecc.errors.corrected.volatile.l2_cache,ecc.errors.corrected.volatile.texture_memory,ecc.errors.corrected.volatile.cbu,ecc.errors.corrected.volatile.sram,ecc.errors.corrected.volatile.total,ecc.errors.corrected.aggregate.device_memory,ecc.errors.corrected.aggregate.dram,ecc.errors.corrected.aggregate.register_file,ecc.errors.corrected.aggregate.l1_cache,ecc.errors.corrected.aggregate.l2_cache,ecc.errors.corrected.aggregate.texture_memory,ecc.errors.corrected.aggregate.cbu,ecc.errors.corrected.aggregate.sram,ecc.errors.corrected.aggregate.total,ecc.errors.uncorrected.volatile.device_memory,ecc.errors.uncorrected.volatile.dram,ecc.errors.uncorrected.volatile.register_file,ecc.errors.uncorrected.volatile.l1_cache,ecc.errors.uncorrected.volatile.l2_cache,ecc.errors.uncorrected.volatile.texture_memory,ecc.errors.uncorrected.volatile.cbu,ecc.errors.uncorrected.volatile.sram,ecc.errors.uncorrected.volatile.total,ecc.errors.uncorrected.aggregate.device_memory,ecc.errors.uncorrected.aggregate.dram,ecc.errors.uncorrected.aggregate.register_file,ecc.errors.uncorrected.aggregate.l1_cache,ecc.errors.uncorrected.aggregate.l2_cache,ecc.errors.uncorrected.aggregate.texture_memory,ecc.errors.uncorrected.aggregate.cbu,ecc.errors.uncorrected.aggregate.sram,ecc.errors.uncorrected.aggregate.total,retired_pages.single_bit_ecc.count,retired_pages.double_bit.count,retired_pages.pending,temperature.gpu,temperature.memory,power.management,power.draw,power.draw.average,power.draw.instant,power.limit,enforced.power.limit,power.default_limit,power.min_limit,power.max_limit,clocks.current.graphics,clocks.current.sm,clocks.current.memory,clocks.current.video,clocks.applications.graphics,clocks.applications.memory,clocks.default_applications.graphics,clocks.default_applications.memory,clocks.max.graphics,clocks.max.sm,clocks.max.memory --format=csv,nounits 2>/dev/null | while IFS=',' read -r index name uuid driver_version pci_bus pci_device pci_sub_device pcie_gen_current pcie_gen_max pcie_width_current pcie_width_max display_mode display_active persistence_mode accounting_mode accounting_buffer mig_current mig_pending fan_speed pstate throttle_supported throttle_active throttle_idle throttle_app_clocks throttle_sw_power throttle_hw_slowdown throttle_hw_thermal throttle_hw_power_brake throttle_sync_boost throttle_sw_thermal mem_total mem_reserved mem_used mem_free compute_mode util_gpu util_mem enc_sessions enc_fps enc_latency ecc_current ecc_pending ecc_corr_vol_dev ecc_corr_vol_dram ecc_corr_vol_reg ecc_corr_vol_l1 ecc_corr_vol_l2 ecc_corr_vol_tex ecc_corr_vol_cbu ecc_corr_vol_sram ecc_corr_vol_total ecc_corr_agg_dev ecc_corr_agg_dram ecc_corr_agg_reg ecc_corr_agg_l1 ecc_corr_agg_l2 ecc_corr_agg_tex ecc_corr_agg_cbu ecc_corr_agg_sram ecc_corr_agg_total ecc_uncorr_vol_dev ecc_uncorr_vol_dram ecc_uncorr_vol_reg ecc_uncorr_vol_l1 ecc_uncorr_vol_l2 ecc_uncorr_vol_tex ecc_uncorr_vol_cbu ecc_uncorr_vol_sram ecc_uncorr_vol_total ecc_uncorr_agg_dev ecc_uncorr_agg_dram ecc_uncorr_agg_reg ecc_uncorr_agg_l1 ecc_uncorr_agg_l2 ecc_uncorr_agg_tex ecc_uncorr_agg_cbu ecc_uncorr_agg_sram ecc_uncorr_agg_total retired_sbe retired_dbe retired_pending temp_gpu temp_mem power_mgmt power_draw power_avg power_instant power_limit power_enforced power_default power_min power_max clk_graphics clk_sm clk_mem clk_video clk_app_graphics clk_app_mem clk_def_graphics clk_def_mem clk_max_graphics clk_max_sm clk_max_mem; do
    # Skip header row
    if [[ "$index" == "index" ]]; then
        continue
    fi
    
    # Output in key=value format
    echo "timestamp=${TIMESTAMP} host=${HOSTNAME} gpu_index=${index} gpu_name=\"${name}\" gpu_uuid=${uuid} driver_version=${driver_version} pci_bus=${pci_bus} pcie_gen=${pcie_gen_current}/${pcie_gen_max} pcie_width=${pcie_width_current}/${pcie_width_max} persistence_mode=${persistence_mode} fan_speed=${fan_speed} pstate=${pstate} memory_total_mib=${mem_total} memory_used_mib=${mem_used} memory_free_mib=${mem_free} gpu_utilization=${util_gpu} memory_utilization=${util_mem} temperature_gpu=${temp_gpu} temperature_memory=${temp_mem} power_draw_w=${power_draw} power_limit_w=${power_limit} clock_graphics_mhz=${clk_graphics} clock_sm_mhz=${clk_sm} clock_memory_mhz=${clk_mem} ecc_mode=${ecc_current} ecc_corrected_total=${ecc_corr_vol_total} ecc_uncorrected_total=${ecc_uncorr_vol_total} throttle_active=${throttle_active}"
done

# Collect process information
echo ""
nvidia-smi --query-compute-apps=pid,process_name,used_memory,gpu_uuid --format=csv,nounits 2>/dev/null | while IFS=',' read -r pid process_name used_mem gpu_uuid; do
    if [[ "$pid" == "pid" ]]; then
        continue
    fi
    echo "timestamp=${TIMESTAMP} host=${HOSTNAME} metric_type=gpu_process pid=${pid} process_name=\"${process_name}\" gpu_memory_used_mib=${used_mem} gpu_uuid=${gpu_uuid}"
done
