/**
 * Layer 1 — Extraction normalization.
 *
 * The caller (browser client or Node test harness) runs pdf.js
 * getTextContent() per page and hands us raw items. We normalize to a
 * top-left origin and detect scanned (image-only) PDFs. Password detection
 * happens at document-open time in the caller; `passwordError()` builds the
 * typed error for it so the copy lives in one place.
 */

import {
  PositionedText,
  RawPage,
  StatementParseError,
} from "./types";

/** Minimum average text items per page for a PDF to count as text-based. */
const SCANNED_THRESHOLD_ITEMS_PER_PAGE = 4;

export function normalizePages(pages: RawPage[]): PositionedText[] {
  const out: PositionedText[] = [];
  for (const page of pages) {
    for (const item of page.items) {
      const str = item.str;
      if (!str || !str.trim()) continue;
      // transform = [a, b, c, d, e, f]; e/f are the glyph origin in
      // bottom-left coordinates. Font size ≈ d (vertical scale).
      const fontSize = Math.abs(item.transform[3]) || Math.abs(item.transform[0]) || 10;
      const xBL = item.transform[4];
      const yBL = item.transform[5];
      out.push({
        str: str.trim(),
        x: xBL,
        // Flip to top-left origin; use the text's top edge.
        y: page.pageHeight - yBL - fontSize,
        width: item.width,
        height: item.height || fontSize,
        page: page.pageNumber,
      });
    }
  }
  return out;
}

/** Throws SCANNED_PDF when the document has no real text layer. */
export function assertNotScanned(pages: RawPage[]): void {
  const totalItems = pages.reduce(
    (n, p) => n + p.items.filter((i) => i.str.trim()).length,
    0,
  );
  if (pages.length === 0 || totalItems / pages.length < SCANNED_THRESHOLD_ITEMS_PER_PAGE) {
    throw new StatementParseError(
      "SCANNED_PDF",
      "This PDF is a scan — it contains images of pages, not selectable text. StatementClear currently reads digital PDFs only (the kind you download from your bank's website, where you can select the text). Download the statement directly from your bank instead of scanning a paper copy.",
    );
  }
}

/** Typed error for password-protected documents (thrown by callers). */
export function passwordError(): StatementParseError {
  return new StatementParseError(
    "PASSWORD_PROTECTED",
    "This PDF is password-protected, and your browser can't read it without the password. Open it in your PDF viewer, use \"Print → Save as PDF\" to make an unlocked copy, and drop that file here. The file still never leaves your device.",
  );
}

export function notAStatementError(): StatementParseError {
  return new StatementParseError(
    "NOT_A_STATEMENT",
    "This PDF has selectable text, but it doesn't look like a bank or credit-card statement — no statement period, balances, or transaction rows were found. If this really is a statement, use the failure reporter below so we can add support for this layout.",
  );
}

export function unrecognizedLayoutError(): StatementParseError {
  return new StatementParseError(
    "UNRECOGNIZED_LAYOUT",
    "This looks like a statement, but no transactions could be read from its layout. Use the failure reporter below to send us the anonymized layout — most new layouts are supported within days.",
  );
}
