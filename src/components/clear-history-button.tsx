"use client";

import { useState } from "react";

import { useToast } from "@/components/toast";
import { clearHistory } from "@/lib/watch-history";

/** Clears the signed-in user's watch history after confirmation. */
export function ClearHistoryButton() {
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const toast = useToast();

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted hover:bg-surface-hover hover:text-foreground"
      >
        Clear history
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted">Clear all history?</span>
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await clearHistory();
            toast("Watch history cleared");
          } catch {
            toast("Could not clear history");
          } finally {
            setBusy(false);
            setConfirming(false);
          }
        }}
        className="rounded-lg bg-danger px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
      >
        {busy ? "Clearing…" : "Clear"}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-surface-hover"
      >
        Cancel
      </button>
    </div>
  );
}
