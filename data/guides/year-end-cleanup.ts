import type { Guide } from "./types";

export const GUIDE_YEAR_END: Guide = {
  slug: "year-end-bookkeeping-cleanup-workflow",
  title: "The year-end bookkeeping cleanup workflow (statements-first method)",
  description:
    "A practical December-to-filing workflow for small businesses and their bookkeepers: gather statements, verify completeness month by month, fill the gaps, and hand the accountant books that tie to the bank.",
  minutes: 9,
  updated: "2026-06-11",
  sections: [
    {
      heading: "Why statements-first beats books-first",
      paragraphs: [
        "Every January, the same scene: a year of bookkeeping that's 80% done, a tax deadline, and no one sure which 20% is missing. The instinct is to start from the books — scroll the ledger looking for gaps. The faster method inverts it: start from the bank statements, because statements are complete by construction. Every dollar that moved is on them, with the bank's own opening/closing math proving each month whole.",
        "The statements-first workflow: establish the spine (every account, every month, verified), diff the spine against the books, and fix only what the diff surfaces. It turns 'clean up the year' from an archaeology project into a checklist.",
      ],
    },
    {
      heading: "Step 1 — Build the statement spine (one evening)",
      paragraphs: [
        "List every account money moved through this year: checking, savings, every credit card, PayPal/Square/Stripe if you take payments, loan accounts. The forgotten card with three transactions causes disproportionate accountant email in March — list it.",
        "Download all twelve statement PDFs for each account, now, even for months you believe are already booked. Two reasons: closed accounts drop archive access (download everything before closing anything), and you want the PDFs as the audit trail regardless. File them as Account/YYYY-MM.pdf and the spine is built.",
      ],
    },
    {
      heading: "Step 2 — Verify each month actually parses and balances",
      paragraphs: [
        "Convert each statement and watch its reconciliation result. StatementClear checks opening + transactions = closing to the cent (plus the running balance after every row where the statement prints one) and shows the result per file, in your browser, without the statements uploading anywhere — which matters when the statements are a client's.",
        "This step is cheap insurance against the two errors that poison year-end work: missed rows (a page that didn't parse, a transaction lost in a copy-paste) and sign errors (parentheses-negatives read as positives). A green banner per month means the spine is mathematically complete; an amber or red one points at exactly the rows to review, with one-click fixes where the balance column implies the correct amount.",
      ],
    },
    {
      heading: "Step 3 — Diff the spine against the books",
      paragraphs: [
        "Month by month, compare three numbers between the verified statement data and your accounting file: ending balance, total money in, total money out. Where all three match, that month is done — move on without opening it. Where they don't, you've localized a problem to one account-month, which is the whole trick.",
        "Inside a mismatched month, the usual suspects, in order of frequency: a missing deposit or fee (the books are short), a duplicate (the books are long — often a feed transaction plus a manual entry of the same expense), a transfer booked as income or expense instead of a transfer, and a card payment double-counted on both the card and the checking side.",
      ],
    },
    {
      heading: "Step 4 — Fill the gaps without creating duplicates",
      paragraphs: [
        "For months missing entirely from the books, import the converted data rather than re-keying: QBO files into QuickBooks (deterministic transaction IDs mean an overlapping import doesn't double-book), OFX or Xero-layout CSV into Xero. Import oldest-first; reconcile each month in the accounting tool as you go so errors can't compound forward.",
        "For months that exist but disagree, fix surgically — add the missing transaction, delete the duplicate, recategorize the transfer. Resist wholesale re-imports of months that are 95% right; targeted fixes preserve the categorization work already done.",
      ],
    },
    {
      heading: "Step 5 — The handoff package your accountant actually wants",
      paragraphs: [],
      list: [
        "The statement PDFs, filed by account and month (the source of truth).",
        "Books whose every bank and card account ties to the statement closing balances at year-end — that single property eliminates most back-and-forth.",
        "A short exceptions memo: accounts opened/closed, large one-off transactions, owner draws/contributions, anything you categorized with less than full confidence.",
        "If the accountant works in spreadsheets: the verified Excel exports, one per account, with their built-in reconciliation summaries — each file documents its own completeness.",
      ],
    },
    {
      heading: "Special cases worth knowing about",
      paragraphs: [],
      list: [
        "Year-end statement splits: a cycle ending January 14th contains December transactions. Book by transaction date; year-inference in conversion handles the December→January dates correctly, but your accrual cutoff is a books decision, not a conversion one.",
        "Payment processors: PayPal/Stripe statements list gross payments and fees as separate lines. Keep them separate in the books — netting them understates both revenue and expenses, which auditors and lenders notice.",
        "Multi-currency accounts (Wise, Revolut): one statement per currency, one verified conversion per statement, one accounting bank account per currency. Don't merge currencies in a spreadsheet — exchange-rate noise will make the books untieable.",
        "Cash-heavy businesses: statements can't see cash, but they bracket it — deposits on the statement versus recorded cash sales give the accountant the reconciliation they'll ask for anyway.",
      ],
    },
    {
      heading: "Make next January boring",
      paragraphs: [
        "The entire cleanup above exists because verification happened twelve months late. The durable fix costs five minutes a month: when the statement lands, convert it, confirm the green banner, check the three numbers against the books, file the PDF. Monthly verification turns year-end from a project into a formality — and the tooling for the five-minute version is the same tooling you just used for the rescue.",
      ],
    },
  ],
};
