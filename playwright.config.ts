import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for end-to-end tests.
 * Run with: bunx playwright test
 *
 * Note: Playwright is an optional dev dependency. Install with:
 *   bun add -d @playwright/test && bunx playwright install
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  fullyParallel: true,
  reporter: [["list"]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:8080",
    trace: "on-first-retry",
  },
  webServer: {
    command: "bun run dev",
    url: "http://localhost:8080",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
