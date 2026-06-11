/**
 * Layer 2 — Row reconstruction.
 *
 * Clusters positioned text into visual rows, sorts within rows, detects
 * column boundaries from an x-position histogram, and strips repeating page
 * furniture (headers/footers/page numbers).
 */

import { PositionedText } from "./types";

export interface Row {
  page: number;
  /** Top y of the row (min y of its items). */
  y: number;
  /** Items sorted left → right. */
  items: PositionedText[];
}

/** Concatenated row text with single spaces. */
export function rowText(row: Row): string {
  return row.items.map((i) => i.str).join(" ");
}

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/**
 * Cluster items into visual rows by y-coordinate. The tolerance is derived
 * from the median text height (half of it), not a magic constant, so dense
 * and airy layouts both cluster correctly.
 */
export function clusterRows(items: PositionedText[]): Row[] {
  const rows: Row[] = [];
  const heights = items.map((i) => i.height).filter((h) => h > 0);
  const tolerance = Math.max(2, median(heights) * 0.5);

  const byPage = new Map<number, PositionedText[]>();
  for (const item of items) {
    const arr = byPage.get(item.page) ?? [];
    arr.push(item);
    byPage.set(item.page, arr);
  }

  for (const [page, pageItems] of [...byPage.entries()].sort((a, b) => a[0] - b[0])) {
    const sorted = [...pageItems].sort((a, b) => a.y - b.y || a.x - b.x);
    let current: PositionedText[] = [];
    let currentY = -Infinity;
    for (const item of sorted) {
      if (current.length === 0 || Math.abs(item.y - currentY) <= tolerance) {
        current.push(item);
        // Anchor the row at its first item's y to avoid drift on slanted runs.
        if (current.length === 1) currentY = item.y;
      } else {
        rows.push(finishRow(page, current));
        current = [item];
        currentY = item.y;
      }
    }
    if (current.length) rows.push(finishRow(page, current));
  }
  return rows;
}

function finishRow(page: number, items: PositionedText[]): Row {
  const sorted = [...items].sort((a, b) => a.x - b.x);
  return { page, y: Math.min(...items.map((i) => i.y)), items: sorted };
}

const FURNITURE_PATTERNS = [
  /^page \d+( of \d+)?$/i,
  /^\d+ of \d+$/,
  /^-\s*\d+\s*-$/,
  /continued on (the )?next page/i,
  /\(continued\)/i,
  /^member fdic/i,
  /^equal housing lender/i,
];

/**
 * Strip repeating page furniture:
 *  - rows matching known footer patterns (page numbers, "continued…")
 *  - rows whose normalized text recurs at (nearly) the same y on 2+ pages
 *    (running headers/footers, legal disclaimers)
 */
export function stripFurniture(rows: Row[], pageCount: number): Row[] {
  if (pageCount < 1) return rows;

  // Build recurrence map: text → set of pages where it appears at similar y.
  const seen = new Map<string, { pages: Set<number>; ys: number[] }>();
  for (const row of rows) {
    const key = rowText(row).replace(/\d+/g, "#"); // "Page 1" ≈ "Page 2"
    const entry = seen.get(key) ?? { pages: new Set(), ys: [] };
    entry.pages.add(row.page);
    entry.ys.push(row.y);
    seen.set(key, entry);
  }

  return rows.filter((row) => {
    const text = rowText(row);
    if (FURNITURE_PATTERNS.some((p) => p.test(text.trim()))) return false;
    if (pageCount >= 2) {
      const key = text.replace(/\d+/g, "#");
      const entry = seen.get(key)!;
      const ySpread = Math.max(...entry.ys) - Math.min(...entry.ys);
      // Recurs on most pages at a stable y → running header/footer.
      if (entry.pages.size >= Math.max(2, Math.ceil(pageCount * 0.6)) && ySpread < 24) {
        return false;
      }
    }
    return true;
  });
}

export interface ColumnBoundaries {
  /** Left x of each detected column, ascending. */
  starts: number[];
}

/**
 * Detect column boundaries from an x-position histogram across rows.
 * Item left-edges cluster at column starts; we bucket x positions and keep
 * peaks that appear in a meaningful share of rows.
 */
export function detectColumns(rows: Row[], bucketSize = 8): ColumnBoundaries {
  const histogram = new Map<number, number>();
  for (const row of rows) {
    for (const item of row.items) {
      const bucket = Math.round(item.x / bucketSize) * bucketSize;
      histogram.set(bucket, (histogram.get(bucket) ?? 0) + 1);
    }
  }
  if (rows.length === 0) return { starts: [] };

  const threshold = Math.max(2, rows.length * 0.25);
  const peaks = [...histogram.entries()]
    .filter(([, count]) => count >= threshold)
    .map(([x]) => x)
    .sort((a, b) => a - b);

  // Merge peaks closer than 2 buckets (same visual column).
  const starts: number[] = [];
  for (const p of peaks) {
    if (starts.length === 0 || p - starts[starts.length - 1] > bucketSize * 2) {
      starts.push(p);
    }
  }
  return { starts };
}

/** Index of the column (in `boundaries.starts`) an item belongs to. */
export function columnIndexOf(x: number, boundaries: ColumnBoundaries, bucketSize = 8): number {
  const { starts } = boundaries;
  if (starts.length === 0) return 0;
  for (let i = starts.length - 1; i >= 0; i--) {
    if (x >= starts[i] - bucketSize * 1.5) return i;
  }
  return 0;
}
