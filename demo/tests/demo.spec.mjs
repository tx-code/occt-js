import { test, expect, devices } from "@playwright/test";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const fixtures = resolve(__dirname, "..", "..", "test");
const iphone12 = devices["iPhone 12"];

function boxesOverlap(a, b) {
  if (!a || !b) return false;
  return !(
    a.x + a.width <= b.x ||
    b.x + b.width <= a.x ||
    a.y + a.height <= b.y ||
    b.y + b.height <= a.y
  );
}

async function loadFixture(page, fileName = "simple_part.step") {
  await page.locator("[data-testid='file-input']").setInputFiles(resolve(fixtures, fileName));
  await expect(page.locator("[data-testid='toolbar']")).toBeVisible({ timeout: 30_000 });
}

async function getLinePassLayerStats(page, layer) {
  return page.evaluate((targetLayer) => {
    const scene = window.BABYLON?.EngineStore?.LastCreatedScene;
    if (!scene) return null;
    const mesh = scene.meshes.find((candidate) => candidate.metadata?.occtLinePassLayer === targetLayer);
    return mesh?.metadata?.occtLinePassStats ?? null;
  }, layer);
}

async function getProjectedModelCornerPoint(page) {
  const canvas = page.locator("[data-testid='render-canvas']");
  const box = await canvas.boundingBox();
  const uv = await page.evaluate(() => {
    const scene = window.BABYLON?.EngineStore?.LastCreatedScene;
    const BABYLON = window.BABYLON;
    if (!scene || !BABYLON || !scene.activeCamera) return null;

    const engine = scene.getEngine();
    const camera = scene.activeCamera;
    const mesh = scene.meshes.find((candidate) =>
      candidate?.isVisible &&
      !candidate.metadata?.occtLinePassManaged &&
      typeof candidate.getTotalVertices === "function" &&
      candidate.getTotalVertices() > 0
    );
    if (!mesh) return null;

    const viewport = camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight());
    const corners = mesh.getBoundingInfo().boundingBox.vectorsWorld;
    let best = null;
    for (const corner of corners) {
      const projected = BABYLON.Vector3.Project(
        corner,
        BABYLON.Matrix.Identity(),
        scene.getTransformMatrix(),
        viewport
      );
      const u = projected.x / engine.getRenderWidth();
      const v = projected.y / engine.getRenderHeight();
      if (u < 0.05 || u > 0.95 || v < 0.05 || v > 0.95) {
        continue;
      }
      if (!best || projected.z < best.z) {
        best = { u, v, z: projected.z };
      }
    }
    return best ? { u: best.u, v: best.v } : null;
  });

  if (!box || !uv) {
    return null;
  }

  return {
    x: box.x + uv.u * box.width,
    y: box.y + uv.v * box.height,
  };
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  const enterDemo = page.getByRole("button", { name: "Enter Demo" });
  if (await enterDemo.count()) {
    await enterDemo.first().click();
  }
});

test("viewer shell still renders after package extraction", async ({ page }) => {
  await expect(page.getByTestId("render-canvas")).toBeVisible();
  await expect(page.getByTestId("drop-zone")).toBeVisible();

  await loadFixture(page);
  const viewcube = page.getByTestId("viewcube");
  await expect(viewcube).toBeVisible();
  await viewcube.click();
  await expect(page.getByTestId("stats-panel")).toBeVisible();
});

test("shows drop zone on initial load", async ({ page }) => {
  await expect(page.locator("[data-testid='drop-zone']")).toBeVisible();
  await expect(page.locator("[data-testid='toolbar']")).toBeHidden();
});

test("auto-orient mode is selected by default", async ({ page }) => {
  await expect(page.locator("[data-testid='orientation-mode-auto-empty']")).toHaveClass(/cyan/);
  await loadFixture(page);
  await expect(page.locator("[data-testid='orientation-mode-auto-toolbar']")).toHaveClass(/cyan/);
});

test("raw and auto-orient modes can be switched after import", async ({ page }) => {
  await loadFixture(page);

  const rawButton = page.locator("[data-testid='orientation-mode-raw-toolbar']");
  const autoButton = page.locator("[data-testid='orientation-mode-auto-toolbar']");

  await expect(rawButton).toBeVisible();
  await expect(autoButton).toBeVisible();
  await expect(autoButton).toHaveClass(/cyan/);
  await expect(rawButton).not.toHaveClass(/cyan/);

  await rawButton.click();
  await expect(rawButton).toHaveClass(/cyan/);
  await expect(autoButton).not.toHaveClass(/cyan/);

  await autoButton.click();
  await expect(autoButton).toHaveClass(/cyan/);
  await expect(rawButton).not.toHaveClass(/cyan/);
});

test("raw and auto-orient keep CAD edge line-pass meshes alive", async ({ page }) => {
  await loadFixture(page, "ANC101.stp");

  const getCadEdgeStats = async () => page.evaluate(() => {
    const scene = window.BABYLON?.EngineStore?.LastCreatedScene;
    const meshes = scene.meshes.filter((mesh) => mesh.metadata?.occtLinePassLayer === "cad-edges");
    return {
      meshCount: meshes.length,
      visible: meshes.every((mesh) => mesh.isVisible),
    };
  });

  expect((await getCadEdgeStats()).meshCount).toBeGreaterThan(0);

  await page.click("[data-testid='orientation-mode-raw-toolbar']");
  expect((await getCadEdgeStats()).meshCount).toBeGreaterThan(0);

  await page.click("[data-testid='orientation-mode-auto-toolbar']");
  expect((await getCadEdgeStats()).meshCount).toBeGreaterThan(0);
});

test("mock toolpath layer renders both solid and dashed segments", async ({ page }) => {
  await loadFixture(page, "simple_part.step");
  await page.click("[data-testid='toggle-toolpath']");

  const toolpathStats = await page.evaluate(() => {
    const scene = window.BABYLON?.EngineStore?.LastCreatedScene;
    const mesh = scene.meshes.find((candidate) => candidate.metadata?.occtLinePassLayer === "toolpath");
    return mesh?.metadata?.occtLinePassStats ?? null;
  });

  expect(toolpathStats).not.toBeNull();
  expect(toolpathStats.visibleSegments).toBeGreaterThan(0);
  expect(toolpathStats.dashedSegments).toBeGreaterThan(0);
  expect(toolpathStats.solidSegments).toBeGreaterThan(0);
});

test("preloads occt engine on initial load", async ({ page }) => {
  await expect(page.locator("script[src*='occt-js.js']")).toHaveCount(1, { timeout: 15_000 });
});

test("toolbar and stats hidden initially", async ({ page }) => {
  await expect(page.locator("[data-testid='toolbar']")).toBeHidden();
  const statsPanel = page.locator("[data-testid='stats-panel']");
  await expect(statsPanel).not.toBeVisible();
});

test("drop zone keeps import flow focused", async ({ page }) => {
  await expect(page.locator("[data-testid='load-sample']")).toHaveCount(0);
  await expect(page.locator("[data-testid='orientation-mode-raw-empty']")).toBeVisible();
  await expect(page.locator("[data-testid='orientation-mode-auto-empty']")).toBeVisible();
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
  await loadFixture(page);

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
  await loadFixture(page);
  await page.click("[data-testid='fit-all']");
  // Should not crash, stats still visible
  await expect(page.locator("[data-testid='stats-panel']")).toBeVisible();
});

// ---------------------------------------------------------------------------
// Face picking
// ---------------------------------------------------------------------------

test("clicking on model shows face selection panel", async ({ page }) => {
  await loadFixture(page);
  await expect(page.locator("[data-testid='stats-panel']")).toBeVisible();

  const canvas = page.locator("[data-testid='render-canvas']");
  const box = await canvas.boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

  await expect(page.locator("[data-testid='selection-panel']")).toBeVisible({ timeout: 5000 });
});

// ---------------------------------------------------------------------------
// Pick mode switching
// ---------------------------------------------------------------------------

test("pick mode buttons switch correctly", async ({ page }) => {
  await loadFixture(page);

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
  await loadFixture(page);

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
  await loadFixture(page);

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
  await loadFixture(page);

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
  await loadFixture(page);
  await expect(page.locator("[data-testid='stats-panel']")).toBeVisible();

  const canvas = page.locator("[data-testid='render-canvas']");
  const box = await canvas.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(300);

  const cursor = await canvas.evaluate(el => el.style.cursor);
  expect(cursor).toBe("pointer");
});

test("hover on an already selected face does not add duplicate face outlines", async ({ page }) => {
  await loadFixture(page);
  await expect(page.locator("[data-testid='stats-panel']")).toBeVisible();

  const canvas = page.locator("[data-testid='render-canvas']");
  const box = await canvas.boundingBox();
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;

  await page.mouse.click(x, y);
  await expect(page.locator("[data-testid='selection-panel']")).toBeVisible({ timeout: 5000 });

  await page.mouse.move(x, y);
  await page.waitForTimeout(300);

  const selectStats = await getLinePassLayerStats(page, "cad-highlight-select-visible");
  const hoverStats = await getLinePassLayerStats(page, "cad-highlight-hover-visible");

  expect(selectStats).not.toBeNull();
  expect(selectStats.visibleSegments).toBeGreaterThan(0);
  expect(hoverStats?.visibleSegments ?? 0).toBe(0);
});

test("hover highlight keeps xray layer alive", async ({ page }) => {
  await loadFixture(page);
  await expect(page.locator("[data-testid='stats-panel']")).toBeVisible();

  const canvas = page.locator("[data-testid='render-canvas']");
  const box = await canvas.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(300);

  const xrayStats = await getLinePassLayerStats(page, "cad-highlight-hover-xray");

  expect(xrayStats).not.toBeNull();
  expect(xrayStats.visibleSegments).toBeGreaterThan(0);
});

test("edge pick mode creates selection highlight batches", async ({ page }) => {
  await loadFixture(page);
  await expect(page.locator("[data-testid='stats-panel']")).toBeVisible();

  await page.click("[data-testid='pick-edge']");
  await expect(page.locator("[data-testid='pick-edge']")).toHaveClass(/cyan/);

  const target = await getProjectedModelCornerPoint(page);
  expect(target).not.toBeNull();
  await page.mouse.click(target.x + 6, target.y + 6);
  await expect(page.locator("[data-testid='selection-panel']")).toBeVisible({ timeout: 5000 });

  const selectStats = await getLinePassLayerStats(page, "cad-highlight-select-visible");
  expect(selectStats).not.toBeNull();
  expect(selectStats.visibleSegments).toBeGreaterThan(0);
});

test("edge hover keeps xray highlight batches in edge mode", async ({ page }) => {
  await loadFixture(page);
  await expect(page.locator("[data-testid='stats-panel']")).toBeVisible();

  await page.click("[data-testid='pick-edge']");
  const target = await getProjectedModelCornerPoint(page);
  expect(target).not.toBeNull();
  await page.mouse.move(target.x + 8, target.y + 8);
  await page.waitForTimeout(350);

  const hoverVisible = await getLinePassLayerStats(page, "cad-highlight-hover-visible");
  const hoverXray = await getLinePassLayerStats(page, "cad-highlight-hover-xray");
  expect(hoverVisible).not.toBeNull();
  expect(hoverVisible.visibleSegments).toBeGreaterThan(0);
  expect(hoverXray).not.toBeNull();
  expect(hoverXray.visibleSegments).toBeGreaterThan(0);
});

// ---------------------------------------------------------------------------
// Drag preserves selection
// ---------------------------------------------------------------------------

test("drag on empty space preserves selection", async ({ page }) => {
  await loadFixture(page);
  await expect(page.locator("[data-testid='stats-panel']")).toBeVisible();

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
  await loadFixture(page);
  await expect(page.locator("[data-testid='stats-panel']")).toBeVisible();

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

test.describe("mobile layout", () => {
  test.use({
    viewport: iphone12.viewport,
    userAgent: iphone12.userAgent,
    deviceScaleFactor: iphone12.deviceScaleFactor,
    isMobile: iphone12.isMobile,
    hasTouch: iphone12.hasTouch,
  });

  test("mobile toolbar stays compact when menu is open", async ({ page }) => {
    await page.locator("[data-testid='file-input']").setInputFiles(resolve(fixtures, "simple_part.step"));
    await expect(page.locator("[data-testid='toolbar']")).toBeVisible({ timeout: 30_000 });

    await page.click("[data-testid='menu-toggle']");

    const toolbarBox = await page.locator("[data-testid='toolbar']").boundingBox();
    expect(toolbarBox.height).toBeLessThanOrEqual(110);
  });

  test("mobile selection does not overlap utility panels", async ({ page }) => {
    await page.locator("[data-testid='file-input']").setInputFiles(resolve(fixtures, "simple_part.step"));
    await expect(page.locator("[data-testid='stats-panel']")).toBeVisible({ timeout: 30_000 });

    const canvas = page.locator("[data-testid='render-canvas']");
    const box = await canvas.boundingBox();
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);

    const selection = page.locator("[data-testid='selection-panel']");
    await expect(selection).toBeVisible({ timeout: 5000 });

    const statsBox = await page.locator("[data-testid='stats-panel']").boundingBox();
    const selectionBox = await selection.boundingBox();
    const viewcubeBox = await page.locator("[data-testid='viewcube']").boundingBox();

    expect(boxesOverlap(statsBox, selectionBox)).toBe(false);
    expect(boxesOverlap(viewcubeBox, selectionBox)).toBe(false);
  });
});

