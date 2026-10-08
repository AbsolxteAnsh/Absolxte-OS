import {
  AppWindow,
  Database,
  HardDrive,
  Network,
  RefreshCw,
  Rocket,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";

import type { SystemInfo, SystemSnapshot, SystemTarget } from "../../types/system";
import { SYSTEM_TOOLS } from "./tools";

interface SystemPageProps {
  info: SystemInfo | null;
  snapshot: SystemSnapshot | null;
  runTarget: (target: SystemTarget) => Promise<void>;
}

const toolIcons: Partial<Record<SystemTarget, typeof AppWindow>> = {
  "windows-update": RefreshCw,
  "windows-security": ShieldCheck,
  "startup-apps": Rocket,
  "storage-sense": Sparkles,
  "installed-apps": AppWindow,
  "default-apps": SlidersHorizontal,
  "taskbar-settings": SlidersHorizontal,
  "network-settings": Network,
  "disk-management": HardDrive,
};

export function SystemPage({ info, snapshot, runTarget }: SystemPageProps) {
  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <div className="eyebrow">FAI1THFUL OS</div>
          <h2>System</h2>
          <p>Hardware facts and trusted Windows health destinations.</p>
        </div>
      </div>

      {!info ? (
        <div className="empty-state"><strong>Native system information unavailable</strong><p>Run the packaged Windows app to query hardware details.</p></div>
      ) : (
        <div className="content-grid system-facts">
          <section className="panel">
            <div className="section-heading"><span>Operating system</span><small>{info.hostName || "Host name unavailable"}</small></div>
            <dl className="session-list">
              <Info label="Name" value={info.osName || "Unavailable"} />
              <Info label="Version" value={info.osVersion || "Unavailable"} />
              <Info label="Kernel" value={info.kernelVersion || "Unavailable"} />
              <Info label="Architecture" value={info.architecture} />
              <Info label="Uptime" value={snapshot ? formatDuration(snapshot.uptimeSeconds) : "Unavailable"} />
            </dl>
          </section>
          <section className="panel">
            <div className="section-heading"><span>Hardware</span><small>{info.cpuModel || "CPU model unavailable"}</small></div>
            <dl className="session-list">
              <Info label="Logical processors" value={String(info.logicalProcessors)} />
              <Info label="Physical cores" value={info.physicalCores ? String(info.physicalCores) : "Unavailable"} />
              <Info label="Memory" value={formatBytes(info.totalMemoryBytes)} />
              <Info label="GPU" value={info.gpuName || "Unavailable"} />
              <Info label="Volumes" value={String(info.disks.length)} />
            </dl>
          </section>
        </div>
      )}

      <section className="system-toolbox">
        <div className="section-heading"><span>Windows toolbox</span><small>{SYSTEM_TOOLS.length} native destinations</small></div>
        <div className="toolbox-grid">
          {SYSTEM_TOOLS.map((tool) => {
            const Icon = toolIcons[tool.target] || Database;
            return (
              <button className="toolbox-button" type="button" key={tool.target} onClick={() => void runTarget(tool.target)}>
                <span className="metric-icon"><Icon size={16} /></span>
                <span><strong>{tool.name}</strong><small>{tool.detail}</small></span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="info-row"><dt>{label}</dt><dd title={value}>{value}</dd></div>;
}

function formatBytes(value: number): string {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = value;
  let index = 0;
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index += 1;
  }
  return `${size.toFixed(index ? 1 : 0)} ${units[index]}`;
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours ? `${hours}h ${minutes}m` : `${minutes}m`;
}
