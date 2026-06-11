import type { Metadata } from "next";
import { ConverterIsland } from "@/components/ConverterIsland";
import { Faq } from "@/components/Faq";

export const metadata: Metadata = {
  title: "Convert bank statements to CSV, Excel, QBO — in your browser | StatementClear",
  description:
    "Drop a PDF bank statement and get CSV, Excel, QBO/QFX/OFX, or Xero-ready output. Files never upload — parsing runs in your browser — and every statement is verified against its own opening and closing balances.",
  alternates: { canonical: "/" },
};

const FAQ = [
  {
    q: "Does my statement really never leave my device?",
    a: "Correct. The parser runs in your browser tab; this site has no upload endpoint at all. You can verify it yourself: open your browser's DevTools, switch to the Network tab, and convert a file — no request carries your statement. The converter keeps working with Wi-Fi off.",
  },
  {
    q: "How do I know the conversion is accurate?",
    a: "Every statement contains its own answer key: opening balance plus transactions must equal closing balance. StatementClear checks that equation — and the running balance after every row — and shows you the result. If a row breaks the chain, it's highlighted for a one-click fix.",
  },
  {
    q: "Which formats can I export?",
    a: "CSV (configurable columns and date formats), Excel XLSX with typed date and currency cells, QBO for QuickBooks, QFX for Quicken, OFX for Xero/Wave/GnuCash, and Xero's precoded statement CSV.",
  },
  {
    q: "Does it work with scanned statements?",
    a: "Not yet — digital PDFs only for now (the kind you download from your bank, where text is selectable). Scans need OCR, which is on the roadmap.",
  },
  {
    q: "Which banks are supported?",
    a: "Statements from major US banks (Chase, Bank of America, Wells Fargo, Citi, Capital One, Amex, US Bank and more) parse with dedicated templates, and a generic parser handles most other digital statements. If a layout fails, the built-in reporter creates an anonymized layout file you can send so support can be added — usually within days.",
  },
  {
    q: "What does it cost?",
    a: "Parsing and the full preview are free, always. Free exports are capped at 30 transactions per file. A $12 credit pack covers 15 documents (never expires); Pro is $24/month or $149/year for unlimited exports.",
  },
];

export default function HomePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      {/* Hero: the converter IS the homepage. */}
      <section className="pt-10 sm:pt-14">
        <div className="grid items-end gap-6 pb-8 sm:grid-cols-[1fr_auto]">
          <div>
            <h1 className="max-w-2xl text-3xl font-semibold leading-tight sm:text-4xl">
              Convert bank statements to CSV, Excel, or QuickBooks — without
              uploading them anywhere.
            </h1>
            <p className="mt-3 max-w-2xl text-ink-soft">
              Drop a PDF. Watch it reconcile to the cent against its own
              printed balances. Export clean data. Your file stays on this
              device, start to finish.
            </p>
          </div>
          <ul className="figures space-y-1 text-sm text-ink-soft">
            <li>→ CSV · XLSX</li>
            <li>→ QBO · QFX · OFX</li>
            <li>→ Xero CSV</li>
          </ul>
        </div>
        <ConverterIsland />
      </section>

      {/* Proof, not promises. */}
      <section className="mt-20 grid gap-10 sm:grid-cols-2">
        <div>
          <h2 className="text-2xl font-semibold">
            Accuracy you can check, not a percentage we claim
          </h2>
          <p className="mt-3 leading-relaxed text-ink-soft">
            A bank statement carries its own answer key: opening balance +
            every transaction = closing balance. After parsing, StatementClear
            verifies that equation to the cent, re-checks the running balance
            after each row, and cross-checks the printed deposit and
            withdrawal totals. The result is shown on every file — green only
            when the math holds.
          </p>
          <p className="mt-3 leading-relaxed text-ink-soft">
            When something doesn&apos;t add up, you see exactly which rows broke
            the chain, and fixing one is a click. Nothing exports silently
            wrong.
          </p>
        </div>
        <div className="figures self-center rounded-sm border border-rule bg-surface p-5 text-sm shadow-sm">
          <p className="text-ink-soft"># every file, every time</p>
          <p className="mt-2">
            Opening <span className="font-medium">$4,210.55</span>
          </p>
          <p>
            + 38 transactions <span className="text-ledger">+$6,102.10</span> /{" "}
            <span className="text-negative">−$5,891.40</span>
          </p>
          <p className="mt-1 border-t border-rule pt-1">
            = Closing <span className="font-medium">$4,421.25</span>{" "}
            <span className="text-ledger">✓ verified to the cent</span>
          </p>
        </div>
      </section>

      {/* Honest comparison strip. */}
      <section className="mt-20">
        <h2 className="text-2xl font-semibold">Compared honestly with cloud converters</h2>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-rule-strong text-left">
                <th className="py-2 pr-4 font-semibold"> </th>
                <th className="py-2 pr-4 font-semibold">StatementClear</th>
                <th className="py-2 font-semibold">Cloud converters</th>
              </tr>
            </thead>
            <tbody className="[&_td]:py-2.5 [&_td]:pr-4 [&_tr]:border-b [&_tr]:border-rule">
              <tr>
                <td className="text-ink-soft">Where your statement goes</td>
                <td>Stays in your browser — verifiable in DevTools</td>
                <td>Uploaded to their servers for processing</td>
              </tr>
              <tr>
                <td className="text-ink-soft">Accuracy</td>
                <td>Reconciled per file against printed balances</td>
                <td>Accuracy percentages claimed in marketing</td>
              </tr>
              <tr>
                <td className="text-ink-soft">Scanned PDFs (OCR)</td>
                <td>Not yet — digital PDFs only</td>
                <td>Often supported — genuinely better for scans</td>
              </tr>
              <tr>
                <td className="text-ink-soft">Free tier</td>
                <td>Unlimited parsing + preview; 30-transaction exports</td>
                <td>Usually page-limited trials</td>
              </tr>
              <tr>
                <td className="text-ink-soft">Works offline</td>
                <td>Yes</td>
                <td>No</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm text-ink-soft">
          If you need OCR for paper scans today, a cloud converter like
          DocuClipper is the right tool — see our{" "}
          <a href="/alternatives/docuclipper/" className="underline">
            honest comparison
          </a>
          .
        </p>
      </section>

      <section className="mt-20 max-w-3xl">
        <Faq items={FAQ} />
      </section>
    </div>
  );
}
