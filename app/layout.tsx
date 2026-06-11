import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, IBM_Plex_Serif } from "next/font/google";
import "./globals.css";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { SITE_URL } from "@/lib/site";

/*
 * Type system: the IBM Plex superfamily — Serif for display, Sans for body,
 * Mono for every number. One engineered family with three voices: the serif
 * carries the engraved-financial-document register, the mono guarantees
 * true tabular figures, and they share metrics so tables and prose align.
 */
const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
});
const plexSerif = IBM_Plex_Serif({
  variable: "--font-plex-serif",
  weight: ["500", "600"],
  subsets: ["latin"],
});
const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  weight: ["400", "500"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default:
      "StatementClear — Convert bank statements to CSV, Excel, QBO. In your browser.",
    template: "%s · StatementClear",
  },
  description:
    "Convert PDF bank and credit-card statements to CSV, Excel, QBO/QFX/OFX, and Xero. Parsing runs entirely in your browser — your statement never leaves your device — and every file is reconciled against its own opening and closing balances.",
  openGraph: {
    siteName: "StatementClear",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#f7f8f7",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${plexSans.variable} ${plexSerif.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
