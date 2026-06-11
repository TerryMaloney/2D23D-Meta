/**
 * Multi-statement audit engine tests, run against the deterministic audit
 * fixture set: 13 months of one account (with a Dec→Jan boundary, a missing
 * month, a duplicate statement, an overlapping statement, and a balance
 * discontinuity), a second account, a credit-card statement, and one
 * unreadable file.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import { audit, AuditResult, AuditSource } from "@parser/audit";
import { parseStatement } from "@parser/parse";
import { StatementParseError } from "@parser/types";
import { loadRawPages } from "./harness";

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "fixtures", "audit");

let result: AuditResult;
let sources: AuditSource[];

beforeAll(async () => {
  const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".pdf")).sort();
  sources = [];
  for (let i = 0; i < files.length; i++) {
    const sourceId = `file-${i + 1}`;
    try {
      const pages = await loadRawPages(path.join(DIR, files[i]));
      sources.push({ sourceId, fileName: files[i], statements: parseStatement(pages).statements });
    } catch (e) {
      sources.push({
        sourceId,
        fileName: files[i],
        errorCode: e instanceof StatementParseError ? e.code : "UNREADABLE",
      });
    }
  }
  result = audit(sources);
}, 120_000);

function findings<K extends AuditResult["findings"][number]["kind"]>(kind: K) {
  return result.findings.filter((f) => f.kind === kind) as Extract<
    AuditResult["findings"][number],
    { kind: K }
  >[];
}

describe("multi-statement audit", () => {
  it("groups statements into the right accounts", () => {
    // Checking ...7204, savings ...8166, card ...9913.
    expect(result.accounts).toHaveLength(3);
    const ids = result.accounts.map((a) => a.accountId).sort();
    expect(ids).toEqual(["...7204", "...8166", "...9913"]);
  });

  it("keeps the unreadable file visibly separated", () => {
    expect(result.unparsed).toHaveLength(1);
    expect(result.unparsed[0].fileName).toBe("corrupt.pdf");
  });

  it("detects the missing month (2025-06)", () => {
    const gaps = findings("missing-period");
    expect(gaps.some((g) => g.fromIso === "2025-06-01" && g.toIso === "2025-06-30")).toBe(true);
  });

  it("detects the duplicate statement (March copy)", () => {
    const dups = findings("duplicate-statement");
    expect(dups).toHaveLength(1);
    const inv = result.accounts.find((a) => a.accountId === "...7204")!.inventory;
    const flagged = inv.filter((i) => i.duplicateOf);
    expect(flagged).toHaveLength(1);
    expect(flagged[0].fileName).toMatch(/2025-03/);
  });

  it("detects the overlapping statement", () => {
    expect(findings("overlap").length).toBeGreaterThanOrEqual(1);
  });

  it("detects the balance discontinuity going into November", () => {
    const disc = findings("balance-discontinuity");
    expect(disc).toHaveLength(1);
    expect(disc[0].actualCents - disc[0].expectedCents).toBe(50000);
  });

  it("flags duplicate transactions shared with the overlap statement", () => {
    const dups = findings("duplicate-transaction");
    expect(dups.length).toBeGreaterThanOrEqual(2);
    for (const d of dups) expect(d.sourceIds.length).toBeGreaterThan(1);
  });

  it("finds the recurring subscription, payroll, and service fee", () => {
    const recurring = findings("recurring");
    const subscription = recurring.find((r) => r.description === "ORBIT WIRELESS" && r.direction === "out");
    expect(subscription?.cadence).toBe("monthly");
    const payroll = recurring.find((r) => /PAYROLL/.test(r.description) && r.direction === "in");
    expect(payroll).toBeDefined();
    expect(payroll!.averageCents).toBe(250000);

    const fees = findings("fee");
    const service = fees.find((f) => f.feeType === "service");
    expect(service).toBeDefined();
    expect(service!.occurrences).toBeGreaterThanOrEqual(12);
  });

  it("sorts statements chronologically across the Dec→Jan boundary", () => {
    const inv = result.accounts.find((a) => a.accountId === "...7204")!.inventory;
    expect(inv[0].periodStart).toBe("2024-12-01");
    expect(inv[1].periodStart).toBe("2025-01-01");
    const starts = inv.map((i) => i.periodStart!);
    expect([...starts].sort()).toEqual(starts);
  });

  it("builds a chronological merged ledger carrying per-source verification", () => {
    const checking = result.accounts.find((a) => a.accountId === "...7204")!;
    const dates = checking.ledger.map((e) => e.tx.date);
    expect([...dates].sort()).toEqual(dates);
    expect(checking.ledger.every((e) => typeof e.verified === "boolean")).toBe(true);
    // Every fixture statement reconciles, so all entries are verified.
    expect(checking.ledger.every((e) => e.verified)).toBe(true);
  });

  it("produces monthly summaries with consistent arithmetic", () => {
    const checking = result.accounts.find((a) => a.accountId === "...7204")!;
    for (const m of checking.monthly) {
      expect(m.inCents + m.outCents).toBe(m.netCents);
      expect(m.txCount).toBeGreaterThan(0);
    }
    expect(checking.monthly.some((m) => m.month === "2025-06")).toBe(false);
  });

  it("never silently merges an unverified statement into a verified ledger", () => {
    // Synthetic check: feed one failed statement and confirm its entries
    // are marked unverified rather than dropped or blended in.
    const failing = sources.find((s) => s.statements)!;
    const doctored: AuditSource = {
      sourceId: "doctored",
      fileName: "doctored.pdf",
      statements: failing.statements!.map((s) => ({
        ...s,
        // Shift the period so it isn't (correctly) caught as a duplicate
        // statement of the source it was cloned from.
        periodStart: "2030-01-01",
        periodEnd: "2030-01-31",
        reconciliation: { ...s.reconciliation, status: "failed" as const },
      })),
    };
    const r2 = audit([failing, doctored]);
    const acct = r2.accounts[0];
    const unverified = acct.ledger.filter((e) => !e.verified);
    expect(unverified.length).toBeGreaterThan(0);
    expect(unverified.every((e) => e.sourceId === "doctored")).toBe(true);
  });
});
