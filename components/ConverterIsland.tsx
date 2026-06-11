"use client";

import dynamic from "next/dynamic";

/**
 * pdf.js and the parser only load in the browser — there is nothing for a
 * server to do here, and there is no server.
 */
export const ConverterIsland = dynamic(
  () => import("./Converter").then((m) => m.Converter),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-sm border-2 border-dashed border-rule-strong bg-surface px-6 py-14 text-center">
        <p className="text-xl font-medium">Drop a PDF bank statement here</p>
        <p className="mt-2 text-sm text-ink-soft">Loading the converter…</p>
      </div>
    ),
  },
);
