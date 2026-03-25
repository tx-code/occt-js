import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "demo/tests",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: "http://localhost:5173",
    headless: true,
  },
  webServer: {
    command: "cd demo && npx vite --port 5173",
    port: 5173,
    reuseExistingServer: true,
    timeout: 15_000,
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
});
