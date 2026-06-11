"use client";

/**
 * Licensing. No accounts, no database: a license key (from the payment
 * provider) is verified through one serverless function and cached in
 * localStorage with periodic revalidation and graceful offline behavior.
 *
 * TEST_MODE (NEXT_PUBLIC_TEST_MODE=true): the dev key "DEV-UNLOCK" grants
 * Pro and "DEV-CREDITS" grants a 15-credit pack, so the whole flow can be
 * exercised before real payment-provider keys exist.
 */

export interface LicenseState {
  plan: "free" | "credits" | "pro";
  /** Remaining document exports, when plan === "credits". */
  creditsRemaining?: number;
  key?: string;
  /** Epoch ms of the last successful verification. */
  validatedAt?: number;
}

const STORAGE_KEY = "statementclear.license.v1";
/** Revalidate weekly; tolerate 30 days offline before dropping to free. */
const REVALIDATE_MS = 7 * 24 * 3600 * 1000;
const GRACE_MS = 30 * 24 * 3600 * 1000;

export const TEST_MODE = process.env.NEXT_PUBLIC_TEST_MODE === "true";

export function loadLicense(): LicenseState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { plan: "free" };
    const state = JSON.parse(raw) as LicenseState;
    if (
      state.plan !== "free" &&
      state.validatedAt !== undefined &&
      Date.now() - state.validatedAt > GRACE_MS
    ) {
      return { ...state, plan: "free" };
    }
    return state;
  } catch {
    return { plan: "free" };
  }
}

export function saveLicense(state: LicenseState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* private browsing: licensing degrades to per-session */
  }
}

export interface VerifyResult {
  ok: boolean;
  state?: LicenseState;
  error?: string;
}

/** Activate/verify a key through the serverless proxy. */
export async function verifyKey(key: string): Promise<VerifyResult> {
  const trimmed = key.trim();
  if (!trimmed) return { ok: false, error: "Enter a license key." };

  if (TEST_MODE) {
    if (trimmed === "DEV-UNLOCK") {
      const state: LicenseState = { plan: "pro", key: trimmed, validatedAt: Date.now() };
      saveLicense(state);
      return { ok: true, state };
    }
    if (trimmed === "DEV-CREDITS") {
      const state: LicenseState = {
        plan: "credits",
        creditsRemaining: 15,
        key: trimmed,
        validatedAt: Date.now(),
      };
      saveLicense(state);
      return { ok: true, state };
    }
    return { ok: false, error: "Unknown test key. Use DEV-UNLOCK or DEV-CREDITS." };
  }

  try {
    const res = await fetch("/api/license/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ key: trimmed }),
    });
    const data = (await res.json()) as {
      valid: boolean;
      plan?: "credits" | "pro";
      creditsRemaining?: number;
      error?: string;
    };
    if (!data.valid) {
      return { ok: false, error: data.error ?? "That key isn't valid. Check for typos and try again." };
    }
    const state: LicenseState = {
      plan: data.plan ?? "pro",
      creditsRemaining: data.creditsRemaining,
      key: trimmed,
      validatedAt: Date.now(),
    };
    saveLicense(state);
    return { ok: true, state };
  } catch {
    return {
      ok: false,
      error: "Couldn't reach the license server. Check your connection and try again — converting still works offline.",
    };
  }
}

/** Re-verify quietly in the background when the cached result is stale. */
export async function revalidateIfStale(state: LicenseState): Promise<LicenseState> {
  if (state.plan === "free" || !state.key || !state.validatedAt) return state;
  if (Date.now() - state.validatedAt < REVALIDATE_MS) return state;
  const result = await verifyKey(state.key);
  // Offline or server trouble: keep the cached plan (grace period applies).
  return result.ok && result.state ? result.state : state;
}

/** Spend one export credit. Returns the updated state. */
export async function consumeCredit(state: LicenseState): Promise<LicenseState> {
  if (state.plan !== "credits") return state;
  const remaining = Math.max(0, (state.creditsRemaining ?? 0) - 1);

  if (!TEST_MODE && state.key) {
    try {
      // Server-side decrement keeps credits honest across devices.
      await fetch("/api/license/consume", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ key: state.key }),
      });
    } catch {
      /* offline: local decrement still applies; server reconciles later */
    }
  }

  const next: LicenseState = {
    ...state,
    creditsRemaining: remaining,
    plan: remaining > 0 ? "credits" : "free",
    ...(remaining === 0 ? {} : {}),
  };
  if (remaining === 0) {
    // Keep the key so a future top-up reuses it, but the plan is free now.
    next.plan = "free";
  }
  saveLicense(next);
  return next;
}

/** Can this many transactions be exported under the current plan? */
export function canExport(state: LicenseState, transactionCount: number, freeCap: number): boolean {
  if (state.plan === "pro") return true;
  if (state.plan === "credits" && (state.creditsRemaining ?? 0) > 0) return true;
  return transactionCount <= freeCap;
}
