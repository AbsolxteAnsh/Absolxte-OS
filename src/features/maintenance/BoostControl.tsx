import { Gauge, Zap } from "lucide-react";
import { useState } from "react";

import { boostMemory } from "../../lib/tauri";
import { describeBoostResult } from "./boost";

export function BoostControl() {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const runBoost = async () => {
    setBusy(true);
    setStatus(null);
    const result = await boostMemory();
    setBusy(false);
    setStatus(result.ok ? describeBoostResult(result.data) : result.message);
  };

  return (
    <section className="boost-strip" aria-live="polite">
      <div className="boost-copy">
        <span className="metric-icon">
          <Gauge size={17} />
        </span>
        <div>
          <strong>Memory boost</strong>
          <small>Trim eligible app working sets without closing apps.</small>
        </div>
      </div>
      {status ? <span className="boost-status">{status}</span> : null}
      <button
        className="primary-button"
        type="button"
        disabled={busy}
        onClick={() => void runBoost()}
      >
        <Zap size={15} />
        {busy ? "Boosting..." : "Boost"}
      </button>
    </section>
  );
}
