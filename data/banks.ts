import { INTL } from "./banks-intl";
import { US_MAJOR } from "./banks-us-major";
import { US_OTHER } from "./banks-us-other";
import type { BankEntry } from "./banks-types";

export type { BankEntry } from "./banks-types";

export const BANKS: BankEntry[] = [...US_MAJOR, ...US_OTHER, ...INTL];

export function bankBySlug(slug: string): BankEntry | undefined {
  return BANKS.find((b) => b.slug === slug);
}

/** Full URL slug for a bank page: chase → chase-statement-to-csv */
export function bankPageSlug(bank: BankEntry): string {
  return `${bank.slug}-statement-to-csv`;
}
