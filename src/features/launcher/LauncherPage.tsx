import { AppWindow, Box, Pencil, Play, Plus, Settings, Terminal, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import {
  launchCustomApp,
  listLaunchers,
  pickLauncherApp,
  removeLauncher,
  renameLauncher,
} from "../../lib/tauri";
import type { LauncherEntry, SystemTarget } from "../../types/system";
import { normalizeLauncherName } from "./launcher";

const builtInTargets: Array<{ target: SystemTarget; name: string; icon: typeof AppWindow }> = [
  { target: "terminal", name: "Windows Terminal", icon: Terminal },
  { target: "explorer", name: "File Explorer", icon: Box },
  { target: "task-manager", name: "Task Manager", icon: AppWindow },
  { target: "settings", name: "Windows Settings", icon: Settings },
];

interface LauncherPageProps {
  runTarget: (target: SystemTarget) => Promise<void>;
}

export function LauncherPage({ runTarget }: LauncherPageProps) {
  const [entries, setEntries] = useState<LauncherEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const response = await listLaunchers();
    if (!response.ok) {
      setError(response.message);
      return;
    }
    setEntries(response.data.entries);
    setMessage(response.data.warning);
  };

  useEffect(() => {
    void load();
  }, []);

  const addLauncher = async () => {
    setBusy(true);
    setError(null);
    const response = await pickLauncherApp();
    setBusy(false);
    if (!response.ok) {
      setError(response.message);
      return;
    }
    if (!response.data) return;
    setEntries((current) => {
      const withoutDuplicate = current.filter((entry) => entry.id !== response.data?.id);
      return [...withoutDuplicate, response.data as LauncherEntry];
    });
  };

  const run = async (entry: LauncherEntry) => {
    setActiveId(entry.id);
    setError(null);
    const response = await launchCustomApp(entry.id);
    setActiveId(null);
    if (!response.ok) setError(response.message);
  };

  const rename = async (entry: LauncherEntry) => {
    const requested = window.prompt("Launcher name", entry.name);
    if (requested === null) return;
    const name = normalizeLauncherName(requested);
    if (!name) return;
    const response = await renameLauncher(entry.id, name);
    if (!response.ok) {
      setError(response.message);
      return;
    }
    setEntries((current) => current.map((item) => item.id === entry.id ? { ...item, name } : item));
  };

  const remove = async (entry: LauncherEntry) => {
    if (!window.confirm(`Remove the ${entry.name} launch button? The application will not be uninstalled.`)) return;
    const response = await removeLauncher(entry.id);
    if (!response.ok) {
      setError(response.message);
      return;
    }
    setEntries((current) => current.filter((item) => item.id !== entry.id));
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <div className="eyebrow">FAI1THFUL OS</div>
          <h2>Launcher</h2>
          <p>Open Windows tools and your saved applications from one place.</p>
        </div>
        <button className="primary-button" type="button" disabled={busy} onClick={() => void addLauncher()}>
          <Plus size={15} />{busy ? "Choosing..." : "Add application"}
        </button>
      </div>

      {(error || message) && (
        <div className="notice"><AppWindow size={17} /><div><strong>{error ? "Launcher unavailable" : "Launcher notice"}</strong><span>{error || message}</span></div></div>
      )}

      <section className="launcher-section">
        <div className="section-heading"><span>Windows</span><small>{builtInTargets.length} built-in tools</small></div>
        <div className="launcher-grid">
          {builtInTargets.map(({ target, name, icon: Icon }) => (
            <button className="launcher-tile" key={target} type="button" onClick={() => void runTarget(target)}>
              <span className="metric-icon"><Icon size={17} /></span><strong>{name}</strong><small>Windows tool</small>
            </button>
          ))}
        </div>
      </section>

      <section className="launcher-section">
        <div className="section-heading"><span>Custom</span><small>{entries.length} saved applications</small></div>
        {entries.length > 0 ? (
          <div className="launcher-grid">
            {entries.map((entry) => (
              <article className="launcher-tile custom-launcher" key={entry.id}>
                <button className="launcher-main" type="button" onClick={() => void run(entry)} disabled={activeId === entry.id}>
                  <span className="app-icon">{entry.iconDataUrl ? <img src={entry.iconDataUrl} alt="" /> : <Play size={16} />}</span>
                  <strong>{entry.name}</strong><small title={entry.path}>{entry.path}</small>
                </button>
                <div className="launcher-actions">
                  <button className="icon-button" type="button" title="Rename launcher" aria-label={`Rename ${entry.name}`} onClick={() => void rename(entry)}><Pencil size={14} /></button>
                  <button className="icon-button danger" type="button" title="Remove launcher" aria-label={`Remove ${entry.name}`} onClick={() => void remove(entry)}><Trash2 size={14} /></button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state"><strong>No custom launchers</strong><p>Add an application to create a persistent launch button.</p></div>
        )}
      </section>
    </div>
  );
}
