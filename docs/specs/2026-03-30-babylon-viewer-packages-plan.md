# Babylon Viewer Packages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract reusable Babylon viewer runtime and widget layers from `demo/` into `@tx-code/occt-babylon-viewer` and `@tx-code/occt-babylon-widgets` without breaking the existing web demo, desktop MVP, or loader/core contracts.

**Architecture:** Keep `@tx-code/occt-babylon-loader` focused on `occt model -> Babylon nodes`, introduce a scene-first `viewer` runtime that attaches to a caller-supplied Babylon `Scene`, and move `ViewCube` into a non-React widgets package that consumes only the viewer's public API. The `demo` becomes an application shell that orchestrates these packages instead of owning the Babylon runtime.

**Tech Stack:** Node.js, ESM packages, Babylon.js (`@babylonjs/core`, `@babylonjs/materials`), React/Vite demo, Tauri desktop shell.

---

## File Structure

### New packages

- Create: `packages/occt-babylon-viewer/package.json`
- Create: `packages/occt-babylon-viewer/README.md`
- Create: `packages/occt-babylon-viewer/src/index.js`
- Create: `packages/occt-babylon-viewer/src/occt-babylon-viewer.js`
- Create: `packages/occt-babylon-viewer/src/viewer-defaults.js`
- Create: `packages/occt-babylon-viewer/src/viewer-theme.js`
- Create: `packages/occt-babylon-viewer/src/viewer-camera.js`
- Create: `packages/occt-babylon-viewer/src/viewer-grid.js`
- Create: `packages/occt-babylon-viewer/src/viewer-lights.js`
- Create: `packages/occt-babylon-viewer/src/viewer-bounds.js`
- Create: `packages/occt-babylon-viewer/test/viewer.test.mjs`
- Create: `packages/occt-babylon-viewer/test/viewer-camera.test.mjs`
- Create: `packages/occt-babylon-viewer/test/viewer-grid.test.mjs`

- Create: `packages/occt-babylon-widgets/package.json`
- Create: `packages/occt-babylon-widgets/README.md`
- Create: `packages/occt-babylon-widgets/src/index.js`
- Create: `packages/occt-babylon-widgets/src/viewcube-widget.js`
- Create: `packages/occt-babylon-widgets/src/viewcube-style.js`
- Create: `packages/occt-babylon-widgets/src/viewcube-geometry.js`
- Create: `packages/occt-babylon-widgets/src/viewcube-hit-test.js`
- Create: `packages/occt-babylon-widgets/test/viewcube-widget.test.mjs`

### Existing package changes

- Modify: `packages/occt-babylon-loader/package.json`
- Modify: `packages/occt-babylon-loader/README.md`
- Modify: `packages/occt-babylon-loader/src/index.js`
- Modify: `packages/occt-babylon-loader/src/occt-scene-builder.js`

### Demo migration changes

- Modify: `demo/package.json`
- Modify: `demo/src/App.jsx`
- Modify: `demo/src/hooks/useViewer.js`
- Modify: `demo/src/hooks/useViewerActions.js`
- Modify: `demo/src/components/ViewCube.jsx`
- Modify: `demo/src/components/Toolbar.jsx`
- Modify: `demo/src/lib/babylon-runtime.js`
- Modify: `demo/tests/demo.spec.mjs`
- Modify: `demo/tests/desktop-runtime.test.mjs`

### Package/workspace integration changes

- Modify: `package.json`
- Modify: `README.md`
- Modify: `AGENTS.md`

## Task 1: Scaffold `@tx-code/occt-babylon-viewer`

**Files:**
- Create: `packages/occt-babylon-viewer/package.json`
- Create: `packages/occt-babylon-viewer/README.md`
- Create: `packages/occt-babylon-viewer/src/index.js`
- Create: `packages/occt-babylon-viewer/src/occt-babylon-viewer.js`
- Test: `packages/occt-babylon-viewer/test/viewer.test.mjs`
- Modify: `package.json`

- [ ] **Step 1: Write the failing package smoke test**

```js
// packages/occt-babylon-viewer/test/viewer.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { Scene } from '@babylonjs/core/scene';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { createOcctBabylonViewer } from '../src/index.js';

test('createOcctBabylonViewer attaches to a supplied scene', () => {
  const engine = new NullEngine();
  const scene = new Scene(engine);

  const viewer = createOcctBabylonViewer(scene);

  assert.equal(viewer.getScene(), scene);
  assert.equal(typeof viewer.dispose, 'function');
  assert.equal(typeof viewer.loadOcctModel, 'function');
});
```

- [ ] **Step 2: Run the viewer smoke test to verify it fails**

Run: `node --test packages/occt-babylon-viewer/test/viewer.test.mjs`
Expected: FAIL because the package and export do not exist yet.

- [ ] **Step 3: Create minimal package scaffold**

```json
// packages/occt-babylon-viewer/package.json
{
  "name": "@tx-code/occt-babylon-viewer",
  "version": "0.1.4",
  "type": "module",
  "main": "./src/index.js",
  "exports": {
    ".": "./src/index.js"
  },
  "dependencies": {
    "@babylonjs/core": "^9.0.0",
    "@babylonjs/materials": "^9.0.0",
    "@tx-code/occt-babylon-loader": "0.1.4"
  }
}
```

```js
// packages/occt-babylon-viewer/src/index.js
export { createOcctBabylonViewer } from './occt-babylon-viewer.js';
```

```js
// packages/occt-babylon-viewer/src/occt-babylon-viewer.js
export function createOcctBabylonViewer(scene) {
  return {
    getScene: () => scene,
    loadOcctModel() {
      throw new Error('Not implemented yet');
    },
    dispose() {},
  };
}
```

- [ ] **Step 4: Run the smoke test to verify it passes**

Run: `node --test packages/occt-babylon-viewer/test/viewer.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit the scaffold**

```bash
git add package.json packages/occt-babylon-viewer
git commit -m "feat: scaffold babylon viewer package"
```

## Task 2: Build the core viewer runtime around a supplied Scene

**Files:**
- Modify: `packages/occt-babylon-viewer/src/occt-babylon-viewer.js`
- Create: `packages/occt-babylon-viewer/src/viewer-defaults.js`
- Create: `packages/occt-babylon-viewer/src/viewer-bounds.js`
- Test: `packages/occt-babylon-viewer/test/viewer.test.mjs`

- [ ] **Step 1: Add a failing runtime lifecycle test**

```js
// append to packages/occt-babylon-viewer/test/viewer.test.mjs
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';

test('viewer manages a dedicated OCCT root node and clears it', () => {
  const engine = new NullEngine();
  const scene = new Scene(engine);
  const viewer = createOcctBabylonViewer(scene);

  const root = viewer.getRootNode();
  assert.ok(root instanceof TransformNode);
  assert.equal(root.parent, null);

  viewer.clearModel();
  assert.equal(viewer.getRootNode(), root);
});
```

- [ ] **Step 2: Run the runtime test to verify it fails**

Run: `node --test packages/occt-babylon-viewer/test/viewer.test.mjs`
Expected: FAIL because `getRootNode` and `clearModel` are incomplete.

- [ ] **Step 3: Implement minimal runtime state**

```js
// packages/occt-babylon-viewer/src/viewer-defaults.js
export const VIEWER_ROOT_NAME = '__OCCT_VIEWER_ROOT__';

export function withViewerDefaults(options = {}) {
  return {
    background: options.background ?? { clearColor: [0.1, 0.1, 0.12, 1] },
    createDefaultLights: options.createDefaultLights ?? true,
    createDefaultCameraController: options.createDefaultCameraController ?? true,
    grid: options.grid ?? { visible: true },
    axes: options.axes ?? { visible: true },
    camera: options.camera ?? {},
    lights: options.lights ?? {},
    theme: options.theme ?? 'dark',
  };
}
```

```js
// packages/occt-babylon-viewer/src/viewer-bounds.js
export function identityMatrix() {
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}
```

```js
// key shape inside packages/occt-babylon-viewer/src/occt-babylon-viewer.js
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { withViewerDefaults, VIEWER_ROOT_NAME } from './viewer-defaults.js';

export function createOcctBabylonViewer(scene, options = {}) {
  const config = withViewerDefaults(options);
  const rootNode = new TransformNode(VIEWER_ROOT_NAME, scene);

  function clearModel() {
    for (const child of rootNode.getChildren()) {
      child.dispose(false, true);
    }
  }

  return {
    getScene: () => scene,
    getRootNode: () => rootNode,
    getConfig: () => config,
    clearModel,
    loadOcctModel() {
      throw new Error('Not implemented yet');
    },
    dispose() {
      clearModel();
      rootNode.dispose(false, true);
    },
  };
}
```

- [ ] **Step 4: Run the runtime lifecycle test to verify it passes**

Run: `node --test packages/occt-babylon-viewer/test/viewer.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit the runtime skeleton**

```bash
git add packages/occt-babylon-viewer/src packages/occt-babylon-viewer/test
git commit -m "feat: add babylon viewer runtime skeleton"
```

## Task 3: Move camera, projection, fit-all, grid, axes, and lights into the viewer package

**Files:**
- Create: `packages/occt-babylon-viewer/src/viewer-camera.js`
- Create: `packages/occt-babylon-viewer/src/viewer-grid.js`
- Create: `packages/occt-babylon-viewer/src/viewer-lights.js`
- Modify: `packages/occt-babylon-viewer/src/occt-babylon-viewer.js`
- Test: `packages/occt-babylon-viewer/test/viewer-camera.test.mjs`
- Test: `packages/occt-babylon-viewer/test/viewer-grid.test.mjs`
- Reference: `demo/src/hooks/useViewer.js`

- [ ] **Step 1: Write failing camera and grid tests**

```js
// packages/occt-babylon-viewer/test/viewer-camera.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { Scene } from '@babylonjs/core/scene';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { createOcctBabylonViewer } from '../src/index.js';

test('viewer exposes projection and standard view controls', () => {
  const scene = new Scene(new NullEngine());
  const viewer = createOcctBabylonViewer(scene);

  viewer.setProjection('orthographic');
  viewer.setView('top');

  assert.equal(typeof viewer.getCamera, 'function');
  assert.ok(viewer.getCamera());
});
```

```js
// packages/occt-babylon-viewer/test/viewer-grid.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { Scene } from '@babylonjs/core/scene';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { createOcctBabylonViewer } from '../src/index.js';

test('viewer toggles grid and axes helper visibility', () => {
  const scene = new Scene(new NullEngine());
  const viewer = createOcctBabylonViewer(scene);

  viewer.setGridVisible(false);
  viewer.setAxesVisible(false);

  const state = viewer.getSceneState();
  assert.equal(state.gridVisible, false);
  assert.equal(state.axesVisible, false);
});
```

- [ ] **Step 2: Run the new tests to verify they fail**

Run: `node --test packages/occt-babylon-viewer/test/viewer-camera.test.mjs packages/occt-babylon-viewer/test/viewer-grid.test.mjs`
Expected: FAIL because the controls and helpers do not exist yet.

- [ ] **Step 3: Port the Babylon runtime helpers out of the demo hook**

```js
// packages/occt-babylon-viewer/src/viewer-lights.js
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';

export function ensureDefaultLights(scene) {
  const hemi = new HemisphericLight('occt-viewer-hemi', new Vector3(0, -1, 0), scene);
  hemi.intensity = 0.8;
  hemi.groundColor = new Color3(0.75, 0.75, 0.8);
  hemi.specular = new Color3(0.1, 0.1, 0.1);

  const dir = new DirectionalLight('occt-viewer-dir', new Vector3(-1, -2, 1), scene);
  dir.intensity = 0.3;

  return { hemi, dir };
}
```

```js
// packages/occt-babylon-viewer/src/viewer-camera.js
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { Camera } from '@babylonjs/core/Cameras/camera';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';

export function createDefaultCamera(scene) {
  const camera = new ArcRotateCamera('occt-viewer-camera', Math.PI / 4, Math.PI / 3, 100, Vector3.Zero(), scene);
  camera.wheelPrecision = 5;
  camera.wheelDeltaPercentage = 0.05;
  camera.minZ = 0.1;
  camera.panningSensibility = 30;
  return camera;
}

export function applyStandardView(camera, direction) {
  const views = {
    front: { alpha: -Math.PI / 2, beta: Math.PI / 2 },
    back: { alpha: Math.PI / 2, beta: Math.PI / 2 },
    top: { alpha: -Math.PI / 2, beta: 0.01 },
    bottom: { alpha: -Math.PI / 2, beta: Math.PI - 0.01 },
    left: { alpha: Math.PI, beta: Math.PI / 2 },
    right: { alpha: 0, beta: Math.PI / 2 },
    iso: { alpha: Math.PI / 4, beta: Math.PI / 3 },
  };
  const view = views[direction];
  if (!view) throw new Error(`Unknown view: ${direction}`);
  camera.alpha = view.alpha;
  camera.beta = view.beta;
}

export function applyProjection(camera, mode, size, aspect) {
  if (mode === 'orthographic') {
    camera.mode = Camera.ORTHOGRAPHIC_CAMERA;
    camera.orthoLeft = -size * aspect;
    camera.orthoRight = size * aspect;
    camera.orthoTop = size;
    camera.orthoBottom = -size;
    return;
  }
  camera.mode = Camera.PERSPECTIVE_CAMERA;
}
```

```js
// packages/occt-babylon-viewer/src/viewer-grid.js
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { GridMaterial } from '@babylonjs/materials/grid/gridMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';

export function createGridHelpers(scene, bounds) {
  const extent = bounds.max.subtract(bounds.min);
  const modelSize = extent.length();
  const gridSize = modelSize * 4;

  const ground = MeshBuilder.CreateGround('occt-viewer-grid', { width: gridSize, height: gridSize, subdivisions: 1 }, scene);
  const material = new GridMaterial('occt-viewer-grid-material', scene);
  material.mainColor = new Color3(0, 0, 0);
  material.lineColor = new Color3(0.3, 0.3, 0.35);
  material.opacity = 0.98;
  material.backFaceCulling = false;
  ground.material = material;
  ground.position.y = bounds.min.y - 0.01;
  ground.isPickable = false;

  const xAxis = MeshBuilder.CreateLines('occt-viewer-x-axis', {
    points: [new Vector3(-gridSize / 2, bounds.min.y, 0), new Vector3(gridSize / 2, bounds.min.y, 0)],
  }, scene);
  xAxis.color = new Color3(0.8, 0.2, 0.2);

  const zAxis = MeshBuilder.CreateLines('occt-viewer-z-axis', {
    points: [new Vector3(0, bounds.min.y, -gridSize / 2), new Vector3(0, bounds.min.y, gridSize / 2)],
  }, scene);
  zAxis.color = new Color3(0.2, 0.8, 0.2);

  return { ground, xAxis, zAxis };
}
```

- [ ] **Step 4: Wire the helpers into the viewer runtime**

```js
// key additions inside packages/occt-babylon-viewer/src/occt-babylon-viewer.js
import { createDefaultCamera, applyProjection, applyStandardView } from './viewer-camera.js';
import { createGridHelpers } from './viewer-grid.js';
import { ensureDefaultLights } from './viewer-lights.js';

const camera = config.createDefaultCameraController ? createDefaultCamera(scene) : null;
const lights = config.createDefaultLights ? ensureDefaultLights(scene) : null;
let gridHelpers = null;
let sceneState = { gridVisible: true, axesVisible: true };

function setGridVisible(visible) {
  sceneState.gridVisible = visible;
  if (gridHelpers) {
    gridHelpers.ground.isVisible = visible;
  }
}

function setAxesVisible(visible) {
  sceneState.axesVisible = visible;
  if (gridHelpers) {
    gridHelpers.xAxis.isVisible = visible;
    gridHelpers.zAxis.isVisible = visible;
  }
}
```

- [ ] **Step 5: Run the viewer runtime tests**

Run: `node --test packages/occt-babylon-viewer/test/viewer.test.mjs packages/occt-babylon-viewer/test/viewer-camera.test.mjs packages/occt-babylon-viewer/test/viewer-grid.test.mjs`
Expected: PASS.

- [ ] **Step 6: Commit the viewer runtime helpers**

```bash
git add packages/occt-babylon-viewer/src packages/occt-babylon-viewer/test
git commit -m "feat: add babylon viewer runtime helpers"
```

## Task 4: Integrate viewer runtime with the loader package

**Files:**
- Modify: `packages/occt-babylon-viewer/src/occt-babylon-viewer.js`
- Modify: `packages/occt-babylon-loader/src/index.js`
- Modify: `packages/occt-babylon-loader/README.md`
- Test: `packages/occt-babylon-viewer/test/viewer.test.mjs`

- [ ] **Step 1: Add a failing model-load test**

```js
// append to packages/occt-babylon-viewer/test/viewer.test.mjs
import { buildOcctScene } from '@tx-code/occt-babylon-loader';

test('viewer loads an OCCT model into its root node', () => {
  const scene = new Scene(new NullEngine());
  const viewer = createOcctBabylonViewer(scene);

  const model = {
    sourceFormat: 'step',
    rootNodes: [],
    geometries: [],
    materials: [],
    warnings: [],
    stats: {},
  };

  viewer.loadOcctModel(model);
  assert.ok(viewer.getSceneState());
  assert.ok(viewer.getRootNode());
});
```

- [ ] **Step 2: Run the model-load test to verify it fails**

Run: `node --test packages/occt-babylon-viewer/test/viewer.test.mjs`
Expected: FAIL because `loadOcctModel` is not implemented.

- [ ] **Step 3: Implement model loading through the loader package**

```js
// key addition in packages/occt-babylon-viewer/src/occt-babylon-viewer.js
import { buildOcctScene } from '@tx-code/occt-babylon-loader';

let currentSceneResources = null;

function loadOcctModel(model) {
  clearModel();
  currentSceneResources = buildOcctScene(model, scene, { createRootNode: false });
  for (const node of [...currentSceneResources.transformNodes, ...currentSceneResources.meshes]) {
    if (!node.parent) {
      node.parent = rootNode;
    }
  }
  return currentSceneResources;
}
```

- [ ] **Step 4: Update clear/dispose to release loader-created nodes and materials**

```js
function clearModel() {
  if (currentSceneResources) {
    for (const mesh of currentSceneResources.meshes ?? []) mesh.dispose(false, true);
    for (const tn of currentSceneResources.transformNodes ?? []) {
      if (tn !== rootNode) tn.dispose(false, true);
    }
    currentSceneResources = null;
  }
}
```

- [ ] **Step 5: Run the viewer tests again**

Run: `node --test packages/occt-babylon-viewer/test/viewer.test.mjs packages/occt-babylon-viewer/test/viewer-camera.test.mjs packages/occt-babylon-viewer/test/viewer-grid.test.mjs`
Expected: PASS.

- [ ] **Step 6: Commit the loader-viewer integration**

```bash
git add packages/occt-babylon-loader packages/occt-babylon-viewer
git commit -m "feat: connect babylon viewer to loader output"
```

## Task 5: Migrate `demo` to consume `@tx-code/occt-babylon-viewer`

**Files:**
- Modify: `demo/package.json`
- Modify: `demo/src/hooks/useViewer.js`
- Modify: `demo/src/hooks/useViewerActions.js`
- Modify: `demo/src/App.jsx`
- Modify: `demo/tests/demo.spec.mjs`
- Test: `demo/tests/desktop-runtime.test.mjs`
- Test: `demo/tests/demo.spec.mjs`

- [ ] **Step 1: Write a failing demo smoke assertion for viewer package integration**

```js
// add to demo/tests/demo.spec.mjs
import { test, expect } from '@playwright/test';

test('viewer shell still renders after package extraction', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('toggle-grid')).toBeVisible();
});
```

- [ ] **Step 2: Run the demo smoke test to verify current behavior before migration**

Run: `cd demo && npx playwright test tests/demo.spec.mjs -g "viewer shell still renders after package extraction"`
Expected: PASS before refactor.

- [ ] **Step 3: Replace demo-owned Babylon runtime bootstrap with viewer package calls**

```js
// shape inside demo/src/hooks/useViewer.js
import { createOcctBabylonViewer } from '@tx-code/occt-babylon-viewer';

const viewerRuntimeRef = useRef(null);

useEffect(() => {
  const engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
  const scene = new BABYLON.Scene(engine);
  const viewer = createOcctBabylonViewer(scene);
  viewerRuntimeRef.current = viewer;
  // keep engine/render loop in demo; move scene helpers into viewer package
}, [canvasRef]);
```

- [ ] **Step 4: Keep demo-specific app state and UI wiring in place**

```js
// key rule for demo/src/hooks/useViewerActions.js
export function useViewerActions(viewerRefs) {
  return {
    fitAll: () => viewerRefs.viewerRuntimeRef.current?.fitAll(),
    setProjection: (mode) => viewerRefs.viewerRuntimeRef.current?.setProjection(mode),
    setCameraView: (view) => viewerRefs.viewerRuntimeRef.current?.setView(view),
  };
}
```

- [ ] **Step 5: Run demo build and targeted browser tests**

Run: `cd demo && npm run build`
Expected: PASS.

Run: `cd demo && npx playwright test tests/demo.spec.mjs`
Expected: PASS for existing viewer flows.

- [ ] **Step 6: Commit the demo migration**

```bash
git add demo packages/occt-babylon-viewer packages/occt-babylon-loader
git commit -m "refactor: migrate demo to babylon viewer package"
```

## Task 6: Extract `ViewCube` into `@tx-code/occt-babylon-widgets`

**Files:**
- Create: `packages/occt-babylon-widgets/package.json`
- Create: `packages/occt-babylon-widgets/src/index.js`
- Create: `packages/occt-babylon-widgets/src/viewcube-widget.js`
- Create: `packages/occt-babylon-widgets/src/viewcube-style.js`
- Create: `packages/occt-babylon-widgets/src/viewcube-geometry.js`
- Create: `packages/occt-babylon-widgets/src/viewcube-hit-test.js`
- Modify: `demo/src/components/ViewCube.jsx`
- Test: `packages/occt-babylon-widgets/test/viewcube-widget.test.mjs`
- Test: `demo/tests/demo.spec.mjs`

- [ ] **Step 1: Write the failing widget lifecycle test**

```js
// packages/occt-babylon-widgets/test/viewcube-widget.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { createViewCubeWidget } from '../src/index.js';

test('ViewCube widget exposes attach/detach/dispose lifecycle', () => {
  const widget = createViewCubeWidget();
  assert.equal(typeof widget.attach, 'function');
  assert.equal(typeof widget.detach, 'function');
  assert.equal(typeof widget.dispose, 'function');
});
```

- [ ] **Step 2: Run the widget test to verify it fails**

Run: `node --test packages/occt-babylon-widgets/test/viewcube-widget.test.mjs`
Expected: FAIL because the package does not exist yet.

- [ ] **Step 3: Port the non-React `ViewCube` runtime logic into the widget package**

```js
// packages/occt-babylon-widgets/src/index.js
export { createViewCubeWidget } from './viewcube-widget.js';
```

```js
// packages/occt-babylon-widgets/src/viewcube-widget.js
export function createViewCubeWidget(options = {}) {
  let viewer = null;
  return {
    attach(nextViewer) {
      viewer = nextViewer;
    },
    detach() {
      viewer = null;
    },
    dispose() {
      viewer = null;
    },
    getViewer() {
      return viewer;
    },
  };
}
```

- [ ] **Step 4: Keep the demo React wrapper thin**

```jsx
// demo/src/components/ViewCube.jsx
import { useEffect, useRef } from 'react';
import { createViewCubeWidget } from '@tx-code/occt-babylon-widgets';

export default function ViewCube({ viewer }) {
  const containerRef = useRef(null);
  const widgetRef = useRef(null);

  useEffect(() => {
    widgetRef.current ??= createViewCubeWidget({ container: containerRef.current });
    if (viewer) widgetRef.current.attach(viewer);
    return () => widgetRef.current?.detach();
  }, [viewer]);

  return <div ref={containerRef} />;
}
```

- [ ] **Step 5: Run widget tests and demo tests**

Run: `node --test packages/occt-babylon-widgets/test/viewcube-widget.test.mjs`
Expected: PASS.

Run: `cd demo && npx playwright test tests/demo.spec.mjs`
Expected: PASS with ViewCube interactions still working.

- [ ] **Step 6: Commit widget extraction**

```bash
git add packages/occt-babylon-widgets demo/src/components/ViewCube.jsx demo/tests/demo.spec.mjs
git commit -m "feat: extract babylon viewcube widget"
```

## Task 7: Tighten docs, exports, and verification

**Files:**
- Modify: `README.md`
- Modify: `AGENTS.md`
- Modify: `packages/occt-babylon-loader/README.md`
- Create: `packages/occt-babylon-viewer/README.md`
- Create: `packages/occt-babylon-widgets/README.md`
- Modify: `demo/package.json`

- [ ] **Step 1: Update the root README package map**

```md
## Babylon Packages

- `@tx-code/occt-babylon-loader`: OCCT model to Babylon nodes
- `@tx-code/occt-babylon-viewer`: scene-first Babylon viewer runtime helpers
- `@tx-code/occt-babylon-widgets`: optional viewer widgets such as ViewCube
```

- [ ] **Step 2: Update `AGENTS.md` to reflect the new package surfaces**

```md
- `packages/occt-babylon-loader/`
  - Babylon node/material construction from OCCT model data
- `packages/occt-babylon-viewer/`
  - Babylon viewer runtime for caller-supplied scenes
- `packages/occt-babylon-widgets/`
  - Optional Babylon viewer widgets with no React dependency
```

- [ ] **Step 3: Add package README usage snippets**

```js
import { createOcctBabylonViewer } from '@tx-code/occt-babylon-viewer';
import { createViewCubeWidget } from '@tx-code/occt-babylon-widgets';
```

- [ ] **Step 4: Run repository-level verification**

Run: `npm test`
Expected: PASS.

Run: `cd demo && npm run build`
Expected: PASS.

Run: `cd demo && npm run tauri:build -- --debug --no-bundle`
Expected: PASS.

- [ ] **Step 5: Commit docs and verification changes**

```bash
git add README.md AGENTS.md packages demo/package.json
git commit -m "docs: document babylon viewer package stack"
```
