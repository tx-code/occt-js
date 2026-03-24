# Picking & Interaction Enhancement — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the demo viewer from face-only click selection to a full CAD picking system with Face/Edge/Vertex modes, hover preview, and multi-select with navigation.

**Architecture:** All changes are in the demo layer (`demo/index.html` + `demo/picking.js`). The picking module is extracted from the inline `<script>` to keep the file manageable. No C++/Wasm changes. Three phases delivered sequentially: A (modes), B (hover), C (multi-select).

**Tech Stack:** Babylon.js (CDN), Playwright for e2e tests

**Spec:** `docs/specs/2026-03-24-picking-interaction-design.md`

**Test command:** `npx playwright test`

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `demo/picking.js` | Create | Picking engine: mode state, hit-testing, highlight creation, hover, selection set, info panel rendering |
| `demo/index.html` | Modify | Add mode toolbar HTML, load `picking.js` as module, remove inline picking code, wire events |
| `demo/tests/demo.spec.mjs` | Modify | Add tests for edge/vertex picking, hover, multi-select, navigation links |

---

## Phase A: Selection Mode Expansion

### Task 1: Extract picking module and add mode toolbar UI

**Files:**
- Create: `demo/picking.js`
- Modify: `demo/index.html`

- [ ] **Step 1: Add mode toolbar HTML to `demo/index.html`**

Find the `viewControls` div (line 130) and add a mode selector after it:

```html
<div id="selectMode" style="display:none">
  <span class="mode-label">Select:</span>
  <button class="toggle active" id="modeFace" data-mode="face">Face</button>
  <button class="toggle" id="modeEdge" data-mode="edge">Edge</button>
  <button class="toggle" id="modeVertex" data-mode="vertex">Vertex</button>
</div>
```

Add CSS for `#selectMode`:
```css
#selectMode {
  position: absolute; bottom: 16px; right: 200px; z-index: 10;
  display: flex; align-items: center; gap: 6px;
}
#selectMode .mode-label { color: #888; font-size: 12px; margin-right: 2px; }
```

Update the selection panel header to be dynamic — change `<h3>Selected Face` to `<h3><span id="selectionTitle">Selected Face</span>`.

Show `#selectMode` alongside `#viewControls` when model is loaded (add `document.getElementById("selectMode").style.display = ""` in `loadFile` and `loadSampleFile` where `viewControls` is shown).

- [ ] **Step 2: Create `demo/picking.js` with core state and geometry math**

```javascript
// demo/picking.js — Picking engine for occt-js demo
// Loaded as regular script (not module) so it shares globals with index.html

const PICK_COLORS = {
  select: new BABYLON.Color3(0.3, 0.75, 1.0),
  selectEmissive: new BABYLON.Color3(0.1, 0.25, 0.4),
  hover: new BABYLON.Color3(0.96, 0.75, 0.14),  // #fbbf24
  edge: new BABYLON.Color3(0.3, 0.85, 1.0),
};

let pickMode = "face"; // "face" | "edge" | "vertex"

// --- Geometry math ---

function pointToSegmentDistanceSq(px, py, pz, ax, ay, az, bx, by, bz) {
  const dx = bx - ax, dy = by - ay, dz = bz - az;
  const lenSq = dx * dx + dy * dy + dz * dz;
  if (lenSq < 1e-12) {
    const ex = px - ax, ey = py - ay, ez = pz - az;
    return ex * ex + ey * ey + ez * ez;
  }
  let t = ((px - ax) * dx + (py - ay) * dy + (pz - az) * dz) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx - px, cy = ay + t * dy - py, cz = az + t * dz - pz;
  return cx * cx + cy * cy + cz * cz;
}

function distanceToEdgePolyline(px, py, pz, points) {
  let minDistSq = Infinity;
  for (let i = 0; i < points.length - 3; i += 3) {
    const dSq = pointToSegmentDistanceSq(
      px, py, pz,
      points[i], points[i + 1], points[i + 2],
      points[i + 3], points[i + 4], points[i + 5]
    );
    if (dSq < minDistSq) minDistSq = dSq;
  }
  return Math.sqrt(minDistSq);
}

function distanceToVertex(px, py, pz, pos) {
  const dx = px - pos[0], dy = py - pos[1], dz = pz - pos[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function getPickThreshold() {
  return (5 / engine.getRenderHeight()) * camera.radius * 2;
}

function worldToLocal(worldPoint, pickedMesh) {
  const inv = new BABYLON.Matrix();
  pickedMesh.getWorldMatrix().invertToRef(inv);
  return BABYLON.Vector3.TransformCoordinates(worldPoint, inv);
}

// --- Edge picking ---

function findClosestEdge(localPoint, geo, threshold) {
  if (!geo.edges) return null;
  let bestId = null, bestDist = threshold;
  for (const edge of geo.edges) {
    if (!edge.points || edge.points.length < 6) continue;
    const d = distanceToEdgePolyline(localPoint.x, localPoint.y, localPoint.z, edge.points);
    if (d < bestDist) { bestDist = d; bestId = edge.id; }
  }
  return bestId;
}

// --- Vertex picking ---

function findClosestVertex(localPoint, geo, threshold) {
  if (!geo.vertices) return null;
  let bestId = null, bestDist = threshold;
  for (const vert of geo.vertices) {
    const d = distanceToVertex(localPoint.x, localPoint.y, localPoint.z, vert.position);
    if (d < bestDist) { bestDist = d; bestId = vert.id; }
  }
  return bestId;
}

// --- Highlight helpers ---

function createEdgeHighlight(sourceMesh, edge, color) {
  if (!edge.points || edge.points.length < 6) return null;
  const pts = edge.points;
  const line = [];
  for (let i = 0; i < pts.length; i += 3) {
    line.push(new BABYLON.Vector3(pts[i], pts[i + 1], pts[i + 2]));
  }
  const lineSystem = BABYLON.MeshBuilder.CreateLineSystem("__edge_hl__", { lines: [line] }, scene);
  lineSystem.color = color;
  lineSystem.parent = sourceMesh;
  lineSystem.isPickable = false;
  lineSystem.renderingGroupId = 1;
  return lineSystem;
}

function createVertexHighlight(sourceMesh, vertex, color) {
  const sphere = BABYLON.MeshBuilder.CreateSphere("__vert_hl__", { diameter: camera.radius * 0.008 }, scene);
  sphere.position = new BABYLON.Vector3(vertex.position[0], vertex.position[1], vertex.position[2]);
  sphere.parent = sourceMesh;
  sphere.isPickable = false;
  sphere.renderingGroupId = 1;
  const mat = new BABYLON.StandardMaterial("__vert_mat__", scene);
  mat.diffuseColor = color;
  mat.emissiveColor = color.scale(0.5);
  sphere.material = mat;
  return sphere;
}
```

- [ ] **Step 3: Load `picking.js` in `index.html`**

Add `<script src="picking.js"></script>` after the Babylon.js CDN script (line 7) but before the inline `<script>` block.

Load order: `babylon.js` (CDN, `<head>`) → `picking.js` → inline `<script>`.

This works because:
- `picking.js` only references `BABYLON` at top-level scope (available from CDN in `<head>`).
- All references to `engine`, `camera`, `scene`, `meshGeoMap` are inside functions called after `init()`, so they are evaluated lazily at call time — not at script parse time.

- [ ] **Step 4: Commit**

```bash
git add demo/picking.js demo/index.html
git commit -m "refactor: extract picking module and add mode toolbar UI"
```

---

### Task 2: Implement Edge and Vertex picking + info panels

**Files:**
- Modify: `demo/picking.js`
- Modify: `demo/index.html`

- [ ] **Step 1: Add Edge and Vertex highlight + info functions to `picking.js`**

Add after the existing highlight helpers:

```javascript
function highlightEdge(sourceMesh, edgeId) {
  clearSelection();
  const geo = meshGeoMap.get(sourceMesh);
  if (!geo || !geo.edges) return;
  const edge = geo.edges.find(e => e.id === edgeId);
  if (!edge) return;

  selectedFaceId = null; // reuse or rename to selectedId

  const hl = createEdgeHighlight(sourceMesh, edge, PICK_COLORS.select);
  if (hl) { highlightEdgeLines = hl; }

  // Info panel
  const ownerStr = (edge.ownerFaceIds || []).join(", ") || "none";
  const rows = [
    ["Edge ID", edgeId],
    ["Points", Math.floor((edge.points?.length || 0) / 3)],
    ["Free Edge", edge.isFreeEdge ? "yes" : "no"],
    ["Owner Faces", ownerStr],
  ];
  showSelectionInfo("Selected Edge", rows);
}

function highlightVertex(sourceMesh, vertexId) {
  clearSelection();
  const geo = meshGeoMap.get(sourceMesh);
  if (!geo || !geo.vertices) return;
  const vertex = geo.vertices.find(v => v.id === vertexId);
  if (!vertex) return;

  const hl = createVertexHighlight(sourceMesh, vertex, PICK_COLORS.select);
  if (hl) { highlightMesh = hl; } // reuse highlightMesh slot for vertex sphere

  const pos = vertex.position;
  const rows = [
    ["Vertex ID", vertexId],
    ["X", pos[0]?.toFixed(2)],
    ["Y", pos[1]?.toFixed(2)],
    ["Z", pos[2]?.toFixed(2)],
  ];
  showSelectionInfo("Selected Vertex", rows);
}

function showSelectionInfo(title, rows) {
  document.getElementById("selectionTitle").textContent = title;
  document.getElementById("selectionContent").innerHTML = rows
    .map(([l, v]) => `<div class="row"><span class="label">${l}</span><span class="value">${v}</span></div>`)
    .join("");
  document.getElementById("selectionPanel").style.display = "";
}
```

- [ ] **Step 2: Refactor `highlightFace` to use `showSelectionInfo`**

In the existing `highlightFace` function in `index.html`, replace the info-panel DOM manipulation (lines 459-485) with a call to `showSelectionInfo("Selected Face", rows)`.

- [ ] **Step 3: Update `setupPicking` to dispatch by mode**

Replace the body of `scene.onPointerDown` in `setupPicking` (lines 488-521):

```javascript
function setupPicking() {
  scene.onPointerDown = (evt, pickResult) => {
    if (evt.button !== 0) return;

    if (!pickResult.hit || !pickResult.pickedMesh) {
      clearSelection();
      return;
    }

    const mesh = pickResult.pickedMesh;
    const sourceMesh = mesh.sourceMesh || mesh;
    const geo = meshGeoMap.get(sourceMesh);
    if (!geo) { clearSelection(); return; }

    if (pickMode === "face") {
      if (!geo.triangleToFaceMap) { clearSelection(); return; }
      const triIndex = pickResult.faceId;
      if (triIndex < 0 || triIndex >= geo.triangleToFaceMap.length) { clearSelection(); return; }
      const faceId = geo.triangleToFaceMap[triIndex];
      if (faceId < 1) { clearSelection(); return; }
      highlightFace(sourceMesh, faceId);
    } else if (pickMode === "edge") {
      const localPt = worldToLocal(pickResult.pickedPoint, mesh);
      const edgeId = findClosestEdge(localPt, geo, getPickThreshold());
      if (edgeId) highlightEdge(sourceMesh, edgeId);
      else clearSelection();
    } else if (pickMode === "vertex") {
      const localPt = worldToLocal(pickResult.pickedPoint, mesh);
      const vertexId = findClosestVertex(localPt, geo, getPickThreshold());
      if (vertexId) highlightVertex(sourceMesh, vertexId);
      else clearSelection();
    }
  };
}
```

- [ ] **Step 4: Wire mode buttons in `init()`**

Add to `init()`:
```javascript
document.querySelectorAll("#selectMode button[data-mode]").forEach(btn => {
  btn.addEventListener("click", () => {
    pickMode = btn.dataset.mode;
    clearSelection();
    if (typeof clearHover === "function") clearHover(); // Phase B adds hover; safe no-op before that
    document.querySelectorAll("#selectMode button[data-mode]").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
  });
});
```

- [ ] **Step 5: Commit**

```bash
git add demo/picking.js demo/index.html
git commit -m "feat: add Edge and Vertex picking modes with info panels"
```

---

### Task 3: Playwright tests for Phase A

**Files:**
- Modify: `demo/tests/demo.spec.mjs`

- [ ] **Step 1: Add mode switching and edge/vertex picking tests**

```javascript
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

  const canvas = page.locator("#renderCanvas");
  const box = await canvas.boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

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
```

- [ ] **Step 2: Run tests**

```bash
npx playwright test
```

Expected: All tests pass (existing 12 + new 4 = 16).

- [ ] **Step 3: Commit**

```bash
git add demo/tests/demo.spec.mjs
git commit -m "test: add Phase A picking mode tests (edge, vertex, mode switch)"
```

---

## Phase B: Hover Preview

### Task 4: Implement hover with rAF throttling

**Files:**
- Modify: `demo/picking.js`
- Modify: `demo/index.html`

- [ ] **Step 1: Add hover state and dispose logic to `picking.js`**

```javascript
// --- Hover state ---
let hoverState = null; // { mode, id, sourceMesh, disposables[] }
let hoverDirty = false;

function clearHover() {
  if (hoverState) {
    for (const d of hoverState.disposables) d.dispose();
    hoverState = null;
  }
  document.getElementById("renderCanvas").style.cursor = "";
}

function createFaceHoverHighlight(sourceMesh, face, geo) {
  const disposables = [];
  if (face.edgeIndices && geo.edges) {
    for (const ei of face.edgeIndices) {
      const edge = geo.edges[ei];
      const hl = createEdgeHighlight(sourceMesh, edge, PICK_COLORS.hover);
      if (hl) disposables.push(hl);
    }
  }
  return disposables;
}

function createEdgeHoverHighlight(sourceMesh, edge) {
  const hl = createEdgeHighlight(sourceMesh, edge, PICK_COLORS.hover);
  return hl ? [hl] : [];
}

function createVertexHoverHighlight(sourceMesh, vertex) {
  const hl = createVertexHighlight(sourceMesh, vertex, PICK_COLORS.hover);
  return hl ? [hl] : [];
}
```

- [ ] **Step 2: Add hover processing function**

```javascript
function processHover() {
  if (!hoverDirty) return;
  hoverDirty = false;

  const pickResult = scene.pick(scene.pointerX, scene.pointerY);

  if (!pickResult.hit || !pickResult.pickedMesh) {
    clearHover();
    return;
  }

  const mesh = pickResult.pickedMesh;
  const sourceMesh = mesh.sourceMesh || mesh;
  const geo = meshGeoMap.get(sourceMesh);
  if (!geo) { clearHover(); return; }

  // Step 1: Determine what we're hovering (ID only, no GPU resources yet)
  let hoveredMode = null, hoveredId = null;

  if (pickMode === "face") {
    if (geo.triangleToFaceMap) {
      const triIndex = pickResult.faceId;
      if (triIndex >= 0 && triIndex < geo.triangleToFaceMap.length) {
        const faceId = geo.triangleToFaceMap[triIndex];
        if (faceId >= 1) { hoveredMode = "face"; hoveredId = faceId; }
      }
    }
  } else if (pickMode === "edge") {
    const localPt = worldToLocal(pickResult.pickedPoint, mesh);
    const edgeId = findClosestEdge(localPt, geo, getPickThreshold());
    if (edgeId) { hoveredMode = "edge"; hoveredId = edgeId; }
  } else if (pickMode === "vertex") {
    const localPt = worldToLocal(pickResult.pickedPoint, mesh);
    const vertexId = findClosestVertex(localPt, geo, getPickThreshold());
    if (vertexId) { hoveredMode = "vertex"; hoveredId = vertexId; }
  }

  // Step 2: Early return if hovering the same item (no GPU work)
  if (hoveredId && hoverState && hoverState.mode === hoveredMode && hoverState.id === hoveredId) {
    return; // same item — keep existing hover, create nothing
  }

  clearHover();

  if (!hoveredId) return;

  // Step 3: Only NOW create GPU disposables for the new hover target
  let disposables = [];
  if (hoveredMode === "face") {
    const face = geo.faces.find(f => f.id === hoveredId);
    if (face) disposables = createFaceHoverHighlight(sourceMesh, face, geo);
  } else if (hoveredMode === "edge") {
    const edge = geo.edges.find(e => e.id === hoveredId);
    if (edge) disposables = createEdgeHoverHighlight(sourceMesh, edge);
  } else if (hoveredMode === "vertex") {
    const vertex = geo.vertices.find(v => v.id === hoveredId);
    if (vertex) disposables = createVertexHoverHighlight(sourceMesh, vertex);
  }

  hoverState = { mode: hoveredMode, id: hoveredId, sourceMesh, disposables };
  document.getElementById("renderCanvas").style.cursor = "pointer";
}
```

- [ ] **Step 3: Wire hover events in `setupPicking` (in index.html)**

Add to `setupPicking()`:

```javascript
const canvas = document.getElementById("renderCanvas");
canvas.addEventListener("pointermove", () => { hoverDirty = true; });
canvas.addEventListener("pointerleave", () => { clearHover(); hoverDirty = false; });

// Process hover in render loop
scene.onBeforeRenderObservable.add(processHover);
```

Also: clear hover on click (add `clearHover()` at the start of `scene.onPointerDown` handler).

- [ ] **Step 4: Commit**

```bash
git add demo/picking.js demo/index.html
git commit -m "feat: add hover preview with rAF throttling"
```

---

### Task 5: Playwright tests for Phase B

**Files:**
- Modify: `demo/tests/demo.spec.mjs`

- [ ] **Step 1: Add hover tests**

```javascript
test("hovering over model changes cursor to pointer", async ({ page }) => {
  await page.click("#loadSample");
  await expect(page.locator("#statsPanel")).toBeVisible({ timeout: 30_000 });

  const canvas = page.locator("#renderCanvas");
  const box = await canvas.boundingBox();

  // Move to center (over model)
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(200); // wait for rAF hover processing

  const cursor = await canvas.evaluate(el => el.style.cursor);
  expect(cursor).toBe("pointer");
});

test("hovering away from model resets cursor", async ({ page }) => {
  await page.click("#loadSample");
  await expect(page.locator("#statsPanel")).toBeVisible({ timeout: 30_000 });

  const canvas = page.locator("#renderCanvas");
  const box = await canvas.boundingBox();

  // Move to corner (likely empty space)
  await page.mouse.move(box.x + 5, box.y + 5);
  await page.waitForTimeout(200);

  const cursor = await canvas.evaluate(el => el.style.cursor);
  expect(cursor).toBe("");
});
```

- [ ] **Step 2: Run tests**

```bash
npx playwright test
```

Expected: All pass (16 + 2 = 18).

- [ ] **Step 3: Commit**

```bash
git add demo/tests/demo.spec.mjs
git commit -m "test: add Phase B hover preview tests"
```

---

## Phase C: Multi-Select & Navigation

### Task 6: Implement multi-select with Ctrl+click

**Files:**
- Modify: `demo/picking.js`
- Modify: `demo/index.html`

- [ ] **Step 1: Add selectionSet and multi-select logic to `picking.js`**

Replace the single `selectedFaceId` / `highlightMesh` / `highlightEdgeLines` state with:

```javascript
// --- Selection set (replaces single selectState) ---
let selectionSet = new Map(); // key → { mode, id, sourceMesh, disposables[] }

function selectionKey(mode, meshUniqueId, elementId) {
  return `${mode}:${meshUniqueId}:${elementId}`;
}

function clearAllSelections() {
  for (const entry of selectionSet.values()) {
    for (const d of entry.disposables) d.dispose();
  }
  selectionSet.clear();
  document.getElementById("selectionPanel").style.display = "none";
}

function removeSelection(key) {
  const entry = selectionSet.get(key);
  if (entry) {
    for (const d of entry.disposables) d.dispose();
    selectionSet.delete(key);
  }
}

function addSelection(mode, sourceMesh, elementId, disposables) {
  const key = selectionKey(mode, sourceMesh.uniqueId, elementId);
  removeSelection(key); // avoid duplicate
  selectionSet.set(key, { mode, id: elementId, sourceMesh, disposables });
}

function toggleSelection(mode, sourceMesh, elementId, createDisposablesFn) {
  const key = selectionKey(mode, sourceMesh.uniqueId, elementId);
  if (selectionSet.has(key)) {
    removeSelection(key);
  } else {
    const disposables = createDisposablesFn();
    addSelection(mode, sourceMesh, elementId, disposables);
  }
  updateSelectionPanel();
}
```

- [ ] **Step 2: Extract disposable factory functions from existing highlight code**

Refactor `highlightFace`, `highlightEdge`, `highlightVertex` into two parts each: a factory that creates GPU resources (returns disposables array), and an info-panel function.

```javascript
// Factory: creates highlight meshes, returns array of disposable Babylon objects
function createFaceSelectDisposables(sourceMesh, face, geo) {
  const disposables = [];
  // Face overlay mesh (extracted from existing highlightFace)
  const srcPositions = geo.positions, srcNormals = geo.normals, srcIndices = geo.indices;
  const indexRemap = new Map();
  const positions = [], normals = [], indices = [];
  for (let i = face.firstIndex; i < face.firstIndex + face.indexCount; i++) {
    const idx = srcIndices[i];
    if (!indexRemap.has(idx)) {
      const newIdx = indexRemap.size;
      indexRemap.set(idx, newIdx);
      positions.push(srcPositions[idx*3], srcPositions[idx*3+1], srcPositions[idx*3+2]);
      if (srcNormals?.length) normals.push(srcNormals[idx*3], srcNormals[idx*3+1], srcNormals[idx*3+2]);
    }
    indices.push(indexRemap.get(idx));
  }
  const hlMesh = new BABYLON.Mesh("__hl_face__", scene);
  hlMesh.parent = sourceMesh;
  const vd = new BABYLON.VertexData();
  vd.positions = new Float32Array(positions);
  vd.indices = new Uint32Array(indices);
  if (normals.length) vd.normals = new Float32Array(normals);
  vd.applyToMesh(hlMesh);
  const mat = new BABYLON.StandardMaterial("__hl_mat__", scene);
  mat.diffuseColor = PICK_COLORS.select;
  mat.emissiveColor = PICK_COLORS.selectEmissive;
  mat.alpha = 0.6; mat.backFaceCulling = false; mat.zOffset = -1;
  hlMesh.material = mat; hlMesh.isPickable = false; hlMesh.renderingGroupId = 1;
  disposables.push(hlMesh, mat);
  // Boundary edges
  if (face.edgeIndices && geo.edges) {
    for (const ei of face.edgeIndices) {
      const hl = createEdgeHighlight(sourceMesh, geo.edges[ei], PICK_COLORS.edge);
      if (hl) disposables.push(hl);
    }
  }
  return disposables;
}

function createEdgeSelectDisposables(sourceMesh, edge) {
  const hl = createEdgeHighlight(sourceMesh, edge, PICK_COLORS.select);
  return hl ? [hl] : [];
}

function createVertexSelectDisposables(sourceMesh, vertex) {
  const hl = createVertexHighlight(sourceMesh, vertex, PICK_COLORS.select);
  return hl ? [hl] : [];
}
```

Then update `highlightFace`, `highlightEdge`, `highlightVertex` to call the factory + `showSelectionInfo`, rather than duplicating the mesh creation logic.

- [ ] **Step 3: Update `setupPicking` click handler for Ctrl support**

Modify the `scene.onPointerDown` handler:

```javascript
scene.onPointerDown = (evt, pickResult) => {
  if (evt.button !== 0) return;
  clearHover();

  const isCtrl = evt.ctrlKey || evt.metaKey;

  if (!pickResult.hit || !pickResult.pickedMesh) {
    if (!isCtrl) clearAllSelections();
    return;
  }

  const mesh = pickResult.pickedMesh;
  const sourceMesh = mesh.sourceMesh || mesh;
  const geo = meshGeoMap.get(sourceMesh);
  if (!geo) { if (!isCtrl) clearAllSelections(); return; }

  let mode = null, elementId = null, createDisposablesFn = null;

  if (pickMode === "face") {
    // ... face picking logic → sets mode, elementId, createDisposablesFn
  } else if (pickMode === "edge") {
    // ... edge picking logic
  } else if (pickMode === "vertex") {
    // ... vertex picking logic
  }

  if (!elementId) { if (!isCtrl) clearAllSelections(); return; }

  if (isCtrl) {
    toggleSelection(mode, sourceMesh, elementId, createDisposablesFn);
  } else {
    clearAllSelections();
    const disposables = createDisposablesFn();
    addSelection(mode, sourceMesh, elementId, disposables);
    updateSelectionPanel();
  }
};
```

Where `createDisposablesFn` for each mode returns the highlight mesh/line disposables (extracted from existing `highlightFace`/`highlightEdge`/`highlightVertex` into reusable functions that return disposables arrays).

- [ ] **Step 3: Add `updateSelectionPanel` for single and multi-select**

```javascript
function updateSelectionPanel() {
  if (selectionSet.size === 0) {
    document.getElementById("selectionPanel").style.display = "none";
    return;
  }

  if (selectionSet.size === 1) {
    // Single item — show detailed info (delegate to existing per-mode info)
    const entry = selectionSet.values().next().value;
    showSingleSelectionInfo(entry);
  } else {
    // Multi-select summary
    const counts = { face: 0, edge: 0, vertex: 0 };
    for (const entry of selectionSet.values()) counts[entry.mode]++;
    const parts = [];
    if (counts.face) parts.push(`${counts.face} face${counts.face > 1 ? "s" : ""}`);
    if (counts.edge) parts.push(`${counts.edge} edge${counts.edge > 1 ? "s" : ""}`);
    if (counts.vertex) parts.push(`${counts.vertex} ${counts.vertex > 1 ? "vertices" : "vertex"}`);

    document.getElementById("selectionTitle").textContent = `${selectionSet.size} Selected`;
    document.getElementById("selectionContent").innerHTML =
      `<div class="row"><span class="label">Items</span><span class="value">${parts.join(", ")}</span></div>`;
    document.getElementById("selectionPanel").style.display = "";
  }
}
```

- [ ] **Step 4: Refactor old `clearSelection` to use `clearAllSelections`**

Update all existing calls to `clearSelection()` to use `clearAllSelections()`. Remove old `highlightMesh`/`highlightEdgeLines`/`selectedFaceId` globals.

- [ ] **Step 5: Commit**

```bash
git add demo/picking.js demo/index.html
git commit -m "feat: add multi-select with Ctrl+click and selection set"
```

---

### Task 7: Add navigation links in info panel

**Files:**
- Modify: `demo/picking.js`

- [ ] **Step 1: Add clickable face links in Face and Edge info panels**

In `showSingleSelectionInfo` for Face mode, render Adjacent Faces as clickable:
```javascript
// Adjacent Faces as clickable links
const adjacentHtml = adjacentIds.map(fid =>
  `<a href="#" class="face-link" data-face-id="${fid}" data-mesh-id="${sourceMesh.uniqueId}" style="color:#4cc9f0;cursor:pointer">${fid}</a>`
).join(", ");
rows.push(["Adjacent Faces", adjacentHtml]);
```

In Edge mode, render Owner Faces the same way:
```javascript
const ownerHtml = (edge.ownerFaceIds || []).map(fid =>
  `<a href="#" class="face-link" data-face-id="${fid}" data-mesh-id="${sourceMesh.uniqueId}" style="color:#4cc9f0;cursor:pointer">${fid}</a>`
).join(", ");
rows.push(["Owner Faces", ownerHtml]);
```

- [ ] **Step 2: Add click handler for face links**

After rendering the info panel, attach event listeners:

```javascript
document.querySelectorAll("#selectionContent .face-link").forEach(link => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    const faceId = parseInt(link.dataset.faceId);
    const meshId = parseInt(link.dataset.meshId);

    // Find the sourceMesh by uniqueId
    const targetMesh = [...meshGeoMap.keys()].find(m => m.uniqueId === meshId);
    if (!targetMesh) return;

    // Switch to Face mode
    pickMode = "face";
    document.querySelectorAll("#selectMode button[data-mode]").forEach(b => b.classList.remove("active"));
    document.getElementById("modeFace").classList.add("active");

    // Select the face
    clearAllSelections();
    const geo = meshGeoMap.get(targetMesh);
    const face = geo?.faces?.[faceId - 1];
    if (face) {
      const disposables = createFaceSelectDisposables(targetMesh, face, geo);
      addSelection("face", targetMesh, faceId, disposables);
      updateSelectionPanel();
    }
  });
});
```

- [ ] **Step 3: Commit**

```bash
git add demo/picking.js
git commit -m "feat: add navigation links in selection info panel"
```

---

### Task 8: Playwright tests for Phase C

**Files:**
- Modify: `demo/tests/demo.spec.mjs`

- [ ] **Step 1: Add multi-select and navigation tests**

```javascript
test("ctrl+click adds to selection", async ({ page }) => {
  await page.click("#loadSample");
  await expect(page.locator("#selectMode")).toBeVisible({ timeout: 30_000 });

  const canvas = page.locator("#renderCanvas");
  const box = await canvas.boundingBox();

  // First click — single select
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect(page.locator("#selectionPanel")).toBeVisible({ timeout: 5000 });
  await expect(page.locator("#selectionTitle")).toContainText("Selected Face");

  // Ctrl+click slightly offset — should add to selection
  await page.mouse.click(box.x + box.width / 2 + 30, box.y + box.height / 2, { modifiers: ["Control"] });
  await expect(page.locator("#selectionPanel")).toBeVisible();
  // Should show multi-select summary or still single if same face
  await expect(page.locator("#selectionTitle")).toContainText("Selected");
});

test("plain click on empty clears multi-selection", async ({ page }) => {
  await page.click("#loadSample");
  await expect(page.locator("#selectMode")).toBeVisible({ timeout: 30_000 });

  const canvas = page.locator("#renderCanvas");
  const box = await canvas.boundingBox();

  // Select something
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect(page.locator("#selectionPanel")).toBeVisible({ timeout: 5000 });

  // Click far corner (empty)
  await page.mouse.click(box.x + 5, box.y + 5);
  await expect(page.locator("#selectionPanel")).toBeHidden();
});

test("face info panel shows clickable adjacent face links", async ({ page }) => {
  await page.click("#loadSample");
  await expect(page.locator("#selectMode")).toBeVisible({ timeout: 30_000 });

  const canvas = page.locator("#renderCanvas");
  const box = await canvas.boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect(page.locator("#selectionPanel")).toBeVisible({ timeout: 5000 });

  // Should have clickable face links
  const links = page.locator("#selectionContent .face-link");
  const count = await links.count();
  expect(count).toBeGreaterThan(0);

  // Click first adjacent face link
  await links.first().click();

  // Should still show face selection (navigated to adjacent face)
  await expect(page.locator("#selectionTitle")).toContainText("Selected Face");
});
```

- [ ] **Step 2: Run full test suite**

```bash
npx playwright test
```

Expected: All pass (~21 tests).

- [ ] **Step 3: Commit**

```bash
git add demo/tests/demo.spec.mjs
git commit -m "test: add Phase C multi-select and navigation tests"
```

---

## Task 9: Final integration test and cleanup

- [ ] **Step 1: Run full Playwright suite**

```bash
npx playwright test
```

Expected: All tests pass.

- [ ] **Step 2: Run existing project tests (regression)**

```bash
npm test
node --test packages/occt-core/test/core.test.mjs packages/occt-babylon-loader/test/format-routing.test.mjs
```

Expected: All pass (no demo changes affect core/wasm tests).

- [ ] **Step 3: Manual smoke test**

Open `http://localhost:9090/demo/index.html`:
1. Load `simple_part.step` → Face mode → click faces → info panel with adjacent face links
2. Switch to Edge mode → click near edge → Edge ID + owner faces shown
3. Switch to Vertex mode → click near vertex → Vertex ID + coordinates shown
4. Hover in each mode → yellow preview appears
5. Ctrl+click multiple faces → multi-select summary
6. Click adjacent face link → jumps to that face

- [ ] **Step 4: Commit any final fixes**

If any test needed fixing, commit the changes.
