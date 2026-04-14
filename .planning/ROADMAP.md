# Roadmap: occt-js

## Overview

This roadmap treats the current repository as a real brownfield product with four maintained surfaces: the root Wasm runtime, Babylon package layers, the browser demo, and the additive Windows desktop shell. The goal of the next milestone is to harden those surfaces under GSD so future work can move faster without losing the existing release and architecture boundaries.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [ ] **Phase 1: Wasm Build & Dist Baseline** - Lock the reproducible Windows Wasm build path and canonical `dist/` artifact contract.
- [ ] **Phase 2: Root Runtime Contract** - Harden and verify the root import, root-mode, source-unit, and orientation API contract.
- [ ] **Phase 3: Core & Loader Package Contracts** - Tighten the public behavior and tests for `occt-core` and `occt-babylon-loader`.
- [ ] **Phase 4: Viewer Runtime & Widgets Contracts** - Stabilize the scene-first viewer runtime and framework-agnostic widget layer.
- [ ] **Phase 5: Browser Demo Stability** - Keep the web viewer app reliable as the primary interactive surface.
- [ ] **Phase 6: Desktop Additive Parity** - Preserve offline Windows desktop behavior without coupling root release flow to Tauri.
- [ ] **Phase 7: Release & Governance Flow** - Converge docs, verification expectations, and planning traceability across all surfaces.

## Phase Details

### Phase 1: Wasm Build & Dist Baseline
**Goal**: Lock reproducible Wasm artifact generation and the canonical `dist/` contract used by root tests, local web development, and desktop packaging.
**Depends on**: Nothing (first phase)
**Requirements**: [CORE-01]
**UI hint**: no
**Canonical refs**: README.md, AGENTS.md, tools/setup_emscripten_win.bat, tools/build_wasm_win.bat, tools/build_wasm_win_dist.bat, test/wasm_build_prereqs.test.mjs, test/load_occt_factory.test.mjs
**Success Criteria** (what must be TRUE):
  1. Maintainers can follow one documented clean-Windows build path centered on `build/wasm/emsdk` and `npm run build:wasm:win`.
  2. Missing submodule or toolchain prerequisites fail with actionable messaging and retained diagnostics.
  3. `dist/occt-js.js` and `dist/occt-js.wasm` remain the only canonical runtime artifacts consumed by root tests, local web development, and desktop packaging.
**Plans**: TBD

Plans:
- [ ] 01-01: Audit and tighten Windows setup/build scripts against the documented contract
- [ ] 01-02: Verify `dist/` preflight behavior and retained failure diagnostics
- [ ] 01-03: Reconcile root build docs with actual build/test entry points

### Phase 2: Root Runtime Contract
**Goal**: Harden the root Wasm import contract for supported CAD formats, root-shape modes, unit metadata, and orientation analysis.
**Depends on**: Phase 1
**Requirements**: [CORE-02, CORE-03, CORE-04]
**UI hint**: no
**Canonical refs**: src/js-interface.cpp, src/importer-xde.cpp, src/importer-brep.cpp, src/orientation.cpp, src/importer.hpp, test/test_multi_format_exports.mjs, test/test_step_iges_root_mode.mjs, test/test_brep_root_mode.mjs, test/test_optimal_orientation_api.mjs, test/test_optimal_orientation_reference.mjs
**Success Criteria** (what must be TRUE):
  1. Root JS APIs import STEP, IGES, and BREP through both direct and generic entry points and expose the canonical payload shape.
  2. Root-mode semantics are explicit and verified for supported formats, including realistic multi-root fixtures.
  3. Orientation analysis returns a transform and meaningful diagnostics for supported single-part inputs.
**Plans**: TBD

Plans:
- [ ] 02-01: Audit and tighten import/result-shape coverage for root APIs
- [ ] 02-02: Validate root-mode and source-unit behavior against existing fixtures
- [ ] 02-03: Validate optimal-orientation diagnostics and reference fixtures

### Phase 3: Core & Loader Package Contracts
**Goal**: Tighten the engine-agnostic import layer and Babylon scene-loader layer so downstream package consumers have one stable contract.
**Depends on**: Phase 2
**Requirements**: [PKG-01, PKG-02]
**UI hint**: no
**Canonical refs**: packages/occt-core/src/index.js, packages/occt-core/src/occt-core.js, packages/occt-core/src/model-normalizer.js, packages/occt-core/src/orientation.js, packages/occt-core/test/core.test.mjs, packages/occt-babylon-loader/src/index.js, packages/occt-babylon-loader/src/occt-model-loader.js, packages/occt-babylon-loader/src/occt-scene-builder.js, packages/occt-babylon-loader/test/format-routing.test.mjs, packages/occt-babylon-loader/test/occt-scene-builder.test.mjs
**Success Criteria** (what must be TRUE):
  1. `occt-core` remains the canonical engine-agnostic import/normalization layer for downstream JS consumers.
  2. `occt-babylon-loader` preserves supported file routing and Babylon resource construction without owning viewer runtime concerns.
  3. Package docs and tests describe the same public contract that package consumers actually use.
**Plans**: TBD

Plans:
- [ ] 03-01: Audit `occt-core` public API and normalization guarantees
- [ ] 03-02: Audit loader routing and scene-builder behavior
- [ ] 03-03: Reconcile package README examples with tested package behavior

### Phase 4: Viewer Runtime & Widgets Contracts
**Goal**: Stabilize the scene-first Babylon viewer runtime and non-React widget layer as reusable package surfaces.
**Depends on**: Phase 3
**Requirements**: [PKG-03, PKG-04]
**UI hint**: no
**Canonical refs**: packages/occt-babylon-viewer/src/occt-babylon-viewer.js, packages/occt-babylon-viewer/src/viewer-camera.js, packages/occt-babylon-viewer/src/viewer-grid.js, packages/occt-babylon-viewer/test/viewer.test.mjs, packages/occt-babylon-viewer/test/viewer-camera.test.mjs, packages/occt-babylon-viewer/test/viewer-grid.test.mjs, packages/occt-babylon-widgets/src/viewcube-widget.js, packages/occt-babylon-widgets/test/viewcube-widget.test.mjs
**Success Criteria** (what must be TRUE):
  1. Downstream Babylon apps can attach the viewer runtime to a caller-supplied `Scene` and control fit, projection, view, theme, grid, and axes through a stable API.
  2. Shared viewer helpers for picking, markers, and edge rendering remain package-level behavior rather than demo-only logic.
  3. Widgets remain attach/detach/dispose based and do not acquire a React dependency.
**Plans**: TBD

Plans:
- [ ] 04-01: Audit viewer runtime API surface and lifecycle guarantees
- [ ] 04-02: Audit shared viewer helper behavior and tests
- [ ] 04-03: Audit widget lifecycle and package-boundary enforcement

### Phase 5: Browser Demo Stability
**Goal**: Keep the web viewer app reliable as the primary interactive surface for importing and inspecting CAD files.
**Depends on**: Phase 4
**Requirements**: [APP-01]
**UI hint**: yes
**Canonical refs**: demo/src/App.jsx, demo/src/hooks/useOcct.js, demo/src/hooks/useViewer.js, demo/src/components/ViewCube.jsx, demo/tests/app-shell.test.mjs, demo/tests/demo.spec.mjs, demo/tests/sample-model.test.mjs, demo/tests/viewer-actions.test.mjs
**Success Criteria** (what must be TRUE):
  1. Browser users can open local CAD files and reach a working model view without desktop-only assumptions.
  2. Picking, stats, tree, camera controls, and viewer actions remain usable in the web app.
  3. The demo continues consuming shared package layers instead of reintroducing duplicated viewer/runtime logic.
**Plans**: TBD

Plans:
- [ ] 05-01: Audit browser import/runtime path for package-consumer correctness
- [ ] 05-02: Audit viewer interaction coverage and regressions in demo tests
- [ ] 05-03: Reconcile app-shell/docs with actual browser-first behavior

### Phase 6: Desktop Additive Parity
**Goal**: Preserve offline Windows desktop behavior while keeping the desktop shell additive to the browser demo and root release flow.
**Depends on**: Phase 5
**Requirements**: [APP-02, APP-03]
**UI hint**: yes
**Canonical refs**: demo/src-tauri/Cargo.toml, demo/src/hooks/useOcct.js, demo/src/lib/desktop-runtime.js, demo/tests/desktop-runtime.test.mjs, demo/tests/desktop-file.test.mjs, demo/tests/desktop-menu.test.mjs, demo/tests/desktop-shortcuts.test.mjs
**Success Criteria** (what must be TRUE):
  1. Desktop users can run the viewer offline with bundled Babylon and OCCT runtime resources.
  2. Desktop-specific runtime helpers remain isolated to desktop paths and do not leak into the browser contract.
  3. Root npm publishing remains independent of Tauri build success and desktop packaging concerns.
**Plans**: TBD

Plans:
- [ ] 06-01: Audit desktop runtime/resource loading path for offline correctness
- [ ] 06-02: Audit desktop-specific tests and shell behavior
- [ ] 06-03: Reconcile desktop docs with additive-boundary guarantees

### Phase 7: Release & Governance Flow
**Goal**: Converge repo docs, verification expectations, and GSD planning traceability across all maintained surfaces.
**Depends on**: Phase 6
**Requirements**: [DIST-01, DIST-02]
**UI hint**: no
**Canonical refs**: AGENTS.md, README.md, package.json, packages/occt-core/README.md, packages/occt-babylon-loader/README.md, packages/occt-babylon-viewer/README.md, packages/occt-babylon-widgets/README.md, .planning/PROJECT.md, .planning/REQUIREMENTS.md
**Success Criteria** (what must be TRUE):
  1. Maintainers can identify the correct verification command set for root runtime, packages, demo web, and desktop changes.
  2. Public docs and planning artifacts point to one authoritative contract per surface without contradictory guidance.
  3. Every active requirement remains traceable to exactly one roadmap phase for future GSD execution.
**Plans**: TBD

Plans:
- [ ] 07-01: Audit surface-specific verification expectations and release notes
- [ ] 07-02: Reconcile README, AGENTS, and package READMEs with active contracts
- [ ] 07-03: Keep planning traceability and workflow guidance aligned for future phases

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Wasm Build & Dist Baseline | 0/3 | Not started | - |
| 2. Root Runtime Contract | 0/3 | Not started | - |
| 3. Core & Loader Package Contracts | 0/3 | Not started | - |
| 4. Viewer Runtime & Widgets Contracts | 0/3 | Not started | - |
| 5. Browser Demo Stability | 0/3 | Not started | - |
| 6. Desktop Additive Parity | 0/3 | Not started | - |
| 7. Release & Governance Flow | 0/3 | Not started | - |
