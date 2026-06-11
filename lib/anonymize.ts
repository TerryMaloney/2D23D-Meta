"use client";

/**
 * Opt-in failure reporter: builds an anonymized layout JSON from a document
 * that failed to parse or reconcile, so its layout can become a new bank
 * template.
 *
 * Anonymization rules (shown to the user before download):
 * - geometry and structure preserved (x, y, width, page, text length)
 * - every word that contains a letter is replaced by a deterministic hash
 *   token of the same length class — original text is NOT recoverable
 * - every number is replaced by a random number of identical magnitude and
 *   format (digit count, separators, decimals preserved)
 * - long digit runs (account numbers) are stripped to "#"
 * - known statement vocabulary (balance, deposit, date words…) is kept
 *   verbatim, because layout detection depends on it
 */

import type { RawPage } from "@parser/types";

const KEEP_WORDS = new Set(
  (
    "balance beginning ending opening closing new previous total totals deposit deposits withdrawal withdrawals credit credits debit debits addition additions subtraction subtractions payment payments purchase purchases fee fees interest date description amount check checks transaction transactions detail activity summary account statement period through from to page of continued daily ledger checking savings card member jan feb mar apr may jun jul aug sep oct nov dec january february march april june july august september october november december monday tuesday wednesday thursday friday saturday sunday usd eur gbp cad"
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
  // Account-number-length digit runs are stripped entirely.
  if (/\d{7,}/.test(token.replace(/[^\d]/g, ""))) return token.replace(/\d/g, "#");
  return token.replace(/\d/g, () => String(Math.floor(Math.random() * 10)));
}

export function anonymizeToken(token: string): string {
  if (!token) return token;
  const lower = token.toLowerCase().replace(/[^a-z]/g, "");
  if (lower && KEEP_WORDS.has(lower)) return token;
  if (/\d/.test(token) && !/[a-zA-Z]/.test(token)) return scrambleNumber(token);
  if (/[a-zA-Z]/.test(token)) return hashToken(token);
  return token;
}

export interface AnonymizedLayout {
  generator: "statementclear-failure-reporter";
  version: 1;
  /** What went wrong, as reported by the engine — enum only. */
  errorType: string;
  pageCount: number;
  pages: {
    page: number;
    items: { str: string; x: number; y: number; w: number }[];
  }[];
}

export function anonymizeLayout(pages: RawPage[], errorType: string): AnonymizedLayout {
  return {
    generator: "statementclear-failure-reporter",
    version: 1,
    errorType,
    pageCount: pages.length,
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
        })),
    })),
  };
}
