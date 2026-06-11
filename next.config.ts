import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export: the entire site is static files. There is no server,
  // no upload endpoint, and no API route in this app. The only server-side
  // code in the repo is the Cloudflare Pages Function in /functions, which
  // handles license verification and never sees statement files.
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
