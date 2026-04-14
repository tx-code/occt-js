# @tx-code/occt-core

Engine-agnostic adapter layer on top of `@tx-code/occt-js`.

## What It Provides

- Unified `importModel` API (`step` / `iges` / `brep`)
- Works with both format-specific exports (`ReadStepFile`/`ReadIgesFile`/`ReadBrepFile`) and generic `ReadFile(format, ...)`
- Result normalization for both `occt-js` and `occt-import-js` style payloads
- Canonical scene graph with deduplicated geometry/material data

## Install

```bash
npm install @tx-code/occt-js @tx-code/occt-core
```

## Quick Example

```js
import OcctJS from "@tx-code/occt-js";
import occtWasmUrl from "@tx-code/occt-js/dist/occt-js.wasm?url";
import { createOcctCore } from "@tx-code/occt-core";

const core = createOcctCore({
  factory: OcctJS,
  wasmBinaryLoader: () => fetch(occtWasmUrl).then((response) => response.arrayBuffer()),
});

const model = await core.importModel(stepBytes, {
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

Notes:

- `createOcctCore(...)` stays package-first and engine-agnostic. It does not require Babylon or any repo-local demo layer.
- Pass `format` explicitly when you already know it, or pass `fileName` and let `occt-core` infer the format from the extension.
- Use `wasmBinary` when you already have the bytes in memory, or `wasmBinaryLoader` when the adapter should fetch them lazily.
- Root release verification is driven by `npm run test:release:root` from the repository root; demo, Babylon, and Tauri checks remain conditional secondary-surface verification.
