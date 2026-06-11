export interface FaqItem {
  q: string;
  a: string;
}

/** Accessible FAQ with FAQPage JSON-LD. */
export function Faq({ items, heading = "Questions" }: { items: FaqItem[]; heading?: string }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((i) => ({
      "@type": "Question",
      name: i.q,
      acceptedAnswer: { "@type": "Answer", text: i.a },
    })),
  };
  return (
    <section aria-labelledby="faq-heading">
      <h2 id="faq-heading" className="text-2xl font-semibold">
        {heading}
      </h2>
      <dl className="mt-6 divide-y divide-rule border-y border-rule">
        {items.map((i) => (
          <div key={i.q} className="py-4">
            <dt className="font-medium">{i.q}</dt>
            <dd className="mt-1.5 text-sm leading-relaxed text-ink-soft">{i.a}</dd>
          </div>
        ))}
      </dl>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </section>
  );
}
