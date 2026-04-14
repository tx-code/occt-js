# Roadmap: occt-js

## Overview

This roadmap treats the root Wasm package as the strategic product surface and everything else as secondary context. The goal of the next milestone is to harden `@tx-code/occt-js` as a reproducible, vendor-friendly OCCT Wasm carrier with a stable root API and `dist/` contract for downstream consumers such as `imos-app`.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [ ] **Phase 1: Wasm Build & Dist Baseline** - Lock the reproducible Windows Wasm build path and canonical `dist/` artifact contract.
- [ ] **Phase 2: Root Runtime Contract** - Harden and verify the root import, root-mode, source-unit, and orientation API contract.
- [ ] **Phase 3: Downstream Consumption Contract** - Tighten vendored/package consumption behavior for `@tx-code/occt-js` and `@tx-code/occt-core`.
- [ ] **Phase 4: Release & Governance Flow** - Converge docs, verification expectations, and planning traceability around the root Wasm carrier.

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

### Phase 3: Downstream Consumption Contract
**Goal**: Tighten the package and vendor-consumption contract so downstream applications can keep using `@tx-code/occt-js` and `@tx-code/occt-core` without depending on repo-local viewer layers.
**Depends on**: Phase 2
**Requirements**: [CONS-01, CONS-02]
**UI hint**: no
**Canonical refs**: package.json, dist/occt-js.d.ts, packages/occt-core/src/index.js, packages/occt-core/src/occt-core.js, packages/occt-core/src/model-normalizer.js, packages/occt-core/src/orientation.js, packages/occt-core/test/core.test.mjs, README.md
**Success Criteria** (what must be TRUE):
  1. Downstream consumers can package and locate `@tx-code/occt-js` and `occt-js.wasm` reliably in vendored or tarballed workflows.
  2. `occt-core` remains the canonical engine-agnostic import/normalization layer on top of the root Wasm package.
  3. Root package changes do not force adoption of repo-local Babylon/demo layers.
**Plans**: TBD

Plans:
- [ ] 03-01: Audit `occt-js` packaged entrypoints and wasm-locate behavior
- [ ] 03-02: Audit `occt-core` public API and normalization guarantees
- [ ] 03-03: Reconcile packaging/docs with vendored downstream usage
### Phase 4: Release & Governance Flow
**Goal**: Converge repo docs, verification expectations, and planning traceability around the root Wasm carrier rather than secondary viewer/demo surfaces.
**Depends on**: Phase 3
**Requirements**: [CONS-03, DIST-01, DIST-02]
**UI hint**: no
**Canonical refs**: AGENTS.md, README.md, package.json, packages/occt-core/README.md, .planning/PROJECT.md, .planning/REQUIREMENTS.md
**Success Criteria** (what must be TRUE):
  1. Maintainers can identify the correct verification command set for root runtime and downstream consumption changes.
  2. Public docs and planning artifacts point to the root Wasm carrier as the authoritative product contract.
  3. Every active requirement remains traceable to exactly one roadmap phase for future GSD execution.
**Plans**: TBD

Plans:
- [ ] 04-01: Audit runtime-focused verification expectations and release notes
- [ ] 04-02: Reconcile README, AGENTS, and `occt-core` docs with the runtime-first contract
- [ ] 04-03: Keep planning traceability and workflow guidance aligned for future phases

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Wasm Build & Dist Baseline | 0/3 | Not started | - |
| 2. Root Runtime Contract | 0/3 | Not started | - |
| 3. Downstream Consumption Contract | 0/3 | Not started | - |
| 4. Release & Governance Flow | 0/3 | Not started | - |
