/**
 * XLSX writer (SheetJS): typed date and currency cells — not strings — a
 * frozen header row, and a summary block carrying the reconciliation result.
 */

import * as XLSX from "xlsx";
import { ParsedStatement } from "./common";

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

export function toXlsxWorkbook(statement: ParsedStatement): XLSX.WorkBook {
  const r = statement.reconciliation;
  const hasBalance = statement.transactions.some((t) => t.balanceCents !== undefined);
  const hasCheck = statement.transactions.some((t) => t.checkNumber !== undefined);

  const header = [
    "Date",
    ...(hasCheck ? ["Check Number"] : []),
    "Description",
    "Amount",
    ...(hasBalance ? ["Balance"] : []),
  ];

  const ws: XLSX.WorkSheet = {};
  const set = (row: number, col: number, cell: XLSX.CellObject) => {
    ws[XLSX.utils.encode_cell({ r: row, c: col })] = cell;
  };

  header.forEach((h, c) => set(0, c, textCell(h)));

  statement.transactions.forEach((t, i) => {
    const row = i + 1;
    let col = 0;
    set(row, col++, dateCell(t.date));
    if (hasCheck) set(row, col++, textCell(t.checkNumber ?? ""));
    set(row, col++, textCell(t.description));
    set(row, col++, moneyCell(t.amountCents));
    if (hasBalance && t.balanceCents !== undefined) set(row, col, moneyCell(t.balanceCents));
  });

  // Summary block under the data: the reconciliation result travels with
  // the spreadsheet.
  const base = statement.transactions.length + 2;
  const statusText =
    r.status === "verified"
      ? "Verified to the cent"
      : r.status === "partial"
        ? "Partially verified — review flagged rows"
        : "Reconciliation failed — review before use";
  set(base, 0, textCell("Reconciliation"));
  set(base, 1, textCell(statusText));
  if (statement.openingBalanceCents !== undefined) {
    set(base + 1, 0, textCell("Opening balance"));
    set(base + 1, 1, moneyCell(statement.openingBalanceCents));
  }
  set(base + 2, 0, textCell("Transaction total"));
  set(base + 2, 1, moneyCell(r.transactionSumCents));
  if (statement.closingBalanceCents !== undefined) {
    set(base + 3, 0, textCell("Closing balance"));
    set(base + 3, 1, moneyCell(statement.closingBalanceCents));
  }

  ws["!ref"] = XLSX.utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: base + 3, c: header.length - 1 },
  });
  ws["!cols"] = [
    { wch: 12 },
    ...(hasCheck ? [{ wch: 10 }] : []),
    { wch: 48 },
    { wch: 14 },
    ...(hasBalance ? [{ wch: 14 }] : []),
  ];
  // Freeze the header row (ignored by readers that don't support it).
  ws["!freeze"] = { xSplit: 0, ySplit: 1 } as unknown as XLSX.WorkSheet["!freeze"];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Transactions");
  return wb;
}

/** Serialize to bytes for download or test inspection. */
export function toXlsxBytes(statement: ParsedStatement): Uint8Array {
  return new Uint8Array(
    XLSX.write(toXlsxWorkbook(statement), { type: "array", bookType: "xlsx", cellDates: true }),
  );
}
