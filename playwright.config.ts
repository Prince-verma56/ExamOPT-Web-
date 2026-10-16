import { defineConfig, devices } from "@playwright/test";

/**
 * Browser end-to-end tests. They run against an already running ExamOpt
 * server (default http://localhost:3000, override with E2E_BASE_URL) that uses
 * a development Clerk instance; see tests/e2e/clerk-users.ts.
 *
 *   npx playwright test
 *
 * The suite reads live data and the Demo Studio sandbox. Its only writes are
 * one namespaced test room (ZZ-E2E-*) created by the CSV import test and
 * deleted at the end of that test.
 */
export default defineConfig({
  testDir: "tests/e2e",
  outputDir: "test-results/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 20_000 },
  reporter: [["list"]],
  globalSetup: "./tests/e2e/global-setup.ts",
  globalTeardown: "./tests/e2e/global-teardown.ts",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    { name: "desktop", testMatch: /(admin|demo|csv|student)\.spec\.ts/, dependencies: ["setup"], use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "responsive", testMatch: /responsive\.spec\.ts/, dependencies: ["setup"], use: { ...devices["Desktop Chrome"] } },
  ],
});
