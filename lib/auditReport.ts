"use client";

/**
 * Printable audit report: a self-contained HTML document generated locally
 * and opened in a new tab for the browser's print dialog. No server, no
 * upload — the Blob URL lives and dies in this browser.
 */

import type { AuditResult } from "@parser/audit";
import { describeFinding } from "@parser/audit";

const APP_VERSION = "1.1.0";

const usd = (c: number) =>
  `${c < 0 ? "−" : ""}$${(Math.abs(c) / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function buildAuditReportHtml(result: AuditResult): string {
  const issueKinds = new Set([
    "missing-period",
    "overlap",
    "duplicate-statement",
    "balance-discontinuity",
    "duplicate-transaction",
    "large-transaction",
  ]);
  const issues = result.findings.filter((f) => issueKinds.has(f.kind));
  const recurring = result.findings.filter((f) => f.kind === "recurring");
  const fees = result.findings.filter((f) => f.kind === "fee");

  const accountSections = result.accounts
    .map((a) => {
      const label = esc(
        [a.bankName, a.accountType, a.accountId].filter(Boolean).join(" · ") || a.accountKey,
      );
      const inv = a.inventory
        .map(
          (i) => `<tr>
  <td>${esc(i.fileName)}</td><td>${i.periodStart ?? "—"} → ${i.periodEnd ?? "—"}</td>
  <td class="num">${i.txCount}</td><td class="${i.status}">${i.status}${i.duplicateOf ? " (duplicate)" : ""}</td>
  <td class="num">${i.openingCents !== undefined ? usd(i.openingCents) : "—"}</td>
  <td class="num">${i.closingCents !== undefined ? usd(i.closingCents) : "—"}</td>
</tr>`,
        )
        .join("");
      const monthly = a.monthly
        .map(
          (m) => `<tr><td>${m.month}</td><td class="num">${usd(m.inCents)}</td>
  <td class="num">${usd(m.outCents)}</td><td class="num">${usd(m.netCents)}</td><td class="num">${m.txCount}</td></tr>`,
        )
        .join("");
      return `<section>
<h2>${label}</h2>
<p>Coverage: ${a.coverageStart ?? "—"} → ${a.coverageEnd ?? "—"} · ${a.inventory.length} statements</p>
<h3>Statement inventory</h3>
<table><tr><th>File</th><th>Period</th><th>Tx</th><th>Status</th><th>Opening</th><th>Closing</th></tr>${inv}</table>
<h3>Monthly summary</h3>
<table><tr><th>Month</th><th>Money in</th><th>Money out</th><th>Net</th><th>Tx</th></tr>${monthly}</table>
</section>`;
    })
    .join("\n");

  const list = (items: string[]) =>
    items.length ? `<ul>${items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>` : "<p>None.</p>";

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>Statement History Audit — StatementClear</title>
<style>
  body { font: 13px/1.45 system-ui, sans-serif; color: #1c2826; margin: 2rem auto; max-width: 56rem; padding: 0 1rem; }
  h1 { font-size: 1.5rem; } h2 { font-size: 1.15rem; margin-top: 2rem; border-bottom: 1px solid #c3cdc8; padding-bottom: .25rem; }
  h3 { font-size: .95rem; margin: 1rem 0 .35rem; }
  table { border-collapse: collapse; width: 100%; font-variant-numeric: tabular-nums; }
  td, th { border: 1px solid #dde3e0; padding: 3px 7px; text-align: left; font-size: 12px; }
  .num { text-align: right; } .verified { color: #0e6b48; } .partial { color: #8a6116; } .failed { color: #a4392f; }
  .privacy { background: #eaf3ee; border: 1px solid #0e6b48; padding: .6rem .8rem; border-radius: 3px; }
  footer { margin-top: 2rem; color: #51605c; font-size: 11px; }
  @media print { body { margin: 0; } .noprint { display: none; } }
</style></head><body>
<button class="noprint" onclick="window.print()" style="float:right;padding:.4rem .8rem">Print</button>
<h1>Statement History Audit</h1>
<p class="privacy">This report was generated entirely in the browser. The statements never left the
device they were read on — StatementClear has no server that could receive them.</p>

${accountSections}

<h2>Issues requiring review</h2>
${list(issues.map(describeFinding))}
${
  result.unparsed.length
    ? `<p><strong>Files that could not be read:</strong> ${result.unparsed
        .map((u) => `${esc(u.fileName)} (${esc(u.errorCode)})`)
        .join(", ")}</p>`
    : ""
}

<h2>Recurring patterns</h2>
${list(recurring.map(describeFinding))}

<h2>Fees and interest</h2>
${list(fees.map(describeFinding))}

<footer>
Generated ${new Date().toISOString()} · StatementClear v${APP_VERSION} ·
Findings are arithmetic and pattern observations for review — not fraud detection,
financial advice, or professional accounting conclusions.
</footer>
</body></html>`;
}

export function openAuditReport(result: AuditResult): void {
  const html = buildAuditReportHtml(result);
  const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
  window.open(url, "_blank");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
