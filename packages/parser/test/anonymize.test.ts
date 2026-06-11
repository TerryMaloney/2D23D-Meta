/**
 * Sanitization guarantees: personal information must not survive the
 * anonymizer, and a layout twin built from an anonymized layout must parse,
 * reconcile, and contain none of the original data.
 */

import { describe, expect, it } from "vitest";
import { anonymizeLayout, anonymizeToken } from "@parser/anonymize";
import { detectDate } from "@parser/dates";
import { parseStatement } from "@parser/parse";
import type { RawPage } from "@parser/types";
import { buildLayoutTwin } from "../fixtures/layout-twin";
import { fixturePdf, loadRawPages } from "./harness";

function rawPage(items: { str: string; x: number; y: number }[]): RawPage {
  return {
    pageNumber: 1,
    pageHeight: 792,
    items: items.map((i) => ({
      str: i.str,
      transform: [10, 0, 0, 10, i.x, i.y],
      width: i.str.length * 5,
      height: 10,
    })),
  };
}

describe("anonymizeToken", () => {
  it("destroys names and free text (deterministic hash)", () => {
    expect(anonymizeToken("JOHNSON")).not.toContain("JOHNSON");
    expect(anonymizeToken("JOHNSON")).toBe(anonymizeToken("JOHNSON"));
    expect(anonymizeToken("Maple")).not.toMatch(/maple/i);
  });

  it("strips account-number-length digit runs entirely", () => {
    expect(anonymizeToken("12345678901")).toBe("###########");
    expect(anonymizeToken("083000137")).toBe("#########");
  });

  it("destroys SSN-shaped tokens", () => {
    // Nine digits total trips the account-number rule: stripped entirely.
    expect(anonymizeToken("123-45-6789")).toBe("###-##-####");
  });

  it("keeps statement vocabulary verbatim", () => {
    expect(anonymizeToken("Balance")).toBe("Balance");
    expect(anonymizeToken("Deposits")).toBe("Deposits");
    expect(anonymizeToken("DEC")).toBe("DEC");
  });

  it("replaces dates with valid dates in the same format, never the original", () => {
    const samples = ["01/15", "01/15/26", "01/15/2026", "2026-01-15"];
    for (const s of samples) {
      let changed = false;
      for (let i = 0; i < 20; i++) {
        const out = anonymizeToken(s);
        expect(detectDate(out), `${s} -> ${out} must stay a valid date`).not.toBeNull();
        if (out !== s) changed = true;
      }
      expect(changed, `${s} must not survive every time`).toBe(true);
    }
  });

  it("randomizes amounts but keeps the money shape", () => {
    const out = anonymizeToken("1,234.56");
    expect(out).toMatch(/^\d,\d{3}\.\d{2}$/);
  });
});

describe("anonymizeLayout", () => {
  const page = rawPage([
    { str: "JOHN Q PUBLIC", x: 50, y: 700 },
    { str: "123 MAPLEWOOD AVENUE APT 4B", x: 50, y: 688 },
    { str: "Account Number: 9988776655", x: 50, y: 676 },
    { str: "SSN 987-65-4321", x: 50, y: 664 },
    { str: "01/12", x: 50, y: 600 },
    { str: "ACME PAYROLL DEPOSIT", x: 120, y: 600 },
    { str: "2,500.00", x: 400, y: 600 },
    { str: "Beginning Balance", x: 50, y: 640 },
    { str: "4,210.55", x: 400, y: 640 },
  ]);

  it("removes every seeded PII pattern from the output", () => {
    const json = JSON.stringify(anonymizeLayout([page], "UNRECOGNIZED_LAYOUT"));
    for (const pii of [
      "JOHN", "PUBLIC", "MAPLEWOOD", "AVENUE",
      "9988776655", "987-65-4321", "ACME", "PAYROLL",
      "2,500.00", "4,210.55",
    ]) {
      expect(json, `${pii} must not survive`).not.toContain(pii);
    }
  });

  it("keeps geometry and statement vocabulary", () => {
    const layout = anonymizeLayout([page], "UNRECOGNIZED_LAYOUT");
    const strs = layout.pages[0].items.map((i) => i.str);
    expect(strs.join(" ")).toContain("Beginning Balance");
    expect(layout.pages[0].items[0].x).toBe(50);
    expect(layout.pages[0].items[0].s).toBe(10);
  });

  it("carries only the error enum, never extracted text", () => {
    const layout = anonymizeLayout([page], "PARTIAL_PARSE");
    expect(layout.errorType).toBe("PARTIAL_PARSE");
  });
});

describe("layout twin", () => {
  it("rebuilds a parseable, reconciling statement with zero original data", async () => {
    // Use the Chase fixture as the "private" source document.
    const original = await loadRawPages(fixturePdf("chase-checking"));
    const layout = anonymizeLayout(original, "PARTIAL_PARSE");
    const twin = await buildLayoutTwin(layout, 7);

    const twinPages = await loadRawPages(twin.pdf);
    const twinText = twinPages
      .flatMap((p) => p.items.map((i) => i.str))
      .join(" ");

    // None of the original fixture's invented merchants/amounts survive.
    for (const s of ["NORTHWIND", "ZELLE", "PAYROLL", "ACME", "4,210.55", "7204"]) {
      expect(twinText, `${s} must not appear in the twin`).not.toContain(s);
    }

    // The twin parses through the production engine and reconciles.
    const output = parseStatement(twinPages);
    const stmt = output.statements[0];
    expect(stmt.transactions.length).toBe(twin.transactionCount);
    expect(stmt.openingBalanceCents).toBe(twin.openingCents);
    expect(stmt.closingBalanceCents).toBe(twin.closingCents);
    expect(stmt.reconciliation.status).toBe("verified");
  }, 30_000);
});
