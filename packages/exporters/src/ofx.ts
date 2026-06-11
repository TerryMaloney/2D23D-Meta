/**
 * OFX 1.02 SGML writer — one writer, three flavors (.ofx, .qfx, .qbo).
 *
 * Critical details handled here:
 * - DTPOSTED as YYYYMMDD; TRNAMT as signed decimal
 * - TRNTYPE CREDIT/DEBIT from sign (CHECK when a check number exists)
 * - FITID unique AND deterministic (hash of date+amount+description+index);
 *   QuickBooks silently skips transactions it thinks are duplicates
 * - NAME truncated to 32 chars with overflow into MEMO
 * - INTU.BID included for .qbo/.qfx — QuickBooks validates it against
 *   recognized institutions, so it is a user-visible advanced setting
 */

import {
  centsToDecimal,
  fitid,
  ParsedStatement,
  Transaction,
} from "./common";

export type OfxFlavor = "ofx" | "qfx" | "qbo";

export interface OfxOptions {
  flavor: OfxFlavor;
  /**
   * Intuit institution ID. QuickBooks rejects .qbo files whose INTU.BID it
   * doesn't recognize; users whose import fails should try their own bank's
   * BID. 3000 (a widely-recognized default) works for most users.
   */
  intuBid: string;
  accountType: "CHECKING" | "SAVINGS" | "CREDITCARD";
  /** Routing number when known; a placeholder is fine for imports. */
  bankId: string;
  accountId: string;
  /**
   * Flip transaction signs. Credit-card statements print purchases as
   * positive; money-management tools expect charges as negative.
   */
  invertSigns: boolean;
}

export const DEFAULT_OFX_OPTIONS: OfxOptions = {
  flavor: "qbo",
  intuBid: "3000",
  accountType: "CHECKING",
  bankId: "000000000",
  accountId: "STATEMENTCLEAR",
  invertSigns: false,
};

const NAME_MAX = 32;

function sgml(tag: string, value: string): string {
  // OFX 1.02 SGML: leaf elements have no closing tag.
  return `<${tag}>${escapeOfx(value)}`;
}

function escapeOfx(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function dt(iso: string): string {
  return iso.replace(/-/g, "");
}

function trnType(t: Transaction, amountCents: number): string {
  if (t.checkNumber) return "CHECK";
  return amountCents >= 0 ? "CREDIT" : "DEBIT";
}

function stmtTrn(t: Transaction, index: number, invert: boolean): string {
  const amount = invert ? -t.amountCents : t.amountCents;
  const name = t.description.slice(0, NAME_MAX);
  const overflow = t.description.slice(NAME_MAX).trim();
  const lines = [
    "<STMTTRN>",
    sgml("TRNTYPE", trnType(t, amount)),
    sgml("DTPOSTED", dt(t.date)),
    sgml("TRNAMT", centsToDecimal(amount)),
    sgml("FITID", fitid(t, index)),
  ];
  if (t.checkNumber) lines.push(sgml("CHECKNUM", t.checkNumber));
  lines.push(sgml("NAME", name || "TRANSACTION"));
  if (overflow) lines.push(sgml("MEMO", overflow));
  lines.push("</STMTTRN>");
  return lines.join("\n");
}

export function toOfx(
  statement: ParsedStatement,
  options: Partial<OfxOptions> = {},
): string {
  const o = { ...DEFAULT_OFX_OPTIONS, ...options };
  const isCard = o.accountType === "CREDITCARD";
  const now = "20260101120000"; // deterministic DTSERVER; consumers ignore it

  const txs = statement.transactions;
  const dtStart = dt(statement.periodStart ?? txs[0]?.date ?? "2026-01-01");
  const dtEnd = dt(statement.periodEnd ?? txs[txs.length - 1]?.date ?? "2026-01-31");
  const ledger =
    statement.closingBalanceCents !== undefined
      ? centsToDecimal(
          o.invertSigns && isCard
            ? -statement.closingBalanceCents
            : statement.closingBalanceCents,
        )
      : "0.00";

  const header = [
    "OFXHEADER:100",
    "DATA:OFXSGML",
    "VERSION:102",
    "SECURITY:NONE",
    "ENCODING:USASCII",
    "CHARSET:1252",
    "COMPRESSION:NONE",
    "OLDFILEUID:NONE",
    "NEWFILEUID:NONE",
    "",
  ].join("\n");

  const fi = [
    "<FI>",
    sgml("ORG", statement.bankName ?? "StatementClear Export"),
    sgml("FID", o.intuBid),
    "</FI>",
  ].join("\n");

  const signon = [
    "<SIGNONMSGSRSV1>",
    "<SONRS>",
    "<STATUS>",
    sgml("CODE", "0"),
    sgml("SEVERITY", "INFO"),
    "</STATUS>",
    sgml("DTSERVER", now),
    sgml("LANGUAGE", "ENG"),
    fi,
    // Quicken (.qfx) and QuickBooks (.qbo) both validate INTU.BID.
    ...(o.flavor === "qfx" || o.flavor === "qbo" ? [sgml("INTU.BID", o.intuBid)] : []),
    "</SONRS>",
    "</SIGNONMSGSRSV1>",
  ].join("\n");

  const tranList = [
    "<BANKTRANLIST>",
    sgml("DTSTART", dtStart),
    sgml("DTEND", dtEnd),
    ...txs.map((t, i) => stmtTrn(t, i, o.invertSigns)),
    "</BANKTRANLIST>",
  ].join("\n");

  const ledgerBal = [
    "<LEDGERBAL>",
    sgml("BALAMT", ledger),
    sgml("DTASOF", dtEnd),
    "</LEDGERBAL>",
  ].join("\n");

  const body = isCard
    ? [
        "<CREDITCARDMSGSRSV1>",
        "<CCSTMTTRNRS>",
        sgml("TRNUID", "1"),
        "<STATUS>",
        sgml("CODE", "0"),
        sgml("SEVERITY", "INFO"),
        "</STATUS>",
        "<CCSTMTRS>",
        sgml("CURDEF", statement.currency),
        "<CCACCTFROM>",
        sgml("ACCTID", o.accountId),
        "</CCACCTFROM>",
        tranList,
        ledgerBal,
        "</CCSTMTRS>",
        "</CCSTMTTRNRS>",
        "</CREDITCARDMSGSRSV1>",
      ].join("\n")
    : [
        "<BANKMSGSRSV1>",
        "<STMTTRNRS>",
        sgml("TRNUID", "1"),
        "<STATUS>",
        sgml("CODE", "0"),
        sgml("SEVERITY", "INFO"),
        "</STATUS>",
        "<STMTRS>",
        sgml("CURDEF", statement.currency),
        "<BANKACCTFROM>",
        sgml("BANKID", o.bankId),
        sgml("ACCTID", o.accountId),
        sgml("ACCTTYPE", o.accountType),
        "</BANKACCTFROM>",
        tranList,
        ledgerBal,
        "</STMTRS>",
        "</STMTTRNRS>",
        "</BANKMSGSRSV1>",
      ].join("\n");

  return `${header}\n<OFX>\n${signon}\n${body}\n</OFX>\n`;
}
