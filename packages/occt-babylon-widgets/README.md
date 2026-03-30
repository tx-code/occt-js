# @tx-code/occt-babylon-widgets

Optional Babylon viewer widgets with no React dependency.

## Scope

- Provide reusable viewer widgets on top of `@tx-code/occt-babylon-viewer`.
- Keep runtime logic framework-agnostic (`attach`/`detach`/`dispose` lifecycle).
- Allow thin app wrappers (React, Vue, vanilla DOM).

## Usage

```js
import { createOcctBabylonViewer } from "@tx-code/occt-babylon-viewer";
import { createViewCubeWidget } from "@tx-code/occt-babylon-widgets";

const viewer = createOcctBabylonViewer(scene);
const widget = createViewCubeWidget({ container: document.getElementById("viewcube") });
widget.attach(viewer);
```

## Current Widgets

- `createViewCubeWidget(options)`
