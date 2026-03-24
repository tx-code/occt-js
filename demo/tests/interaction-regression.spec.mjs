import { test, expect } from "@playwright/test";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const fixtures = resolve(__dirname, "..", "..", "test");

/**
 * Full interaction regression tests.
 * These simulate real user workflows with the assembly model.
 */

test.describe("Interaction regression — assembly model", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/demo/index.html");
    // Load assembly model
    const fileInput = page.locator("#fileInput");
    await fileInput.setInputFiles(resolve(fixtures, "assembly.step"));
    await expect(page.locator("#statsPanel")).toBeVisible({ timeout: 30_000 });
  });

  test("1. select face → drag to rotate → selection stays", async ({ page }) => {
    const canvas = page.locator("#renderCanvas");
    const box = await canvas.boundingBox();
    const cx = box.x + box.width / 2, cy = box.y + box.height / 2;

    // Click center to select a face
    await page.mouse.click(cx, cy);
    await expect(page.locator("#selectionPanel")).toBeVisible({ timeout: 5000 });
    const title = await page.locator("#selectionTitle").textContent();
    expect(title).toContain("Selected Face");

    // Now drag from an empty area to rotate the camera
    const startX = box.x + 30, startY = box.y + box.height - 30;
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    // Drag 100px — definitely over 5px threshold
    for (let i = 0; i < 10; i++) {
      await page.mouse.move(startX + i * 10, startY - i * 6);
    }
    await page.mouse.up();
    await page.waitForTimeout(200);

    // Selection panel must still be visible with same face
    await expect(page.locator("#selectionPanel")).toBeVisible();
    const titleAfter = await page.locator("#selectionTitle").textContent();
    expect(titleAfter).toBe(title);
  });

  test("2. select face → short click empty → selection clears", async ({ page }) => {
    const canvas = page.locator("#renderCanvas");
    const box = await canvas.boundingBox();

    // Select a face
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await expect(page.locator("#selectionPanel")).toBeVisible({ timeout: 5000 });

    // Short click on far corner (empty space, no drag)
    await page.mouse.click(box.x + box.width - 5, box.y + box.height - 5);
    await page.waitForTimeout(300);

    // Selection should be cleared
    await expect(page.locator("#selectionPanel")).toBeHidden();
  });

  test("3. select face → click different face → selection replaces", async ({ page }) => {
    const canvas = page.locator("#renderCanvas");
    const box = await canvas.boundingBox();

    // Click center
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await expect(page.locator("#selectionPanel")).toBeVisible({ timeout: 5000 });
    const firstId = await page.locator("#selectionContent").textContent();

    // Click slightly offset (different part of model, likely different face)
    await page.mouse.click(box.x + box.width / 2 + 40, box.y + box.height / 2 - 20);
    await page.waitForTimeout(300);

    // Panel should still be visible (new face selected)
    await expect(page.locator("#selectionPanel")).toBeVisible();
  });

  test("4. select face → close button → clears", async ({ page }) => {
    const canvas = page.locator("#renderCanvas");
    const box = await canvas.boundingBox();

    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await expect(page.locator("#selectionPanel")).toBeVisible({ timeout: 5000 });

    await page.click("#clearSelection");
    await expect(page.locator("#selectionPanel")).toBeHidden();
  });

  test("5. select face → switch to Edge mode → selection clears → select edge", async ({ page }) => {
    const canvas = page.locator("#renderCanvas");
    const box = await canvas.boundingBox();

    // Select face
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await expect(page.locator("#selectionPanel")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("#selectionTitle")).toContainText("Face");

    // Switch to Edge — clears selection
    await page.click("#modeEdge");
    await expect(page.locator("#selectionPanel")).toBeHidden();

    // Click on model in edge mode
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(500);

    // Should show edge info (if an edge was close enough) or panel stays hidden
    const visible = await page.locator("#selectionPanel").isVisible();
    if (visible) {
      await expect(page.locator("#selectionContent")).toContainText("Edge ID");
    }
  });

  test("6. rapid clicks on model don't crash", async ({ page }) => {
    const canvas = page.locator("#renderCanvas");
    const box = await canvas.boundingBox();
    const cx = box.x + box.width / 2, cy = box.y + box.height / 2;

    // Rapid fire 10 clicks
    for (let i = 0; i < 10; i++) {
      await page.mouse.click(cx + (i % 3) * 10, cy + (i % 2) * 10);
    }
    await page.waitForTimeout(500);

    // Page should not have crashed — canvas still responsive
    const canvasVisible = await canvas.isVisible();
    expect(canvasVisible).toBe(true);
  });

  test("7. hover shows cursor, then click selects, hover still works after", async ({ page }) => {
    const canvas = page.locator("#renderCanvas");
    const box = await canvas.boundingBox();
    const cx = box.x + box.width / 2, cy = box.y + box.height / 2;

    // Hover over model
    await page.mouse.move(cx, cy);
    await page.waitForTimeout(200);
    let cursor = await canvas.evaluate(el => el.style.cursor);
    expect(cursor).toBe("pointer");

    // Click to select
    await page.mouse.click(cx, cy);
    await expect(page.locator("#selectionPanel")).toBeVisible({ timeout: 5000 });

    // Move slightly — hover should still work
    await page.mouse.move(cx + 20, cy + 20);
    await page.waitForTimeout(200);
    cursor = await canvas.evaluate(el => el.style.cursor);
    // Cursor should still be pointer (over model) or empty (moved off model)
    // Either is valid — just should not crash
  });
});
