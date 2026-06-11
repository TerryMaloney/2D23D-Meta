import Link from "next/link";

const COLUMNS: { heading: string; links: [string, string][] }[] = [
  {
    heading: "Convert",
    links: [
      ["PDF to CSV", "/pdf-to-csv/"],
      ["PDF to Excel", "/pdf-to-excel/"],
      ["PDF to QBO", "/pdf-to-qbo/"],
      ["PDF to Xero", "/pdf-to-xero/"],
      ["CSV to QBO", "/csv-to-qbo/"],
    ],
  },
  {
    heading: "Popular banks",
    links: [
      ["Chase", "/convert/chase-statement-to-csv/"],
      ["Bank of America", "/convert/bank-of-america-statement-to-csv/"],
      ["Wells Fargo", "/convert/wells-fargo-statement-to-csv/"],
      ["American Express", "/convert/american-express-statement-to-csv/"],
      ["All 50 banks", "/convert/"],
    ],
  },
  {
    heading: "Learn",
    links: [
      ["Guides", "/guides/"],
      ["vs. DocuClipper", "/alternatives/docuclipper/"],
      ["vs. MoneyThumb", "/alternatives/moneythumb/"],
      ["Pricing", "/pricing/"],
      ["Privacy", "/privacy/"],
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-rule bg-surface">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-4 sm:px-6">
        <div>
          <p className="font-serif font-semibold">StatementClear</p>
          <p className="mt-2 text-sm text-ink-soft">
            Statements convert in your browser. Files never touch a server —
            the converter even works offline.
          </p>
        </div>
        {COLUMNS.map((col) => (
          <nav key={col.heading} aria-label={col.heading}>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
              {col.heading}
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              {col.links.map(([label, href]) => (
                <li key={href}>
                  <Link href={href} className="text-ink-soft hover:text-ink">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-rule">
        <p className="mx-auto max-w-6xl px-4 py-4 text-xs text-ink-soft sm:px-6">
          © {new Date().getFullYear()} StatementClear. Not affiliated with any
          bank named on this site; bank names identify which statement formats
          the converter reads.
        </p>
      </div>
    </footer>
  );
}
