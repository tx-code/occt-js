# Architecture

**Analysis Date:** 2026-04-17

## Pattern Overview

**Overall:** Layered monorepo with a native OCCT/Wasm core, JavaScript adapter packages, and a shared React/Tauri application shell.

**Key Characteristics:**
- `CMakeLists.txt` compiles `src/*.cpp` together with selected `occt/src/*` modules into the Emscripten target that emits the root runtime consumed from `dist/`.
- `src/js-interface.cpp` is the single JS boundary for the native runtime: it parses import/query parameters, dispatches format-specific readers, and serializes C++ DTOs into Embind values and typed arrays.
- `packages/` isolates downstream-facing layers: `packages/occt-core/src/` normalizes the root Wasm contract, `packages/occt-babylon-loader/src/` builds Babylon scene resources, and `packages/occt-babylon-viewer/src/` plus `packages/occt-babylon-widgets/src/` provide viewer/runtime helpers.
- `demo/src/` is the single UI codebase for browser and desktop. `demo/src-tauri/` only hosts and packages that UI; it does not replace the web entry path.

## Layers

**Native Runtime Layer:**
- Purpose: Read CAD bytes, build OCCT scene/topology data, retain exact model state, and compute orientation/query results.
- Location: `src/`, `CMakeLists.txt`, `occt/`
- Contains: DTO definitions in `src/importer.hpp`, format dispatchers in `src/importer-step.cpp`, `src/importer-iges.cpp`, and `src/importer-brep.cpp`, XDE traversal in `src/importer-xde.cpp`, meshing/topology extraction in `src/importer-utils.cpp`, exact lifecycle/query code in `src/exact-model-store.hpp` and `src/exact-query.cpp`, and orientation analysis in `src/orientation.cpp`.
- Depends on: OCCT modules selected in `CMakeLists.txt`, Embind in `src/js-interface.cpp`, and the Emscripten toolchain expected under `build/wasm/emsdk`.
- Used by: The published root carrier declared in `package.json`, root tests under `test/`, the demo runtime loader in `demo/src/hooks/useOcct.js`, and the package adapter in `packages/occt-core/src/occt-core.js`.

**Root Runtime Distribution Layer:**
- Purpose: Package and expose the canonical Wasm artifacts consumed by tests, local web development, and desktop bundling.
- Location: `package.json`, `dist/`, `tools/`
- Contains: Root npm exports in `package.json`, tracked typing surface `dist/occt-js.d.ts`, generated runtime binaries `dist/occt-js.js` and `dist/occt-js.wasm`, and build scripts such as `tools/build_wasm.sh`, `tools/build_wasm_win.bat`, and `tools/build_wasm_win_dist.bat`.
- Depends on: The native runtime layer and the CMake/Emscripten build configured in `CMakeLists.txt`.
- Used by: Root tests in `test/`, browser runtime loading in `demo/src/hooks/useOcct.js`, and Tauri bundling via `demo/src-tauri/tauri.conf.json`.

**Core Adapter Layer:**
- Purpose: Wrap the raw Wasm module in a stable JavaScript API, normalize returned model data, and map UI-facing selections back to exact OCCT handles.
- Location: `packages/occt-core/src/`
- Contains: The public client in `packages/occt-core/src/occt-core.js`, result normalization in `packages/occt-core/src/model-normalizer.js`, exact-model normalization in `packages/occt-core/src/exact-model-normalizer.js`, exact-ref resolution in `packages/occt-core/src/exact-ref-resolver.js`, format routing in `packages/occt-core/src/formats.js`, and auto-orientation application in `packages/occt-core/src/orientation.js`.
- Depends on: The root Wasm factory exposed from `dist/occt-js.js` or the global `OcctJS` factory loaded by consumers.
- Used by: `packages/occt-babylon-loader/src/occt-model-loader.js`, `demo/src/hooks/useOcct.js`, and downstream callers that want a package-first API instead of calling Embind methods directly.

**Babylon Integration Layer:**
- Purpose: Convert normalized model DTOs into Babylon scene resources and provide reusable viewer/picking/rendering helpers.
- Location: `packages/occt-babylon-loader/src/`, `packages/occt-babylon-viewer/src/`, `packages/occt-babylon-widgets/src/`
- Contains: SceneLoader integration in `packages/occt-babylon-loader/src/occt-file-loader.js`, scene construction in `packages/occt-babylon-loader/src/occt-scene-builder.js`, viewer orchestration in `packages/occt-babylon-viewer/src/occt-babylon-viewer.js`, line-pass/material/camera/grid helpers in `packages/occt-babylon-viewer/src/viewer-*.js`, and the canvas-driven view cube in `packages/occt-babylon-widgets/src/viewcube-widget.js`.
- Depends on: `@tx-code/occt-core`, Babylon packages declared in `packages/occt-babylon-viewer/package.json`, and normalized model DTOs from `packages/occt-core/src/model-normalizer.js`.
- Used by: `demo/src/hooks/useViewer.js`, `demo/src/hooks/usePicking.js`, and `demo/src/components/ViewCube.jsx`.

**Application Shell Layer:**
- Purpose: Provide the end-user viewer UI, coordinate import/viewer state, and add desktop-only affordances without changing the shared web code.
- Location: `demo/src/`, `demo/src-tauri/`
- Contains: React bootstrap in `demo/src/main.jsx`, shell composition in `demo/src/App.jsx`, store state in `demo/src/store/viewerStore.js`, runtime hooks in `demo/src/hooks/`, platform helpers in `demo/src/lib/`, UI components in `demo/src/components/`, and the Tauri host in `demo/src-tauri/src/main.rs` plus `demo/src-tauri/src/lib.rs`.
- Depends on: The Babylon integration layer, `@tauri-apps/*` packages from `demo/package.json`, and desktop packaging config in `demo/src-tauri/tauri.conf.json`.
- Used by: Browser users via `demo/src/main.jsx`, desktop users via `demo/src-tauri/`, Playwright tests in `demo/tests/`, and the deployment workflow in `.github/workflows/deploy-demo.yml`.

## Data Flow

**CAD Import To Viewer Flow:**

1. A caller invokes `importModel()` from `packages/occt-core/src/occt-core.js` directly or indirectly through `demo/src/hooks/useOcct.js`.
2. `packages/occt-core/src/formats.js` resolves the format and `packages/occt-core/src/occt-core.js` calls `ReadStepFile`, `ReadIgesFile`, `ReadBrepFile`, or `ReadFile` on the loaded Wasm module.
3. `src/js-interface.cpp` parses import parameters and dispatches to `src/importer-step.cpp`, `src/importer-iges.cpp`, or `src/importer-brep.cpp`.
4. STEP and IGES imports route through `src/importer-xde.cpp`; BREP imports stay in `src/importer-brep.cpp`; both use `src/importer-utils.cpp` to triangulate shapes and extract faces, edges, vertices, and triangle-to-face mappings.
5. `src/js-interface.cpp` converts `OcctSceneData` into JS objects with typed arrays, node trees, material summaries, warnings, and stats.
6. `packages/occt-core/src/model-normalizer.js` reshapes the raw result into the package contract consumed by `packages/occt-babylon-loader/src/occt-scene-builder.js`.
7. `packages/occt-babylon-loader/src/occt-scene-builder.js` creates Babylon meshes and transform nodes, and `packages/occt-babylon-viewer/src/occt-babylon-viewer.js` manages camera, grid, lighting, and model lifecycle for `demo/src/hooks/useViewer.js`.

**Exact Model Query Flow:**

1. A caller opens an exact model through `packages/occt-core/src/occt-core.js#openExactModel`.
2. `src/js-interface.cpp#OpenExactByFormat` imports the exact OCCT shape, stores it in `src/exact-model-store.hpp`, and returns `exactModelId` plus geometry bindings aligned to exported meshes.
3. `packages/occt-core/src/exact-model-normalizer.js` preserves those bindings on the normalized model, and `packages/occt-core/src/exact-ref-resolver.js` maps `nodeId` plus `geometryId` plus element IDs to occurrence-scoped refs with transforms.
4. Operations such as `measureExactDistance()`, `measureExactAngle()`, `classifyExactRelation()`, and placement suggestions in `packages/occt-core/src/occt-core.js` pass those refs back through Embind bindings in `src/js-interface.cpp`.
5. `src/exact-query.cpp` performs the actual OCCT exact-geometry computation, and `src/exact-model-store.hpp` keeps retained model state alive until `ReleaseExactModel` is called.

**Auto-Orientation Flow:**

1. After a successful import, `demo/src/hooks/useOcct.js` calls `resolveAutoOrientedModel()` from `packages/occt-core/src/orientation.js`.
2. `packages/occt-core/src/orientation.js` invokes `AnalyzeOptimalOrientation` on the Wasm module when the binding exists.
3. `src/orientation.cpp` reloads the CAD bytes, computes an orientation transform and diagnostics, and returns them as an `OrientationResult`.
4. `packages/occt-core/src/orientation.js` converts the analysis transform from the runtime frame into Babylon’s render frame and reapplies it to normalized `rootNodes`.

**State Management:**
- Root import calls are request-scoped and return immutable scene DTOs built from `src/importer.hpp`.
- Retained exact state is the only long-lived native state; it lives behind `src/exact-model-store.hpp` and is keyed by integer `exactModelId`.
- UI state lives in `demo/src/store/viewerStore.js`; Babylon engine, scene, camera, and line-pass objects stay local to `demo/src/hooks/useViewer.js`.

## Key Abstractions

**ImportParams Contract:**
- Purpose: Define the runtime import surface for tessellation, unit handling, appearance presets, root splitting, and fallback color behavior.
- Examples: `src/importer.hpp`, parsing in `src/js-interface.cpp`
- Pattern: Parse JS input once at the Embind boundary and pass a fully normalized `ImportParams` object into native importers.

**Scene Export DTOs:**
- Purpose: Represent the root runtime result before JS normalization.
- Examples: `src/importer.hpp` defines `OcctSceneData`, `OcctNodeData`, `OcctMeshData`, and exact-query result structs.
- Pattern: Native code produces plain structs; `src/js-interface.cpp` is responsible for converting them to JS values and typed arrays.

**Retained Exact Model Store:**
- Purpose: Hold OCCT shapes across multiple exact-query calls without re-reading the source file for every operation.
- Examples: `src/exact-model-store.hpp`, bindings in `src/js-interface.cpp`
- Pattern: Use integer handles and explicit retain/release lifecycle methods instead of exposing raw native pointers to JS.

**Package-First Runtime Client:**
- Purpose: Shield downstream code from direct Embind details and root export naming.
- Examples: `packages/occt-core/src/occt-core.js`, `packages/occt-core/src/index.js`
- Pattern: Resolve the Wasm factory once, validate inputs early, and normalize successful outputs into stable DTOs before returning them.

**Normalized Model Contract:**
- Purpose: Provide a consistent JS shape for downstream renderers and exact-ref utilities regardless of the raw Wasm output details.
- Examples: `packages/occt-core/src/model-normalizer.js`, `packages/occt-core/src/exact-model-normalizer.js`
- Pattern: Normalize low-level arrays and legacy field variants into `rootNodes`, `geometries`, `materials`, `warnings`, and `stats`.

**Viewer Runtime Controller:**
- Purpose: Own Babylon scene helpers and hide repetitive camera/grid/light/model lifecycle operations from applications.
- Examples: `packages/occt-babylon-viewer/src/occt-babylon-viewer.js`, wrapper usage in `demo/src/hooks/useViewer.js`
- Pattern: Keep viewer state local to a controller object with imperative methods such as `loadOcctModel()`, `clearModel()`, `fitAll()`, and `setProjection()`.

## Entry Points

**Root NPM Package:**
- Location: `package.json`
- Triggers: Node/npm consumers import `@tx-code/occt-js`.
- Responsibilities: Export the root runtime from `dist/occt-js.js`, expose `dist/occt-js.wasm`, and define the canonical root build/test scripts.

**Native JS Boundary:**
- Location: `src/js-interface.cpp`
- Triggers: Any call into `ReadStepFile`, `ReadFile`, `OpenExactModel`, `AnalyzeOptimalOrientation`, or exact-query bindings from the loaded Wasm module.
- Responsibilities: Validate JS inputs, dispatch native operations, and serialize native result structs into JS values.

**Wasm Build Target:**
- Location: `CMakeLists.txt`
- Triggers: `tools/build_wasm.sh`, `tools/build_wasm_win.bat`, `tools/build_wasm_win_dist.bat`, and `npm run build:wasm:win`.
- Responsibilities: Select OCCT modules, compile `src/*.cpp`, and configure Emscripten output and runtime flags.

**Web Viewer App:**
- Location: `demo/src/main.jsx`
- Triggers: Vite dev/build startup via `demo/package.json`.
- Responsibilities: Bootstrap React, load Babylon globals from `demo/src/lib/babylon-runtime.js`, and mount `demo/src/App.jsx`.

**Desktop Host:**
- Location: `demo/src-tauri/src/main.rs`, `demo/src-tauri/src/lib.rs`
- Triggers: `npm --prefix demo run tauri:dev` and `npm --prefix demo run tauri:build`.
- Responsibilities: Launch the shared `demo/` build inside Tauri, register desktop plugins, and package root runtime artifacts declared in `demo/src-tauri/tauri.conf.json`.

**Reusable Package APIs:**
- Location: `packages/occt-core/src/index.js`, `packages/occt-babylon-loader/src/index.js`, `packages/occt-babylon-viewer/src/index.js`, `packages/occt-babylon-widgets/src/index.js`
- Triggers: Package consumers or the demo import these modules.
- Responsibilities: Present narrow public surfaces while keeping internal module files private to each package.

## Error Handling

**Strategy:** Native code returns structured failure objects across the Wasm boundary, and JavaScript adapters throw only after inspecting those results.

**Patterns:**
- `src/importer-brep.cpp`, `src/importer-xde.cpp`, and `src/orientation.cpp` catch `Standard_Failure`, `std::exception`, and unknown exceptions and convert them into `success=false` plus an error string.
- `src/exact-query.cpp` and `src/js-interface.cpp` use `{ ok, code, message }` result objects for exact operations instead of throwing across Embind.
- `packages/occt-core/src/occt-core.js` validates formats, refs, transforms, and query points before making module calls and throws descriptive `Error` instances when the runtime surface is missing or reports failure.
- `demo/src/hooks/useOcct.js` and `demo/src/hooks/useViewerActions.js` catch UI-facing failures and surface them through `alert()` or `console.warn`.

## Cross-Cutting Concerns

**Logging:** Minimal and local. `demo/src/hooks/useOcct.js` uses `console.warn` when auto-orientation fails, and `demo/src-tauri/src/lib.rs` enables `tauri-plugin-log` only in debug builds.
**Validation:** Import parameter coercion and numeric clamping happen in `src/js-interface.cpp`; format/ref validation lives in `packages/occt-core/src/formats.js`, `packages/occt-core/src/occt-core.js`, and `packages/occt-core/src/exact-ref-resolver.js`.
**Authentication:** Not applicable. No authentication or identity layer is implemented in `src/`, `packages/`, `demo/src/`, or `demo/src-tauri/`.

---

*Architecture analysis: 2026-04-17*
