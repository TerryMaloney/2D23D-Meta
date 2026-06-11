/**
 * Private statement validator — `npm run validate:statements`
 *
 * Scans PDFs in .private-statement-validation/input/ (gitignored), parses
 * each with the production engine, and writes a sanitized summary to
 * .private-statement-validation/results.{json,html} (also gitignored).
 *
 * PRIVACY CONTRACT (do not relax):
 * The summary contains ONLY: anonymous file IDs, page counts, detected
 * institution/template, statement type, transaction counts, reconciliation
 * status, the reconciliation difference in cents, flagged-row counts, error
 * categories, and runtimes. It must NEVER contain transaction descriptions,
 * names, addresses, account numbers, routing numbers, exact balances, exact
 * transaction values, or any extracted statement text. Nothing is ever
 * transmitted anywhere — this script does no network I/O.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseStatement } from "../packages/parser/src/parse";
import { StatementParseError } from "../packages/parser/src/types";
import type { RawPage } from "../packages/parser/src/types";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASE = process.env.VALIDATE_DIR ?? path.join(ROOT, ".private-statement-validation");
const INPUT = path.join(BASE, "input");

interface FileResult {
  id: string;
  pages: number;
  institution: string | null;
  statementType: string | null;
  parser: string | null;
  accounts: number;
  transactions: number;
  reconciliation: "verified" | "partial" | "failed" | null;
  /** |expected closing − parsed closing| in cents; 0 when verified. */
  differenceCents: number | null;
  flaggedRows: number;
  errorCategory: string | null;
  runtimeMs: number;
}

async function loadPages(file: string): Promise<RawPage[]> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const data = new Uint8Array(fs.readFileSync(file));
  const doc = await pdfjs.getDocument({
    data,
    useSystemFonts: true,
    standardFontDataUrl: path.join(ROOT, "node_modules", "pdfjs-dist", "standard_fonts/"),
  }).promise;
  const pages: RawPage[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();
    pages.push({
      pageNumber: i,
      pageHeight: viewport.height,
      items: content.items
        .filter((it): it is import("pdfjs-dist/types/src/display/api").TextItem => "str" in it)
        .map((it) => ({ str: it.str, transform: it.transform, width: it.width, height: it.height })),
    });
  }
  return pages;
}

async function validateOne(file: string, id: string): Promise<FileResult> {
  const started = performance.now();
  const result: FileResult = {
    id,
    pages: 0,
    institution: null,
    statementType: null,
    parser: null,
    accounts: 0,
    transactions: 0,
    reconciliation: null,
    differenceCents: null,
    flaggedRows: 0,
    errorCategory: null,
    runtimeMs: 0,
  };
  try {
    const pages = await loadPages(file);
    result.pages = pages.length;
    const output = parseStatement(pages);
    const statements = output.statements;
    result.accounts = statements.length;
    result.parser = statements[0]?.templateId ?? null;
    result.institution = statements[0]?.bankName ?? null;
    result.statementType = statements[0]?.accountType ?? "unknown";
    result.transactions = statements.reduce((n, s) => n + s.transactions.length, 0);
    result.flaggedRows = statements.reduce(
      (n, s) => n + s.reconciliation.flaggedRowIndices.length,
      0,
    );
    // Worst status across accounts; difference summed as absolute cents.
    const rank = { verified: 0, partial: 1, failed: 2 } as const;
    let worst: keyof typeof rank = "verified";
    let diff = 0;
    for (const s of statements) {
      if (rank[s.reconciliation.status] > rank[worst]) worst = s.reconciliation.status;
      if (
        s.openingBalanceCents !== undefined &&
        s.closingBalanceCents !== undefined
      ) {
        diff += Math.abs(
          s.openingBalanceCents + s.reconciliation.transactionSumCents - s.closingBalanceCents,
        );
      }
    }
    result.reconciliation = worst;
    result.differenceCents = diff;
  } catch (e) {
    if ((e as { name?: string })?.name === "PasswordException") {
      result.errorCategory = "PASSWORD_PROTECTED";
    } else if (e instanceof StatementParseError) {
      result.errorCategory = e.code;
    } else {
      result.errorCategory = "UNREADABLE";
    }
  }
  result.runtimeMs = Math.round(performance.now() - started);
  return result;
}

function renderHtml(results: FileResult[]): string {
  const rows = results
    .map(
      (r) => `<tr>
  <td>${r.id}</td><td>${r.pages}</td><td>${r.institution ?? "—"}</td>
  <td>${r.statementType ?? "—"}</td><td>${r.parser ?? "—"}</td>
  <td>${r.accounts}</td><td>${r.transactions}</td>
  <td class="${r.reconciliation ?? "err"}">${r.reconciliation ?? r.errorCategory}</td>
  <td>${r.differenceCents ?? "—"}</td><td>${r.flaggedRows}</td><td>${r.runtimeMs} ms</td>
</tr>`,
    )
    .join("\n");
  const agg = aggregate(results);
  return `<!doctype html><meta charset="utf-8"><title>StatementClear private validation</title>
<style>body{font:14px system-ui;margin:2rem}table{border-collapse:collapse}td,th{border:1px solid #ccc;padding:4px 8px;text-align:left}.verified{color:#0a6b3d}.partial{color:#8a6116}.failed,.err{color:#a4392f}</style>
<h1>Private statement validation</h1>
<p>Generated locally. Contains no statement contents — safe to look at, still not committed.</p>
<p><strong>${agg.total}</strong> files · ${agg.verified} verified · ${agg.partial} partial · ${agg.failed} failed · ${agg.errors} unparseable</p>
<table><tr><th>ID</th><th>Pages</th><th>Institution</th><th>Type</th><th>Parser</th><th>Accounts</th><th>Tx</th><th>Status</th><th>Diff (¢)</th><th>Flagged</th><th>Runtime</th></tr>
${rows}</table>`;
}

function aggregate(results: FileResult[]) {
  return {
    total: results.length,
    verified: results.filter((r) => r.reconciliation === "verified").length,
    partial: results.filter((r) => r.reconciliation === "partial").length,
    failed: results.filter((r) => r.reconciliation === "failed").length,
    errors: results.filter((r) => r.errorCategory !== null).length,
    byErrorCategory: Object.fromEntries(
      [...new Set(results.map((r) => r.errorCategory).filter(Boolean))].map((c) => [
        c,
        results.filter((r) => r.errorCategory === c).length,
      ]),
    ),
    byParser: Object.fromEntries(
      [...new Set(results.map((r) => r.parser).filter(Boolean))].map((p) => [
        p,
        results.filter((r) => r.parser === p).length,
      ]),
    ),
  };
}

async function main(): Promise<void> {
  fs.mkdirSync(INPUT, { recursive: true });
  const files = fs
    .readdirSync(INPUT)
    .filter((f) => f.toLowerCase().endsWith(".pdf"))
    .sort();
  if (files.length === 0) {
    console.log(`No PDFs found. Put statements in ${INPUT} and re-run.`);
    console.log("Nothing in that folder is ever committed or uploaded.");
    return;
  }
  const results: FileResult[] = [];
  for (let i = 0; i < files.length; i++) {
    const id = `stmt-${String(i + 1).padStart(3, "0")}`;
    results.push(await validateOne(path.join(INPUT, files[i]), id));
    // Progress line carries the anonymous ID only — never the filename.
    const r = results[results.length - 1];
    console.log(
      `${id}: ${r.errorCategory ?? r.reconciliation} · ${r.transactions} tx · ${r.runtimeMs} ms`,
    );
  }
  const payload = { generatedAt: new Date().toISOString(), aggregate: aggregate(results), results };
  fs.writeFileSync(path.join(BASE, "results.json"), JSON.stringify(payload, null, 2) + "\n");
  fs.writeFileSync(path.join(BASE, "results.html"), renderHtml(results));
  console.log(`\nWrote ${path.join(BASE, "results.json")} and results.html (local only).`);
}

main().catch((e) => {
  console.error("Validator failed:", (e as Error).message);
  process.exit(1);
});
