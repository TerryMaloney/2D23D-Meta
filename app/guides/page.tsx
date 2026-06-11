import type { Metadata } from "next";
import Link from "next/link";
import { GUIDES } from "@/data/guides";

export const metadata: Metadata = {
  title: "Guides — statements, QuickBooks, Xero, and clean books",
  description:
    "Practical guides: importing statements into QuickBooks Online and Xero, statement analysis in Excel, fixing QBO import failures, and year-end cleanup.",
  alternates: { canonical: "/guides/" },
};

export default function GuidesPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-semibold">Guides</h1>
      <p className="mt-2 text-ink-soft">
        Written from the workflows this tool was built for — no filler.
      </p>
      <ul className="mt-8 space-y-4">
        {GUIDES.map((g) => (
          <li key={g.slug} className="rounded-sm border border-rule bg-surface p-5">
            <Link href={`/guides/${g.slug}/`} className="text-lg font-semibold hover:underline">
              {g.title}
            </Link>
            <p className="mt-1.5 text-sm text-ink-soft">{g.description}</p>
            <p className="figures mt-2 text-xs text-ink-soft">
              {g.minutes} min read · updated {g.updated}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
