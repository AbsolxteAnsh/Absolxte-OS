import { invoke } from "@tauri-apps/api/core";
import type {
  BoostResult,
  CleanupPlan,
  CleanupResult,
  InstalledApp,
  LauncherEntry,
  LauncherInventory,
  ProcessInfo,
  RunningApp,
  SystemInfo,
  SystemSnapshot,
  SystemTarget,
  UninstallLaunchResult,
} from "../types/system";

export type CommandResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string; details?: string };

function errorResult<T>(error: unknown, fallback: string): CommandResult<T> {
  return {
    ok: false,
    message: error instanceof Error ? error.message : fallback,
    details: String(error)
  };
}

export async function listLaunchers(): Promise<CommandResult<LauncherInventory>> {
  try {
    return { ok: true, data: await invoke<LauncherInventory>("list_launchers") };
  } catch (error) {
    return errorResult(error, "Saved launchers could not be loaded.");
  }
}

export async function pickLauncherApp(): Promise<CommandResult<LauncherEntry | null>> {
  try {
    return { ok: true, data: await invoke<LauncherEntry | null>("pick_launcher_app") };
  } catch (error) {
    return errorResult(error, "The Windows application picker could not be opened.");
  }
}

export async function renameLauncher(id: string, name: string): Promise<CommandResult<boolean>> {
  try {
    return { ok: true, data: await invoke<boolean>("rename_launcher", { id, name }) };
  } catch (error) {
    return errorResult(error, "The launcher could not be renamed.");
  }
}

export async function removeLauncher(id: string): Promise<CommandResult<boolean>> {
  try {
    return { ok: true, data: await invoke<boolean>("remove_launcher", { id }) };
  } catch (error) {
    return errorResult(error, "The launcher could not be removed.");
  }
}

export async function launchCustomApp(id: string): Promise<CommandResult<boolean>> {
  try {
    return { ok: true, data: await invoke<boolean>("launch_custom_app", { id }) };
  } catch (error) {
    return errorResult(error, "The saved application could not be launched.");
  }
}

export async function getRunningApps(): Promise<CommandResult<RunningApp[]>> {
  try {
    return { ok: true, data: await invoke<RunningApp[]>("get_running_apps") };
  } catch (error) {
    return errorResult(error, "Running app inventory is unavailable.");
  }
}

export async function closeRunningApp(pid: number): Promise<CommandResult<boolean>> {
  try {
    return { ok: true, data: await invoke<boolean>("close_running_app", { pid }) };
  } catch (error) {
    return errorResult(error, "The selected app could not be closed.");
  }
}

export async function getInstalledApps(): Promise<CommandResult<InstalledApp[]>> {
  try {
    return { ok: true, data: await invoke<InstalledApp[]>("get_installed_apps") };
  } catch (error) {
    return errorResult(error, "Windows installed app inventory is unavailable.");
  }
}

export async function launchUninstaller(
  appId: string,
  allowElevation: boolean,
): Promise<CommandResult<UninstallLaunchResult>> {
  try {
    return {
      ok: true,
      data: await invoke<UninstallLaunchResult>("launch_uninstaller", {
        appId,
        allowElevation,
      }),
    };
  } catch (error) {
    return errorResult(error, "The registered uninstaller could not be started.");
  }
}

export async function boostMemory(): Promise<CommandResult<BoostResult>> {
  try {
    return { ok: true, data: await invoke<BoostResult>("boost_memory") };
  } catch (error) {
    return errorResult(error, "Memory boost could not trim eligible applications.");
  }
}
export async function scanCleanup(): Promise<CommandResult<CleanupPlan>> {
  try {
    return { ok: true, data: await invoke<CleanupPlan>("scan_cleanup") };
  } catch (error) {
    return errorResult(error, "Approved cleanup locations could not be scanned.");
  }
}

export async function executeCleanup(
  planId: string,
  categoryIds: string[],
): Promise<CommandResult<CleanupResult>> {
  try {
    return {
      ok: true,
      data: await invoke<CleanupResult>("execute_cleanup", { planId, categoryIds }),
    };
  } catch (error) {
    return errorResult(error, "The selected cleanup files could not be removed.");
  }
}

export async function getSystemSnapshot(): Promise<CommandResult<SystemSnapshot>> {
  try {
    return { ok: true, data: await invoke<SystemSnapshot>("get_system_snapshot") };
  } catch (error) {
    return errorResult(error, "The native Fai1thful OS backend is not reachable in this session.");
  }
}

export async function getProcesses(): Promise<CommandResult<ProcessInfo[]>> {
  try {
    return { ok: true, data: await invoke<ProcessInfo[]>("get_processes") };
  } catch (error) {
    return errorResult(error, "Process data is unavailable until the native backend is running.");
  }
}

export async function killProcess(pid: number): Promise<CommandResult<boolean>> {
  try {
    return { ok: true, data: await invoke<boolean>("kill_process", { pid }) };
  } catch (error) {
    return errorResult(error, "The process could not be terminated.");
  }
}

export async function openSystemTarget(target: SystemTarget): Promise<CommandResult<boolean>> {
  try {
    return { ok: true, data: await invoke<boolean>("open_system_target", { target }) };
  } catch (error) {
    return errorResult(error, "Windows could not open that target.");
  }
}

export async function getSystemInfo(): Promise<CommandResult<SystemInfo>> {
  try {
    return { ok: true, data: await invoke<SystemInfo>("get_system_info") };
  } catch (error) {
    return errorResult(error, "Hardware information is unavailable until the native backend is running.");
  }
}

export async function testLatency(host: string): Promise<CommandResult<number>> {
  try {
    return { ok: true, data: await invoke<number>("test_latency", { host }) };
  } catch (error) {
    return errorResult(error, "The latency test could not connect to that endpoint.");
  }
}

export async function minimizeWindow(): Promise<CommandResult<boolean>> {
  try {
    return { ok: true, data: await invoke<boolean>("minimize_window") };
  } catch (error) {
    return errorResult(error, "Window controls are available in the desktop build.");
  }
}

export async function toggleMaximizeWindow(): Promise<CommandResult<boolean>> {
  try {
    return { ok: true, data: await invoke<boolean>("toggle_maximize_window") };
  } catch (error) {
    return errorResult(error, "Window controls are available in the desktop build.");
  }
}

export async function closeWindow(): Promise<CommandResult<boolean>> {
  try {
    return { ok: true, data: await invoke<boolean>("close_window") };
  } catch (error) {
    return errorResult(error, "Window controls are available in the desktop build.");
  }
}

export async function startWindowDrag(): Promise<CommandResult<boolean>> {
  try {
    return { ok: true, data: await invoke<boolean>("start_window_drag") };
  } catch (error) {
    return errorResult(error, "The window could not start moving.");
  }
}

export async function isWindowMaximized(): Promise<CommandResult<boolean>> {
  try {
    return { ok: true, data: await invoke<boolean>("is_window_maximized") };
  } catch (error) {
    return errorResult(error, "The window state is unavailable.");
  }
}