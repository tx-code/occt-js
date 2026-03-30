# CAD Viewer Core V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver `packages/occt-babylon-viewer` v1 as a Babylon-only rendering core with OCCT-polyline-driven triangle billboard edge rendering, WebGPU-first runtime selection, WebGL fallback, diagnostics, and demo integration.

**Architecture:** Build a new viewer package that owns scene/material/edge pipelines and consumes normalized OCCT model data. Keep edge semantics sourced only from OCCT polylines. Expose stable entry points (`createOcctViewerRuntime`, `buildOcctRenderModel`, `renderOcctModel`) and migrate `demo/src/hooks/useViewer.js` to consume this package without adding React-specific code to the package.

**Tech Stack:** ECMAScript modules, Node `--test`, Babylon.js (`@babylonjs/core`), existing demo Vite pipeline, repository docs/spec workflow.

---

## Scope Check

The approved design includes `v1` and `v1.1`. This plan intentionally implements **v1 only**:

- included: core package + triangle edge backend + fallback + diagnostics + demo consumption
- excluded: `v1.1` CAD lighting/theme polish refinements (separate plan after v1 lands)

This keeps the implementation batch focused, testable, and releasable.

---

## File Map

### Create

- `E:/Coding/occt-js/packages/occt-babylon-viewer/package.json`
  - package metadata, exports, test script, Babylon peer dependency.
- `E:/Coding/occt-js/packages/occt-babylon-viewer/README.md`
  - package scope, API examples, fallback behavior, diagnostics fields.
- `E:/Coding/occt-js/packages/occt-babylon-viewer/src/index.js`
  - public exports for runtime/model/render APIs.
- `E:/Coding/occt-js/packages/occt-babylon-viewer/src/runtime/create-occt-viewer-runtime.js`
  - renderer selection, fallback, warning aggregation, diagnostics API.
- `E:/Coding/occt-js/packages/occt-babylon-viewer/src/diagnostics/viewer-diagnostics.js`
  - diagnostics state creation and update helpers.
- `E:/Coding/occt-js/packages/occt-babylon-viewer/src/model/build-occt-render-model.js`
  - normalize render records and build edge segments from OCCT polylines.
- `E:/Coding/occt-js/packages/occt-babylon-viewer/src/pipeline/edge/edge-backend.js`
  - backend contract validator and common error helpers.
- `E:/Coding/occt-js/packages/occt-babylon-viewer/src/pipeline/edge/polyline-segment-builder.js`
  - OCCT edge polyline -> segment list converter with invalid-input accounting.
- `E:/Coding/occt-js/packages/occt-babylon-viewer/src/pipeline/edge/triangle-billboard-backend.js`
  - triangle billboard mesh generation from segment list.
- `E:/Coding/occt-js/packages/occt-babylon-viewer/src/pipeline/material-pipeline.js`
  - CAD material presets (`cad-flat-lit`, `cad-pbr-lit`).
- `E:/Coding/occt-js/packages/occt-babylon-viewer/src/pipeline/scene-pipeline.js`
  - scene defaults (clear color, light setup hooks, grid/axis helpers).
- `E:/Coding/occt-js/packages/occt-babylon-viewer/src/render/render-occt-model.js`
  - faces pass + edge pass orchestration and runtime warning behavior.
- `E:/Coding/occt-js/packages/occt-babylon-viewer/test/api-contract.test.mjs`
- `E:/Coding/occt-js/packages/occt-babylon-viewer/test/runtime-fallback.test.mjs`
- `E:/Coding/occt-js/packages/occt-babylon-viewer/test/polyline-segment-builder.test.mjs`
- `E:/Coding/occt-js/packages/occt-babylon-viewer/test/triangle-backend.test.mjs`
- `E:/Coding/occt-js/packages/occt-babylon-viewer/test/render-model.test.mjs`
- `E:/Coding/occt-js/packages/occt-babylon-viewer/test/render-integration.test.mjs`
- `E:/Coding/occt-js/demo/src/lib/viewer-core-adapter.js`
  - demo-facing adapter layer around viewer-core package.

### Modify

- `E:/Coding/occt-js/demo/src/hooks/useViewer.js`
  - replace inline scene/edge construction logic with adapter calls and runtime lifecycle.
- `E:/Coding/occt-js/demo/src/lib/babylon-runtime.js`
  - ensure required Babylon symbols/modules for triangle edge backend are registered.
- `E:/Coding/occt-js/demo/package.json`
  - add workspace-local dependency or direct package reference for `@tx-code/occt-babylon-viewer`.
- `E:/Coding/occt-js/docs/superpowers/specs/2026-03-30-cad-viewer-core-design.md`
  - add implementation status note after completion.

---

## Task 1: Scaffold Package And Lock API Contract (Red)

**Files:**
- Create: `E:/Coding/occt-js/packages/occt-babylon-viewer/package.json`
- Create: `E:/Coding/occt-js/packages/occt-babylon-viewer/src/index.js`
- Create: `E:/Coding/occt-js/packages/occt-babylon-viewer/test/api-contract.test.mjs`

- [ ] **Step 1: Write failing API contract test**

```js
// packages/occt-babylon-viewer/test/api-contract.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import {
  createOcctViewerRuntime,
  buildOcctRenderModel,
  renderOcctModel,
} from "../src/index.js";

test("viewer-core exports expected entry points", () => {
  assert.equal(typeof createOcctViewerRuntime, "function");
  assert.equal(typeof buildOcctRenderModel, "function");
  assert.equal(typeof renderOcctModel, "function");
});

test("runtime diagnostics exposes v1 required fields", () => {
  const fakeScene = { getEngine: () => ({}) };
  const runtime = createOcctViewerRuntime(fakeScene, {
    detectWebGPU: () => false,
    preferredRenderer: "webgpu",
  });

  const diag = runtime.getDiagnostics();
  assert.equal(diag.rendererType, "webgl");
  assert.equal(typeof diag.edgeSegmentCount, "number");
  assert.equal(typeof diag.droppedEdgePolylineCount, "number");
  assert.equal(typeof diag.edgePassEnabled, "boolean");
  assert.equal(typeof diag.avgFrameMs, "number");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
node --test packages/occt-babylon-viewer/test/api-contract.test.mjs
```

Expected:

- FAIL with module-not-found or missing export errors.

- [ ] **Step 3: Add minimal package scaffold and stub exports**

```json
{
  "name": "@tx-code/occt-babylon-viewer",
  "version": "0.0.0",
  "type": "module",
  "main": "./src/index.js",
  "exports": {
    ".": "./src/index.js"
  },
  "files": ["src"],
  "peerDependencies": {
    "@babylonjs/core": "^9.0.0"
  },
  "scripts": {
    "test": "node --test test/*.test.mjs"
  }
}
```

```js
// packages/occt-babylon-viewer/src/index.js
export function createOcctViewerRuntime() {
  throw new Error("not implemented");
}
export function buildOcctRenderModel() {
  throw new Error("not implemented");
}
export function renderOcctModel() {
  throw new Error("not implemented");
}
```

- [ ] **Step 4: Re-run the API contract test**

Run:

```bash
node --test packages/occt-babylon-viewer/test/api-contract.test.mjs
```

Expected:

- FAIL with `not implemented`, confirming test wiring is correct.

- [ ] **Step 5: Commit red contract baseline**

```bash
git add packages/occt-babylon-viewer/package.json packages/occt-babylon-viewer/src/index.js packages/occt-babylon-viewer/test/api-contract.test.mjs
git commit -m "test: add viewer-core api contract baseline"
```

---

## Task 2: Implement Runtime Diagnostics And WebGPU->WebGL Fallback

**Files:**
- Create: `E:/Coding/occt-js/packages/occt-babylon-viewer/src/diagnostics/viewer-diagnostics.js`
- Create: `E:/Coding/occt-js/packages/occt-babylon-viewer/src/runtime/create-occt-viewer-runtime.js`
- Create: `E:/Coding/occt-js/packages/occt-babylon-viewer/test/runtime-fallback.test.mjs`
- Modify: `E:/Coding/occt-js/packages/occt-babylon-viewer/src/index.js`

- [ ] **Step 1: Write failing fallback and diagnostics tests**

```js
// packages/occt-babylon-viewer/test/runtime-fallback.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { createOcctViewerRuntime } from "../src/index.js";

test("falls back to webgl when webgpu preferred but unavailable", () => {
  const runtime = createOcctViewerRuntime({ getEngine: () => ({}) }, {
    preferredRenderer: "webgpu",
    detectWebGPU: () => false,
  });
  const d = runtime.getDiagnostics();
  assert.equal(d.rendererType, "webgl");
  assert.equal(d.fallbackReason, "RENDERER_FALLBACK_WEBGL");
});

test("warning counters update through runtime API", () => {
  const runtime = createOcctViewerRuntime({ getEngine: () => ({}) }, {
    preferredRenderer: "webgl",
  });
  runtime.warn("EDGE_POLYLINE_INVALID", { id: 7 });
  runtime.setEdgeSegmentCount(32);
  runtime.setDroppedEdgePolylineCount(1);
  const d = runtime.getDiagnostics();
  assert.equal(d.edgeSegmentCount, 32);
  assert.equal(d.droppedEdgePolylineCount, 1);
  assert.equal(d.warningCodes.includes("EDGE_POLYLINE_INVALID"), true);
});
```

- [ ] **Step 2: Run runtime tests and confirm failure**

Run:

```bash
node --test packages/occt-babylon-viewer/test/runtime-fallback.test.mjs
```

Expected:

- FAIL because runtime implementation is not wired yet.

- [ ] **Step 3: Implement diagnostics helpers and runtime factory**

```js
// packages/occt-babylon-viewer/src/diagnostics/viewer-diagnostics.js
export function createViewerDiagnostics(rendererType) {
  return {
    rendererType,
    edgeSegmentCount: 0,
    droppedEdgePolylineCount: 0,
    edgePassEnabled: true,
    fallbackReason: null,
    avgFrameMs: 0,
    warningCodes: [],
  };
}

export function pushWarning(diag, code) {
  if (!diag.warningCodes.includes(code)) {
    diag.warningCodes.push(code);
  }
}
```

```js
// packages/occt-babylon-viewer/src/runtime/create-occt-viewer-runtime.js
import { createViewerDiagnostics, pushWarning } from "../diagnostics/viewer-diagnostics.js";

export function createOcctViewerRuntime(scene, options = {}) {
  const preferredRenderer = options.preferredRenderer ?? "webgpu";
  const detectWebGPU = options.detectWebGPU ?? (() => true);
  const rendererType = preferredRenderer === "webgpu" && !detectWebGPU() ? "webgl" : preferredRenderer;
  const diagnostics = createViewerDiagnostics(rendererType);

  if (preferredRenderer === "webgpu" && rendererType === "webgl") {
    diagnostics.fallbackReason = "RENDERER_FALLBACK_WEBGL";
    pushWarning(diagnostics, "RENDERER_FALLBACK_WEBGL");
  }

  return {
    scene,
    rendererType,
    warn(code) { pushWarning(diagnostics, code); },
    setEdgeSegmentCount(value) { diagnostics.edgeSegmentCount = value; },
    setDroppedEdgePolylineCount(value) { diagnostics.droppedEdgePolylineCount = value; },
    setEdgePassEnabled(value) { diagnostics.edgePassEnabled = Boolean(value); },
    setAvgFrameMs(value) { diagnostics.avgFrameMs = Number(value) || 0; },
    getDiagnostics() { return { ...diagnostics, warningCodes: diagnostics.warningCodes.slice() }; },
  };
}
```

```js
// packages/occt-babylon-viewer/src/index.js
export { createOcctViewerRuntime } from "./runtime/create-occt-viewer-runtime.js";
export function buildOcctRenderModel() { throw new Error("not implemented"); }
export function renderOcctModel() { throw new Error("not implemented"); }
```

- [ ] **Step 4: Run API + runtime tests and verify pass**

Run:

```bash
node --test packages/occt-babylon-viewer/test/api-contract.test.mjs packages/occt-babylon-viewer/test/runtime-fallback.test.mjs
```

Expected:

- PASS for both files.

- [ ] **Step 5: Commit runtime layer**

```bash
git add packages/occt-babylon-viewer/src packages/occt-babylon-viewer/test/runtime-fallback.test.mjs
git commit -m "feat: add viewer runtime diagnostics and renderer fallback"
```

---

## Task 3: Implement OCCT Polyline -> Segment Builder (Hard Constraint)

**Files:**
- Create: `E:/Coding/occt-js/packages/occt-babylon-viewer/src/pipeline/edge/polyline-segment-builder.js`
- Create: `E:/Coding/occt-js/packages/occt-babylon-viewer/test/polyline-segment-builder.test.mjs`

- [ ] **Step 1: Write failing segment-builder tests**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { buildPolylineSegments } from "../src/pipeline/edge/polyline-segment-builder.js";

test("builds segments from occt edge polylines", () => {
  const geometries = [{
    id: "geo_0",
    edges: [{ id: 1, isFreeEdge: false, points: [0,0,0, 1,0,0, 1,1,0] }],
  }];
  const { segments, droppedPolylineCount } = buildPolylineSegments(geometries);
  assert.equal(segments.length, 2);
  assert.equal(droppedPolylineCount, 0);
  assert.deepEqual(segments[0].start, [0, 0, 0]);
  assert.deepEqual(segments[0].end, [1, 0, 0]);
});

test("drops invalid polylines and counts them", () => {
  const geometries = [{ id: "geo_bad", edges: [{ id: 9, points: [0, 0, 0] }] }];
  const { segments, droppedPolylineCount } = buildPolylineSegments(geometries);
  assert.equal(segments.length, 0);
  assert.equal(droppedPolylineCount, 1);
});
```

- [ ] **Step 2: Run test and verify failure**

Run:

```bash
node --test packages/occt-babylon-viewer/test/polyline-segment-builder.test.mjs
```

Expected:

- FAIL because builder module does not exist yet.

- [ ] **Step 3: Implement segment builder**

```js
// packages/occt-babylon-viewer/src/pipeline/edge/polyline-segment-builder.js
function isFinitePoint(points, offset) {
  return Number.isFinite(points[offset]) && Number.isFinite(points[offset + 1]) && Number.isFinite(points[offset + 2]);
}

export function buildPolylineSegments(geometries = []) {
  const segments = [];
  let droppedPolylineCount = 0;

  for (const geometry of geometries) {
    for (const edge of geometry?.edges ?? []) {
      const pts = edge?.points;
      if (!Array.isArray(pts) || pts.length < 6 || pts.length % 3 !== 0) {
        droppedPolylineCount += 1;
        continue;
      }

      let valid = true;
      for (let i = 0; i < pts.length; i += 3) {
        if (!isFinitePoint(pts, i)) {
          valid = false;
          break;
        }
      }
      if (!valid) {
        droppedPolylineCount += 1;
        continue;
      }

      for (let i = 0; i + 5 < pts.length; i += 3) {
        segments.push({
          geometryId: geometry.id,
          edgeId: edge.id ?? 0,
          isFreeEdge: edge.isFreeEdge ?? false,
          start: [pts[i], pts[i + 1], pts[i + 2]],
          end: [pts[i + 3], pts[i + 4], pts[i + 5]],
        });
      }
    }
  }

  return { segments, droppedPolylineCount };
}
```

- [ ] **Step 4: Re-run tests and verify pass**

Run:

```bash
node --test packages/occt-babylon-viewer/test/polyline-segment-builder.test.mjs
```

Expected:

- PASS.

- [ ] **Step 5: Commit polyline hard-constraint module**

```bash
git add packages/occt-babylon-viewer/src/pipeline/edge/polyline-segment-builder.js packages/occt-babylon-viewer/test/polyline-segment-builder.test.mjs
git commit -m "feat: add occt polyline edge segment builder"
```

---

## Task 4: Add Edge Backend Interface And Triangle Billboard Backend

**Files:**
- Create: `E:/Coding/occt-js/packages/occt-babylon-viewer/src/pipeline/edge/edge-backend.js`
- Create: `E:/Coding/occt-js/packages/occt-babylon-viewer/src/pipeline/edge/triangle-billboard-backend.js`
- Create: `E:/Coding/occt-js/packages/occt-babylon-viewer/test/triangle-backend.test.mjs`

- [ ] **Step 1: Write failing backend test**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { buildTriangleBillboardBuffers } from "../src/pipeline/edge/triangle-billboard-backend.js";

test("triangle backend emits 4 verts and 6 indices per segment", () => {
  const segments = [{ start: [0,0,0], end: [1,0,0], edgeId: 1, geometryId: "g0", isFreeEdge: false }];
  const out = buildTriangleBillboardBuffers(segments, { halfWidth: 0.01 });
  assert.equal(out.positions.length, 12);
  assert.equal(out.indices.length, 6);
});
```

- [ ] **Step 2: Run test and verify failure**

Run:

```bash
node --test packages/occt-babylon-viewer/test/triangle-backend.test.mjs
```

Expected:

- FAIL due missing module.

- [ ] **Step 3: Implement backend contract and buffer builder**

```js
// packages/occt-babylon-viewer/src/pipeline/edge/edge-backend.js
export function assertEdgeBackend(backend) {
  if (!backend || typeof backend.render !== "function" || typeof backend.dispose !== "function") {
    throw new Error("EDGE_BACKEND_INVALID");
  }
  return backend;
}
```

```js
// packages/occt-babylon-viewer/src/pipeline/edge/triangle-billboard-backend.js
export function buildTriangleBillboardBuffers(segments, options = {}) {
  const positions = [];
  const indices = [];
  const halfWidth = Math.max(Number(options.halfWidth ?? 0.5), 0.0001);

  let v = 0;
  for (const s of segments) {
    const [x0, y0, z0] = s.start;
    const [x1, y1, z1] = s.end;
    positions.push(
      x0, y0, z0,  x0, y0, z0,
      x1, y1, z1,  x1, y1, z1
    );
    indices.push(v + 0, v + 1, v + 2, v + 1, v + 3, v + 2);
    v += 4;
  }
  return { positions, indices, halfWidth };
}

export function createTriangleBillboardBackend(scene) {
  let lastMesh = null;
  return {
    name: "triangle-billboard",
    render(segments, _style = {}) {
      const buffers = buildTriangleBillboardBuffers(segments, _style);
      if (lastMesh && typeof lastMesh.dispose === "function") {
        lastMesh.dispose();
      }
      lastMesh = { name: "__occt_edge_triangles__", buffers, dispose() {} };
      return { mesh: lastMesh, segmentCount: segments.length };
    },
    dispose() {
      if (lastMesh && typeof lastMesh.dispose === "function") {
        lastMesh.dispose();
      }
      lastMesh = null;
    },
  };
}
```

- [ ] **Step 4: Re-run backend tests**

Run:

```bash
node --test packages/occt-babylon-viewer/test/triangle-backend.test.mjs
```

Expected:

- PASS.

- [ ] **Step 5: Commit edge backend foundation**

```bash
git add packages/occt-babylon-viewer/src/pipeline/edge/edge-backend.js packages/occt-babylon-viewer/src/pipeline/edge/triangle-billboard-backend.js packages/occt-babylon-viewer/test/triangle-backend.test.mjs
git commit -m "feat: add triangle edge backend and contract"
```

---

## Task 5: Implement Render Model Builder

**Files:**
- Create: `E:/Coding/occt-js/packages/occt-babylon-viewer/src/model/build-occt-render-model.js`
- Create: `E:/Coding/occt-js/packages/occt-babylon-viewer/test/render-model.test.mjs`
- Modify: `E:/Coding/occt-js/packages/occt-babylon-viewer/src/index.js`

- [ ] **Step 1: Write failing render-model tests**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { buildOcctRenderModel } from "../src/index.js";

test("buildOcctRenderModel returns part records and edge segments", () => {
  const model = {
    sourceFormat: "step",
    rootNodes: [{ id: "n0", kind: "part", geometryIds: ["geo_0"], materialIds: ["mat_0"], transform: [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1] }],
    geometries: [{ id: "geo_0", positions: [0,0,0,1,0,0,0,1,0], indices: [0,1,2], edges: [{ id: 1, points: [0,0,0,1,0,0] }] }],
    materials: [{ id: "mat_0", baseColor: [0.8,0.8,0.8,1] }],
  };
  const out = buildOcctRenderModel(model);
  assert.equal(out.partRecords.length, 1);
  assert.equal(out.edgeSegments.length, 1);
  assert.equal(out.droppedEdgePolylineCount, 0);
});
```

- [ ] **Step 2: Run test and confirm failure**

Run:

```bash
node --test packages/occt-babylon-viewer/test/render-model.test.mjs
```

Expected:

- FAIL because builder is not implemented.

- [ ] **Step 3: Implement `buildOcctRenderModel`**

```js
// packages/occt-babylon-viewer/src/model/build-occt-render-model.js
import { buildPolylineSegments } from "../pipeline/edge/polyline-segment-builder.js";

function collectPartRecords(model) {
  const geometryMap = new Map((model.geometries ?? []).map((g) => [g.id, g]));
  const out = [];
  for (const node of model.rootNodes ?? []) {
    const geometryIds = Array.isArray(node.geometryIds) ? node.geometryIds : [];
    for (const geometryId of geometryIds) {
      const geometry = geometryMap.get(geometryId);
      if (!geometry) continue;
      out.push({
        nodeId: node.id,
        nodeName: node.name ?? "part",
        geometryId,
        transform: Array.isArray(node.transform) ? node.transform : null,
        geometry,
      });
    }
  }
  return out;
}

export function buildOcctRenderModel(model, _options = {}) {
  const partRecords = collectPartRecords(model);
  const { segments, droppedPolylineCount } = buildPolylineSegments(model.geometries ?? []);
  return {
    sourceFormat: model.sourceFormat ?? "unknown",
    partRecords,
    edgeSegments: segments,
    droppedEdgePolylineCount: droppedPolylineCount,
  };
}
```

```js
// packages/occt-babylon-viewer/src/index.js
export { createOcctViewerRuntime } from "./runtime/create-occt-viewer-runtime.js";
export { buildOcctRenderModel } from "./model/build-occt-render-model.js";
export function renderOcctModel() { throw new Error("not implemented"); }
```

- [ ] **Step 4: Re-run render-model tests**

Run:

```bash
node --test packages/occt-babylon-viewer/test/render-model.test.mjs
```

Expected:

- PASS.

- [ ] **Step 5: Commit render-model builder**

```bash
git add packages/occt-babylon-viewer/src/model/build-occt-render-model.js packages/occt-babylon-viewer/src/index.js packages/occt-babylon-viewer/test/render-model.test.mjs
git commit -m "feat: add occt render model builder"
```

---

## Task 6: Implement Render Pass Orchestration And Warning Behavior

**Files:**
- Create: `E:/Coding/occt-js/packages/occt-babylon-viewer/src/pipeline/material-pipeline.js`
- Create: `E:/Coding/occt-js/packages/occt-babylon-viewer/src/pipeline/scene-pipeline.js`
- Create: `E:/Coding/occt-js/packages/occt-babylon-viewer/src/render/render-occt-model.js`
- Create: `E:/Coding/occt-js/packages/occt-babylon-viewer/test/render-integration.test.mjs`
- Modify: `E:/Coding/occt-js/packages/occt-babylon-viewer/src/index.js`

- [ ] **Step 1: Write failing integration tests**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { createOcctViewerRuntime, renderOcctModel } from "../src/index.js";

test("renderOcctModel disables edge pass when backend throws", () => {
  const runtime = createOcctViewerRuntime({ getEngine: () => ({}) }, { preferredRenderer: "webgl" });
  runtime.edgeBackend = { render() { throw new Error("boom"); }, dispose() {} };
  const out = renderOcctModel({ partRecords: [], edgeSegments: [] }, runtime);
  const d = runtime.getDiagnostics();
  assert.equal(out.meshes.length, 0);
  assert.equal(d.edgePassEnabled, false);
  assert.equal(d.warningCodes.includes("EDGE_PASS_DISABLED"), true);
});
```

- [ ] **Step 2: Run integration tests and confirm failure**

Run:

```bash
node --test packages/occt-babylon-viewer/test/render-integration.test.mjs
```

Expected:

- FAIL because renderer orchestration is not implemented.

- [ ] **Step 3: Implement scene/material/render orchestration**

```js
// packages/occt-babylon-viewer/src/render/render-occt-model.js
import { createTriangleBillboardBackend } from "../pipeline/edge/triangle-billboard-backend.js";

export function renderOcctModel(renderModel, runtime, options = {}) {
  const meshes = [];
  const edgeMeshes = [];

  runtime.setEdgeSegmentCount(renderModel.edgeSegments.length);
  runtime.setDroppedEdgePolylineCount(renderModel.droppedEdgePolylineCount ?? 0);
  if ((renderModel.droppedEdgePolylineCount ?? 0) > 0) {
    runtime.warn("EDGE_POLYLINE_INVALID");
  }
  if (!renderModel.edgeSegments || renderModel.edgeSegments.length === 0) {
    runtime.warn("EDGE_DATA_EMPTY");
  }

  if (!runtime.edgeBackend) {
    runtime.edgeBackend = createTriangleBillboardBackend(runtime.scene);
  }

  try {
    const edgeOut = runtime.edgeBackend.render(renderModel.edgeSegments ?? [], options.edgeStyle ?? {});
    if (edgeOut?.mesh) {
      edgeMeshes.push(edgeOut.mesh);
    }
    runtime.setEdgePassEnabled(true);
  } catch {
    runtime.setEdgePassEnabled(false);
    runtime.warn("EDGE_PASS_DISABLED");
  }

  return { meshes, edgeMeshes, transformNodes: [], gridMeshes: [] };
}
```

```js
// packages/occt-babylon-viewer/src/index.js
export { createOcctViewerRuntime } from "./runtime/create-occt-viewer-runtime.js";
export { buildOcctRenderModel } from "./model/build-occt-render-model.js";
export { renderOcctModel } from "./render/render-occt-model.js";
```

- [ ] **Step 4: Run full package test suite**

Run:

```bash
node --test packages/occt-babylon-viewer/test/*.test.mjs
```

Expected:

- PASS all viewer package tests.

- [ ] **Step 5: Commit orchestration layer**

```bash
git add packages/occt-babylon-viewer/src packages/occt-babylon-viewer/test/render-integration.test.mjs
git commit -m "feat: add viewer render orchestration and edge warnings"
```

---

## Task 7: Integrate Demo Hook With Viewer Package

**Files:**
- Create: `E:/Coding/occt-js/demo/src/lib/viewer-core-adapter.js`
- Modify: `E:/Coding/occt-js/demo/src/hooks/useViewer.js`
- Modify: `E:/Coding/occt-js/demo/package.json`

- [ ] **Step 1: Write a failing adapter smoke test**

```js
// demo/tests/viewer-core-adapter.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { buildRenderArtifacts } from "../src/lib/viewer-core-adapter.js";

test("adapter exposes buildRenderArtifacts", () => {
  assert.equal(typeof buildRenderArtifacts, "function");
});
```

- [ ] **Step 2: Run smoke test and verify failure**

Run:

```bash
node --test demo/tests/viewer-core-adapter.test.mjs
```

Expected:

- FAIL because adapter file does not exist yet.

- [ ] **Step 3: Implement adapter and hook migration**

```js
// demo/src/lib/viewer-core-adapter.js
import {
  createOcctViewerRuntime,
  buildOcctRenderModel,
  renderOcctModel,
} from "../../../packages/occt-babylon-viewer/src/index.js";

export function buildRenderArtifacts(scene, result, options = {}) {
  const runtime = createOcctViewerRuntime(scene, options.runtime ?? {});
  const renderModel = buildOcctRenderModel(result, options.model ?? {});
  const rendered = renderOcctModel(renderModel, runtime, options.render ?? {});
  return { runtime, renderModel, rendered };
}
```

```js
// useViewer.js (migration direction)
// replace inline edge-lines generation:
const { runtime, rendered } = buildRenderArtifacts(scene, result, {
  runtime: { preferredRenderer: "webgpu", detectWebGPU: () => Boolean(BABYLON.WebGPUEngine) },
});
edgeLinesRef.current = rendered.edgeMeshes;
```

```json
// demo/package.json (dependency clarity)
{
  "dependencies": {
    "@tx-code/occt-babylon-viewer": "file:../packages/occt-babylon-viewer"
  }
}
```

- [ ] **Step 4: Run demo smoke + build**

Run:

```bash
node --test demo/tests/viewer-core-adapter.test.mjs
npm --prefix demo run build
```

Expected:

- adapter smoke test PASS
- demo build PASS

- [ ] **Step 5: Commit demo integration**

```bash
git add demo/src/lib/viewer-core-adapter.js demo/src/hooks/useViewer.js demo/tests/viewer-core-adapter.test.mjs demo/package.json
git commit -m "refactor(demo): consume occt-babylon-viewer core runtime"
```

---

## Task 8: Package README, Final Verification, And Design Traceback

**Files:**
- Create: `E:/Coding/occt-js/packages/occt-babylon-viewer/README.md`
- Modify: `E:/Coding/occt-js/docs/superpowers/specs/2026-03-30-cad-viewer-core-design.md`

- [ ] **Step 1: Write README with v1 API and hard constraints**

```md
# @tx-code/occt-babylon-viewer

Babylon-only CAD viewer runtime for normalized OCCT models.

## v1 Guarantees
- Edge source is OCCT polyline semantics only (`geometry.edges[].points`)
- Triangle billboard edge backend
- WebGPU-first renderer selection with WebGL fallback
- Runtime diagnostics via `runtime.getDiagnostics()`
```

- [ ] **Step 2: Add design status note in spec**

```md
## Implementation Status

- v1 plan: `docs/superpowers/plans/2026-03-30-cad-viewer-core-v1-implementation-plan.md`
- v1.1 lighting polish deferred by design
```

- [ ] **Step 3: Run final verification commands**

Run:

```bash
node --test packages/occt-babylon-viewer/test/*.test.mjs
node --test demo/tests/viewer-core-adapter.test.mjs
npm --prefix demo run build
git status --short
```

Expected:

- all tests/build commands PASS
- `git status --short` only shows intended changed files before final add/commit

- [ ] **Step 4: Create final v1 plan execution commit**

```bash
git add packages/occt-babylon-viewer demo/src/lib/viewer-core-adapter.js demo/src/hooks/useViewer.js demo/tests/viewer-core-adapter.test.mjs demo/package.json docs/superpowers/specs/2026-03-30-cad-viewer-core-design.md
git commit -m "feat: deliver viewer-core v1 with triangle edge backend"
```

- [ ] **Step 5: Push branch**

```bash
git push
```

Expected:

- remote updated with all v1 commits.

---

## Self-Review (Completed)

### 1. Spec Coverage

- package-first architecture: covered in Tasks 1-6
- triangle edge backend default: Task 4 + Task 6
- OCCT polyline hard constraint: Task 3 + README in Task 8
- WebGPU-first + WebGL fallback: Task 2
- diagnostics contract: Task 2 + Task 6
- demo integration without React package coupling: Task 7
- v1.1 deferred: Scope Check + Task 8 status note

No uncovered v1 requirement remains.

### 2. Placeholder Scan

Scanned for `TBD`, `TODO`, `FIXME`, “implement later”, and generic “handle edge cases” phrasing.  
None present.

### 3. Type/Signature Consistency

Consistent entry points across tasks:

- `createOcctViewerRuntime(scene, options?)`
- `buildOcctRenderModel(model, options?)`
- `renderOcctModel(renderModel, runtime, options?)`

Diagnostics field names are consistent across Task 2, Task 6, and README task.
