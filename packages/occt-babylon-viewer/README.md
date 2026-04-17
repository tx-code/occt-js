# @tx-code/occt-babylon-viewer

Babylon.js viewer runtime helpers for OCCT-backed CAD models.

## Scope

- Attach to a caller-supplied Babylon `Scene`.
- Keep scene runtime concerns out of the demo app.
- Load OCCT model DTOs through `@tx-code/occt-babylon-loader`.
- Expose a stable runtime API for camera/grid/axes and widget integration.

## Usage

```js
import { createOcctBabylonViewer } from "@tx-code/occt-babylon-viewer";
import { buildOcctScene } from "@tx-code/occt-babylon-loader";
import { createViewCubeWidget } from "@tx-code/occt-babylon-widgets";

const viewer = createOcctBabylonViewer(scene, { sceneBuilder: buildOcctScene });
const viewCube = createViewCubeWidget({ container: viewCubeElement });
viewCube.attach(viewer);
```

`sceneBuilder` is intentionally injected so viewer runtime and loader package stay decoupled at module-resolution time.

## API

- `createOcctBabylonViewer(scene)`
- `viewer.getScene()`
- `viewer.getRootNode()`
- `viewer.getCamera()`
- `viewer.getSceneState()`
- `viewer.fitAll()`
- `viewer.setProjection(mode)`
- `viewer.setView(direction)`
- `viewer.setTheme(theme)`
- `viewer.setGridVisible(visible)`
- `viewer.setAxesVisible(visible)`
- `viewer.loadOcctModel(model)`
- `viewer.clearModel()`
- `viewer.dispose()`

Utility exports for CAD-quality shading and theme parity:

- `createCadPartMaterial(scene, name, colorLike, options?)`
- `createCadVertexColorMaterial(scene, name, options?)`
- `createViewerLinePass(scene, options?)`
- `buildOcctEdgeLinePassBatch(geometry, options?)`
- `createScreenSpaceVertexMarker(scene, worldPoint, camera, BABYLON, options?)`
- `pickOcctClosestVertex({ pickedMesh, geometry, localPoint, pointerX, pointerY, scene, camera, engine, BABYLON, ... })`
- `createOcctVertexPreviewPoints(scene, meshes, resolveGeometry, BABYLON, options?)`
- `getOcctVertexCoords(vertex)`
- `resolveShadingNormals(positions, indices, sourceNormals, options?)`
- `applySceneTheme(scene, theme)`

Vertex picking/preview helpers are package-level APIs, so non-demo apps can reuse the same behavior:

```js
import {
  pickOcctClosestVertex,
  createOcctVertexPreviewPoints,
  createScreenSpaceVertexMarker,
} from "@tx-code/occt-babylon-viewer";

const result = pickOcctClosestVertex({
  pickedMesh,
  geometry,
  localPoint,
  pointerX: event.offsetX,
  pointerY: event.offsetY,
  scene,
  camera,
  engine,
  BABYLON,
});

const previewDisposables = createOcctVertexPreviewPoints(
  scene,
  meshes,
  (mesh) => meshGeoMap.get(mesh.sourceMesh || mesh),
  BABYLON,
);

const marker = createScreenSpaceVertexMarker(scene, worldPoint, camera, BABYLON, {
  markerType: "select",
  coreColor: new BABYLON.Color3(0.0, 1.0, 0.3),
});
```

## Verification

From the repository root:

```bash
npm --prefix packages/occt-babylon-viewer test
```

This package is conditional secondary-surface verification only. Run it when you touch viewer runtime code or its package manifest.
