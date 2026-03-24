import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "demo/tests",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: "http://localhost:9090",
    headless: true,
  },
  webServer: {
    command: "node demo/server.mjs",
    port: 9090,
    reuseExistingServer: true,
    timeout: 10_000,
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
});
