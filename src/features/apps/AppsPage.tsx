import { AppWindow, ExternalLink, RefreshCw, Search, ShieldAlert, X, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  closeRunningApp,
  getInstalledApps,
  getRunningApps,
  launchUninstaller,
} from "../../lib/tauri";
import type { InstalledApp, RunningApp } from "../../types/system";
import { filterInstalledApps, filterRunningApps, runningAppInitial } from "./apps";

type InventoryMode = "running" | "installed";

export function AppsPage() {
  const [mode, setMode] = useState<InventoryMode>("running");
  const [query, setQuery] = useState("");
  const [running, setRunning] = useState<RunningApp[]>([]);
  const [installed, setInstalled] = useState<InstalledApp[]>([]);
  const [selected, setSelected] = useState<InstalledApp | null>(null);
  const [busy, setBusy] = useState(false);
  const [closingPid, setClosingPid] = useState<number | null>(null);
  const [uninstalling, setUninstalling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const visibleRunning = useMemo(() => filterRunningApps(running, query), [query, running]);
  const visibleInstalled = useMemo(
    () => filterInstalledApps(installed, query),
    [installed, query],
  );

  const refresh = async (target: InventoryMode) => {
    setBusy(true);
    setError(null);
    setStatus(null);
    const response = target === "running" ? await getRunningApps() : await getInstalledApps();
    setBusy(false);

    if (!response.ok) {
      setError(response.message);
      return;
    }
    if (target === "running") setRunning(response.data as RunningApp[]);
    else setInstalled(response.data as InstalledApp[]);
  };

  useEffect(() => {
    void refresh("running");
  }, []);

  const changeMode = (next: InventoryMode) => {
    setMode(next);
    setQuery("");
    setError(null);
    setStatus(null);
    if (next === "installed" && installed.length === 0) void refresh(next);
  };

  const closeApp = async (app: RunningApp) => {
    if (!window.confirm(`Close ${app.name} (PID ${app.pid})? Unsaved work may be lost.`)) return;
    setClosingPid(app.pid);
    setError(null);
    const response = await closeRunningApp(app.pid);
    setClosingPid(null);
    if (!response.ok) {
      setError(response.message);
      return;
    }
    setStatus(`${app.name} was closed.`);
    await refresh("running");
  };

  const uninstall = async (app: InstalledApp) => {
    setUninstalling(true);
    setError(null);
    let response = await launchUninstaller(app.id, false);

    if (response.ok && response.data.needsElevation) {
      const approved = window.confirm(
        `${app.name} requires administrator permission. Allow Windows to show a UAC prompt?`,
      );
      if (approved) response = await launchUninstaller(app.id, true);
    }

    setUninstalling(false);
    if (!response.ok) {
      setError(response.message);
      return;
    }
    if (!response.data.launched) return;

    setSelected(null);
    setStatus(`${app.name}'s registered uninstaller was launched. Refresh after it finishes.`);
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <div className="eyebrow">FAI1THFUL OS</div>
          <h2>Apps</h2>
          <p>Inspect running executables or review Windows-registered uninstallers.</p>
        </div>
        <button className="secondary-button" type="button" disabled={busy} onClick={() => void refresh(mode)}>
          <RefreshCw className={busy ? "spinning" : undefined} size={15} />
          {busy ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <div className="segmented-control" aria-label="App inventory">
        <button type="button" className={mode === "running" ? "active" : ""} onClick={() => changeMode("running")}>Running</button>
        <button type="button" className={mode === "installed" ? "active" : ""} onClick={() => changeMode("installed")}>Installed</button>
      </div>

      {(error || status) && (
        <div className={`notice ${status ? "cleanup-success" : ""}`}>
          {status ? <AppWindow size={17} /> : <ShieldAlert size={17} />}
          <div><strong>{status ? "App action complete" : "App action unavailable"}</strong><span>{status || error}</span></div>
        </div>
      )}

      <div className="toolbar apps-toolbar">
        <Search size={16} />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={mode === "running" ? "Search running apps" : "Search installed apps"}
          aria-label="Search apps"
        />
        <span>{(mode === "running" ? visibleRunning.length : visibleInstalled.length).toLocaleString()} visible</span>
      </div>

      <section className="panel app-inventory-panel">
        {mode === "running" ? (
          <div className="app-inventory-list">
            {visibleRunning.map((app) => (
              <div className="inventory-row" key={app.pid}>
                <AppIcon name={app.name} dataUrl={app.iconDataUrl} />
                <div className="inventory-copy"><strong>{app.name}</strong><small title={app.path}>{app.path}</small></div>
                <div className="inventory-meta"><strong>{formatBytes(app.memoryBytes)}</strong><small>PID {app.pid}</small></div>
                <button className="icon-button danger" type="button" title="Close app" aria-label={`Close ${app.name}`} disabled={closingPid === app.pid} onClick={() => void closeApp(app)}>
                  <XCircle size={17} />
                </button>
              </div>
            ))}
            {!busy && visibleRunning.length === 0 && <InventoryEmpty text="No running apps match this search." />}
          </div>
        ) : (
          <div className="app-inventory-list">
            {visibleInstalled.map((app) => (
              <div className="inventory-row installed-row" key={app.id}>
                <AppIcon name={app.name} dataUrl={app.iconDataUrl} />
                <div className="inventory-copy"><strong>{app.name}</strong><small>{[app.publisher, app.version].filter(Boolean).join(" · ") || "Publisher and version unavailable"}</small></div>
                <div className="inventory-meta"><strong>{app.estimatedSizeBytes ? formatBytes(app.estimatedSizeBytes) : "Size unavailable"}</strong><small>{app.mayRequireElevation ? "May request admin access" : "Current user"}</small></div>
                <button className="secondary-button" type="button" disabled={!app.uninstallAvailable} title={app.uninstallAvailable ? "Review uninstall" : "No safely parsed uninstaller is registered"} onClick={() => setSelected(app)}>
                  <ExternalLink size={14} />Review
                </button>
              </div>
            ))}
            {!busy && visibleInstalled.length === 0 && <InventoryEmpty text="No installed apps match this search." />}
          </div>
        )}
      </section>

      {selected && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => !uninstalling && setSelected(null)}>
          <section className="review-dialog" role="dialog" aria-modal="true" aria-labelledby="uninstall-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="review-dialog-heading">
              <div className="review-app-title"><AppIcon name={selected.name} dataUrl={selected.iconDataUrl} /><div><strong id="uninstall-title">Uninstall {selected.name}</strong><small>{selected.publisher || "Publisher unavailable"}</small></div></div>
              <button className="icon-button" type="button" aria-label="Close uninstall review" disabled={uninstalling} onClick={() => setSelected(null)}><X size={17} /></button>
            </div>
            <dl className="session-list">
              <div className="info-row"><dt>Version</dt><dd>{selected.version || "Unavailable"}</dd></div>
              <div className="info-row"><dt>Installed size</dt><dd>{selected.estimatedSizeBytes ? formatBytes(selected.estimatedSizeBytes) : "Unavailable"}</dd></div>
              <div className="info-row"><dt>Location</dt><dd title={selected.installLocation || "Unavailable"}>{selected.installLocation || "Unavailable"}</dd></div>
              <div className="info-row"><dt>Permission</dt><dd>{selected.mayRequireElevation ? "Windows may request administrator access" : "No elevation expected"}</dd></div>
            </dl>
            <p className="review-warning">This starts the uninstaller registered by Windows. Review its own prompts before confirming removal.</p>
            <div className="review-actions">
              <button className="secondary-button" type="button" disabled={uninstalling} onClick={() => setSelected(null)}>Cancel</button>
              <button className="primary-button" type="button" disabled={uninstalling} onClick={() => void uninstall(selected)}><ExternalLink size={14} />{uninstalling ? "Starting..." : "Start uninstaller"}</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function AppIcon({ name, dataUrl }: { name: string; dataUrl: string | null }) {
  return <span className="app-icon">{dataUrl ? <img src={dataUrl} alt="" /> : runningAppInitial(name)}</span>;
}

function InventoryEmpty({ text }: { text: string }) {
  return <div className="inventory-empty">{text}</div>;
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
