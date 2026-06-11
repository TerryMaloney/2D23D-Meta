import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GUIDES, guideBySlug } from "@/data/guides";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const guide = guideBySlug(slug);
  if (!guide) return {};
  return {
    title: guide.title,
    description: guide.description,
    alternates: { canonical: `/guides/${guide.slug}/` },
  };
}

export default async function GuidePage({ params }: Props) {
  const { slug } = await params;
  const guide = guideBySlug(slug);
  if (!guide) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: guide.title,
    description: guide.description,
    dateModified: guide.updated,
    author: { "@type": "Organization", name: "StatementClear" },
  };

  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <nav className="text-xs text-ink-soft" aria-label="Breadcrumb">
        <Link href="/guides/" className="underline">
          Guides
        </Link>
      </nav>
      <h1 className="mt-2 text-3xl font-semibold leading-tight">{guide.title}</h1>
      <p className="figures mt-3 text-xs text-ink-soft">
        {guide.minutes} min read · updated {guide.updated}
      </p>

      {guide.sections.map((s) => (
        <section key={s.heading} className="mt-10">
          <h2 className="text-xl font-semibold">{s.heading}</h2>
          {s.paragraphs.map((p, i) => (
            <p key={i} className="mt-3 leading-relaxed text-ink-soft">
              {p}
            </p>
          ))}
          {s.list &&
            (s.ordered ? (
              <ol className="mt-3 list-decimal space-y-2 pl-5 leading-relaxed text-ink-soft">
                {s.list.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ol>
            ) : (
              <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed text-ink-soft">
                {s.list.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            ))}
        </section>
      ))}

      <aside className="mt-12 rounded-sm border border-rule bg-surface p-5 text-sm">
        <p className="font-medium">Convert a statement while you&apos;re here</p>
        <p className="mt-1 text-ink-soft">
          The converter parses statement PDFs in your browser and verifies
          every file against its own balances —{" "}
          <Link href="/#converter" className="underline">
            try it with this month&apos;s statement
          </Link>
          .
        </p>
      </aside>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </article>
  );
}
