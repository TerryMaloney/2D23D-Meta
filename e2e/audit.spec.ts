/**
 * Statement History Audit — full browser flow: multi-file intake, account
 * grouping, findings, exports, printable report, the bundled sample demo,
 * and the privacy invariant while processing many files at once.
 */

import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import * as XLSX from "xlsx";

const AUDIT_DIR = path.join(__dirname, "..", "packages", "parser", "fixtures", "audit");

function auditFiles(names: string[]): string[] {
  return names.map((n) => path.join(AUDIT_DIR, n));
}

test("multi-file audit: grouping, findings, no off-origin requests", async ({ page }) => {
  const requests: string[] = [];
  page.on("request", (r) => requests.push(r.url()));

  await page.goto("/audit/");
  await page.setInputFiles(
    'input[type="file"]',
    auditFiles([
      "acct-a-2025-01.pdf",
      "acct-a-2025-02.pdf",
      "acct-a-2025-03.pdf",
      "acct-a-2025-03-copy.pdf",
      "acct-a-2025-04.pdf",
      "acct-a-2025-05.pdf",
      "acct-a-2025-07.pdf", // June missing
      "acct-b-2025-01.pdf", // second account
      "corrupt.pdf", // unreadable
    ]),
  );

  const summary = page.getByTestId("audit-summary");
  await expect(summary).toBeVisible({ timeout: 60_000 });
  await expect(summary).toContainText("9 files");
  await expect(summary).toContainText("2 accounts");

  // Findings: missing June, duplicate March, unreadable file quarantined.
  await expect(page.getByText(/Missing statement period: no coverage from 2025-06-01/)).toBeVisible();
  await expect(page.getByText(/Potential duplicate statement/)).toBeVisible();
  await expect(page.getByText(/corrupt\.pdf — UNREADABLE/)).toBeVisible();

  // Privacy invariant holds across a 9-file batch.
  const offOrigin = requests.filter((u) => !u.startsWith("http://localhost:4173"));
  expect(offOrigin).toEqual([]);
});

test("audit exports: merged CSV, six-sheet workbook, per-account QBO, report", async ({ page }) => {
  test.slow();
  await page.goto("/audit/");
  // Unlock Pro first (merged ledgers exceed the free cap).
  await page.evaluate(() => {
    localStorage.setItem(
      "statementclear.license.v1",
      JSON.stringify({ plan: "pro", key: "DEV-UNLOCK", validatedAt: Date.now() }),
    );
  });
  await page.setInputFiles(
    'input[type="file"]',
    auditFiles(["acct-a-2025-01.pdf", "acct-a-2025-02.pdf", "acct-a-2025-03.pdf"]),
  );
  await expect(page.getByTestId("audit-summary")).toBeVisible({ timeout: 60_000 });

  // Merged CSV.
  const csvDl = page.waitForEvent("download");
  await page.getByRole("button", { name: /Merged CSV/ }).click();
  const csv = fs.readFileSync((await (await csvDl).path())!).toString("utf8");
  const lines = csv.slice(1).trimEnd().split("\r\n");
  expect(lines[0]).toBe("Date,Description,Amount,Balance");
  expect(lines.length).toBeGreaterThan(25); // 3 months of transactions

  // Audit workbook with all six sheets and typed cells.
  const xlsxDl = page.waitForEvent("download");
  await page.getByRole("button", { name: /Audit workbook/ }).click();
  const wb = XLSX.read(fs.readFileSync((await (await xlsxDl).path())!), {
    type: "buffer",
    cellDates: true,
  });
  expect(wb.SheetNames).toEqual([
    "Transactions",
    "Monthly Summary",
    "Statement Inventory",
    "Reconciliation",
    "Issues",
    "Recurring Transactions",
  ]);
  expect(wb.Sheets["Transactions"]["B2"].t).toBe("d"); // typed date
  expect(wb.Sheets["Transactions"]["D2"].t).toBe("n"); // typed amount

  // Per-account QBO.
  const qboDl = page.waitForEvent("download");
  await page.getByRole("button", { name: /QBO \(this account\)/ }).click();
  const qbo = fs.readFileSync((await (await qboDl).path())!).toString("utf8");
  expect(qbo).toContain("OFXHEADER:100");
  expect(qbo).toContain("<INTU.BID>");

  // Printable report opens with the privacy statement.
  const reportPage = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Printable report" }).click();
  const report = await reportPage;
  await expect(report.getByRole("heading", { name: "Statement History Audit" })).toBeVisible();
  await expect(report.getByText(/never left the/)).toBeVisible();
  await expect(report.getByText("Monthly summary").first()).toBeVisible();
});

test("the sample 12-month audit demo runs the real pipeline", async ({ page }) => {
  await page.goto("/audit/");
  await page.getByRole("button", { name: "Try a sample 12-month audit" }).click();

  const summary = page.getByTestId("audit-summary");
  await expect(summary).toBeVisible({ timeout: 60_000 });
  await expect(summary).toContainText("12 files");

  // The demo's storyline: a missing July, a duplicate-transaction warning
  // from the overlap statement, recurring patterns, and the service fee.
  await expect(page.getByText(/Missing statement period: no coverage from 2025-07-01/)).toBeVisible();
  await expect(page.getByText(/Potential duplicate transaction/).first()).toBeVisible();
  await expect(page.getByText(/Recurring payment: "ORBIT WIRELESS"/)).toBeVisible();
  await expect(page.getByText(/Recurring deposit: "PAYROLL DIRECT DEP ACME LLC"/)).toBeVisible();
  await expect(page.getByText(/Service charges/)).toBeVisible();
});

test("homepage sample button converts through the real parser", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Try a sample statement" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Verified to the cent" }),
  ).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("template: chase-checking-v1")).toBeVisible();
});
