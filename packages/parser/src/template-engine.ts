/**
 * Layer 4 — Bank templates: new banks are data, not code.
 *
 * A template pins down identification, balance labels, sign convention, and
 * layout quirks. Everything else still runs through the shared engine, so a
 * template is a few lines of JSON, addable without touching engine code.
 */

import { DEFAULT_OPTIONS, EngineOptions, SignConvention } from "./generic";
import { NumberLocale } from "./money";
import { TEMPLATES } from "./templates";

export interface BankTemplate {
  id: string;
  bankName: string;
  accountType?: string;
  identify: {
    /** Any of these strings (case-insensitive) in the document text. */
    anyOf: string[];
    /** Weaker corroborating strings. */
    layoutHints?: string[];
  };
  currency?: string;
  locale?: NumberLocale;
  signConvention?: SignConvention;
  twoDateColumns?: boolean;
  multilineDescriptions?: boolean;
  openingLabels?: string[];
  closingLabels?: string[];
  creditTotalLabels?: string[];
  debitTotalLabels?: string[];
  periodRegex?: string;
}

export interface TemplateMatch {
  template: BankTemplate;
  score: number;
}

/** Score = 2 per identify.anyOf hit + 1 per layout hint. ≥2 to qualify. */
export function scoreTemplate(template: BankTemplate, text: string): number {
  const lower = text.toLowerCase();
  let score = 0;
  let anyOfHit = false;
  for (const s of template.identify.anyOf) {
    if (lower.includes(s.toLowerCase())) {
      score += 2;
      anyOfHit = true;
    }
  }
  for (const s of template.identify.layoutHints ?? []) {
    if (lower.includes(s.toLowerCase())) score += 1;
  }
  return anyOfHit ? score : 0;
}

export function matchTemplate(
  text: string,
  templates: BankTemplate[] = TEMPLATES,
): TemplateMatch | null {
  let best: TemplateMatch | null = null;
  for (const template of templates) {
    const score = scoreTemplate(template, text);
    if (score >= 2 && (!best || score > best.score)) {
      best = { template, score };
    }
  }
  return best;
}

/** Merge a template over the engine defaults. */
export function optionsFromTemplate(template: BankTemplate | null): EngineOptions {
  if (!template) return { ...DEFAULT_OPTIONS };
  return {
    ...DEFAULT_OPTIONS,
    templateId: template.id,
    bankName: template.bankName,
    accountType: template.accountType,
    locale: template.locale ?? DEFAULT_OPTIONS.locale,
    currency: template.currency ?? DEFAULT_OPTIONS.currency,
    signConvention: template.signConvention ?? DEFAULT_OPTIONS.signConvention,
    twoDateColumns: template.twoDateColumns ?? DEFAULT_OPTIONS.twoDateColumns,
    multilineDescriptions:
      template.multilineDescriptions ?? DEFAULT_OPTIONS.multilineDescriptions,
    openingLabels: template.openingLabels ?? DEFAULT_OPTIONS.openingLabels,
    closingLabels: template.closingLabels ?? DEFAULT_OPTIONS.closingLabels,
    creditTotalLabels: template.creditTotalLabels ?? DEFAULT_OPTIONS.creditTotalLabels,
    debitTotalLabels: template.debitTotalLabels ?? DEFAULT_OPTIONS.debitTotalLabels,
    periodRegex: template.periodRegex,
  };
}
