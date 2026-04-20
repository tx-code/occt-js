import { test, expect } from "@playwright/test";

test("project home renders the primary workspace entrypoints", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Open STEP, IGES, or BREP" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Browse Files" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Tool MVP" })).toBeVisible();
  await expect(page.getByTestId("drop-zone")).toBeVisible();
});
