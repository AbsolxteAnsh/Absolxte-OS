import {
  Activity,
  Box,
  Braces,
  Check,
  CircleAlert,
  Cpu,
  Database,
  Gauge,
  HardDrive,
  Network,
  Play,
  RefreshCw,
  Search,
  Settings,
  Sparkles,
  Terminal,
  Trash2,
} from "lucide-react";
import { type FormEvent, type ReactNode, useState } from "react";

import { AppsPage } from "../features/apps/AppsPage";
import { LauncherPage } from "../features/launcher/LauncherPage";
import { BoostControl } from "../features/maintenance/BoostControl";
import { StoragePage } from "../features/storage/StoragePage";
import { SystemPage } from "../features/system/SystemPage";
import { ACCENTS, type Accent, type AppSettings } from "../features/settings/settings";
import { killProcess } from "../lib/tauri";
import type {
  PageId,
  ProcessInfo,
  SystemInfo,
  SystemSnapshot,
  SystemTarget,
} from "../types/system";

export const targets: SystemTarget[] = [
  "terminal",
  "explorer",
  "task-manager",
  "settings",
];

export const targetNames: Record<SystemTarget, string> = {
  terminal: "Windows Terminal",
  explorer: "File Explorer",
  "task-manager": "Task Manager",
  settings: "Windows Settings",
  "project-folder": "Project Folder",
  "windows-update": "Windows Update",
  "windows-security": "Windows Security",
  "startup-apps": "Startup Apps",
  "storage-sense": "Storage Sense",
  "installed-apps": "Installed Apps",
  "default-apps": "Default Apps",
  "taskbar-settings": "Taskbar Settings",
  "network-settings": "Network Settings",
  "disk-management": "Disk Management",
};

const accentNames: Record<Accent, string> = {
  violet: "Violet",
  blue: "Blue",
  indigo: "Indigo",
  cyan: "Cyan",
  teal: "Teal",
  emerald: "Emerald",
  amber: "Amber",
  rose: "Rose",
  red: "Red",
  monochrome: "Monochrome",
};
export type Profile = {
  id: string;
  name: string;
  targets: SystemTarget[];
};
type PageProps = { page: PageId; snapshot: SystemSnapshot | null; history: SystemSnapshot[]; error: string | null; processes: ProcessInfo[]; filtered: ProcessInfo[]; processError: string | null; processRefreshing: boolean; refreshProcesses: () => Promise<void>; processQuery: string; setProcessQuery: (value: string) => void; selected: ProcessInfo | null; setSelected: (value: ProcessInfo | null) => void; systemInfo: SystemInfo | null; profiles: Profile[]; setProfiles: (value: Profile[]) => void; settings: AppSettings; updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void; runTarget: (target: SystemTarget) => Promise<void>; activate: (profile: Profile) => Promise<void>; latencyHost: string; setLatencyHost: (value: string) => void; latency: number | null; latencyBusy: boolean; runLatency: () => Promise<void> };

export function Page(props: PageProps) {
  if (props.page === "overview") return <Overview {...props} />;
  if (props.page === "performance") return <Performance {...props} />;
  if (props.page === "processes") return <Processes {...props} />;
  if (props.page === "apps") return <AppsPage />;
  if (props.page === "storage") return <StoragePage snapshot={props.snapshot} error={props.error} />;
  if (props.page === "network") return <NetworkPage {...props} />;
  if (props.page === "profiles") return <Profiles {...props} />;
  if (props.page === "launcher") return <LauncherPage runTarget={props.runTarget} />;
  if (props.page === "system") return <SystemPage info={props.systemInfo} snapshot={props.snapshot} runTarget={props.runTarget} />;
  if (props.page === "developer") return <Developer runTarget={props.runTarget} />;
  return <SettingsPage settings={props.settings} updateSetting={props.updateSetting} />;
}

function Overview({ snapshot, processes, error, profiles, activate, runTarget }: PageProps) {
  const topMemory = [...processes].sort((left, right) => right.memoryBytes - left.memoryBytes)[0];
  return <div className="page-content"><div className="metric-grid"><Metric icon={<Cpu size={18} />} label="CPU" value={percent(snapshot && snapshot.cpu.usagePercent)} detail={snapshot ? snapshot.cpu.logicalProcessors + " logical processors" : "Awaiting native telemetry"} /><Metric icon={<Gauge size={18} />} label="GPU" value={percent(snapshot && snapshot.gpu && snapshot.gpu.usagePercent)} detail={snapshot && snapshot.gpu ? snapshot.gpu.name : "Unavailable unless supported"} /><Metric icon={<Database size={18} />} label="Memory" value={percent(snapshot && snapshot.memory.usagePercent)} detail={snapshot ? bytes(snapshot.memory.usedBytes) + " / " + bytes(snapshot.memory.totalBytes) : "Awaiting native telemetry"} /><Metric icon={<Network size={18} />} label="Network" value={snapshot ? bytes(snapshot.network.downloadBytesPerSecond) + "/s" : "Unavailable"} detail={snapshot && snapshot.network.adapterName || "No active snapshot"} /></div><BoostControl />{error && <Notice title="Native telemetry unavailable" message={error} />}<div className="content-grid"><section className="panel"><Heading title="Quick Control" detail="Every shortcut invokes a real Windows action." /><div className="quick-grid">{profiles.map((profile) => <Action key={profile.id} label={profile.name} icon={<Sparkles size={17} />} onClick={() => void activate(profile)} />)}<Action label="Terminal" icon={<Terminal size={17} />} onClick={() => void runTarget("terminal")} /><Action label="File Explorer" icon={<Box size={17} />} onClick={() => void runTarget("explorer")} /><Action label="Task Manager" icon={<Activity size={17} />} onClick={() => void runTarget("task-manager")} /><Action label="Settings" icon={<Settings size={17} />} onClick={() => void runTarget("settings")} /></div></section><section className="panel"><Heading title="Current Session" detail="Live native snapshot" /><dl className="session-list"><Info label="Uptime" value={snapshot ? duration(snapshot.uptimeSeconds) : "Unavailable"} /><Info label="Top CPU process" value={processes[0] ? processes[0].name : "Unavailable"} /><Info label="Top RAM process" value={topMemory ? topMemory.name : "Unavailable"} /><Info label="Network" value={snapshot ? bytes(snapshot.network.sessionDownloadedBytes) + " received" : "Unavailable"} /></dl></section></div></div>;
}

function Performance({ snapshot, history, error }: PageProps) {
  const max = Math.max(...history.map((item) => item.cpu.usagePercent), 1);
  return <div className="page-content"><Header title="Performance telemetry" detail="Rolling history is capped at 60 samples and stays local." />{error && <Notice title="Native telemetry unavailable" message={error} />}<div className="content-grid"><section className="panel wide-panel"><Heading title="CPU usage" detail="Current and recent samples" /><div className="large-reading">{percent(snapshot && snapshot.cpu.usagePercent)}</div><div className="history-bars">{history.map((item, index) => <span key={String(item.timestamp) + index} style={{ height: Math.max(5, item.cpu.usagePercent / max * 100) + "%" }} />)}</div></section><section className="panel"><Heading title="Memory" detail="Physical memory" /><dl className="session-list"><Info label="Used" value={snapshot ? bytes(snapshot.memory.usedBytes) : "Unavailable"} /><Info label="Available" value={snapshot ? bytes(snapshot.memory.availableBytes) : "Unavailable"} /><Info label="Total" value={snapshot ? bytes(snapshot.memory.totalBytes) : "Unavailable"} /><Info label="Usage" value={snapshot ? percent(snapshot.memory.usagePercent) : "Unavailable"} /></dl></section></div><div className="metric-grid"><Metric icon={<Cpu size={18} />} label="Frequency" value={snapshot && snapshot.cpu.frequencyMHz ? snapshot.cpu.frequencyMHz + " MHz" : "Unavailable"} detail="Reported by Windows" /><Metric icon={<Activity size={18} />} label="Threads" value={snapshot ? String(snapshot.cpu.logicalProcessors) : "Unavailable"} detail="Logical processors" /><Metric icon={<HardDrive size={18} />} label="Disk" value={snapshot && snapshot.disks[0] ? percent(snapshot.disks[0].usedBytes / snapshot.disks[0].totalBytes * 100) : "Unavailable"} detail={snapshot && snapshot.disks[0] ? snapshot.disks[0].mountPoint : "No mounted disk"} /><Metric icon={<Network size={18} />} label="Upload" value={snapshot ? bytes(snapshot.network.uploadBytesPerSecond) + "/s" : "Unavailable"} detail="Current throughput" /></div></div>;
}

function Processes({ filtered, processError, processRefreshing, refreshProcesses, processQuery, setProcessQuery, selected, setSelected }: PageProps) {
  const [busy, setBusy] = useState<number | null>(null);
  const terminate = async (process: ProcessInfo) => { if (!window.confirm("Terminate " + process.name + " (PID " + process.pid + ")? Unsaved work may be lost.")) return; setBusy(process.pid); const result = await killProcess(process.pid); setBusy(null); if (!result.ok) window.alert(result.message); else { setSelected(null); await refreshProcesses(); } };
  return <div className="page-content"><Header title="Processes" detail="Live process inventory from Windows. Protected processes are rejected by Rust." action={<button className="secondary-button" type="button" disabled={processRefreshing} onClick={() => void refreshProcesses()}><RefreshCw className={processRefreshing ? "spinning" : undefined} size={15} />{processRefreshing ? "Refreshing..." : "Refresh"}</button>} />{processError && <Notice title="Process inventory unavailable" message={processError} />}<div className="toolbar"><Search size={16} /><input value={processQuery} onChange={(event) => setProcessQuery(event.target.value)} placeholder="Search name, path, or status" aria-label="Search processes" /><span>{filtered.length} visible</span></div><div className="table-panel"><table><thead><tr><th>Name</th><th>PID</th><th>CPU</th><th>Memory</th><th>Status</th><th /></tr></thead><tbody>{filtered.slice(0, 250).map((process) => <tr key={process.pid} className={selected && selected.pid === process.pid ? "selected-row" : ""} onClick={() => setSelected(process)}><td><strong>{process.name}</strong><small>{process.path || "Path unavailable"}</small></td><td>{process.pid}</td><td>{process.cpuPercent.toFixed(1)}%</td><td>{bytes(process.memoryBytes)}</td><td>{process.status}</td><td><button className="icon-button danger" type="button" title="Terminate process" aria-label="Terminate process" disabled={busy === process.pid} onClick={(event) => { event.stopPropagation(); void terminate(process); }}><Trash2 size={15} /></button></td></tr>)}</tbody></table></div>{selected && <section className="panel detail-drawer"><Heading title={selected.name} detail={"PID " + selected.pid} /><dl className="session-list"><Info label="Executable" value={selected.path || "Unavailable"} /><Info label="CPU" value={selected.cpuPercent.toFixed(1) + "%"} /><Info label="Memory" value={bytes(selected.memoryBytes)} /></dl></section>}</div>;
}

function NetworkPage({ snapshot, error, latencyHost, setLatencyHost, latency, latencyBusy, runLatency }: PageProps) { return <div className="page-content"><Header title="Network" detail="Local telemetry plus an explicit, user-triggered TCP latency check." />{error && <Notice title="Network telemetry unavailable" message={error} />}<div className="metric-grid"><Metric icon={<Network size={18} />} label="Download" value={snapshot ? bytes(snapshot.network.downloadBytesPerSecond) + "/s" : "Unavailable"} detail={snapshot && snapshot.network.adapterName || "No active adapter"} /><Metric icon={<Network size={18} />} label="Upload" value={snapshot ? bytes(snapshot.network.uploadBytesPerSecond) + "/s" : "Unavailable"} detail="Current throughput" /><Metric icon={<Database size={18} />} label="Received" value={snapshot ? bytes(snapshot.network.sessionDownloadedBytes) : "Unavailable"} detail="Session total" /><Metric icon={<Database size={18} />} label="Sent" value={snapshot ? bytes(snapshot.network.sessionUploadedBytes) : "Unavailable"} detail="Session total" /></div><section className="panel"><Heading title="Latency test" detail="Connects to port 443 only after you press Test." /><form className="inline-form" onSubmit={(event: FormEvent) => { event.preventDefault(); void runLatency(); }}><input value={latencyHost} onChange={(event) => setLatencyHost(event.target.value)} aria-label="Latency host" /><button className="primary-button" type="submit" disabled={latencyBusy}>{latencyBusy ? "Testing..." : "Test endpoint"}</button>{latency !== null && <span className="result-chip">{latency} ms</span>}</form></section></div>; }
function Profiles({ profiles, setProfiles, activate }: PageProps) { const [name, setName] = useState(""); const create = (event: FormEvent) => { event.preventDefault(); const value = name.trim(); if (!value) return; setProfiles([...profiles, { id: String(Date.now()), name: value, targets: [] }]); setName(""); }; const toggle = (profile: Profile, target: SystemTarget) => setProfiles(profiles.map((item) => item.id === profile.id ? { ...item, targets: item.targets.includes(target) ? item.targets.filter((value) => value !== target) : [...item.targets, target] } : item)); return <div className="page-content"><Header title="Profiles" detail="Profiles persist locally and run only explicitly configured Windows actions." /><form className="create-row" onSubmit={create}><input value={name} onChange={(event) => setName(event.target.value)} placeholder="New profile name" aria-label="New profile name" /><button className="primary-button" type="submit"><Sparkles size={15} />Create profile</button></form><div className="profile-grid">{profiles.map((profile) => <section className="panel profile-card" key={profile.id}><div className="profile-heading"><div><strong>{profile.name}</strong><small>{profile.targets.length ? profile.targets.length + " configured actions" : "No configured actions"}</small></div><button className="primary-button" type="button" onClick={() => void activate(profile)}><Play size={15} />Activate</button></div><div className="target-options">{targets.map((target) => <label className="check-option" key={target}><input type="checkbox" checked={profile.targets.includes(target)} onChange={() => toggle(profile, target)} /><span>{targetNames[target]}</span></label>)}</div></section>)}</div></div>; }
function Developer({ runTarget }: { runTarget: (target: SystemTarget) => Promise<void> }) { return <div className="page-content"><Header title="Developer" detail="Shortcuts for this project workspace." /><section className="panel project-card"><div className="project-heading"><div><Braces size={20} /><div><strong>Fai1thful OS workspace</strong><small>Current application directory</small></div></div><Check size={18} /></div><p>Open the current project in Windows tools.</p><div className="button-row"><Action label="Open Folder" icon={<Box size={16} />} onClick={() => void runTarget("project-folder")} /><Action label="Open Terminal" icon={<Terminal size={16} />} onClick={() => void runTarget("terminal")} /></div></section><Empty title="No projects added" detail="Saved developer projects will appear after their persistence model is added." /></div>; }
function SettingsPage({ settings, updateSetting }: { settings: AppSettings; updateSetting: PageProps["updateSetting"] }) { return <div className="page-content"><Header title="Settings" detail="Preferences are stored locally in versioned browser storage for this shell." /><div className="settings-list"><section className="panel settings-section"><Heading title="Monitoring" detail="Lower refresh rates reduce overhead." /><label className="setting-row"><span>Refresh rate</span><select value={settings.refreshMs} onChange={(event) => updateSetting("refreshMs", Number(event.target.value) as AppSettings["refreshMs"])}><option value={500}>500 ms</option><option value={1000}>1 second</option><option value={2000}>2 seconds</option><option value={5000}>5 seconds</option></select></label></section><section className="panel settings-section"><Heading title="Appearance" detail="Keep the eclipse accent restrained." /><div className="setting-row"><span>Accent</span><div className="accent-swatches" role="group" aria-label="Accent color">{ACCENTS.map((accent) => <button className={`accent-swatch swatch-${accent} ${settings.accent === accent ? "active" : ""}`} key={accent} type="button" title={accentNames[accent]} aria-label={accentNames[accent]} aria-pressed={settings.accent === accent} onClick={() => updateSetting("accent", accent)}><span /></button>)}</div></div><label className="setting-row"><span>Density</span><select value={settings.density} onChange={(event) => updateSetting("density", event.target.value as AppSettings["density"])}><option value="comfortable">Comfortable</option><option value="compact">Compact</option></select></label><label className="setting-row"><span>Animation</span><select value={settings.motion} onChange={(event) => updateSetting("motion", event.target.value as AppSettings["motion"])}><option value="full">Full</option><option value="reduced">Reduced</option><option value="off">Off</option></select></label></section><section className="panel settings-section"><Heading title="Privacy" detail="No analytics, accounts, cloud sync, or background network requests." /><div className="privacy-line"><Check size={17} /><span>Local-first operation</span></div><div className="privacy-line"><Check size={17} /><span>Diagnostics run only when invoked</span></div></section></div></div>; }
function Metric({ icon, label, value, detail }: { icon: ReactNode; label: string; value: string; detail: string }) { return <article className="metric-card"><div className="metric-top"><span className="metric-icon">{icon}</span><span>{label}</span></div><div className="metric-value">{value}</div><div className="micrograph"><span /><span /><span /><span /><span /></div><p>{detail}</p></article>; }
function Action({ label, icon, onClick }: { label: string; icon: ReactNode; onClick: () => void }) { return <button className="quick-button" type="button" onClick={onClick}>{icon}<span>{label}</span></button>; }
function Header({ title, detail, action }: { title: string; detail: string; action?: ReactNode }) { return <div className="page-header"><div><div className="eyebrow">FAI1THFUL OS</div><h2>{title}</h2><p>{detail}</p></div>{action}</div>; }
function Heading({ title, detail }: { title: string; detail: string }) { return <div className="section-heading"><span>{title}</span><small>{detail}</small></div>; }
function Info({ label, value }: { label: string; value: string }) { return <div className="info-row"><dt>{label}</dt><dd title={value}>{value}</dd></div>; }
function Notice({ title, message }: { title: string; message: string }) { return <div className="notice"><CircleAlert size={17} /><div><strong>{title}</strong><span>{message}</span></div></div>; }
export function Empty({ title, detail }: { title: string; detail: string }) { return <div className="empty-state"><div className="empty-orbit" /><strong>{title}</strong><p>{detail}</p></div>; }
function percent(value: number | null | undefined) { return typeof value === "number" && Number.isFinite(value) ? Math.round(value) + "%" : "Unavailable"; }
function bytes(value: number | null | undefined) { if (typeof value !== "number" || !Number.isFinite(value)) return "Unavailable"; const units = ["B", "KB", "MB", "GB", "TB"]; let size = value; let index = 0; while (size >= 1024 && index < units.length - 1) { size /= 1024; index += 1; } return size.toFixed(index ? 1 : 0) + " " + units[index]; }
function duration(seconds: number) { const hours = Math.floor(seconds / 3600); const minutes = Math.floor(seconds % 3600 / 60); return hours ? hours + "h " + minutes + "m" : minutes + "m"; }
