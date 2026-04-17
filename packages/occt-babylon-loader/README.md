# @tx-code/occt-babylon-loader

Babylon-facing adapter layer for `@tx-code/occt-core`.

## Scope

- File extension to OCCT format routing
- Loader entry that delegates CAD parsing to `occt-core`
- Generic `OcctFileLoader` plugin for Babylon SceneLoader
- Keeps Babylon-specific scene/material construction separate from Wasm import logic

## Supported Extensions

- `.step`, `.stp`
- `.iges`, `.igs`
- `.brep`, `.brp`

## Quick Example

```js
import { createOcctCore } from "@tx-code/occt-core";
import { loadWithOcctCore } from "@tx-code/occt-babylon-loader";

const core = createOcctCore({ factory: globalThis.OcctJS });
const model = await loadWithOcctCore(core, fileBytes, { fileName: "assembly.step" });
```

## Build Scene Resources

```js
import { buildOcctScene } from "@tx-code/occt-babylon-loader";

const resources = buildOcctScene(model, scene, { createRootNode: false });
```

## Verification

From the repository root:

```bash
npm --prefix packages/occt-babylon-loader test
```

This package is conditional secondary-surface verification only. Run it when you touch loader code, its Babylon scene-construction path, or the package manifest.
The loader owns its direct imports of `@babylonjs/core` and `@tx-code/occt-babylon-viewer`; `@tx-code/occt-core` remains caller-supplied.
