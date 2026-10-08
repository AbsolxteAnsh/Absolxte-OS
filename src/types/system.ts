import type { LucideIcon } from "lucide-react";

export type PageId =
  | "overview"
  | "performance"
  | "processes"
  | "apps"
  | "storage"
  | "network"
  | "profiles"
  | "launcher"
  | "system"
  | "developer"
  | "settings";

export interface NavItem {
  id: PageId;
  label: string;
  icon: LucideIcon;
}

export interface DiskActivity {
  name: string;
  mountPoint: string;
  usedBytes: number;
  totalBytes: number;
  readBytesPerSecond?: number;
  writeBytesPerSecond?: number;
}

export interface SystemSnapshot {
  timestamp: number;
  cpu: {
    usagePercent: number;
    frequencyMHz?: number;
    temperatureC?: number;
    logicalProcessors: number;
    physicalCores?: number;
  };
  memory: {
    usedBytes: number;
    totalBytes: number;
    availableBytes: number;
    usagePercent: number;
  };
  gpu?: {
    name: string;
    usagePercent?: number;
    temperatureC?: number;
    usedVramBytes?: number;
    totalVramBytes?: number;
  };
  disks: DiskActivity[];
  network: {
    adapterName?: string;
    downloadBytesPerSecond: number;
    uploadBytesPerSecond: number;
    sessionDownloadedBytes: number;
    sessionUploadedBytes: number;
  };
  uptimeSeconds: number;
}

export interface ProcessInfo {
  name: string;
  pid: number;
  cpuPercent: number;
  memoryBytes: number;
  status: string;
  path?: string;
  startTimeSeconds?: number;
}

export interface BoostResult {
  beforeBytes: number;
  afterBytes: number;
  releasedBytes: number;
  processesTrimmed: number;
  processesSkipped: number;
}

export interface CleanupCategory {
  id: string;
  label: string;
  description: string;
  fileCount: number;
  totalBytes: number;
  requiresElevation: boolean;
}

export interface CleanupPlan {
  id: string;
  createdAtSeconds: number;
  expiresAtSeconds: number;
  categories: CleanupCategory[];
}

export interface CleanupResult {
  deletedFiles: number;
  freedBytes: number;
  failedFiles: number;
}
export interface RunningApp {
  name: string;
  pid: number;
  memoryBytes: number;
  path: string;
  iconDataUrl: string | null;
}

export interface InstalledApp {
  id: string;
  name: string;
  publisher: string | null;
  version: string | null;
  installLocation: string | null;
  estimatedSizeBytes: number | null;
  iconDataUrl: string | null;
  uninstallAvailable: boolean;
  mayRequireElevation: boolean;
}

export interface UninstallLaunchResult {
  launched: boolean;
  elevationRequested: boolean;
  needsElevation: boolean;
}

export interface LauncherEntry {
  id: string;
  name: string;
  path: string;
  iconDataUrl: string | null;
}

export interface LauncherInventory {
  entries: LauncherEntry[];
  warning: string | null;
}

export interface SystemInfo {
  osName?: string;
  osVersion?: string;
  kernelVersion?: string;
  hostName?: string;
  architecture: string;
  cpuModel?: string;
  physicalCores?: number;
  logicalProcessors: number;
  totalMemoryBytes: number;
  gpuName?: string;
  disks: DiskActivity[];
}

export type SystemTarget =
  | "terminal"
  | "explorer"
  | "task-manager"
  | "settings"
  | "project-folder"
  | "windows-update"
  | "windows-security"
  | "startup-apps"
  | "storage-sense"
  | "installed-apps"
  | "default-apps"
  | "taskbar-settings"
  | "network-settings"
  | "disk-management";

export interface CommandEntry {
  id: string;
  label: string;
  description?: string;
  keywords: string[];
  page?: PageId;
  target?: SystemTarget;
  profileId?: string;
}
