import { test, expect } from "@playwright/test";

test("project home renders the primary workspace entrypoints", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Open STEP, IGES, or BREP" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Browse Files" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Generate Optional Tool" })).toBeVisible();
  await expect(page.getByTestId("drop-zone")).toContainText(/Most CAM samples start with a workpiece/i);
  await expect(page.getByTestId("drop-zone")).toContainText(/optional tool/i);
  await expect(page.getByTestId("drop-zone")).toContainText(/run one exact action or CAM sample check/i);
  await expect(page.getByTestId("drop-zone")).toBeVisible();
});
