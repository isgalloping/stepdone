import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  timeout: 180_000,
  expect: { timeout: 30_000 },
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  webServer: [
    {
      command: "pnpm --filter @stepdone/agent-worker start",
      url: "http://127.0.0.1:4101/health/live",
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: "pnpm --filter @stepdone/web dev",
      url: "http://localhost:3000",
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
});
