import type { Metadata } from "next";
import { Faq } from "@/components/Faq";
import { AuditIsland } from "@/components/audit/AuditIsland";

export const metadata: Metadata = {
  title: "Statement History Audit — reconstruct months of bank history, privately",
  description:
    "Drop a year of statement PDFs: they parse in your browser, group by account, and get checked for missing months, duplicates, and balance continuity. Merged CSV/XLSX/QBO exports and a printable audit report. Nothing uploads.",
  alternates: { canonical: "/audit/" },
};

const FAQ = [
  {
    q: "What does the Statement History Audit check?",
    a: "Per account: chronological ordering, missing statement periods, overlapping periods, duplicate statements, whether each statement's closing balance matches the next one's opening balance, potential duplicate transactions across files, recurring payments and deposits, fees and interest, and monthly cash-flow summaries. Each statement is also individually reconciled against its own printed balances.",
  },
  {
    q: "Are these findings financial advice or fraud detection?",
    a: "No. They are arithmetic and pattern observations — 'potential duplicate', 'balance discontinuity', 'review recommended' — intended to point a human at things worth checking. They are not fraud detection, underwriting, or professional accounting conclusions.",
  },
  {
    q: "Do my statements get uploaded when I drop many files?",
    a: "No. Every file is parsed by code running in your browser tab, same as the single-statement converter. You can watch the Network tab while a 12-file audit runs — nothing leaves your device.",
  },
  {
    q: "Can unverified statements sneak into the merged export?",
    a: "No. Every statement is reconciled individually; files that fail to parse are listed separately, and the export defaults to verified statements only. Including partially verified data is an explicit checkbox, never silent.",
  },
  {
    q: "Who is this for?",
    a: "Bookkeepers reconstructing a new client's year, loan and rental applicants assembling history, landlords and lenders reviewing received statements, and anyone doing year-end taxes from a folder of PDFs.",
  },
];

export default function AuditPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-semibold">Statement History Audit</h1>
      <p className="mt-3 max-w-2xl text-ink-soft">
        Reconstruct months or years of financial history from a folder of
        statement PDFs — verified statement by statement, checked for gaps and
        discontinuities across the whole span, and exported as one clean
        ledger. Entirely in your browser.
      </p>
      <div className="mt-8">
        <AuditIsland />
      </div>
      <div className="mt-16 max-w-3xl">
        <Faq items={FAQ} heading="Audit questions" />
      </div>
    </div>
  );
}
