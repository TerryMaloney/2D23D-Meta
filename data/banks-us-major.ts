import type { BankEntry } from "./banks-types";

/** Major US banks and national card issuers. */
export const US_MAJOR: BankEntry[] = [
  {
    slug: "chase",
    name: "Chase",
    kind: "bank",
    region: "US",
    hasTemplate: true,
    downloadSteps: [
      "Sign in at chase.com (or the Chase app).",
      "Open the account, then choose Statements & documents.",
      "Pick the statement month and download the PDF.",
    ],
    nativeExports:
      "Chase's activity download offers CSV, QFX (Quicken), QBO (QuickBooks), and OFX — but only for recent activity on open accounts, selected from the activity screen, not from statements.",
    gap: "Anything that exists only as a statement PDF — older months, closed accounts, or statements a client or borrower emailed you — has no native export. That PDF is exactly what this converter reads.",
    quirks: [
      "The TRANSACTION DETAIL table includes a running balance column, which lets the parser verify every single row against the printed balance — Chase statements typically reconcile with the strongest possible check.",
      "Descriptions often wrap to a second line (web payment references, transfer IDs); the parser merges those continuation lines into the transaction.",
      "Combined statements covering checking + savings are split into one output file per account.",
      "Transaction dates print as MM/DD without a year; the year is inferred from the statement period, including December→January statements.",
    ],
    faq: [
      {
        q: "Can I convert old Chase statements after closing my account?",
        a: "Yes — if you saved the PDFs. Chase's online export only covers open accounts, but the converter reads any digital Chase statement PDF regardless of account status. (Tip: download all statement history before closing an account.)",
      },
      {
        q: "Does this work with Chase business (Chase for Business) statements?",
        a: "Yes. Business checking statements use the same TRANSACTION DETAIL layout with a running balance, which reconciles row by row.",
      },
      {
        q: "Why convert a Chase PDF when Chase offers QBO downloads?",
        a: "Chase's QBO export covers a limited window of recent activity. Statement PDFs are the permanent record — for year-end books, loan files, or audits, the PDF is usually all anyone has.",
      },
    ],
  },
  {
    slug: "bank-of-america",
    name: "Bank of America",
    kind: "bank",
    region: "US",
    hasTemplate: true,
    downloadSteps: [
      "Log in at bankofamerica.com.",
      "Select the account, then open the Statements & Documents tab.",
      "Choose the statement month and download the PDF.",
    ],
    nativeExports:
      "The transaction download on open accounts offers CSV, QBO, QFX, and TXT for recent activity. Statement archives are PDF only.",
    gap: "Bank of America statements list deposits and withdrawals in separate sections rather than one table — fine to read, painful to retype. The converter rebuilds them into a single signed transaction list and proves the math.",
    quirks: [
      "Transactions are grouped into “Deposits and other additions” and “Withdrawals and other subtractions” sections, each with its own subtotal; the parser assigns signs from the section and cross-checks both subtotals.",
      "There is no running balance column on most BofA personal statements, so reconciliation relies on the opening/closing balance equation and the printed section totals — three independent checks.",
      "Dates print as MM/DD/YY inside sections.",
      "Card-image and disclosure pages at the end of statements are recognized as furniture and skipped.",
    ],
    faq: [
      {
        q: "Why are deposits and withdrawals in different sections of my output?",
        a: "They aren't — the converter merges Bank of America's separate sections back into one chronological list with proper signs, which is what bookkeeping tools expect.",
      },
      {
        q: "Do Bank of America business statements work?",
        a: "Yes. Business Advantage statements use the same sectioned layout with subtotals, which the parser uses as additional verification.",
      },
    ],
  },
  {
    slug: "wells-fargo",
    name: "Wells Fargo",
    kind: "bank",
    region: "US",
    hasTemplate: true,
    downloadSteps: [
      "Sign on at wellsfargo.com.",
      "Open Statements & Documents (under Accounts).",
      "Select the account and statement period, then download the PDF.",
    ],
    nativeExports:
      "Wells Fargo offers comma-delimited (CSV) and Quicken/QuickBooks downloads for recent activity on open accounts.",
    gap: "The Transaction history table on Wells Fargo statements has five interleaved columns — check number, deposits, withdrawals, and a daily balance — that spreadsheet copy-paste mangles badly. The converter reads the columns positionally.",
    quirks: [
      "Statements use separate Deposits/Credits and Withdrawals/Debits columns: the sign of each transaction comes from which column the amount sits in, and the daily balance column verifies it.",
      "A dedicated check-number column is detected and carried into exports (QBO files get proper CHECKNUM fields).",
      "The “Ending daily balance” only prints on the last transaction of each day; the parser's balance chain handles the gaps.",
    ],
    faq: [
      {
        q: "Are check numbers preserved?",
        a: "Yes. Wells Fargo's check column is detected automatically, shown in the preview, and exported — including as CHECKNUM in QBO/QFX/OFX files, which QuickBooks uses for check matching.",
      },
      {
        q: "My Wells Fargo statement has a daily balance, not a per-row balance. Does reconciliation still work?",
        a: "Yes. The parser chains balances across the rows between balance checkpoints, so every day's printed balance still verifies the rows that precede it.",
      },
    ],
  },
  {
    slug: "citi",
    name: "Citi",
    kind: "credit-card",
    region: "US",
    hasTemplate: true,
    downloadSteps: [
      "Sign on at citi.com (or the Citi mobile app).",
      "Open Statements & Documents.",
      "Choose the statement period and download the PDF.",
    ],
    nativeExports:
      "Citi card activity can be exported as CSV for recent periods from the activity view.",
    gap: "Citi card statements use day-month dates (28 DEC) and mark credits with a trailing CR — two details that break naive PDF-to-spreadsheet tools and produce wrong signs. The converter handles both.",
    quirks: [
      "Dates print as DD MMM (e.g., “28 DEC”) without a year; the year comes from the billing period, including December→January cycles.",
      "Payments and refunds carry a trailing CR marker instead of a minus sign; the parser reads CR as a credit to the card and signs it correctly.",
      "Reconciliation uses the printed Previous balance → New balance equation plus the Purchases and Payments-and-credits summary totals.",
    ],
    faq: [
      {
        q: "Why do my Citi refunds show as negative amounts?",
        a: "On a card statement, purchases increase what you owe and credits (CR) reduce it. The converter keeps that convention — purchases positive, payments and refunds negative — so opening + transactions = closing balance holds. Exporting to QBO can flip signs if your accounting tool expects the opposite.",
      },
      {
        q: "Does this work for Citibank checking statements too?",
        a: "Yes — checking statements go through the generic parser with full reconciliation. The dedicated template targets Citi's card layout, which is the one with the unusual date and CR conventions.",
      },
    ],
  },
  {
    slug: "capital-one",
    name: "Capital One",
    kind: "credit-card",
    region: "US",
    hasTemplate: true,
    downloadSteps: [
      "Sign in at capitalone.com.",
      "Choose the card or account, then View Statements.",
      "Pick the statement period and download the PDF.",
    ],
    nativeExports:
      "Capital One offers CSV downloads of recent transactions from the account activity page.",
    gap: "Capital One card statements print two dates per row — transaction date and post date. Generic converters read them as two transactions or merge them into garbage; this parser knows the pair.",
    quirks: [
      "Each row carries a transaction date and a posting date; both are parsed, exported, and available as separate columns.",
      "Payments print with explicit minus signs while purchases are unsigned; the card convention (purchases positive) is applied and verified against the Previous balance → New balance equation.",
    ],
    faq: [
      {
        q: "Which date does the export use?",
        a: "Both are preserved. CSV and Excel exports include transaction and post date columns; QBO/OFX uses the transaction date for DTPOSTED (the date your books usually want).",
      },
      {
        q: "Do Capital One 360 checking statements work?",
        a: "Yes, via the generic parser with running-balance verification. The dedicated template covers the credit-card layout with its two-date rows.",
      },
    ],
  },
  {
    slug: "us-bank",
    name: "U.S. Bank",
    kind: "bank",
    region: "US",
    hasTemplate: true,
    downloadSteps: [
      "Log in at usbank.com.",
      "Open the account, then choose Statements & documents.",
      "Select the period and download the PDF.",
    ],
    nativeExports:
      "Recent activity can be downloaded as CSV/Quicken formats from online banking on open accounts.",
    gap: "U.S. Bank statements pack dense rows and break transaction lists across pages mid-table. The converter strips the repeated page headers and reads straight through the page break.",
    quirks: [
      "Dense small-type rows with a running balance column — every row is verified against the printed balance.",
      "Multi-page transaction tables repeat column headers on each page; those repeats are detected as page furniture and removed.",
      "Balance Summary block (Beginning Balance, Total Additions, Total Subtractions, Ending Balance) gives reconciliation three printed totals to check against.",
    ],
    faq: [
      {
        q: "My statement is 14 pages — will it convert?",
        a: "Yes. The parser is tested on a 120-page statement and reads page-broken tables continuously. Long statements take a few seconds, all on your device.",
      },
    ],
  },
  {
    slug: "pnc",
    name: "PNC",
    kind: "bank",
    region: "US",
    downloadSteps: [
      "Sign on at pnc.com.",
      "Open the account, then Online Statements.",
      "Choose the statement month and download the PDF.",
    ],
    nativeExports:
      "PNC online banking can export recent activity to CSV and personal-finance formats on open accounts.",
    gap: "PNC Virtual Wallet statements split activity into sections (deposits, banking/debit card withdrawals, online and electronic deductions) and include a daily-balance detail table that trips up naive converters — it looks like more transactions but isn't.",
    quirks: [
      "Activity is sectioned by type with section subtotals; signs are assigned per section and checked against the subtotals.",
      "The Daily Balance Detail table at the end is recognized as a balance table, not transactions, and excluded from the output.",
      "Virtual Wallet products (Spend / Reserve / Growth) arrive as combined statements; each account section is parsed separately.",
    ],
    faq: [
      {
        q: "Why doesn't my export include the Daily Balance Detail rows?",
        a: "Those rows are balances per day, not transactions. Including them would double-count your activity, so the parser identifies and skips that table — and uses it to verify the rows it did parse.",
      },
    ],
  },
  {
    slug: "truist",
    name: "Truist",
    kind: "bank",
    region: "US",
    downloadSteps: [
      "Sign in at truist.com.",
      "Select the account, then open Statements.",
      "Choose the statement period and download the PDF.",
    ],
    nativeExports: "Truist offers CSV/Quicken-style downloads of recent activity on open accounts.",
    gap: "Truist statement layouts have gone through several revisions since the BB&T/SunTrust merger; the same customer can hold PDFs in more than one format. The reconciliation check tells you immediately, per file, whether the parse is right.",
    quirks: [
      "Post-merger statements exist in multiple layout generations; the generic parser scores each file independently rather than assuming one fixed format.",
      "Most layouts list deposits and withdrawals in separate sections with subtotals, which the parser uses for sign assignment and verification.",
    ],
    faq: [
      {
        q: "My older BB&T or SunTrust statements look different. Will they convert?",
        a: "Usually yes — the generic parser handles both legacy layouts, and reconciliation verifies each file against its own printed balances. If one fails, the built-in reporter sends us the anonymized layout and we add a template.",
      },
    ],
  },
  {
    slug: "td-bank",
    name: "TD Bank",
    kind: "bank",
    region: "US",
    downloadSteps: [
      "Log in at td.com (TD Bank, America's Most Convenient Bank).",
      "Open the account, then Statements & Documents.",
      "Pick the month and download the PDF.",
    ],
    nativeExports: "Recent activity downloads in CSV and personal-finance formats on open accounts.",
    gap: "TD statements group activity under DAILY ACCOUNT ACTIVITY with deposits and electronic payments in separate subsections; point-of-sale descriptions run long and wrap. The converter merges wrapped lines and signs by section.",
    quirks: [
      "Sectioned subsections (Deposits, Electronic Deposits, Checks Paid, Electronic Payments…) each with subtotals used for verification.",
      "Long debit-card descriptions wrap to continuation lines, which the parser folds into the transaction.",
      "Checks Paid sections include check numbers, carried through to exports.",
    ],
    faq: [
      {
        q: "Is this for TD Bank (US) or TD Canada Trust?",
        a: "This page covers TD Bank, N.A. (US). TD Canada Trust statements have their own page and parse with Canadian date and layout conventions.",
      },
    ],
  },
  {
    slug: "fifth-third",
    name: "Fifth Third Bank",
    kind: "bank",
    region: "US",
    downloadSteps: [
      "Log in at 53.com.",
      "Open the account, then choose Statements.",
      "Select the period and download the PDF.",
    ],
    nativeExports: "Recent-activity CSV downloads are available in online banking for open accounts.",
    gap: "Fifth Third statements list withdrawals with trailing-minus or sectioned formatting depending on product generation; the parser's amount detector reads both, and reconciliation confirms which applied.",
    quirks: [
      "Deposit and withdrawal sections with subtotals on consumer statements; sign comes from the section.",
      "Some business layouts print a running balance, enabling row-by-row verification.",
    ],
    faq: [
      {
        q: "Do Fifth Third business statements reconcile?",
        a: "Yes — layouts with a running balance verify every row; sectioned layouts verify against section subtotals and the opening/closing equation.",
      },
    ],
  },
  {
    slug: "citizens",
    name: "Citizens Bank",
    kind: "bank",
    region: "US",
    downloadSteps: [
      "Log in at citizensbank.com.",
      "Select the account, then Statements & Documents.",
      "Pick the month and download the PDF.",
    ],
    nativeExports: "CSV/Quicken downloads of recent transactions on open accounts.",
    gap: "Citizens statements use a date / description / amount / balance table; the running balance lets the converter verify every row, which copy-paste workflows simply can't.",
    quirks: [
      "Running balance column on most checking layouts — strongest reconciliation mode.",
      "Pending/disclosure pages at statement end are recognized and skipped.",
    ],
    faq: [
      {
        q: "How accurate is conversion for Citizens statements?",
        a: "Layouts with a running balance verify mathematically on every row. If even one row failed to parse, the balance chain breaks visibly and the row is flagged — accuracy is demonstrated per file, not claimed.",
      },
    ],
  },
  {
    slug: "keybank",
    name: "KeyBank",
    kind: "bank",
    region: "US",
    downloadSteps: [
      "Sign on at key.com.",
      "Open the account, then Statements.",
      "Choose the statement and download the PDF.",
    ],
    nativeExports: "Recent activity exports to CSV from online banking on open accounts.",
    gap: "KeyBank statements separate additions and subtractions with subtotal lines; the converter signs by section, merges wrapped descriptions, and verifies against the subtotals.",
    quirks: [
      "Sectioned additions/subtractions with subtotals used as printed-total checks.",
      "Statement-period phrasing varies by product; the period detector reads multiple formats for year inference.",
    ],
    faq: [
      {
        q: "Will year-end KeyBank statements get the right years?",
        a: "Yes. Rows print without years; the parser takes the year from the statement period and handles December→January statements correctly.",
      },
    ],
  },
  {
    slug: "regions",
    name: "Regions Bank",
    kind: "bank",
    region: "US",
    downloadSteps: [
      "Log in at regions.com.",
      "Open the account, then Online Statements.",
      "Select the period and download the PDF.",
    ],
    nativeExports: "CSV and personal-finance downloads of recent activity on open accounts.",
    gap: "Regions statements interleave deposit and withdrawal sections with a daily balance summary; the converter excludes the balance summary from transactions and uses it as verification instead.",
    quirks: [
      "Deposits/withdrawals sections with subtotals; daily balance summary used for cross-checking, not output.",
      "Check listings print in compact multi-column grids on some layouts; these are detected and read column-wise.",
    ],
    faq: [
      {
        q: "My Regions statement lists checks in a three-column grid. Does that convert?",
        a: "Compact check grids are a known Regions layout; each check number/amount pair becomes one transaction. If your particular layout fails, the anonymized layout reporter gets it templated quickly.",
      },
    ],
  },
  {
    slug: "mt-bank",
    name: "M&T Bank",
    kind: "bank",
    region: "US",
    downloadSteps: [
      "Log in at mtb.com.",
      "Choose the account, then Statements & Documents.",
      "Pick the month and download the PDF.",
    ],
    nativeExports: "Recent-activity CSV downloads in online banking for open accounts.",
    gap: "M&T statements use sectioned activity with subtotals and frequently wrap payee descriptions; the converter folds the wraps and proves totals to the cent.",
    quirks: [
      "Sectioned layout with subtotals; signs assigned by section, checked against printed totals.",
      "Wrapped descriptions merged into single transactions.",
    ],
    faq: [
      {
        q: "Do M&T business statements work?",
        a: "Yes — business layouts that include a running balance verify row-by-row; consumer layouts verify against section subtotals and the opening/closing equation.",
      },
    ],
  },
  {
    slug: "huntington",
    name: "Huntington Bank",
    kind: "bank",
    region: "US",
    downloadSteps: [
      "Log in at huntington.com.",
      "Open the account, then Statements.",
      "Choose the period and download the PDF.",
    ],
    nativeExports: "CSV downloads of recent activity from online banking on open accounts.",
    gap: "Huntington statements list activity in a single table with credit/debit indicators on some products and sections on others; the parser detects which convention a given PDF uses and reconciles it.",
    quirks: [
      "Mixed conventions across products (single signed table vs. sections); each file is scored and parsed by its own layout.",
      "Round-up transfer entries (Huntington's savings features) appear as separate small transactions — preserved as-is so books match the statement.",
    ],
    faq: [
      {
        q: "Why do I see lots of small transfer entries in my export?",
        a: "Huntington's automatic savings features generate real transfer transactions on the statement. The converter preserves them because your books must match the statement — filter them in your spreadsheet or accounting tool if you don't need them.",
      },
    ],
  },
];
