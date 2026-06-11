import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  use: {
    baseURL: "http://localhost:4173",
  },
  webServer: {
    command: "node scripts/serve-out.mjs",
    port: 4173,
    reuseExistingServer: true,
  },
});
