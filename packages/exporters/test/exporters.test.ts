import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import type { ParsedStatement, Transaction } from "@parser/types";
import { toCsv } from "@exporters/csv";
import { toXeroCsv } from "@exporters/xero";
import { toOfx } from "@exporters/ofx";
import { toXlsxBytes } from "@exporters/xlsx";
import { fitid } from "@exporters/common";

function tx(partial: Partial<Transaction> & Pick<Transaction, "date" | "description" | "amountCents">): Transaction {
  return { confidence: 1, flags: [], sourcePage: 1, ...partial };
}

const statement: ParsedStatement = {
  bankName: "Chase",
  currency: "USD",
  periodStart: "2026-01-01",
  periodEnd: "2026-01-31",
  openingBalanceCents: 100000,
  closingBalanceCents: 124566,
  transactions: [
    tx({ date: "2026-01-02", description: "PAYROLL DIRECT DEP ACME LLC", amountCents: 50000, balanceCents: 150000 }),
    tx({
      date: "2026-01-03",
      description: 'COFFEE, "THE BLUE KETTLE" SHOP WITH A VERY LONG TRAILING REFERENCE 0042',
      amountCents: -1234,
      balanceCents: 148766,
    }),
    tx({ date: "2026-01-10", description: "CHECK", amountCents: -24200, balanceCents: 124566, checkNumber: "1024" }),
  ],
  templateId: "chase-checking-v1",
  reconciliation: {
    status: "verified",
    openingBalanceCents: 100000,
    closingBalanceCents: 124566,
    transactionSumCents: 24566,
    creditSumCents: 50000,
    debitSumCents: -25434,
    flaggedRowIndices: [],
    notes: [],
  },
  warnings: [],
};

describe("CSV writer", () => {
  it("writes signed single-column CSV with BOM, quoting, and balances", () => {
    const csv = toCsv(statement);
    expect(csv.charCodeAt(0)).toBe(0xfeff); // BOM
    const lines = csv.slice(1).trimEnd().split("\r\n");
    expect(lines[0]).toBe("Date,Description,Amount,Balance");
    expect(lines[1]).toBe("01/02/2026,PAYROLL DIRECT DEP ACME LLC,500.00,1500.00");
    // Quoted field: contains comma and quotes.
    expect(lines[2]).toContain('"COFFEE, ""THE BLUE KETTLE""');
    expect(lines[2]).toContain("-12.34");
  });

  it("writes separate debit/credit columns", () => {
    const csv = toCsv(statement, { signStyle: "debit-credit", bom: false, includeBalance: false });
    const lines = csv.trimEnd().split("\r\n");
    expect(lines[0]).toBe("Date,Description,Debit,Credit");
    expect(lines[1].endsWith(",500.00")).toBe(true); // credit column
    expect(lines[3]).toContain(",242.00,"); // debit column
  });

  it("supports ISO and DD/MM/YYYY dates", () => {
    expect(toCsv(statement, { dateStyle: "ISO", bom: false })).toContain("2026-01-02");
    expect(toCsv(statement, { dateStyle: "DD/MM/YYYY", bom: false })).toContain("02/01/2026");
  });

  it("includes a check number column when requested", () => {
    const csv = toCsv(statement, { includeCheckNumber: true, bom: false });
    expect(csv).toContain("Check Number");
    expect(csv).toContain("1024");
  });
});

describe("Xero CSV writer", () => {
  it("uses Xero's precoded layout", () => {
    const csv = toXeroCsv(statement);
    const lines = csv.slice(1).trimEnd().split("\r\n");
    expect(lines[0]).toBe("Date,Amount,Payee,Description,Reference");
    expect(lines[1]).toBe(
      "02/01/2026,500.00,PAYROLL DIRECT DEP ACME,PAYROLL DIRECT DEP ACME LLC,",
    );
    expect(lines[3]).toContain("1024"); // check number as reference
  });
});

describe("OFX/QFX/QBO writer", () => {
  const ofx = toOfx(statement, { flavor: "qbo", accountId: "...7204" });

  it("emits a valid OFX 1.02 header", () => {
    expect(ofx).toContain("OFXHEADER:100");
    expect(ofx).toContain("VERSION:102");
  });

  it("formats DTPOSTED as YYYYMMDD and TRNAMT as signed decimal", () => {
    expect(ofx).toContain("<DTPOSTED>20260102");
    expect(ofx).toContain("<TRNAMT>500.00");
    expect(ofx).toContain("<TRNAMT>-12.34");
  });

  it("derives TRNTYPE from sign, with CHECK + CHECKNUM for checks", () => {
    expect(ofx).toContain("<TRNTYPE>CREDIT");
    expect(ofx).toContain("<TRNTYPE>DEBIT");
    expect(ofx).toContain("<TRNTYPE>CHECK");
    expect(ofx).toContain("<CHECKNUM>1024");
  });

  it("truncates NAME to 32 chars with overflow into MEMO", () => {
    const nameLine = ofx.split("\n").find((l) => l.startsWith("<NAME>COFFEE"));
    expect(nameLine).toBeDefined();
    expect(nameLine!.replace("<NAME>", "").length).toBeLessThanOrEqual(32);
    expect(ofx).toContain("<MEMO>");
  });

  it("FITIDs are unique and deterministic", () => {
    const ids = [...ofx.matchAll(/<FITID>(\S+)/g)].map((m) => m[1]);
    expect(ids).toHaveLength(3);
    expect(new Set(ids).size).toBe(3);
    expect(fitid(statement.transactions[0], 0)).toBe(ids[0]);
    // Identical rows at different indices still get distinct FITIDs.
    expect(fitid(statement.transactions[0], 0)).not.toBe(fitid(statement.transactions[0], 1));
  });

  it("includes INTU.BID for qbo/qfx but not plain ofx", () => {
    expect(ofx).toContain("<INTU.BID>3000");
    expect(toOfx(statement, { flavor: "qfx" })).toContain("<INTU.BID>");
    expect(toOfx(statement, { flavor: "ofx" })).not.toContain("<INTU.BID>");
  });

  it("uses the credit-card aggregate for card accounts and can flip signs", () => {
    const card = toOfx(statement, { accountType: "CREDITCARD", invertSigns: true });
    expect(card).toContain("<CCSTMTRS>");
    expect(card).toContain("<CCACCTFROM>");
    expect(card).not.toContain("<BANKACCTFROM>");
    expect(card).toContain("<TRNAMT>-500.00"); // inverted
  });

  it("balances container tags structurally", () => {
    for (const tag of ["OFX", "SIGNONMSGSRSV1", "SONRS", "STATUS", "FI", "BANKMSGSRSV1", "STMTTRNRS", "STMTRS", "BANKACCTFROM", "BANKTRANLIST", "STMTTRN", "LEDGERBAL"]) {
      const opens = (ofx.match(new RegExp(`<${tag}>`, "g")) ?? []).length;
      const closes = (ofx.match(new RegExp(`</${tag}>`, "g")) ?? []).length;
      expect(opens, tag).toBeGreaterThan(0);
      expect(opens, tag).toBe(closes);
    }
  });

  it("carries the closing balance in LEDGERBAL", () => {
    expect(ofx).toContain("<BALAMT>1245.66");
  });
});

describe("XLSX writer", () => {
  const bytes = toXlsxBytes(statement);
  const wb = XLSX.read(bytes, { type: "array", cellDates: true });
  const ws = wb.Sheets["Transactions"];

  it("writes typed date cells, not strings", () => {
    const cell = ws["A2"];
    expect(cell.t).toBe("d");
    expect(cell.v).toBeInstanceOf(Date);
    expect((cell.v as Date).getUTCFullYear()).toBe(2026);
  });

  it("writes typed currency cells with number formats", () => {
    // Columns: Date, Check Number, Description, Amount, Balance.
    const cell = ws["D2"];
    expect(cell.t).toBe("n");
    expect(cell.v).toBe(500);
  });

  it("includes the reconciliation summary block", () => {
    const flat = Object.values(ws)
      .map((c) => (typeof c === "object" && c && "v" in c ? String((c as XLSX.CellObject).v) : ""))
      .join("|");
    expect(flat).toContain("Verified to the cent");
  });
});
