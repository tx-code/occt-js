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
import { createViewCubeWidget } from "@tx-code/occt-babylon-widgets";

const viewer = createOcctBabylonViewer(scene);
const viewCube = createViewCubeWidget({ container: viewCubeElement });
viewCube.attach(viewer);
```

## API

- `createOcctBabylonViewer(scene)`
- `viewer.getScene()`
- `viewer.getRootNode()`
- `viewer.getCamera()`
- `viewer.getSceneState()`
- `viewer.fitAll()`
- `viewer.setProjection(mode)`
- `viewer.setView(direction)`
- `viewer.setGridVisible(visible)`
- `viewer.setAxesVisible(visible)`
- `viewer.loadOcctModel(model)`
- `viewer.clearModel()`
- `viewer.dispose()`
