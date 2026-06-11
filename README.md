# StatementClear

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
| `packages/parser` | Framework-free parsing engine: extraction → rows → fields → templates → generic parser → reconciliation. Fully unit-tested against generated fixture PDFs with golden files. |
| `packages/exporters` | CSV, Xero CSV, OFX 1.02 (QBO/QFX/OFX), XLSX writers. Golden-tested. |
| `app/` | Next.js (static export) site: converter homepage, CSV→QBO tool, pricing, 50 bank SEO pages, format pages, comparisons, 5 guides. |
| `functions/` | The only server code: Cloudflare Pages Functions for license verify/consume (Polar proxy) and the privacy-safe event beacon. |
| `data/` | SEO content as data (banks, guides). |
| `e2e/` | Playwright suite, including the privacy invariant (no off-origin requests during a conversion). |

## Commands

```bash
npm test             # parser + exporter suites (74 tests)
npm run dev          # local dev
npm run build        # static export → out/
npm run fixtures     # regenerate synthetic statement fixtures
NEXT_PUBLIC_TEST_MODE=true npm run build && npm run e2e  # E2E (7 tests)
```

## Invariants (do not break)

1. **No statement data ever leaves the browser.** No upload endpoint, no
   network call in the parse path, beacon payloads are enums/numbers only.
2. **Every successful parse must reconcile.** The property test enforces
   `verified` status on all fixtures.
3. **No fabricated marketing.** No invented testimonials, counters, or
   accuracy percentages — claims must be user-verifiable.
