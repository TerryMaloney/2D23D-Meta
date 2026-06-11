/**
 * Date detection and year inference.
 *
 * Statement rows frequently omit the year ("12/28", "28 Dec"). The year is
 * inferred from the statement period, with correct handling of periods that
 * cross a year boundary (Dec→Jan).
 */

export interface DetectedDate {
  month: number; // 1-12
  day: number; // 1-31
  year?: number; // present only when the text included it
}

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
  january: 1, february: 2, march: 3, april: 4, june: 6, july: 7,
  august: 8, september: 9, october: 10, november: 11, december: 12,
};

function monthFromName(name: string): number | undefined {
  return MONTHS[name.toLowerCase().replace(/\.$/, "")];
}

function valid(month: number, day: number): boolean {
  return month >= 1 && month <= 12 && day >= 1 && day <= 31;
}

/**
 * Detect a date in a string. Returns null if the string is not a date.
 * Supported: MM/DD, MM/DD/YY, MM/DD/YYYY, M/D, DD MMM, MMM DD, MMM DD YYYY,
 * "December 28, 2025", ISO YYYY-MM-DD.
 */
export function detectDate(raw: string): DetectedDate | null {
  const s = raw.trim();
  if (!s) return null;

  // ISO: 2025-12-28
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) {
    const [, y, mo, d] = m.map(Number) as unknown as number[];
    return valid(mo, d) ? { year: y, month: mo, day: d } : null;
  }

  // MM/DD, MM/DD/YY, MM/DD/YYYY (also with '-' separator)
  m = s.match(/^(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2}|\d{4}))?$/);
  if (m) {
    const mo = Number(m[1]);
    const d = Number(m[2]);
    if (!valid(mo, d)) return null;
    let year: number | undefined;
    if (m[3]) {
      year = Number(m[3]);
      if (year < 100) year += year >= 70 ? 1900 : 2000;
    }
    return { month: mo, day: d, year };
  }

  // DD MMM / DD MMM YYYY  (Citi style: "28 DEC")
  m = s.match(/^(\d{1,2})\s+([A-Za-z]{3,9})\.?(?:,?\s+(\d{4}))?$/);
  if (m) {
    const mo = monthFromName(m[2]);
    const d = Number(m[1]);
    if (mo === undefined || !valid(mo, d)) return null;
    return { month: mo, day: d, year: m[3] ? Number(m[3]) : undefined };
  }

  // MMM DD / MMM DD, YYYY  ("Dec 28", "December 28, 2025")
  m = s.match(/^([A-Za-z]{3,9})\.?\s+(\d{1,2})(?:,?\s+(\d{4}))?$/);
  if (m) {
    const mo = monthFromName(m[1]);
    const d = Number(m[2]);
    if (mo === undefined || !valid(mo, d)) return null;
    return { month: mo, day: d, year: m[3] ? Number(m[3]) : undefined };
  }

  return null;
}

export interface StatementPeriod {
  /** ISO dates. */
  start: string;
  end: string;
}

/** Format (y, m, d) as ISO. */
export function iso(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Find a statement period in free text, e.g.
 * "January 1, 2026 through January 31, 2026", "12/01/25 - 12/31/25",
 * "Statement period: 28 Nov 2025 to 27 Dec 2025".
 */
export function detectPeriod(text: string): StatementPeriod | null {
  // Pattern A: <Month DD, YYYY> (through|to|-) <Month DD, YYYY>
  const wordDate = "([A-Za-z]{3,9}\\.?\\s+\\d{1,2},?\\s+\\d{4})";
  const sep = "\\s*(?:through|thru|to|–|—|-)\\s*";
  let m = text.match(new RegExp(wordDate + sep + wordDate, "i"));
  if (m) {
    const a = detectDate(m[1].replace(/\s+/g, " "));
    const b = detectDate(m[2].replace(/\s+/g, " "));
    if (a?.year && b?.year)
      return { start: iso(a.year, a.month, a.day), end: iso(b.year, b.month, b.day) };
  }

  // Pattern B: numeric dates with years: 12/01/2025 - 12/31/2025
  const numDate = "(\\d{1,2}[/-]\\d{1,2}[/-](?:\\d{4}|\\d{2}))";
  m = text.match(new RegExp(numDate + sep + numDate));
  if (m) {
    const a = detectDate(m[1]);
    const b = detectDate(m[2]);
    if (a?.year && b?.year)
      return { start: iso(a.year, a.month, a.day), end: iso(b.year, b.month, b.day) };
  }

  // Pattern C: "DD MMM YYYY to DD MMM YYYY" (Wise style)
  const dmy = "(\\d{1,2}\\s+[A-Za-z]{3,9}\\.?\\s+\\d{4})";
  m = text.match(new RegExp(dmy + sep + dmy, "i"));
  if (m) {
    const a = detectDate(m[1]);
    const b = detectDate(m[2]);
    if (a?.year && b?.year)
      return { start: iso(a.year, a.month, a.day), end: iso(b.year, b.month, b.day) };
  }

  // Pattern D: ISO range: 2025-12-01 to 2025-12-31
  const isoDate = "(\\d{4}-\\d{2}-\\d{2})";
  m = text.match(new RegExp(isoDate + sep + isoDate));
  if (m) {
    const a = detectDate(m[1]);
    const b = detectDate(m[2]);
    if (a?.year && b?.year)
      return { start: iso(a.year, a.month, a.day), end: iso(b.year, b.month, b.day) };
  }

  // Pattern E: a lone closing date ("Statement closing date 3/22/2007",
  // real-world: Fed G-18(G), Amex). Synthesize a one-cycle period ending
  // there so year inference works.
  m = text.match(
    /(?:statement\s+)?closing\s+date:?\s+(\d{1,2}\/\d{1,2}\/(?:\d{4}|\d{2})|[A-Za-z]{3,9}\.?\s+\d{1,2},?\s+\d{4})/i,
  );
  if (m) {
    const end = detectDate(m[1].replace(/\s+/g, " "));
    if (end?.year) {
      const endMs = Date.parse(iso(end.year, end.month, end.day) + "T00:00:00Z");
      const start = new Date(endMs - 34 * 86400000);
      return {
        start: start.toISOString().slice(0, 10),
        end: iso(end.year, end.month, end.day),
      };
    }
  }

  return null;
}

/**
 * Resolve a possibly-yearless date to ISO using the statement period.
 *
 * Rule: try the years spanned by the period (and one year before the start,
 * for posting-lag edge cases); pick the candidate that falls inside or
 * closest to the period. Handles Dec→Jan wraparound: in a
 * "Dec 15, 2025 – Jan 14, 2026" statement, "12/20" resolves to 2025 and
 * "01/05" resolves to 2026.
 */
export function resolveDate(
  d: DetectedDate,
  period?: StatementPeriod | null,
): string {
  if (d.year) return iso(d.year, d.month, d.day);

  if (!period) {
    // No period available: use the current year. Callers should lower
    // confidence when this branch is hit.
    return iso(new Date().getFullYear(), d.month, d.day);
  }

  const startY = Number(period.start.slice(0, 4));
  const endY = Number(period.end.slice(0, 4));
  const candidates: string[] = [];
  for (let y = startY - 1; y <= endY; y++) candidates.push(iso(y, d.month, d.day));

  const t = (s: string) => Date.parse(s + "T00:00:00Z");
  const ps = t(period.start);
  const pe = t(period.end);

  let best = candidates[0];
  let bestScore = Infinity;
  for (const c of candidates) {
    const tc = t(c);
    // 0 when inside the period, otherwise distance in ms to the nearest edge.
    const score = tc >= ps && tc <= pe ? 0 : Math.min(Math.abs(tc - ps), Math.abs(tc - pe));
    if (score < bestScore) {
      bestScore = score;
      best = c;
    }
  }
  return best;
}
