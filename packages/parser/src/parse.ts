/**
 * Orchestrator: raw pdf.js pages in → reconciled statements out.
 */

import {
  assertNotScanned,
  normalizePages,
  notAStatementError,
  unrecognizedLayoutError,
} from "./extract";
import {
  parseSection,
  prepareDocument,
  splitSections,
} from "./generic";
import { detectPeriod } from "./dates";
import { matchTemplate, optionsFromTemplate } from "./template-engine";
import { ParseOutput, RawPage } from "./types";

export function parseStatement(pages: RawPage[]): ParseOutput {
  assertNotScanned(pages);
  const items = normalizePages(pages);
  const prep = prepareDocument(items);

  const match = matchTemplate(prep.rawText);
  const options = optionsFromTemplate(match?.template ?? null);
  if (options.locale === "us" && !match) options.locale = prep.locale;

  // Template period override.
  let period = prep.period;
  if (options.periodRegex) {
    const m = prep.text.match(new RegExp(options.periodRegex, "i"));
    if (m && m[1] && m[2]) {
      period = detectPeriod(`${m[1]} through ${m[2]}`) ?? period;
    }
  }

  const sections = splitSections(prep.rows, options.openingLabels, options.locale);
  const statements = sections
    .map((rows) =>
      parseSection({ rows, period, options, pageCount: prep.pageCount }),
    )
    .filter((s) => s.transactions.length > 0 || sections.length === 1);

  const totalTx = statements.reduce((n, s) => n + s.transactions.length, 0);
  if (totalTx === 0) {
    const statementSignals =
      period !== null ||
      statements.some(
        (s) =>
          s.openingBalanceCents !== undefined ||
          s.closingBalanceCents !== undefined,
      ) ||
      match !== null;
    throw statementSignals ? unrecognizedLayoutError() : notAStatementError();
  }

  return { statements: statements.filter((s) => s.transactions.length > 0) };
}
