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
 * part of the text). We approximate: only the first three items can be
 * transaction dates — covering Date-first layouts, two-date pairs (Capital
 * One), and Description | Date | Amount layouts (Commerce Bank style).
 */
export function classifyRow(row: Row, locale: NumberLocale = "us"): ClassifiedRow {
  const dates: RowDateCell[] = [];
  const amounts: RowAmountCell[] = [];
  const textItems: PositionedText[] = [];

  row.items.forEach((item, i) => {
    const asDate = i < 4 ? detectDate(item.str) : null;
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

/**
 * True when the row carries a transaction-date cell and an amount. The date
 * is usually the first item, but Description | Date | Amount layouts put it
 * second or third (real-world: Commerce Bank's "Deposit Ref Nbr … 05-15
 * $3,615.08").
 */
export function isTransactionRow(c: ClassifiedRow): boolean {
  if (c.dates.length === 0 || c.amounts.length === 0) return false;
  const dateIdx = c.dates[0].itemIndex;
  // Date leads the row, or sits directly before the first amount after
  // reference/description columns (real-world: Commerce Bank's
  // "Deposit | Ref Nbr: | 130012345 | 05-15 | $3,615.08").
  return dateIdx <= 2 || dateIdx === c.amounts[0].itemIndex - 1;
}

/**
 * Summary grids print several value pairs per visual row and must not be
 * read as transactions (real-world: Carson Bank). Two shapes:
 *  - daily-balance grids: "07/16 $942.83 07/25 $842.83 07/24 $7,285.72"
 *  - checks-paid grids:   "4421 07/12/19 $12.53 4423 07/19/19 $114.00 …"
 * Signature: ≥2 amounts, ≥2 date-shaped cells overall, and every remaining
 * text item is itself a date, a check number, or a break marker (*).
 */
export function isBalanceGridRow(c: ClassifiedRow): boolean {
  const dateish =
    c.dates.length + c.textItems.filter((t) => detectDate(t.str) !== null).length;
  return (
    dateish >= 2 &&
    c.amounts.length >= 2 &&
    c.textItems.every(
      (t) =>
        detectDate(t.str) !== null ||
        detectCheckNumber(t.str) !== null ||
        t.str.trim() === "*",
    )
  );
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
