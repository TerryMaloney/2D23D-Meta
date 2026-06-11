/**
 * Core types for the StatementClear parsing engine.
 *
 * This package is framework-free and DOM-free. It receives positioned text
 * items (already extracted from a PDF by the caller) and returns structured,
 * reconciled statements. All money values are integer cents so reconciliation
 * is exact — never floats.
 */

/** A single text item placed on a page, normalized to a TOP-LEFT origin. */
export interface PositionedText {
  str: string;
  /** Left edge, in PDF points, from the left of the page. */
  x: number;
  /** Top edge, in PDF points, from the top of the page. */
  y: number;
  width: number;
  height: number;
  /** 1-based page number. */
  page: number;
}

/**
 * The shape of a pdf.js text item plus the page it came from, before
 * normalization. Structural type only — this package never imports pdf.js.
 * `transform` is the standard 6-element PDF text matrix [a, b, c, d, e, f]
 * where e = x and f = baseline y in BOTTOM-left origin coordinates.
 */
export interface RawTextItem {
  str: string;
  transform: number[];
  width: number;
  height: number;
}

export interface RawPage {
  /** 1-based page number. */
  pageNumber: number;
  /** Page height in PDF points (needed to flip to a top-left origin). */
  pageHeight: number;
  items: RawTextItem[];
}

export type ParseErrorCode =
  | "SCANNED_PDF"
  | "PASSWORD_PROTECTED"
  | "NOT_A_STATEMENT"
  | "UNRECOGNIZED_LAYOUT"
  | "PARTIAL_PARSE";

export class StatementParseError extends Error {
  constructor(
    public readonly code: ParseErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "StatementParseError";
  }
}

/** Why a row was flagged for human review. */
export type TransactionFlag =
  | "balance-chain-broken"
  | "ambiguous-date"
  | "ambiguous-amount"
  | "ambiguous-sign"
  | "merged-description"
  | "low-confidence";

export interface Transaction {
  /** ISO date YYYY-MM-DD (transaction date). */
  date: string;
  /** ISO date, when the statement has a separate posting date column. */
  postDate?: string;
  description: string;
  /** Signed integer cents. Deposits/credits positive, withdrawals/debits negative. */
  amountCents: number;
  /** Running balance in integer cents, when the statement prints one. */
  balanceCents?: number;
  checkNumber?: string;
  /** ISO 4217, when it differs from the statement currency (e.g. PayPal rows). */
  currency?: string;
  /** 0..1; below ~0.8 the UI highlights the row for review. */
  confidence: number;
  flags: TransactionFlag[];
  /** Source info for debugging and the preview UI. */
  sourcePage: number;
}

export type ReconciliationStatus = "verified" | "partial" | "failed";

export interface ReconciliationResult {
  status: ReconciliationStatus;
  openingBalanceCents?: number;
  closingBalanceCents?: number;
  /** Signed sum of all transaction amounts, integer cents. */
  transactionSumCents: number;
  /** Sum of positive amounts. */
  creditSumCents: number;
  /** Sum of negative amounts (a negative number). */
  debitSumCents: number;
  /** Indices into `transactions` of rows that broke a check. */
  flaggedRowIndices: number[];
  /** Human-readable explanations of every check performed and its outcome. */
  notes: string[];
}

export interface ParsedStatement {
  bankName?: string;
  /** Masked account identifier as printed (e.g. "...4821"). */
  accountId?: string;
  accountType?: string;
  /** ISO 4217 statement currency. */
  currency: string;
  /** ISO dates for the statement period, when detected. */
  periodStart?: string;
  periodEnd?: string;
  openingBalanceCents?: number;
  closingBalanceCents?: number;
  /** Printed summary totals, when the statement includes them. */
  printedTotalCreditsCents?: number;
  printedTotalDebitsCents?: number;
  transactions: Transaction[];
  /** Which template parsed this ("generic" for the fallback parser). */
  templateId: string;
  reconciliation: ReconciliationResult;
  warnings: string[];
}

/** A statement PDF can contain several accounts (combined statements). */
export interface ParseOutput {
  statements: ParsedStatement[];
}
