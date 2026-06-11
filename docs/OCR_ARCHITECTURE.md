# Scanned-Statement OCR — Architecture Note (not yet implemented)

**Status: design only.** The application's scanned-PDF behavior remains the
honest typed error (`SCANNED_PDF`) with a waitlist prompt. This note exists
so the feature can be built deliberately instead of bolted on — and because
implementing OCR without real scanned-statement fixtures and accuracy
measurement would violate this project's no-unproven-claims rule.

## Constraints any implementation must satisfy

1. **Local only.** OCR runs in the browser (Tesseract.js / tesseract WASM,
   or an ONNX text-recognition model via WebGPU). The no-upload guarantee is
   non-negotiable; the existing E2E network-privacy tests must pass with OCR
   active. Model/WASM assets ship with the site (self-hosted, ~2–15 MB) so
   offline operation survives.
2. **Provenance tracking.** Every value entering the pipeline from OCR is
   tagged `source: "ocr"` with a per-token confidence, end to end:
   `Transaction` gains `ocr?: { confidence: number }`, and the preview
   renders OCR-derived cells visually distinct (dotted underline + tooltip).
   Native-PDF parsing is untouched.
3. **Reconciliation gates everything.** OCR output goes through the same
   `reconcile()` and may show "verified" only when the arithmetic holds —
   which is also OCR's killer advantage here: the balance chain catches
   single-digit misreads (an OCR "8"→"3" error breaks the chain at exactly
   that row, producing a one-click fix with the implied amount).
4. **Confidence-driven flagging.** Tokens under a confidence threshold (or
   amounts whose row breaks the chain) get `low-confidence` flags; the
   existing flagged-row UI already handles review/fix.
5. **Resource limits, fail-safe.** Hard caps: pages per document (~50),
   per-page OCR timeout (~20 s), worker memory monitored; on breach, abort
   into the existing typed-error path with partial results discarded —
   never a hung tab, never silent truncation.

## Pipeline sketch

```
PDF page → pdf.js render to canvas (2× scale, grayscale)
        → preprocessing (deskew via projection profile, binarize Otsu)
        → tesseract.js worker (eng, TSV output with word boxes + confidence)
        → word boxes mapped into PositionedText{str,x,y,w,h} (same shape the
          engine already consumes — Layers 2–6 run UNCHANGED)
        → parseStatement() → reconcile() → preview with OCR provenance
```

The deliberate design choice: OCR produces the *same positioned-text input*
the existing engine consumes, so rows/fields/templates/reconciliation need
zero OCR-specific logic. All OCR complexity stays in one adapter module
(`lib/ocrClient.ts`) behind the same interface as `extractClient.ts`.

## Numeric accuracy hardening (the known weak spot)

- Constrain recognition for amount-column regions to a numeric character
  whitelist on a second pass (tesseract parameter `tessedit_char_whitelist`)
  when the first pass's row fails the balance chain.
- Cross-field redundancy: candidate amounts must satisfy
  `prev_balance ± amount = balance` — use the chain to *select* among the
  top-N OCR alternatives for ambiguous glyphs before flagging for a human.

## Test plan required before shipping

- Fixture generator extension: render existing synthetic statements to
  images (pdf.js canvas), recompress with realistic scan artifacts (300/150
  DPI, slight rotation, JPEG noise), and wrap as image-only PDFs — giving
  golden-comparable scanned fixtures with known ground truth.
- Acceptance gates: ≥95% of fixture transactions reconciling after at most
  N one-click fixes per page (N measured, published); per-page OCR < 5 s on
  a mid laptop; memory < 500 MB; privacy E2E green.
- Real-world pass: the private validator gains an `--ocr` flag so the owner
  can measure real scanned statements locally without sharing them.

## Product placement

Pro-only feature (it's the single biggest "no" in the current product and
justifies the subscription), surfaced exactly where the SCANNED_PDF error
appears today: "This is a scan — Pro can try reading it with on-device OCR
(experimental)". The error copy stays honest until the gates above pass.
