import type { BankEntry } from "./banks-types";

/** Canadian, UK, and European institutions. */
export const INTL: BankEntry[] = [
  {
    slug: "rbc",
    name: "RBC Royal Bank",
    kind: "bank",
    region: "CA",
    downloadSteps: [
      "Sign in at rbcroyalbank.com.",
      "Open Statements/Documents (under the account).",
      "Choose the month and download the PDF.",
    ],
    nativeExports: "RBC exports recent activity to CSV/QFX on open accounts.",
    gap: "RBC statements use day-month dates and an opening/closing balance frame; the converter reads Canadian conventions natively and verifies against the printed balances.",
    quirks: [
      "Dates print day-first (e.g., 28 Dec); the detector reads DD MMM without assuming US order.",
      "Opening Balance / Closing Balance terminology maps directly onto the reconciliation equation.",
      "Withdrawals and deposits print in separate columns on chequing statements; sign comes from column position.",
    ],
    faq: [
      {
        q: "Are amounts treated as CAD?",
        a: "Amount formatting matches Canadian conventions (same as US numerals). The export carries the numbers; your accounting tool sets the currency of the account you import into.",
      },
    ],
  },
  {
    slug: "td-canada-trust",
    name: "TD Canada Trust",
    kind: "bank",
    region: "CA",
    downloadSteps: [
      "Log in at easyweb.td.com.",
      "Open Statements & Documents.",
      "Choose the account and period, then download the PDF.",
    ],
    nativeExports: "EasyWeb exports recent activity to CSV/OFX on open accounts.",
    gap: "TD Canada Trust statements pair withdrawal/deposit columns with a balance column; the converter signs by column and verifies every row against the balance chain.",
    quirks: [
      "Separate withdrawal and deposit columns plus a running balance — the strongest verification mode.",
      "Day-first dates without years, inferred from the statement period.",
    ],
    faq: [
      {
        q: "Is this different from the US TD Bank page?",
        a: "Yes — TD Canada Trust statements use different layouts and date conventions than TD Bank, N.A. (US). This page covers the Canadian format.",
      },
    ],
  },
  {
    slug: "scotiabank",
    name: "Scotiabank",
    kind: "bank",
    region: "CA",
    downloadSteps: [
      "Sign in at scotiabank.com (Scotia OnLine).",
      "Open Documents → Statements.",
      "Choose the period and download the PDF.",
    ],
    nativeExports: "Recent activity exports to CSV on open accounts.",
    gap: "Scotiabank chequing statements use withdrawal/deposit/balance columns with day-month dates; the converter reads them positionally and proves the chain.",
    quirks: [
      "Withdrawals/deposits columns with running balance.",
      "Day-first dates; year inferred from the period, including December→January.",
    ],
    faq: [
      {
        q: "Do Scotiabank credit card statements work?",
        a: "Yes — card statements parse with the card convention and verify against the previous/new balance equation.",
      },
    ],
  },
  {
    slug: "bmo",
    name: "BMO",
    kind: "bank",
    region: "CA",
    downloadSteps: [
      "Log in at bmo.com.",
      "Open Statements (under My Accounts / Documents).",
      "Choose the month and download the PDF.",
    ],
    nativeExports: "BMO exports recent activity to CSV/QFX on open accounts.",
    gap: "BMO statements print amounts in withdrawal/deposit columns with a daily balance; the converter signs by column, chains the balance, and flags anything that doesn't add up.",
    quirks: [
      "Withdrawal/deposit columns with a balance column updated per day; the chain handles rows between balance checkpoints.",
      "Day-first dates without years.",
    ],
    faq: [
      {
        q: "My BMO statement shows balances only on some rows. Is that a problem?",
        a: "No — BMO prints the balance on the last transaction of each day. The parser verifies the rows between checkpoints as a group, so accuracy checking still covers every row.",
      },
    ],
  },
  {
    slug: "cibc",
    name: "CIBC",
    kind: "bank",
    region: "CA",
    downloadSteps: [
      "Sign in at cibc.com.",
      "Open Documents/Statements.",
      "Choose the account and month, then download the PDF.",
    ],
    nativeExports: "Recent activity exports to CSV on open accounts.",
    gap: "CIBC statements follow the Canadian two-column convention with a balance column; the converter handles it natively, including French-influenced formatting where it appears.",
    quirks: [
      "Withdrawals/deposits columns plus running balance.",
      "Day-first dates, year inferred from the statement period.",
    ],
    faq: [
      {
        q: "Can I convert CIBC statements for mortgage applications?",
        a: "Yes — and because parsing is in-browser, the statements never leave your machine on the way to becoming the spreadsheet your broker asked for.",
      },
    ],
  },
  {
    slug: "barclays",
    name: "Barclays",
    kind: "bank",
    region: "UK",
    downloadSteps: [
      "Log in to Barclays Online Banking.",
      "Open Statements & documents.",
      "Choose the account and period, then download the PDF.",
    ],
    nativeExports: "Barclays exports recent transactions as CSV/OFX from online banking.",
    gap: "UK statements use Money in / Money out columns and day-first dates; the converter signs by column and reconciles to the printed balance in pounds, to the penny.",
    quirks: [
      "Money in / Money out columns; sign from column position, verified by the balance column.",
      "Day-first dates (28 Dec) without years; year inferred from the statement period.",
      "£ amounts parse identically to $ — symbol-agnostic amount detection.",
    ],
    faq: [
      {
        q: "Does 'verified to the cent' work in pounds?",
        a: "Yes — the reconciliation is currency-agnostic integer arithmetic. For GBP statements it's verified to the penny.",
      },
    ],
  },
  {
    slug: "hsbc",
    name: "HSBC",
    kind: "bank",
    region: "UK",
    downloadSteps: [
      "Log in to HSBC online banking.",
      "Open Statements (under the account).",
      "Choose the period and download the PDF.",
    ],
    nativeExports: "HSBC offers CSV/OFX downloads of recent activity in most regions.",
    gap: "HSBC statement layouts differ by country; the parser scores each PDF independently and the verification banner tells you whether the parse held — no guessing.",
    quirks: [
      "UK layouts use Paid out / Paid in / Balance columns; sign from column, verified by balance chain.",
      "Multi-region formats (UK, HK, US) differ; reconciliation validates each file on its own terms.",
    ],
    faq: [
      {
        q: "Will HSBC statements from outside the UK work?",
        a: "Often yes via the generic parser — and the reconciliation result tells you immediately. If a regional layout fails, the anonymized layout reporter gets it added.",
      },
    ],
  },
  {
    slug: "lloyds",
    name: "Lloyds Bank",
    kind: "bank",
    region: "UK",
    downloadSteps: [
      "Log in to Lloyds Internet Banking.",
      "Open Statements.",
      "Choose the account and period, then download the PDF.",
    ],
    nativeExports: "Lloyds exports recent transactions to CSV/QIF from internet banking.",
    gap: "Lloyds statements use Money In / Money Out columns with transaction-type codes (DEB, FPI, DD); the converter keeps the codes in descriptions and signs by column.",
    quirks: [
      "Money In / Money Out columns plus balance; signs verified by the chain.",
      "Transaction-type codes (DEB, DD, FPI, FPO, TFR) are preserved at the start of descriptions — useful for rule-based categorization downstream.",
    ],
    faq: [
      {
        q: "What do the DEB/FPI/DD codes in descriptions mean?",
        a: "They're Lloyds' transaction types (debit card, Faster Payment in, direct debit…). The converter keeps them because they make categorization rules in your accounting tool much more reliable.",
      },
    ],
  },
  {
    slug: "natwest",
    name: "NatWest",
    kind: "bank",
    region: "UK",
    downloadSteps: [
      "Log in to NatWest Online Banking.",
      "Open Statements → Download/Export.",
      "Choose PDF for the period you need.",
    ],
    nativeExports: "NatWest is generous here: CSV and OFX downloads of transaction history are available natively.",
    gap: "Use NatWest's CSV when it covers the period. PDFs matter for older archives and for statements received from someone else — those convert here with penny-exact verification.",
    quirks: [
      "Paid in / Withdrawn columns with balance; sign by column, chain-verified.",
      "Day-first dates without years.",
    ],
    faq: [
      {
        q: "NatWest already gives me CSV. When is this converter the better tool?",
        a: "When you only have the PDF (archived periods, statements sent by a client or landlord), or when you want the reconciliation proof and a QBO/OFX output rather than raw CSV.",
      },
    ],
  },
  {
    slug: "monzo",
    name: "Monzo",
    kind: "fintech",
    region: "UK",
    downloadSteps: [
      "Open the Monzo app.",
      "Go to the account → Statements (or Documents).",
      "Choose the period and export the PDF.",
    ],
    nativeExports: "Monzo exports CSV natively from the app — one of the best native exports anywhere.",
    gap: "Monzo's own CSV is excellent; convert the PDF here when that's all you've been given (referencing, lettings, bookkeeping handoffs) or when you need OFX/QBO via the CSV→QBO tool.",
    quirks: [
      "App-generated statements with a clean single table and running balance — verifies row by row.",
      "Pots transfers appear as transactions and are preserved so the statement reconciles.",
    ],
    faq: [
      {
        q: "Should I use Monzo's CSV export instead?",
        a: "If you have app access and CSV is the format you need — yes, use Monzo's. This page is for the PDF-in-hand cases, and for producing QBO/QFX/OFX.",
      },
    ],
  },
  {
    slug: "starling",
    name: "Starling Bank",
    kind: "fintech",
    region: "UK",
    downloadSteps: [
      "Open the Starling app or log in to Online Banking.",
      "Go to Statements.",
      "Choose the period and download the PDF.",
    ],
    nativeExports: "Starling exports CSV natively, and business accounts have accounting integrations.",
    gap: "Like Monzo: the native exports are good, and the converter covers the PDF-only handoffs — with the added reconciliation proof per file.",
    quirks: [
      "Clean single-table layout with running balance, verified per row.",
      "Spaces (sub-accounts) transfers preserved as transactions.",
    ],
    faq: [
      {
        q: "Do Starling business statements work?",
        a: "Yes — same layout family with running balance, so every row verifies against the printed chain.",
      },
    ],
  },
  {
    slug: "revolut",
    name: "Revolut",
    kind: "fintech",
    region: "EU",
    downloadSteps: [
      "Open the Revolut app (or web).",
      "Go to the account → Statement.",
      "Choose the currency, period, and PDF format, then download.",
    ],
    nativeExports: "Revolut exports CSV/Excel statements natively per currency account.",
    gap: "Revolut issues one statement per currency with European number formatting; the converter parses 1.234,56-style amounts and keeps each currency's statement verified separately.",
    quirks: [
      "Per-currency statements; European decimal-comma formatting parses natively.",
      "Card payments include FX conversion notes in descriptions, preserved verbatim.",
      "Running balance column verified row by row.",
    ],
    faq: [
      {
        q: "Are decimal-comma amounts (1.234,56) handled?",
        a: "Yes — European formatting is parsed natively; the test suite includes statements in that format. Exports use standard decimal points so spreadsheets and accounting tools read them correctly.",
      },
    ],
  },
  {
    slug: "wise",
    name: "Wise",
    kind: "fintech",
    region: "EU",
    hasTemplate: true,
    downloadSteps: [
      "Log in at wise.com.",
      "Open the currency balance → Statements.",
      "Choose the period and download the PDF.",
    ],
    nativeExports: "Wise exports CSV per balance natively, with date-range control.",
    gap: "Wise PDFs use European number formatting and ISO-style dates, and arrive one per currency balance. A dedicated template parses them; reconciliation runs per balance.",
    quirks: [
      "European formatting (1.234,56) and full ISO dates — a dedicated template handles both.",
      "One statement per currency balance; convert each and each verifies independently.",
      "IBAN and account details in the header are recognized and excluded from transactions.",
    ],
    faq: [
      {
        q: "I hold five currencies in Wise. How many files do I convert?",
        a: "Wise issues one statement per balance, so five — each converts and verifies separately, which is also how multi-currency books want them imported.",
      },
    ],
  },
];
