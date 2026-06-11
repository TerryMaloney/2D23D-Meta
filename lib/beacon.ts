"use client";

/**
 * Internal event beacon.
 *
 * PRIVACY RESTRICTION (do not relax): payloads may contain ONLY the enum
 * values and numbers listed below. Never filenames, amounts, descriptions,
 * account data, or anything else derived from file contents.
 */

export type BeaconEvent =
  | { event: "parse_attempt" }
  | { event: "parse_success"; template: string; durationMs: number }
  | { event: "parse_failed"; errorType: string }
  | { event: "reconciliation"; status: "verified" | "partial" | "failed" }
  | { event: "export"; format: "csv" | "xlsx" | "qbo" | "qfx" | "ofx" | "xero" }
  | { event: "paywall_hit" }
  | { event: "purchase_click" };

export function beacon(payload: BeaconEvent): void {
  try {
    if (typeof navigator === "undefined") return;
    // Same-origin Pages Function; fire-and-forget, never blocks the UI and
    // failure is invisible (the converter must work offline).
    navigator.sendBeacon?.(
      "/api/event",
      new Blob([JSON.stringify(payload)], { type: "application/json" }),
    );
  } catch {
    /* analytics must never break the product */
  }
}
