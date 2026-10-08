import type { SystemTarget } from "../../types/system";

export interface SystemTool {
  target: SystemTarget;
  name: string;
  detail: string;
}

export const SYSTEM_TOOLS: SystemTool[] = [
  { target: "windows-update", name: "Windows Update", detail: "Updates and restart status" },
  { target: "windows-security", name: "Windows Security", detail: "Protection and device health" },
  { target: "startup-apps", name: "Startup Apps", detail: "Manage sign-in launch behavior" },
  { target: "storage-sense", name: "Storage Sense", detail: "Automatic Windows cleanup" },
  { target: "installed-apps", name: "Installed Apps", detail: "Windows app management" },
  { target: "default-apps", name: "Default Apps", detail: "File and link associations" },
  { target: "taskbar-settings", name: "Taskbar", detail: "Taskbar behavior and layout" },
  { target: "network-settings", name: "Network", detail: "Adapters and connection settings" },
  { target: "disk-management", name: "Disk Management", detail: "Volumes and partitions" },
];
