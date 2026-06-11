import type { Metadata } from "next";
import Link from "next/link";
import { Faq } from "@/components/Faq";

export const metadata: Metadata = {
  title: "MoneyThumb alternative — StatementClear vs MoneyThumb",
  description:
    "An honest comparison with MoneyThumb's desktop converters (2qbo Convert Pro and friends): where a $549 desktop license wins, and where a browser-based converter is the simpler, cheaper answer.",
  alternates: { canonical: "/alternatives/moneythumb/" },
};

export default function Page() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-semibold">StatementClear vs MoneyThumb</h1>
      <p className="mt-3 text-ink-soft">
        MoneyThumb has sold desktop financial-file converters (2qbo Convert
        Pro, 2convert, PDF Insights) for many years, and they're solid tools
        with a real install base among accountants. Here's an honest read on
        when each makes sense.
      </p>

      <h2 className="mt-10 text-xl font-semibold">Where MoneyThumb is better</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-ink-soft">
        <li>
          <span className="font-medium text-ink">OCR for scanned statements.</span>{" "}
          Their PDF+ OCR module reads scans; StatementClear currently reads
          digital PDFs only.
        </li>
        <li>
          <span className="font-medium text-ink">Desktop-native batch workflows.</span>{" "}
          Power users converting large folders of files on a desktop, with
          QuickBooks Desktop-centric workflows, are their home turf.
        </li>
        <li>
          <span className="font-medium text-ink">Lender tooling.</span> Their
          PDF Insights product line adds fraud-detection scoring for lenders —
          a different product category entirely.
        </li>
      </ul>

      <h2 className="mt-10 text-xl font-semibold">Where StatementClear is better</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-ink-soft">
        <li>
          <span className="font-medium text-ink">Price and commitment.</span>{" "}
          As of mid-2026, MoneyThumb's desktop converters run from around $60
          for single-format tools to roughly $549–$599 for 2qbo Convert
          Pro/Pro+, with OCR as a paid add-on; their cloud option starts
          around $25/month for a small monthly conversion quota.
          StatementClear: free preview always, $12 for 15 documents (never
          expires), $24/month unlimited. For occasional use the difference is
          an order of magnitude.
        </li>
        <li>
          <span className="font-medium text-ink">Nothing to install, nothing uploaded.</span>{" "}
          Desktop software keeps files local — credit where due — but requires
          installs, licenses per machine, and updates. StatementClear gets the
          same files-stay-local property in a browser tab, on any machine,
          including the one at a client's office.
        </li>
        <li>
          <span className="font-medium text-ink">Reconciliation proof on every file.</span>{" "}
          Opening + transactions = closing, verified to the cent and shown,
          with broken rows flagged for one-click fixes.
        </li>
        <li>
          <span className="font-medium text-ink">Same formats.</span> QBO, QFX,
          OFX, CSV, Excel, and Xero output — including a free{" "}
          <Link href="/csv-to-qbo/" className="underline">
            CSV→QBO tool
          </Link>{" "}
          for the exact job their single-format converters charge for.
        </li>
      </ul>

      <h2 className="mt-10 text-xl font-semibold">The short version</h2>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">
        High-volume desktop batch work or scanned paper → MoneyThumb. Digital
        PDFs, occasional-to-regular volume, or any privacy-sensitive handoff →{" "}
        <Link href="/#converter" className="underline">
          convert a statement free now
        </Link>{" "}
        and watch it verify.
      </p>

      <div className="mt-12">
        <Faq
          items={[
            {
              q: "Are these prices current?",
              a: "They were checked against MoneyThumb's published prices in mid-2026 and rounded; check their site before buying. The structural difference (hundreds up front vs. $12 as you go) is the durable point.",
            },
            {
              q: "Does StatementClear handle QuickBooks Desktop?",
              a: "Yes — QBO Web Connect files import into both QuickBooks Online and Desktop. Deterministic FITIDs prevent duplicate imports in either.",
            },
          ]}
        />
      </div>
    </div>
  );
}
