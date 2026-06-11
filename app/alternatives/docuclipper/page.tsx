import type { Metadata } from "next";
import Link from "next/link";
import { Faq } from "@/components/Faq";

export const metadata: Metadata = {
  title: "DocuClipper alternative — StatementClear vs DocuClipper",
  description:
    "An honest comparison: DocuClipper's OCR handles scanned statements and StatementClear doesn't. StatementClear keeps files on your device and costs a fraction as much for digital PDFs.",
  alternates: { canonical: "/alternatives/docuclipper/" },
};

export default function Page() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-semibold">StatementClear vs DocuClipper</h1>
      <p className="mt-3 text-ink-soft">
        DocuClipper is a capable, established cloud converter — if you process
        scanned paper statements, it&apos;s the better tool today and you
        should use it. This page is for deciding honestly; here&apos;s where
        each tool wins.
      </p>

      <h2 className="mt-10 text-xl font-semibold">Where DocuClipper is better</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-ink-soft">
        <li>
          <span className="font-medium text-ink">OCR for scanned statements.</span>{" "}
          DocuClipper reads scans and photos of paper statements. StatementClear
          currently reads digital PDFs only (selectable text).
        </li>
        <li>
          <span className="font-medium text-ink">Team workflow volume.</span>{" "}
          Multi-user accounts and high-volume batch processing are built into
          its subscription tiers.
        </li>
        <li>
          <span className="font-medium text-ink">Adjacent document types.</span>{" "}
          It also processes invoices, receipts, and checks.
        </li>
      </ul>

      <h2 className="mt-10 text-xl font-semibold">Where StatementClear is better</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-ink-soft">
        <li>
          <span className="font-medium text-ink">Your files never upload.</span>{" "}
          DocuClipper processes statements on its servers (with security
          certifications). StatementClear parses in your browser — there is no
          server to trust, which you can verify in DevTools. For client
          financial documents, that's a categorically different privacy
          posture.
        </li>
        <li>
          <span className="font-medium text-ink">Per-file proof instead of an accuracy claim.</span>{" "}
          Every conversion is reconciled against the statement&apos;s own
          opening/closing balances and running balance, and the result is
          shown — not a marketing percentage.
        </li>
        <li>
          <span className="font-medium text-ink">Price.</span> As of mid-2026,
          DocuClipper&apos;s plans start around $39/month (about $27/month
          billed annually) for a 200-page allowance, where every PDF page
          counts — including disclosure pages. StatementClear parses and
          previews free without limits; full exports are $12 for a 15-document
          pack that never expires, or $24/month for unlimited.
        </li>
        <li>
          <span className="font-medium text-ink">Works offline, no account.</span>{" "}
          No sign-up, no seat management, no upload queue.
        </li>
      </ul>

      <h2 className="mt-10 text-xl font-semibold">The short version</h2>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">
        Scanned paper statements → DocuClipper. Digital PDF statements →{" "}
        <Link href="/#converter" className="underline">
          try StatementClear free right now
        </Link>{" "}
        — your first file converts and verifies before you've finished
        DocuClipper's signup form.
      </p>

      <div className="mt-12">
        <Faq
          items={[
            {
              q: "Is this comparison fair? You're the competitor.",
              a: "We try. The OCR point is a real DocuClipper advantage and we say so plainly. Pricing figures were checked against DocuClipper's published plans in mid-2026 and may change — check their pricing page before deciding.",
            },
            {
              q: "Can I use both?",
              a: "Plenty of bookkeepers do: StatementClear for the digital PDFs that are most statements today, a cloud OCR tool for the occasional paper scan.",
            },
          ]}
        />
      </div>
    </div>
  );
}
