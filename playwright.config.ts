import { defineConfig, devices } from "@playwright/test";

// Runs e2e tests against a locally *built* web app (next build && next start),
// matching how it'll actually behave in production more closely than next dev.
// qa-tester expands coverage per feature; this scaffolds the config plus one
// smoke test proving the pipeline works end to end.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run start -w web",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
