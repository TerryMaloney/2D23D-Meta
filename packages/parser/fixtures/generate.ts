/**
 * Fixture generator: renders deterministic synthetic bank statements with
 * pdf-lib that mimic real layouts (geometry, columns, headers, footers —
 * invented names and numbers), plus adversarial PDFs. Each statement fixture
 * also emits a golden JSON file derived from the same source data, so golden
 * tests compare the parser against ground truth, not against itself.
 *
 * Run: npm run fixtures
 */

import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from "pdf-lib";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_PDF = path.join(__dirname, "pdfs");
const OUT_GOLDEN = path.join(__dirname, "golden");

/* ─────────────────────────── utilities ─────────────────────────── */

/** Deterministic RNG so fixtures are stable across runs. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function usFmt(cents: number, opts: { symbol?: boolean; explicitMinus?: boolean } = {}): string {
  const abs = Math.abs(cents);
  const s = `${Math.floor(abs / 100).toLocaleString("en-US")}.${String(abs % 100).padStart(2, "0")}`;
  const sym = opts.symbol ? "$" : "";
  if (cents < 0) return `-${sym}${s}`;
  return `${sym}${s}`;
}

function euFmt(cents: number): string {
  const abs = Math.abs(cents);
  const int = Math.floor(abs / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const s = `${int},${String(abs % 100).padStart(2, "0")}`;
  return cents < 0 ? `-${s}` : s;
}

const MONTH_SHORT = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

function mmdd(iso: string): string {
  return `${iso.slice(5, 7)}/${iso.slice(8, 10)}`;
}
function mmddyy(iso: string): string {
  return `${iso.slice(5, 7)}/${iso.slice(8, 10)}/${iso.slice(2, 4)}`;
}
function ddmon(iso: string): string {
  return `${Number(iso.slice(8, 10))} ${MONTH_SHORT[Number(iso.slice(5, 7)) - 1]}`;
}

/** ISO dates spread across a period, ascending. */
function spreadDates(rng: () => number, startIso: string, endIso: string, count: number): string[] {
  const start = Date.parse(startIso + "T00:00:00Z");
  const end = Date.parse(endIso + "T00:00:00Z");
  const ts: number[] = [];
  for (let i = 0; i < count; i++) ts.push(start + rng() * (end - start));
  ts.sort((a, b) => a - b);
  return ts.map((t) => new Date(t).toISOString().slice(0, 10));
}

const MERCHANTS = [
  "NORTHWIND GROCERY", "BLUE KETTLE COFFEE", "RIVERSIDE HARDWARE",
  "LUMEN UTILITIES", "CEDARLINE INSURANCE", "ORBIT WIRELESS",
  "MAPLE AND MAIN DINER", "HARBORVIEW PARKING", "STONEGATE GYM",
  "PAPERTRAIL OFFICE SUPPLY", "GREENFIELD PHARMACY", "SUNSET FUEL STATION",
  "QUARRY BOOKS", "DRIFTWOOD HOTEL", "TIDEWATER MARKET",
];
const DEPOSITS = [
  "PAYROLL DIRECT DEP ACME LLC", "MOBILE CHECK DEPOSIT", "ZELLE FROM J DOE",
  "INTEREST PAYMENT", "TRANSFER FROM SAVINGS", "REFUND NORTHWIND GROCERY",
];

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}
function cents(rng: () => number, min: number, max: number): number {
  return Math.floor(min + rng() * (max - min));
}

/* ─────────────────────────── page builder ─────────────────────────── */

const W = 612;
const H = 792;

class Builder {
  pages: PDFPage[] = [];
  page!: PDFPage;
  private constructor(
    public doc: PDFDocument,
    public font: PDFFont,
    public bold: PDFFont,
  ) {}

  static async create(): Promise<Builder> {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);
    const b = new Builder(doc, font, bold);
    b.newPage();
    return b;
  }

  newPage(): void {
    this.page = this.doc.addPage([W, H]);
    this.pages.push(this.page);
  }

  /** Draw text with a TOP-left y coordinate (flipped internally). */
  text(x: number, yTop: number, str: string, size = 9, bold = false): void {
    this.page.drawText(str, {
      x,
      y: H - yTop - size,
      size,
      font: bold ? this.bold : this.font,
      color: rgb(0.1, 0.1, 0.12),
    });
  }

  /** Right-aligned text: rightX is the right edge. */
  right(rightX: number, yTop: number, str: string, size = 9, bold = false): void {
    const f = bold ? this.bold : this.font;
    this.text(rightX - f.widthOfTextAtSize(str, size), yTop, str, size, bold);
  }

  rule(yTop: number, x1 = 50, x2 = W - 50): void {
    this.page.drawLine({
      start: { x: x1, y: H - yTop },
      end: { x: x2, y: H - yTop },
      thickness: 0.5,
      color: rgb(0.6, 0.6, 0.6),
    });
  }

  async save(): Promise<Uint8Array> {
    return this.doc.save();
  }
}

/* ─────────────────────────── golden types ─────────────────────────── */

interface GoldenTx {
  date: string;
  postDate?: string;
  description: string;
  amountCents: number;
  balanceCents?: number;
  checkNumber?: string;
  currency?: string;
}

interface Golden {
  templateId: string;
  currency: string;
  periodStart?: string;
  periodEnd?: string;
  openingBalanceCents?: number;
  closingBalanceCents?: number;
  reconciliationStatus: "verified";
  transactions: GoldenTx[];
}

async function write(name: string, builder: Builder, golden: Golden | Golden[] | null): Promise<void> {
  fs.mkdirSync(OUT_PDF, { recursive: true });
  fs.mkdirSync(OUT_GOLDEN, { recursive: true });
  fs.writeFileSync(path.join(OUT_PDF, `${name}.pdf`), await builder.save());
  if (golden) {
    fs.writeFileSync(
      path.join(OUT_GOLDEN, `${name}.json`),
      JSON.stringify(golden, null, 2) + "\n",
    );
  }
  console.log(`✓ ${name}`);
}

/* ─────────────────────────── checking-style data ─────────────────────────── */

interface CheckingTx {
  date: string;
  description: string;
  desc2?: string;
  amountCents: number;
  balanceCents: number;
  checkNumber?: string;
  currency?: string;
}

function genChecking(
  seed: number,
  opts: {
    count: number;
    openingCents: number;
    periodStart: string;
    periodEnd: string;
    depositShare?: number;
    multilineShare?: number;
    checkShare?: number;
  },
): { txs: CheckingTx[]; closing: number; deposits: number; withdrawals: number } {
  const rng = mulberry32(seed);
  const dates = spreadDates(rng, opts.periodStart, opts.periodEnd, opts.count);
  let balance = opts.openingCents;
  let deposits = 0;
  let withdrawals = 0;
  const txs: CheckingTx[] = [];
  for (let i = 0; i < opts.count; i++) {
    const isDeposit = rng() < (opts.depositShare ?? 0.3);
    const isCheck = !isDeposit && rng() < (opts.checkShare ?? 0);
    let amount: number;
    let description: string;
    let checkNumber: string | undefined;
    if (isDeposit) {
      amount = cents(rng, 20000, 400000);
      description = pick(rng, DEPOSITS);
      deposits += amount;
    } else {
      amount = -cents(rng, 500, 90000);
      description = isCheck ? "CHECK" : pick(rng, MERCHANTS);
      if (isCheck) checkNumber = String(1001 + i);
      withdrawals += amount;
    }
    balance += amount;
    const desc2 =
      !isCheck && rng() < (opts.multilineShare ?? 0)
        ? `REF: ${String(Math.floor(rng() * 1e9)).padStart(9, "0")}X`
        : undefined;
    txs.push({ date: dates[i], description, desc2, amountCents: amount, balanceCents: balance, checkNumber });
  }
  return { txs, closing: balance, deposits, withdrawals };
}

interface CardTx {
  date: string;
  postDate?: string;
  description: string;
  amountCents: number; // purchases +, payments/credits −
}

function genCard(
  seed: number,
  opts: { count: number; periodStart: string; periodEnd: string; paymentCount?: number; postDates?: boolean },
): { txs: CardTx[]; purchases: number; payments: number } {
  const rng = mulberry32(seed);
  const dates = spreadDates(rng, opts.periodStart, opts.periodEnd, opts.count);
  const txs: CardTx[] = [];
  let purchases = 0;
  let payments = 0;
  const paymentIdx = new Set<number>();
  const pc = opts.paymentCount ?? 2;
  while (paymentIdx.size < pc) paymentIdx.add(Math.floor(rng() * opts.count));
  for (let i = 0; i < opts.count; i++) {
    const isPayment = paymentIdx.has(i);
    const amount = isPayment ? -cents(rng, 30000, 150000) : cents(rng, 300, 30000);
    if (isPayment) payments += amount;
    else purchases += amount;
    let postDate: string | undefined;
    if (opts.postDates) {
      const d = new Date(Date.parse(dates[i] + "T00:00:00Z") + 2 * 86400000);
      postDate = d.toISOString().slice(0, 10);
    }
    txs.push({
      date: dates[i],
      postDate,
      description: isPayment ? "AUTOMATIC PAYMENT - THANK YOU" : pick(rng, MERCHANTS),
      amountCents: amount,
    });
  }
  return { txs, purchases, payments };
}

/* ─────────────────────────── fixtures ─────────────────────────── */

async function chaseChecking(): Promise<void> {
  const opening = 421055;
  const { txs, closing, deposits, withdrawals } = genChecking(11, {
    count: 38,
    openingCents: opening,
    periodStart: "2026-01-01",
    periodEnd: "2026-01-31",
    depositShare: 0.28,
    multilineShare: 0.2,
  });

  const b = await Builder.create();
  b.text(50, 50, "JPMorgan Chase Bank, N.A.", 12, true);
  b.text(50, 66, "P.O. Box 182051, Columbus, OH 43218");
  b.text(50, 90, "January 1, 2026 through January 31, 2026", 10);
  b.text(380, 90, "Account Number: ...7204", 9);

  b.text(50, 124, "CHECKING SUMMARY", 11, true);
  b.rule(140);
  b.text(50, 148, "Beginning Balance");
  b.right(400, 148, `$${usFmt(opening)}`);
  b.text(50, 163, "Deposits and Additions");
  b.right(400, 163, `$${usFmt(deposits)}`);
  b.text(50, 178, "Electronic Withdrawals");
  b.right(400, 178, `-$${usFmt(Math.abs(withdrawals))}`);
  b.text(50, 193, "Ending Balance");
  b.right(400, 193, `$${usFmt(closing)}`);

  b.text(50, 228, "TRANSACTION DETAIL", 11, true);
  b.rule(244);
  const header = (y: number) => {
    b.text(50, y, "DATE", 8, true);
    b.text(100, y, "DESCRIPTION", 8, true);
    b.right(460, y, "AMOUNT", 8, true);
    b.right(545, y, "BALANCE", 8, true);
  };
  header(252);

  let y = 270;
  let pageNum = 1;
  const footer = () => {
    b.text(50, 745, "Questions? Visit chase.com or call 1-800-935-9935", 7);
    b.text(500, 760, `Page ${pageNum} of 2`, 7);
  };
  for (const t of txs) {
    if (y > 700) {
      footer();
      b.newPage();
      pageNum++;
      b.text(50, 50, "JPMorgan Chase Bank, N.A.", 9, true);
      header(80);
      y = 100;
    }
    b.text(50, y, mmdd(t.date));
    b.text(100, y, t.description);
    b.right(460, y, usFmt(t.amountCents));
    b.right(545, y, usFmt(t.balanceCents));
    y += 15;
    if (t.desc2) {
      b.text(100, y, t.desc2, 8);
      y += 13;
    }
  }
  footer();

  await write("chase-checking", b, {
    templateId: "chase-checking-v1",
    currency: "USD",
    periodStart: "2026-01-01",
    periodEnd: "2026-01-31",
    openingBalanceCents: opening,
    closingBalanceCents: closing,
    reconciliationStatus: "verified",
    transactions: txs.map((t) => ({
      date: t.date,
      description: t.desc2 ? `${t.description} ${t.desc2}` : t.description,
      amountCents: t.amountCents,
      balanceCents: t.balanceCents,
    })),
  });
}

async function chaseCard(): Promise<void> {
  const opening = 125040;
  const { txs, purchases, payments } = genCard(22, {
    count: 21,
    periodStart: "2025-12-05",
    periodEnd: "2026-01-04",
    paymentCount: 1,
  });
  const closing = opening + purchases + payments;

  const b = await Builder.create();
  b.text(50, 50, "Chase Card Services", 12, true);
  b.text(50, 66, "JPMorgan Chase Bank, N.A.");
  b.text(50, 88, "Opening/Closing Date 12/05/25 - 01/04/26", 9);
  b.text(380, 88, "Account Number: ...9913", 9);

  b.text(50, 120, "ACCOUNT SUMMARY", 11, true);
  b.rule(136);
  b.text(50, 146, "Previous Balance");
  b.right(400, 146, `$${usFmt(opening)}`);
  b.text(50, 161, "Payments and Credits");
  b.right(400, 161, `-$${usFmt(Math.abs(payments))}`);
  b.text(50, 176, "Purchases");
  b.right(400, 176, `+$${usFmt(purchases)}`);
  b.text(50, 191, "New Balance");
  b.right(400, 191, `$${usFmt(closing)}`);
  b.text(50, 210, "Minimum Payment Due: $40.00  Payment Due Date: 02/01/26", 9);

  b.text(50, 240, "ACCOUNT ACTIVITY", 11, true);
  b.rule(256);
  b.text(50, 264, "DATE", 8, true);
  b.text(105, 264, "MERCHANT NAME OR TRANSACTION DESCRIPTION", 8, true);
  b.right(545, 264, "AMOUNT", 8, true);

  let y = 282;
  for (const t of txs) {
    b.text(50, y, mmdd(t.date));
    b.text(105, y, t.description);
    b.right(545, y, usFmt(t.amountCents));
    y += 15;
  }

  await write("chase-card", b, {
    templateId: "chase-card-v1",
    currency: "USD",
    periodStart: "2025-12-05",
    periodEnd: "2026-01-04",
    openingBalanceCents: opening,
    closingBalanceCents: closing,
    reconciliationStatus: "verified",
    transactions: txs.map((t) => ({
      date: t.date,
      description: t.description,
      amountCents: t.amountCents,
    })),
  });
}

async function boaChecking(): Promise<void> {
  const opening = 812300;
  const { txs, closing, deposits, withdrawals } = genChecking(33, {
    count: 24,
    openingCents: opening,
    periodStart: "2026-01-01",
    periodEnd: "2026-01-31",
    depositShare: 0.33,
  });
  const dep = txs.filter((t) => t.amountCents > 0);
  const wd = txs.filter((t) => t.amountCents < 0);

  const b = await Builder.create();
  b.text(50, 50, "Bank of America, N.A.", 12, true);
  b.text(50, 66, "P.O. Box 25118, Tampa, FL 33622");
  b.text(50, 90, "Your Adv Plus Banking", 10, true);
  b.text(50, 106, "January 1, 2026 to January 31, 2026", 10);
  b.text(380, 106, "Account number: 3331 2204 7719", 9);

  b.text(50, 138, "Account summary", 11, true);
  b.rule(154);
  b.text(50, 164, "Beginning balance on January 1, 2026");
  b.right(545, 164, `$${usFmt(opening)}`);
  b.text(50, 179, "Deposits and other additions");
  b.right(545, 179, `$${usFmt(deposits)}`);
  b.text(50, 194, "Withdrawals and other subtractions");
  b.right(545, 194, `-$${usFmt(Math.abs(withdrawals))}`);
  b.text(50, 209, "Ending balance on January 31, 2026");
  b.right(545, 209, `$${usFmt(closing)}`);

  let y = 244;
  b.text(50, y, "Deposits and other additions", 11, true);
  b.rule(y + 14);
  y += 22;
  b.text(50, y, "Date", 8, true);
  b.text(110, y, "Description", 8, true);
  b.right(545, y, "Amount", 8, true);
  y += 16;
  for (const t of dep) {
    b.text(50, y, mmddyy(t.date));
    b.text(110, y, t.description);
    b.right(545, y, usFmt(t.amountCents));
    y += 14;
  }
  b.text(50, y, "Total deposits and other additions");
  b.right(545, y, `$${usFmt(deposits)}`);
  y += 28;

  b.text(50, y, "Withdrawals and other subtractions", 11, true);
  b.rule(y + 14);
  y += 22;
  b.text(50, y, "Date", 8, true);
  b.text(110, y, "Description", 8, true);
  b.right(545, y, "Amount", 8, true);
  y += 16;
  for (const t of wd) {
    b.text(50, y, mmddyy(t.date));
    b.text(110, y, t.description);
    b.right(545, y, usFmt(Math.abs(t.amountCents)));
    y += 14;
  }
  b.text(50, y, "Total withdrawals and other subtractions");
  b.right(545, y, `-$${usFmt(Math.abs(withdrawals))}`);

  // BofA groups by section, so golden order is deposits then withdrawals.
  await write("boa-checking", b, {
    templateId: "boa-checking-v1",
    currency: "USD",
    periodStart: "2026-01-01",
    periodEnd: "2026-01-31",
    openingBalanceCents: opening,
    closingBalanceCents: closing,
    reconciliationStatus: "verified",
    transactions: [...dep, ...wd].map((t) => ({
      date: t.date,
      description: t.description,
      amountCents: t.amountCents,
    })),
  });
}

async function wellsFargo(): Promise<void> {
  const opening = 1530075;
  const { txs, closing, deposits, withdrawals } = genChecking(44, {
    count: 26,
    openingCents: opening,
    periodStart: "2026-01-01",
    periodEnd: "2026-01-31",
    depositShare: 0.3,
    checkShare: 0.5,
  });

  const b = await Builder.create();
  b.text(50, 50, "Wells Fargo Bank, N.A.", 12, true);
  b.text(50, 66, "Everyday Checking · wellsfargo.com");
  b.text(50, 90, "Statement period 01/01/2026 - 01/31/2026", 10);
  b.text(380, 90, "Account number: 8842117204", 9);

  b.text(50, 122, "Summary of accounts", 11, true);
  b.rule(138);
  b.text(50, 148, "Beginning balance");
  b.right(545, 148, `$${usFmt(opening)}`);
  b.text(50, 163, "Total deposits");
  b.right(545, 163, `$${usFmt(deposits)}`);
  b.text(50, 178, "Total withdrawals");
  b.right(545, 178, `-$${usFmt(Math.abs(withdrawals))}`);
  b.text(50, 193, "Ending balance");
  b.right(545, 193, `$${usFmt(closing)}`);

  b.text(50, 226, "Transaction history", 11, true);
  b.rule(242);
  b.text(50, 252, "Date", 8, true);
  b.text(95, 252, "Check", 8, true);
  b.text(150, 252, "Description", 8, true);
  b.right(420, 252, "Deposits/Credits", 8, true);
  b.right(490, 252, "Withdrawals/Debits", 8, true);
  b.right(560, 252, "Ending daily balance", 8, true);

  let y = 270;
  for (const t of txs) {
    b.text(50, y, mmdd(t.date));
    if (t.checkNumber) b.text(95, y, t.checkNumber);
    b.text(150, y, t.description);
    if (t.amountCents > 0) b.right(420, y, usFmt(t.amountCents));
    else b.right(490, y, usFmt(Math.abs(t.amountCents)));
    b.right(560, y, usFmt(t.balanceCents));
    y += 15;
  }

  await write("wells-fargo-checking", b, {
    templateId: "wellsfargo-checking-v1",
    currency: "USD",
    periodStart: "2026-01-01",
    periodEnd: "2026-01-31",
    openingBalanceCents: opening,
    closingBalanceCents: closing,
    reconciliationStatus: "verified",
    transactions: txs.map((t) => ({
      date: t.date,
      description: t.description,
      amountCents: t.amountCents,
      balanceCents: t.balanceCents,
      checkNumber: t.checkNumber,
    })),
  });
}

async function citiCard(): Promise<void> {
  const opening = 98012;
  const rng = mulberry32(55);
  const dates = spreadDates(rng, "2025-12-05", "2026-01-04", 18);
  const txs: CardTx[] = [];
  let purchases = 0;
  let credits = 0;
  for (let i = 0; i < 18; i++) {
    const isCredit = i === 4 || i === 11;
    const amount = isCredit ? -cents(rng, 2000, 60000) : cents(rng, 400, 25000);
    if (isCredit) credits += amount;
    else purchases += amount;
    txs.push({
      date: dates[i],
      description: isCredit
        ? i === 4
          ? "ONLINE PAYMENT, THANK YOU"
          : "REFUND QUARRY BOOKS"
        : pick(rng, MERCHANTS),
      amountCents: amount,
    });
  }
  const closing = opening + purchases + credits;

  const b = await Builder.create();
  b.text(50, 50, "Citibank, N.A.", 12, true);
  b.text(50, 66, "Citi Card · citi.com");
  b.text(50, 90, "Billing Period: 12/05/25-01/04/26", 10);
  b.text(380, 90, "Account ending in 5523", 9);

  b.text(50, 122, "Account Summary", 11, true);
  b.rule(138);
  b.text(50, 148, "Previous balance");
  b.right(400, 148, `$${usFmt(opening)}`);
  b.text(50, 163, "Payments and credits");
  b.right(400, 163, `-$${usFmt(Math.abs(credits))}`);
  b.text(50, 178, "Purchases");
  b.right(400, 178, `+$${usFmt(purchases)}`);
  b.text(50, 193, "New balance");
  b.right(400, 193, `$${usFmt(closing)}`);
  b.text(50, 212, "Minimum payment due: $35.00", 9);

  b.text(50, 244, "Account Activity", 11, true);
  b.rule(260);
  b.text(50, 268, "Date", 8, true);
  b.text(120, 268, "Description", 8, true);
  b.right(545, 268, "Amount", 8, true);

  let y = 286;
  for (const t of txs) {
    b.text(50, y, ddmon(t.date));
    b.text(120, y, t.description);
    b.right(545, y, t.amountCents < 0 ? `${usFmt(Math.abs(t.amountCents))} CR` : usFmt(t.amountCents));
    y += 15;
  }

  await write("citi-card", b, {
    templateId: "citi-card-v1",
    currency: "USD",
    periodStart: "2025-12-05",
    periodEnd: "2026-01-04",
    openingBalanceCents: opening,
    closingBalanceCents: closing,
    reconciliationStatus: "verified",
    transactions: txs.map((t) => ({
      date: t.date,
      description: t.description,
      amountCents: t.amountCents,
    })),
  });
}

async function capitalOne(): Promise<void> {
  const opening = 230410;
  const { txs, purchases, payments } = genCard(66, {
    count: 19,
    periodStart: "2025-12-05",
    periodEnd: "2026-01-04",
    paymentCount: 1,
    postDates: true,
  });
  const closing = opening + purchases + payments;

  const b = await Builder.create();
  b.text(50, 50, "Capital One", 12, true);
  b.text(50, 66, "Quicksilver Card · capitalone.com");
  b.text(50, 90, "Dec 5, 2025 - Jan 4, 2026", 10);
  b.text(380, 90, "Account ending in 0042", 9);

  b.text(50, 122, "Payment Information", 11, true);
  b.rule(138);
  b.text(50, 148, "Previous Balance");
  b.right(400, 148, `$${usFmt(opening)}`);
  b.text(50, 163, "Payments and Credits");
  b.right(400, 163, `-$${usFmt(Math.abs(payments))}`);
  b.text(50, 178, "Purchases");
  b.right(400, 178, `+$${usFmt(purchases)}`);
  b.text(50, 193, "New Balance");
  b.right(400, 193, `$${usFmt(closing)}`);

  b.text(50, 226, "Transactions", 11, true);
  b.rule(242);
  b.text(50, 252, "Trans Date", 8, true);
  b.text(120, 252, "Post Date", 8, true);
  b.text(195, 252, "Description", 8, true);
  b.right(545, 252, "Amount", 8, true);

  let y = 270;
  for (const t of txs) {
    b.text(50, y, mmdd(t.date));
    b.text(120, y, mmdd(t.postDate!));
    b.text(195, y, t.description);
    b.right(545, y, usFmt(t.amountCents));
    y += 15;
  }

  await write("capital-one-card", b, {
    templateId: "capitalone-card-v1",
    currency: "USD",
    periodStart: "2025-12-05",
    periodEnd: "2026-01-04",
    openingBalanceCents: opening,
    closingBalanceCents: closing,
    reconciliationStatus: "verified",
    transactions: txs.map((t) => ({
      date: t.date,
      postDate: t.postDate,
      description: t.description,
      amountCents: t.amountCents,
    })),
  });
}

async function amex(): Promise<void> {
  const opening = 210000;
  const { txs, purchases, payments } = genCard(77, {
    count: 23,
    periodStart: "2025-12-15",
    periodEnd: "2026-01-14",
    paymentCount: 1,
  });
  const closing = opening + purchases + payments;

  const b = await Builder.create();
  b.text(50, 50, "American Express", 12, true);
  b.text(50, 66, "Blue Cash Everyday · americanexpress.com");
  b.text(50, 90, "December 15, 2025 to January 14, 2026", 10);
  b.text(380, 90, "Account Ending 41008", 9);
  b.text(50, 106, "Closing Date 01/14/26", 9);

  b.text(50, 138, "Account Summary", 11, true);
  b.rule(154);
  b.text(50, 164, "Previous Balance");
  b.right(400, 164, `$${usFmt(opening)}`);
  b.text(50, 179, "Payments and Credits");
  b.right(400, 179, `-$${usFmt(Math.abs(payments))}`);
  b.text(50, 194, "New Charges");
  b.right(400, 194, `+$${usFmt(purchases)}`);
  b.text(50, 209, "New Balance");
  b.right(400, 209, `$${usFmt(closing)}`);

  b.text(50, 242, "Detail of Charges and Credits", 11, true);
  b.rule(258);
  b.text(50, 268, "Date", 8, true);
  b.text(120, 268, "Description", 8, true);
  b.right(545, 268, "Amount", 8, true);

  let y = 286;
  for (const t of txs) {
    b.text(50, y, mmdd(t.date));
    b.text(120, y, t.description);
    b.right(545, y, usFmt(t.amountCents));
    y += 15;
  }

  await write("amex-card", b, {
    templateId: "amex-card-v1",
    currency: "USD",
    periodStart: "2025-12-15",
    periodEnd: "2026-01-14",
    openingBalanceCents: opening,
    closingBalanceCents: closing,
    reconciliationStatus: "verified",
    transactions: txs.map((t) => ({
      date: t.date,
      description: t.description,
      amountCents: t.amountCents,
    })),
  });
}

async function usBank(pages: "normal" | "perf" = "normal"): Promise<void> {
  const perf = pages === "perf";
  const count = perf ? 4400 : 68;
  const opening = 2204018;
  const { txs, closing, deposits, withdrawals } = genChecking(perf ? 99 : 88, {
    count,
    openingCents: opening,
    periodStart: "2026-01-01",
    periodEnd: "2026-01-31",
    depositShare: 0.35,
  });

  const b = await Builder.create();
  b.text(50, 50, "U.S. Bank National Association", 12, true);
  b.text(50, 66, "Silver Business Checking · usbank.com");
  b.text(50, 90, "Statement Period: 01/01/2026 - 01/31/2026", 10);
  b.text(400, 90, "Account: 1-522-9914-7733", 9);

  b.text(50, 122, "Balance Summary", 11, true);
  b.rule(138);
  b.text(50, 148, "Beginning Balance");
  b.right(420, 148, `$${usFmt(opening)}`);
  b.text(50, 161, "Total Additions");
  b.right(420, 161, `$${usFmt(deposits)}`);
  b.text(50, 174, "Total Subtractions");
  b.right(420, 174, `-$${usFmt(Math.abs(withdrawals))}`);
  b.text(50, 187, "Ending Balance");
  b.right(420, 187, `$${usFmt(closing)}`);

  const header = (y: number) => {
    b.text(50, y, "Date", 7, true);
    b.text(100, y, "Description of Transaction", 7, true);
    b.right(460, y, "Amount", 7, true);
    b.right(545, y, "Balance", 7, true);
  };
  b.text(50, 218, "Transaction Detail", 11, true);
  b.rule(232);
  header(240);

  let y = 254;
  let pageNum = 1;
  const totalPages = perf ? 120 : 3;
  const footer = () => {
    b.text(50, 752, "Member FDIC", 7);
    b.text(500, 766, `Page ${pageNum} of ${totalPages}`, 7);
  };
  for (const t of txs) {
    if (y > 738) {
      footer();
      b.newPage();
      pageNum++;
      b.text(50, 40, "U.S. Bank National Association", 8, true);
      header(64);
      y = 78;
    }
    b.text(50, y, mmdd(t.date), 8);
    b.text(100, y, t.description, 8);
    b.right(460, y, usFmt(t.amountCents), 8);
    b.right(545, y, usFmt(t.balanceCents), 8);
    y += 13;
  }
  footer();

  await write(perf ? "us-bank-120-pages" : "us-bank-checking", b, {
    templateId: "usbank-checking-v1",
    currency: "USD",
    periodStart: "2026-01-01",
    periodEnd: "2026-01-31",
    openingBalanceCents: opening,
    closingBalanceCents: closing,
    reconciliationStatus: "verified",
    transactions: txs.map((t) => ({
      date: t.date,
      description: t.description,
      amountCents: t.amountCents,
      balanceCents: t.balanceCents,
    })),
  });
}

async function paypal(): Promise<void> {
  const opening = 50000;
  const rng = mulberry32(101);
  const dates = spreadDates(rng, "2026-01-01", "2026-01-31", 16);
  interface PpTx extends GoldenTx {
    balanceCents: number;
  }
  const txs: PpTx[] = [];
  let balance = opening;
  for (let i = 0; i < 16; i++) {
    const isFeeBase = i % 4 === 0; // every 4th: a received payment followed by its fee
    const isEur = i === 6 || i === 12;
    if (isFeeBase) {
      const gross = cents(rng, 5000, 90000);
      balance += gross;
      txs.push({
        date: dates[i],
        description: "PAYMENT RECEIVED TIDEWATER MARKET",
        amountCents: gross,
        balanceCents: balance,
        currency: isEur ? "EUR" : undefined,
      });
      const fee = -Math.round(gross * 0.029 + 30);
      balance += fee;
      txs.push({
        date: dates[i],
        description: "FEE FOR RECEIVING PAYMENT",
        amountCents: fee,
        balanceCents: balance,
      });
    } else {
      const amt = -cents(rng, 1000, 40000);
      balance += amt;
      txs.push({
        date: dates[i],
        description: pick(rng, MERCHANTS),
        amountCents: amt,
        balanceCents: balance,
        currency: isEur ? "EUR" : undefined,
      });
    }
  }
  const closing = balance;

  const b = await Builder.create();
  b.text(50, 50, "PayPal", 12, true);
  b.text(50, 66, "Activity report");
  b.text(50, 90, "01/01/2026 - 01/31/2026", 10);
  b.text(380, 90, "Account ID: PP-7741-2208", 9);

  b.text(50, 122, "Summary", 11, true);
  b.rule(138);
  b.text(50, 148, "Beginning balance");
  b.right(480, 148, `$${usFmt(opening)}`);
  b.text(50, 163, "Ending balance");
  b.right(480, 163, `$${usFmt(closing)}`);

  b.text(50, 196, "Activity", 11, true);
  b.rule(212);
  b.text(50, 222, "Date", 8, true);
  b.text(110, 222, "Description", 8, true);
  b.text(360, 222, "Currency", 8, true);
  b.right(480, 222, "Amount", 8, true);
  b.right(560, 222, "Balance", 8, true);

  let y = 240;
  for (const t of txs) {
    b.text(50, y, mmddyy(t.date));
    b.text(110, y, t.description);
    b.text(360, y, t.currency ?? "USD");
    b.right(480, y, usFmt(t.amountCents));
    b.right(560, y, usFmt(t.balanceCents!));
    y += 15;
  }

  await write("paypal-activity", b, {
    templateId: "paypal-activity-v1",
    currency: "USD",
    periodStart: "2026-01-01",
    periodEnd: "2026-01-31",
    openingBalanceCents: opening,
    closingBalanceCents: closing,
    reconciliationStatus: "verified",
    transactions: txs,
  });
}

async function wise(): Promise<void> {
  const opening = 304211;
  const rng = mulberry32(202);
  const dates = spreadDates(rng, "2025-12-01", "2025-12-31", 14);
  const txs: CheckingTx[] = [];
  let balance = opening;
  for (let i = 0; i < 14; i++) {
    const isIn = rng() < 0.3;
    const amt = isIn ? cents(rng, 20000, 300000) : -cents(rng, 1500, 80000);
    balance += amt;
    txs.push({
      date: dates[i],
      description: isIn ? "RECEIVED FROM ACME GMBH" : `CARD PAYMENT ${pick(rng, MERCHANTS)}`,
      amountCents: amt,
      balanceCents: balance,
    });
  }
  const closing = balance;

  const b = await Builder.create();
  b.text(50, 50, "Wise Payments Limited", 12, true);
  b.text(50, 66, "EUR statement");
  b.text(50, 90, "1 December 2025 to 31 December 2025", 10);
  b.text(380, 90, "IBAN: BE12 3456 7890 1234", 9);

  b.text(50, 122, "Summary", 11, true);
  b.rule(138);
  b.text(50, 148, "Opening balance");
  b.right(480, 148, euFmt(opening));
  b.text(50, 163, "Closing balance");
  b.right(480, 163, euFmt(closing));

  b.text(50, 196, "Transactions", 11, true);
  b.rule(212);
  b.text(50, 222, "Date", 8, true);
  b.text(140, 222, "Description", 8, true);
  b.right(480, 222, "Amount (EUR)", 8, true);
  b.right(560, 222, "Balance (EUR)", 8, true);

  let y = 240;
  for (const t of txs) {
    b.text(50, y, t.date);
    b.text(140, y, t.description);
    b.right(480, y, euFmt(t.amountCents));
    b.right(560, y, euFmt(t.balanceCents));
    y += 15;
  }

  await write("wise-statement", b, {
    templateId: "wise-v1",
    currency: "EUR",
    periodStart: "2025-12-01",
    periodEnd: "2025-12-31",
    openingBalanceCents: opening,
    closingBalanceCents: closing,
    reconciliationStatus: "verified",
    transactions: txs.map((t) => ({
      date: t.date,
      description: t.description,
      amountCents: t.amountCents,
      balanceCents: t.balanceCents,
    })),
  });
}

/* ─────────────────────────── adversarial fixtures ─────────────────────────── */

async function scanned(): Promise<void> {
  const b = await Builder.create();
  // Image-only pages: rectangles standing in for a scanned bitmap.
  for (let p = 0; p < 2; p++) {
    if (p > 0) b.newPage();
    for (let i = 0; i < 30; i++) {
      b.page.drawRectangle({
        x: 50,
        y: 700 - i * 20,
        width: 400 + (i % 5) * 20,
        height: 8,
        color: rgb(0.75, 0.75, 0.78),
      });
    }
  }
  await write("scanned", b, null);
}

async function nonStatement(): Promise<void> {
  const b = await Builder.create();
  b.text(50, 50, "Roasted Vegetable Soup", 16, true);
  b.text(50, 90, "A warming weeknight recipe for four.", 10);
  const lines = [
    "Ingredients:",
    "2 carrots, chopped",
    "1 onion, diced",
    "3 cloves garlic",
    "1 can crushed tomatoes",
    "4 cups vegetable stock",
    "Method:",
    "Roast the vegetables at 425F for 25 minutes.",
    "Simmer with stock for 15 minutes, then blend.",
    "Season to taste and serve with crusty bread.",
  ];
  lines.forEach((l, i) => b.text(50, 120 + i * 16, l, 10));
  await write("non-statement", b, null);
}

async function multiAccount(): Promise<void> {
  const openingA = 510000;
  const a = genChecking(301, {
    count: 14,
    openingCents: openingA,
    periodStart: "2026-01-01",
    periodEnd: "2026-01-31",
    depositShare: 0.3,
  });
  const openingB = 1200000;
  const bGen = genChecking(302, {
    count: 8,
    openingCents: openingB,
    periodStart: "2026-01-01",
    periodEnd: "2026-01-31",
    depositShare: 0.5,
  });

  const b = await Builder.create();
  b.text(50, 50, "JPMorgan Chase Bank, N.A.", 12, true);
  b.text(50, 66, "Combined Statement");
  b.text(50, 90, "January 1, 2026 through January 31, 2026", 10);

  const section = (
    title: string,
    accountLine: string,
    yStart: number,
    txs: CheckingTx[],
    opening: number,
    closing: number,
  ): number => {
    let y = yStart;
    b.text(50, y, title, 11, true);
    b.text(300, y, accountLine, 9);
    b.rule(y + 14);
    y += 22;
    b.text(50, y, "Beginning Balance");
    b.right(545, y, `$${usFmt(opening)}`);
    y += 16;
    b.text(50, y, "DATE", 8, true);
    b.text(100, y, "DESCRIPTION", 8, true);
    b.right(460, y, "AMOUNT", 8, true);
    b.right(545, y, "BALANCE", 8, true);
    y += 15;
    for (const t of txs) {
      b.text(50, y, mmdd(t.date));
      b.text(100, y, t.description);
      b.right(460, y, usFmt(t.amountCents));
      b.right(545, y, usFmt(t.balanceCents));
      y += 14;
    }
    b.text(50, y, "Ending Balance");
    b.right(545, y, `$${usFmt(closing)}`);
    return y + 34;
  };

  const y = section("CHECKING", "Account Number: ...7204", 124, a.txs, openingA, a.closing);
  section("SAVINGS", "Account Number: ...8166", y, bGen.txs, openingB, bGen.closing);

  const goldenFor = (
    txs: CheckingTx[],
    opening: number,
    closing: number,
  ): Golden => ({
    templateId: "chase-checking-v1",
    currency: "USD",
    periodStart: "2026-01-01",
    periodEnd: "2026-01-31",
    openingBalanceCents: opening,
    closingBalanceCents: closing,
    reconciliationStatus: "verified",
    transactions: txs.map((t) => ({
      date: t.date,
      description: t.description,
      amountCents: t.amountCents,
      balanceCents: t.balanceCents,
    })),
  });

  await write("multi-account", b, [
    goldenFor(a.txs, openingA, a.closing),
    goldenFor(bGen.txs, openingB, bGen.closing),
  ]);
}

/* ─────────────────────────── main ─────────────────────────── */

async function main(): Promise<void> {
  await chaseChecking();
  await chaseCard();
  await boaChecking();
  await wellsFargo();
  await citiCard();
  await capitalOne();
  await amex();
  await usBank("normal");
  await usBank("perf");
  await paypal();
  await wise();
  await scanned();
  await nonStatement();
  await multiAccount();
  console.log("All fixtures generated.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
