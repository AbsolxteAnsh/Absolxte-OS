use std::sync::Mutex;
use std::time::{Instant, SystemTime, UNIX_EPOCH};

use sysinfo::{Disks, Networks, System};

use crate::errors::{AppError, AppResult};
use crate::models::{CpuSnapshot, DiskActivity, MemorySnapshot, NetworkSnapshot, SystemSnapshot};

pub struct TelemetryState {
    network_sampler: Mutex<NetworkSampler>,
}

impl Default for TelemetryState {
    fn default() -> Self {
        Self {
            network_sampler: Mutex::new(NetworkSampler::default()),
        }
    }
}

struct NetworkSampler {
    networks: Networks,
    last_refresh: Option<Instant>,
}

impl Default for NetworkSampler {
    fn default() -> Self {
        Self {
            networks: Networks::new_with_refreshed_list(),
            last_refresh: None,
        }
    }
}

impl NetworkSampler {
    fn sample(&mut self) -> NetworkSnapshot {
        self.networks.refresh(true);
        let now = Instant::now();
        let elapsed_ms = self
            .last_refresh
            .map(|previous| now.duration_since(previous).as_millis() as u64);
        self.last_refresh = Some(now);

        let active_network = self.networks.iter().max_by_key(|(_, data)| {
            let current_traffic = data.received().saturating_add(data.transmitted());
            (
                current_traffic > 0,
                current_traffic,
                data.total_received()
                    .saturating_add(data.total_transmitted()),
            )
        });

        match active_network {
            Some((name, data)) => NetworkSnapshot {
                adapter_name: Some(name.to_string()),
                download_bytes_per_second: elapsed_ms
                    .map(|elapsed| normalize_bytes_per_second(data.received(), elapsed))
                    .unwrap_or(0),
                upload_bytes_per_second: elapsed_ms
                    .map(|elapsed| normalize_bytes_per_second(data.transmitted(), elapsed))
                    .unwrap_or(0),
                session_downloaded_bytes: data.total_received(),
                session_uploaded_bytes: data.total_transmitted(),
            },
            None => NetworkSnapshot {
                adapter_name: None,
                download_bytes_per_second: 0,
                upload_bytes_per_second: 0,
                session_downloaded_bytes: 0,
                session_uploaded_bytes: 0,
            },
        }
    }
}

fn normalize_bytes_per_second(delta_bytes: u64, elapsed_ms: u64) -> u64 {
    if elapsed_ms == 0 {
        return 0;
    }

    ((delta_bytes as u128 * 1_000) / elapsed_ms as u128).min(u64::MAX as u128) as u64
}

pub fn get_system_snapshot(state: &TelemetryState) -> AppResult<SystemSnapshot> {
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|error| AppError::TelemetryUnavailable(error.to_string()))?
        .as_millis() as u64;

    let mut system = System::new_all();
    system.refresh_all();

    let cpus = system.cpus();
    let usage_percent = if cpus.is_empty() {
        0.0
    } else {
        cpus.iter().map(|cpu| cpu.cpu_usage()).sum::<f32>() / cpus.len() as f32
    };

    let frequency_mhz = cpus.first().map(|cpu| cpu.frequency());
    let total_memory = system.total_memory();
    let available_memory = system.available_memory();
    let used_memory = total_memory.saturating_sub(available_memory);
    let memory_usage = if total_memory == 0 {
        0.0
    } else {
        (used_memory as f32 / total_memory as f32) * 100.0
    };

    let disks = Disks::new_with_refreshed_list()
        .iter()
        .map(|disk| {
            let total_bytes = disk.total_space();
            let available_bytes = disk.available_space();
            DiskActivity {
                name: disk.name().to_string_lossy().to_string(),
                mount_point: disk.mount_point().to_string_lossy().to_string(),
                used_bytes: total_bytes.saturating_sub(available_bytes),
                total_bytes,
                read_bytes_per_second: None,
                write_bytes_per_second: None,
            }
        })
        .collect();

    let network = state
        .network_sampler
        .lock()
        .map_err(|_| AppError::TelemetryUnavailable("Network sampler lock was poisoned.".into()))?
        .sample();

    Ok(SystemSnapshot {
        timestamp,
        cpu: CpuSnapshot {
            usage_percent,
            frequency_mhz,
            temperature_c: None,
            logical_processors: cpus.len(),
            physical_cores: system.physical_core_count(),
        },
        memory: MemorySnapshot {
            used_bytes: used_memory,
            total_bytes: total_memory,
            available_bytes: available_memory,
            usage_percent: memory_usage,
        },
        gpu: None,
        disks,
        network,
        uptime_seconds: System::uptime(),
    })
}

#[cfg(test)]
mod tests {
    use super::normalize_bytes_per_second;

    #[test]
    fn normalizes_network_delta_over_elapsed_time() {
        assert_eq!(normalize_bytes_per_second(3_000, 2_000), 1_500);
    }

    #[test]
    fn returns_zero_for_zero_elapsed_time() {
        assert_eq!(normalize_bytes_per_second(3_000, 0), 0);
    }

    #[test]
    fn preserves_small_rates_without_integer_underflow() {
        assert_eq!(normalize_bytes_per_second(1, 2_000), 0);
        assert_eq!(normalize_bytes_per_second(2, 2_000), 1);
    }
}
