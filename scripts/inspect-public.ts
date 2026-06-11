/* Inspect a PUBLIC corpus document's reconstructed rows (never for private files). */
import { normalizePages } from "../packages/parser/src/extract";
import { prepareDocument } from "../packages/parser/src/generic";
import { rowText } from "../packages/parser/src/rows";
import { parseStatement } from "../packages/parser/src/parse";
import { loadRawPages } from "../packages/parser/test/harness";

async function main() {
  const file = process.argv[2];
  const pages = await loadRawPages(file);
  const prep = prepareDocument(normalizePages(pages));
  prep.rows.forEach((r, i) => console.log(String(i).padStart(3), `p${r.page}`, `y=${r.y.toFixed(0)}`, rowText(r).slice(0, 150)));
  try {
    const out = parseStatement(pages);
    for (const s of out.statements) {
      console.log("== parsed:", s.templateId, s.reconciliation.status, "open:", s.openingBalanceCents, "close:", s.closingBalanceCents, "tx:", s.transactions.length);
      console.log(s.reconciliation.notes);
    }
  } catch (e) { console.log("== error:", (e as Error & {code?:string}).code, (e as Error).message.slice(0,80)); }
}
main();
