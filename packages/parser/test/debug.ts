/* Ad-hoc debug runner: npx tsx packages/parser/test/debug.ts <fixture> */
import { parseStatement } from "../src/parse";
import { normalizePages } from "../src/extract";
import { prepareDocument } from "../src/generic";
import { rowText } from "../src/rows";
import { loadRawPages, fixturePdf, readGolden } from "./harness";

const name = process.argv[2] ?? "boa-checking";
const mode = process.argv[3] ?? "diff";

async function main() {
const pages = await loadRawPages(fixturePdf(name));

if (mode === "rows") {
  const prep = prepareDocument(normalizePages(pages));
  prep.rows.forEach((r, i) =>
    console.log(String(i).padStart(3), `p${r.page}`, `y=${r.y.toFixed(1)}`, rowText(r)),
  );
  process.exit(0);
}

const out = parseStatement(pages);
for (const s of out.statements) {
  console.log("template:", s.templateId, "| status:", s.reconciliation.status);
  console.log("opening:", s.openingBalanceCents, "closing:", s.closingBalanceCents);
  console.log("notes:", s.reconciliation.notes);
  console.log("tx count:", s.transactions.length);
  if (mode === "tx") {
    s.transactions.forEach((t, i) =>
      console.log(String(i).padStart(3), t.date, t.amountCents, t.balanceCents ?? "", t.flags.join(","), t.description),
    );
  }
}
try {
  const golden = readGolden<{ transactions: { date: string; amountCents: number; description: string }[] }>(name);
  const g = Array.isArray(golden) ? golden[0] : golden;
  console.log("golden tx count:", g.transactions.length);
} catch {}
}
main();
