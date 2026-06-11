/**
 * Real-world public corpus tests, driven by fixtures/real/manifest.json.
 *
 * Committable (public-domain) PDFs live in fixtures/real/committed/ and are
 * always tested. Cache-only documents (redistribution not clearly granted)
 * are tested when present locally and skipped gracefully otherwise — CI
 * still covers the committed set.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseStatement } from "@parser/parse";
import { StatementParseError } from "@parser/types";
import { loadRawPages } from "./harness";

const REAL = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "fixtures",
  "real",
);

interface ManifestEntry {
  file: string;
  sourceOrganization: string;
  provenance: string;
  committable: boolean;
  expected: {
    outcome: "parsed" | "verified" | string;
    minTransactions?: number;
  };
}

const manifest = JSON.parse(
  fs.readFileSync(path.join(REAL, "manifest.json"), "utf8"),
) as { entries: ManifestEntry[] };

function locate(entry: ManifestEntry): string | null {
  for (const dir of ["committed", "cache"]) {
    const p = path.join(REAL, dir, entry.file);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

describe("real-world public corpus", () => {
  for (const entry of manifest.entries) {
    const file = locate(entry);
    const run = file ? it : it.skip;
    run(`${entry.file} (${entry.provenance}) → ${entry.expected.outcome}`, async () => {
      const pages = await loadRawPages(file!);
      if (entry.expected.outcome === "parsed" || entry.expected.outcome === "verified") {
        const output = parseStatement(pages);
        const total = output.statements.reduce((n, s) => n + s.transactions.length, 0);
        expect(total).toBeGreaterThanOrEqual(entry.expected.minTransactions ?? 1);
        if (entry.expected.outcome === "verified") {
          for (const s of output.statements) {
            expect(s.reconciliation.status).toBe("verified");
          }
        }
      } else {
        try {
          parseStatement(pages);
          expect.unreachable(`expected ${entry.expected.outcome}`);
        } catch (e) {
          expect(e).toBeInstanceOf(StatementParseError);
          expect((e as StatementParseError).code).toBe(entry.expected.outcome);
        }
      }
    });
  }

  it("manifest committable flags match the repository contents", () => {
    for (const entry of manifest.entries) {
      const committed = fs.existsSync(path.join(REAL, "committed", entry.file));
      if (committed) {
        expect(entry.committable, `${entry.file} is committed but not marked committable`).toBe(true);
      }
      if (!entry.committable) {
        expect(committed, `${entry.file} must not be committed`).toBe(false);
      }
    }
  });
});
