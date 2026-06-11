import type { Guide } from "./types";

export const GUIDE_QBO: Guide = {
  slug: "import-bank-statements-into-quickbooks-online",
  title: "How to import bank statements into QuickBooks Online (every method, compared)",
  description:
    "Bank feeds, CSV upload, and QBO Web Connect files — when to use each, exact click paths, the 90-day problem, and how to backfill years of history without duplicates.",
  minutes: 9,
  updated: "2026-06-11",
  sections: [
    {
      heading: "The three ways transactions get into QuickBooks Online",
      paragraphs: [
        "QuickBooks Online ingests bank data through three doors: a live bank feed (Intuit connects to your bank and pulls transactions automatically), a manual file upload (CSV or a Web Connect .qbo file), or manual entry. Manual entry is a last resort measured in evenings lost; the real decision is between the feed and file uploads, and the right answer depends on how far back you need to go and whether the account is still open.",
        "Bank feeds are the default for ongoing bookkeeping: connect once, transactions arrive daily, rules categorize them. But feeds have two hard limits that surprise people at the worst time. First, history: most banks hand Intuit only the last 90 days at connection time. Second, scope: the account must be open and the bank must support a connection at all. New bookkeeping clients arrive with a year of history; loans close accounts; small banks and some fintechs simply aren't connectable. That's where files come in.",
      ],
    },
    {
      heading: "Method 1 — Bank feed (for ongoing months)",
      paragraphs: [
        "In QuickBooks Online: Transactions → Bank transactions → Link account. Search for the bank, sign in with the bank's credentials, choose the accounts, and pick the QuickBooks account each one maps to. Transactions land in the For Review tab, where bank rules and your approvals move them into the register.",
        "Use the feed for everything from today forward. Just don't expect it to solve history: if you connected in June, January through March aren't coming through the feed, ever. Backfill those with files (method 2 or 3), and the deduplication behavior described below makes the seam invisible.",
      ],
    },
    {
      heading: "Method 2 — CSV upload (flexible, but you do the mapping)",
      paragraphs: [
        "QuickBooks Online accepts CSV uploads at Transactions → Bank transactions → the dropdown next to Link account → Upload from file. The CSV needs either three columns (Date, Description, Amount) or four (Date, Description, Credit, Debit). During import you map your columns to QuickBooks fields and confirm the date format.",
        "CSV quality is everything here. Three failure modes account for nearly all bad CSV imports: dates in a format the importer reads as the wrong field order (06/01 vs 01/06), amounts as text because they carry currency symbols or parentheses-negatives, and multi-line descriptions that split one transaction across two rows. If your CSV came from a PDF via copy-paste, expect all three at once.",
        "If your statement only exists as a PDF, convert it properly instead of copy-pasting: StatementClear parses the PDF in your browser, reconciles the result against the statement's own opening and closing balances so you know the rows are complete, and exports a CSV in exactly the shape QuickBooks expects — signed single amount column or separate debit/credit columns, your choice of date format.",
      ],
    },
    {
      heading: "Method 3 — QBO Web Connect files (the cleanest backfill)",
      paragraphs: [
        "A .qbo file is QuickBooks' native import format — the same structure bank feeds use under the hood. Upload it through the same Upload from file path, and QuickBooks treats the transactions like feed transactions: they carry bank-assigned IDs (FITIDs), so QuickBooks can recognize duplicates exactly instead of guessing by date and amount the way it must with CSV.",
        "That FITID behavior is the reason QBO files are the best backfill format. Import January–May as .qbo files, then connect the live feed: where the file and the feed overlap, QuickBooks skips what it has already seen. No double-booked rent, no manual exclusion pass.",
        "Getting a .qbo file when your bank doesn't offer one: StatementClear converts any digital statement PDF to a spec-correct QBO file — deterministic FITIDs (re-importing the same file never duplicates), CHECK transaction types with check numbers where the statement prints them, and payee names truncated to the OFX limit with the remainder preserved in the memo field.",
      ],
    },
    {
      heading: "Backfilling a year of history, start to finish",
      paragraphs: [
        "The reliable sequence for a new client or a new QuickBooks file:",
      ],
      list: [
        "Collect statement PDFs for every month of the backfill period — download them from the bank while you have access (statement archives disappear when accounts close).",
        "Convert each PDF and check its reconciliation result: opening + transactions = closing, to the cent. Fix any flagged rows in the preview before exporting — sixty seconds now beats an unbalanced ledger in April.",
        "Export QBO files (or CSV if you prefer to review in a spreadsheet first) and upload them oldest month first, mapping each to the right QuickBooks bank account.",
        "Connect the live bank feed last. Overlapping transactions are skipped by FITID.",
        "Verify in QuickBooks: the account register's ending balance for each month should equal the statement's closing balance. If a month is off, you'll know which one — and the converter already told you it reconciled, so look for a duplicate or a manually entered transaction.",
      ],
      ordered: true,
    },
    {
      heading: "Common errors and what they actually mean",
      paragraphs: [],
      list: [
        "“We can't import this file” on a .qbo upload usually means INTU.BID validation — QuickBooks checks the bank ID inside the file against institutions it recognizes. Set your bank's BID in StatementClear's advanced export settings, or see our dedicated guide on QBO import failures.",
        "A CSV that imports with wrong signs (deposits negative) means the source used parentheses or debit-column conventions the importer didn't read. Re-export with a single signed amount column.",
        "Transactions missing after a 'successful' import almost always means QuickBooks deduplicated them — they were already in the register from a feed or earlier file. Check the register before re-importing.",
        "Dates shifted by one day across the board usually indicates a timezone-naive source file; statement-derived files from StatementClear carry plain dates and don't have this problem.",
      ],
    },
    {
      heading: "One habit that prevents most of this",
      paragraphs: [
        "Reconcile before you import, not after. A statement is self-checking — opening balance plus transactions equals closing balance — and verifying that equation before the data touches QuickBooks means import problems are import problems, not data problems. StatementClear runs that verification on every file and shows the result; make the green banner your gate for letting a file anywhere near the books.",
      ],
    },
  ],
};
