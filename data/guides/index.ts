import { GUIDE_EXCEL } from "./excel-analysis";
import { GUIDE_QBO } from "./quickbooks-online";
import { GUIDE_QBO_FAILS } from "./qbo-import-fails";
import { GUIDE_XERO } from "./xero";
import { GUIDE_YEAR_END } from "./year-end-cleanup";
import type { Guide } from "./types";

export type { Guide, GuideSection } from "./types";

export const GUIDES: Guide[] = [
  GUIDE_QBO,
  GUIDE_XERO,
  GUIDE_EXCEL,
  GUIDE_QBO_FAILS,
  GUIDE_YEAR_END,
];

export function guideBySlug(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug);
}
