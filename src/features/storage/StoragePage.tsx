import { CheckCircle2, HardDrive, RefreshCw, ShieldAlert, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { executeCleanup, scanCleanup } from "../../lib/tauri";
import type { CleanupPlan, CleanupResult, SystemSnapshot } from "../../types/system";
import { calculateCleanupSelection, formatStorageBytes } from "./cleanup";

interface StoragePageProps {
  snapshot: SystemSnapshot | null;
  error: string | null;
}

export function StoragePage({ snapshot, error }: StoragePageProps) {
  const [plan, setPlan] = useState<CleanupPlan | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<CleanupResult | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"scan" | "clean" | null>(null);

  const selection = useMemo(
    () => calculateCleanupSelection(plan?.categories ?? [], selectedIds),
    [plan, selectedIds],
  );

  const scan = async () => {
    setBusy("scan");
    setActionError(null);
    setResult(null);
    const response = await scanCleanup();
    setBusy(null);

    if (!response.ok) {
      setPlan(null);
      setActionError(response.message);
      return;
    }

    setPlan(response.data);
    setSelectedIds(new Set());
  };

  const clean = async () => {
    if (!plan || selection.fileCount === 0) return;

    const confirmed = window.confirm(
      `Permanently delete ${selection.fileCount.toLocaleString()} files (${formatStorageBytes(selection.totalBytes)}) from the selected categories?`,
    );
    if (!confirmed) return;

    setBusy("clean");
    setActionError(null);
    const response = await executeCleanup(plan.id, [...selectedIds]);
    setBusy(null);

    if (!response.ok) {
      setActionError(response.message);
      return;
    }

    setResult(response.data);
    setPlan(null);
    setSelectedIds(new Set());
  };

  const toggleCategory = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <div className="eyebrow">FAI1THFUL OS</div>
          <h2>Storage</h2>
          <p>Review mounted volumes and scan approved cleanup locations before deleting anything.</p>
        </div>
        <button className="secondary-button" type="button" disabled={busy !== null} onClick={() => void scan()}>
          <RefreshCw className={busy === "scan" ? "spinning" : undefined} size={15} />
          {busy === "scan" ? "Scanning..." : plan ? "Scan again" : "Scan cleanup"}
        </button>
      </div>

      {(error || actionError) && (
        <div className="notice">
          <ShieldAlert size={17} />
          <div>
            <strong>Storage action unavailable</strong>
            <span>{actionError || error}</span>
          </div>
        </div>
      )}

      {result && (
        <div className="notice cleanup-success">
          <CheckCircle2 size={17} />
          <div>
            <strong>Cleanup complete</strong>
            <span>
              Deleted {result.deletedFiles.toLocaleString()} files and freed {formatStorageBytes(result.freedBytes)}
              {result.failedFiles ? `; ${result.failedFiles.toLocaleString()} files could not be removed.` : "."}
            </span>
          </div>
        </div>
      )}

      {plan && (
        <section className="panel cleanup-panel">
          <div className="section-heading">
            <span>Cleanup review</span>
            <small>Nothing is selected automatically</small>
          </div>
          <div className="cleanup-categories">
            {plan.categories.map((category) => (
              <label className="cleanup-category" key={category.id}>
                <input
                  type="checkbox"
                  checked={selectedIds.has(category.id)}
                  onChange={() => toggleCategory(category.id)}
                />
                <span className="cleanup-category-copy">
                  <strong>{category.label}</strong>
                  <small>{category.description}</small>
                </span>
                <span className="cleanup-category-size">
                  <strong>{formatStorageBytes(category.totalBytes)}</strong>
                  <small>{category.fileCount.toLocaleString()} files</small>
                </span>
              </label>
            ))}
          </div>
          <div className="cleanup-actions">
            <span>
              {selection.fileCount.toLocaleString()} files selected, {formatStorageBytes(selection.totalBytes)}
            </span>
            <button
              className="primary-button cleanup-delete"
              type="button"
              disabled={selection.fileCount === 0 || busy !== null}
              onClick={() => void clean()}
            >
              <Trash2 size={15} />
              {busy === "clean" ? "Cleaning..." : "Delete selected"}
            </button>
          </div>
        </section>
      )}

      <div className="storage-list storage-volumes">
        {snapshot?.disks.map((disk) => {
          const usage = disk.totalBytes ? (disk.usedBytes / disk.totalBytes) * 100 : 0;
          return (
            <section className="panel storage-row" key={disk.mountPoint}>
              <div className="storage-heading">
                <div className="storage-title">
                  <span className="metric-icon"><HardDrive size={16} /></span>
                  <div><strong>{disk.name || "Unnamed volume"}</strong><small>{disk.mountPoint}</small></div>
                </div>
                <span>{usage.toFixed(1)}%</span>
              </div>
              <div className="capacity-track"><span style={{ width: `${Math.min(100, usage)}%` }} /></div>
              <div className="storage-meta">
                <span>{formatStorageBytes(disk.usedBytes)} used</span>
                <span>{formatStorageBytes(Math.max(0, disk.totalBytes - disk.usedBytes))} available</span>
                <span>{formatStorageBytes(disk.totalBytes)} total</span>
              </div>
            </section>
          );
        })}
      </div>

      {(!snapshot || snapshot.disks.length === 0) && (
        <div className="empty-state">
          <strong>No mounted volumes available</strong>
          <p>{error || "The native backend has not returned storage data yet."}</p>
        </div>
      )}
    </div>
  );
}
