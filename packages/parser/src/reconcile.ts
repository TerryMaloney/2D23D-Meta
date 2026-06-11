/**
 * Layer 6 — Reconciliation: the statement grades its own parse.
 *
 * A statement carries its own answer key: opening balance + transactions =
 * closing balance. We verify it to the cent and report exactly which rows
 * break the chain.
 */

import { formatCents } from "./money";
import { ReconciliationResult, Transaction } from "./types";

export interface ReconcileInput {
  transactions: Transaction[];
  openingBalanceCents?: number;
  closingBalanceCents?: number;
  printedTotalCreditsCents?: number;
  printedTotalDebitsCents?: number;
}

export function reconcile(input: ReconcileInput): ReconciliationResult {
  const { transactions, openingBalanceCents, closingBalanceCents } = input;
  const notes: string[] = [];
  const flagged = new Set<number>();

  const transactionSumCents = transactions.reduce((s, t) => s + t.amountCents, 0);
  const creditSumCents = transactions
    .filter((t) => t.amountCents > 0)
    .reduce((s, t) => s + t.amountCents, 0);
  const debitSumCents = transactions
    .filter((t) => t.amountCents < 0)
    .reduce((s, t) => s + t.amountCents, 0);

  // ── Check 1: running-balance chain ────────────────────────────────────
  const withBalance = transactions
    .map((t, i) => ({ t, i }))
    .filter(({ t }) => t.balanceCents !== undefined);
  let chainChecked = 0;
  let chainBreaks = 0;
  if (withBalance.length >= 2 || (withBalance.length >= 1 && openingBalanceCents !== undefined)) {
    let prev = openingBalanceCents;
    let prevIdx = -1;
    let pendingSinceLastBalance = 0;
    for (let i = 0; i < transactions.length; i++) {
      const t = transactions[i];
      pendingSinceLastBalance += t.amountCents;
      if (t.balanceCents === undefined) continue;
      if (prev !== undefined) {
        chainChecked++;
        if (prev + pendingSinceLastBalance !== t.balanceCents) {
          chainBreaks++;
          flagged.add(i);
          if (prevIdx >= 0) flagged.add(prevIdx);
        }
      }
      prev = t.balanceCents;
      prevIdx = i;
      pendingSinceLastBalance = 0;
    }
    if (chainChecked > 0) {
      notes.push(
        chainBreaks === 0
          ? `Running balance verified across ${chainChecked} balance ${chainChecked === 1 ? "checkpoint" : "checkpoints"}.`
          : `Running balance broke at ${chainBreaks} of ${chainChecked} checkpoints.`,
      );
    }
  }

  // ── Check 2: opening + sum = closing ──────────────────────────────────
  let totalsKnown = false;
  let totalsPass = false;
  if (openingBalanceCents !== undefined && closingBalanceCents !== undefined) {
    totalsKnown = true;
    const expected = openingBalanceCents + transactionSumCents;
    totalsPass = expected === closingBalanceCents;
    notes.push(
      totalsPass
        ? `Opening ${formatCents(openingBalanceCents)} + transactions ${formatCents(transactionSumCents)} = closing ${formatCents(closingBalanceCents)} — verified to the cent.`
        : `Opening ${formatCents(openingBalanceCents)} + transactions ${formatCents(transactionSumCents)} = ${formatCents(expected)}, but the statement says closing is ${formatCents(closingBalanceCents)} (off by ${formatCents(closingBalanceCents - expected)}).`,
    );
  }

  // ── Check 3: printed summary totals ───────────────────────────────────
  if (input.printedTotalCreditsCents !== undefined) {
    const pass = input.printedTotalCreditsCents === creditSumCents;
    notes.push(
      pass
        ? `Parsed credits match the printed total (${formatCents(creditSumCents)}).`
        : `Parsed credits ${formatCents(creditSumCents)} ≠ printed total ${formatCents(input.printedTotalCreditsCents)}.`,
    );
    if (!pass && !totalsPass) totalsKnown = true;
  }
  if (input.printedTotalDebitsCents !== undefined) {
    const printedAbs = Math.abs(input.printedTotalDebitsCents);
    const pass = printedAbs === Math.abs(debitSumCents);
    notes.push(
      pass
        ? `Parsed debits match the printed total (${formatCents(debitSumCents)}).`
        : `Parsed debits ${formatCents(debitSumCents)} ≠ printed total ${formatCents(-printedAbs)}.`,
    );
  }

  // Propagate chain flags onto the transactions themselves.
  for (const i of flagged) {
    if (!transactions[i].flags.includes("balance-chain-broken")) {
      transactions[i].flags.push("balance-chain-broken");
      transactions[i].confidence = Math.min(transactions[i].confidence, 0.5);
    }
  }

  // ── Verdict ───────────────────────────────────────────────────────────
  const chainPass = chainChecked > 0 && chainBreaks === 0;
  let status: ReconciliationResult["status"];
  if ((totalsKnown && totalsPass && chainBreaks === 0) || (!totalsKnown && chainPass)) {
    status = "verified";
  } else if ((totalsKnown && totalsPass) || chainPass || (chainChecked > 0 && chainBreaks < chainChecked)) {
    status = "partial";
  } else if (!totalsKnown && chainChecked === 0) {
    // Nothing to check against — can't verify, but nothing failed either.
    status = transactions.length > 0 ? "partial" : "failed";
    if (transactions.length > 0)
      notes.push("No balances or printed totals were found to verify against — review the preview before exporting.");
  } else {
    status = "failed";
  }

  return {
    status,
    openingBalanceCents,
    closingBalanceCents,
    transactionSumCents,
    creditSumCents,
    debitSumCents,
    flaggedRowIndices: [...flagged].sort((a, b) => a - b),
    notes,
  };
}
