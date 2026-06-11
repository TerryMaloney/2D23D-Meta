/**
 * Structural verification of every export format, downloaded through the
 * real UI and inspected byte-for-byte. Uses the 18-transaction Citi fixture
 * (under the free cap, so no license is involved).
 */

import { expect, test, Page, Download } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import * as XLSX from "xlsx";

const SMALL = path.join(
  __dirname,
  "..",
  "packages",
  "parser",
  "fixtures",
  "pdfs",
  "citi-card.pdf",
);
const TX_COUNT = 18;

async function openExportModal(page: Page): Promise<void> {
  await page.goto("/");
  await page.setInputFiles('input[type="file"]', SMALL);
  await expect(
    page.getByRole("status").filter({ hasText: "Verified to the cent" }),
  ).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: /Export 18 transactions/ }).click();
}

async function exportAs(page: Page, value: string, buttonLabel: RegExp): Promise<Buffer> {
  await page.locator(`input[name="format"][value="${value}"]`).check({ force: true });
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: buttonLabel }).click();
  const download: Download = await downloadPromise;
  const file = await download.path();
  return fs.readFileSync(file!);
}

test("CSV export: BOM, header, one row per transaction, RFC 4180", async ({ page }) => {
  await openExportModal(page);
  const bytes = await exportAs(page, "csv", /Export 18 transactions as CSV/);
  const text = bytes.toString("utf8");
  expect(text.charCodeAt(0)).toBe(0xfeff);
  const lines = text.slice(1).trimEnd().split("\r\n");
  // Balance column is included by default; the card fixture has no
  // printed balances, so its cells are empty.
  expect(lines[0]).toBe("Date,Description,Amount,Balance");
  expect(lines).toHaveLength(1 + TX_COUNT);
  // Amounts are plain signed decimals.
  expect(lines[1]).toMatch(/,-?\d+\.\d{2},$/);
});

test("XLSX export: typed date and currency cells, reconciliation block", async ({ page }) => {
  await openExportModal(page);
  const bytes = await exportAs(page, "xlsx", /Export 18 transactions as Excel/);
  const wb = XLSX.read(bytes, { type: "buffer", cellDates: true });
  expect(wb.SheetNames).toContain("Transactions");
  const ws = wb.Sheets["Transactions"];
  expect(ws["A1"].v).toBe("Date");
  expect(ws["A2"].t).toBe("d"); // typed date, not a string
  expect(ws["A2"].v).toBeInstanceOf(Date);
  expect(ws["C2"].t).toBe("n"); // typed amount (Date, Description, Amount)
  const all = Object.values(ws)
    .map((c) => (typeof c === "object" && c && "v" in c ? String((c as XLSX.CellObject).v) : ""))
    .join("|");
  expect(all).toContain("Verified to the cent");
});

test("QBO export: OFX header, INTU.BID, unique FITIDs, ledger balance", async ({ page }) => {
  await openExportModal(page);
  const bytes = await exportAs(page, "qbo", /Export 18 transactions as QBO/);
  const text = bytes.toString("utf8");
  expect(text).toContain("OFXHEADER:100");
  expect(text).toContain("VERSION:102");
  expect(text).toContain("<INTU.BID>3000");
  expect(text).toContain("<LEDGERBAL>");
  const fitids = [...text.matchAll(/<FITID>(\S+)/g)].map((m) => m[1]);
  expect(fitids).toHaveLength(TX_COUNT);
  expect(new Set(fitids).size).toBe(TX_COUNT);
  // Card fixture defaults to the credit-card aggregate.
  expect(text).toContain("<CCSTMTRS>");
});

test("QFX export: includes INTU.BID; OFX export: omits it", async ({ page }) => {
  await openExportModal(page);
  const qfx = (await exportAs(page, "qfx", /Export 18 transactions as QFX/)).toString("utf8");
  expect(qfx).toContain("OFXHEADER:100");
  expect(qfx).toContain("<INTU.BID>");

  const ofx = (await exportAs(page, "ofx", /Export 18 transactions as OFX/)).toString("utf8");
  expect(ofx).toContain("OFXHEADER:100");
  expect(ofx).not.toContain("<INTU.BID>");
  // Container tags balance.
  for (const tag of ["OFX", "BANKTRANLIST", "STMTTRN", "LEDGERBAL"]) {
    const opens = (ofx.match(new RegExp(`<${tag}>`, "g")) ?? []).length;
    const closes = (ofx.match(new RegExp(`</${tag}>`, "g")) ?? []).length;
    expect(opens, tag).toBe(closes);
  }
});

test("Xero CSV export: precoded column layout", async ({ page }) => {
  await openExportModal(page);
  const bytes = await exportAs(page, "xero", /Export 18 transactions as Xero CSV/);
  const text = bytes.toString("utf8");
  const lines = text.replace(/^﻿/, "").trimEnd().split("\r\n");
  expect(lines[0]).toBe("Date,Amount,Payee,Description,Reference");
  expect(lines).toHaveLength(1 + TX_COUNT);
});
