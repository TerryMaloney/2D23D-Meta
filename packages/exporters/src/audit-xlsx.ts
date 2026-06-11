/**
 * Audit workbook (XLSX): the multi-statement audit packaged as one
 * spreadsheet with typed cells. Sheets: Transactions, Monthly Summary,
 * Statement Inventory, Reconciliation, Issues, Recurring Transactions.
 */

import * as XLSX from "xlsx";
import type { AuditResult } from "@parser/audit";
import { describeFinding } from "@parser/audit";

const CURRENCY_FMT = '#,##0.00;[Red]\\-#,##0.00';
const DATE_FMT = "mm/dd/yyyy";

function dateCell(iso: string): XLSX.CellObject {
  const [y, m, d] = iso.split("-").map(Number);
  return { t: "d", v: new Date(Date.UTC(y, m - 1, d)), z: DATE_FMT };
}
function moneyCell(cents: number): XLSX.CellObject {
  return { t: "n", v: cents / 100, z: CURRENCY_FMT };
}
function textCell(s: string): XLSX.CellObject {
  return { t: "s", v: s };
}
function numCell(n: number): XLSX.CellObject {
  return { t: "n", v: n };
}

function sheetOf(rows: XLSX.CellObject[][], widths?: number[]): XLSX.WorkSheet {
  const ws: XLSX.WorkSheet = {};
  rows.forEach((row, r) =>
    row.forEach((cell, c) => {
      ws[XLSX.utils.encode_cell({ r, c })] = cell;
    }),
  );
  ws["!ref"] = XLSX.utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: Math.max(rows.length - 1, 0), c: Math.max(...rows.map((r) => r.length), 1) - 1 },
  });
  if (widths) ws["!cols"] = widths.map((wch) => ({ wch }));
  ws["!freeze"] = { xSplit: 0, ySplit: 1 } as unknown as XLSX.WorkSheet["!freeze"];
  return ws;
}

function accountLabel(result: AuditResult, accountKey: string): string {
  const a = result.accounts.find((x) => x.accountKey === accountKey);
  if (!a) return accountKey;
  return [a.bankName, a.accountType, a.accountId].filter(Boolean).join(" ") || accountKey;
}

export function toAuditWorkbook(result: AuditResult, opts: { verifiedOnly?: boolean } = {}): XLSX.WorkBook {
  const verifiedOnly = opts.verifiedOnly ?? true;
  const wb = XLSX.utils.book_new();

  // ── Transactions ─────────────────────────────────────────────────────
  const txRows: XLSX.CellObject[][] = [
    ["Account", "Date", "Description", "Amount", "Balance", "Source file", "Verified"].map(textCell),
  ];
  for (const a of result.accounts) {
    for (const e of a.ledger) {
      if (verifiedOnly && !e.verified) continue;
      txRows.push([
        textCell(accountLabel(result, a.accountKey)),
        dateCell(e.tx.date),
        textCell(e.tx.description),
        moneyCell(e.tx.amountCents),
        e.tx.balanceCents !== undefined ? moneyCell(e.tx.balanceCents) : textCell(""),
        textCell(e.sourceId),
        textCell(e.verified ? "yes" : "NO — review"),
      ]);
    }
  }
  XLSX.utils.book_append_sheet(wb, sheetOf(txRows, [24, 12, 48, 12, 12, 12, 12]), "Transactions");

  // ── Monthly Summary ──────────────────────────────────────────────────
  const moRows: XLSX.CellObject[][] = [
    ["Account", "Month", "Money in", "Money out", "Net", "Transactions"].map(textCell),
  ];
  for (const a of result.accounts) {
    for (const m of a.monthly) {
      moRows.push([
        textCell(accountLabel(result, a.accountKey)),
        textCell(m.month),
        moneyCell(m.inCents),
        moneyCell(m.outCents),
        moneyCell(m.netCents),
        numCell(m.txCount),
      ]);
    }
  }
  XLSX.utils.book_append_sheet(wb, sheetOf(moRows, [24, 10, 14, 14, 14, 12]), "Monthly Summary");

  // ── Statement Inventory ──────────────────────────────────────────────
  const invRows: XLSX.CellObject[][] = [
    ["Account", "File", "Period start", "Period end", "Transactions", "Status", "Opening", "Closing", "Flagged rows", "Duplicate of"].map(textCell),
  ];
  for (const a of result.accounts) {
    for (const i of a.inventory) {
      invRows.push([
        textCell(accountLabel(result, a.accountKey)),
        textCell(i.fileName),
        i.periodStart ? dateCell(i.periodStart) : textCell(""),
        i.periodEnd ? dateCell(i.periodEnd) : textCell(""),
        numCell(i.txCount),
        textCell(i.status),
        i.openingCents !== undefined ? moneyCell(i.openingCents) : textCell(""),
        i.closingCents !== undefined ? moneyCell(i.closingCents) : textCell(""),
        numCell(i.flaggedRows),
        textCell(i.duplicateOf ?? ""),
      ]);
    }
  }
  for (const u of result.unparsed) {
    invRows.push([
      textCell("—"),
      textCell(u.fileName),
      textCell(""),
      textCell(""),
      numCell(0),
      textCell(`error: ${u.errorCode}`),
      textCell(""),
      textCell(""),
      numCell(0),
      textCell(""),
    ]);
  }
  XLSX.utils.book_append_sheet(wb, sheetOf(invRows, [24, 30, 12, 12, 12, 12, 12, 12, 12, 14]), "Statement Inventory");

  // ── Reconciliation ───────────────────────────────────────────────────
  const recRows: XLSX.CellObject[][] = [
    ["Account", "Coverage start", "Coverage end", "Statements", "Verified", "Partial", "Failed", "Continuity breaks"].map(textCell),
  ];
  for (const a of result.accounts) {
    const breaks = result.findings.filter(
      (f) => f.kind === "balance-discontinuity" && f.accountKey === a.accountKey,
    ).length;
    recRows.push([
      textCell(accountLabel(result, a.accountKey)),
      a.coverageStart ? dateCell(a.coverageStart) : textCell(""),
      a.coverageEnd ? dateCell(a.coverageEnd) : textCell(""),
      numCell(a.inventory.length),
      numCell(a.inventory.filter((i) => i.status === "verified").length),
      numCell(a.inventory.filter((i) => i.status === "partial").length),
      numCell(a.inventory.filter((i) => i.status === "failed").length),
      numCell(breaks),
    ]);
  }
  XLSX.utils.book_append_sheet(wb, sheetOf(recRows, [24, 13, 13, 11, 9, 9, 9, 16]), "Reconciliation");

  // ── Issues ───────────────────────────────────────────────────────────
  const issueKinds = new Set(["missing-period", "overlap", "duplicate-statement", "balance-discontinuity", "duplicate-transaction", "large-transaction"]);
  const issueRows: XLSX.CellObject[][] = [["Account", "Type", "Detail"].map(textCell)];
  for (const f of result.findings) {
    if (!issueKinds.has(f.kind)) continue;
    issueRows.push([
      textCell(accountLabel(result, f.accountKey)),
      textCell(f.kind),
      textCell(describeFinding(f)),
    ]);
  }
  for (const u of result.unparsed) {
    issueRows.push([textCell("—"), textCell("unreadable-file"), textCell(`${u.fileName}: ${u.errorCode}`)]);
  }
  XLSX.utils.book_append_sheet(wb, sheetOf(issueRows, [24, 22, 110]), "Issues");

  // ── Recurring Transactions ───────────────────────────────────────────
  const recurRows: XLSX.CellObject[][] = [
    ["Account", "Direction", "Description", "Occurrences", "Cadence", "Average amount"].map(textCell),
  ];
  for (const f of result.findings) {
    if (f.kind !== "recurring") continue;
    recurRows.push([
      textCell(accountLabel(result, f.accountKey)),
      textCell(f.direction === "in" ? "deposit" : "payment"),
      textCell(f.description),
      numCell(f.occurrences),
      textCell(f.cadence),
      moneyCell(f.averageCents),
    ]);
  }
  XLSX.utils.book_append_sheet(wb, sheetOf(recurRows, [24, 10, 40, 12, 10, 14]), "Recurring Transactions");

  return wb;
}

export function toAuditXlsxBytes(result: AuditResult, opts: { verifiedOnly?: boolean } = {}): Uint8Array {
  return new Uint8Array(
    XLSX.write(toAuditWorkbook(result, opts), { type: "array", bookType: "xlsx", cellDates: true }),
  );
}
