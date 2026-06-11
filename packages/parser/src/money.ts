/**
 * Amount detection and parsing. All results are integer cents.
 */

export type NumberLocale = "us" | "eu";

export interface ParsedAmount {
  cents: number;
  /** True when the text itself carried sign information. */
  explicitSign: boolean;
  /** "CR" / "DR" marker seen, if any. */
  marker?: "CR" | "DR";
}

const CURRENCY_PREFIX = /^[$€£]\s?/;

// US style: 1,234.56 | 1234.56 | 1,234 | .56 — thousands groups must be valid.
const US_NUM = /^(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?$|^\.\d{1,2}$/;
// EU style: 1.234,56 | 1234,56
const EU_NUM = /^(?:\d{1,3}(?:\.\d{3})+|\d+)(?:,\d{1,2})?$/;

/**
 * Parse a string that is believed to be a monetary amount.
 * Returns null when the text is not a plausible amount.
 *
 * Handles: $1,234.56 · (1,234.56) = negative · trailing minus 1234.56- ·
 * leading minus · CR/DR suffixes · European 1.234,56 (when locale is "eu",
 * or unambiguous).
 */
export function parseAmount(
  raw: string,
  locale: NumberLocale = "us",
): ParsedAmount | null {
  let s = raw.trim();
  if (!s) return null;

  let negative = false;
  let explicitSign = false;
  let marker: "CR" | "DR" | undefined;

  // CR/DR suffix (Citi-style: "123.45 CR" means a credit).
  const markerMatch = s.match(/\s*(CR|DR)\.?$/i);
  if (markerMatch) {
    marker = markerMatch[1].toUpperCase() as "CR" | "DR";
    explicitSign = true;
    if (marker === "DR") negative = true;
    s = s.slice(0, markerMatch.index).trim();
  }

  // Parentheses = negative (accounting convention).
  if (s.startsWith("(") && s.endsWith(")")) {
    negative = true;
    explicitSign = true;
    s = s.slice(1, -1).trim();
  }

  // Leading sign, before or after a currency symbol: -$1.23 or $-1.23.
  if (s.startsWith("-") || s.startsWith("−")) {
    negative = true;
    explicitSign = true;
    s = s.slice(1).trim();
  } else if (s.startsWith("+")) {
    explicitSign = true;
    s = s.slice(1).trim();
  }
  s = s.replace(CURRENCY_PREFIX, "");
  if (s.startsWith("-") || s.startsWith("−")) {
    negative = true;
    explicitSign = true;
    s = s.slice(1).trim();
  }

  // Trailing minus: "1234.56-".
  if (s.endsWith("-")) {
    negative = true;
    explicitSign = true;
    s = s.slice(0, -1).trim();
  }

  if (!s || /[A-Za-z]/.test(s)) return null;

  let intPart: string;
  let fracPart: string;

  const usOk = US_NUM.test(s);
  const euOk = EU_NUM.test(s);

  // Disambiguate: "1.234" is EU thousands but also a US decimal with 3 places —
  // US_NUM rejects 3 decimal places, so the regexes rarely overlap. When both
  // match (plain integers like "1234"), the result is identical either way.
  let useEu: boolean;
  if (usOk && euOk) useEu = locale === "eu";
  else if (usOk) useEu = false;
  else if (euOk) useEu = locale === "eu" || /,\d{1,2}$/.test(s) || /\.\d{3}/.test(s);
  else return null;

  if (useEu) {
    const m = s.match(/^(.*?)(?:,(\d{1,2}))?$/);
    intPart = (m![1] || "0").replace(/\./g, "");
    fracPart = m![2] ?? "";
  } else {
    const m = s.match(/^(.*?)(?:\.(\d{1,2}))?$/);
    intPart = (m![1] || "0").replace(/,/g, "");
    fracPart = m![2] ?? "";
  }

  if (!/^\d*$/.test(intPart)) return null;
  const cents =
    parseInt(intPart || "0", 10) * 100 +
    parseInt((fracPart + "00").slice(0, 2), 10);
  if (!Number.isFinite(cents)) return null;

  return { cents: negative ? -cents : cents, explicitSign, marker };
}

/**
 * Quick test: does this string look like a monetary amount?
 * Stricter than parseAmount — requires a decimal part or thousands separator
 * or currency symbol, so bare integers like check numbers don't count.
 */
export function looksLikeAmount(raw: string, locale: NumberLocale = "us"): boolean {
  const s = raw.trim();
  if (!s) return false;
  const hasMoneyShape =
    locale === "eu"
      ? /\d,\d{2}\b|\d\.\d{3}\b|[$€£]/.test(s)
      : /\d\.\d{1,2}\b|\d,\d{3}\b|[$€£]/.test(s);
  return hasMoneyShape && parseAmount(s, locale) !== null;
}

/** Format integer cents as a plain decimal string, e.g. -123456 -> "-1234.56". */
export function centsToDecimal(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

/** Format integer cents for display: -123456 -> "-1,234.56". */
export function formatCents(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const int = Math.floor(abs / 100).toLocaleString("en-US");
  return `${sign}${int}.${String(abs % 100).padStart(2, "0")}`;
}
