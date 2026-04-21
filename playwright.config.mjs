import { defineConfig } from "@playwright/test";

const PLAYWRIGHT_HOST = process.env.PLAYWRIGHT_HOST ?? "127.0.0.1";
const PLAYWRIGHT_PORT = Number(process.env.PLAYWRIGHT_PORT ?? 4173);
const PLAYWRIGHT_BASE_URL = `http://${PLAYWRIGHT_HOST}:${PLAYWRIGHT_PORT}`;

export default defineConfig({
  testDir: "demo/tests",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: PLAYWRIGHT_BASE_URL,
    headless: true,
  },
  webServer: {
    command: `cd demo && npx vite --host ${PLAYWRIGHT_HOST} --port ${PLAYWRIGHT_PORT} --strictPort`,
    reuseExistingServer: false,
    timeout: 30_000,
    url: PLAYWRIGHT_BASE_URL,
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
});
