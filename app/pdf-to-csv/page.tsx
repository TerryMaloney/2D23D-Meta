import type { Metadata } from "next";
import { FormatPage } from "@/components/FormatPage";

export const metadata: Metadata = {
  title: "Bank statement PDF to CSV converter — free, in your browser",
  description:
    "Convert PDF bank statements to clean CSV with configurable columns and date formats. No upload, no account — parsing runs in your browser and reconciles to the cent.",
  alternates: { canonical: "/pdf-to-csv/" },
};

export default function Page() {
  return (
    <FormatPage
      content={{
        h1: "PDF bank statement → CSV",
        intro:
          "Drop a statement PDF and get a clean CSV: one row per transaction, proper signs, quoted fields, and a date format you choose. Verified against the statement's own balances before you download.",
        sections: [
          {
            heading: "What you get",
            paragraphs: [
              "Columns for date, description, amount (or separate debit/credit columns if you prefer), check number where the statement prints one, and the running balance. Dates export as MM/DD/YYYY, DD/MM/YYYY, or ISO 8601. Files include a UTF-8 byte-order mark so Excel opens them with correct characters, and fields are quoted per RFC 4180 — commas inside payee names won't shift your columns.",
              "Negative amounts are real negatives, not text in parentheses. The sign of every transaction is determined by the statement's own running balance or section, then verified by the reconciliation engine — opening balance + all transactions = closing balance, to the cent, or you'll see exactly which rows to review.",
            ],
          },
          {
            heading: "Why not copy-paste from the PDF?",
            paragraphs: [
              "PDF statements are typeset in columns that copy out as jumbled lines: dates merge with amounts, multi-line descriptions split into extra rows, and parenthesized negatives arrive as text. Rebuilding a 40-transaction month by hand reliably costs more than an hour — and the result has no accuracy check at all.",
              "This converter reads the PDF's text positions the way your eye reads the table, then proves the result against the printed balances. The whole process runs in your browser: the statement never uploads anywhere.",
            ],
          },
        ],
        faq: [
          {
            q: "Is the CSV converter really free?",
            a: "Parsing, preview, and reconciliation are free without limits. Free CSV exports cover up to 30 transactions per file; a $12 credit pack (15 documents) or Pro ($24/month) removes the cap.",
          },
          {
            q: "Can I get separate debit and credit columns?",
            a: "Yes — choose 'Debit / credit columns' in the export options. Some accounting imports require that layout instead of one signed column.",
          },
          {
            q: "Will my spreadsheet open the dates correctly?",
            a: "Pick the date format your locale expects (MM/DD/YYYY, DD/MM/YYYY, or ISO). ISO 8601 is the safest for re-importing into databases and scripts.",
          },
        ],
      }}
    />
  );
}
