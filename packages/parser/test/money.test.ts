import { describe, it, expect } from "vitest";
import { parseAmount, looksLikeAmount, centsToDecimal, formatCents } from "@parser/money";

describe("parseAmount", () => {
  it("parses plain US amounts", () => {
    expect(parseAmount("1,234.56")?.cents).toBe(123456);
    expect(parseAmount("1234.56")?.cents).toBe(123456);
    expect(parseAmount("0.99")?.cents).toBe(99);
    expect(parseAmount("12")?.cents).toBe(1200);
    expect(parseAmount("12.5")?.cents).toBe(1250);
  });

  it("parses currency symbols", () => {
    expect(parseAmount("$1,234.56")?.cents).toBe(123456);
    expect(parseAmount("$ 1,234.56")?.cents).toBe(123456);
    expect(parseAmount("€500.00")?.cents).toBe(50000);
    expect(parseAmount("£42.10")?.cents).toBe(4210);
  });

  it("parses parentheses as negative", () => {
    const r = parseAmount("(1,234.56)");
    expect(r?.cents).toBe(-123456);
    expect(r?.explicitSign).toBe(true);
  });

  it("parses leading minus in both positions", () => {
    expect(parseAmount("-1,234.56")?.cents).toBe(-123456);
    expect(parseAmount("-$1,234.56")?.cents).toBe(-123456);
    expect(parseAmount("$-1,234.56")?.cents).toBe(-123456);
  });

  it("parses trailing minus", () => {
    const r = parseAmount("1234.56-");
    expect(r?.cents).toBe(-123456);
    expect(r?.explicitSign).toBe(true);
  });

  it("parses CR/DR markers", () => {
    const cr = parseAmount("123.45 CR");
    expect(cr?.cents).toBe(12345);
    expect(cr?.marker).toBe("CR");
    const dr = parseAmount("123.45 DR");
    expect(dr?.cents).toBe(-12345);
    expect(dr?.marker).toBe("DR");
  });

  it("parses European format when locale is eu", () => {
    expect(parseAmount("1.234,56", "eu")?.cents).toBe(123456);
    expect(parseAmount("1234,56", "eu")?.cents).toBe(123456);
    expect(parseAmount("-1.234,56", "eu")?.cents).toBe(-123456);
  });

  it("parses unambiguous European format even in us locale", () => {
    expect(parseAmount("1.234,56")?.cents).toBe(123456);
  });

  it("rejects non-amounts", () => {
    expect(parseAmount("CHECK 1024")).toBeNull();
    expect(parseAmount("12/28")).toBeNull();
    expect(parseAmount("")).toBeNull();
    expect(parseAmount("abc")).toBeNull();
    expect(parseAmount("1,23.45")).toBeNull(); // bad grouping
  });

  it("treats dot-with-3-digits as EU thousands grouping", () => {
    // "1.234" cannot be a US amount (max 2 decimal places), so it is read
    // as European thousands grouping: 1234.00.
    expect(parseAmount("1.234")?.cents).toBe(123400);
  });
});

describe("looksLikeAmount", () => {
  it("accepts decimal amounts and currency-marked values", () => {
    expect(looksLikeAmount("1,234.56")).toBe(true);
    expect(looksLikeAmount("$12")).toBe(true);
    expect(looksLikeAmount("(45.00)")).toBe(true);
  });
  it("rejects bare integers (check numbers, page numbers)", () => {
    expect(looksLikeAmount("1024")).toBe(false);
    expect(looksLikeAmount("3")).toBe(false);
  });
  it("rejects dates", () => {
    expect(looksLikeAmount("12/28")).toBe(false);
    expect(looksLikeAmount("2025-12-28")).toBe(false);
  });
});

describe("formatting", () => {
  it("centsToDecimal", () => {
    expect(centsToDecimal(123456)).toBe("1234.56");
    expect(centsToDecimal(-50)).toBe("-0.50");
    expect(centsToDecimal(0)).toBe("0.00");
  });
  it("formatCents", () => {
    expect(formatCents(123456)).toBe("1,234.56");
    expect(formatCents(-123456)).toBe("-1,234.56");
  });
});
