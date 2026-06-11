# StatementClear — Project Checkpoint Packet

**Date:** June 11, 2026
**Repository:** `TerryMaloney/spiral-blog`, branch `claude/profitable-ai-project-plan-8mfl76`
**Status:** ✅ Build complete and verified. Not yet deployed — deployment requires owner accounts (Cloudflare, Polar, domain), estimated 1 hour and ~$10.

This packet is the single document to show anyone — a partner, an accountant friend, a potential collaborator — what was built, how it works, why it can make money, and what happens next. Screenshots are in `docs/checkpoint-assets/`.

---

## 1. Executive summary

**StatementClear** is a web product that converts PDF bank and credit-card statements into the formats bookkeepers and small businesses actually need: CSV, Excel, QBO (QuickBooks), QFX (Quicken), OFX, and Xero-ready CSV.

Three things make it different from the dozens of existing converters, and all three are structural rather than marketing claims:

1. **Privacy by architecture.** The statement is parsed by code running in the customer's own browser tab. There is no upload endpoint anywhere in the codebase — there is literally no server that *could* receive the file. Customers can verify this themselves in their browser's Network tab, and the converter keeps working with Wi-Fi turned off. This is the core trust wedge for an audience handling sensitive financial documents, and it is also why hosting costs $0.
2. **Proof, not promises.** Every bank statement contains its own answer key: opening balance + all transactions = closing balance. StatementClear verifies that equation to the cent on every file (plus the running balance after every row, plus the printed deposit/withdrawal totals) and displays the result. Competitors claim "99% accuracy"; we *demonstrate* accuracy per file.
3. **Near-zero cost structure.** Static site on Cloudflare Pages (free, unlimited bandwidth), payments through a merchant of record that takes a percentage of sales only, no servers, no database, no per-conversion compute cost. Every dollar of revenue above ~5% payment fees is margin.

**Business model:** unlimited free parsing and preview (the demo *is* the product); exports capped at 30 transactions per file on the free plan; **$12 credit pack** (15 documents, never expires) and **Pro at $24/month or $149/year** for unlimited exports.

**Verification state at this checkpoint:** 74 unit/golden tests passing, 7 Playwright browser tests passing (including an automated proof that zero network requests leave the page during a conversion), Lighthouse SEO score 100 on all key page types, lint clean, production build generating 73 static pages.

---

## 2. The market and why this can win

**Customers:** bookkeepers and accountants (highest volume — they receive statement PDFs from clients constantly), lenders and landlords (verify applicant finances), and small-business owners (backfilling QuickBooks/Xero history, year-end taxes, loan applications).

**The job:** statement data is trapped in PDFs. Bank export tools only cover recent activity on open accounts; the moment an account is closed, a month is archived, or a document is handed to someone without portal access, the PDF is the only machine-readable source — and retyping a 40-row month takes over an hour with no accuracy check.

**Existing competition and our verified positioning:**

| Competitor | Model (verified June 2026) | Our wedge |
| --- | --- | --- |
| DocuClipper (cloud) | From ~$39/mo (~$27/mo annual) for 200 pages/mo; every PDF page counts | They upload to servers; we don't. They charge monthly; our entry is $12 once. They do OCR scans (real advantage — we say so on our comparison page). |
| MoneyThumb (desktop) | ~$60–$599 one-time licenses; OCR add-on; cloud from ~$25/mo | Hundreds up front vs. $12; nothing to install; per-file reconciliation proof. |
| Free/ad-supported converters | Upload-based, no verification | The privacy and proof story; professionals won't upload client financials to an ad site. |

The honest comparisons are published on the site itself (`/alternatives/docuclipper`, `/alternatives/moneythumb`) — being generous about competitors' strengths (OCR) is part of the trust positioning.

---

## 3. What was built (complete inventory)

### 3.1 The parsing engine — `packages/parser` (the heart)
A framework-free TypeScript engine, six layers, all money handled as integer cents so verification is exact:

1. **Extraction** (`extract.ts`) — normalizes pdf.js text items to top-left coordinates; detects scanned (image-only) and password-protected PDFs with typed, actionable errors.
2. **Row reconstruction** (`rows.ts`) — clusters text into visual rows (tolerance derived from median text height, not magic numbers), detects column boundaries via x-position histograms, strips repeating page furniture (headers, footers, page numbers, "continued…").
3. **Field detection** (`fields.ts`, `dates.ts`, `money.ts`) — dates in 7+ formats with **year inference** (statements omit years; we derive them from the statement period, correctly handling December→January statements); amounts in every real-world convention: `$1,234.56`, `(1,234.56)` = negative, trailing minus, `CR`/`DR` suffixes, separate debit/credit columns, European `1.234,56`.
4. **Bank templates** (`templates/*.json`) — **new banks are JSON data, not code.** 10 templates ship: Chase checking, Chase card, Bank of America, Wells Fargo, Citi card, Capital One card, Amex, U.S. Bank, PayPal, Wise. Each pins identification strings, balance labels, and sign convention.
5. **Generic fallback parser** (`generic.ts`) — handles unknown banks: finds date-led rows, identifies the running-balance column by testing the delta property, resolves signs from balance deltas / debit-credit columns / section headers / card conventions, merges multi-line descriptions, splits combined multi-account statements.
6. **Reconciliation** (`reconcile.ts`) — the signature: chains the running balance row by row, checks opening + sum = closing to the cent, cross-checks printed totals, and flags exactly which rows broke. Status: `verified` / `partial` / `failed`.

### 3.2 Export writers — `packages/exporters`
- **CSV** — configurable date formats, signed vs. debit/credit columns, UTF-8 BOM for Excel, RFC 4180 quoting.
- **XLSX** — *typed* date and currency cells (sums and pivots work immediately), frozen header, embedded reconciliation summary.
- **OFX 1.02 / QBO / QFX** — one writer, three flavors, with the details that make QuickBooks imports actually work: **deterministic FITIDs** (hash of date+amount+description+index — re-imports never duplicate, distinct transactions never get skipped), NAME truncated to the 32-char limit with overflow into MEMO, CHECK type + CHECKNUM for check columns, user-configurable INTU.BID with help text, credit-card aggregates and a sign-flip option.
- **Xero** — Xero's precoded statement CSV (Date, Amount, Payee, Description, Reference).

### 3.3 The web app — `app/`, `components/`, `lib/`
- **The converter is the homepage**: drop zone above the fold → per-page parse progress → **editable preview table** (virtualized for big statements, click any cell to fix it, flagged rows highlighted with one-click fixes derived from the balance chain) → the **reconciliation banner** (the single bold design element — green strip proving the math) → export modal with per-format options and plain-verb buttons ("Export 38 transactions as CSV").
- **CSV→QBO standalone tool** (`/csv-to-qbo`) — upload any CSV, map columns with dropdowns, export QBO/QFX/OFX. Competitors sell desktop software for this exact job.
- **Monetization** — license keys verified through one serverless function, cached in localStorage with weekly revalidation and a 30-day offline grace period. TEST_MODE (`DEV-UNLOCK` / `DEV-CREDITS` keys) lets the whole flow run before payment accounts exist.
- **Failure reporter** — when a parse fails, the user can generate an **anonymized layout JSON** (geometry kept; every word hashed; every number replaced with a random one of the same shape; account numbers stripped), see exactly what's in it, and email it. Each report becomes a new bank template — the compounding moat.
- **Design**: "a precision instrument for people who reconcile money." IBM Plex superfamily (Serif display / Sans body / Mono for every number — true tabular figures), ledger-green and accounting-red tokens, ruled lines, one animated element, `prefers-reduced-motion` respected, keyboard focus visible, semantic HTML.

### 3.4 The distribution engine (SEO) — `data/`, `app/convert/`, `app/guides/`
- **50 programmatic bank pages** (`/convert/chase-statement-to-csv` …) — each genuinely unique: that bank's PDF download steps, what it exports natively and the gap we fill, its real statement quirks (BofA's sectioned layout, Citi's `28 DEC` dates and CR suffixes, Amex's missing years, Capital One's two-date rows…), and a bank-specific FAQ with `FAQPage` JSON-LD.
- **4 format pages** (`/pdf-to-csv`, `/pdf-to-excel`, `/pdf-to-qbo`, `/pdf-to-xero`) + the CSV→QBO tool page.
- **2 honest comparison pages** with competitor pricing verified by web search at build time.
- **5 cornerstone guides** (~1,200+ words each, written for usefulness): importing into QuickBooks Online; importing into Xero; statement analysis in Excel; why QBO imports fail and the fix for each error; the year-end cleanup workflow.
- `sitemap.xml`, `robots.txt`, canonical URLs, per-page metadata, build-time OG image.

### 3.5 Server code (all of it) — `functions/`
Three tiny Cloudflare Pages Functions: license verify (proxies Polar's validation API), license consume (decrements credit-pack usage), and the event beacon (accepts only enum events — `parse_success`, `export`, `paywall_hit` — never anything derived from file contents; the restriction is documented in code).

### 3.6 Test infrastructure
- **A fixture generator** (`packages/parser/fixtures/generate.ts`) that uses pdf-lib to render 15 deterministic synthetic statement PDFs mimicking real layouts — plus each fixture's expected output as a golden JSON derived from the same source data, so tests compare the parser against ground truth, not against itself.
- Fixtures include adversarial cases: a scanned (image-only) PDF, a password-protected PDF (generated with pypdf), a non-statement PDF (a soup recipe), a 120-page / 4,400-transaction statement (performance), and a combined multi-account statement.

---

## 4. How it was built (process record)

1. **Naming and clearance.** Candidate domains checked against registry RDAP records: `statementclear.com` unregistered; web search confirmed no existing product uses "StatementClear." Backups also verified available: `ledgerlocal.com`, `balanceproof.com`.
2. **Payment-rail decision.** The original plan specified Lemon Squeezy; research showed it mid-absorption into Stripe ("Stripe Managed Payments") — risky for opening a new store. Switched to **Polar.sh**: open for signups, merchant of record (they handle global sales tax/VAT — keeps you clear of tax-registration exposure), free to start, ~5% + 50¢ per sale, built-in license keys with a public validation API that supports usage quotas (which is exactly how the credit packs work).
3. **Test-first engine development.** The fixture generator and golden files were built alongside the engine; the engine was then debugged against real pdf.js extraction in Node until all 10 bank layouts parsed to exact golden output. Three real bugs were found and fixed this way (plural-blind section-header regexes; bank-name headers being stripped as page furniture before template matching; the multi-account splitter stealing rows from the previous section). This is the discipline that makes the "verified to the cent" claim safe.
4. **Milestones executed in order** (per the build spec, gates self-verified since the owner authorized full autonomy): M0 scaffold → M1–M2 engine + templates + reconciliation → M3 converter UI → M4 exporters → M5 monetization → M6 SEO build-out → M7 hardening + this handoff. Six clean commits, one per milestone.
5. **Verification.** Every claim a customer sees is backed by an automated check — including a Playwright test that records every network request during a conversion and asserts none leave the page.

**Documents in the repo:** `OWNERS_MANUAL.md` (operations — start there), `README.md` (architecture + invariants), this packet.

---

## 5. Current status — the gates, with evidence

| Gate | Status | Evidence |
| --- | --- | --- |
| All 10 bank fixtures parse to golden output, `verified` | ✅ | `npm test` — 74/74 passing |
| Adversarial fixtures produce correct typed errors | ✅ | scanned / password / non-statement tests |
| 120-page statement parses < 10s | ✅ | parses in well under 2s in CI environment |
| Full browser flow: drop → verify → edit → export | ✅ | `npm run e2e` — 7/7 passing |
| Privacy invariant (no off-origin requests during parse) | ✅ | automated in E2E test #1 |
| Free cap triggers; DEV-UNLOCK lifts it | ✅ | E2E test #2 |
| Lighthouse SEO ≥ 95 on key pages | ✅ | 100 on home, bank, guide, format, pricing pages |
| Lint + production build | ✅ | clean; 73 static pages |
| **Deployed to a live URL** | ⬜ | blocked on owner accounts — see §6 |
| **Real-statement validation** | ⬜ | owner action — see §6 |

The two open items are the originally-planned owner gates: they require your accounts and your real statements, which only you can provide.

---

## 6. What we need to do NOW (launch week — ~1 hour of setup, ~$10)

Full click-by-click detail is in `OWNERS_MANUAL.md` §1. In order:

1. **Buy `statementclear.com`** (~$10/yr, Cloudflare Registrar). *The only mandatory cost.*
2. **Cloudflare Pages**: free account → connect this GitHub repo → build command `npm run build`, output `out` → attach the domain. Site is live from that moment; every push auto-deploys.
3. **Test with YOUR real statements** (the critical validation): drag 5–10 real statements from your own banks into the live site. Everything stays on your machine. Expect green banners on majors; for any failure, use the built-in reporter and the layout becomes a new template (JSON, not code — the manual shows how).
4. **Polar.sh**: free account → create the three products with license-key benefits (credit pack = key with usage limit 15; Pro = no limit) → paste the org ID and three checkout URLs into Cloudflare env vars → redeploy. Do one test purchase end-to-end. Update your business license name/activity to match (software services); Polar as merchant of record handles all sales-tax obligations.
5. **Plumbing**: `support@statementclear.com` via Cloudflare Email Routing (free); enable Cloudflare Web Analytics; submit `sitemap.xml` to Google Search Console.

**Definition of launched:** a stranger can convert a Chase PDF on the live domain, hit the 30-transaction cap, buy a $12 pack, and finish — while their Network tab shows nothing uploaded.

---

## 7. The plan to actually make money

### Phase 1 — First dollars (weeks 1–6): borrowed audiences
SEO takes months; don't wait for it. The launch posts go where bookkeepers already gather, and the pitch is a 20-second demo, not a claim: *"Convert a bank statement with the DevTools Network tab open — watch nothing upload."*
- r/Bookkeeping, r/Accounting, r/smallbusiness, r/QuickBooks (read each sub's self-promo rules; lead with the free tool + privacy demo)
- Indie Hackers launch post; Hacker News "Show HN" (the client-side architecture is genuinely HN-interesting)
- Bookkeeping Facebook groups and accounting Discords; answer existing "how do I convert a bank statement PDF" threads on Reddit/Quora with the free tool
- **Watch the funnel** (events are already instrumented): `parse_attempt → parse_success → export → paywall_hit → purchase_click`. The `paywall_hit → purchase` ratio tells you if $12 is priced right; `parse_failed` by error type tells you which bank template to add next.

### Phase 2 — The compounding engine (months 2–6): SEO + templates
- The 50 bank pages + 5 guides target long-tail, high-intent queries ("convert chase statement to csv", "why does my qbo import fail"). Expect first meaningful Google traffic at 2–4 months; this is the patient, durable channel — competitors charging $39/mo validate that the searches convert.
- **Every failure report you turn into a template widens the moat** — coverage compounds while competitors re-OCR every document. Template turnaround (days, free) is itself a marketing point.
- Add a couple of guides per month from real support questions; each one is also a Reddit/forum answer you can link.

### Phase 3 — Scale levers (month 3+, in order of evidence)
1. **Bookkeeper multi-file workflow** (batch convert a folder, merge months) — serves the highest-LTV segment; justifies a $49/mo team tier.
2. **OCR for scanned statements** — the single biggest "no" today. Feasible client-side (Tesseract WASM) to preserve the privacy story; ship as a Pro-only feature. This converts the waitlist the scanned-PDF error screen is already collecting.
3. **Pricing experiments** — credit-pack price and cap size are one-line config changes; the events show exactly where elasticity is.
4. **Adjacent wedges** reusing the engine: invoice/receipt parsing, a "statement auditor" for lenders (the anonymized-layout + reconciliation tech is most of it).
5. **Affiliate/partner motion**: bookkeeping course creators and YouTube accountants reviewing tools — a privacy-first free tool is easy for them to recommend; Polar supports discount codes for attribution.

### Honest revenue math (not projections — sensitivities)
At $12/pack ≈ $11.30 net: 10 packs/mo covers ~all costs (domain) ~130× over; the business is profitable at the first sale. The real question is traffic × conversion: if SEO + community reach 5,000 visitors/mo and 0.5% buy anything (mix of $12/$24), that's ~$400–700/mo; at 20,000 visitors and 1%, ~$3–5k/mo. Costs stay ~$0 either way — there is no scale at which this loses money, which is the point of the architecture.

---

## 8. Risks and how they're handled

| Risk | Mitigation in place |
| --- | --- |
| Real statements differ from synthetic fixtures | Generic parser + per-file reconciliation means failures are *visible*, never silent; failure reporter converts them into templates. Your real-statement test (§6.3) is the immediate check. |
| SEO is slow / never ranks | Phase 1 channels don't depend on it; bank pages are genuinely useful (not spun), which is what survives Google updates. |
| QuickBooks INTU.BID rejections | User-visible setting + help note + a full troubleshooting guide; FITIDs deterministic. |
| Polar dependency | License check is one small function behind an adapter; OWNERS_MANUAL documents swapping providers. |
| Bank trademark complaints | Nominative use only, no logos, footer disclaimer on every page. |
| A competitor copies "client-side" | The template library + failure-report flywheel + published proof culture are the durable parts; copying the architecture doesn't copy the coverage. |
| You get busy and it rots | No servers, no database, no dependencies that expire — a static site + 3 functions can idle for months and still sell. |

---

## 9. Appendices

**A. Repo map:** `packages/parser` (engine) · `packages/exporters` (writers) · `app/` (site) · `components/` · `lib/` (client glue: extraction, license, beacon, anonymizer) · `data/` (bank + guide content) · `functions/` (3 Pages Functions) · `e2e/` (Playwright) · `scripts/` · `OWNERS_MANUAL.md` · `README.md`

**B. Commands:** `npm test` (74 tests) · `npm run e2e` (7 browser tests; build with `NEXT_PUBLIC_TEST_MODE=true` first) · `npm run build` (static export) · `npm run fixtures` (regenerate test PDFs) · `npm run dev`

**C. Build history (one commit per milestone):**
```
3d08100  Parsing engine: extraction, rows, fields, templates, generic parser, reconciliation
cb7f022  Exporters: CSV, Xero CSV, OFX/QFX/QBO, XLSX with golden tests
0703f19  Converter UI: drop zone, editable preview, reconciliation banner, export modal
edf29a1  Pricing, privacy, CSV-to-QBO tool, license + beacon Pages Functions
504d0ac  SEO build-out: 50 bank pages, format pages, comparisons, 5 guides, sitemap/robots/OG
18fa1d0  Hardening + handoff: Playwright E2E, Lighthouse SEO 100, owner's manual
```

**D. Screenshots** (`docs/checkpoint-assets/`): `home.png` (converter homepage), `preview.png` (converted statement, verified banner, editable table), `export.png` (export modal with free-cap upgrade path).

**E. Key numbers:** 135 tracked files · 73 static pages generated · 50 bank pages · 10 bank templates · 15 test fixture PDFs · 74 unit/golden tests · 7 E2E tests · Lighthouse SEO 100 · $0/mo fixed costs.
