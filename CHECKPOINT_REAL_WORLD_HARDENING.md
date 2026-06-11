# Checkpoint — Real-World Hardening & Statement History Audit

**Date:** June 11, 2026
**Branch:** `claude/statementclear-real-world-hardening` (from `claude/profitable-ai-project-plan-8mfl76` @ `017e949`)
**Verification state:** every number below was reproduced from a **clean checkout** (`git clone` → `npm ci` → full suite) immediately before this checkpoint was written.

---

## What was actually built

### 1. Independent baseline verification (commit `addef4e`)
All prior checkpoint claims re-run from a clean install — none failed. Gap
closed: E2E previously downloaded only CSV; now every export format is
downloaded through the real UI and inspected byte-by-byte (XLSX parsed with
SheetJS for typed cells; OFX-family checked for headers, unique FITIDs,
INTU.BID flavor rules; Xero/CSV column-exact). Full record:
`docs/BASELINE_VERIFICATION.md`.

### 2. Privacy-safe real-statement validation framework (commit `c328ae2`)
- `npm run validate:statements` — parses private PDFs from a gitignored
  folder with the production engine, locally, and emits ONLY sanitized
  summaries (anon IDs, counts, status, difference-in-cents). Verified by
  test and by grep that no statement content survives into its output.
- **Anonymizer** moved into the parser package and made twin-capable:
  date-shaped tokens become valid random dates of the same format; SSN
  shapes and 7+-digit runs are stripped; plausible years are kept.
- **Layout twins** (`packages/parser/fixtures/layout-twin.ts`): rebuild a
  committable synthetic PDF from an anonymized layout with regenerated,
  internally consistent amounts — twins parse and reconcile `verified`
  through the production engine. PII-survival tests included.
- **Public corpus**: 10 documents located, 9 retrieved, all 9
  manifest-documented (`packages/parser/fixtures/real/manifest.json`) with
  source URL, provenance class, license basis, SHA-256. 3 are US federal
  works (public domain) and are committed; 6 are cache-only with graceful
  test skipping. **None are real customer statements** — they are bank
  specimens (2), educational samples (6), and a government model form (1).

### 3. Parser hardening from real failures (commit `354c04d`)
First-contact results: 0 of 9 documents verified. After hardening:

| Document | Before | After |
| --- | --- | --- |
| Fed G-18(G) model credit-card statement | UNRECOGNIZED_LAYOUT | **verified to the cent** (32 tx) |
| Money Mentors educational statement | NOT_A_STATEMENT | **verified** (8 tx, balance chain) |
| Carson Bank 6-page specimen | failed, $20k off (grids parsed as tx) | parses 46 tx, every balance checkpoint verifies; **partial** because the specimen's own pages contradict each other |
| Commerce Bank specimen | failed, deposit row missed | parses all 5 tx with correct signs; **fails by exactly $105.00 because the document's own summary omits two checks its detail lists** |
| St. Paul teaching collage | 4 tx, wrong signs | parses with correct signs; partial (annotations interleave the table) |
| CFPB ×2, UGA (graphics without transaction tables) | typed errors | typed errors (correct fail-closed) |
| SaskMoney (image-only) | SCANNED_PDF | SCANNED_PDF (correct) |

Nine engine improvements, each with committed regression coverage
(`sectioned-sample` and `regz-card` golden fixtures + 9 unit tests +
the public-domain Fed PDF asserted in CI): summary-grid exclusion,
generic section-sign context, description-first rows, generic credit-card
detection, two-label summary rows, en-dash negatives, dateless interest
rows, lone closing-date periods, header/continuation separation.
Details: `docs/REAL_WORLD_VALIDATION.md`.

### 4. Statement History Audit (commits `9063a3c`, `ff4ce96`)
New primary feature at `/audit`: drop many statements → local parsing with
per-file progress → account grouping (masked IDs) → chronological inventory
→ findings (missing periods, overlaps, duplicate statements, balance
discontinuities, potential duplicate transactions, recurring payments/
deposits, fees/interest, unusually large transactions) → monthly cash-flow
→ exports: merged CSV, six-sheet typed-cell XLSX workbook, per-account QBO
(accounts never merged into one file), printable local HTML report with a
privacy statement. Unverified statements are never silently merged —
verified-only is the default and the alternative is an explicit checkbox;
unreadable files are quarantined visibly. Finding language is deliberately
observational ("potential duplicate", "review recommended") — no fraud/
advice claims.

One-click demos exercise the real pipeline: homepage "Try a sample
statement" and `/audit` "Try a sample 12-month audit" (bundled synthetic
set with a missing July, recurring subscription + payroll, a service fee,
and a duplicate-transaction warning).

### 5. Continuous verification (commit `0c405ac`)
`.github/workflows/verify.yml`: lint → unit/golden → TEST_MODE build →
Playwright → production build, report artifact on failure, README badge.

---

## Exact counts (clean-checkout reproduction)

| Check | Result |
| --- | --- |
| `npm run lint` | 0 errors, 0 warnings |
| `npx vitest run` | **113 passed, 6 skipped** (the 6 = cache-only corpus PDFs not present in a fresh clone — by design), 119 total |
| `NEXT_PUBLIC_TEST_MODE=true npm run build` | 74/74 static pages |
| `npm run e2e` | **16/16 passed** (converter flows, all export formats byte-inspected, audit flows, both demos, 2 network-privacy tests) |
| `npm run build` (production) | 74/74 static pages |

Corpus: 10 located / 9 retrieved / 9 usable / 3 committed / 6 local-only /
1 layout-twin pipeline (tested via the Chase fixture round-trip) /
institutions: Carson Bank, Commerce Bank, Federal Reserve model form, CFPB,
plus fictional teaching banks / types: checking 4, credit card 5 /
verified 2, parsed-with-correct-fail-closed 3, typed-error 4.

## Reproduce it yourself

```bash
git clone <repo> && cd <repo> && git checkout claude/statementclear-real-world-hardening
npm ci
npm run lint
npx vitest run
NEXT_PUBLIC_TEST_MODE=true npm run build
npx playwright install chromium
npm run e2e
npm run build
```

## Commits in this phase

```
addef4e  Verify existing application and repair baseline failures
c328ae2  Add privacy-safe real-statement validation framework
354c04d  Harden parser against real-world statement layouts
9063a3c  Add private multi-statement history audit
ff4ce96  Add interactive statement and audit demonstrations
0c405ac  Add continuous integration and export verification
(this)   Final truth audit, documentation, and hardening checkpoint
```

---

## Honest limitations — what is NOT claimed

- **No real customer statement has been parsed.** The corpus is specimens,
  educational samples, and a model form. Real coverage comes from the owner
  running `npm run validate:statements` locally; that loop is built and
  tested, but its results don't exist yet.
- **No universal bank support.** 10 dedicated templates + a generic parser
  that now survives several real-world layout classes; the corpus is small
  because legitimately redistributable statements are scarce.
- **No accuracy percentage** is quoted anywhere; per-file reconciliation is
  the accuracy mechanism.
- **No OCR.** Scanned PDFs still get an honest typed error. (Stretch work
  not undertaken; the existing error copy and waitlist remain truthful.)
- **No production deployment, no real payments, no users, no revenue.**
  Polar/Cloudflare setup remains owner work per `OWNERS_MANUAL.md`.
- The Carson/Commerce reconciliation "failures" are the parser being
  *right* about internally inconsistent documents — but they also mean two
  of the four genuinely bank-generated layouts in the corpus cannot fully
  verify, and that distinction is invisible to a casual reader of test
  output. The manifest documents it.
- The license consume/verify Pages Functions are still exercised only in
  TEST_MODE.

## Deploy-readiness verdict

The application is honestly ready for **public testing**: every gate that
can pass without owner accounts passes from a clean checkout, the privacy
invariant is enforced by tests (single files and batches), failure modes
are typed and fail closed, and CI guards regressions. The two things that
should happen before promoting it beyond testing: the owner's local
validation run over real statements from their own banks, and the payment
flow exercised once with real Polar credentials.
