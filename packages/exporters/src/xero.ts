/**
 * Xero precoded bank statement CSV: Date, Amount, Payee, Description,
 * Reference. Xero parses dates per the organisation's region; we default to
 * DD/MM/YYYY (Xero's home format) with a switch for US orgs.
 */

import { centsToDecimal, DateStyle, formatDate, ParsedStatement } from "./common";
import { csvEscape } from "./csv";

export interface XeroOptions {
  dateStyle: DateStyle;
}

export function toXeroCsv(
  statement: ParsedStatement,
  options: Partial<XeroOptions> = {},
): string {
  const dateStyle = options.dateStyle ?? "DD/MM/YYYY";
  const lines = ["Date,Amount,Payee,Description,Reference"];
  for (const t of statement.transactions) {
    lines.push(
      [
        formatDate(t.date, dateStyle),
        centsToDecimal(t.amountCents),
        // Payee: first few words of the description make a usable payee.
        t.description.split(" ").slice(0, 4).join(" "),
        t.description,
        t.checkNumber ?? "",
      ]
        .map(csvEscape)
        .join(","),
    );
  }
  return "﻿" + lines.join("\r\n") + "\r\n";
}
