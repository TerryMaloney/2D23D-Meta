import type { BankEntry } from "./banks-types";

/** Online banks, card issuers, brokerages, and fintechs (US). */
export const US_OTHER: BankEntry[] = [
  {
    slug: "ally",
    name: "Ally Bank",
    kind: "bank",
    region: "US",
    downloadSteps: [
      "Log in at ally.com.",
      "Open the account, then Statements (under the account menu).",
      "Choose the month and download the PDF.",
    ],
    nativeExports: "Ally exports recent transactions to CSV/QFX from the activity page on open accounts.",
    gap: "Ally's online exports are solid for open accounts — the gap is archived months and closed accounts, where the PDF statement is the only record. The converter reads those PDFs with full reconciliation.",
    quirks: [
      "Clean single-table layout with a running balance on savings/checking — verified row by row.",
      "Interest-payment lines at cycle end are ordinary transactions and reconcile into the closing balance.",
    ],
    faq: [
      {
        q: "I closed my Ally account. Can I still get my data out?",
        a: "If you saved the statement PDFs, yes — drop them in and export. This is the most common reason people convert Ally statements.",
      },
    ],
  },
  {
    slug: "discover",
    name: "Discover",
    kind: "credit-card",
    region: "US",
    downloadSteps: [
      "Log in at discover.com.",
      "Open Statements (card) or Documents (bank).",
      "Choose the statement period and download the PDF.",
    ],
    nativeExports: "Discover card activity downloads as CSV/QFX/QIF for recent periods.",
    gap: "Discover card statements group purchases by category and list cashback per line on some layouts; the converter extracts the underlying transactions and verifies them against the Previous → New balance equation.",
    quirks: [
      "Card convention: purchases positive, payments/credits negative, verified against the printed summary.",
      "Cashback reward redemptions appear as statement credits and are signed accordingly.",
    ],
    faq: [
      {
        q: "Do Discover Bank (savings) statements work too?",
        a: "Yes — those go through the generic parser with running-balance verification where the layout prints one.",
      },
    ],
  },
  {
    slug: "american-express",
    name: "American Express",
    kind: "credit-card",
    region: "US",
    hasTemplate: true,
    downloadSteps: [
      "Log in at americanexpress.com.",
      "Open Statements & Activity.",
      "Choose the billing period and download the PDF.",
    ],
    nativeExports:
      "Amex has the best native exports of the major issuers — CSV, Excel, QFX, and QBO for recent activity on open cards.",
    gap: "Amex's exports stop where statements begin: archived periods, corporate cards you only receive PDFs for, and closed accounts. Amex statements also omit years on dates and have no running balance — the two things naive converters get wrong.",
    quirks: [
      "No running balance column; reconciliation uses Previous Balance + New Charges − Payments/Credits = New Balance, all printed on the statement.",
      "Dates print month/day with no year; December→January billing cycles are resolved by year inference from the closing date.",
      "Long merchant descriptors with reference numbers wrap to continuation lines, which are merged.",
    ],
    faq: [
      {
        q: "My Amex statement spans December and January. Are the years right?",
        a: "Yes — this exact case is in our test suite. The parser takes the cycle from the statement header and assigns December dates the earlier year and January dates the later one.",
      },
      {
        q: "Does it work for Amex corporate card PDFs?",
        a: "Yes. Corporate statements parse the same way; if your company's layout variant fails, the anonymized layout reporter usually gets it supported within days.",
      },
    ],
  },
  {
    slug: "synchrony",
    name: "Synchrony Bank",
    kind: "credit-card",
    region: "US",
    downloadSteps: [
      "Log in at synchrony.com (or the retailer's card portal).",
      "Open Statements / eStatements.",
      "Choose the period and download the PDF.",
    ],
    nativeExports: "Statement archives are PDF; activity exports vary by retail card portal and are often unavailable.",
    gap: "Synchrony issues store cards for dozens of retailers, and most of those portals offer no transaction export at all — the PDF statement is genuinely the only machine-readable source.",
    quirks: [
      "Store-card statements follow the card convention (purchases positive, payments negative) with promotional-financing sections; promo summaries are excluded from the transaction list.",
      "Layout varies by retail partner; reconciliation tells you per file whether the parse verified.",
    ],
    faq: [
      {
        q: "My Synchrony statement has promotional financing tables. Are they exported?",
        a: "Promo summaries (deferred-interest balances by promo) are balance tables, not transactions, so they're excluded. The purchases and payments themselves are exported and verified against the statement totals.",
      },
    ],
  },
  {
    slug: "navy-federal",
    name: "Navy Federal Credit Union",
    kind: "bank",
    region: "US",
    downloadSteps: [
      "Sign in at navyfederal.org.",
      "Open Statements (under the account or documents menu).",
      "Choose the month and download the PDF.",
    ],
    nativeExports: "Recent activity exports to CSV from online banking on open accounts.",
    gap: "Navy Federal commonly issues combined statements — checking, savings, and a card on one PDF. The converter splits them into one verified output per account automatically.",
    quirks: [
      "Combined multi-account statements split on each account's opening-balance section.",
      "Share-account terminology (deposits/dividends) maps to standard credit entries.",
    ],
    faq: [
      {
        q: "My statement covers three accounts. What does the export look like?",
        a: "The preview shows a tab per account, each with its own reconciliation banner, and you export each account separately — which is how bookkeeping tools want them.",
      },
    ],
  },
  {
    slug: "usaa",
    name: "USAA",
    kind: "bank",
    region: "US",
    downloadSteps: [
      "Log in at usaa.com.",
      "Open the account, then Documents / Statements.",
      "Choose the period and download the PDF.",
    ],
    nativeExports: "USAA exports recent activity as CSV/QFX on open accounts.",
    gap: "USAA statements often combine accounts and use deposit/withdrawal columns; the converter signs by column, splits accounts, and verifies each against its printed balances.",
    quirks: [
      "Combined statements split into per-account outputs.",
      "Separate deposit and withdrawal columns; sign comes from column position and is verified by the balance equation.",
    ],
    faq: [
      {
        q: "Can I convert USAA statements for insurance or loan documentation?",
        a: "Yes — and because conversion happens in your browser, the statement never touches a third-party server on its way to becoming a spreadsheet, which matters for exactly these documents.",
      },
    ],
  },
  {
    slug: "charles-schwab",
    name: "Charles Schwab",
    kind: "brokerage",
    region: "US",
    downloadSteps: [
      "Log in at schwab.com.",
      "Open Statements & Documents.",
      "Choose the account and period, then download the PDF.",
    ],
    nativeExports: "Schwab exports recent banking/brokerage activity to CSV/OFX on open accounts.",
    gap: "Schwab Bank checking statements arrive inside brokerage statement packets; the converter reads the banking activity table and ignores the investment sections that confuse generic tools.",
    quirks: [
      "Investor Checking activity parses with a running balance; positions/holdings tables in the same PDF are recognized as non-transactional and skipped.",
      "Brokerage cash sweep entries appear as ordinary transactions where listed on the banking activity table.",
    ],
    faq: [
      {
        q: "Does this convert my brokerage trades?",
        a: "No — it's a bank-statement converter. It extracts the cash/banking activity (deposits, withdrawals, checks, transfers) and skips holdings and trade-confirmation sections.",
      },
    ],
  },
  {
    slug: "fidelity",
    name: "Fidelity",
    kind: "brokerage",
    region: "US",
    downloadSteps: [
      "Log in at fidelity.com.",
      "Open Statements (Accounts & Trade → Statements).",
      "Choose the period and download the PDF.",
    ],
    nativeExports: "Fidelity exports activity as CSV for recent periods on open accounts.",
    gap: "Fidelity Cash Management statements embed banking activity inside investment-statement packets; the converter extracts the cash activity table and validates it against the printed balances.",
    quirks: [
      "Cash management activity (deposits, debit card, checkwriting, transfers) is parsed; holdings, performance, and disclosure pages are skipped as non-transactional.",
      "Core-position sweep lines are preserved so balances reconcile.",
    ],
    faq: [
      {
        q: "Why does my export include 'core position' entries?",
        a: "Fidelity sweeps idle cash to a core money-market position, and those sweeps are real cash movements on the statement. Removing them would break the balance equation, so they're preserved.",
      },
    ],
  },
  {
    slug: "sofi",
    name: "SoFi",
    kind: "fintech",
    region: "US",
    downloadSteps: [
      "Log in at sofi.com or the SoFi app.",
      "Open the Money/Banking section, then Statements.",
      "Choose the month and download the PDF.",
    ],
    nativeExports: "SoFi offers CSV export of recent transactions from the app/website.",
    gap: "SoFi's CSV covers recent activity on open accounts; for archived months, mortgage/loan applications, or closed accounts, the PDF statement is the record — and it converts here with verification.",
    quirks: [
      "Clean modern single-table layout with running balance — verifies row by row.",
      "Combined Checking & Savings statements split into separate outputs, including Vaults activity where listed.",
    ],
    faq: [
      {
        q: "Are SoFi Vaults shown separately?",
        a: "Vault transfers appear as transactions on the statement and are preserved; if SoFi prints a separate savings section, it parses as its own account output.",
      },
    ],
  },
  {
    slug: "chime",
    name: "Chime",
    kind: "fintech",
    region: "US",
    downloadSteps: [
      "Open the Chime app (or log in at chime.com).",
      "Go to Documents → Statements.",
      "Choose the month and download the PDF.",
    ],
    nativeExports: "Chime statements are PDF; there is no native QBO/OFX export.",
    gap: "Chime offers no accounting-format export at all, and Chime users frequently need statement data for loan, rental, and benefits applications. The converter produces CSV/Excel from the PDFs without the data leaving the device.",
    quirks: [
      "Modern app-generated PDF with a single chronological table and running balance — verifies row by row.",
      "Round-up and Save-When-I-Get-Paid transfers appear as separate small transactions; they're preserved so totals match.",
    ],
    faq: [
      {
        q: "Why does my export have so many small transfer rows?",
        a: "Chime's automatic-savings features create real transactions. They're preserved because the export must reconcile to the statement; filter them downstream if you don't need them.",
      },
    ],
  },
  {
    slug: "varo",
    name: "Varo Bank",
    kind: "fintech",
    region: "US",
    downloadSteps: [
      "Open the Varo app.",
      "Go to Account → Statements (or Documents).",
      "Choose the month and download the PDF.",
    ],
    nativeExports: "Varo statements are PDF; no native accounting-format export.",
    gap: "Like most app-first banks, Varo's PDF is the only complete record, and nothing machine-readable is offered. This converter is the missing export button.",
    quirks: [
      "App-generated single-table layout with running balance, verified per row.",
    ],
    faq: [
      {
        q: "Is converting on a phone possible?",
        a: "Yes — the converter runs in mobile browsers too. For long statements a laptop is more comfortable, but nothing about the parsing requires one.",
      },
    ],
  },
  {
    slug: "axos",
    name: "Axos Bank",
    kind: "fintech",
    region: "US",
    downloadSteps: [
      "Log in at axosbank.com.",
      "Open the account, then Statements (e-Documents).",
      "Choose the period and download the PDF.",
    ],
    nativeExports: "Axos exports recent activity to CSV/QFX on open accounts.",
    gap: "Axos statement archives are PDF-only; older periods and closed accounts convert here with running-balance verification.",
    quirks: [
      "Single-table layout with running balance on consumer products — row-by-row verification.",
      "Business products print sectioned summaries used as printed-total cross-checks.",
    ],
    faq: [
      {
        q: "Do Axos business checking statements reconcile?",
        a: "Yes — against the opening/closing equation and section subtotals, plus the running balance where the layout prints one.",
      },
    ],
  },
  {
    slug: "mercury",
    name: "Mercury",
    kind: "fintech",
    region: "US",
    downloadSteps: [
      "Log in at mercury.com.",
      "Open Statements (under the account or settings).",
      "Choose the month and download the PDF.",
    ],
    nativeExports:
      "Mercury's native exports are excellent — CSV/QBO-oriented integrations and accounting sync for connected tools.",
    gap: "The gap is the handoff: bookkeepers, lenders, and due-diligence reviewers receive Mercury statements as PDFs without portal access. This converts those PDFs to working data with proof.",
    quirks: [
      "Clean startup-style layout with a single chronological table and running balance — verifies row by row.",
      "Multiple accounts (checking, savings, treasury) print as separate sections and split into separate outputs.",
    ],
    faq: [
      {
        q: "I'm a bookkeeper sent Mercury PDFs by a client. Is this faster than asking for portal access?",
        a: "That's the core use case: drop the PDFs, confirm each one verifies to the cent, export CSV or QBO, done — no access requests, and the client's data never touches another server.",
      },
    ],
  },
  {
    slug: "bluevine",
    name: "Bluevine",
    kind: "fintech",
    region: "US",
    downloadSteps: [
      "Log in at bluevine.com.",
      "Open Statements (under the account menu).",
      "Choose the month and download the PDF.",
    ],
    nativeExports: "Bluevine exports recent activity to CSV on open accounts.",
    gap: "Bluevine business checking PDFs convert here with full verification — useful for loan files and year-end books where archived months matter.",
    quirks: [
      "Business checking layout with running balance; sub-account sections split into separate outputs.",
    ],
    faq: [
      {
        q: "Do Bluevine sub-accounts convert separately?",
        a: "Yes — each sub-account's section parses as its own statement with its own reconciliation result.",
      },
    ],
  },
  {
    slug: "novo",
    name: "Novo",
    kind: "fintech",
    region: "US",
    downloadSteps: [
      "Log in at novo.co.",
      "Open Statements (in the account menu).",
      "Choose the month and download the PDF.",
    ],
    nativeExports: "Novo exports transactions to CSV from the dashboard on open accounts.",
    gap: "Novo's PDFs are the permanent record for closed months; the converter reads them and proves the parse against the printed balances.",
    quirks: [
      "App-generated single-table layout; Reserves transfers appear as ordinary transactions and are preserved.",
    ],
    faq: [
      {
        q: "Are Novo Reserves included?",
        a: "Reserve transfers are real transactions on the statement and are preserved so the file reconciles.",
      },
    ],
  },
  {
    slug: "relay",
    name: "Relay",
    kind: "fintech",
    region: "US",
    downloadSteps: [
      "Log in at relayfi.com.",
      "Open Documents → Statements.",
      "Choose the account and month, then download the PDF.",
    ],
    nativeExports:
      "Relay is accounting-forward: native QuickBooks/Xero sync and CSV exports are built in for connected, open accounts.",
    gap: "PDFs still rule the handoff cases — audits, lending, and bookkeeping for months before the integration was connected. Those convert here, verified.",
    quirks: [
      "Multi-account statements (Relay's core feature) split into one verified output per account.",
      "Clean single-table layout with running balance per account.",
    ],
    faq: [
      {
        q: "We connected QuickBooks last quarter. How do we backfill earlier months?",
        a: "Download the earlier statement PDFs from Relay, convert each to QBO here, and import — the deterministic FITIDs prevent duplicates if periods overlap.",
      },
    ],
  },
  {
    slug: "paypal",
    name: "PayPal",
    kind: "payments",
    region: "US",
    hasTemplate: true,
    downloadSteps: [
      "Log in at paypal.com.",
      "Open Activity → Statements (or Reports in PayPal Business).",
      "Choose monthly statements, pick the month, and download the PDF.",
    ],
    nativeExports: "PayPal Business offers CSV activity reports — genuinely good ones — for configurable ranges.",
    gap: "PayPal's PDF statements include a currency column and list fees as separate rows; spreadsheets built by copy-paste mis-merge them. The parser reads the currency per row and keeps fee rows attached to their payments.",
    quirks: [
      "A per-row currency column (multi-currency accounts) is parsed; rows in a non-primary currency are tagged with their currency code in the export.",
      "Fees print as separate rows immediately after the payment they belong to; both are preserved so the balance chain holds.",
      "Running balance column verifies every row.",
    ],
    faq: [
      {
        q: "Why are fees separate rows instead of net amounts?",
        a: "Because that's how the statement (and good bookkeeping) works: gross payment in, fee out. Netting them would break reconciliation and understate expenses.",
      },
      {
        q: "I have EUR and USD activity in one statement. What happens?",
        a: "Each row keeps its currency tag. Rows in the statement's primary currency chain the running balance; other-currency rows are exported with their currency code so your accounting tool can handle them explicitly.",
      },
    ],
  },
  {
    slug: "venmo",
    name: "Venmo",
    kind: "payments",
    region: "US",
    downloadSteps: [
      "Log in at venmo.com (statements aren't in the mobile app).",
      "Open Statement (under your profile/settings).",
      "Choose the month and download the PDF or CSV.",
    ],
    nativeExports: "Venmo offers CSV statement downloads on the website — use those when they cover what you need.",
    gap: "Venmo's CSV covers the basics; PDFs matter for taxes and disputes on older periods. Either way, business-profile activity often needs cleaning into accounting formats — the converter outputs QBO/OFX that imports cleanly.",
    quirks: [
      "Payments between people carry free-text notes as descriptions; the parser preserves them verbatim (and the QBO writer moves overflow into MEMO).",
      "Fee rows on business-profile transactions are separate entries, preserved for reconciliation.",
    ],
    faq: [
      {
        q: "Venmo gives me a CSV already. Why convert here?",
        a: "If the CSV does the job, use it. Convert here when you need QBO/QFX/OFX for accounting software (use our CSV→QBO tool), or when only the PDF exists for the period you need.",
      },
    ],
  },
  {
    slug: "square",
    name: "Square",
    kind: "payments",
    region: "US",
    downloadSteps: [
      "Log in at squareup.com.",
      "For Square Checking: Balance → Statements.",
      "Choose the month and download the PDF.",
    ],
    nativeExports: "Square's dashboard exports sales and transfer reports as CSV; Square Checking statements are PDF.",
    gap: "Square Checking statements (the banking product) are PDF-only; converting them here produces verified data for books that the sales-report CSVs don't cover (fees, transfers, card spend).",
    quirks: [
      "Square Checking statements list processing transfers, instant transfers, and card spend in one chronological table with running balance.",
      "Sales reports and processing statements are different documents — this converts the banking statement.",
    ],
    faq: [
      {
        q: "Is this for my Square sales reports?",
        a: "No — sales/processing reports already export as CSV from the dashboard. This converts Square Checking bank statements, which only exist as PDFs.",
      },
    ],
  },
  {
    slug: "stripe",
    name: "Stripe",
    kind: "payments",
    region: "US",
    downloadSteps: [
      "Log in at dashboard.stripe.com.",
      "Open Settings → Reports / Documents (or Balance → Payouts for payout activity).",
      "Download the statement or report PDF for the period.",
    ],
    nativeExports:
      "Stripe's native reporting is excellent — payout reconciliation and balance reports export as CSV from the dashboard.",
    gap: "Use Stripe's CSVs when you have dashboard access. The converter earns its keep when you only have the PDFs — bookkeeping handoffs, diligence, or applications — or when you need QBO/OFX rather than raw CSV (pair with our CSV→QBO tool).",
    quirks: [
      "Stripe documents vary by type (balance summaries vs. payout reports); the reconciliation banner tells you immediately whether a given PDF parsed and verified.",
      "Payout lines net of fees are preserved as printed so the document's own totals hold.",
    ],
    faq: [
      {
        q: "Should I convert Stripe PDFs or export CSV from the dashboard?",
        a: "Dashboard CSVs are better when you have access — they're the primary source. Convert PDFs when access isn't available or the period is archived; then check the verification banner before trusting the output.",
      },
    ],
  },
  {
    slug: "brex",
    name: "Brex",
    kind: "fintech",
    region: "US",
    downloadSteps: [
      "Log in at dashboard.brex.com.",
      "Open Accounts (or Card) → Statements.",
      "Choose the month and download the PDF.",
    ],
    nativeExports: "Brex has strong native exports — CSV and direct accounting integrations (QuickBooks, Xero, NetSuite) on active accounts.",
    gap: "For months before integrations were connected, for closed accounts, or for documents passed to outside bookkeepers and auditors, the PDFs convert here with verification.",
    quirks: [
      "Card statements follow the card convention (charges positive, payments negative) and verify against the printed summary.",
      "Business account (cash) statements parse with a running balance, row-verified.",
    ],
    faq: [
      {
        q: "Do Brex card statements import to QuickBooks from here?",
        a: "Yes — export QBO with the credit-card account type, and use the sign-flip option if your QuickBooks card account expects charges as negative.",
      },
    ],
  },
  {
    slug: "ramp",
    name: "Ramp",
    kind: "fintech",
    region: "US",
    downloadSteps: [
      "Log in at app.ramp.com.",
      "Open Accounting / Statements.",
      "Choose the period and download the PDF.",
    ],
    nativeExports: "Ramp's accounting sync and CSV exports are first-class on active accounts.",
    gap: "Like Brex: history before sync was connected, audits, and external bookkeepers all run on PDFs. The converter reads them and proves the math.",
    quirks: [
      "Card statements use the card convention and verify against printed totals.",
      "Per-card sub-sections on combined statements are merged chronologically; cardholder names stay in descriptions.",
    ],
    faq: [
      {
        q: "Can I keep per-cardholder detail?",
        a: "Yes — cardholder names print in the transaction descriptions and are preserved in every export format.",
      },
    ],
  },
];
