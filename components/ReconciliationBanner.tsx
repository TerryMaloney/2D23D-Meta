"use client";

/**
 * The signature element: an animated strip proving the math. Bold here,
 * disciplined everywhere else.
 */

import type { ParsedStatement } from "@parser/types";
import { fmtUsd } from "@/lib/statement";

export function ReconciliationBanner({
  statement,
  onJumpToFlagged,
}: {
  statement: ParsedStatement;
  onJumpToFlagged?: (index: number) => void;
}) {
  const r = statement.reconciliation;
  const c = statement.currency;
  const n = statement.transactions.length;

  if (r.status === "verified") {
    return (
      <div
        role="status"
        className="tape-in figures flex flex-wrap items-center gap-x-3 gap-y-1 rounded-sm border border-ledger-deep bg-ledger px-4 py-3 text-sm text-white shadow-sm"
      >
        {r.openingBalanceCents !== undefined && (
          <span>Opening {fmtUsd(r.openingBalanceCents, c)}</span>
        )}
        {r.openingBalanceCents !== undefined && <span aria-hidden>+</span>}
        <span>
          {n} transaction{n === 1 ? "" : "s"} ({fmtUsd(r.creditSumCents, c)} /{" "}
          {fmtUsd(r.debitSumCents, c)})
        </span>
        {r.closingBalanceCents !== undefined && (
          <>
            <span aria-hidden>=</span>
            <span>Closing {fmtUsd(r.closingBalanceCents, c)}</span>
          </>
        )}
        <span className="ml-auto inline-flex items-center gap-1.5 font-medium">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path d="M2 8.5 6 12.5 14 3.5" stroke="currentColor" strokeWidth="2.2" />
          </svg>
          Verified to the cent
        </span>
      </div>
    );
  }

  const isPartial = r.status === "partial";
  return (
    <div
      role="status"
      className={`tape-in rounded-sm border px-4 py-3 text-sm shadow-sm ${
        isPartial
          ? "border-caution bg-caution-wash text-caution"
          : "border-negative bg-negative-wash text-negative"
      }`}
    >
      <p className="figures font-medium">
        {isPartial ? "Partially verified" : "Reconciliation failed"} —{" "}
        {r.flaggedRowIndices.length > 0
          ? `${r.flaggedRowIndices.length} row${r.flaggedRowIndices.length === 1 ? "" : "s"} break the balance chain.`
          : "the parsed totals don't match the statement's printed balances."}
      </p>
      <ul className="mt-1 list-inside list-disc space-y-0.5 text-xs opacity-90">
        {r.notes.map((note) => (
          <li key={note} className="figures">
            {note}
          </li>
        ))}
      </ul>
      {r.flaggedRowIndices.length > 0 && onJumpToFlagged && (
        <button
          type="button"
          onClick={() => onJumpToFlagged(r.flaggedRowIndices[0])}
          className="mt-2 rounded-sm border border-current px-2 py-1 text-xs font-medium hover:bg-white/40"
        >
          Review first flagged row
        </button>
      )}
    </div>
  );
}
