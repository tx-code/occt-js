# @tx-code/occt-core

Core runtime module for OCCT WebAssembly adapters.

## What It Provides

- Unified `importModel` API (`step` / `iges` / `brep`)
- Works with both format-specific exports (`ReadStepFile`/`ReadIgesFile`/`ReadBrepFile`) and generic `ReadFile(format, ...)`
- Result normalization for both `occt-js` and `occt-import-js` style payloads
- Canonical scene graph with deduplicated geometry/material data

## Quick Example

```js
import { createOcctCore } from "@tx-code/occt-core";

const core = createOcctCore({
  factory: globalThis.OcctJS,
  wasmBinary: await fetch("/occt-js.wasm").then((r) => r.arrayBuffer()),
});

const model = await core.importModel(stepBytes, {
  format: "step",
  fileName: "part.step",
  importParams: {
    rootMode: "one-shape",
    linearDeflectionType: "bounding_box_ratio",
    linearDeflection: 0.001,
    angularDeflection: 0.5,
    readNames: true,
    readColors: true,
  },
});
```
