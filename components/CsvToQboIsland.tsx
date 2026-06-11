"use client";

import dynamic from "next/dynamic";

export const CsvToQboIsland = dynamic(
  () => import("./CsvToQbo").then((m) => m.CsvToQbo),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-sm border-2 border-dashed border-rule-strong bg-surface px-6 py-12 text-center">
        <p className="text-lg font-medium">Drop a CSV of transactions here</p>
        <p className="mt-2 text-sm text-ink-soft">Loading the converter…</p>
      </div>
    ),
  },
);
