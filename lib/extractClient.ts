"use client";

/**
 * Browser-side PDF text extraction.
 *
 * PRIVACY INVARIANT: the file is read with FileReader/ArrayBuffer and handed
 * to pdf.js running in this tab. There is no upload endpoint in this
 * codebase, and nothing here may ever transmit file bytes, text, filenames,
 * or anything derived from them. The converter must keep working offline.
 */

import type { RawPage } from "@parser/types";
import { StatementParseError } from "@parser/types";

export interface ExtractResult {
  pages: RawPage[];
}

export async function extractPdf(
  data: ArrayBuffer,
  onProgress?: (page: number, total: number) => void,
  password?: string,
): Promise<ExtractResult> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();

  let doc;
  try {
    doc = await pdfjs.getDocument({ data, password }).promise;
  } catch (e) {
    if ((e as { name?: string })?.name === "PasswordException") {
      throw new StatementParseError(
        "PASSWORD_PROTECTED",
        'This PDF is password-protected, and your browser can\'t read it without the password. Enter the password below, or open it in your PDF viewer and use "Print → Save as PDF" to make an unlocked copy. Either way, the file never leaves your device.',
      );
    }
    throw e;
  }

  const pages: RawPage[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();
    pages.push({
      pageNumber: i,
      pageHeight: viewport.height,
      items: content.items
        .filter((it): it is import("pdfjs-dist/types/src/display/api").TextItem => "str" in it)
        .map((it) => ({
          str: it.str,
          transform: it.transform,
          width: it.width,
          height: it.height,
        })),
    });
    onProgress?.(i, doc.numPages);
  }
  return { pages };
}
