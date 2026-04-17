import { test, expect } from "@playwright/test";

test("project home renders the primary workspace entrypoints", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "iMOS Studio" })).toBeVisible();
  await expect(page.getByRole("button", { name: "New Project" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Open main menu" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Recent Projects" })).toBeVisible();
});
