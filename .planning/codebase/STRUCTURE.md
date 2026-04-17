# Codebase Structure

**Analysis Date:** 2026-04-17

## Directory Layout

```text
[project-root]/
├── .planning/            # GSD planning artifacts, including `.planning/codebase/`
├── build/                # Local generated build workspace; `build/wasm/emsdk` is the Windows toolchain location
├── demo/                 # Shared React + Vite viewer app used by both browser and desktop
├── dist/                 # Root runtime artifacts consumed by tests, local web dev, and Tauri packaging
├── docs/                 # SDK, spec, and planning documentation
├── occt/                 # OCCT source submodule compiled into the Wasm target
├── packages/             # Reusable JS package layers over the root runtime
├── src/                  # Native C++ bridge, importers, exact queries, and orientation logic
├── test/                 # Root Wasm/runtime tests plus CAD fixtures
├── tools/                # Wasm build/setup scripts
├── CMakeLists.txt        # Native build definition for `occt-js`
├── package.json          # Root package exports and canonical build/test scripts
├── playwright.config.mjs # Browser test runner config for `demo/tests/`
└── AGENTS.md             # Repository-level agent/build workflow contract
```

## Directory Purposes

**`src/`:**
- Purpose: Hold all repository-owned native runtime code that becomes the `occt-js` Wasm module.
- Contains: DTO headers, importer entrypoints, XDE/BREP traversal, triangulation utilities, exact-query logic, exact-model retention, and orientation analysis.
- Key files: `src/js-interface.cpp`, `src/importer.hpp`, `src/importer-xde.cpp`, `src/importer-utils.cpp`, `src/exact-query.cpp`, `src/exact-model-store.hpp`, `src/orientation.cpp`

**`packages/occt-core/`:**
- Purpose: Expose a package-first JS API over the root Wasm module.
- Contains: Runtime client logic, normalized result helpers, exact-ref resolution, and orientation application.
- Key files: `packages/occt-core/src/occt-core.js`, `packages/occt-core/src/model-normalizer.js`, `packages/occt-core/src/exact-model-normalizer.js`, `packages/occt-core/src/exact-ref-resolver.js`, `packages/occt-core/src/orientation.js`

**`packages/occt-babylon-loader/`:**
- Purpose: Adapt normalized OCCT models into Babylon SceneLoader-compatible resources.
- Contains: Format routing, Babylon loader integration, and scene building helpers.
- Key files: `packages/occt-babylon-loader/src/occt-file-loader.js`, `packages/occt-babylon-loader/src/occt-model-loader.js`, `packages/occt-babylon-loader/src/occt-scene-builder.js`

**`packages/occt-babylon-viewer/`:**
- Purpose: Provide reusable Babylon viewer runtime helpers on top of normalized model DTOs.
- Contains: Viewer controller, camera/grid/light/material helpers, line-pass rendering, and picking primitives.
- Key files: `packages/occt-babylon-viewer/src/occt-babylon-viewer.js`, `packages/occt-babylon-viewer/src/viewer-camera.js`, `packages/occt-babylon-viewer/src/viewer-grid.js`, `packages/occt-babylon-viewer/src/viewer-line-pass.js`, `packages/occt-babylon-viewer/src/viewer-pointer-click.js`

**`packages/occt-babylon-widgets/`:**
- Purpose: Ship optional viewer widgets without taking a React dependency.
- Contains: Canvas-driven view cube rendering, hit testing, and geometry/style helpers.
- Key files: `packages/occt-babylon-widgets/src/viewcube-widget.js`, `packages/occt-babylon-widgets/src/viewcube-geometry.js`, `packages/occt-babylon-widgets/src/viewcube-hit-test.js`

**`demo/src/`:**
- Purpose: Contain the shared browser/desktop viewer UI.
- Contains: React bootstrap, app shell, components, hooks, platform helpers, and Zustand state.
- Key files: `demo/src/main.jsx`, `demo/src/App.jsx`, `demo/src/store/viewerStore.js`, `demo/src/hooks/useOcct.js`, `demo/src/hooks/useViewer.js`, `demo/src/hooks/usePicking.js`

**`demo/src/components/`:**
- Purpose: Keep React view components and wrappers around package-layer viewer helpers.
- Contains: Viewer chrome, overlays, selection panels, tree drawer, toolbar, and the React wrapper for the view cube widget.
- Key files: `demo/src/components/Toolbar.jsx`, `demo/src/components/SelectionPanel.jsx`, `demo/src/components/ModelTreeDrawer.jsx`, `demo/src/components/DesktopChrome.jsx`, `demo/src/components/ViewCube.jsx`

**`demo/src/lib/`:**
- Purpose: Hold demo-only non-React helpers and platform shims.
- Contains: Babylon global bootstrap, desktop file/menu/runtime helpers, keyboard shortcut logic, sample-model resolution, and generic view-action mapping.
- Key files: `demo/src/lib/babylon-runtime.js`, `demo/src/lib/desktop-file.js`, `demo/src/lib/desktop-menu.js`, `demo/src/lib/desktop-runtime.js`, `demo/src/lib/viewer-actions.js`, `demo/src/lib/sample-model.js`

**`demo/src-tauri/`:**
- Purpose: Add the desktop shell around the shared `demo/` frontend.
- Contains: Rust bootstrap files, Tauri configs, capabilities, and bundle icons.
- Key files: `demo/src-tauri/src/main.rs`, `demo/src-tauri/src/lib.rs`, `demo/src-tauri/tauri.conf.json`, `demo/src-tauri/tauri.windows.conf.json`, `demo/src-tauri/Cargo.toml`

**`test/`:**
- Purpose: Verify the root Wasm carrier and release contract.
- Contains: Node-based runtime tests plus CAD fixtures and golden data used by those tests.
- Key files: `test/wasm_build_contract.test.mjs`, `test/release_governance_contract.test.mjs`, `test/exact_placement_contract.test.mjs`, `test/test_mvp_acceptance.mjs`, `test/load_occt_factory.test.mjs`

**`demo/tests/`:**
- Purpose: Verify the browser-facing viewer app and UI helpers.
- Contains: Playwright specs and helper-level browser tests.
- Key files: `demo/tests/demo.spec.mjs`, `demo/tests/use-occt-runtime-contract.test.mjs`, `demo/tests/auto-orient.test.mjs`, `demo/tests/viewer-store.test.mjs`

**`tools/`:**
- Purpose: House the supported build/setup entrypoints for the root Wasm runtime.
- Contains: Platform-specific build scripts and a prereq checker.
- Key files: `tools/build_wasm.sh`, `tools/build_wasm_win.bat`, `tools/build_wasm_win_dist.bat`, `tools/build_wasm_win_release.bat`, `tools/setup_emscripten_win.bat`, `tools/check_wasm_prereqs.mjs`

## Key File Locations

**Entry Points:**
- `package.json`: Root npm package entry and canonical build/test commands.
- `src/js-interface.cpp`: Embind surface exported from the Wasm module.
- `demo/src/main.jsx`: Shared web UI bootstrap.
- `demo/src-tauri/src/main.rs`: Desktop executable bootstrap.
- `packages/occt-core/src/index.js`: Public JS runtime adapter surface.
- `packages/occt-babylon-loader/src/index.js`: Public Babylon loader surface.
- `packages/occt-babylon-viewer/src/index.js`: Public Babylon viewer surface.
- `packages/occt-babylon-widgets/src/index.js`: Public widget surface.

**Configuration:**
- `CMakeLists.txt`: OCCT module selection and Emscripten target configuration.
- `demo/vite.config.js`: Demo dev/build config, local package aliasing, and test fixture serving.
- `demo/src-tauri/tauri.conf.json`: Desktop host config and root `dist/` resource packaging.
- `demo/src-tauri/tauri.windows.conf.json`: Windows custom-chrome override.
- `playwright.config.mjs`: Browser test runner config targeting `demo/tests/`.
- `demo/src-tauri/Cargo.toml`: Desktop Rust dependency and plugin config.

**Core Logic:**
- `src/importer-xde.cpp`: STEP/IGES document traversal and scene tree construction.
- `src/importer-brep.cpp`: BREP import, root splitting, and geometry binding alignment.
- `src/importer-utils.cpp`: Triangulation and topology extraction.
- `src/exact-query.cpp`: Exact geometry queries and relation/placement computations.
- `src/orientation.cpp`: Auto-orientation analysis.
- `packages/occt-core/src/occt-core.js`: JS runtime client over the Wasm module.
- `packages/occt-babylon-loader/src/occt-scene-builder.js`: Babylon mesh/tree construction from normalized model DTOs.
- `packages/occt-babylon-viewer/src/occt-babylon-viewer.js`: Viewer runtime controller.
- `demo/src/hooks/useOcct.js`: Runtime loading plus import/orientation orchestration in the app.
- `demo/src/hooks/useViewer.js`: Babylon engine/scene hookup and viewer feature wiring.

**Testing:**
- `test/`: Root runtime and release-governance tests with shared CAD fixtures.
- `demo/tests/`: Browser/demo tests driven by `playwright.config.mjs`.
- `packages/occt-core/test/`: Package adapter tests.
- `packages/occt-babylon-loader/test/`: Loader and scene-builder tests.
- `packages/occt-babylon-viewer/test/`: Viewer runtime helper tests.
- `packages/occt-babylon-widgets/test/`: Widget tests.

## Naming Conventions

**Files:**
- Native runtime files use lower-kebab names grouped by concern, for example `src/importer-brep.cpp`, `src/importer-xde.cpp`, `src/importer-utils.cpp`, and `src/exact-model-store.hpp`.
- Public JS package entrypoints are always `index.js`; supporting modules stay in lower-kebab form such as `packages/occt-babylon-viewer/src/viewer-line-pass.js`.
- React components use PascalCase `.jsx` filenames such as `demo/src/components/ViewCube.jsx` and `demo/src/components/DesktopChrome.jsx`.
- React hooks use the `use*.js` pattern such as `demo/src/hooks/useOcct.js` and `demo/src/hooks/useViewer.js`.
- Store modules use descriptive `*Store.js` names such as `demo/src/store/viewerStore.js`.

**Directories:**
- Top-level product surfaces are short lowercase nouns: `src/`, `demo/`, `packages/`, `test/`, `tools/`, `dist/`.
- Package directories use npm-style kebab names: `packages/occt-core/`, `packages/occt-babylon-loader/`, `packages/occt-babylon-viewer/`, `packages/occt-babylon-widgets/`.
- Demo subdirectories are role-based lowercase nouns: `demo/src/components/`, `demo/src/hooks/`, `demo/src/lib/`, `demo/src/store/`.

## Where to Add New Code

**New Feature:**
- Primary code: Put root runtime contract changes in `src/`. Put package-first JS behavior in the relevant `packages/<package>/src/` directory. Put end-user viewer behavior in `demo/src/`. Put desktop-only host behavior in `demo/src-tauri/`.
- Tests: Use `test/` for root Wasm/runtime contract changes, `packages/<package>/test/` for package behavior, and `demo/tests/` for browser or viewer interaction changes.

**New Component/Module:**
- Implementation: Add React UI in `demo/src/components/`, React orchestration in `demo/src/hooks/`, demo-only helpers in `demo/src/lib/`, and Rust/Tauri host changes in `demo/src-tauri/src/`.

**Utilities:**
- Shared helpers: Use `packages/occt-core/src/` for normalized runtime helpers, `packages/occt-babylon-viewer/src/` for Babylon viewer utilities, and `packages/occt-babylon-widgets/src/` for viewer widgets that must remain React-free.

## Special Directories

**`occt/`:**
- Purpose: Upstream OCCT source consumed by `CMakeLists.txt`.
- Generated: No
- Committed: Yes

**`dist/`:**
- Purpose: Root distributable runtime artifacts used by tests, local web development, and Tauri bundling.
- Generated: Mixed; `dist/occt-js.js` and `dist/occt-js.wasm` are build outputs, while `dist/occt-js.d.ts` is tracked.
- Committed: Mixed

**`build/wasm/`:**
- Purpose: Local CMake/Emscripten build workspace, including `build/wasm/emsdk` on Windows.
- Generated: Yes
- Committed: No

**`demo/src-tauri/`:**
- Purpose: Desktop host configuration, Rust bootstrap, capabilities, and bundle assets for the shared `demo/` frontend.
- Generated: No
- Committed: Yes

---

*Structure analysis: 2026-04-17*
