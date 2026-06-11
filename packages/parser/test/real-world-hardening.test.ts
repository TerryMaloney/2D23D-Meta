/**
 * Unit tests for parser behaviors added during real-world hardening, each
 * traced to the public document that exposed the gap.
 */

import { describe, expect, it } from "vitest";
import { detectPeriod } from "@parser/dates";
import { classifyRow, isBalanceGridRow, isTransactionRow } from "@parser/fields";
import { parseAmount } from "@parser/money";
import type { Row } from "@parser/rows";
import type { PositionedText } from "@parser/types";

function row(strs: string[]): Row {
  const items: PositionedText[] = strs.map((str, i) => ({
    str,
    x: 50 + i * 90,
    y: 100,
    width: str.length * 5,
    height: 10,
    page: 1,
  }));
  return { page: 1, y: 100, items };
}

describe("en-dash negatives (Fed G-18(G))", () => {
  it("parses trailing en dash and minus sign as negative", () => {
    expect(parseAmount("$450.00–")?.cents).toBe(-45000);
    expect(parseAmount("450.00−")?.cents).toBe(-45000);
    expect(parseAmount("450.00-")?.cents).toBe(-45000);
  });
});

describe("lone closing-date periods (Fed G-18(G), Amex style)", () => {
  it("synthesizes a one-cycle period from a statement closing date", () => {
    const p = detectPeriod("Statement closing date 3/22/2007");
    expect(p?.end).toBe("2007-03-22");
    expect(p?.start).toBe("2007-02-16"); // 34 days earlier
  });
  it("still prefers explicit ranges", () => {
    const p = detectPeriod("Statement period 01/01/2026 - 01/31/2026 closing date 1/31/2026");
    expect(p).toEqual({ start: "2026-01-01", end: "2026-01-31" });
  });
});

describe("description-first transaction rows (Commerce Bank)", () => {
  it("accepts a date directly before the amount after reference columns", () => {
    const c = classifyRow(row(["Deposit", "Ref Nbr:", "130012345", "05-15", "$3,615.08"]));
    expect(isTransactionRow(c)).toBe(true);
  });
  it("still rejects rows whose only date is buried mid-description", () => {
    const c = classifyRow(row(["NOTE", "SEE", "ITEM", "12/02", "ATTACHED", "REFERENCE"]));
    expect(isTransactionRow(c)).toBe(false);
  });
});

describe("summary grids are not transactions (Carson Bank)", () => {
  it("detects daily-balance grids (date/amount pairs)", () => {
    const c = classifyRow(row(["07/16/2019", "$942.83", "07/25/2019", "$842.83", "07/24/2019", "$7,285.72"]));
    expect(isBalanceGridRow(c)).toBe(true);
  });
  it("detects checks-paid grids (check/date/amount triplets with break markers)", () => {
    const c = classifyRow(row(["4421", "07/12/19", "$12.53", "4423", "07/19/19", "$114.00", "4451", "*", "07/25/19", "$150.00"]));
    expect(isBalanceGridRow(c)).toBe(true);
  });
  it("does not flag ordinary transaction rows with a balance column", () => {
    const c = classifyRow(row(["01/02", "NORTHWIND GROCERY", "-761.72", "3,448.83"]));
    expect(isBalanceGridRow(c)).toBe(false);
    expect(isTransactionRow(c)).toBe(true);
  });
  it("does not flag check rows with reference numbers", () => {
    const c = classifyRow(row(["05-12", "1001", "75.00", "00012576589"]));
    expect(isBalanceGridRow(c)).toBe(false);
    expect(isTransactionRow(c)).toBe(true);
  });
});
