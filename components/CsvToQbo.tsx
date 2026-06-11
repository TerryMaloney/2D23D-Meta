"use client";

/**
 * Standalone CSV → QBO/QFX/OFX converter: upload a CSV, map columns with
 * dropdowns, export through the same OFX writer the main converter uses.
 * Runs entirely in the browser, like everything else.
 */

import { useMemo, useRef, useState } from "react";
import type { ParsedStatement, Transaction } from "@parser/types";
import { detectDate, resolveDate } from "@parser/dates";
import { parseAmount } from "@parser/money";
import { toOfx, OfxFlavor } from "@exporters";
import { beacon } from "@/lib/beacon";
import { parseCsv } from "@/lib/csvParse";
import { downloadBytes } from "@/lib/download";
import { canExport, loadLicense } from "@/lib/license";
import { FREE_EXPORT_CAP } from "@/lib/site";

type ColumnRole = "ignore" | "date" | "description" | "amount" | "debit" | "credit" | "check";

export function CsvToQbo() {
  const [rows, setRows] = useState<string[][] | null>(null);
  const [hasHeader, setHasHeader] = useState(true);
  const [roles, setRoles] = useState<ColumnRole[]>([]);
  const [flavor, setFlavor] = useState<OfxFlavor>("qbo");
  const [accountType, setAccountType] = useState<"CHECKING" | "SAVINGS" | "CREDITCARD">("CHECKING");
  const [fileBase, setFileBase] = useState("transactions");
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const onFile = async (file: File) => {
    setError(null);
    const text = await file.text();
    const parsed = parseCsv(text);
    if (parsed.length === 0) {
      setError("That CSV appears to be empty.");
      return;
    }
    setFileBase(file.name.replace(/\.csv$/i, ""));
    setRows(parsed);
    // Guess roles from the header row.
    const header = parsed[0].map((h) => h.toLowerCase());
    setRoles(
      header.map((h): ColumnRole => {
        if (/date/.test(h)) return "date";
        if (/(payee|description|memo|name|detail)/.test(h)) return "description";
        if (/debit|withdraw/.test(h)) return "debit";
        if (/credit|deposit/.test(h)) return "credit";
        if (/amount/.test(h)) return "amount";
        if (/check|cheque|ref/.test(h)) return "check";
        return "ignore";
      }),
    );
  };

  const dataRows = useMemo(
    () => (rows ? (hasHeader ? rows.slice(1) : rows) : []),
    [rows, hasHeader],
  );

  const transactions = useMemo((): Transaction[] | null => {
    if (!rows) return null;
    const dateCol = roles.indexOf("date");
    const descCol = roles.indexOf("description");
    const amountCol = roles.indexOf("amount");
    const debitCol = roles.indexOf("debit");
    const creditCol = roles.indexOf("credit");
    const checkCol = roles.indexOf("check");
    if (dateCol < 0 || (amountCol < 0 && debitCol < 0 && creditCol < 0)) return null;

    const out: Transaction[] = [];
    for (const r of dataRows) {
      const d = detectDate((r[dateCol] ?? "").trim());
      if (!d) continue;
      let cents: number | null = null;
      if (amountCol >= 0) {
        cents = parseAmount(r[amountCol] ?? "")?.cents ?? null;
      } else {
        const debit = debitCol >= 0 ? parseAmount(r[debitCol] ?? "")?.cents : undefined;
        const credit = creditCol >= 0 ? parseAmount(r[creditCol] ?? "")?.cents : undefined;
        if (debit != null && debit !== 0) cents = -Math.abs(debit);
        else if (credit != null) cents = Math.abs(credit);
      }
      if (cents === null || cents === undefined) continue;
      out.push({
        date: resolveDate(d, null),
        description: descCol >= 0 ? (r[descCol] ?? "").trim() : "",
        amountCents: cents,
        checkNumber: checkCol >= 0 && r[checkCol]?.trim() ? r[checkCol].trim() : undefined,
        confidence: 1,
        flags: [],
        sourcePage: 1,
      });
    }
    return out;
  }, [rows, roles, dataRows]);

  const doExport = () => {
    if (!transactions || transactions.length === 0) return;
    const license = loadLicense();
    if (!canExport(license, transactions.length, FREE_EXPORT_CAP)) {
      beacon({ event: "paywall_hit" });
      setError(
        `This CSV has ${transactions.length} transactions — the free plan exports up to ${FREE_EXPORT_CAP} per file. See /pricing for a $12 credit pack or Pro.`,
      );
      return;
    }
    const statement: ParsedStatement = {
      currency: "USD",
      transactions,
      templateId: "csv-import",
      reconciliation: {
        status: "partial",
        transactionSumCents: transactions.reduce((s, t) => s + t.amountCents, 0),
        creditSumCents: 0,
        debitSumCents: 0,
        flaggedRowIndices: [],
        notes: [],
      },
      warnings: [],
    };
    downloadBytes(
      `${fileBase}.${flavor}`,
      toOfx(statement, { flavor, accountType }),
      "application/x-ofx",
    );
    beacon({ event: "export", format: flavor });
  };

  if (!rows) {
    return (
      <div
        className="rounded-sm border-2 border-dashed border-rule-strong bg-surface px-6 py-12 text-center"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const f = e.dataTransfer.files?.[0];
          if (f) void onFile(f);
        }}
      >
        <p className="text-lg font-medium">Drop a CSV of transactions here</p>
        <p className="mt-2 text-sm text-ink-soft">
          Exports from your bank or spreadsheet both work. The file stays on
          your device.
        </p>
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          className="mt-5 rounded-sm bg-ink px-5 py-2.5 text-sm font-medium text-white hover:bg-ink/85"
        >
          Choose a CSV
        </button>
        <input
          ref={fileInput}
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          aria-label="Choose a CSV file"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onFile(f);
            e.target.value = "";
          }}
        />
        {error && <p className="mt-3 text-sm text-negative">{error}</p>}
      </div>
    );
  }

  const preview = dataRows.slice(0, 5);
  const columnCount = rows[0].length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={hasHeader} onChange={(e) => setHasHeader(e.target.checked)} />
          First row is a header
        </label>
        <button type="button" onClick={() => setRows(null)} className="underline text-ink-soft">
          Start over with a different CSV
        </button>
      </div>

      <div className="overflow-x-auto rounded-sm border border-rule bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-rule-strong bg-background">
              {Array.from({ length: columnCount }, (_, c) => (
                <th key={c} className="px-2 py-2 text-left font-normal">
                  <select
                    value={roles[c] ?? "ignore"}
                    onChange={(e) =>
                      setRoles((prev) => {
                        const next = [...prev];
                        while (next.length < columnCount) next.push("ignore");
                        next[c] = e.target.value as ColumnRole;
                        return next;
                      })
                    }
                    aria-label={`Meaning of column ${c + 1}`}
                    className="w-full rounded-sm border border-rule px-1 py-1 text-xs"
                  >
                    <option value="ignore">— ignore —</option>
                    <option value="date">Date</option>
                    <option value="description">Description</option>
                    <option value="amount">Amount (signed)</option>
                    <option value="debit">Debit</option>
                    <option value="credit">Credit</option>
                    <option value="check">Check #</option>
                  </select>
                  {hasHeader && (
                    <span className="mt-1 block truncate text-[11px] text-ink-soft">{rows[0][c]}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {preview.map((r, i) => (
              <tr key={i} className="figures border-b border-rule">
                {Array.from({ length: columnCount }, (_, c) => (
                  <td key={c} className="truncate px-2 py-1.5">
                    {r[c] ?? ""}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-sm">
        <label className="flex items-center gap-2">
          Output
          <select
            value={flavor}
            onChange={(e) => setFlavor(e.target.value as OfxFlavor)}
            className="rounded-sm border border-rule px-2 py-1"
          >
            <option value="qbo">QBO (QuickBooks)</option>
            <option value="qfx">QFX (Quicken)</option>
            <option value="ofx">OFX</option>
          </select>
        </label>
        <label className="flex items-center gap-2">
          Account type
          <select
            value={accountType}
            onChange={(e) => setAccountType(e.target.value as typeof accountType)}
            className="rounded-sm border border-rule px-2 py-1"
          >
            <option value="CHECKING">Checking</option>
            <option value="SAVINGS">Savings</option>
            <option value="CREDITCARD">Credit card</option>
          </select>
        </label>
        <button
          type="button"
          disabled={!transactions || transactions.length === 0}
          onClick={doExport}
          className="rounded-sm bg-ledger px-4 py-2 font-medium text-white hover:bg-ledger-deep disabled:opacity-50"
        >
          {transactions && transactions.length > 0
            ? `Export ${transactions.length} transactions as .${flavor}`
            : "Map a Date and an Amount column to export"}
        </button>
      </div>
      {error && <p className="text-sm text-negative">{error}</p>}
    </div>
  );
}
