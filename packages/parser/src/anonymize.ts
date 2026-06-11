/**
 * Anonymized layout generation — shared by the browser failure reporter and
 * the Node-side layout-twin tooling.
 *
 * Rules (shown to users before anything is downloaded):
 * - geometry and structure preserved (x, y, width, font-size approximation)
 * - statement vocabulary (Balance, Deposits, month names…) kept verbatim,
 *   because layout detection depends on it
 * - date-shaped tokens become valid random dates IN THE SAME FORMAT (so a
 *   layout twin still parses), but never the original date
 * - plausible year tokens (1990–2035) are kept — a year alone is not PII —
 *   so statement periods remain detectable
 * - every other word is replaced by a deterministic hash token; originals
 *   are not recoverable
 * - every other number is replaced by a random number of identical shape;
 *   account-number-length digit runs are stripped to '#'
 */

import { detectDate } from "./dates";
import type { RawPage } from "./types";

const KEEP_WORDS = new Set(
  (
    "balance beginning ending opening closing new previous total totals deposit deposits withdrawal withdrawals credit credits debit debits addition additions subtraction subtractions payment payments purchase purchases fee fees interest date description amount check checks transaction transactions detail activity summary account statement period through from to page of continued daily ledger checking savings card member jan feb mar apr may jun jul aug sep oct nov dec january february march april june july august september october november december monday tuesday wednesday thursday friday saturday sunday usd eur gbp cad cr dr"
  ).split(" "),
);

function hashToken(word: string): string {
  let h = 2166136261;
  for (let i = 0; i < word.length; i++) {
    h ^= word.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const letters = "abcdefghijklmnopqrstuvwxyz";
  let out = "";
  let v = h >>> 0;
  const len = Math.min(Math.max(word.length, 2), 10);
  for (let i = 0; i < len; i++) {
    out += letters[v % 26];
    v = Math.imul(v, 1103515245) + 12345;
    v >>>= 0;
  }
  return out;
}

function scrambleNumber(token: string): string {
  // SSN-shaped tokens and account-number-length CONSECUTIVE digit runs are
  // stripped entirely. (Total digit count would wrongly catch large amounts
  // like 18,885.36, whose runs are short.)
  if (/^\d{3}-\d{2}-\d{4}$/.test(token) || /\d{7,}/.test(token)) {
    return token.replace(/\d/g, "#");
  }
  return token.replace(/\d/g, () => String(Math.floor(Math.random() * 10)));
}

/** Replace a date with a valid random date in the same textual format. */
function randomDateLike(token: string): string {
  const month = 1 + Math.floor(Math.random() * 12);
  const day = 1 + Math.floor(Math.random() * 28);
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");

  let m = token.match(/^(\d{1,2})([/-])(\d{1,2})(?:([/-])(\d{2}|\d{4}))?$/);
  if (m) {
    const sep = m[2];
    let out = `${mm}${sep}${dd}`;
    if (m[5]) out += `${m[4]}${m[5].length === 2 ? "26" : "2026"}`;
    return out;
  }
  m = token.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return `2026-${mm}-${dd}`;
  // "28 DEC" / "Dec 28" shapes keep their month word (kept vocabulary) and
  // only the day digits are replaced by the generic number path.
  return scrambleNumber(token);
}

/** Plausible year tokens are kept; a year alone identifies nobody. */
function isYearToken(token: string): boolean {
  const m = token.match(/^(\d{4})[,.]?$/);
  if (!m) return false;
  const y = Number(m[1]);
  return y >= 1990 && y <= 2035;
}

export function anonymizeToken(token: string): string {
  if (!token) return token;
  const lower = token.toLowerCase().replace(/[^a-z]/g, "");
  if (lower && KEEP_WORDS.has(lower)) return token;
  if (isYearToken(token)) return token;
  if (/^\d{1,2}[/-]\d{1,2}([/-]\d{2,4})?$/.test(token) || /^\d{4}-\d{2}-\d{2}$/.test(token)) {
    if (detectDate(token)) return randomDateLike(token);
  }
  // Bare 1–2 digit tokens (day numbers in "January 31, 2026" or "28 DEC")
  // become valid day numbers so period/date detection still works on twins.
  const day = token.match(/^\d{1,2}([,.]?)$/);
  if (day) return `${1 + Math.floor(Math.random() * 28)}${day[1]}`;
  if (/\d/.test(token) && !/[a-zA-Z]/.test(token)) return scrambleNumber(token);
  if (/[a-zA-Z]/.test(token)) return hashToken(token);
  return token;
}

export interface AnonymizedItem {
  str: string;
  /** Left edge (PDF bottom-left coordinate space, as extracted). */
  x: number;
  /** Baseline y (PDF bottom-left coordinate space). */
  y: number;
  /** Width of the original text run. */
  w: number;
  /** Font-size approximation. */
  s: number;
}

export interface AnonymizedLayout {
  generator: "statementclear-failure-reporter";
  version: 2;
  /** What went wrong, as reported by the engine — enum only. */
  errorType: string;
  pageCount: number;
  /** Page height in PDF points (for faithful reconstruction). */
  pageHeight: number;
  pages: {
    page: number;
    items: AnonymizedItem[];
  }[];
}

export function anonymizeLayout(pages: RawPage[], errorType: string): AnonymizedLayout {
  return {
    generator: "statementclear-failure-reporter",
    version: 2,
    errorType,
    pageCount: pages.length,
    pageHeight: pages[0]?.pageHeight ?? 792,
    pages: pages.map((p) => ({
      page: p.pageNumber,
      items: p.items
        .filter((i) => i.str.trim())
        .map((i) => ({
          str: i.str
            .trim()
            .split(/\s+/)
            .map(anonymizeToken)
            .join(" "),
          x: Math.round(i.transform[4]),
          y: Math.round(i.transform[5]),
          w: Math.round(i.width),
          s: Math.round(Math.abs(i.transform[3]) || Math.abs(i.transform[0]) || 10),
        })),
    })),
  };
}
