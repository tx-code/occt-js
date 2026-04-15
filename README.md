# occt-js

WebAssembly build of [OpenCASCADE Technology (OCCT)](https://dev.opencascade.org/) v7.9.3 for CAD import and triangulation. The canonical downstream path is the packaged Wasm carrier `@tx-code/occt-js`, optionally wrapped by the engine-agnostic adapter `@tx-code/occt-core`.

**[Live Demo](https://tx-code.github.io/occt-js/)** — drag and drop STEP/IGES/BREP files, face/edge/vertex picking, hover preview

## Features

- Import STEP / IGES / BREP files from memory (`Uint8Array`)
- Full B-Rep topology output (Face/Edge/Vertex with stable IDs and adjacency)
- XDE assembly tree traversal with names and per-face colors
- BRepMesh triangulation with configurable deflection
- Manufacturing-oriented single-part orientation analysis for STEP / IGES / BREP
- Embind-based API returning a structured scene graph
- Babylon.js demo with interactive face/edge/vertex selection

## Downstream Packages

- `@tx-code/occt-js`
  The root Wasm carrier. It publishes `dist/occt-js.js`, `dist/occt-js.wasm`, and `dist/occt-js.d.ts`.
- `@tx-code/occt-core`
  The engine-agnostic adapter layer on top of `@tx-code/occt-js` for normalized import flow and package-first downstream use.
- `@tx-code/occt-babylon-*`, `demo/`, and `demo/src-tauri/`
  Optional secondary surfaces for Babylon and local app development. They are not required to consume the root Wasm runtime.

## Package Usage

Install the packaged Wasm carrier:

```bash
npm install @tx-code/occt-js
```

The packaged contract supports two downstream Wasm resolution patterns:

1. Keep `occt-js.js` and `occt-js.wasm` adjacent in the published package layout.
2. Pass either `locateFile` or `wasmBinary` when initializing the module.

```js
import OcctJS from "@tx-code/occt-js";
import occtWasmUrl from "@tx-code/occt-js/dist/occt-js.wasm?url";

const occt = await OcctJS({
  locateFile(filename, scriptDirectory) {
    if (filename === "occt-js.wasm") {
      return occtWasmUrl;
    }
    return new URL(filename, scriptDirectory).toString();
  },
});

const occtWithBinary = await OcctJS({
  wasmBinary: await fetch(occtWasmUrl).then((response) => response.arrayBuffer()),
});
```

Use `@tx-code/occt-core` when you want a package-first adapter over the root Wasm carrier:

```bash
npm install @tx-code/occt-js @tx-code/occt-core
```

```js
import OcctJS from "@tx-code/occt-js";
import occtWasmUrl from "@tx-code/occt-js/dist/occt-js.wasm?url";
import { createOcctCore } from "@tx-code/occt-core";

const core = createOcctCore({
  factory: OcctJS,
  wasmBinaryLoader: () => fetch(occtWasmUrl).then((response) => response.arrayBuffer()),
});
```

## Import Appearance Contract

Import-time appearance is part of the packaged runtime contract. Downstream apps can either preserve source colors or request one default CAD color during import:

```js
const result = occt.ReadFile("step", buffer, {
  colorMode: "default",
  defaultColor: { r: 0.2, g: 0.4, b: 0.6 },
});
```

Contract rules:

- `colorMode: "source"` preserves imported source colors.
- `colorMode: "default"` ignores source colors and uses one default CAD color for the imported result.
- If `defaultColor` is omitted in default mode, the built-in fallback is `[0.9, 0.91, 0.93]`.
- `readColors` is a legacy toggle and is only authoritative when `colorMode` is omitted.

Apps own settings persistence. `occt-js` only consumes the selected import-time appearance options and returns the resulting colors/materials.
Viewer overrides remain downstream concerns; post-import repaint, theme switching, and display policy are outside the root Wasm carrier scope.

## Exact Pairwise Measurement Foundation

For exact BRep measurement, the root Wasm carrier exposes retained-model and pairwise entrypoints directly:

```js
const exact = occt.OpenExactStepModel(buffer, {
  rootMode: "multiple-shapes",
});

const exactModelId = exact.exactModelId;
const exactShapeHandle = exact.exactGeometryBindings[0].exactShapeHandle;
const identity = [
  1, 0, 0, 0,
  0, 1, 0, 0,
  0, 0, 1, 0,
  0, 0, 0, 1,
];

const distance = occt.MeasureExactDistance(
  exactModelId, exactShapeHandle, "face", 1,
  exactShapeHandle, "face", 2,
  identity, identity,
);

const angle = occt.MeasureExactAngle(
  exactModelId, exactShapeHandle, "edge", 5,
  exactShapeHandle, "edge", 6,
  identity, identity,
);

const thickness = occt.MeasureExactThickness(
  exactModelId, exactShapeHandle, "face", 1,
  exactShapeHandle, "face", 2,
  identity, identity,
);
```

Most downstream apps should prefer the package-first adapter surface in `@tx-code/occt-core`, which keeps occurrence transforms and exact refs in JS-friendly DTOs:

```js
const rawExact = await core.openExactStep(buffer, {
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

Overlay rendering, selection UX, and semantic feature recognition remain downstream concerns. `occt-js` and `@tx-code/occt-core` stop at the exact Wasm/kernel and package-adapter boundary.

## Prerequisites

| Tool | Version |
|------|---------|
| Emscripten SDK | 3.1.69 |
| CMake | 3.20+ |
| Git | (for OCCT submodule) |

## Setup

```bash
# Clone with submodule
git clone --recurse-submodules <repo-url>
cd occt-js

# If you already cloned the repo or are working in a fresh git worktree:
git submodule update --init --recursive occt

# Windows: install Emscripten into build/wasm/emsdk
tools/setup_emscripten_win.bat

# Linux/macOS: install Emscripten manually or use emsdk
```

For clean Windows worktrees, run `tools/setup_emscripten_win.bat` before `npm run build:wasm:win`.

## Build

```bash
# Windows
npm run build:wasm:win

# Linux/macOS: activate Emscripten first, then:
bash tools/build_wasm.sh
```

Output files are written to `dist/`:
- `occt-js.js` — packaged JavaScript loader
- `occt-js.wasm` — WebAssembly binary
- `occt-js.d.ts` — tracked TypeScript definitions published with the package

Root tests and downstream consumers require the generated `dist/occt-js.js` and `dist/occt-js.wasm` artifacts to exist. In a clean clone or worktree, build them before running `npm test`.
The tracked `dist/occt-js.d.ts` file is not regenerated by the Wasm build and should not be deleted. If it is missing, restore it with:

```bash
git restore --source=HEAD -- dist/occt-js.d.ts
```

The Windows build entrypoint fails early with a clear error if either prerequisite is missing:
- `occt/src/Standard` from the `occt` git submodule
- `build/wasm/emsdk/emsdk_env.bat` from `tools/setup_emscripten_win.bat`

Windows build failures retain a log file at `build/wasm-build.log`. If a parallel build fails intermittently, retry with lower parallelism:

```bash
set BUILD_JOBS=1 && tools\build_wasm_win.bat Release
```

## Test

Run the fast preflight command when you want prerequisite and runtime-contract validation without relying on the full runtime suite:

```bash
npm run test:wasm:preflight
```

Run the full root verification gate after `npm run build:wasm:win` has produced `dist/occt-js.js` and `dist/occt-js.wasm`:

```bash
npm test
```

## Release Gate

Use `npm run test:release:root` as the authoritative root release verification command:

```bash
npm run test:release:root
```

This gate is runtime-first. It covers the Windows Wasm build, root governance contracts, `@tx-code/occt-core`, and the full root runtime suite.
That authoritative surface includes `test/exact_pairwise_measurement_contract.test.mjs`, so exact pairwise measurement stays mandatory in root release verification.

Demo, Babylon, and Tauri surfaces are conditional secondary-surface verification only. Run their checks when your release changes `demo/`, `demo/tests/`, `demo/src-tauri/`, or the Babylon package surfaces.

## Repository Layout (2026-04-14)

This stays a single `occt-js` repository. The primary downstream contract is centered on:

- `@tx-code/occt-js`
  - Root Wasm carrier with the canonical packaged runtime artifacts.
- `@tx-code/occt-core` (`packages/occt-core`)
  - Engine-agnostic adapter with normalized CAD model output.
  - Unified import API for `step` / `iges` / `brep`.

Secondary repository-local layers remain available for demos and Babylon integrations:

- `@tx-code/occt-babylon-loader` (`packages/occt-babylon-loader`)
  - Babylon-facing model loader and scene builder.
- `@tx-code/occt-babylon-viewer` (`packages/occt-babylon-viewer`)
  - Scene-first Babylon viewer runtime helpers.
- `@tx-code/occt-babylon-widgets` (`packages/occt-babylon-widgets`)
  - Optional viewer widgets such as ViewCube.

## Babylon Packages

- `@tx-code/occt-babylon-loader`: OCCT model to Babylon nodes.
- `@tx-code/occt-babylon-viewer`: scene-first Babylon viewer runtime helpers.
- `@tx-code/occt-babylon-widgets`: optional viewer widgets such as ViewCube.

## API

```js
import OcctJS from "@tx-code/occt-js";
import occtWasmUrl from "@tx-code/occt-js/dist/occt-js.wasm?url";

const occt = await OcctJS({
    locateFile(filename) {
        return filename === "occt-js.wasm" ? occtWasmUrl : filename;
    }
});

const buffer = new Uint8Array(/* ... CAD file bytes ... */);
const result = occt.ReadFile("step", buffer, {
    rootMode: "one-shape",
    linearUnit: "millimeter",
    linearDeflectionType: "bounding_box_ratio",
    linearDeflection: 0.1,
    angularDeflection: 0.5,
    readNames: true,
    colorMode: "default",
    defaultColor: { r: 0.2, g: 0.4, b: 0.6 }
});

// Also available:
// occt.ReadIgesFile(buffer, options)
// occt.ReadBrepFile(buffer, options)

// result.success       — boolean
// result.sourceFormat  — "step"
// result.rootNodes     — tree of nodes with children, transforms, meshes[]
// result.geometries    — array of { positions, normals, indices, faces, edges, vertices, triangleToFaceMap }
// result.materials     — deduplicated color list
// result.stats         — { rootCount, nodeCount, partCount, triangleCount, ... }
```

`rootMode` behavior by format:

- `"one-shape"`: default. Multiple top-level XDE free shapes are exposed under one logical root node.
- `"multiple-shapes"`: preserves each top-level free shape as an independent root node.
- `BREP one-shape`: keeps the current single-root behavior.
- `BREP multiple-shapes`: if the imported file resolves to a compound/compsolid wrapper chain, `occt-js` unwraps single-child wrappers and exposes the first meaningful compound level as multiple root nodes.

## Orientation Analysis

`occt-js` also exposes a separate manufacturing-oriented orientation analysis API for single parts:

```js
const orientation = occt.AnalyzeOptimalOrientation("step", buffer, {
    mode: "manufacturing",
    linearUnit: "millimeter"
});

if (orientation.success) {
    // 4x4 transform that aligns the part into its suggested working pose.
    console.log(orientation.transform);

    // Local reference frame derived from the oriented bounding box.
    console.log(orientation.localFrame);

    // Analysis diagnostics.
    console.log(orientation.strategy);   // e.g. "planar-base-with-cylinder-support+projected-min-area-rect"
    console.log(orientation.stage1);     // base face / detected axis
    console.log(orientation.stage2);     // rotationAroundZDeg
    console.log(orientation.confidence); // 0..1 heuristic score
}
```

Supported formats for `AnalyzeOptimalOrientation(...)`:

- `step`
- `iges`
- `brep`

Current scope:

- single-part / `one-shape` analysis
- manufacturing-oriented heuristic based on exact B-Rep geometry
- optional `presetAxis` override to constrain stage 1 alignment

## License

This project links against OCCT which is licensed under the [GNU Lesser General Public License v2.1](https://www.gnu.org/licenses/old-licenses/lgpl-2.1.html).
