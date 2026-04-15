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
    appearancePreset: "cad-ghosted",
    rootMode: "one-shape",
    linearDeflectionType: "bounding_box_ratio",
    linearDeflection: 0.001,
    angularDeflection: 0.5,
    readNames: true,
    colorMode: "default",
    defaultColor: [51, 102, 153],
    defaultOpacity: 0.5,
  },
});
```

Notes:

- `createOcctCore(...)` stays package-first and engine-agnostic. It does not require Babylon or any repo-local demo layer.
- Pass `format` explicitly when you already know it, or pass `fileName` and let `occt-core` infer the format from the extension.
- Use `wasmBinary` when you already have the bytes in memory, or `wasmBinaryLoader` when the adapter should fetch them lazily.
- Root release verification is driven by `npm run test:release:root` from the repository root; demo, Babylon, and Tauri checks remain conditional secondary-surface verification.

## Import Appearance Contract

`@tx-code/occt-core` forwards the root runtime appearance contract in package-first form:

```js
const model = await core.importModel(stepBytes, {
  fileName: "part.step",
  importParams: {
    appearancePreset: "cad-ghosted",
    colorMode: "default",
    defaultColor: [51, 102, 153],
    defaultOpacity: 0.5,
  },
});
```

Contract rules:

- `appearancePreset: "cad-solid"` forwards the built-in CAD base appearance as an opaque default import style.
- `appearancePreset: "cad-ghosted"` forwards the built-in ghost preset, which uses the built-in CAD base color plus ghost opacity `0.35` until explicit overrides are supplied.
- `colorMode: "source"` preserves imported source colors.
- `colorMode: "default"` requests one default CAD color for the imported result.
- If `defaultColor` is omitted in default mode, the built-in fallback is `[0.9, 0.91, 0.93]`.
- If `defaultOpacity` is omitted, preset-derived opacity is preserved when present; otherwise the default appearance stays opaque.
- `readColors` is still accepted as a legacy toggle, but only when `colorMode` is omitted.
- `@tx-code/occt-core` normalizes tuple/object `defaultColor` input before forwarding the canonical root contract.
- If `defaultOpacity` is omitted but `defaultColor` carries alpha or opacity, `@tx-code/occt-core` promotes that alpha channel into the canonical root `defaultOpacity`.
- Explicit `defaultOpacity` wins over any alpha promoted from `defaultColor`.

Apps own settings persistence, and `@tx-code/occt-core` only consumes the chosen import-time appearance options.
Viewer overrides remain downstream concerns; the adapter does not own repaint, theme switching, or post-import display policy.

## Exact Pairwise Measurement

`@tx-code/occt-core` keeps exact pairwise measurement package-first by wrapping the root Wasm carrier's retained exact-model APIs and occurrence transforms:

```js
const rawExact = await core.openExactStep(stepBytes, {
  fileName: "part.step",
});

const refA = {
  exactModelId: rawExact.exactModelId,
  exactShapeHandle: rawExact.exactGeometryBindings[0].exactShapeHandle,
  kind: "face",
  elementId: 1,
  transform: [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ],
};
const refB = { ...refA, elementId: 2 };

const distance = await core.measureExactDistance(refA, refB);
const angle = await core.measureExactAngle(refA, refB);
const thickness = await core.measureExactThickness(refA, refB);
```

If you need the raw carrier directly, the underlying root Wasm entrypoints are `MeasureExactDistance`, `MeasureExactAngle`, and `MeasureExactThickness`. The adapter does not hide that contract; it only validates refs, preserves occurrence transforms, and returns package-friendly DTOs.

Overlay rendering, selection UX, and semantic feature recognition remain downstream concerns. `@tx-code/occt-core` stays at the adapter boundary and does not require Babylon, viewer widgets, or demo-local code.
