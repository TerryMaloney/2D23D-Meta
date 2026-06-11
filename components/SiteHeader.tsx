import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-rule bg-surface">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="font-serif text-lg font-semibold tracking-tight">
            StatementClear
          </span>
          <span className="figures hidden text-[11px] text-ink-soft sm:inline">
            PDF → CSV · XLSX · QBO · Xero
          </span>
        </Link>
        <nav className="flex items-center gap-4 text-sm sm:gap-6">
          <Link href="/audit/" className="text-ink-soft hover:text-ink">
            History Audit
          </Link>
          <Link href="/csv-to-qbo/" className="text-ink-soft hover:text-ink">
            CSV→QBO
          </Link>
          <Link href="/guides/" className="hidden text-ink-soft hover:text-ink sm:inline">
            Guides
          </Link>
          <Link href="/pricing/" className="text-ink-soft hover:text-ink">
            Pricing
          </Link>
          <Link
            href="/#converter"
            className="rounded-sm bg-ink px-3 py-1.5 font-medium text-white hover:bg-ink/85"
          >
            Convert a statement
          </Link>
        </nav>
      </div>
    </header>
  );
}
