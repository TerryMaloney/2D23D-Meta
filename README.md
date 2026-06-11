# StatementClear

[![verify](https://github.com/TerryMaloney/spiral-blog/actions/workflows/verify.yml/badge.svg)](https://github.com/TerryMaloney/spiral-blog/actions/workflows/verify.yml)

Privacy-first bank statement converter: PDF statements → CSV · Excel (XLSX) ·
QBO · QFX · OFX · Xero — parsed **entirely in the browser** (files never touch
a server; there is no upload endpoint in this codebase) and **reconciled
against the statement's own opening/closing balances** on every file.

**Operating instructions live in [OWNERS_MANUAL.md](./OWNERS_MANUAL.md)** —
deployment (Cloudflare Pages, free), payments (Polar.sh, merchant of record),
adding bank templates, pricing changes, analytics.

## Layout

| Path | What it is |
| --- | --- |
| `packages/parser` | Framework-free parsing engine: extraction → rows → fields → templates → generic parser → reconciliation, plus the cross-statement **audit engine**, the anonymizer, and layout-twin tooling. Unit-tested against generated fixture PDFs with golden files AND a manifest-documented real-world public corpus. |
| `packages/exporters` | CSV, Xero CSV, OFX 1.02 (QBO/QFX/OFX), XLSX writers + the six-sheet audit workbook. Golden-tested. |
| `app/` | Next.js (static export) site: converter homepage, **Statement History Audit** (`/audit`), CSV→QBO tool, pricing, 50 bank SEO pages, format pages, comparisons, 5 guides. |
| `functions/` | The only server code: Cloudflare Pages Functions for license verify/consume (Polar proxy) and the privacy-safe event beacon. |
| `data/` | SEO content as data (banks, guides). |
| `e2e/` | Playwright suite: converter + audit flows, byte-level inspection of every export format, and the privacy invariant (no off-origin requests while converting — single files or batches). |
| `scripts/` | Local tooling, including `validate-statements.ts` (private-statement validator emitting sanitized summaries only). |

## Commands

```bash
npm test                  # parser + exporter + audit suites (119 tests)
npm run dev               # local dev
npm run build             # static export → out/
npm run fixtures          # regenerate synthetic statement fixtures
npm run validate:statements   # parse private PDFs locally; sanitized summary only
NEXT_PUBLIC_TEST_MODE=true npm run build && npm run e2e  # E2E (16 tests)
```

CI runs all of the above on every push (`.github/workflows/verify.yml`).

## Invariants (do not break)

1. **No statement data ever leaves the browser.** No upload endpoint, no
   network call in the parse path, beacon payloads are enums/numbers only.
2. **Every successful parse must reconcile.** The property test enforces
   `verified` status on all fixtures.
3. **No fabricated marketing.** No invented testimonials, counters, or
   accuracy percentages — claims must be user-verifiable.
