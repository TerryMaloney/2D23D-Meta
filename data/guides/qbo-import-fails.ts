import type { Guide } from "./types";

export const GUIDE_QBO_FAILS: Guide = {
  slug: "why-qbo-import-fails",
  title: "Why your QBO import fails in QuickBooks (and the fix for each error)",
  description:
    "INTU.BID rejection, silent duplicate-skipping, sign flips, and malformed-file errors — what each QBO import failure means and exactly how to fix it.",
  minutes: 7,
  updated: "2026-06-11",
  sections: [
    {
      heading: "First, know which failure you have",
      paragraphs: [
        "QBO import problems come in four distinct flavors, and the fix is different for each: (1) QuickBooks rejects the file outright; (2) the import 'succeeds' but transactions are missing; (3) everything imports with the wrong signs; (4) the file won't even upload. Diagnose first — the most common mistake is re-exporting variations blindly until something sticks, which usually creates problem (2) on top of whatever you started with.",
      ],
    },
    {
      heading: "Failure 1 — “We can't import this file” / bank not recognized (INTU.BID)",
      paragraphs: [
        "QBO files carry an INTU.BID tag — a numeric ID identifying the financial institution. QuickBooks validates it against Intuit's directory of institutions, and rejects files whose BID it doesn't recognize. This is a Web Connect business rule, not a data problem: your transactions are fine, the envelope is wrong.",
        "Fixes, in order of effort: try the converter's default BID first (StatementClear ships one that QuickBooks broadly accepts — it works for most users). If that's rejected, set your actual bank's BID in the advanced export settings; the help note in the dialog links the lookup. Corporate/regional QuickBooks editions are occasionally pickier — the BID of any major bank QuickBooks definitely supports is the pragmatic workaround, since QuickBooks uses the field for routing, not for validating that the transactions came from that bank.",
      ],
    },
    {
      heading: "Failure 2 — Import succeeds but transactions are missing (FITID dedupe)",
      paragraphs: [
        "QuickBooks identifies every bank transaction by its FITID. When an incoming FITID matches one already in the account — from a feed, or from a previous file import — QuickBooks silently skips it. No warning, no error, no count of skipped rows. It's the most confusing QBO behavior because the import reports success.",
        "If transactions are missing, the question is which dedupe bit you: (a) you imported an overlapping period before, (b) the bank feed already delivered those days, or (c) — the dangerous one — your converter generated non-unique FITIDs, so QuickBooks thinks distinct transactions are duplicates of each other. Two identical coffee purchases on the same day with a naive date+amount FITID collide; the second one vanishes.",
        "The (c) case is why FITID generation strategy matters when choosing a converter. StatementClear hashes date, amount, description, and row position, so identical-looking transactions stay distinct, while re-exporting the same statement produces the same IDs — deliberate re-imports stay safe. If you hit (a) or (b), nothing is wrong: the register already has those transactions. Verify against the register before assuming loss.",
      ],
    },
    {
      heading: "Failure 3 — Everything imported with wrong signs",
      paragraphs: [
        "Deposits showing as money out, card purchases showing as credits — sign convention mismatch. Bank-account QBO files expect deposits positive and withdrawals negative. Credit-card statements complicate this: the statement prints purchases as positive (they increase what you owe), but a QuickBooks credit-card account usually wants charges as negative amounts in OFX terms.",
        "The fix is one setting, not data surgery: re-export with the sign convention flipped. StatementClear's export dialog has a 'Flip signs (credit cards)' toggle and defaults it sensibly by account type; the reconciliation engine has already pinned each transaction's true direction from the statement's own balance math, so flipping is safe and exact.",
        "Import the corrected file after deleting the wrong-signed transactions (or into a fresh account if it was a first import). Note that re-importing the corrected file over the wrong one does not fix the existing rows — FITIDs match, so QuickBooks skips them.",
      ],
    },
    {
      heading: "Failure 4 — File won't upload at all / “file may be damaged”",
      paragraphs: [
        "QBO is OFX 1.02 SGML underneath — a 25-year-old format with sharp edges. Files fail structurally when: the header block is missing or has the wrong VERSION; tags that must not be closed are closed (SGML leaf elements don't take closing tags, and XML-style writers get this wrong); ampersands or angle brackets in payee names aren't escaped; or the NAME field exceeds 32 characters and a strict parser balks.",
        "If you hand-edited a QBO file, the culprit is almost certainly in what you touched — undo and adjust in the converter instead. Converter-produced files that fail structurally are a converter bug; StatementClear's OFX writer is golden-file tested for structure (balanced aggregates, header correctness, field limits, escaping) precisely because these errors are miserable to debug from QuickBooks' error message, which is the same vague sentence for all of them.",
      ],
    },
    {
      heading: "The five-minute diagnostic, in order",
      paragraphs: [],
      list: [
        "Open the .qbo in a text editor (it's plain text). Confirm it starts with OFXHEADER:100 and VERSION:102 lines, then an <OFX> block.",
        "Search for <INTU.BID> — present and numeric? If rejected at import, this is suspect #1.",
        "Spot-check three <STMTTRN> blocks: DTPOSTED is YYYYMMDD, TRNAMT signed decimal, FITID present and different on each.",
        "Compare two FITIDs from similar transactions (same amount, same day). Identical FITIDs = your missing-transaction cause.",
        "Check signs: find a known deposit, confirm TRNAMT is positive (bank account) — or matches your card account's convention.",
      ],
      ordered: true,
    },
    {
      heading: "Avoiding the whole class of problems",
      paragraphs: [
        "Three habits make QBO imports boring (the goal): convert from the statement PDF with a tool that reconciles before export, so completeness and signs are proven against the bank's own math; keep one file per statement period rather than overlapping ranges, so dedupe never has to guess; and import oldest-first, connecting any live feed only after the backfill. Do those, and the failure modes above mostly become things you read about once.",
      ],
    },
  ],
};
