"use client";

/** Client-side helpers around parser data structures. */

import { reconcile } from "@parser/reconcile";
import type { ParsedStatement, Transaction } from "@parser/types";
import { formatCents } from "@parser/money";

/** Recompute reconciliation after the user edits transactions. */
export function rebuildReconciliation(statement: ParsedStatement): ParsedStatement {
  const transactions = statement.transactions.map((t) => ({
    ...t,
    flags: t.flags.filter((f) => f !== "balance-chain-broken"),
  }));
  const reconciliation = reconcile({
    transactions,
    openingBalanceCents: statement.openingBalanceCents,
    closingBalanceCents: statement.closingBalanceCents,
    printedTotalCreditsCents: statement.printedTotalCreditsCents,
    printedTotalDebitsCents: statement.printedTotalDebitsCents,
  });
  return { ...statement, transactions, reconciliation };
}

/**
 * One-click fix for a row that breaks the balance chain: set the amount to
 * the delta implied by the neighbouring printed balances.
 */
export function impliedAmount(transactions: Transaction[], index: number): number | null {
  const t = transactions[index];
  if (t.balanceCents === undefined) return null;
  for (let j = index - 1; j >= 0; j--) {
    const prev = transactions[j];
    if (prev.balanceCents !== undefined) {
      // Sum of intervening amounts without balances:
      let between = 0;
      for (let k = j + 1; k < index; k++) between += transactions[k].amountCents;
      return t.balanceCents - prev.balanceCents - between;
    }
  }
  return null;
}

export function fmtUsd(cents: number, currency = "USD"): string {
  const symbol = currency === "EUR" ? "€" : currency === "GBP" ? "£" : "$";
  const sign = cents < 0 ? "−" : "";
  return `${sign}${symbol}${formatCents(Math.abs(cents))}`;
}
