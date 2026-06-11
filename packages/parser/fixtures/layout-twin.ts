/**
 * Layout twin generator: reconstructs a synthetic, committable statement PDF
 * from an anonymized layout (the failure reporter's output).
 *
 * The twin preserves what matters for parser debugging — page structure,
 * column positions, section organization, label vocabulary, date formats —
 * while every amount is REGENERATED to be internally consistent: opening
 * balance + transactions = closing balance, running balances chain, printed
 * totals match. The result reconciles, contains zero original data beyond
 * generic statement vocabulary, and is safe to commit as a regression
 * fixture.
 */

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { AnonymizedItem, AnonymizedLayout } from "../src/anonymize";
import { detectDate } from "../src/dates";
import { looksLikeAmount, parseAmount } from "../src/money";

/* Deterministic RNG (mulberry32) so twins are stable. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface TwinItem extends AnonymizedItem {
  page: number;
  /** Replacement text decided during regeneration (null = keep). */
  replacement: string | null;
  /** Right-align the replacement to the original right edge. */
  rightAlign: boolean;
}

interface TwinRow {
  page: number;
  y: number;
  items: TwinItem[];
  text: string;
}

function clusterTwinRows(items: TwinItem[]): TwinRow[] {
  const rows: TwinRow[] = [];
  const byPage = new Map<number, TwinItem[]>();
  for (const it of items) {
    const arr = byPage.get(it.page) ?? [];
    arr.push(it);
    byPage.set(it.page, arr);
  }
  for (const [page, pageItems] of [...byPage.entries()].sort((a, b) => a[0] - b[0])) {
    // Bottom-left coordinates: read top→bottom means y descending.
    const sorted = [...pageItems].sort((a, b) => b.y - a.y || a.x - b.x);
    let current: TwinItem[] = [];
    let currentY = Infinity;
    for (const it of sorted) {
      if (current.length === 0 || Math.abs(it.y - currentY) <= 4) {
        current.push(it);
        if (current.length === 1) currentY = it.y;
      } else {
        rows.push(finishRow(page, current));
        current = [it];
        currentY = it.y;
      }
    }
    if (current.length) rows.push(finishRow(page, current));
  }
  return rows;
}

function finishRow(page: number, items: TwinItem[]): TwinRow {
  const sorted = [...items].sort((a, b) => a.x - b.x);
  return {
    page,
    y: sorted[0].y,
    items: sorted,
    text: sorted.map((i) => i.str).join(" "),
  };
}

/** Format cents in the visual style of the original token. */
function reformatLike(original: string, cents: number): string {
  const abs = Math.abs(cents);
  const grouped = /,\d{3}/.test(original) || abs >= 100000;
  let body = `${Math.floor(abs / 100)}`;
  if (grouped) body = Number(Math.floor(abs / 100)).toLocaleString("en-US");
  body += `.${String(abs % 100).padStart(2, "0")}`;
  const symbol = original.includes("$") ? "$" : "";

  if (/CR\.?$/i.test(original)) return cents < 0 ? `${body} CR` : body;
  if (/^\(.*\)$/.test(original)) return cents < 0 ? `(${symbol}${body})` : `${symbol}${body}`;
  if (/-$/.test(original.trim())) return cents < 0 ? `${body}-` : body;
  if (/^[+]/.test(original)) return `${cents < 0 ? "-" : "+"}${symbol}${body}`;
  return `${cents < 0 ? "-" : ""}${symbol}${body}`;
}

const OPENING_LABELS = /beginning balance|opening balance|previous balance|balance forward/i;
const CLOSING_LABELS = /ending balance|closing balance|new balance/i;
const CREDIT_TOTAL_LABELS = /total deposits|deposits and additions|total additions|total credits|new charges|purchases/i;
const DEBIT_TOTAL_LABELS = /total withdrawals|electronic withdrawals|total subtractions|total debits|payments and credits/i;

export interface TwinResult {
  pdf: Uint8Array;
  /** Generated ground truth, for golden assertions. */
  openingCents: number;
  closingCents: number;
  transactionCount: number;
}

export async function buildLayoutTwin(layout: AnonymizedLayout, seed = 42): Promise<TwinResult> {
  const rng = mulberry32(seed);
  const items: TwinItem[] = layout.pages.flatMap((p) =>
    p.items.map((i) => ({ ...i, page: p.page, replacement: null, rightAlign: false })),
  );
  const rows = clusterTwinRows(items);

  // ── identify transaction rows and their amount cells ────────────────
  interface TxRow {
    row: TwinRow;
    amountCells: TwinItem[];
  }
  const txRows: TxRow[] = [];
  for (const row of rows) {
    if (row.items.length === 0) continue;
    if (!detectDate(row.items[0].str.split(/\s+/).slice(0, 2).join(" ")) && !detectDate(row.items[0].str)) continue;
    if (OPENING_LABELS.test(row.text) || CLOSING_LABELS.test(row.text)) continue;
    const amountCells = row.items.filter((i) => looksLikeAmount(i.str));
    if (amountCells.length === 0) continue;
    txRows.push({ row, amountCells });
  }

  // Balance column: most tx rows carry a trailing second amount.
  const withTwo = txRows.filter((t) => t.amountCells.length >= 2).length;
  const hasBalanceColumn = txRows.length > 0 && withTwo / txRows.length >= 0.6;

  // ── regenerate consistent values ────────────────────────────────────
  const openingCents = 100000 + Math.floor(rng() * 1900000);
  let balance = openingCents;
  let creditSum = 0;
  let debitSum = 0;

  for (const t of txRows) {
    const amountCell = t.amountCells[0];
    const balanceCell = hasBalanceColumn ? t.amountCells[t.amountCells.length - 1] : undefined;
    const originallyNegative = (parseAmount(amountCell.str)?.cents ?? 0) < 0 || /CR\.?$/i.test(amountCell.str);
    const negative = originallyNegative || (!/CR/i.test(amountCell.str) && rng() < 0.55);
    // Deposits run larger than withdrawals so twins stay plausibly solvent.
    const magnitude = negative
      ? 500 + Math.floor(rng() * 60000)
      : 20000 + Math.floor(rng() * 250000);
    const cents = negative ? -magnitude : magnitude;
    if (cents > 0) creditSum += cents;
    else debitSum += cents;
    balance += cents;
    amountCell.replacement = reformatLike(amountCell.str, cents);
    amountCell.rightAlign = true;
    if (balanceCell && balanceCell !== amountCell) {
      balanceCell.replacement = reformatLike(balanceCell.str, balance);
      balanceCell.rightAlign = true;
    }
  }
  const closingCents = balance;

  // ── labeled summary rows get the matching consistent totals ─────────
  for (const row of rows) {
    const amountCells = row.items.filter((i) => looksLikeAmount(i.str));
    if (amountCells.length === 0) continue;
    const target = amountCells[amountCells.length - 1];
    if (target.replacement !== null) continue; // already a transaction cell
    if (OPENING_LABELS.test(row.text)) {
      target.replacement = reformatLike(target.str, openingCents);
    } else if (CLOSING_LABELS.test(row.text)) {
      target.replacement = reformatLike(target.str, closingCents);
    } else if (CREDIT_TOTAL_LABELS.test(row.text) && !DEBIT_TOTAL_LABELS.test(row.text)) {
      target.replacement = reformatLike(target.str, creditSum);
    } else if (DEBIT_TOTAL_LABELS.test(row.text)) {
      // Preserve the printed sign style: many statements print withdrawals
      // as "-$1,234.56" in summaries.
      target.replacement = reformatLike(target.str, target.str.includes("-") ? debitSum : Math.abs(debitSum));
    }
    if (target.replacement !== null) target.rightAlign = true;
  }

  // ── render ───────────────────────────────────────────────────────────
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const pageH = layout.pageHeight || 792;
  for (const p of layout.pages) {
    const page = doc.addPage([612, pageH]);
    for (const item of items.filter((i) => i.page === p.page)) {
      const text = item.replacement ?? item.str;
      const size = Math.min(Math.max(item.s || 9, 6), 18);
      let x = item.x;
      if (item.rightAlign) {
        x = item.x + item.w - font.widthOfTextAtSize(text, size);
      }
      page.drawText(text, { x, y: item.y, size, font, color: rgb(0.1, 0.1, 0.12) });
    }
  }

  return {
    pdf: await doc.save(),
    openingCents,
    closingCents,
    transactionCount: txRows.length,
  };
}
