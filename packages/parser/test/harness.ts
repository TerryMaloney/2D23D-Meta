/**
 * Node-side PDF → RawPage[] loader for tests, using the same pdf.js library
 * the browser client uses. This makes golden tests full integration tests:
 * real PDF bytes → real text extraction → parser.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { RawPage } from "@parser/types";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const PDF_DIR = path.join(__dirname, "..", "fixtures", "pdfs");
export const GOLDEN_DIR = path.join(__dirname, "..", "fixtures", "golden");

export async function loadRawPages(pdfPath: string, password?: string): Promise<RawPage[]> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const doc = await pdfjs.getDocument({
    data,
    password,
    useSystemFonts: true,
    standardFontDataUrl: path.join(
      __dirname,
      "..",
      "..",
      "..",
      "node_modules",
      "pdfjs-dist",
      "standard_fonts/",
    ),
  }).promise;

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
  }
  return pages;
}

export function fixturePdf(name: string): string {
  return path.join(PDF_DIR, `${name}.pdf`);
}

export function readGolden<T>(name: string): T {
  return JSON.parse(fs.readFileSync(path.join(GOLDEN_DIR, `${name}.json`), "utf8")) as T;
}
