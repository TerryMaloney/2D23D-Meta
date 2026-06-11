import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "What StatementClear can see: nothing in your statements. Parsing runs in your browser; this site has no upload endpoint. Verify it yourself in DevTools.",
  alternates: { canonical: "/privacy/" },
};

export default function PrivacyPage() {
  return (
    <article className="prose-headings:font-serif mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-semibold">Privacy, in plain English</h1>

      <h2 className="mt-10 text-xl font-semibold">What we can see in your statements: nothing</h2>
      <p className="mt-3 leading-relaxed text-ink-soft">
        When you convert a statement, the PDF is opened by code running in
        your browser tab. The text extraction, the parsing, the
        reconciliation, and the export file are all produced on your device.
        This site has no upload endpoint — there is no server that could
        receive your statement, which is a stronger guarantee than a promise
        not to look at it.
      </p>
      <p className="mt-3 leading-relaxed text-ink-soft">
        Don&apos;t take our word for it: open your browser&apos;s DevTools
        (F12), switch to the Network tab, and convert a file. You&apos;ll see
        that no request contains your statement. You can also turn Wi-Fi off
        after the page loads — the converter keeps working.
      </p>

      <h2 className="mt-10 text-xl font-semibold">What does leave your browser</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed text-ink-soft">
        <li>
          <span className="font-medium text-ink">Anonymous usage events.</span>{" "}
          Tiny signals like &quot;a parse succeeded with template X in N
          milliseconds&quot; or &quot;an export happened in format Y&quot;.
          They contain only those enum values and numbers — never filenames,
          amounts, descriptions, or anything derived from your file&apos;s
          contents. We use Cloudflare&apos;s cookieless analytics; there is no
          advertising tracker on this site.
        </li>
        <li>
          <span className="font-medium text-ink">Your license key,</span> if
          you buy one, is sent to our license server to check it&apos;s valid.
          That request contains the key string and nothing else.
        </li>
        <li>
          <span className="font-medium text-ink">Failure reports — only if you send them.</span>{" "}
          When a statement fails to parse, you can generate an anonymized
          layout file: words are replaced with hashes, every number is
          replaced with a random one of the same shape, and account numbers
          are stripped. You see the file&apos;s exact contents first, and it
          goes nowhere unless you email it to us yourself.
        </li>
      </ul>

      <h2 className="mt-10 text-xl font-semibold">Payments</h2>
      <p className="mt-3 leading-relaxed text-ink-soft">
        Purchases are processed by our merchant of record, which handles your
        card details and applicable sales tax/VAT. We receive your email
        address (to deliver the license key) and never see your card number.
      </p>

      <h2 className="mt-10 text-xl font-semibold">Cookies and storage</h2>
      <p className="mt-3 leading-relaxed text-ink-soft">
        We don&apos;t set tracking cookies. Your license state is stored in
        your own browser&apos;s localStorage so exports work offline. Clearing
        site data removes it; re-entering your key restores it.
      </p>

      <h2 className="mt-10 text-xl font-semibold">Questions</h2>
      <p className="mt-3 leading-relaxed text-ink-soft">
        Email <a className="underline" href="mailto:support@statementclear.com">support@statementclear.com</a>.
      </p>
    </article>
  );
}
