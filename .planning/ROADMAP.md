# Roadmap: occt-js

## Milestones

- ✅ **v1.0 OCCT Wasm Runtime Hardening** - Phases 1-4 (shipped 2026-04-14)
- 🚧 **v1.1 Exact BRep Measurement Foundation** - Phases 5-8 (planned)

## Overview

This roadmap keeps `occt-js` centered on the runtime-first Wasm carrier. v1.0 shipped the reproducible `dist/` contract and downstream consumption boundary; v1.1 adds retained exact-model state, occurrence-scoped exact topology references, and wasm/core primitive measurement APIs without expanding into viewer UX or semantic feature recognition.

## Phases

**Phase Numbering:**
- Integer phases (5, 6, 7): Planned milestone work
- Decimal phases (5.1, 5.2): Urgent insertions (marked with INSERTED)

<details>
<summary>✅ v1.0 OCCT Wasm Runtime Hardening (Phases 1-4)</summary>

- [x] **Phase 1: Wasm Build & Dist Baseline** - Lock the reproducible Windows Wasm build path and canonical `dist/` artifact contract.
- [x] **Phase 2: Root Runtime Contract** - Harden and verify the root import, root-mode, source-unit, and orientation API contract.
- [x] **Phase 3: Downstream Consumption Contract** - Tighten vendored/package consumption behavior for `@tx-code/occt-js` and `@tx-code/occt-core`.
- [x] **Phase 4: Release & Governance Flow** - Converge docs, verification expectations, and planning traceability around the root Wasm carrier.

</details>

- [x] **Phase 5: Exact Model Lifecycle Contract** - Add a stateful exact-model lane with explicit retain/release semantics beside the existing stateless imports.
- [x] **Phase 6: Occurrence-Scoped Exact Ref Mapping** - Resolve exact face, edge, and vertex refs from current exported topology ids through an explicit mapping layer.
- [ ] **Phase 7: Primitive Exact Geometry Queries** - Expose geometry classification and single-entity exact measurements needed for app-side composition.
- [ ] **Phase 8: Pairwise Measurement Contract Hardening** - Ship pairwise exact measurements, JS-friendly adapters, and runtime-first contract hardening.

## Phase Details

<details>
<summary>✅ v1.0 OCCT Wasm Runtime Hardening (Phases 1-4)</summary>

### Phase 1: Wasm Build & Dist Baseline
**Goal**: Lock reproducible Wasm artifact generation and the canonical `dist/` contract used by root tests, local web development, and desktop packaging.
**Depends on**: Nothing (first phase)
**Requirements**: CORE-01
**Canonical refs**: README.md, AGENTS.md, tools/setup_emscripten_win.bat, tools/build_wasm_win.bat, tools/build_wasm_win_dist.bat, test/wasm_build_prereqs.test.mjs, test/load_occt_factory.test.mjs
**Success Criteria** (what must be TRUE):
  1. Maintainers can follow one documented clean-Windows build path centered on `build/wasm/emsdk` and `npm run build:wasm:win`.
  2. Missing submodule or toolchain prerequisites fail with actionable messaging and retained diagnostics.
  3. `dist/occt-js.js` and `dist/occt-js.wasm` remain the only canonical runtime artifacts consumed by root tests, local web development, and desktop packaging.
**Plans**: 3 plans

Plans:
- [x] 01-01-PLAN.md — Resolve the Windows script/CMake artifact-origin contract and retained-log behavior
- [x] 01-02-PLAN.md — Expand fast preflight coverage for prerequisites, missing `dist/` artifacts, and current `dist/` consumers
- [x] 01-03-PLAN.md — Reconcile README, AGENTS, and root npm commands around the finalized Windows baseline

### Phase 2: Root Runtime Contract
**Goal**: Harden the root Wasm import contract for supported CAD formats, root-shape modes, unit metadata, and orientation analysis.
**Depends on**: Phase 1
**Requirements**: CORE-02, CORE-03, CORE-04
**Canonical refs**: src/js-interface.cpp, src/importer-xde.cpp, src/importer-brep.cpp, src/orientation.cpp, src/importer.hpp, test/test_multi_format_exports.mjs, test/test_step_iges_root_mode.mjs, test/test_brep_root_mode.mjs, test/test_optimal_orientation_api.mjs, test/test_optimal_orientation_reference.mjs
**Success Criteria** (what must be TRUE):
  1. Root JS APIs import STEP, IGES, and BREP through both direct and generic entry points and expose the canonical payload shape.
  2. Root-mode semantics are explicit and verified for supported formats, including realistic multi-root fixtures.
  3. Orientation analysis returns a transform and meaningful diagnostics for supported single-part inputs.
**Plans**: 3 plans

Plans:
- [x] 02-01-PLAN.md — Tighten direct-vs-generic import payload parity for STEP, IGES, and BREP
- [x] 02-02-PLAN.md — Make root-mode and unit-metadata semantics explicit for XDE and BREP imports
- [x] 02-03-PLAN.md — Stabilize optimal-orientation diagnostics and golden-reference coverage

### Phase 3: Downstream Consumption Contract
**Goal**: Tighten the package and vendor-consumption contract so downstream applications can keep using `@tx-code/occt-js` and `@tx-code/occt-core` without depending on repo-local viewer layers.
**Depends on**: Phase 2
**Requirements**: CONS-01, CONS-02
**Canonical refs**: package.json, dist/occt-js.d.ts, packages/occt-core/src/index.js, packages/occt-core/src/occt-core.js, packages/occt-core/src/model-normalizer.js, packages/occt-core/src/orientation.js, packages/occt-core/test/core.test.mjs, README.md
**Success Criteria** (what must be TRUE):
  1. Downstream consumers can package and locate `@tx-code/occt-js` and `occt-js.wasm` reliably in vendored or tarballed workflows.
  2. `occt-core` remains the canonical engine-agnostic import/normalization layer on top of the root Wasm package.
  3. Root package changes do not force adoption of repo-local Babylon/demo layers.
**Plans**: 3 plans

Plans:
- [x] 03-01-PLAN.md — Audit `occt-js` packaged entrypoints and wasm-locate behavior
- [x] 03-02-PLAN.md — Audit `occt-core` public API and normalization guarantees
- [x] 03-03-PLAN.md — Reconcile packaging/docs with vendored downstream usage

### Phase 4: Release & Governance Flow
**Goal**: Converge repo docs, verification expectations, and planning traceability around the root Wasm carrier rather than secondary viewer/demo surfaces.
**Depends on**: Phase 3
**Requirements**: CONS-03, DIST-01, DIST-02
**Canonical refs**: AGENTS.md, README.md, package.json, packages/occt-core/README.md, .planning/PROJECT.md, .planning/REQUIREMENTS.md, test/release_governance_contract.test.mjs
**Success Criteria** (what must be TRUE):
  1. Maintainers can identify the correct verification command set for root runtime and downstream consumption changes, centered on `npm run test:release:root`.
  2. Public docs and planning artifacts point to the root Wasm carrier as the authoritative product contract.
  3. Every active requirement remains traceable to exactly one roadmap phase for future GSD execution, and governance drift is guarded by `test/release_governance_contract.test.mjs`.
**Plans**: 3 plans

Plans:
- [x] 04-01-PLAN.md — Establish the canonical `test:release:root` release gate and root governance contract test
- [x] 04-02-PLAN.md — Reconcile README, AGENTS, `occt-core`, and the release skill around the runtime-first release boundary
- [x] 04-03-PLAN.md — Synchronize `.planning` traceability and state with the finalized Phase 4 governance contract

</details>

### Phase 5: Exact Model Lifecycle Contract
**Goal**: Downstream JS can keep exact imported model state alive and release it explicitly without changing the current stateless import lane.
**Depends on**: Phase 4
**Requirements**: LIFE-01, LIFE-02
**UI hint**: no
**Canonical refs**: src/js-interface.cpp, src/importer.hpp, src/importer-utils.cpp, src/importer-xde.cpp, src/importer-brep.cpp, dist/occt-js.d.ts
**Success Criteria** (what must be TRUE):
  1. Downstream JS can import STEP, IGES, or BREP bytes through an exact-model lane and receive a handle that remains valid for later exact queries without re-importing the CAD bytes.
  2. Exact-model handles can be explicitly retained and released with deterministic invalid-after-release behavior and actionable failure semantics.
  3. Released handles and refs derived from them fail explicitly instead of silently returning stale exact data.
  4. Existing mesh-oriented import results and the runtime-first `Read*` contract continue to work for consumers that do not opt into exact measurement.
**Plans**: 2 plans

Plans:
- [x] 05-01-PLAN.md — Add the retained exact-model store and exact open/release root APIs
- [x] 05-02-PLAN.md — Lock lifecycle typings, failure DTOs, and root verification for invalid-after-release behavior

### Phase 6: Occurrence-Scoped Exact Ref Mapping
**Goal**: Downstream JS can resolve exact face, edge, and vertex refs from today’s exported topology ids while preserving exact-model identity and occurrence context.
**Depends on**: Phase 5
**Requirements**: REF-01, REF-02
**UI hint**: no
**Canonical refs**: packages/occt-core/src/index.js, packages/occt-core/src/occt-core.js, packages/occt-core/src/model-normalizer.js, E:/Coding/imos-app/apps/web/src/features/viewer/local-occt-model.ts, E:/Coding/SceneGraph.net/src/SceneGraph.OcctInterop/OcctShapeStore.cs
**Success Criteria** (what must be TRUE):
  1. Downstream JS can resolve exact face, edge, and vertex refs from `triangleToFaceMap`, `faces[].id`, `edges[].id`, and `vertices[].id` without introducing a second viewer-specific id system.
  2. Every exact ref includes exact-model identity plus enough occurrence context to distinguish reused geometry instances across repeated calls.
  3. The public boundary can keep current exported topology ids, but resolution flows through an explicit imported-topology-id -> exact-ref mapping layer internally.
  4. Invalid, stale, or occurrence-mismatched topology ids fail with explicit invalid-id or invalid-handle results instead of silently resolving to the wrong element.
**Plans**: 2 plans

Plans:
- [x] 06-01-PLAN.md — Add internal imported-topology-id mapping and occurrence-scoped exact-ref DTOs
- [x] 06-02-PLAN.md — Expose core-side ref resolution from normalized model data and repeated-call validation

### Phase 7: Primitive Exact Geometry Queries
**Goal**: Downstream JS can classify exact refs and retrieve exact single-entity primitives needed for app-side measurement composition.
**Depends on**: Phase 6
**Requirements**: REF-03, MEAS-03
**UI hint**: no
**Canonical refs**: src/js-interface.cpp, src/importer.hpp, dist/occt-js.d.ts, packages/occt-core/src/occt-core.js, E:/Coding/SceneGraph.net/src/SceneGraph.OcctInterop/OcctMeasurement.cs
**Success Criteria** (what must be TRUE):
  1. Downstream JS can classify supported exact edge and face refs into primitive geometry families such as line, circle, plane, cylinder, cone, or sphere.
  2. Downstream JS can measure exact edge length and face area from exact refs and receive unit-consistent numeric results.
  3. Downstream JS can query radius and center for supported analytic refs and receive anchor or axis data suitable for app-side annotation.
  4. Downstream JS can evaluate a face normal at a supplied query point and receives explicit unsupported-geometry failures when exact normal evaluation is not defined for the target.
**Plans**: 2 plans

Plans:
- [ ] 07-01-PLAN.md — Add geometry classification plus exact radius and center primitives
- [ ] 07-02-PLAN.md — Add exact edge length, face area, and face-normal evaluation contracts

### Phase 8: Pairwise Measurement Contract Hardening
**Goal**: Downstream JS can use wasm/core exact primitives end-to-end for pairwise measurements through typed adapters, structured DTOs, and runtime-first verification.
**Depends on**: Phase 7
**Requirements**: MEAS-01, MEAS-02, MEAS-04, MEAS-05, ADAPT-01, ADAPT-02
**UI hint**: no
**Canonical refs**: src/js-interface.cpp, dist/occt-js.d.ts, packages/occt-core/src/occt-core.js, packages/occt-core/test/live-root-integration.test.mjs, test/release_governance_contract.test.mjs, README.md, AGENTS.md
**Success Criteria** (what must be TRUE):
  1. Downstream JS can measure supported exact distance and angle pairs from occurrence-scoped refs and receive values plus attach points, directions, and working-plane data for app-side annotation.
  2. Downstream JS can measure supported exact thickness cases and receives explicit unsupported-geometry errors for non-parallel or otherwise unsupported scenarios instead of guessed mesh answers.
  3. Root wasm and `@tx-code/occt-core` expose JS-friendly adapters and structured success/failure DTOs for exact handles, refs, and measurement results, including explicit invalid-handle, invalid-id, and unsupported-geometry errors.
  4. Root typings, docs, and release verification cover the exact-measurement foundation while keeping selection UX, overlay rendering, and semantic feature recognition out of scope.
**Plans**: 3 plans

Plans:
- [ ] 08-01-PLAN.md — Add exact distance and angle primitives with overlay-ready attach geometry
- [ ] 08-02-PLAN.md — Add exact thickness plus structured measurement success and failure DTO hardening
- [ ] 08-03-PLAN.md — Finalize `occt-core` adapters, typings, docs, and root release verification

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Wasm Build & Dist Baseline | 3/3 | Complete | 2026-04-14 |
| 2. Root Runtime Contract | 3/3 | Complete | 2026-04-14 |
| 3. Downstream Consumption Contract | 3/3 | Complete | 2026-04-14 |
| 4. Release & Governance Flow | 3/3 | Complete | 2026-04-14 |
| 5. Exact Model Lifecycle Contract | 2/2 | Complete | 2026-04-14 |
| 6. Occurrence-Scoped Exact Ref Mapping | 2/2 | Complete | 2026-04-15 |
| 7. Primitive Exact Geometry Queries | 0/2 | Not started | - |
| 8. Pairwise Measurement Contract Hardening | 0/3 | Not started | - |
