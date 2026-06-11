import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ConverterIsland } from "@/components/ConverterIsland";
import { Faq } from "@/components/Faq";
import { BANKS, bankBySlug, bankPageSlug } from "@/data/banks";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return BANKS.map((b) => ({ slug: bankPageSlug(b) }));
}

export const dynamicParams = false;

function bankFromParam(slug: string) {
  return slug.endsWith("-statement-to-csv")
    ? bankBySlug(slug.replace(/-statement-to-csv$/, ""))
    : undefined;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const bank = bankFromParam(slug);
  if (!bank) return {};
  return {
    title: `Convert ${bank.name} statements to CSV, Excel & QBO`,
    description: `Turn ${bank.name} PDF statements into CSV, Excel, QBO/QFX/OFX, or Xero files — in your browser, never uploaded, verified against the statement's own balances.`,
    alternates: { canonical: `/convert/${slug}/` },
  };
}

export default async function BankPage({ params }: Props) {
  const { slug } = await params;
  const bank = bankFromParam(slug);
  if (!bank) notFound();

  const faq = [
    ...bank.faq,
    {
      q: `Is it safe to convert ${bank.name} statements online?`,
      a: `Here, the word "online" only describes the website — the conversion itself runs in your browser. Your ${bank.name} statement is never uploaded; you can watch the Network tab in DevTools while converting, or go offline after the page loads.`,
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <nav className="text-xs text-ink-soft" aria-label="Breadcrumb">
        <Link href="/convert/" className="underline">
          Supported banks
        </Link>{" "}
        / {bank.name}
      </nav>
      <h1 className="mt-2 text-3xl font-semibold">
        Convert {bank.name} statements to CSV, Excel, QBO & Xero
      </h1>
      <p className="mt-3 max-w-2xl text-ink-soft">
        Drop a {bank.name} PDF statement below. It parses in your browser
        {bank.hasTemplate ? " with a dedicated template for this layout" : ""},
        reconciles against its own printed balances, and exports to the format
        your books need. The file never leaves your device.
      </p>

      <div className="mt-8">
        <ConverterIsland />
      </div>

      <div className="mt-16 grid gap-12 lg:grid-cols-2">
        <section>
          <h2 className="text-xl font-semibold">
            How to download a PDF statement from {bank.name}
          </h2>
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-ink-soft">
            {bank.downloadSteps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
          <p className="mt-4 text-sm leading-relaxed text-ink-soft">
            Use the bank&apos;s own PDF download, not a scan or photo — the
            converter reads digital PDFs (selectable text). Menus occasionally
            move; statements typically live under a Statements or Documents
            section once you&apos;re signed in.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">
            What {bank.name} exports natively — and the gap
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-ink-soft">{bank.nativeExports}</p>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">{bank.gap}</p>
        </section>
      </div>

      <section className="mt-12">
        <h2 className="text-xl font-semibold">
          {bank.name} statement quirks this parser handles
        </h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-ink-soft">
          {bank.quirks.map((q) => (
            <li key={q}>{q}</li>
          ))}
        </ul>
      </section>

      <section className="mt-12 rounded-sm border border-rule bg-surface p-5 text-sm">
        <h2 className="font-semibold">Export formats</h2>
        <p className="mt-2 text-ink-soft">
          {bank.name} statements convert to{" "}
          <Link className="underline" href="/pdf-to-csv/">
            CSV
          </Link>
          ,{" "}
          <Link className="underline" href="/pdf-to-excel/">
            Excel (XLSX)
          </Link>
          ,{" "}
          <Link className="underline" href="/pdf-to-qbo/">
            QBO for QuickBooks
          </Link>
          , QFX for Quicken, OFX, and{" "}
          <Link className="underline" href="/pdf-to-xero/">
            Xero&apos;s precoded CSV
          </Link>
          . Free exports cover up to 30 transactions per file —{" "}
          <Link className="underline" href="/pricing/">
            pricing
          </Link>{" "}
          for more.
        </p>
      </section>

      <div className="mt-16 max-w-3xl">
        <Faq items={faq} heading={`${bank.name} conversion questions`} />
      </div>
    </div>
  );
}
