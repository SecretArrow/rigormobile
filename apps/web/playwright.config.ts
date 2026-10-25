import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for the RigorMobile web app.
 * Runs against a `next build` + `next start` server on port 3000.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: "./test-results",
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-chrome", use: { ...devices["Pixel 5"] } },
  ],
  webServer: {
    // Use `next dev` in CI for reliability — Turbopack's `next build` has
    // trouble with the @tailwindcss/oxide native module in some CI envs.
    // Locally we still build (faster for repeated test runs).
    command: process.env.CI
      ? "bunx next dev -p 3000"
      : "bun run build && bun run start",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
    env: {
      DATABASE_URL: "file:./test.db",
    },
  },
});
