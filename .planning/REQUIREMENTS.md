# Requirements: occt-js

**Defined:** 2026-04-14
**Core Value:** Downstream applications can reliably consume the OCCT Wasm runtime and its root API contract without build drift or packaging surprises.

## v1 Requirements

### Root Runtime

- [x] **CORE-01**: Maintainer can rebuild `dist/occt-js.js` and `dist/occt-js.wasm` from a clean Windows worktree using the documented `build/wasm/emsdk` toolchain path.
- [x] **CORE-02**: Downstream JS code can import STEP, IGES, or BREP bytes through the root package APIs and receive the canonical structured scene payload with `sourceFormat`, `rootNodes`, `geometries`, `materials`, `warnings`, `stats`, `sourceUnit`, and `unitScaleToMeters` when available.
- [x] **CORE-03**: Downstream JS code can choose explicit root-shape behavior for supported formats and get predictable `one-shape` / `multiple-shapes` semantics across STEP, IGES, and BREP.
- [x] **CORE-04**: Downstream JS code can request manufacturing-oriented optimal orientation analysis for single-part STEP, IGES, and BREP inputs and receive transform plus diagnostics.

### Consumption Contract

- [x] **CONS-01**: Downstream code can consume `@tx-code/occt-js` as a packaged Wasm carrier and locate `occt-js.wasm` reliably in bundler and vendored-package workflows.
- [x] **CONS-02**: Downstream code can use `@tx-code/occt-core` as the engine-agnostic OCCT adapter and model normalizer on top of the root Wasm package.
- [x] **CONS-03**: Root package changes do not require downstream consumers to adopt repo-local Babylon/demo layers in order to keep working.

### Distribution & Governance

- [x] **DIST-01**: Maintainer can identify and run the correct verification commands for the root runtime and its consumption contract before release work lands.
- [x] **DIST-02**: Public docs and planning artifacts identify the root Wasm carrier as the authoritative product surface, with secondary surfaces clearly marked as non-core.

## v2 Requirements

### Automation

- **AUTO-01**: Maintainer can run CI that rebuilds Wasm and verifies root, package, demo, and desktop contracts automatically.
- **AUTO-02**: Maintainer can publish coordinated version updates across the root package and Babylon package modules from a scripted release flow.

### Product Extension

- **EXT-01**: Downstream apps can consume richer CAD analytics beyond the current orientation heuristics.
- **EXT-02**: Secondary Babylon/demo layers can evolve without becoming mandatory dependencies of the root Wasm package.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Requiring Babylon/demo package adoption for root runtime consumers | Downstream consumers such as `imos-app` mainly need the Wasm/runtime surface |
| Expanding root runtime to non-OCCT mesh exchange formats in this milestone | Current milestone is about hardening existing STEP/IGES/BREP runtime surfaces |
| Making Tauri build success a prerequisite for root npm publishing | Root release must stay independent of desktop packaging |
| Promoting viewer/demo concerns to the main release gate | These are secondary surfaces, not the strategic product boundary |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| CORE-01 | Phase 1 | Completed |
| CORE-02 | Phase 2 | Completed |
| CORE-03 | Phase 2 | Completed |
| CORE-04 | Phase 2 | Completed |
| CONS-01 | Phase 3 | Completed |
| CONS-02 | Phase 3 | Completed |
| CONS-03 | Phase 4 | Completed |
| DIST-01 | Phase 4 | Completed |
| DIST-02 | Phase 4 | Completed |

**Coverage:**
- v1 requirements: 9 total
- Mapped to phases: 9
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-14*
*Last updated: 2026-04-14 after Phase 04 governance alignment*
