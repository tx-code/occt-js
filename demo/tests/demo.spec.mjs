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

// ---------------------------------------------------------------------------
// Face picking
// ---------------------------------------------------------------------------

test("clicking on model shows face selection panel", async ({ page }) => {
  await page.click("[data-testid='load-sample']");
  await expect(page.locator("[data-testid='stats-panel']")).toBeVisible({ timeout: 30_000 });

  const canvas = page.locator("[data-testid='render-canvas']");
  const box = await canvas.boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

  await expect(page.locator("[data-testid='selection-panel']")).toBeVisible({ timeout: 5000 });
});

// ---------------------------------------------------------------------------
// Pick mode switching
// ---------------------------------------------------------------------------

test("pick mode buttons switch correctly", async ({ page }) => {
  await page.click("[data-testid='load-sample']");
  await expect(page.locator("[data-testid='toolbar']")).toBeVisible({ timeout: 30_000 });

  await expect(page.locator("[data-testid='pick-face']")).toHaveClass(/cyan/);

  await page.click("[data-testid='pick-edge']");
  await expect(page.locator("[data-testid='pick-edge']")).toHaveClass(/cyan/);
  await expect(page.locator("[data-testid='pick-face']")).not.toHaveClass(/cyan/);

  await page.click("[data-testid='pick-vertex']");
  await expect(page.locator("[data-testid='pick-vertex']")).toHaveClass(/cyan/);
  await expect(page.locator("[data-testid='pick-edge']")).not.toHaveClass(/cyan/);
});

// ---------------------------------------------------------------------------
// Camera view presets
// ---------------------------------------------------------------------------

test("view preset buttons exist and are clickable", async ({ page }) => {
  await page.click("[data-testid='load-sample']");
  await expect(page.locator("[data-testid='toolbar']")).toBeVisible({ timeout: 30_000 });

  for (const dir of ["front", "back", "top", "bottom", "left", "right", "iso"]) {
    const btn = page.locator(`[data-testid='view-${dir}']`);
    await expect(btn).toBeVisible();
    await btn.click();
    await page.waitForTimeout(400); // wait for animation
  }
  // Should not crash
  await expect(page.locator("[data-testid='stats-panel']")).toBeVisible();
});

// ---------------------------------------------------------------------------
// Ortho / Perspective toggle
// ---------------------------------------------------------------------------

test("ortho/perspective toggle works", async ({ page }) => {
  await page.click("[data-testid='load-sample']");
  await expect(page.locator("[data-testid='toolbar']")).toBeVisible({ timeout: 30_000 });

  // Default is perspective (active)
  await expect(page.locator("[data-testid='proj-persp']")).toHaveClass(/cyan/);
  await expect(page.locator("[data-testid='proj-ortho']")).not.toHaveClass(/cyan/);

  // Switch to ortho
  await page.click("[data-testid='proj-ortho']");
  await expect(page.locator("[data-testid='proj-ortho']")).toHaveClass(/cyan/);
  await expect(page.locator("[data-testid='proj-persp']")).not.toHaveClass(/cyan/);

  // Switch back to perspective
  await page.click("[data-testid='proj-persp']");
  await expect(page.locator("[data-testid='proj-persp']")).toHaveClass(/cyan/);
});

// ---------------------------------------------------------------------------
// Model tree drawer
// ---------------------------------------------------------------------------

test("model tree drawer opens and closes", async ({ page }) => {
  await page.click("[data-testid='load-sample']");
  await expect(page.locator("[data-testid='toolbar']")).toBeVisible({ timeout: 30_000 });

  // Tree should be closed initially
  const tree = page.locator("[data-testid='model-tree']");
  await expect(tree).toHaveClass(/-translate-x-full/);

  // Open tree
  await page.click("[data-testid='toggle-tree']");
  await expect(tree).not.toHaveClass(/-translate-x-full/);

  // Close tree
  await page.click("[data-testid='close-tree']");
  await expect(tree).toHaveClass(/-translate-x-full/);
});

test("assembly model tree shows hierarchy", async ({ page }) => {
  const fileInput = page.locator("[data-testid='file-input']");
  await fileInput.setInputFiles(resolve(fixtures, "assembly.step"));
  await expect(page.locator("[data-testid='stats-panel']")).toBeVisible({ timeout: 30_000 });

  await page.click("[data-testid='toggle-tree']");
  const tree = page.locator("[data-testid='model-tree']");
  await expect(tree).not.toHaveClass(/-translate-x-full/);

  // Tree should contain node names from the assembly
  await expect(tree).toContainText("as1");
});

// ---------------------------------------------------------------------------
// Hover changes cursor
// ---------------------------------------------------------------------------

test("hovering over model changes cursor", async ({ page }) => {
  await page.click("[data-testid='load-sample']");
  await expect(page.locator("[data-testid='stats-panel']")).toBeVisible({ timeout: 30_000 });

  const canvas = page.locator("[data-testid='render-canvas']");
  const box = await canvas.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(300);

  const cursor = await canvas.evaluate(el => el.style.cursor);
  expect(cursor).toBe("pointer");
});

// ---------------------------------------------------------------------------
// Drag preserves selection
// ---------------------------------------------------------------------------

test("drag on empty space preserves selection", async ({ page }) => {
  await page.click("[data-testid='load-sample']");
  await expect(page.locator("[data-testid='stats-panel']")).toBeVisible({ timeout: 30_000 });

  const canvas = page.locator("[data-testid='render-canvas']");
  const box = await canvas.boundingBox();

  // Select a face
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect(page.locator("[data-testid='selection-panel']")).toBeVisible({ timeout: 5000 });

  // Drag on empty space (corner area, away from model)
  const sx = box.x + 30, sy = box.y + box.height - 30;
  await page.mouse.move(sx, sy);
  await page.mouse.down();
  for (let i = 0; i < 10; i++) await page.mouse.move(sx + i * 10, sy - i * 6);
  await page.mouse.up();
  await page.waitForTimeout(300);

  // Selection should remain
  await expect(page.locator("[data-testid='selection-panel']")).toBeVisible();
});

test("short click on empty clears selection", async ({ page }) => {
  await page.click("[data-testid='load-sample']");
  await expect(page.locator("[data-testid='stats-panel']")).toBeVisible({ timeout: 30_000 });

  const canvas = page.locator("[data-testid='render-canvas']");
  const box = await canvas.boundingBox();

  // Select a face
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect(page.locator("[data-testid='selection-panel']")).toBeVisible({ timeout: 5000 });

  // Short click on empty (corner, away from model)
  await page.mouse.click(box.x + box.width - 10, box.y + box.height - 10);
  await page.waitForTimeout(500);
  await expect(page.locator("[data-testid='selection-panel']")).not.toBeVisible();
});
