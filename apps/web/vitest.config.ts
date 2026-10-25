import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    include: ["tests/unit/**/*.test.{ts,tsx}"],
    environment: "node",
    globals: false,
  },
  // Disable all CSS / PostCSS / Tailwind processing for unit tests —
  // we only test pure TS logic. This avoids loading postcss.config.mjs
  // (which uses @tailwindcss/postcss and is incompatible with vitest's
  // built-in postcss loader).
  css: false,
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
