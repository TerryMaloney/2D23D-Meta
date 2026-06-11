import type { MetadataRoute } from "next";
import { BANKS, bankPageSlug } from "@/data/banks";
import { GUIDES } from "@/data/guides";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const page = (path: string, priority: number): MetadataRoute.Sitemap[number] => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority,
  });

  return [
    page("/", 1),
    page("/csv-to-qbo/", 0.9),
    page("/audit/", 0.9),
    page("/pdf-to-csv/", 0.9),
    page("/pdf-to-excel/", 0.9),
    page("/pdf-to-qbo/", 0.9),
    page("/pdf-to-xero/", 0.9),
    page("/pricing/", 0.8),
    page("/privacy/", 0.5),
    page("/convert/", 0.8),
    page("/guides/", 0.7),
    page("/alternatives/docuclipper/", 0.6),
    page("/alternatives/moneythumb/", 0.6),
    ...BANKS.map((b) => page(`/convert/${bankPageSlug(b)}/`, 0.7)),
    ...GUIDES.map((g) => page(`/guides/${g.slug}/`, 0.6)),
  ];
}
