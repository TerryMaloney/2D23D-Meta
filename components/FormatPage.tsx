import Link from "next/link";
import { ConverterIsland } from "@/components/ConverterIsland";
import { Faq, FaqItem } from "@/components/Faq";

export interface FormatPageContent {
  h1: string;
  intro: string;
  sections: { heading: string; paragraphs: string[] }[];
  faq: FaqItem[];
}

export function FormatPage({ content }: { content: FormatPageContent }) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-semibold">{content.h1}</h1>
      <p className="mt-3 max-w-2xl text-ink-soft">{content.intro}</p>
      <div className="mt-8">
        <ConverterIsland />
      </div>
      <div className="mt-16 grid max-w-4xl gap-10">
        {content.sections.map((s) => (
          <section key={s.heading}>
            <h2 className="text-xl font-semibold">{s.heading}</h2>
            {s.paragraphs.map((p, i) => (
              <p key={i} className="mt-3 text-sm leading-relaxed text-ink-soft">
                {p}
              </p>
            ))}
          </section>
        ))}
        <p className="text-sm text-ink-soft">
          Looking for your bank specifically? See the{" "}
          <Link href="/convert/" className="underline">
            50 supported banks
          </Link>
          .
        </p>
      </div>
      <div className="mt-16 max-w-3xl">
        <Faq items={content.faq} />
      </div>
    </div>
  );
}
