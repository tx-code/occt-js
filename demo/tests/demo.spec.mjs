import { test, expect } from "@playwright/test";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const fixtures = resolve(__dirname, "..", "..", "test");

test.beforeEach(async ({ page }) => {
  await page.goto("/demo/index.html");
  // Wait for Babylon canvas to initialize
  await expect(page.locator("#renderCanvas")).toBeVisible();
});

// ---------------------------------------------------------------------------
// Landing page
// ---------------------------------------------------------------------------

test("shows drop zone on initial load", async ({ page }) => {
  const dropZone = page.locator("#dropZone");
  await expect(dropZone).toBeVisible();
  await expect(dropZone).toContainText("Drop a STEP, IGES, or BREP file here");
  await expect(dropZone).toContainText("Browse Files");
});

test("top bar and stats are hidden initially", async ({ page }) => {
  await expect(page.locator("#topBar")).toBeHidden();
  await expect(page.locator("#statsPanel")).toBeHidden();
  await expect(page.locator("#viewControls")).toBeHidden();
});

// ---------------------------------------------------------------------------
// Sample file
// ---------------------------------------------------------------------------

test("loads sample STEP file via link", async ({ page }) => {
  await page.click("#loadSample");

  // Wait for loading to finish and stats to appear
  await expect(page.locator("#statsPanel")).toBeVisible({ timeout: 30_000 });

  // Drop zone should be hidden (uses CSS opacity, check class)
  await expect(page.locator("#dropZone")).toHaveClass(/hidden/);

  // Top bar shows filename
  await expect(page.locator("#fileNameDisplay")).toContainText("simple_part.step");

  // Stats: STEP cube = 6 faces, 12 edges, 8 vertices, 12 triangles
  const stats = page.locator("#statsContent");
  await expect(stats).toContainText("STEP");
  await expect(stats).toContainText("12"); // triangles
  await expect(stats).toContainText("6");  // topo faces
});

// ---------------------------------------------------------------------------
// File upload: STEP
// ---------------------------------------------------------------------------

test("imports STEP file via file input", async ({ page }) => {
  const fileInput = page.locator("#fileInput");
  await fileInput.setInputFiles(resolve(fixtures, "simple_part.step"));

  await expect(page.locator("#statsPanel")).toBeVisible({ timeout: 30_000 });
  await expect(page.locator("#fileNameDisplay")).toContainText("simple_part.step");

  const stats = page.locator("#statsContent");
  await expect(stats).toContainText("STEP");
  await expect(stats).toContainText("Topo Faces");
});

// ---------------------------------------------------------------------------
// File upload: BREP
// ---------------------------------------------------------------------------

test("imports BREP file via file input", async ({ page }) => {
  const fileInput = page.locator("#fileInput");
  await fileInput.setInputFiles(resolve(fixtures, "as1_pe_203.brep"));

  await expect(page.locator("#statsPanel")).toBeVisible({ timeout: 30_000 });
  await expect(page.locator("#fileNameDisplay")).toContainText("as1_pe_203.brep");

  const stats = page.locator("#statsContent");
  await expect(stats).toContainText("BREP");
  await expect(stats).toContainText("53");   // topo faces (5 geometries total)
  await expect(stats).toContainText("126");  // topo edges
  await expect(stats).toContainText("84");   // topo vertices
});

// ---------------------------------------------------------------------------
// File upload: IGES
// ---------------------------------------------------------------------------

test("imports IGES file via file input", async ({ page }) => {
  const fileInput = page.locator("#fileInput");
  await fileInput.setInputFiles(resolve(fixtures, "cube_10x10.igs"));

  await expect(page.locator("#statsPanel")).toBeVisible({ timeout: 30_000 });
  await expect(page.locator("#fileNameDisplay")).toContainText("cube_10x10.igs");

  const stats = page.locator("#statsContent");
  await expect(stats).toContainText("IGES");
  await expect(stats).toContainText("Topo Faces");
});

// ---------------------------------------------------------------------------
// Assembly STEP
// ---------------------------------------------------------------------------

test("imports assembly STEP with multiple nodes", async ({ page }) => {
  const fileInput = page.locator("#fileInput");
  await fileInput.setInputFiles(resolve(fixtures, "assembly.step"));

  await expect(page.locator("#statsPanel")).toBeVisible({ timeout: 30_000 });

  const stats = page.locator("#statsContent");
  await expect(stats).toContainText("28"); // nodeCount
  await expect(stats).toContainText("Reused");
});

// ---------------------------------------------------------------------------
// View controls
// ---------------------------------------------------------------------------

test("face and edge toggles work", async ({ page }) => {
  // Load a model first
  await page.click("#loadSample");
  await expect(page.locator("#viewControls")).toBeVisible({ timeout: 30_000 });

  const facesBtn = page.locator("#toggleFaces");
  const edgesBtn = page.locator("#toggleEdges");

  // Both start active
  await expect(facesBtn).toHaveClass(/active/);
  await expect(edgesBtn).toHaveClass(/active/);

  // Toggle faces off
  await facesBtn.click();
  await expect(facesBtn).not.toHaveClass(/active/);

  // Toggle faces back on
  await facesBtn.click();
  await expect(facesBtn).toHaveClass(/active/);

  // Toggle edges off
  await edgesBtn.click();
  await expect(edgesBtn).not.toHaveClass(/active/);
});

// ---------------------------------------------------------------------------
// Reset view
// ---------------------------------------------------------------------------

test("reset view button works after model load", async ({ page }) => {
  await page.click("#loadSample");
  await expect(page.locator("#topBar")).toBeVisible({ timeout: 30_000 });

  // Click reset — should not throw
  await page.click("#resetBtn");

  // Stats still visible after reset
  await expect(page.locator("#statsPanel")).toBeVisible();
});

// ---------------------------------------------------------------------------
// Load second file replaces first
// ---------------------------------------------------------------------------

test("loading a second file replaces the first", async ({ page }) => {
  // Load STEP first
  const fileInput = page.locator("#fileInput");
  await fileInput.setInputFiles(resolve(fixtures, "simple_part.step"));
  await expect(page.locator("#statsPanel")).toBeVisible({ timeout: 30_000 });
  await expect(page.locator("#fileNameDisplay")).toContainText("simple_part.step");

  // Load BREP
  const fileInput2 = page.locator("#fileInput2");
  await fileInput2.setInputFiles(resolve(fixtures, "as1_pe_203.brep"));
  await expect(page.locator("#fileNameDisplay")).toContainText("as1_pe_203.brep");
  await expect(page.locator("#statsContent")).toContainText("BREP");
});

// ---------------------------------------------------------------------------
// Face picking
// ---------------------------------------------------------------------------

test("clicking on model shows face selection panel", async ({ page }) => {
  // Load sample model
  await page.click("#loadSample");
  await expect(page.locator("#statsPanel")).toBeVisible({ timeout: 30_000 });

  // Selection panel should be hidden initially
  await expect(page.locator("#selectionPanel")).toBeHidden();

  // Click the center of the canvas (should hit the model)
  const canvas = page.locator("#renderCanvas");
  const box = await canvas.boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

  // Selection panel should appear with face info
  await expect(page.locator("#selectionPanel")).toBeVisible({ timeout: 5000 });
  await expect(page.locator("#selectionContent")).toContainText("Face ID");
  await expect(page.locator("#selectionContent")).toContainText("Triangles");
  await expect(page.locator("#selectionContent")).toContainText("Boundary Edges");
});

test("clicking clear button hides selection panel", async ({ page }) => {
  await page.click("#loadSample");
  await expect(page.locator("#statsPanel")).toBeVisible({ timeout: 30_000 });

  // Click center to select
  const canvas = page.locator("#renderCanvas");
  const box = await canvas.boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect(page.locator("#selectionPanel")).toBeVisible({ timeout: 5000 });

  // Click close button
  await page.click("#clearSelection");
  await expect(page.locator("#selectionPanel")).toBeHidden();
});

// ---------------------------------------------------------------------------
// Selection mode switching
// ---------------------------------------------------------------------------

test("mode buttons switch correctly", async ({ page }) => {
  await page.click("#loadSample");
  await expect(page.locator("#selectMode")).toBeVisible({ timeout: 30_000 });

  // Default is Face
  await expect(page.locator("#modeFace")).toHaveClass(/active/);
  await expect(page.locator("#modeEdge")).not.toHaveClass(/active/);

  // Switch to Edge
  await page.click("#modeEdge");
  await expect(page.locator("#modeEdge")).toHaveClass(/active/);
  await expect(page.locator("#modeFace")).not.toHaveClass(/active/);

  // Switch to Vertex
  await page.click("#modeVertex");
  await expect(page.locator("#modeVertex")).toHaveClass(/active/);
  await expect(page.locator("#modeEdge")).not.toHaveClass(/active/);
});

test("edge mode: clicking model shows edge info", async ({ page }) => {
  await page.click("#loadSample");
  await expect(page.locator("#selectMode")).toBeVisible({ timeout: 30_000 });
  await page.click("#modeEdge");

  const canvas = page.locator("#renderCanvas");
  const box = await canvas.boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

  await expect(page.locator("#selectionPanel")).toBeVisible({ timeout: 5000 });
  await expect(page.locator("#selectionContent")).toContainText("Edge ID");
  await expect(page.locator("#selectionContent")).toContainText("Owner Faces");
});

test("vertex mode: clicking model shows vertex info", async ({ page }) => {
  await page.click("#loadSample");
  await expect(page.locator("#selectMode")).toBeVisible({ timeout: 30_000 });
  await page.click("#modeVertex");

  // Vertices are at corners — invoke highlightVertex directly via the
  // page globals (non-module script, so all top-level names are on window)
  await page.evaluate(() => {
    const [sourceMesh] = meshGeoMap.keys();
    if (!sourceMesh) throw new Error("no mesh loaded");
    const geo = meshGeoMap.get(sourceMesh);
    if (!geo.vertices || geo.vertices.length === 0) throw new Error("no vertices");
    highlightVertex(sourceMesh, geo.vertices[0].id);
  });

  await expect(page.locator("#selectionPanel")).toBeVisible({ timeout: 5000 });
  await expect(page.locator("#selectionContent")).toContainText("Vertex ID");
});

test("switching mode clears selection", async ({ page }) => {
  await page.click("#loadSample");
  await expect(page.locator("#selectMode")).toBeVisible({ timeout: 30_000 });

  // Select a face
  const canvas = page.locator("#renderCanvas");
  const box = await canvas.boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect(page.locator("#selectionPanel")).toBeVisible({ timeout: 5000 });

  // Switch to Edge mode — selection should clear
  await page.click("#modeEdge");
  await expect(page.locator("#selectionPanel")).toBeHidden();
});
