"use client";

/**
 * Opt-in failure reporter: when a parse fails or won't reconcile, the user
 * can download an anonymized layout JSON and email it so the layout becomes
 * a new template. Shows exactly what's in the file before anything leaves
 * the machine — and nothing leaves automatically.
 */

import { useMemo, useState } from "react";
import type { RawPage } from "@parser/types";
import { anonymizeLayout } from "@/lib/anonymize";
import { downloadBytes } from "@/lib/download";
import { SUPPORT_EMAIL } from "@/lib/site";

export function FailureReporter({ pages, errorType }: { pages: RawPage[]; errorType: string }) {
  const [open, setOpen] = useState(false);
  const layout = useMemo(() => (open ? anonymizeLayout(pages, errorType) : null), [open, pages, errorType]);
  const json = useMemo(() => (layout ? JSON.stringify(layout, null, 2) : ""), [layout]);

  return (
    <div className="rounded-sm border border-rule bg-surface p-4 text-sm">
      <p className="font-medium">Help us support your bank</p>
      <p className="mt-1 text-ink-soft">
        Generate an anonymized layout file: the page geometry is kept, every
        word is replaced with a hash, every number is replaced with a random
        one of the same shape, and account numbers are stripped. You see the
        exact contents before deciding to send it.
      </p>
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-3 rounded-sm border border-ink px-3 py-1.5 font-medium hover:bg-ink hover:text-white"
        >
          Generate anonymized layout
        </button>
      ) : (
        <>
          <pre className="figures mt-3 max-h-48 overflow-auto rounded-sm border border-rule bg-background p-2 text-[11px] leading-relaxed">
            {json.length > 4000 ? json.slice(0, 4000) + "\n… (truncated preview — the download contains the full layout)" : json}
          </pre>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => downloadBytes("statementclear-layout-report.json", json, "application/json")}
              className="rounded-sm bg-ink px-3 py-1.5 font-medium text-white hover:bg-ink/85"
            >
              Download layout report
            </button>
            <a
              href={`mailto:${SUPPORT_EMAIL}?subject=Bank%20layout%20report&body=Attached%20is%20the%20anonymized%20layout%20report%20from%20StatementClear.%20Bank%3A%20`}
              className="rounded-sm border border-rule px-3 py-1.5 hover:border-rule-strong"
            >
              Email it to {SUPPORT_EMAIL}
            </a>
          </div>
          <p className="mt-2 text-xs text-ink-soft">
            Most reported layouts become supported templates within days.
          </p>
        </>
      )}
    </div>
  );
}
