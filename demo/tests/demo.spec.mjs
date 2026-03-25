import { test, expect } from "@playwright/test";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const fixtures = resolve(__dirname, "..", "..", "test");

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("shows drop zone on initial load", async ({ page }) => {
  await expect(page.locator("[data-testid='drop-zone']")).toBeVisible();
  await expect(page.locator("[data-testid='toolbar']")).toBeHidden();
});

test("toolbar and stats hidden initially", async ({ page }) => {
  await expect(page.locator("[data-testid='toolbar']")).toBeHidden();
  const statsPanel = page.locator("[data-testid='stats-panel']");
  await expect(statsPanel).not.toBeVisible();
});

test("loads sample STEP file via link", async ({ page }) => {
  await page.click("[data-testid='load-sample']");
  await expect(page.locator("[data-testid='stats-panel']")).toBeVisible({ timeout: 30_000 });
  await expect(page.locator("[data-testid='file-name']")).toContainText("simple_part.step");
});

test("imports STEP file via file input", async ({ page }) => {
  const fileInput = page.locator("[data-testid='file-input']");
  await fileInput.setInputFiles(resolve(fixtures, "simple_part.step"));
  await expect(page.locator("[data-testid='stats-panel']")).toBeVisible({ timeout: 30_000 });
  await expect(page.locator("[data-testid='file-name']")).toContainText("simple_part.step");
});

test("imports BREP file", async ({ page }) => {
  const fileInput = page.locator("[data-testid='file-input']");
  await fileInput.setInputFiles(resolve(fixtures, "as1_pe_203.brep"));
  await expect(page.locator("[data-testid='stats-panel']")).toBeVisible({ timeout: 30_000 });
  await expect(page.locator("[data-testid='stats-panel']")).toContainText("BREP");
});

test("imports IGES file", async ({ page }) => {
  const fileInput = page.locator("[data-testid='file-input']");
  await fileInput.setInputFiles(resolve(fixtures, "cube_10x10.igs"));
  await expect(page.locator("[data-testid='stats-panel']")).toBeVisible({ timeout: 30_000 });
  await expect(page.locator("[data-testid='stats-panel']")).toContainText("IGES");
});

test("imports assembly STEP with stats", async ({ page }) => {
  const fileInput = page.locator("[data-testid='file-input']");
  await fileInput.setInputFiles(resolve(fixtures, "assembly.step"));
  await expect(page.locator("[data-testid='stats-panel']")).toBeVisible({ timeout: 30_000 });
  await expect(page.locator("[data-testid='stats-panel']")).toContainText("28");
});

test("faces and edges toggles work", async ({ page }) => {
  await page.click("[data-testid='load-sample']");
  await expect(page.locator("[data-testid='toolbar']")).toBeVisible({ timeout: 30_000 });

  const facesBtn = page.locator("[data-testid='toggle-faces']");
  const edgesBtn = page.locator("[data-testid='toggle-edges']");

  // Faces starts active (has cyan border)
  await expect(facesBtn).toHaveClass(/cyan/);

  // Toggle off
  await facesBtn.click();
  await expect(facesBtn).not.toHaveClass(/cyan/);

  // Toggle back on
  await facesBtn.click();
  await expect(facesBtn).toHaveClass(/cyan/);

  // Toggle edges off
  await edgesBtn.click();
  await expect(edgesBtn).not.toHaveClass(/cyan/);
});

test("fit button works", async ({ page }) => {
  await page.click("[data-testid='load-sample']");
  await expect(page.locator("[data-testid='toolbar']")).toBeVisible({ timeout: 30_000 });
  await page.click("[data-testid='fit-all']");
  // Should not crash, stats still visible
  await expect(page.locator("[data-testid='stats-panel']")).toBeVisible();
});
