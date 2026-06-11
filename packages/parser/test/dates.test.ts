import { describe, it, expect } from "vitest";
import { detectDate, detectPeriod, resolveDate } from "@parser/dates";

describe("detectDate", () => {
  it("detects MM/DD without year", () => {
    expect(detectDate("12/28")).toEqual({ month: 12, day: 28, year: undefined });
    expect(detectDate("1/5")).toEqual({ month: 1, day: 5, year: undefined });
  });
  it("detects MM/DD/YY and MM/DD/YYYY", () => {
    expect(detectDate("12/28/25")).toEqual({ month: 12, day: 28, year: 2025 });
    expect(detectDate("12/28/2025")).toEqual({ month: 12, day: 28, year: 2025 });
    expect(detectDate("01/05/99")).toEqual({ month: 1, day: 5, year: 1999 });
  });
  it("detects DD MMM (Citi style)", () => {
    expect(detectDate("28 DEC")).toEqual({ month: 12, day: 28, year: undefined });
    expect(detectDate("5 Jan")).toEqual({ month: 1, day: 5, year: undefined });
  });
  it("detects MMM DD and full month names", () => {
    expect(detectDate("Dec 28")).toEqual({ month: 12, day: 28, year: undefined });
    expect(detectDate("December 28, 2025")).toEqual({ month: 12, day: 28, year: 2025 });
  });
  it("detects ISO", () => {
    expect(detectDate("2025-12-28")).toEqual({ year: 2025, month: 12, day: 28 });
  });
  it("rejects non-dates", () => {
    expect(detectDate("1,234.56")).toBeNull();
    expect(detectDate("13/45")).toBeNull();
    expect(detectDate("CHECK")).toBeNull();
    expect(detectDate("")).toBeNull();
  });
});

describe("detectPeriod", () => {
  it("finds word-style periods", () => {
    expect(
      detectPeriod("Statement Period: January 1, 2026 through January 31, 2026"),
    ).toEqual({ start: "2026-01-01", end: "2026-01-31" });
  });
  it("finds numeric periods", () => {
    expect(detectPeriod("12/01/2025 - 12/31/2025")).toEqual({
      start: "2025-12-01",
      end: "2025-12-31",
    });
  });
  it("finds DD MMM YYYY periods", () => {
    expect(detectPeriod("1 December 2025 to 31 December 2025")).toEqual({
      start: "2025-12-01",
      end: "2025-12-31",
    });
  });
  it("finds Dec→Jan wraparound periods", () => {
    expect(
      detectPeriod("December 15, 2025 through January 14, 2026"),
    ).toEqual({ start: "2025-12-15", end: "2026-01-14" });
  });
  it("returns null when absent", () => {
    expect(detectPeriod("TRANSACTION DETAIL")).toBeNull();
  });
});

describe("resolveDate (year inference)", () => {
  const wrap = { start: "2025-12-15", end: "2026-01-14" };
  it("resolves dates inside a single-year period", () => {
    const p = { start: "2026-01-01", end: "2026-01-31" };
    expect(resolveDate({ month: 1, day: 12 }, p)).toBe("2026-01-12");
  });
  it("handles Dec→Jan wraparound: December dates get the earlier year", () => {
    expect(resolveDate({ month: 12, day: 20 }, wrap)).toBe("2025-12-20");
  });
  it("handles Dec→Jan wraparound: January dates get the later year", () => {
    expect(resolveDate({ month: 1, day: 5 }, wrap)).toBe("2026-01-05");
  });
  it("keeps explicit years", () => {
    expect(resolveDate({ month: 6, day: 1, year: 2020 }, wrap)).toBe("2020-06-01");
  });
  it("picks the nearest year for slightly-out-of-period dates", () => {
    // Posted just before the period start.
    expect(resolveDate({ month: 12, day: 13 }, wrap)).toBe("2025-12-13");
  });
});
