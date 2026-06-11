export interface BankFaq {
  q: string;
  a: string;
}

export interface BankEntry {
  /** URL slug: /convert/[slug]-statement-to-csv */
  slug: string;
  name: string;
  kind: "bank" | "credit-card" | "fintech" | "brokerage" | "payments";
  region: "US" | "CA" | "UK" | "EU";
  /** Steps to download a PDF statement from this institution. */
  downloadSteps: string[];
  /** What the institution exports natively, and in which formats. */
  nativeExports: string;
  /** The gap the converter fills for this institution's customers. */
  gap: string;
  /** Real layout quirks of this institution's statements. */
  quirks: string[];
  faq: BankFaq[];
  /** True when a dedicated parser template exists (vs. generic parser). */
  hasTemplate?: boolean;
}
