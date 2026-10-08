
import { Activity, AppWindow, Braces, Gauge, HardDrive, LayoutDashboard, Menu, MonitorCog, Network, Play, Search, Settings, Sparkles, X } from "lucide-react";
import { type KeyboardEvent, useCallback, useEffect, useMemo, useState } from "react";
import { applySettings, loadSettings, saveSettings, type AppSettings } from "../features/settings/settings";
import { getProcesses, getSystemInfo, getSystemSnapshot, openSystemTarget, testLatency } from "../lib/tauri";
import { filterProcesses, searchCommands } from "../lib/appLogic";
import type { CommandEntry, NavItem, PageId, ProcessInfo, SystemInfo, SystemSnapshot, SystemTarget } from "../types/system";
import { Empty, Page, targetNames, targets, type Profile } from "./PageRouter";
import { TitleBar } from "./TitleBar";

const navItems: NavItem[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard }, { id: "performance", label: "Performance", icon: Gauge },
  { id: "processes", label: "Processes", icon: Activity }, { id: "apps", label: "Apps", icon: AppWindow },
  { id: "storage", label: "Storage", icon: HardDrive }, { id: "network", label: "Network", icon: Network },
  { id: "profiles", label: "Profiles", icon: Sparkles }, { id: "launcher", label: "Launcher", icon: Play },
  { id: "system", label: "System", icon: MonitorCog }, { id: "developer", label: "Developer", icon: Braces },
  { id: "settings", label: "Settings", icon: Settings }
];




const initialProfiles: Profile[] = [{ id: "gaming", name: "Gaming", targets: [] }, { id: "coding", name: "Coding", targets: [] }, { id: "focus", name: "Focus", targets: [] }];


export function App() {
  const [page, setPage] = useState<PageId>("overview");
  const [snapshot, setSnapshot] = useState<SystemSnapshot | null>(null);
  const [history, setHistory] = useState<SystemSnapshot[]>([]);
  const [processes, setProcesses] = useState<ProcessInfo[]>([]);
  const [processQuery, setProcessQuery] = useState("");
  const [selected, setSelected] = useState<ProcessInfo | null>(null);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processError, setProcessError] = useState<string | null>(null);
  const [processRefreshing, setProcessRefreshing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>(readProfiles);
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [palette, setPalette] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const [latencyHost, setLatencyHost] = useState("1.1.1.1");
  const [latency, setLatency] = useState<number | null>(null);
  const [latencyBusy, setLatencyBusy] = useState(false);
  const filtered = useMemo(() => filterProcesses(processes, processQuery), [processes, processQuery]);
  const commands = useMemo<CommandEntry[]>(() => [
    ...navItems.map((item) => ({ id: "page:" + item.id, label: "Open " + item.label, keywords: [item.id, item.label], page: item.id })),
    ...targets.map((target) => ({ id: "target:" + target, label: "Open " + targetNames[target], keywords: [target, "launch"], target })),
    ...profiles.map((profile) => ({ id: "profile:" + profile.id, label: "Activate " + profile.name + " Profile", keywords: ["profile", profile.name], profileId: profile.id }))
  ], [profiles]);
  const results = useMemo(() => searchCommands(commands, paletteQuery).slice(0, 8), [commands, paletteQuery]);
  const activeLabel = navItems.find((item) => item.id === page)?.label || "Overview";

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const result = await getSystemSnapshot();
      if (cancelled) return;
      if (result.ok) { setSnapshot(result.data); setHistory((items) => [...items, result.data].slice(-60)); setError(null); }
      else setError(result.message);
    };
    void load();
    const timer = window.setInterval(load, settings.refreshMs);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [settings.refreshMs]);

  const refreshProcesses = useCallback(async () => {
    setProcessRefreshing(true);
    const result = await getProcesses();
    if (result.ok) {
      setProcesses(result.data);
      setProcessError(null);
    } else {
      setProcessError(result.message);
    }
    setProcessRefreshing(false);
  }, []);

  useEffect(() => {
    if (page !== "overview" && page !== "processes" && page !== "apps") return;
    void refreshProcesses();
    const timer = window.setInterval(() => void refreshProcesses(), 2500);
    return () => window.clearInterval(timer);
  }, [page, refreshProcesses]);

  useEffect(() => {
    if (page !== "system" || systemInfo) return;
    void getSystemInfo().then((result) => { if (result.ok) setSystemInfo(result.data); else setNotice(result.message); });
  }, [page, systemInfo]);

  useEffect(() => { localStorage.setItem("absolxteful.profiles.v1", JSON.stringify(profiles)); }, [profiles]);
  useEffect(() => {
    saveSettings(settings);
    applySettings(settings);


  }, [settings]);
  useEffect(() => {
    const key = (event: globalThis.KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setPalette(true); setPaletteQuery(""); }
      if (event.key === "Escape") setPalette(false);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);

  const runTarget = async (target: SystemTarget) => {
    const result = await openSystemTarget(target);
    setNotice(result.ok ? targetNames[target] + " opened." : result.message);
  };
  const activate = async (profile: Profile) => {
    if (!profile.targets.length) { setNotice(profile.name + " has no configured actions yet."); setPage("profiles"); return; }
    const results = await Promise.all(profile.targets.map((target) => openSystemTarget(target)));
    const failures = results.filter((item) => !item.ok).length;
    setNotice(failures ? profile.name + " activated with " + failures + " unavailable action." : profile.name + " activated. " + profile.targets.length + " action(s) completed.");
  };
  const execute = (command: CommandEntry) => {
    setPalette(false); setPaletteQuery("");
    if (command.page) setPage(command.page);
    else if (command.target) void runTarget(command.target);
    else if (command.profileId) { const profile = profiles.find((item) => item.id === command.profileId); if (profile) void activate(profile); }
  };
  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => setSettings((current) => ({ ...current, [key]: value }));

  return <div className={"app-shell " + (collapsed ? "sidebar-collapsed" : "")}>
    <aside className="sidebar"><div className="brand"><div className="brand-mark"><span /></div>{!collapsed && <div><div className="brand-name">absolxteful</div><div className="brand-subtitle">OS Control</div></div>}</div><nav className="nav-list" aria-label="Primary">{navItems.map((item) => { const Icon = item.icon; return <button className={item.id === page ? "nav-item active" : "nav-item"} key={item.id} type="button" title={collapsed ? item.label : undefined} onClick={() => setPage(item.id)}><Icon size={17} />{!collapsed && <span>{item.label}</span>}</button>; })}</nav><div className="sidebar-footer"><button className="icon-button" type="button" title="Collapse sidebar" aria-label="Collapse sidebar" onClick={() => setCollapsed((value) => !value)}><Menu size={16} /></button>{!collapsed && <div><div className="version-label">absolxteful OS</div><div className="version-value">v0.2.0 native beta</div></div>}</div></aside>
    <main className="workspace"><TitleBar activeLabel={activeLabel} onOpenCommand={() => setPalette(true)} onError={setNotice} />
      <section className="page-stage"><div className="eclipse-orbit" />{notice && <div className="notice notice-inline" role="status"><span>{notice}</span><button className="icon-button" type="button" title="Dismiss" aria-label="Dismiss" onClick={() => setNotice(null)}><X size={15} /></button></div>}<Page page={page} snapshot={snapshot} history={history} error={error} processes={processes} filtered={filtered} processError={processError} processRefreshing={processRefreshing} refreshProcesses={refreshProcesses} processQuery={processQuery} setProcessQuery={setProcessQuery} selected={selected} setSelected={setSelected} systemInfo={systemInfo} profiles={profiles} setProfiles={setProfiles} settings={settings} updateSetting={updateSetting} runTarget={runTarget} activate={activate} latencyHost={latencyHost} setLatencyHost={setLatencyHost} latency={latency} latencyBusy={latencyBusy} runLatency={async () => { setLatencyBusy(true); const result = await testLatency(latencyHost); setLatencyBusy(false); if (result.ok) { setLatency(result.data); setNotice(latencyHost + " responded in " + result.data + " ms."); } else setNotice(result.message); }} /></section></main>
    {palette && <Palette query={paletteQuery} setQuery={setPaletteQuery} results={results} onClose={() => setPalette(false)} onExecute={execute} />}
  </div>;
}

function Palette({ query, setQuery, results, onClose, onExecute }: { query: string; setQuery: (value: string) => void; results: CommandEntry[]; onClose: () => void; onExecute: (command: CommandEntry) => void }) { const [index, setIndex] = useState(0); useEffect(() => setIndex(0), [query]); const keyDown = (event: KeyboardEvent<HTMLInputElement>) => { if (event.key === "ArrowDown") { event.preventDefault(); setIndex((value) => Math.min(value + 1, Math.max(0, results.length - 1))); } if (event.key === "ArrowUp") { event.preventDefault(); setIndex((value) => Math.max(0, value - 1)); } if (event.key === "Enter" && results[index]) { event.preventDefault(); onExecute(results[index]); } }; return <div className="palette-backdrop" onMouseDown={onClose}><div className="command-palette" role="dialog" aria-modal="true" aria-label="Command Center" onMouseDown={(event) => event.stopPropagation()}><div className="palette-input"><Search size={17} /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={keyDown} placeholder="Search pages, actions, profiles..." /></div><div className="command-results">{results.map((command, itemIndex) => <button className={itemIndex === index ? "command-result highlighted" : "command-result"} type="button" key={command.id} onMouseEnter={() => setIndex(itemIndex)} onClick={() => onExecute(command)}><span className="command-result-icon">{command.target ? <Play size={16} /> : command.profileId ? <Sparkles size={16} /> : <LayoutDashboard size={16} />}</span><span><strong>{command.label}</strong><small>{command.description || "Available command"}</small></span></button>)}{!results.length && <Empty title="No commands found" detail="Try a page, profile, or Windows shortcut." />}</div></div></div>; }

function readProfiles(): Profile[] { try { const value = JSON.parse(localStorage.getItem("absolxteful.profiles.v1") || "null") as Profile[] | null; return value && value.length ? value : initialProfiles; } catch { return initialProfiles; } }


