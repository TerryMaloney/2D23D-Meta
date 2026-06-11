/**
 * Golden tests: every bank fixture must parse to exactly the committed
 * expected output, and every successful parse must reconcile `verified`
 * (the property test from the spec).
 */

import { describe, it, expect } from "vitest";
import { parseStatement } from "@parser/parse";
import type { ParsedStatement } from "@parser/types";
import { fixturePdf, loadRawPages, readGolden } from "./harness";

interface GoldenTx {
  date: string;
  postDate?: string;
  description: string;
  amountCents: number;
  balanceCents?: number;
  checkNumber?: string;
  currency?: string;
}

interface Golden {
  templateId: string;
  currency: string;
  periodStart?: string;
  periodEnd?: string;
  openingBalanceCents?: number;
  closingBalanceCents?: number;
  reconciliationStatus: "verified";
  transactions: GoldenTx[];
}

const FIXTURES = [
  "chase-checking",
  "chase-card",
  "boa-checking",
  "wells-fargo-checking",
  "citi-card",
  "capital-one-card",
  "amex-card",
  "us-bank-checking",
  "sectioned-sample",
  "regz-card",
  "paypal-activity",
  "wise-statement",
];

function comparable(s: ParsedStatement): unknown {
  return {
    templateId: s.templateId,
    currency: s.currency,
    periodStart: s.periodStart,
    periodEnd: s.periodEnd,
    openingBalanceCents: s.openingBalanceCents,
    closingBalanceCents: s.closingBalanceCents,
    reconciliationStatus: s.reconciliation.status,
    transactions: s.transactions.map((t) => {
      const out: GoldenTx = {
        date: t.date,
        description: t.description,
        amountCents: t.amountCents,
      };
      if (t.postDate !== undefined) out.postDate = t.postDate;
      if (t.balanceCents !== undefined) out.balanceCents = t.balanceCents;
      if (t.checkNumber !== undefined) out.checkNumber = t.checkNumber;
      if (t.currency !== undefined) out.currency = t.currency;
      return out;
    }),
  };
}

function normalizeGolden(g: Golden): unknown {
  return {
    templateId: g.templateId,
    currency: g.currency,
    periodStart: g.periodStart,
    periodEnd: g.periodEnd,
    openingBalanceCents: g.openingBalanceCents,
    closingBalanceCents: g.closingBalanceCents,
    reconciliationStatus: g.reconciliationStatus,
    transactions: g.transactions.map((t) => {
      const out: GoldenTx = {
        date: t.date,
        description: t.description,
        amountCents: t.amountCents,
      };
      if (t.postDate !== undefined) out.postDate = t.postDate;
      if (t.balanceCents !== undefined) out.balanceCents = t.balanceCents;
      if (t.checkNumber !== undefined) out.checkNumber = t.checkNumber;
      if (t.currency !== undefined) out.currency = t.currency;
      return out;
    }),
  };
}

describe.each(FIXTURES)("golden: %s", (name) => {
  it("parses to exactly the expected output and reconciles verified", async () => {
    const pages = await loadRawPages(fixturePdf(name));
    const output = parseStatement(pages);
    expect(output.statements).toHaveLength(1);
    const golden = readGolden<Golden>(name);
    expect(comparable(output.statements[0])).toEqual(normalizeGolden(golden));
  });
});

describe("multi-account statement", () => {
  it("splits into one verified statement per account", async () => {
    const pages = await loadRawPages(fixturePdf("multi-account"));
    const output = parseStatement(pages);
    const goldens = readGolden<Golden[]>("multi-account");
    expect(output.statements).toHaveLength(goldens.length);
    output.statements.forEach((s, i) => {
      expect(comparable(s)).toEqual(normalizeGolden(goldens[i]));
    });
  });
});

describe("property: parsed ⇒ verified", () => {
  it.each(FIXTURES)("%s reconciles to the cent", async (name) => {
    const pages = await loadRawPages(fixturePdf(name));
    const output = parseStatement(pages);
    for (const s of output.statements) {
      expect(s.reconciliation.status).toBe("verified");
      expect(s.reconciliation.flaggedRowIndices).toEqual([]);
    }
  });
});

describe("performance: 120-page statement", () => {
  it("parses and reconciles in under 10 seconds", async () => {
    const pages = await loadRawPages(fixturePdf("us-bank-120-pages"));
    const started = performance.now();
    const output = parseStatement(pages);
    const elapsed = performance.now() - started;
    const golden = readGolden<Golden>("us-bank-120-pages");
    expect(output.statements[0].transactions).toHaveLength(golden.transactions.length);
    expect(output.statements[0].reconciliation.status).toBe("verified");
    expect(elapsed).toBeLessThan(10_000);
  }, 60_000);
});
