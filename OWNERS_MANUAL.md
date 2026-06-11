# StatementClear — Owner's Manual

You own a privacy-first bank-statement converter: customers drop PDF bank
statements onto statementclear.com, the file is parsed **in their browser**
(never uploaded), verified against the statement's own balances, and exported
to CSV / Excel / QBO / QFX / OFX / Xero. Free users preview everything and
export up to 30 transactions per file; revenue comes from a $12 credit pack
(15 documents) and Pro at $24/month or $149/year.

This manual covers everything you need to operate it. Nothing here requires
writing code.

---

## 1. One-time setup checklist (about an hour, ~$10)

### 1.1 Buy the domain (~$10/year — the only mandatory cost)
`statementclear.com` was verified available (via RDAP) when this was built.
Buy it at Cloudflare Registrar (at-cost pricing, and you'll use Cloudflare
anyway): dash.cloudflare.com → Domain Registration. Backup names that were
also available: `ledgerlocal.com`, `balanceproof.com`.

### 1.2 Create the Cloudflare Pages project (free)
1. Sign up at dash.cloudflare.com (free plan — unlimited bandwidth for Pages).
2. Workers & Pages → Create → Pages → **Connect to Git** → pick this GitHub
   repository and the production branch.
3. Build settings:
   - Build command: `npm run build`
   - Build output directory: `out`
   - (The `functions/` directory is picked up automatically — that's the
     license verification and the event beacon.)
4. After the first deploy, Custom domains → add `statementclear.com`.
5. Settings → Environment variables: nothing required yet. When payments go
   live you'll add `POLAR_ORGANIZATION_ID` (step 1.4).

Every push to the production branch auto-deploys. Preview deployments are
created for other branches.

### 1.3 Turn on analytics (free, cookieless)
Cloudflare dashboard → your domain → Web Analytics → enable. No code changes
needed (Cloudflare injects it at the edge for proxied domains).

Optional deeper events: the app sends privacy-safe events (parse_success,
export, paywall_hit…) to `/api/event`. To store them, add a **Workers
Analytics Engine** binding named `EVENTS` to the Pages project (Settings →
Functions → Analytics Engine bindings) — the code in
`functions/api/event.ts` already writes to it when present.

### 1.4 Set up payments — Polar.sh (free; they take ~5% + 50¢ of each sale)
Polar is a **merchant of record**: they handle sales tax/VAT worldwide, which
keeps you out of tax-registration territory entirely. Your business license
note: update the name/activity to match (software/online services); no other
regulatory steps are needed because Polar is the seller of record to the
customer.

1. Create an organization at polar.sh.
2. Create three products, each with a **License Key benefit**:
   - **Credit pack — $12, one-time.** On the license key benefit, set a
     *usage limit of 15*. (The app reads `limit_usage` to know it's a credit
     pack and decrements usage by 1 per export via the API.)
   - **Pro Monthly — $24/month subscription.** License key benefit with *no
     usage limit* (no limit = the app treats it as Pro).
   - **Pro Yearly — $149/year subscription.** Same as monthly.
3. Copy your **Organization ID** (Polar settings) into the Cloudflare Pages
   env var `POLAR_ORGANIZATION_ID` (Production).
4. Copy each product's checkout link into these Pages env vars, then redeploy:
   - `NEXT_PUBLIC_CHECKOUT_URL_CREDITS`
   - `NEXT_PUBLIC_CHECKOUT_URL_PRO_MONTHLY`
   - `NEXT_PUBLIC_CHECKOUT_URL_PRO_YEARLY`
   (Until these are set, the pricing page shows "Checkout opens soon" —
   honest by design.)
5. In Polar, set the refund policy to honor the 7-day no-questions refund the
   pricing page promises.

**Verify the flow end-to-end:** buy your own credit pack with Polar's test
mode, paste the emailed license key into Pricing → "Activate", and export a
31+ transaction statement.

### 1.5 Support email
Create `support@statementclear.com` (Cloudflare Email Routing forwards it to
your Gmail for free: dashboard → Email → Email Routing).

---

## 2. Day-to-day operations

### Reading analytics
- **Traffic:** Cloudflare Web Analytics (pageviews, referrers, top pages —
  watch which `/convert/<bank>` pages grow; write more content like those).
- **Funnel:** if you wired Analytics Engine, query events in the dashboard:
  `parse_attempt → parse_success → export → paywall_hit → purchase_click`.
  The ratio paywall_hit→purchase tells you if pricing is the bottleneck;
  parse_failed by errorType tells you which templates to add next.
- **Revenue:** Polar dashboard.

### Handling a failure report (this is your moat — do these promptly)
When a user's statement fails to parse, the app offers them an anonymized
layout JSON (geometry preserved, every word hashed, every number randomized,
account numbers stripped) which they email to support. To turn one into a
new bank template:

1. Open the JSON. Look at `pages[].items` — you'll see the layout skeleton
   with positions. The kept vocabulary (Balance, Deposits, Date…) shows the
   structure even though names are hashed.
2. Create `packages/parser/src/templates/<bank>-v1.json` copying an existing
   one (e.g. `boa-checking-v1.json`). Set:
   - `identify.anyOf`: strings unique to that bank (bank name, domain).
   - `openingLabels` / `closingLabels`: the exact balance-label wording.
   - `signConvention`: `"auto"` (running balance), `"section-headers"`
     (deposits/withdrawals sections), `"debit-credit-columns"`, or
     `"cc-purchases-positive"` (credit cards).
3. Register it in `packages/parser/src/templates/index.ts` (two lines).
4. Run `npm test`. Ask Claude Code to do all of this from the report — this
   repo is set up for it; templates are data, not code.

### Editing pricing
- Amounts shown on the site: `lib/site.ts` (`PRICING`, `FREE_EXPORT_CAP`).
- Actual charged prices: the Polar products.
Keep them in sync. Push to deploy.

### Adding a bank SEO page
Add one entry to `data/banks-us-major.ts`, `data/banks-us-other.ts`, or
`data/banks-intl.ts` (copy a neighbor — fields are documented in
`data/banks-types.ts`). The page, sitemap entry, and index listing generate
automatically. Rules: never invent bank-specific claims; write download steps
you've verified or keep them generic; quirks should describe the real
statement layout.

### Adding a guide
Add a file in `data/guides/` mirroring an existing guide and register it in
`data/guides/index.ts`.

---

## 3. Development reference

```bash
npm install          # once
npm run dev          # local dev server
npm test             # 74 unit/golden tests (parser + exporters)
npm run build        # static export to out/
npm run fixtures     # regenerate synthetic statement PDFs + golden files
NEXT_PUBLIC_TEST_MODE=true npm run build && npx playwright test   # 7 E2E tests
node scripts/serve-out.mjs   # serve out/ at localhost:4173
```

- **TEST_MODE:** building with `NEXT_PUBLIC_TEST_MODE=true` makes the dev
  keys `DEV-UNLOCK` (Pro) and `DEV-CREDITS` (15 credits) work. Never set
  this on the production deployment.
- **Architecture:** `packages/parser` (framework-free parsing engine, six
  layers, fully unit-tested), `packages/exporters` (CSV/XLSX/OFX/Xero
  writers), `app/` (Next.js static export), `functions/` (the only server
  code: license verify/consume + event beacon), `data/` (SEO content).
- **The privacy invariant** (load-bearing for marketing and trust): no code
  path may ever transmit statement bytes or anything derived from them. The
  E2E suite asserts zero off-origin requests during a conversion. If you add
  any network call, keep it out of the parse path and keep payloads to enums.

## 4. Legal & claims hygiene (read once)

- Bank names are used nominatively ("we convert statements *from* Chase");
  the footer carries a non-affiliation disclaimer. Don't use bank logos.
- Every marketing claim on the site is verifiable by design (privacy via
  DevTools, accuracy via per-file reconciliation). Keep it that way — no
  invented testimonials or user counts, ever (also a spec rule).
- Competitor pricing on the /alternatives pages was verified June 2026;
  re-check it every few months and adjust wording/dates.
- Polar, as merchant of record, is responsible for sales tax/VAT and PCI.
  Your side: deliver the product, honor the 7-day refund.

## 5. Launch checklist

- [ ] Domain bought and attached to the Pages project
- [ ] First deploy green; converter works on the live URL with a real statement
- [ ] Drag 5–10 of YOUR real statements in locally — confirm green banners
      (everything stays on your machine); report failures via the reporter
      flow to seed new templates
- [ ] Polar products created; env vars set; test purchase + activation done
- [ ] support@ email forwarding works
- [ ] Web Analytics enabled
- [ ] Submit sitemap to Google Search Console (`https://statementclear.com/sitemap.xml`)
- [ ] Post the launch: r/Bookkeeping, r/Accounting, r/smallbusiness (the
      privacy angle + "watch the Network tab" demo is the hook), Indie
      Hackers, accounting Facebook groups. The honest comparison pages give
      you defensible answers when competitors come up.
