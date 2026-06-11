# Baseline Verification — Independent Reproduction of Checkpoint Claims

**Date:** June 11, 2026
**Branch:** `claude/statementclear-real-world-hardening` (cut from `claude/profitable-ai-project-plan-8mfl76` at `017e949`)
**Method:** clean dependency install (`node_modules` removed, `npm ci`), then every claim in `docs/CHECKPOINT_2026-06-11.md` re-run from scratch rather than trusted.

## Environment

- Node v22.22.2, npm 10.9.7, Linux x86_64
- Chromium for Playwright installed via `npx playwright install chromium`

## Commands run and results

| Command | Result |
| --- | --- |
| `npm ci` | ✅ installs cleanly from lockfile |
| `npm run lint` | ✅ 0 errors, 0 warnings |
| `npx vitest run` | ✅ 5 files, **74/74 tests passed** |
| `npm run build` (production) | ✅ compiles, **73/73 static pages** generated |
| `NEXT_PUBLIC_TEST_MODE=true npm run build` | ✅ compiles, 73/73 pages |
| `npm run e2e` (against TEST_MODE static export) | ✅ **7/7 passed** (pre-existing suite) |
| `npx playwright test` after adding export tests | ✅ **12/12 passed** |

## Checkpoint claims independently reproduced

- Parser unit/golden tests pass (10 bank fixtures parse to exact golden output; property test enforces `verified` reconciliation on every fixture; 120-page fixture parses well inside the 10s budget).
- Exporter golden tests pass (CSV quoting/BOM/sign styles, Xero layout, OFX structure/FITIDs/NAME-truncation/INTU.BID flavors, XLSX typed cells).
- Adversarial fixtures produce the correct typed errors (scanned, password-protected with and without password, non-statement).
- Browser flow works end to end: drop → parse → "Verified to the cent" banner → edit a cell → reconciliation re-runs (breaks and restores correctly) → export downloads.
- Free cap triggers at >30 transactions; `DEV-UNLOCK` (TEST_MODE) lifts it; capped "first 30" export offered.
- CSV-to-QBO standalone tool maps columns and downloads a `.qbo`.
- **Privacy invariant:** during a full conversion, zero requests leave the page origin (asserted by recording every network request in `e2e/converter.spec.ts`).

## Gap found and closed in this phase

The pre-existing E2E suite only exercised **CSV** downloads from the main
converter (plus `.qbo` from the CSV tool). Added `e2e/exports.spec.ts` (5
tests) which downloads every format through the real UI and inspects the
bytes:

- **CSV** — UTF-8 BOM, `Date,Description,Amount,Balance` header, 1 row per
  transaction, signed plain decimals.
- **XLSX** — parsed with SheetJS inside the test: `Transactions` sheet, A2 is
  a typed date cell (`t: "d"`, real `Date`), amount cells typed numeric, and
  the embedded "Verified to the cent" reconciliation block present.
- **QBO** — `OFXHEADER:100`/`VERSION:102`, `<INTU.BID>3000`, `<LEDGERBAL>`,
  18 FITIDs all unique, credit-card aggregate (`<CCSTMTRS>`) for the card
  fixture.
- **QFX** — includes `<INTU.BID>`; **OFX** — omits it; container tags balance.
- **Xero CSV** — exact precoded header `Date,Amount,Payee,Description,Reference`.

One test expectation was corrected during this work (the default CSV export
includes a Balance column even when the statement prints no balances — the
column is present with empty cells). No application code needed repair.

## Claims NOT covered by this baseline (honest scope notes)

- All parsing fixtures are **synthetic** (pdf-lib-generated mimics of real
  layouts). No real bank-generated PDF has been parsed yet — that is the
  purpose of the next phases.
- Lighthouse SEO 100 (from the prior checkpoint) was not re-run in this
  phase; it is re-verified in the final truth audit.
- The license server functions (`functions/api/license/*`) are exercised only
  in TEST_MODE; real Polar verification requires owner accounts and is out of
  scope by instruction.
- XLSX "frozen header row" is written but not asserted (SheetJS community
  edition reads it back inconsistently); typed cells and content are asserted.

## Verdict

Every checkpoint claim that can be verified without owner accounts or real
statements **reproduced successfully from a clean install**. Baseline is
green; no repairs to application code were required.
