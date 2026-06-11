import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@parser": path.resolve(__dirname, "packages/parser/src"),
      "@exporters": path.resolve(__dirname, "packages/exporters/src"),
    },
  },
  test: {
    include: ["packages/**/*.test.ts", "lib/**/*.test.ts"],
    environment: "node",
    testTimeout: 30000,
  },
});
