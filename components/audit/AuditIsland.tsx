"use client";

import dynamic from "next/dynamic";

export const AuditIsland = dynamic(() => import("./Audit").then((m) => m.Audit), {
  ssr: false,
  loading: () => (
    <div className="rounded-sm border-2 border-dashed border-rule-strong bg-surface px-6 py-14 text-center">
      <p className="text-xl font-medium">Drop a year of statements here</p>
      <p className="mt-2 text-sm text-ink-soft">Loading the audit…</p>
    </div>
  ),
});
