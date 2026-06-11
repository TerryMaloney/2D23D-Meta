import type { Metadata } from "next";
import { FormatPage } from "@/components/FormatPage";

export const metadata: Metadata = {
  title: "Bank statement PDF to Excel (XLSX) converter — in your browser",
  description:
    "Convert PDF bank statements to Excel with typed date and currency cells — not text — plus a reconciliation summary. No upload; runs in your browser.",
  alternates: { canonical: "/pdf-to-excel/" },
};

export default function Page() {
  return (
    <FormatPage
      content={{
        h1: "PDF bank statement → Excel (XLSX)",
        intro:
          "Get a real spreadsheet, not text that looks like one: dates are date cells, amounts are numbers with accounting formats, and the reconciliation result travels with the file.",
        sections: [
          {
            heading: "Typed cells matter",
            paragraphs: [
              "Most PDF-to-Excel tools dump strings. Then SUM() returns zero, pivot tables refuse to group by month, and you spend an evening with VALUE() and text-to-columns. This converter writes typed XLSX cells: dates carry real date values with a date format, amounts are numeric with a two-decimal accounting format that renders negatives in red, and the header row is frozen for scrolling.",
              "Below your transactions, a summary block records the reconciliation: opening balance, transaction total, closing balance, and whether the file verified to the cent — so the spreadsheet itself documents that the data is complete.",
            ],
          },
          {
            heading: "From PDF to pivot table in under a minute",
            paragraphs: [
              "Drop the statement, watch the reconciliation banner verify it, export XLSX, and open it in Excel, Google Sheets, or Numbers. Month-by-month spending pivots, payee analysis, and cash-flow charts work immediately because the types are right.",
              "Everything runs client-side. Your statement is never uploaded — verify it in your browser's Network tab while converting.",
            ],
          },
        ],
        faq: [
          {
            q: "Does it work with Google Sheets?",
            a: "Yes — the XLSX file imports into Google Sheets with dates and numbers intact. (Sheets ignores the frozen header pane on import; everything else carries over.)",
          },
          {
            q: "Are negative amounts formatted like an accountant expects?",
            a: "Amounts use a number format that shows negatives in red with a minus sign. The underlying values are true negatives, so sums and pivots are correct.",
          },
          {
            q: "How many transactions can I export free?",
            a: "Up to 30 per file on the free plan. The full preview is always free; a $12 credit pack or Pro unlocks complete exports.",
          },
        ],
      }}
    />
  );
}
