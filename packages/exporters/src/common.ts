/**
 * Shared helpers for all export writers.
 */

import type { ParsedStatement, Transaction } from "@parser/types";

export type { ParsedStatement, Transaction };

export type DateStyle = "MM/DD/YYYY" | "DD/MM/YYYY" | "ISO";

export function formatDate(iso: string, style: DateStyle): string {
  const [y, m, d] = iso.split("-");
  switch (style) {
    case "MM/DD/YYYY":
      return `${m}/${d}/${y}`;
    case "DD/MM/YYYY":
      return `${d}/${m}/${y}`;
    case "ISO":
      return iso;
  }
}

/** Integer cents → plain signed decimal string ("-1234.56"). */
export function centsToDecimal(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

/**
 * Deterministic hash for FITIDs: stable across exports of the same statement
 * so banks/QuickBooks dedupe correctly, unique per transaction because the
 * index is included. Implementation shared with the audit engine.
 */
export { fnv1a64 } from "@parser/hash";
import { fnv1a64 } from "@parser/hash";

/** FITID per spec §6: hash of date + amount + description + index. */
export function fitid(t: Transaction, index: number): string {
  return fnv1a64(`${t.date}|${t.amountCents}|${t.description}|${index}`);
}
