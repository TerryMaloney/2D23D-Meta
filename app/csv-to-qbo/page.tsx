import type { Metadata } from "next";
import { Faq } from "@/components/Faq";
import { CsvToQboIsland } from "@/components/CsvToQboIsland";

export const metadata: Metadata = {
  title: "CSV to QBO converter — free, in your browser",
  description:
    "Convert a CSV of transactions to QBO (QuickBooks Web Connect), QFX (Quicken), or OFX. Map your columns with dropdowns and export. No upload — the file stays on your device.",
  alternates: { canonical: "/csv-to-qbo/" },
};

const FAQ = [
  {
    q: "Why would I need a CSV to QBO converter?",
    a: "QuickBooks Online only imports bank feeds, QBO/QFX/OFX files, or CSVs with limited column control. When your bank only offers CSV exports — or you've cleaned data in a spreadsheet — converting to QBO gives QuickBooks the typed, deduplicated transactions it expects.",
  },
  {
    q: "Will QuickBooks skip transactions as duplicates?",
    a: "QuickBooks dedupes on FITID. This converter generates a deterministic FITID per row (hashed from date, amount, description, and row position), so re-importing the same file won't double-book, and distinct transactions are never silently dropped.",
  },
  {
    q: "What if QuickBooks rejects the file?",
    a: "Most rejections are INTU.BID validation: QuickBooks checks the bank ID in the file against institutions it recognizes. Use the main converter's advanced settings to set your bank's BID, or try the default first — it works for most users.",
  },
  {
    q: "Does my CSV get uploaded?",
    a: "No. Like everything on StatementClear, the conversion runs in your browser. The file never leaves your device.",
  },
];

export default function CsvToQboPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-semibold">CSV → QBO / QFX / OFX</h1>
      <p className="mt-2 max-w-2xl text-ink-soft">
        Turn any CSV of transactions into a file QuickBooks, Quicken, or any
        OFX-aware tool imports cleanly. Map your columns below — desktop apps
        charge $60+ for this exact job.
      </p>
      <div className="mt-8">
        <CsvToQboIsland />
      </div>
      <div className="mt-16 max-w-3xl">
        <Faq items={FAQ} />
      </div>
    </div>
  );
}
