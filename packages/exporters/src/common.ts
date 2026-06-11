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
 * Deterministic FNV-1a 64-bit hash, hex-encoded. Used for FITIDs: stable
 * across exports of the same statement so banks/QuickBooks dedupe correctly,
 * unique per transaction because the index is included.
 */
export function fnv1a64(input: string): string {
  let hi = 0xcbf29ce4;
  let lo = 0x84222325;
  for (let i = 0; i < input.length; i++) {
    lo ^= input.charCodeAt(i);
    // 64-bit multiply by FNV prime 0x100000001b3, split into 32-bit halves.
    const newLo = (lo & 0xffff) * 0x1b3 + (((lo >>> 16) * 0x1b3) << 16);
    hi = (hi * 0x1b3 + Math.floor(lo / 0x10000) * 0x100 + (newLo > 0xffffffff ? 1 : 0)) >>> 0;
    lo = newLo >>> 0;
    hi = (hi + lo * 0x100) >>> 0; // fold the 2^32 carry of the prime's high bit
  }
  return (
    hi.toString(16).padStart(8, "0") + lo.toString(16).padStart(8, "0")
  );
}

/** FITID per spec §6: hash of date + amount + description + index. */
export function fitid(t: Transaction, index: number): string {
  return fnv1a64(`${t.date}|${t.amountCents}|${t.description}|${index}`);
}
