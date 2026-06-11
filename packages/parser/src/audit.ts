/**
 * Multi-statement audit: cross-statement analysis of parsed statements.
 *
 * Pure, framework-free logic — consumes ParsedStatements, produces an
 * AuditResult. All processing is local; this module performs no I/O.
 *
 * Finding language is deliberately cautious ("potential duplicate",
 * "balance discontinuity", "review recommended"): these are arithmetic and
 * pattern observations, not fraud detection, financial advice, or
 * professional accounting conclusions.
 */

import { fnv1a64 } from "./hash";
import type { ParsedStatement, Transaction } from "./types";

/* ────────────────────────── input / output types ────────────────────── */

export interface AuditSource {
  /** Stable id for the file ("file-1") — used in findings and the UI. */
  sourceId: string;
  fileName: string;
  /** Present when the file parsed; absent when it errored. */
  statements?: ParsedStatement[];
  errorCode?: string;
}

export interface LedgerEntry {
  tx: Transaction;
  sourceId: string;
  /** From a statement whose reconciliation verified. */
  verified: boolean;
  /** Key used for duplicate detection. */
  dupKey: string;
}

export interface InventoryItem {
  sourceId: string;
  fileName: string;
  accountKey: string;
  periodStart?: string;
  periodEnd?: string;
  txCount: number;
  status: "verified" | "partial" | "failed";
  openingCents?: number;
  closingCents?: number;
  flaggedRows: number;
  /** Marked when another inventory item appears to be the same statement. */
  duplicateOf?: string;
}

export interface MonthlySummary {
  month: string; // YYYY-MM
  inCents: number;
  outCents: number;
  netCents: number;
  txCount: number;
}

export type AuditFinding =
  | { kind: "missing-period"; accountKey: string; fromIso: string; toIso: string }
  | { kind: "overlap"; accountKey: string; aId: string; bId: string }
  | { kind: "duplicate-statement"; accountKey: string; aId: string; bId: string }
  | {
      kind: "balance-discontinuity";
      accountKey: string;
      prevId: string;
      nextId: string;
      expectedCents: number;
      actualCents: number;
    }
  | {
      kind: "duplicate-transaction";
      accountKey: string;
      date: string;
      amountCents: number;
      description: string;
      sourceIds: string[];
    }
  | {
      kind: "recurring";
      accountKey: string;
      direction: "in" | "out";
      description: string;
      occurrences: number;
      averageCents: number;
      cadence: "weekly" | "biweekly" | "monthly" | "irregular";
    }
  | {
      kind: "fee";
      accountKey: string;
      feeType: "overdraft" | "interest" | "service" | "other";
      occurrences: number;
      totalCents: number;
      example: string;
    }
  | {
      kind: "large-transaction";
      accountKey: string;
      sourceId: string;
      date: string;
      description: string;
      amountCents: number;
    };

export interface AccountAudit {
  accountKey: string;
  bankName?: string;
  accountId?: string;
  accountType?: string;
  currency: string;
  inventory: InventoryItem[];
  /** Chronological merged ledger; entries carry per-source verification. */
  ledger: LedgerEntry[];
  monthly: MonthlySummary[];
  coverageStart?: string;
  coverageEnd?: string;
  largestDeposits: LedgerEntry[];
  largestWithdrawals: LedgerEntry[];
}

export interface AuditResult {
  accounts: AccountAudit[];
  unparsed: { sourceId: string; fileName: string; errorCode: string }[];
  findings: AuditFinding[];
}

/**
 * Cautious, human-readable finding text — observations, never accusations
 * or advice. Centralized so the UI, exports, and printed report agree.
 */
export function describeFinding(f: AuditFinding): string {
  const usd = (c: number) =>
    `${c < 0 ? "−" : ""}$${(Math.abs(c) / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
  switch (f.kind) {
    case "missing-period":
      return `Missing statement period: no coverage from ${f.fromIso} to ${f.toIso}.`;
    case "overlap":
      return `Overlapping statement periods (${f.aId} and ${f.bId}) — transactions in the overlap may appear twice.`;
    case "duplicate-statement":
      return `Potential duplicate statement: ${f.bId} appears identical to ${f.aId}; only one copy is included in the ledger.`;
    case "balance-discontinuity":
      return `Balance discontinuity: previous statement closed at ${usd(f.expectedCents)}, next opens at ${usd(f.actualCents)} (difference ${usd(f.actualCents - f.expectedCents)}). Review recommended — a statement may be missing or amended.`;
    case "duplicate-transaction":
      return `Potential duplicate transaction: ${f.date} ${usd(f.amountCents)} "${f.description}" appears in ${f.sourceIds.length} files.`;
    case "recurring":
      return `Recurring ${f.direction === "in" ? "deposit" : "payment"}: "${f.description}" — ${f.occurrences} occurrences, ${f.cadence}, averaging ${usd(f.averageCents)}.`;
    case "fee": {
      const label =
        f.feeType === "overdraft"
          ? "Overdraft/insufficient-funds fees"
          : f.feeType === "interest"
            ? "Interest charges"
            : f.feeType === "service"
              ? "Service charges"
              : "Other fees";
      return `${label}: ${f.occurrences} occurrence${f.occurrences === 1 ? "" : "s"} totaling ${usd(f.totalCents)} (e.g. "${f.example}").`;
    }
    case "large-transaction":
      return `Unusually large transaction: ${f.date} ${usd(f.amountCents)} "${f.description}". Review recommended.`;
  }
}

/* ────────────────────────── helpers ─────────────────────────────────── */

const DAY = 86400000;
const t = (iso: string) => Date.parse(iso + "T00:00:00Z");
const toIso = (ms: number) => new Date(ms).toISOString().slice(0, 10);

function accountKeyOf(s: ParsedStatement): string {
  return [s.bankName ?? "unknown", s.accountId ?? "?", s.accountType ?? "?", s.currency].join("|");
}

/** Normalize a description for duplicate/recurring matching. */
function normalizeDesc(d: string): string {
  return d.toLowerCase().replace(/\d+/g, "#").replace(/\s+/g, " ").trim();
}

function statementSpan(s: ParsedStatement): { start?: string; end?: string } {
  const dates = s.transactions.map((x) => x.date).sort();
  return {
    start: s.periodStart ?? dates[0],
    end: s.periodEnd ?? dates[dates.length - 1],
  };
}

/* ────────────────────────── main ───────────────────────────────────── */

export function audit(sources: AuditSource[]): AuditResult {
  const findings: AuditFinding[] = [];
  const unparsed = sources
    .filter((s) => !s.statements)
    .map((s) => ({ sourceId: s.sourceId, fileName: s.fileName, errorCode: s.errorCode ?? "UNKNOWN" }));

  // ── group per account ────────────────────────────────────────────────
  interface Bound {
    source: AuditSource;
    statement: ParsedStatement;
  }
  const byAccount = new Map<string, Bound[]>();
  for (const source of sources) {
    for (const statement of source.statements ?? []) {
      const key = accountKeyOf(statement);
      const arr = byAccount.get(key) ?? [];
      arr.push({ source, statement });
      byAccount.set(key, arr);
    }
  }

  const accounts: AccountAudit[] = [];

  for (const [accountKey, bound] of byAccount) {
    // Chronological by period start (fall back to first transaction).
    bound.sort((a, b) => {
      const sa = statementSpan(a.statement).start ?? "9999";
      const sb = statementSpan(b.statement).start ?? "9999";
      return sa.localeCompare(sb);
    });

    // ── inventory + duplicate statements ──────────────────────────────
    const inventory: InventoryItem[] = bound.map(({ source, statement }) => {
      const span = statementSpan(statement);
      return {
        sourceId: source.sourceId,
        fileName: source.fileName,
        accountKey,
        periodStart: span.start,
        periodEnd: span.end,
        txCount: statement.transactions.length,
        status: statement.reconciliation.status,
        openingCents: statement.openingBalanceCents,
        closingCents: statement.closingBalanceCents,
        flaggedRows: statement.reconciliation.flaggedRowIndices.length,
      };
    });

    const sigOf = (s: ParsedStatement) =>
      fnv1a64(
        [
          s.periodStart,
          s.periodEnd,
          s.transactions.length,
          s.reconciliation.transactionSumCents,
          s.openingBalanceCents,
          s.closingBalanceCents,
        ].join("|"),
      );
    const seenSigs = new Map<string, number>();
    bound.forEach(({ statement }, i) => {
      const sig = sigOf(statement);
      const first = seenSigs.get(sig);
      if (first !== undefined) {
        inventory[i].duplicateOf = inventory[first].sourceId;
        findings.push({
          kind: "duplicate-statement",
          accountKey,
          aId: inventory[first].sourceId,
          bId: inventory[i].sourceId,
        });
      } else {
        seenSigs.set(sig, i);
      }
    });

    // Unique (non-duplicate) statements drive period/continuity analysis.
    const unique = bound.filter((_, i) => !inventory[i].duplicateOf);
    const uniqueInv = inventory.filter((i) => !i.duplicateOf);

    // ── gaps / overlaps ────────────────────────────────────────────────
    for (let i = 1; i < uniqueInv.length; i++) {
      const prev = uniqueInv[i - 1];
      const next = uniqueInv[i];
      if (!prev.periodEnd || !next.periodStart) continue;
      const gapDays = (t(next.periodStart) - t(prev.periodEnd)) / DAY;
      if (gapDays > 5) {
        findings.push({
          kind: "missing-period",
          accountKey,
          fromIso: toIso(t(prev.periodEnd) + DAY),
          toIso: toIso(t(next.periodStart) - DAY),
        });
      } else if (gapDays < -3) {
        findings.push({ kind: "overlap", accountKey, aId: prev.sourceId, bId: next.sourceId });
      }
    }

    // ── balance continuity ─────────────────────────────────────────────
    for (let i = 1; i < unique.length; i++) {
      const prev = unique[i - 1].statement;
      const next = unique[i].statement;
      // Overlapping statements can't be continuity-compared — the overlap
      // itself is already reported as its own finding.
      const prevEnd = uniqueInv[i - 1].periodEnd;
      const nextStart = uniqueInv[i].periodStart;
      if (prevEnd && nextStart && (t(nextStart) - t(prevEnd)) / DAY < -3) continue;
      if (prev.closingBalanceCents === undefined || next.openingBalanceCents === undefined) continue;
      if (prev.closingBalanceCents !== next.openingBalanceCents) {
        findings.push({
          kind: "balance-discontinuity",
          accountKey,
          prevId: uniqueInv[i - 1].sourceId,
          nextId: uniqueInv[i].sourceId,
          expectedCents: prev.closingBalanceCents,
          actualCents: next.openingBalanceCents,
        });
      }
    }

    // ── merged ledger (all parsed; verification carried per entry) ────
    const ledger: LedgerEntry[] = [];
    for (let i = 0; i < unique.length; i++) {
      const { source, statement } = unique[i];
      const verified = statement.reconciliation.status === "verified";
      for (const tx of statement.transactions) {
        ledger.push({
          tx,
          sourceId: source.sourceId,
          verified,
          dupKey: `${tx.date}|${tx.amountCents}|${normalizeDesc(tx.description)}`,
        });
      }
    }
    ledger.sort((a, b) => a.tx.date.localeCompare(b.tx.date) || a.tx.amountCents - b.tx.amountCents);

    // ── duplicate transactions across different statements ────────────
    const byDup = new Map<string, LedgerEntry[]>();
    for (const e of ledger) {
      const arr = byDup.get(e.dupKey) ?? [];
      arr.push(e);
      byDup.set(e.dupKey, arr);
    }
    for (const [, entries] of byDup) {
      const sourcesInvolved = [...new Set(entries.map((e) => e.sourceId))];
      if (sourcesInvolved.length > 1) {
        findings.push({
          kind: "duplicate-transaction",
          accountKey,
          date: entries[0].tx.date,
          amountCents: entries[0].tx.amountCents,
          description: entries[0].tx.description,
          sourceIds: sourcesInvolved,
        });
      }
    }

    // ── monthly summaries ──────────────────────────────────────────────
    const months = new Map<string, MonthlySummary>();
    for (const e of ledger) {
      const month = e.tx.date.slice(0, 7);
      const m = months.get(month) ?? { month, inCents: 0, outCents: 0, netCents: 0, txCount: 0 };
      if (e.tx.amountCents > 0) m.inCents += e.tx.amountCents;
      else m.outCents += e.tx.amountCents;
      m.netCents += e.tx.amountCents;
      m.txCount++;
      months.set(month, m);
    }
    const monthly = [...months.values()].sort((a, b) => a.month.localeCompare(b.month));

    // ── recurring patterns ─────────────────────────────────────────────
    const byDesc = new Map<string, LedgerEntry[]>();
    for (const e of ledger) {
      const key = `${e.tx.amountCents > 0 ? "in" : "out"}|${normalizeDesc(e.tx.description)}`;
      const arr = byDesc.get(key) ?? [];
      arr.push(e);
      byDesc.set(key, arr);
    }
    for (const [key, entries] of byDesc) {
      if (entries.length < 3) continue;
      const amounts = entries.map((e) => Math.abs(e.tx.amountCents));
      const avg = Math.round(amounts.reduce((s, v) => s + v, 0) / amounts.length);
      const spread = Math.max(...amounts) - Math.min(...amounts);
      if (spread > Math.max(avg * 0.25, 500)) continue; // amounts too varied
      const ds = entries.map((e) => t(e.tx.date)).sort((a, b) => a - b);
      const intervals: number[] = [];
      for (let i = 1; i < ds.length; i++) intervals.push((ds[i] - ds[i - 1]) / DAY);
      const median = intervals.sort((a, b) => a - b)[Math.floor(intervals.length / 2)];
      const cadence =
        median >= 5 && median <= 9
          ? "weekly"
          : median >= 12 && median <= 16
            ? "biweekly"
            : median >= 25 && median <= 35
              ? "monthly"
              : "irregular";
      if (cadence === "irregular" && entries.length < 5) continue;
      findings.push({
        kind: "recurring",
        accountKey,
        direction: key.startsWith("in") ? "in" : "out",
        description: entries[0].tx.description,
        occurrences: entries.length,
        averageCents: avg,
        cadence,
      });
    }

    // ── fees and interest ──────────────────────────────────────────────
    const feeBuckets = new Map<string, { totalCents: number; count: number; example: string }>();
    for (const e of ledger) {
      const d = e.tx.description;
      let feeType: "overdraft" | "interest" | "service" | "other" | null = null;
      if (/overdraft|nsf|insufficient funds|returned item/i.test(d)) feeType = "overdraft";
      else if (/interest charge|finance charge/i.test(d)) feeType = "interest";
      else if (/service charge|maintenance fee|monthly fee|paper statement/i.test(d)) feeType = "service";
      else if (/\bfee\b/i.test(d)) feeType = "other";
      if (!feeType) continue;
      const b = feeBuckets.get(feeType) ?? { totalCents: 0, count: 0, example: d };
      b.totalCents += Math.abs(e.tx.amountCents);
      b.count++;
      feeBuckets.set(feeType, b);
    }
    for (const [feeType, b] of feeBuckets) {
      findings.push({
        kind: "fee",
        accountKey,
        feeType: feeType as "overdraft" | "interest" | "service" | "other",
        occurrences: b.count,
        totalCents: b.totalCents,
        example: b.example,
      });
    }

    // ── unusually large transactions ───────────────────────────────────
    if (ledger.length >= 8) {
      const magnitudes = ledger.map((e) => Math.abs(e.tx.amountCents));
      const mean = magnitudes.reduce((s, v) => s + v, 0) / magnitudes.length;
      const sd = Math.sqrt(
        magnitudes.reduce((s, v) => s + (v - mean) ** 2, 0) / magnitudes.length,
      );
      const threshold = mean + 3 * sd;
      for (const e of ledger) {
        if (Math.abs(e.tx.amountCents) > threshold) {
          findings.push({
            kind: "large-transaction",
            accountKey,
            sourceId: e.sourceId,
            date: e.tx.date,
            description: e.tx.description,
            amountCents: e.tx.amountCents,
          });
        }
      }
    }

    const sortedByAmount = [...ledger].sort(
      (a, b) => Math.abs(b.tx.amountCents) - Math.abs(a.tx.amountCents),
    );
    const stmt0 = unique[0]?.statement;
    accounts.push({
      accountKey,
      bankName: stmt0?.bankName,
      accountId: stmt0?.accountId,
      accountType: stmt0?.accountType,
      currency: stmt0?.currency ?? "USD",
      inventory,
      ledger,
      monthly,
      coverageStart: uniqueInv[0]?.periodStart,
      coverageEnd: uniqueInv[uniqueInv.length - 1]?.periodEnd,
      largestDeposits: sortedByAmount.filter((e) => e.tx.amountCents > 0).slice(0, 5),
      largestWithdrawals: sortedByAmount.filter((e) => e.tx.amountCents < 0).slice(0, 5),
    });
  }

  return { accounts, unparsed, findings };
}
