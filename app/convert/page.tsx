import type { Metadata } from "next";
import Link from "next/link";
import { BANKS, bankPageSlug } from "@/data/banks";

export const metadata: Metadata = {
  title: "Supported banks — convert any of these statements to CSV",
  description:
    "50 banks and fintechs with dedicated conversion guides: Chase, Bank of America, Wells Fargo, Amex, Wise, PayPal and more. All conversions run in your browser.",
  alternates: { canonical: "/convert/" },
};

const GROUPS: { label: string; region: string[] }[] = [
  { label: "US banks & credit unions", region: ["US"] },
  { label: "Canada", region: ["CA"] },
  { label: "UK & Europe", region: ["UK", "EU"] },
];

export default function ConvertIndexPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-semibold">Convert statements from these banks</h1>
      <p className="mt-2 max-w-2xl text-ink-soft">
        Every page includes how to download that bank&apos;s PDF, the layout
        quirks our parser handles, and the converter itself. Don&apos;t see
        your bank? The generic parser handles most digital statements —{" "}
        <Link href="/#converter" className="underline">
          just try your file
        </Link>
        .
      </p>
      {GROUPS.map((g) => (
        <section key={g.label} className="mt-10">
          <h2 className="text-xl font-semibold">{g.label}</h2>
          <ul className="mt-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {BANKS.filter((b) => g.region.includes(b.region)).map((b) => (
              <li key={b.slug}>
                <Link
                  href={`/convert/${bankPageSlug(b)}/`}
                  className="block rounded-sm border border-rule bg-surface px-3 py-2 text-sm hover:border-rule-strong"
                >
                  {b.name}
                  {b.hasTemplate && (
                    <span className="figures ml-1.5 text-[10px] text-ledger">template</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
