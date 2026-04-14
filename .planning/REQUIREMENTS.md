# Requirements: occt-js

**Defined:** 2026-04-14
**Core Value:** Downstream developers can reliably import real CAD files and reuse the same viewer/runtime stack without breaking the root Wasm release contract.

## v1 Requirements

### Root Runtime

- [ ] **CORE-01**: Maintainer can rebuild `dist/occt-js.js` and `dist/occt-js.wasm` from a clean Windows worktree using the documented `build/wasm/emsdk` toolchain path.
- [ ] **CORE-02**: Downstream JS code can import STEP, IGES, or BREP bytes through the root package APIs and receive the canonical structured scene payload with `sourceFormat`, `rootNodes`, `geometries`, `materials`, `warnings`, `stats`, `sourceUnit`, and `unitScaleToMeters` when available.
- [ ] **CORE-03**: Downstream JS code can choose explicit root-shape behavior for supported formats and get predictable `one-shape` / `multiple-shapes` semantics across STEP, IGES, and BREP.
- [ ] **CORE-04**: Downstream JS code can request manufacturing-oriented optimal orientation analysis for single-part STEP, IGES, and BREP inputs and receive transform plus diagnostics.

### Package Surfaces

- [ ] **PKG-01**: Downstream JS code can use `@tx-code/occt-core` as the engine-agnostic OCCT adapter and model normalizer.
- [ ] **PKG-02**: Downstream Babylon code can use `@tx-code/occt-babylon-loader` to route supported file types and build Babylon scene resources from normalized OCCT model data.
- [ ] **PKG-03**: Downstream Babylon code can attach `@tx-code/occt-babylon-viewer` to a caller-supplied `Scene` and control fit, projection, view orientation, theme, grid, and axes through a stable runtime API.
- [ ] **PKG-04**: Downstream apps can use `@tx-code/occt-babylon-widgets` viewer widgets, including ViewCube, without a React dependency.

### App Surfaces

- [ ] **APP-01**: Browser users can load local CAD files in the demo and inspect the model through picking, stats, tree, and viewer controls.
- [ ] **APP-02**: Desktop users can run the same demo UI inside the Tauri shell, import local CAD files offline, and use desktop-specific runtime helpers without breaking web behavior.
- [ ] **APP-03**: Demo and desktop build/test flows remain additive and do not become prerequisites for publishing the root npm package.

### Distribution & Governance

- [ ] **DIST-01**: Maintainer can identify and run the correct verification commands for root runtime, packages, demo web, and desktop surfaces before release work lands.
- [ ] **DIST-02**: Public docs and planning artifacts identify one authoritative contract per surface so future work can be traced back to explicit requirements and phases.

## v2 Requirements

### Automation

- **AUTO-01**: Maintainer can run CI that rebuilds Wasm and verifies root, package, demo, and desktop contracts automatically.
- **AUTO-02**: Maintainer can publish coordinated version updates across the root package and Babylon package modules from a scripted release flow.

### Product Extension

- **EXT-01**: Downstream apps can consume richer CAD analytics beyond the current orientation heuristics.
- **EXT-02**: Desktop shell can add native integrations such as system file dialogs, menus, and installer polish without changing the web-first architecture.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Desktop-only UX replacing the browser demo | Violates the additive desktop boundary already established in repo docs |
| Mandatory React dependency in shared viewer widgets | Conflicts with the package contract for framework-agnostic widgets |
| Expanding root runtime to non-OCCT mesh exchange formats in this milestone | Current milestone is about hardening existing STEP/IGES/BREP surfaces |
| Making Tauri build success a prerequisite for root npm publishing | Root release must stay independent of desktop packaging |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| CORE-01 | Phase 1 | Pending |
| CORE-02 | Phase 2 | Pending |
| CORE-03 | Phase 2 | Pending |
| CORE-04 | Phase 2 | Pending |
| PKG-01 | Phase 3 | Pending |
| PKG-02 | Phase 3 | Pending |
| PKG-03 | Phase 4 | Pending |
| PKG-04 | Phase 4 | Pending |
| APP-01 | Phase 5 | Pending |
| APP-02 | Phase 6 | Pending |
| APP-03 | Phase 6 | Pending |
| DIST-01 | Phase 7 | Pending |
| DIST-02 | Phase 7 | Pending |

**Coverage:**
- v1 requirements: 13 total
- Mapped to phases: 13
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-14*
*Last updated: 2026-04-14 after initial definition*
