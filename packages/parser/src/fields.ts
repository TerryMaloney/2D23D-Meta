/**
 * Layer 3 — Field detection within reconstructed rows.
 *
 * Pure classifiers: which items in a row are dates, amounts, check numbers.
 * The generic parser and template engine build transactions from these.
 */

import { detectDate, DetectedDate } from "./dates";
import { looksLikeAmount, parseAmount, NumberLocale, ParsedAmount } from "./money";
import { PositionedText } from "./types";
import { Row } from "./rows";

export interface RowDateCell {
  itemIndex: number;
  date: DetectedDate;
}

export interface RowAmountCell {
  itemIndex: number;
  amount: ParsedAmount;
  /** Right edge — amounts are right-aligned, so columns cluster on this. */
  rightX: number;
}

export interface ClassifiedRow {
  row: Row;
  dates: RowDateCell[];
  amounts: RowAmountCell[];
  /** Items that are neither dates nor amounts, in x order. */
  textItems: PositionedText[];
}

/**
 * A date cell must sit in the left half of the row's items to count as a
 * transaction date (dates inside descriptions like "TRANSFER ON 12/02" are
 * part of the text). We approximate: only the first two non-empty items can
 * be transaction dates.
 */
export function classifyRow(row: Row, locale: NumberLocale = "us"): ClassifiedRow {
  const dates: RowDateCell[] = [];
  const amounts: RowAmountCell[] = [];
  const textItems: PositionedText[] = [];

  row.items.forEach((item, i) => {
    const asDate = i < 2 ? detectDate(item.str) : null;
    if (asDate) {
      dates.push({ itemIndex: i, date: asDate });
      return;
    }
    if (looksLikeAmount(item.str, locale)) {
      const amount = parseAmount(item.str, locale)!;
      amounts.push({ itemIndex: i, amount, rightX: item.x + item.width });
      return;
    }
    textItems.push(item);
  });

  return { row, dates, amounts, textItems };
}

/** True when the row starts with a date — the signature of a transaction row. */
export function isTransactionRow(c: ClassifiedRow): boolean {
  return c.dates.length > 0 && c.dates[0].itemIndex === 0 && c.amounts.length > 0;
}

/**
 * A continuation row: no date, no amount, but text — likely the second line
 * of a multi-line description.
 */
export function isContinuationRow(c: ClassifiedRow): boolean {
  return c.dates.length === 0 && c.amounts.length === 0 && c.textItems.length > 0;
}

/** Detect a check number: a bare 3-6 digit integer, optionally starred. */
export function detectCheckNumber(s: string): string | null {
  const m = s.trim().match(/^(\d{3,6})\s?\*?$/);
  return m ? m[1] : null;
}

/**
 * Cluster amount cells from many rows into vertical columns by right edge.
 * Returns column right-x centers, ascending (leftmost column first).
 */
export function clusterAmountColumns(
  rows: ClassifiedRow[],
  tolerance = 14,
): number[] {
  const edges: number[] = [];
  for (const r of rows) for (const a of r.amounts) edges.push(a.rightX);
  edges.sort((a, b) => a - b);

  const clusters: { center: number; members: number[] }[] = [];
  for (const e of edges) {
    const last = clusters[clusters.length - 1];
    if (last && e - last.center <= tolerance) {
      last.members.push(e);
      last.center = last.members.reduce((s, v) => s + v, 0) / last.members.length;
    } else {
      clusters.push({ center: e, members: [e] });
    }
  }
  // Keep columns that appear in at least 20% of transaction rows (drops
  // stray amounts inside descriptions).
  const minMembers = Math.max(2, rows.length * 0.2);
  return clusters
    .filter((c) => c.members.length >= minMembers)
    .map((c) => c.center);
}

/** Which amount column (index into `columns`) a cell belongs to, or -1. */
export function amountColumnIndex(
  cell: RowAmountCell,
  columns: number[],
  tolerance = 14,
): number {
  let best = -1;
  let bestDist = Infinity;
  columns.forEach((cx, i) => {
    const d = Math.abs(cell.rightX - cx);
    if (d <= tolerance && d < bestDist) {
      best = i;
      bestDist = d;
    }
  });
  return best;
}
