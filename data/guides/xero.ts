import type { Guide } from "./types";

export const GUIDE_XERO: Guide = {
  slug: "import-bank-statements-into-xero",
  title: "How to import bank statements into Xero (feeds, CSV, and OFX)",
  description:
    "Xero's bank feeds, manual statement imports, and the precoded CSV layout — exact steps, regional date traps, and a clean workflow for backfilling history.",
  minutes: 8,
  updated: "2026-06-11",
  sections: [
    {
      heading: "How Xero thinks about bank data",
      paragraphs: [
        "Xero's reconciliation model is built around bank statement lines: every line that arrives — by feed or by import — waits on the bank account's Reconcile tab until you match it to an invoice, a bill, or a transaction you create. That design makes Xero forgiving about where statement lines come from: a line imported from a file behaves exactly like a line from a feed.",
        "The practical consequence: when the feed can't cover something (history before the feed existed, a closed account, a bank without feed support in your region), you import a file and nothing downstream changes. The art is in producing a file Xero reads correctly the first time.",
      ],
    },
    {
      heading: "Method 1 — Bank feeds (ongoing)",
      paragraphs: [
        "In Xero: Accounting → Bank accounts → Add bank account, search your bank, authenticate, and map the feed to a Xero bank account. Feeds deliver new transactions daily. Like QuickBooks' feeds, they start from connection day — most banks provide little or no history — so a new Xero organisation almost always needs a manual import for prior months.",
      ],
    },
    {
      heading: "Method 2 — Manual import (CSV or OFX)",
      paragraphs: [
        "From Accounting → Bank accounts, open the account, choose Manage account → Import a statement. Xero accepts OFX (recommended) and CSV. OFX files carry per-transaction IDs, which lets Xero detect duplicate lines on overlapping imports; CSVs rely on your discipline with date ranges.",
        "Xero's CSV importer expects specific columns. The precoded statement layout is: Date, Amount, Payee, Description, Reference (and optionally a Cheque Number column). Amounts are signed — money in positive, money out negative — in a single column. If your bank's CSV uses separate debit/credit columns, you'll need to reshape it, or export from a converter that emits Xero's layout directly.",
        "StatementClear exports both formats from any digital statement PDF: an OFX file with deterministic transaction IDs, or Xero's exact precoded CSV with a payee column derived from the description and check numbers in the Reference column. Either way the data was already reconciled against the statement's printed balances before export.",
      ],
    },
    {
      heading: "The regional date trap (read this if anything imported to the wrong month)",
      paragraphs: [
        "Xero parses CSV dates according to patterns it detects, and ambiguous dates are the classic failure: 03/04/2026 is March 4th to a US organisation and 3 April to everyone else. If half your January transactions landed in entirely wrong months, this is what happened — ambiguous dates were readable both ways and the importer picked the wrong one.",
        "Two defenses: export dates in an unambiguous format where possible, and match your converter's date setting to your organisation's region. StatementClear's Xero export defaults to DD/MM/YYYY (Xero's home convention) with a one-click switch to MM/DD/YYYY for US organisations. OFX sidesteps the issue entirely — its dates are YYYYMMDD by specification.",
      ],
    },
    {
      heading: "Backfilling history into a new Xero organisation",
      paragraphs: ["A sequence that holds up in practice:"],
      list: [
        "Set the Xero conversion date (the date your books start in Xero) and enter conversion balances — including each bank account's balance on that date, from the statements.",
        "Download statement PDFs for every month from the conversion date to today.",
        "Convert each PDF, confirm the 'verified to the cent' reconciliation banner, and export OFX.",
        "Import oldest month first into the matching Xero bank account.",
        "Activate the live feed last; overlapping lines are caught by OFX transaction IDs (and Xero will also warn on apparent duplicates).",
        "Reconcile in Xero month by month. Because each imported file already balanced against its statement, the Xero statement balance and your real bank balance should track exactly; if they diverge, the divergence month tells you where to look.",
      ],
      ordered: true,
    },
    {
      heading: "Frequent issues, quick answers",
      paragraphs: [],
      list: [
        "Import button greyed out or missing: you're on a bank account Xero treats as feed-only in your plan/region, or you're not on the bank account screen — manual import lives under Manage account on the specific account.",
        "“Statement balance doesn't match” after import: Xero's running statement balance is computed from imported lines; a gap usually means a missing period between imports. Convert and import the missing month — reconciliation on the converter side will show you the opening/closing balances to line up.",
        "Duplicate lines after importing overlapping CSVs: delete the duplicate statement lines (Manage account → Bank statements), then re-import using OFX, whose IDs prevent recurrence.",
        "Payee shows the whole transaction description: that's what the bank printed. The converter's Payee column takes the leading words of the description; rename payees in Xero once and bank rules take over for future lines.",
      ],
    },
    {
      heading: "Why reconcile-before-import matters more in Xero",
      paragraphs: [
        "Xero's whole workflow trusts statement lines as ground truth — you reconcile the books to the lines. If the lines themselves are wrong (a missed row from a bad PDF conversion, a sign flipped by a parentheses-negative), Xero will happily let you reconcile everything to corrupted data and the error surfaces months later as an unexplainable balance difference.",
        "That's the case for converting with verification: when opening + transactions = closing held before the import, the statement lines in Xero are exactly the statement. Every minute spent making the source right is repaid by Xero's reconciliation working the way the design intends.",
      ],
    },
  ],
};
