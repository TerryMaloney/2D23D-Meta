import type { Metadata } from "next";
import { FormatPage } from "@/components/FormatPage";

export const metadata: Metadata = {
  title: "Bank statement PDF to Xero converter — in your browser",
  description:
    "Convert PDF bank statements to Xero's precoded bank statement CSV (Date, Amount, Payee, Description, Reference) or OFX. No upload — runs in your browser.",
  alternates: { canonical: "/pdf-to-xero/" },
};

export default function Page() {
  return (
    <FormatPage
      content={{
        h1: "PDF bank statement → Xero",
        intro:
          "Export Xero's precoded bank statement CSV — Date, Amount, Payee, Description, Reference — or an OFX file, from any digital statement PDF, verified against the statement's own balances first.",
        sections: [
          {
            heading: "Built for Xero's import screen",
            paragraphs: [
              "Xero's manual bank statement import expects specific columns. The Xero export here emits exactly that layout: signed amounts (money in positive, money out negative), a payee derived from the description, the full description preserved, and check numbers in the Reference column. Choose DD/MM/YYYY or MM/DD/YYYY dates to match your organisation's region setting.",
              "Prefer OFX? Xero imports that too, and the OFX writer here produces spec-correct files with unique transaction IDs so re-imports don't duplicate.",
            ],
          },
          {
            heading: "Backfilling history into Xero",
            paragraphs: [
              "Bank feeds in Xero start from connection day. For everything earlier — new clients, migrated books, closed accounts — statement PDFs are what you have. Convert each month, confirm the green 'verified to the cent' banner, and import: reconciliation in Xero goes smoothly because the data already reconciled here.",
            ],
          },
        ],
        faq: [
          {
            q: "Which Xero import option do I use?",
            a: "In Xero: Accounting → Bank accounts → Manage account → Import a statement. Upload the CSV from here and map columns if prompted — they're already in Xero's expected order.",
          },
          {
            q: "My organisation uses DD/MM/YYYY. Is that supported?",
            a: "Yes — pick DD/MM/YYYY in the export options (it's the default for the Xero format). US organisations can switch to MM/DD/YYYY.",
          },
          {
            q: "CSV or OFX for Xero?",
            a: "Both work. OFX carries transaction IDs that help Xero avoid duplicates on re-import; CSV is easier to inspect and edit first. When in doubt, use OFX.",
          },
        ],
      }}
    />
  );
}
