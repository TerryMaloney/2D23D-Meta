import type { Guide } from "./types";

export const GUIDE_EXCEL: Guide = {
  slug: "convert-bank-statements-to-excel-for-analysis",
  title: "Converting bank statements to Excel for analysis (without retyping anything)",
  description:
    "From statement PDF to pivot table: getting typed data out of statements, the formulas that matter for cash-flow analysis, and the mistakes that silently corrupt the numbers.",
  minutes: 8,
  updated: "2026-06-11",
  sections: [
    {
      heading: "The goal: typed data, not text that looks like data",
      paragraphs: [
        "Every useful statement analysis — monthly spending by category, payee totals, cash-flow trends, loan-application summaries — starts from the same foundation: one row per transaction with a real date cell, a real numeric amount, and a clean description. Most attempts die at this step, because the statement is a PDF and the obvious extraction methods produce text that merely resembles data.",
        "Copy-paste from a PDF gives you dates Excel reads as text, amounts like “(1,234.56)” that SUM() ignores, and descriptions broken across rows wherever the statement wrapped a line. Excel's own 'Get Data from PDF' does better on simple tables but still hands you text columns to convert, mangles multi-line descriptions, and offers no way to know whether it caught every row.",
        "That last point deserves emphasis: missing rows are the silent killer. A spending analysis that's missing one paycheck or one rent payment doesn't look wrong — it just is wrong. You need a completeness check, and statements happen to ship with one built in.",
      ],
    },
    {
      heading: "Use the statement's own math as your completeness check",
      paragraphs: [
        "Opening balance + every transaction = closing balance. Both balances are printed on the statement, so a parse that captured every row and every sign will reconcile to the cent — and a parse that missed anything won't. This is the check StatementClear runs automatically on every file: it parses the PDF in your browser, chains the running balance through every row where the statement prints one, and shows a green verified banner only when the equation holds.",
        "Converting with that verification changes the character of the analysis that follows. Pivot tables built on verified data are answers; pivot tables built on maybe-complete data are hypotheses.",
      ],
    },
    {
      heading: "Getting the spreadsheet (two minutes)",
      paragraphs: [],
      list: [
        "Download the statement PDF from your bank (digital PDF, not a scan).",
        "Drop it into the converter and wait for the reconciliation banner — fix any flagged rows in the preview (the fix is usually one click; the implied amount comes from the balance column).",
        "Export XLSX. Dates arrive as date cells with a date format, amounts as numbers with an accounting format (negatives in red), header row frozen, reconciliation summary appended below the data.",
        "Repeat per month and paste months together, or keep one file per month — both work; the per-month reconciliation summaries make either auditable.",
      ],
      ordered: true,
    },
    {
      heading: "The analysis layer: formulas that earn their keep",
      paragraphs: [
        "With typed data, a handful of constructs cover most real questions:",
      ],
      list: [
        "Month bucketing: add a column =EOMONTH(A2,0) (or =TEXT(A2,\"YYYY-MM\")) and every monthly pivot becomes trivial.",
        "Category by keyword: =IFS(ISNUMBER(SEARCH(\"GROCERY\",C2)),\"Groceries\", ISNUMBER(SEARCH(\"FUEL\",C2)),\"Transport\", TRUE,\"Other\") — crude, fast, and surprisingly durable since bank descriptors are stable. Maintain the keyword list in its own sheet with XLOOKUP for anything serious.",
        "Money in vs money out: =SUMIF(D:D,\">0\") and =SUMIF(D:D,\"<0\") give the period's gross flows — the numbers lenders and landlords actually ask about.",
        "Recurring-payment detection: pivot on description, filter to count ≥ 3, sort by total. Subscriptions you forgot about appear immediately.",
        "Running balance audit: if you kept the balance column, =D3+E2=E3 down the sheet re-verifies the chain inside Excel — belt and suspenders after any manual edits.",
      ],
    },
    {
      heading: "Mistakes that corrupt statement analyses",
      paragraphs: [],
      list: [
        "Netting transfers: moving $2,000 to savings isn't spending, but it shows as money out of checking. Tag inter-account transfers (SEARCH for \"TRANSFER\" plus your account numbers) and exclude them from spending pivots — while keeping them for cash-flow views.",
        "Double-counting card payments: if you analyze both the checking account and the credit card, the card payment appears in both. Count card purchases on the card side and exclude the payment row, or vice versa — never both.",
        "Trusting parentheses: if any amounts in your sheet are text like \"(45.00)\", every SUM that touches them is silently low. Typed exports avoid this class of bug entirely; =COUNTIF(D:D,\"*(*\") is a quick audit if data came from elsewhere.",
        "Ignoring the statement period: statements rarely align to calendar months perfectly (cycles ending the 14th, year-end splits). Bucket by transaction date, not by which statement a row came from.",
      ],
    },
    {
      heading: "Privacy note for sensitive analyses",
      paragraphs: [
        "Statement analysis frequently happens at sensitive moments — divorce financials, loan applications, business due diligence, expense disputes. Uploading statements to a cloud converter adds a third party to that moment. StatementClear's parsing runs entirely in your browser: the PDF never leaves your machine on its way to becoming your spreadsheet, which you can verify in the Network tab of your browser's DevTools while it runs. The same applies to the Excel file you export — it's generated locally too.",
      ],
    },
  ],
};
