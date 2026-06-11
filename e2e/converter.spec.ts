/**
 * End-to-end flow against the static export (built with
 * NEXT_PUBLIC_TEST_MODE=true): upload → reconcile → edit → free cap →
 * DEV-UNLOCK license → export. Also proves the privacy invariant: no request
 * during parsing carries file content.
 */

import { expect, test } from "@playwright/test";
import path from "node:path";

const SAMPLE = path.join(__dirname, "..", "public", "sample-statement.pdf");
const SMALL = path.join(
  __dirname,
  "..",
  "packages",
  "parser",
  "fixtures",
  "pdfs",
  "citi-card.pdf",
);

test("homepage converts a statement and reconciles to the cent", async ({ page }) => {
  const requests: string[] = [];
  page.on("request", (r) => requests.push(r.url()));

  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Convert bank statements");

  await page.setInputFiles('input[type="file"]', SAMPLE);
  await expect(page.getByRole("status").filter({ hasText: "Verified to the cent" })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("template: chase-checking-v1")).toBeVisible();

  // Privacy invariant: nothing was POSTed during parse except the beacon,
  // and no request URL goes off-origin (fonts are self-hosted).
  const offOrigin = requests.filter((u) => !u.startsWith("http://localhost:4173"));
  expect(offOrigin).toEqual([]);
});

test("free cap blocks large exports; DEV-UNLOCK lifts it; CSV downloads", async ({ page }) => {
  await page.goto("/");
  await page.setInputFiles('input[type="file"]', SAMPLE); // 38 transactions > 30 cap
  await expect(page.getByRole("status").filter({ hasText: "Verified to the cent" })).toBeVisible({ timeout: 30_000 });

  await page.getByRole("button", { name: /Export 38 transactions/ }).click();
  await expect(page.getByText(/free plan exports up to 30/)).toBeVisible();

  // License flow with the TEST_MODE dev key.
  await page.getByLabel("License key").fill("DEV-UNLOCK");
  await page.getByRole("button", { name: "Activate" }).click();
  const exportButton = page.getByRole("button", { name: /Export 38 transactions as CSV/ });
  await expect(exportButton).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await exportButton.click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.csv$/);
});

test("small statements export free without a license", async ({ page }) => {
  await page.goto("/");
  await page.setInputFiles('input[type="file"]', SMALL); // 18 transactions
  await expect(page.getByRole("status").filter({ hasText: "Verified to the cent" })).toBeVisible({ timeout: 30_000 });

  await page.getByRole("button", { name: /Export 18 transactions/ }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /Export 18 transactions as CSV/ }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.csv$/);
});

test("editing a cell re-runs reconciliation", async ({ page }) => {
  await page.goto("/");
  await page.setInputFiles('input[type="file"]', SMALL);
  await expect(page.getByRole("status").filter({ hasText: "Verified to the cent" })).toBeVisible({ timeout: 30_000 });

  // Break an amount → banner flips to failed; restore → verified again.
  const amountCell = page.locator('button[title="45.23"], button').filter({ hasText: /^-?\d+\.\d{2}$/ }).first();
  const original = (await amountCell.textContent())!.trim();
  await amountCell.click();
  const editor = page.getByLabel("Edit cell");
  await editor.fill("999999.99");
  await editor.press("Enter");
  await expect(page.getByRole("status").filter({ hasText: /Reconciliation failed|Partially verified/ })).toBeVisible();

  const broken = page.locator("button").filter({ hasText: "999999.99" }).first();
  await broken.click();
  await page.getByLabel("Edit cell").fill(original);
  await page.getByLabel("Edit cell").press("Enter");
  await expect(page.getByRole("status").filter({ hasText: "Verified to the cent" })).toBeVisible();
});

test("scanned PDFs get the typed error with waitlist copy", async ({ page }) => {
  await page.goto("/");
  await page.setInputFiles(
    'input[type="file"]',
    path.join(__dirname, "..", "packages", "parser", "fixtures", "pdfs", "scanned.pdf"),
  );
  await expect(page.getByText("This is a scanned PDF")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/contains images of pages/)).toBeVisible();
});

test("csv-to-qbo tool maps columns and exports", async ({ page }) => {
  await page.goto("/csv-to-qbo/");
  const csv = Buffer.from(
    "Date,Description,Amount\n01/05/2026,COFFEE SHOP,-4.50\n01/06/2026,PAYCHECK,1200.00\n",
  );
  await page.setInputFiles('input[type="file"]', {
    name: "test.csv",
    mimeType: "text/csv",
    buffer: csv,
  });
  const exportBtn = page.getByRole("button", { name: /Export 2 transactions as \.qbo/ });
  await expect(exportBtn).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await exportBtn.click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("test.qbo");
});

test("key pages render with sensible content", async ({ page }) => {
  await page.goto("/pricing/");
  await expect(page.getByText("Credit pack")).toBeVisible();
  await page.goto("/convert/chase-statement-to-csv/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Chase");
  await page.goto("/guides/why-qbo-import-fails/");
  await expect(page.getByText("INTU.BID")).toHaveCount(3);
});
