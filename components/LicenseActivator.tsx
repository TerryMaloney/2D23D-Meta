"use client";

import { useEffect, useState } from "react";
import {
  LicenseState,
  loadLicense,
  revalidateIfStale,
  TEST_MODE,
  verifyKey,
} from "@/lib/license";

export function LicenseActivator() {
  const [state, setState] = useState<LicenseState>({ plan: "free" });
  const [draft, setDraft] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    // Async on purpose: this page is prerendered, so the cached license is
    // applied after hydration, then revalidated quietly in the background.
    void Promise.resolve().then(async () => {
      const cached = loadLicense();
      if (active) setState(cached);
      const fresh = await revalidateIfStale(cached);
      if (active) setState(fresh);
    });
    return () => {
      active = false;
    };
  }, []);

  const activate = async () => {
    setBusy(true);
    setMessage(null);
    const result = await verifyKey(draft);
    setBusy(false);
    if (result.ok && result.state) {
      setState(result.state);
      setMessage("Activated on this device.");
    } else {
      setMessage(result.error ?? "That key isn't valid.");
    }
  };

  return (
    <div className="mt-4 rounded-sm border border-rule bg-surface p-4 text-sm">
      <p className="text-ink-soft">
        Current plan on this device:{" "}
        <span className="font-medium text-ink">
          {state.plan === "pro"
            ? "Pro (unlimited exports)"
            : state.plan === "credits"
              ? `Credit pack — ${state.creditsRemaining} remaining`
              : "Free"}
        </span>
      </p>
      <div className="mt-3 flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={TEST_MODE ? "DEV-UNLOCK or DEV-CREDITS" : "Paste your license key"}
          aria-label="License key"
          className="figures flex-1 rounded-sm border border-rule px-2 py-1.5"
        />
        <button
          type="button"
          disabled={busy}
          onClick={activate}
          className="rounded-sm bg-ink px-4 py-1.5 font-medium text-white hover:bg-ink/85 disabled:opacity-50"
        >
          Activate
        </button>
      </div>
      {message && <p className="mt-2 text-xs text-ink-soft">{message}</p>}
      <p className="mt-2 text-xs text-ink-soft">
        Keys are verified once and cached locally — exporting works offline
        afterwards.
      </p>
    </div>
  );
}
