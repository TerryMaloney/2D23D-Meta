"use client";

/**
 * Virtualized, inline-editable preview table. Flagged / low-confidence rows
 * are highlighted with a one-click fix where the balance chain implies the
 * correct amount.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import type { ParsedStatement, Transaction } from "@parser/types";
import { centsToDecimal, parseAmount } from "@parser/money";
import { impliedAmount } from "@/lib/statement";

const ROW_H = 34;
const OVERSCAN = 12;
const VIEW_H = 440;

export interface PreviewTableProps {
  statement: ParsedStatement;
  onChange: (transactions: Transaction[]) => void;
  scrollToIndex?: number | null;
}

type EditTarget = { row: number; field: "date" | "description" | "amount" } | null;

export function PreviewTable({ statement, onChange, scrollToIndex }: PreviewTableProps) {
  const txs = statement.transactions;
  const hasBalance = useMemo(() => txs.some((t) => t.balanceCents !== undefined), [txs]);
  const hasCheck = useMemo(() => txs.some((t) => t.checkNumber), [txs]);

  const scroller = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [editing, setEditing] = useState<EditTarget>(null);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (scrollToIndex != null && scroller.current) {
      scroller.current.scrollTop = Math.max(0, scrollToIndex * ROW_H - VIEW_H / 2);
    }
  }, [scrollToIndex]);

  const first = Math.max(0, Math.floor(scrollTop / ROW_H) - OVERSCAN);
  const last = Math.min(txs.length, Math.ceil((scrollTop + VIEW_H) / ROW_H) + OVERSCAN);

  const commit = () => {
    if (!editing) return;
    const next = txs.map((t, i) => {
      if (i !== editing.row) return t;
      const updated = { ...t, flags: [...t.flags] };
      if (editing.field === "description") updated.description = draft;
      if (editing.field === "date") {
        if (/^\d{4}-\d{2}-\d{2}$/.test(draft.trim())) updated.date = draft.trim();
        const us = draft.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (us) updated.date = `${us[3]}-${us[1].padStart(2, "0")}-${us[2].padStart(2, "0")}`;
      }
      if (editing.field === "amount") {
        const parsed = parseAmount(draft);
        if (parsed) updated.amountCents = parsed.cents;
      }
      updated.confidence = 1;
      updated.flags = updated.flags.filter(
        (f) => f !== "ambiguous-sign" && f !== "ambiguous-date" && f !== "low-confidence",
      );
      return updated;
    });
    setEditing(null);
    onChange(next);
  };

  const startEdit = (row: number, field: NonNullable<EditTarget>["field"], current: string) => {
    setEditing({ row, field });
    setDraft(current);
  };

  const fixRow = (i: number) => {
    const implied = impliedAmount(txs, i);
    if (implied === null) return;
    onChange(
      txs.map((t, j) =>
        j === i
          ? { ...t, amountCents: implied, confidence: 1, flags: [] }
          : t,
      ),
    );
  };

  const flagged = new Set(statement.reconciliation.flaggedRowIndices);

  const cellBtn =
    "w-full truncate px-2 py-1.5 text-left hover:bg-ledger-wash/60 focus-visible:bg-ledger-wash/60";

  return (
    <div className="overflow-hidden rounded-sm border border-rule bg-surface">
      <div
        className="grid border-b border-rule-strong bg-background text-[11px] font-semibold uppercase tracking-wide text-ink-soft"
        style={{ gridTemplateColumns: gridCols(hasCheck, hasBalance) }}
      >
        <span className="px-2 py-2">Date</span>
        {hasCheck && <span className="px-2 py-2">Check #</span>}
        <span className="px-2 py-2">Description</span>
        <span className="px-2 py-2 text-right">Amount</span>
        {hasBalance && <span className="px-2 py-2 text-right">Balance</span>}
        <span className="px-2 py-2 text-right">Fix</span>
      </div>

      <div
        ref={scroller}
        onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
        style={{ height: Math.min(VIEW_H, txs.length * ROW_H + 8), overflowY: "auto" }}
        aria-label="Parsed transactions (click a cell to edit)"
      >
        <div style={{ height: txs.length * ROW_H, position: "relative" }}>
          {txs.slice(first, last).map((t, k) => {
            const i = first + k;
            const isFlagged = flagged.has(i) || t.confidence < 0.8;
            return (
              <div
                key={i}
                className={`figures absolute left-0 right-0 grid items-center border-b border-rule text-[13px] ${
                  isFlagged ? "bg-caution-wash" : i % 2 ? "bg-background/50" : ""
                }`}
                style={{ top: i * ROW_H, height: ROW_H, gridTemplateColumns: gridCols(hasCheck, hasBalance) }}
              >
                <Cell
                  editing={editing?.row === i && editing.field === "date"}
                  value={t.date}
                  draft={draft}
                  setDraft={setDraft}
                  commit={commit}
                  onStart={() => startEdit(i, "date", t.date)}
                  className={cellBtn}
                />
                {hasCheck && <span className="truncate px-2">{t.checkNumber ?? ""}</span>}
                <Cell
                  editing={editing?.row === i && editing.field === "description"}
                  value={t.description}
                  draft={draft}
                  setDraft={setDraft}
                  commit={commit}
                  onStart={() => startEdit(i, "description", t.description)}
                  className={cellBtn}
                />
                <Cell
                  editing={editing?.row === i && editing.field === "amount"}
                  value={centsToDecimal(t.amountCents)}
                  draft={draft}
                  setDraft={setDraft}
                  commit={commit}
                  onStart={() => startEdit(i, "amount", centsToDecimal(t.amountCents))}
                  className={`${cellBtn} text-right ${t.amountCents < 0 ? "text-negative" : ""}`}
                />
                {hasBalance && (
                  <span className="truncate px-2 text-right text-ink-soft">
                    {t.balanceCents !== undefined ? centsToDecimal(t.balanceCents) : ""}
                  </span>
                )}
                <span className="px-2 text-right">
                  {isFlagged && impliedAmount(txs, i) !== null && (
                    <button
                      type="button"
                      onClick={() => fixRow(i)}
                      title={`Set amount to ${centsToDecimal(impliedAmount(txs, i)!)} (implied by the balance column)`}
                      className="rounded-sm border border-caution px-1.5 py-0.5 text-[11px] text-caution hover:bg-caution hover:text-white"
                    >
                      Fix
                    </button>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      <p className="border-t border-rule px-3 py-1.5 text-[11px] text-ink-soft">
        Click any date, description, or amount to correct it — reconciliation
        re-runs instantly. Highlighted rows need review.
      </p>
    </div>
  );
}

function gridCols(hasCheck: boolean, hasBalance: boolean): string {
  return [
    "92px",
    ...(hasCheck ? ["70px"] : []),
    "minmax(140px, 1fr)",
    "110px",
    ...(hasBalance ? ["110px"] : []),
    "56px",
  ].join(" ");
}

function Cell({
  editing,
  value,
  draft,
  setDraft,
  commit,
  onStart,
  className,
}: {
  editing: boolean;
  value: string;
  draft: string;
  setDraft: (v: string) => void;
  commit: () => void;
  onStart: () => void;
  className: string;
}) {
  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") commit();
        }}
        className="figures mx-1 rounded-sm border border-focus px-1 py-1 text-[13px]"
        aria-label="Edit cell"
      />
    );
  }
  return (
    <button type="button" onClick={onStart} className={className} title={value}>
      {value}
    </button>
  );
}
