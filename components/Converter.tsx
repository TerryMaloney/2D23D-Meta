"use client";

/**
 * The converter — drop zone, per-page parse progress, editable preview,
 * reconciliation banner, export. Everything happens in this tab; no file
 * byte ever leaves the device.
 */

import { useCallback, useRef, useState } from "react";
import type { ParseErrorCode, ParsedStatement, RawPage, Transaction } from "@parser/types";
import { StatementParseError } from "@parser/types";
import { parseStatement } from "@parser/parse";
import { beacon } from "@/lib/beacon";
import { extractPdf } from "@/lib/extractClient";
import { rebuildReconciliation } from "@/lib/statement";
import { ExportModal } from "./ExportModal";
import { FailureReporter } from "./FailureReporter";
import { PreviewTable } from "./PreviewTable";
import { ReconciliationBanner } from "./ReconciliationBanner";

type Stage =
  | { kind: "idle" }
  | { kind: "parsing"; page: number; total: number }
  | {
      kind: "error";
      code: ParseErrorCode | "UNREADABLE";
      message: string;
      pages?: RawPage[];
      needsPassword?: boolean;
      fileName?: string;
    }
  | {
      kind: "preview";
      statements: ParsedStatement[];
      active: number;
      pages: RawPage[];
      fileName: string;
    };

export function Converter() {
  const [stage, setStage] = useState<Stage>({ kind: "idle" });
  const [dragOver, setDragOver] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [jumpTo, setJumpTo] = useState<number | null>(null);
  const [password, setPassword] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const lastFile = useRef<File | null>(null);

  const handleFile = useCallback(async (file: File, pwd?: string) => {
    lastFile.current = file;
    beacon({ event: "parse_attempt" });
    setStage({ kind: "parsing", page: 0, total: 0 });
    const started = performance.now();
    let pages: RawPage[] | undefined;
    try {
      const buf = await file.arrayBuffer();
      const extracted = await extractPdf(
        buf,
        (page, total) => setStage({ kind: "parsing", page, total }),
        pwd,
      );
      pages = extracted.pages;
      const output = parseStatement(pages);
      const statements = output.statements;
      beacon({
        event: "parse_success",
        template: statements[0].templateId,
        durationMs: Math.round(performance.now() - started),
      });
      beacon({ event: "reconciliation", status: statements[0].reconciliation.status });
      setStage({
        kind: "preview",
        statements,
        active: 0,
        pages,
        fileName: file.name.replace(/\.pdf$/i, ""),
      });
    } catch (e) {
      if (e instanceof StatementParseError) {
        beacon({ event: "parse_failed", errorType: e.code });
        setStage({
          kind: "error",
          code: e.code,
          message: e.message,
          pages,
          needsPassword: e.code === "PASSWORD_PROTECTED",
          fileName: file.name,
        });
      } else {
        beacon({ event: "parse_failed", errorType: "UNREADABLE" });
        setStage({
          kind: "error",
          code: "UNREADABLE",
          message:
            "This file couldn't be read as a PDF. Re-download the statement from your bank and drop the fresh file here.",
        });
      }
    }
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) void handleFile(file);
    },
    [handleFile],
  );

  const updateTransactions = (transactions: Transaction[]) => {
    if (stage.kind !== "preview") return;
    const statements = stage.statements.map((s, i) =>
      i === stage.active ? rebuildReconciliation({ ...s, transactions }) : s,
    );
    setStage({ ...stage, statements });
  };

  /* ── idle / parsing: the drop zone ───────────────────────────────── */
  if (stage.kind === "idle" || stage.kind === "parsing") {
    const parsing = stage.kind === "parsing";
    return (
      <div
        id="converter"
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`rounded-sm border-2 border-dashed px-6 py-14 text-center transition-colors ${
          dragOver ? "border-ledger bg-ledger-wash" : "border-rule-strong bg-surface"
        }`}
      >
        {parsing ? (
          <div aria-live="polite">
            <p className="figures text-lg font-medium">
              Reading page {stage.page}
              {stage.total ? ` of ${stage.total}` : ""}…
            </p>
            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={stage.total || 1}
              aria-valuenow={stage.page}
              className="mx-auto mt-4 h-1.5 w-64 overflow-hidden rounded-full bg-rule"
            >
              <div
                className="h-full bg-ledger transition-all"
                style={{ width: stage.total ? `${(stage.page / stage.total) * 100}%` : "10%" }}
              />
            </div>
            <p className="mt-3 text-sm text-ink-soft">
              Parsing happens in this tab. Nothing uploads.
            </p>
          </div>
        ) : (
          <>
            <p className="text-xl font-medium">Drop a PDF bank statement here</p>
            <p className="mt-2 text-sm text-ink-soft">
              Your statement never leaves this device. Parsing runs entirely in
              your browser — it even works offline.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className="rounded-sm bg-ink px-5 py-2.5 text-sm font-medium text-white hover:bg-ink/85"
              >
                Choose a PDF
              </button>
              <button
                type="button"
                onClick={async () => {
                  // Same-origin fetch of the bundled synthetic sample; it
                  // runs through the real production parse path.
                  const res = await fetch("/sample-statement.pdf");
                  const buf = await res.arrayBuffer();
                  void handleFile(new File([buf], "sample-statement.pdf", { type: "application/pdf" }));
                }}
                className="rounded-sm border border-ledger px-5 py-2.5 text-sm font-medium text-ledger hover:bg-ledger hover:text-white"
              >
                Try a sample statement
              </button>
            </div>
            <input
              ref={fileInput}
              type="file"
              accept="application/pdf,.pdf"
              className="sr-only"
              aria-label="Choose a PDF bank statement"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleFile(f);
                e.target.value = "";
              }}
            />
          </>
        )}
      </div>
    );
  }

  /* ── error states ────────────────────────────────────────────────── */
  if (stage.kind === "error") {
    return (
      <div id="converter" className="space-y-4">
        <div className="rounded-sm border border-negative bg-negative-wash p-5">
          <p className="font-medium text-negative">
            {ERROR_TITLES[stage.code] ?? "Something went wrong"}
          </p>
          <p className="mt-1.5 text-sm">{stage.message}</p>
          {stage.needsPassword && (
            <form
              className="mt-3 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (lastFile.current) void handleFile(lastFile.current, password);
              }}
            >
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="PDF password"
                aria-label="PDF password"
                className="figures rounded-sm border border-rule px-2 py-1.5 text-sm"
              />
              <button
                type="submit"
                className="rounded-sm bg-ink px-3 py-1.5 text-sm font-medium text-white hover:bg-ink/85"
              >
                Unlock and parse
              </button>
            </form>
          )}
          {stage.code === "SCANNED_PDF" && (
            <p className="mt-3 text-sm">
              Scanned-statement support (OCR) is on the roadmap —{" "}
              <a className="underline" href="mailto:support@statementclear.com?subject=OCR%20waitlist">
                join the waitlist
              </a>{" "}
              and we&apos;ll email you when it ships.
            </p>
          )}
        </div>
        {(stage.code === "UNRECOGNIZED_LAYOUT" || stage.code === "NOT_A_STATEMENT") &&
          stage.pages && <FailureReporter pages={stage.pages} errorType={stage.code} />}
        <button
          type="button"
          onClick={() => setStage({ kind: "idle" })}
          className="rounded-sm border border-rule px-4 py-2 text-sm hover:border-rule-strong"
        >
          Try another file
        </button>
      </div>
    );
  }

  /* ── preview ─────────────────────────────────────────────────────── */
  const statement = stage.statements[stage.active];
  return (
    <div id="converter" className="space-y-4">
      {stage.statements.length > 1 && (
        <div role="tablist" aria-label="Accounts in this statement" className="flex gap-2">
          {stage.statements.map((s, i) => (
            <button
              key={i}
              role="tab"
              aria-selected={i === stage.active}
              onClick={() => setStage({ ...stage, active: i })}
              className={`rounded-sm border px-3 py-1.5 text-sm ${
                i === stage.active ? "border-ink bg-ink text-white" : "border-rule hover:border-rule-strong"
              }`}
            >
              {(s.accountType ?? "account").replace("-", " ")} {s.accountId ?? `#${i + 1}`}
            </button>
          ))}
        </div>
      )}

      <ReconciliationBanner statement={statement} onJumpToFlagged={(i) => setJumpTo(i)} />

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-ink-soft">
        <p className="figures">
          {statement.bankName ?? "Statement"}
          {statement.periodStart && (
            <>
              {" · "}
              {statement.periodStart} → {statement.periodEnd}
            </>
          )}
          {" · "}template: {statement.templateId}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setStage({ kind: "idle" })}
            className="rounded-sm border border-rule px-3 py-1.5 hover:border-rule-strong"
          >
            Convert another
          </button>
          <button
            type="button"
            onClick={() => setExportOpen(true)}
            className="rounded-sm bg-ledger px-4 py-1.5 font-medium text-white hover:bg-ledger-deep"
          >
            Export {statement.transactions.length} transactions…
          </button>
        </div>
      </div>

      <PreviewTable statement={statement} onChange={updateTransactions} scrollToIndex={jumpTo} />

      {statement.reconciliation.status !== "verified" && (
        <FailureReporter pages={stage.pages} errorType="PARTIAL_PARSE" />
      )}

      {exportOpen && (
        <ExportModal
          statement={statement}
          fileBase={stage.fileName}
          onClose={() => setExportOpen(false)}
        />
      )}
    </div>
  );
}

const ERROR_TITLES: Record<string, string> = {
  SCANNED_PDF: "This is a scanned PDF",
  PASSWORD_PROTECTED: "This PDF is password-protected",
  NOT_A_STATEMENT: "This doesn't look like a bank statement",
  UNRECOGNIZED_LAYOUT: "Unrecognized statement layout",
  PARTIAL_PARSE: "Parsed, but the numbers don't reconcile",
  UNREADABLE: "Couldn't read this file",
};
