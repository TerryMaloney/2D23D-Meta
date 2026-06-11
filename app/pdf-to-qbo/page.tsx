import type { Metadata } from "next";
import { FormatPage } from "@/components/FormatPage";

export const metadata: Metadata = {
  title: "Bank statement PDF to QBO converter (QuickBooks) — in your browser",
  description:
    "Convert PDF bank statements to QBO files QuickBooks imports cleanly: deterministic FITIDs, correct TRNTYPEs, configurable INTU.BID. No upload — runs in your browser.",
  alternates: { canonical: "/pdf-to-qbo/" },
};

export default function Page() {
  return (
    <FormatPage
      content={{
        h1: "PDF bank statement → QBO for QuickBooks",
        intro:
          "Produce a Web Connect (.qbo) file from any digital statement PDF and import months of history into QuickBooks in one step — including banks QuickBooks can't connect to and accounts that are already closed.",
        sections: [
          {
            heading: "The details that make QBO imports work",
            paragraphs: [
              "QuickBooks silently skips transactions whose FITID it has seen before. This converter generates FITIDs deterministically — a hash of each transaction's date, amount, description, and position — so importing the same file twice never double-books, while genuinely distinct transactions always import. Names longer than the 32-character OFX limit overflow into the MEMO field instead of being cut off.",
              "Transaction types are derived from the data: CREDIT or DEBIT by sign, CHECK with a proper CHECKNUM when the statement prints a check column (Wells Fargo's, for example, carries straight through). For credit-card statements, a one-click sign flip matches the convention your QuickBooks card account expects.",
              "QuickBooks validates the INTU.BID (bank identifier) in QBO files against institutions it recognizes. The default works for most users; if your import is rejected, set your bank's BID in the advanced export settings — the option is right there, with a help note.",
            ],
          },
          {
            heading: "When PDF → QBO beats bank feeds",
            paragraphs: [
              "Bank feeds only go back a few months and only work on open, connectable accounts. For a new bookkeeping client with a year of history, a closed account, or a bank QuickBooks doesn't connect to, the statement PDFs are the source of truth — and this converts them with a per-file reconciliation proof, entirely in your browser.",
            ],
          },
        ],
        faq: [
          {
            q: "QuickBooks says the file isn't valid or the bank isn't recognized. What now?",
            a: "That's INTU.BID validation. Open the advanced settings in the export dialog and enter your bank's BID; if you don't know it, the default (3000) works for most users, and our QBO troubleshooting guide covers the rest.",
          },
          {
            q: "QuickBooks Online or Desktop?",
            a: "Both import Web Connect (.qbo) files. In QuickBooks Online use Transactions → Banking → Upload from file; in Desktop use File → Utilities → Import → Web Connect.",
          },
          {
            q: "Will re-importing duplicate my transactions?",
            a: "No — FITIDs are deterministic, so QuickBooks recognizes previously imported transactions and skips exactly those.",
          },
        ],
      }}
    />
  );
}
