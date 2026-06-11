/**
 * CSV writer: configurable columns, date format, sign style; UTF-8 BOM for
 * Excel; RFC 4180 quoting.
 */

import {
  centsToDecimal,
  DateStyle,
  formatDate,
  ParsedStatement,
} from "./common";

export interface CsvOptions {
  dateStyle: DateStyle;
  /** "signed": one Amount column. "debit-credit": separate columns. */
  signStyle: "signed" | "debit-credit";
  includeBalance: boolean;
  includeCheckNumber: boolean;
  /** Prepend a UTF-8 BOM so Excel detects the encoding. */
  bom: boolean;
}

export const DEFAULT_CSV_OPTIONS: CsvOptions = {
  dateStyle: "MM/DD/YYYY",
  signStyle: "signed",
  includeBalance: true,
  includeCheckNumber: false,
  bom: true,
};

export function csvEscape(field: string): string {
  if (/[",\n\r]/.test(field)) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

export function toCsv(
  statement: ParsedStatement,
  options: Partial<CsvOptions> = {},
): string {
  const o = { ...DEFAULT_CSV_OPTIONS, ...options };

  const header: string[] = ["Date", "Description"];
  if (o.includeCheckNumber) header.push("Check Number");
  if (o.signStyle === "signed") header.push("Amount");
  else header.push("Debit", "Credit");
  if (o.includeBalance) header.push("Balance");

  const lines = [header.map(csvEscape).join(",")];
  for (const t of statement.transactions) {
    const row: string[] = [formatDate(t.date, o.dateStyle), t.description];
    if (o.includeCheckNumber) row.push(t.checkNumber ?? "");
    if (o.signStyle === "signed") {
      row.push(centsToDecimal(t.amountCents));
    } else {
      row.push(
        t.amountCents < 0 ? centsToDecimal(-t.amountCents) : "",
        t.amountCents > 0 ? centsToDecimal(t.amountCents) : "",
      );
    }
    if (o.includeBalance) {
      row.push(t.balanceCents !== undefined ? centsToDecimal(t.balanceCents) : "");
    }
    lines.push(row.map(csvEscape).join(","));
  }

  return (o.bom ? "﻿" : "") + lines.join("\r\n") + "\r\n";
}
