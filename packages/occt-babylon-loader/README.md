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
