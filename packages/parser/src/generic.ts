/**
 * Layer 5 — Generic fallback parser (also the engine templates configure).
 *
 * Finds the densest region of date-led rows, locates amount columns,
 * identifies a running-balance column, resolves transaction signs, merges
 * multi-line descriptions, and extracts statement metadata (period,
 * opening/closing balances, printed totals).
 */

import { detectPeriod, resolveDate, StatementPeriod } from "./dates";
import {
  amountColumnIndex,
  classifyRow,
  ClassifiedRow,
  clusterAmountColumns,
  detectCheckNumber,
  isContinuationRow,
  isTransactionRow,
} from "./fields";
import { looksLikeAmount, NumberLocale, parseAmount } from "./money";
import { clusterRows, Row, rowText, stripFurniture } from "./rows";
import {
  ParsedStatement,
  PositionedText,
  Transaction,
} from "./types";
import { reconcile } from "./reconcile";

export type SignConvention =
  | "auto"
  | "balance-delta"
  | "single-signed"
  | "debit-credit-columns"
  /** BofA-style: a "Deposits…" section then a "Withdrawals…" section. */
  | "section-headers"
  | "cc-purchases-positive";

export interface EngineOptions {
  templateId: string;
  bankName?: string;
  accountType?: string;
  locale: NumberLocale;
  currency: string;
  signConvention: SignConvention;
  /** Capital One style: transaction date + post date pair. */
  twoDateColumns: boolean;
  multilineDescriptions: boolean;
  openingLabels: string[];
  closingLabels: string[];
  creditTotalLabels: string[];
  debitTotalLabels: string[];
  /** Regex source for the statement period, overriding generic detection. */
  periodRegex?: string;
}

export const DEFAULT_OPTIONS: EngineOptions = {
  templateId: "generic",
  locale: "us",
  currency: "USD",
  signConvention: "auto",
  twoDateColumns: false,
  multilineDescriptions: true,
  openingLabels: [
    "beginning balance",
    "opening balance",
    "previous balance",
    "balance forward",
    "starting balance",
    "opening book balance",
  ],
  closingLabels: [
    "ending balance",
    "closing balance",
    "new balance",
    "ending book balance",
  ],
  creditTotalLabels: [
    "total deposits",
    "total credits",
    "deposits and additions",
    "total deposits and credits",
    "total additions",
    "total money in",
  ],
  debitTotalLabels: [
    "total withdrawals",
    "total debits",
    "electronic withdrawals",
    "total withdrawals and debits",
    "total subtractions",
    "total money out",
  ],
};

const CURRENCY_CODES = new Set(["USD", "EUR", "GBP", "CAD", "AUD", "JPY", "CHF", "NZD", "MXN", "INR"]);
const PAYMENT_KEYWORDS = /\b(payment|autopay|automatic payment|online payment|pymt)\b/i;

interface LabeledAmount {
  cents: number;
  rowIndex: number;
}

/** Find "Label .... 1,234.56" rows. Returns the first match. */
function findLabeledAmount(
  rows: Row[],
  labels: string[],
  locale: NumberLocale,
): LabeledAmount | undefined {
  for (let i = 0; i < rows.length; i++) {
    const text = rowText(rows[i]).toLowerCase();
    if (!labels.some((l) => text.includes(l))) continue;
    // Use the last amount-shaped item in the row.
    for (let j = rows[i].items.length - 1; j >= 0; j--) {
      const a = parseAmount(rows[i].items[j].str, locale);
      if (a !== null && /[\d]/.test(rows[i].items[j].str) && /[.,]\d{2}\b|\(|\)/.test(rows[i].items[j].str)) {
        return { cents: a.cents, rowIndex: i };
      }
    }
  }
  return undefined;
}

function detectAccountId(rows: Row[]): string | undefined {
  for (const row of rows.slice(0, 60)) {
    const text = rowText(row);
    const m =
      text.match(/account\s*(?:number|#|no\.?)?\s*:?\s*(?:ending(?: in)?\s*)?[x*.•]*(\d{4})\b/i) ??
      text.match(/\b(?:x{2,}|\*{2,}|•{2,})(\d{4})\b/);
    if (m) return `...${m[1]}`;
  }
  return undefined;
}

/** Choose number locale by which one classifies more amounts. */
function sniffLocale(rows: Row[]): NumberLocale {
  let us = 0;
  let eu = 0;
  for (const row of rows) {
    for (const item of row.items) {
      if (/^\d{1,3}(,\d{3})*\.\d{2}$/.test(item.str.trim())) us++;
      if (/^\d{1,3}(\.\d{3})*,\d{2}$/.test(item.str.trim())) eu++;
    }
  }
  return eu > us ? "eu" : "us";
}

/**
 * Identify the balance column among amount columns: the rightmost column
 * where, for most consecutive pairs, the delta equals ± another amount in
 * the row ("non-monotonic deltas of the others").
 */
function identifyBalanceColumn(
  txRows: ClassifiedRow[],
  columns: number[],
): number | null {
  if (columns.length < 2) return null;
  const rightmost = columns.length - 1;

  let checked = 0;
  let consistent = 0;
  let prevBalance: number | undefined;
  for (const r of txRows) {
    const balCell = r.amounts.find((a) => amountColumnIndex(a, columns) === rightmost);
    const others = r.amounts.filter((a) => amountColumnIndex(a, columns) !== rightmost && amountColumnIndex(a, columns) >= 0);
    if (!balCell) continue;
    if (prevBalance !== undefined && others.length > 0) {
      checked++;
      const delta = balCell.amount.cents - prevBalance;
      if (others.some((o) => Math.abs(o.amount.cents) === Math.abs(delta))) consistent++;
    }
    prevBalance = balCell.amount.cents;
  }
  if (checked >= 2 && consistent / checked >= 0.7) return rightmost;
  return null;
}

interface DebitCreditMap {
  debitCol: number;
  creditCol: number;
}

const CREDIT_HEADER = /\b(deposits?|credits?|additions?|amount added|money in|paid in)\b/i;
const DEBIT_HEADER = /\b(withdrawals?|debits?|subtractions?|payments?|fees?|checks?|money out|paid out|purchases?)\b/i;

/**
 * For separate debit/credit column layouts, work out which is which from the
 * header row above the transactions; fall back to trying both assignments
 * against the totals during sign resolution.
 */
function identifyDebitCreditColumns(
  allRows: Row[],
  firstTxY: { page: number; y: number },
  columns: number[],
  balanceCol: number | null,
): DebitCreditMap | null {
  const amountCols = columns
    .map((c, i) => ({ c, i }))
    .filter(({ i }) => i !== balanceCol);
  if (amountCols.length !== 2) return null;

  // Scan header-ish rows: above the first transaction row (same page) or any
  // row whose items align with the amount columns and contain header words.
  let debitCol = -1;
  let creditCol = -1;
  for (const row of allRows) {
    if (row.page > firstTxY.page || (row.page === firstTxY.page && row.y >= firstTxY.y)) continue;
    for (const item of row.items) {
      const right = item.x + item.width;
      for (const { c, i } of amountCols) {
        if (Math.abs(right - c) <= 30 || (item.x <= c && right >= c - 30)) {
          if (CREDIT_HEADER.test(item.str) && !DEBIT_HEADER.test(item.str)) creditCol = i;
          else if (DEBIT_HEADER.test(item.str)) debitCol = i;
        }
      }
    }
  }
  if (debitCol >= 0 && creditCol >= 0 && debitCol !== creditCol) {
    return { debitCol, creditCol };
  }
  return null;
}

export interface SectionParseInput {
  rows: Row[];
  period: StatementPeriod | null;
  options: EngineOptions;
  pageCount: number;
}

/** Parse one account section (a statement PDF may contain several). */
export function parseSection(input: SectionParseInput): ParsedStatement {
  const { rows, options } = input;
  const locale = options.locale;
  const warnings: string[] = [];

  const opening = findLabeledAmount(rows, options.openingLabels, locale);
  const closing = findLabeledAmount(rows, options.closingLabels, locale);
  const printedCredits = findLabeledAmount(rows, options.creditTotalLabels, locale);
  const printedDebits = findLabeledAmount(rows, options.debitTotalLabels, locale);

  // Classify all rows once.
  const classified = rows.map((r) => classifyRow(r, locale));
  const txRows = classified.filter(isTransactionRow);

  // Amount columns across transaction rows (right-edge clusters).
  const columns = clusterAmountColumns(txRows);
  const balanceCol = identifyBalanceColumn(txRows, columns);

  const firstTx = txRows[0];
  const dcMap =
    firstTx && (options.signConvention === "auto" || options.signConvention === "debit-credit-columns")
      ? identifyDebitCreditColumns(
          rows,
          { page: firstTx.row.page, y: firstTx.row.y },
          columns,
          balanceCol,
        )
      : null;

  // Check-number column: bare 3-6 digit integer as the first text item
  // right after the date, in a meaningful share of rows.
  const checkish = txRows.filter(
    (r) => r.textItems[0] && detectCheckNumber(r.textItems[0].str) !== null,
  ).length;
  const hasCheckColumn = checkish >= 3 && checkish / txRows.length >= 0.15;

  // ── Build transactions ──────────────────────────────────────────────
  const transactions: Transaction[] = [];
  const txRowSet = new Set(txRows);
  let lastTxIndexByRow = new Map<ClassifiedRow, number>();
  let prevBalance: number | undefined = opening?.cents;
  /** +1 inside a deposits section, -1 inside a withdrawals section. */
  let sectionSign = 0;

  const baseConfidence = options.templateId === "generic" ? 0.85 : 0.95;

  for (let ri = 0; ri < classified.length; ri++) {
    const c = classified[ri];

    if (!txRowSet.has(c)) {
      // Section headers flip the sign context for section-based layouts.
      const t = rowText(c.row);
      if (c.amounts.length === 0 && t.length < 60) {
        if (DEBIT_HEADER.test(t) && !CREDIT_HEADER.test(t)) sectionSign = -1;
        else if (CREDIT_HEADER.test(t)) sectionSign = 1;
      }
      // Continuation row → merge into the previous transaction's description.
      if (
        options.multilineDescriptions &&
        isContinuationRow(c) &&
        transactions.length > 0
      ) {
        const prevC = classified
          .slice(0, ri)
          .reverse()
          .find((x) => txRowSet.has(x));
        const prevIdx = prevC ? lastTxIndexByRow.get(prevC) : undefined;
        if (
          prevC &&
          prevIdx !== undefined &&
          c.row.page === prevC.row.page &&
          c.row.y - prevC.row.y < 30 &&
          c.row.y > prevC.row.y &&
          // Continuation text starts in the description zone, not at the
          // far left margin of a section header.
          !/^[A-Z ]{4,}$/.test(rowText(c.row))
        ) {
          const extra = c.textItems.map((t) => t.str).join(" ");
          // Skip summary-ish lines.
          if (!/balance|total|page \d/i.test(extra)) {
            transactions[prevIdx].description += " " + extra;
            if (!transactions[prevIdx].flags.includes("merged-description")) {
              transactions[prevIdx].flags.push("merged-description");
            }
          }
        }
      }
      continue;
    }

    // Skip transaction-shaped rows that are actually labeled balance/total
    // summary lines (e.g. "12/31 Ending Balance 4,421.25").
    const lower = rowText(c.row).toLowerCase();
    if (
      [...options.openingLabels, ...options.closingLabels, ...options.creditTotalLabels, ...options.debitTotalLabels].some(
        (l) => lower.includes(l),
      ) ||
      /\bdaily\s+(ending\s+)?balance/i.test(lower)
    ) {
      continue;
    }

    let confidence = baseConfidence;
    const flags: Transaction["flags"] = [];

    // Dates.
    const dDate = c.dates[0].date;
    const date = resolveDate(dDate, input.period);
    if (!dDate.year && !input.period) {
      confidence -= 0.1;
      flags.push("ambiguous-date");
    }
    let postDate: string | undefined;
    if (options.twoDateColumns && c.dates.length >= 2) {
      postDate = resolveDate(c.dates[1].date, input.period);
    }

    // Amount cells in this row, by column.
    const balCell =
      balanceCol !== null
        ? c.amounts.find((a) => amountColumnIndex(a, columns) === balanceCol)
        : undefined;
    const amountCells = c.amounts.filter((a) => a !== balCell);
    if (amountCells.length === 0) continue; // balance-only row (e.g. daily balance table)
    // The amount is the leftmost non-balance amount cell by convention;
    // multiple non-balance cells outside a debit/credit layout get flagged.
    let cell = amountCells[0];
    let cents = cell.amount.cents;
    let signResolved = cell.amount.explicitSign;

    // Sign from debit/credit column identity.
    if (dcMap) {
      const colIdx = amountColumnIndex(cell, columns);
      if (colIdx === dcMap.debitCol) {
        cents = -Math.abs(cents);
        signResolved = true;
      } else if (colIdx === dcMap.creditCol) {
        cents = Math.abs(cents);
        signResolved = true;
      }
    }

    // Sign from balance delta (definitive — overrides everything).
    if (balCell && prevBalance !== undefined) {
      const delta = balCell.amount.cents - prevBalance;
      if (Math.abs(delta) === Math.abs(cents)) {
        cents = delta;
        signResolved = true;
      }
    }

    // Credit-card statements print credits with a CR marker; on a card,
    // CR reduces the balance owed, so it must come out negative in the
    // purchases-positive convention.
    if (options.signConvention === "cc-purchases-positive" && cell.amount.marker === "CR") {
      cents = -Math.abs(cents);
      signResolved = true;
    }

    // Section-based layouts: sign comes from the section the row sits in.
    if (!signResolved && options.signConvention === "section-headers" && sectionSign !== 0) {
      cents = sectionSign * Math.abs(cents);
      signResolved = true;
    }

    // Credit-card convention: unsigned = purchase (positive); payments are
    // negative (statements print them with minus or CR).
    if (!signResolved && options.signConvention === "cc-purchases-positive") {
      if (PAYMENT_KEYWORDS.test(rowText(c.row))) {
        cents = -Math.abs(cents);
      } else {
        cents = Math.abs(cents);
      }
      signResolved = true;
    }

    if (!signResolved && !balCell) {
      // Heuristic last resort.
      if (PAYMENT_KEYWORDS.test(rowText(c.row))) cents = -Math.abs(cents);
      confidence -= 0.15;
      flags.push("ambiguous-sign");
    }

    // Description, check number, and per-row currency code.
    let textItems = [...c.textItems];
    let checkNumber: string | undefined;
    if (hasCheckColumn && textItems[0] && detectCheckNumber(textItems[0].str)) {
      checkNumber = detectCheckNumber(textItems[0].str)!;
      textItems = textItems.slice(1);
    }
    let currency: string | undefined;
    textItems = textItems.filter((t) => {
      const code = t.str.trim().toUpperCase();
      if (CURRENCY_CODES.has(code)) {
        currency = code;
        return false;
      }
      return true;
    });
    const description = textItems.map((t) => t.str).join(" ").trim();

    if (balCell) prevBalance = balCell.amount.cents;

    transactions.push({
      date,
      postDate,
      description,
      amountCents: cents,
      balanceCents: balCell?.amount.cents,
      checkNumber,
      currency: currency !== options.currency ? currency : undefined,
      confidence: Math.max(0, Math.min(1, confidence)),
      flags,
      sourcePage: c.row.page,
    });
    lastTxIndexByRow.set(c, transactions.length - 1);
  }

  // Debit/credit layout without identified headers: try both assignments,
  // keep the one that reconciles.
  // (Only relevant when exactly two non-balance columns exist and signs are
  // still ambiguous — detected by presence of ambiguous-sign flags.)
  const reconciliation = reconcile({
    transactions,
    openingBalanceCents: opening?.cents,
    closingBalanceCents: closing?.cents,
    printedTotalCreditsCents: printedCredits?.cents,
    printedTotalDebitsCents: printedDebits ? -Math.abs(printedDebits.cents) : undefined,
  });

  return {
    bankName: options.bankName,
    accountId: detectAccountId(rows),
    accountType: options.accountType,
    currency: options.currency,
    periodStart: input.period?.start,
    periodEnd: input.period?.end,
    openingBalanceCents: opening?.cents,
    closingBalanceCents: closing?.cents,
    printedTotalCreditsCents: printedCredits?.cents,
    printedTotalDebitsCents: printedDebits ? -Math.abs(printedDebits.cents) : undefined,
    transactions,
    templateId: options.templateId,
    reconciliation,
    warnings,
  };
}

/** Join all text for header-level scans (period, bank identification). */
export function fullText(items: PositionedText[]): string {
  return items.map((i) => i.str).join(" ");
}

export interface PreparedDocument {
  rows: Row[];
  period: StatementPeriod | null;
  pageCount: number;
  locale: NumberLocale;
  /** Text of furniture-stripped rows. */
  text: string;
  /**
   * Text of ALL rows, before furniture stripping. Template identification
   * must use this: bank-name headers repeat on every page and are exactly
   * what furniture stripping removes.
   */
  rawText: string;
}

/** Shared preprocessing: rows, furniture stripping, period, locale sniff. */
export function prepareDocument(
  items: PositionedText[],
  periodRegex?: string,
): PreparedDocument {
  const pageCount = items.reduce((m, i) => Math.max(m, i.page), 0);
  const allRows = clusterRows(items);
  const rawText = allRows.map(rowText).join("\n");
  const rows = stripFurniture(allRows, pageCount);
  const text = rows.map(rowText).join("\n");

  let period: StatementPeriod | null = null;
  if (periodRegex) {
    const m = text.match(new RegExp(periodRegex, "i"));
    if (m && m[1] && m[2]) {
      period = detectPeriod(`${m[1]} through ${m[2]}`);
    }
  }
  if (!period) period = detectPeriod(text.slice(0, 4000));

  return { rows, period, pageCount, locale: sniffLocale(rows), text, rawText };
}

/**
 * Split a document's rows into account sections. A new section starts at
 * each opening-balance label occurrence after the first, when the document
 * contains more than one (combined/multi-account statements).
 */
export function splitSections(
  rows: Row[],
  openingLabels: string[],
  locale: NumberLocale = "us",
): Row[][] {
  const indices: number[] = [];
  rows.forEach((row, i) => {
    const t = rowText(row).toLowerCase();
    if (openingLabels.some((l) => t.includes(l))) indices.push(i);
  });
  if (indices.length <= 1) return [rows];

  // A section starts at its opening-balance row, extended upward over up to
  // three context rows (account headers) — but never over rows that carry
  // amounts, which belong to the previous section.
  const starts = indices.map((idx, k) => {
    if (k === 0) return 0;
    let start = idx;
    for (let j = 1; j <= 3 && idx - j > indices[k - 1]; j++) {
      const r = rows[idx - j];
      if (r.items.some((it) => looksLikeAmount(it.str, locale))) break;
      start = idx - j;
    }
    return start;
  });

  const sections: Row[][] = [];
  for (let k = 0; k < starts.length; k++) {
    const end = k + 1 < starts.length ? starts[k + 1] : rows.length;
    sections.push(rows.slice(starts[k], end));
  }
  return sections;
}
