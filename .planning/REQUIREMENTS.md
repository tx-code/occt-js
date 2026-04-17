# Requirements: occt-js

**Defined:** 2026-04-17
**Core Value:** Downstream applications can reliably consume the OCCT Wasm runtime and its root API contract without build drift or packaging surprises.

## v1.5 Requirements

### Runtime Path Contract

- [x] **PATH-01**: Root preflight verifies the same concrete local `dist/occt-js.js` and `dist/occt-js.wasm` paths used by the shipped demo dev runtime instead of stale directory-base assumptions.
- [x] **PATH-02**: `npm run test:wasm:preflight` passes against the shipped runtime-loading contract while still guarding the canonical `dist/` artifact boundary.

### Release Governance

- [ ] **GOV-02**: `npm run test:release:root` enforces the published runtime/package/docs contract without hardcoding archived milestone filenames, shipped dates, or `.planning/STATE.md` strings unrelated to the npm release surface.
- [ ] **GOV-03**: Planning/archive audits, if retained, run outside the authoritative root release gate so repository process drift does not block runtime releases.
- [ ] **DOCS-02**: Root release guidance in `README.md`, `AGENTS.md`, and related package docs stays aligned with the updated runtime-first gate and any relocated planning audit path.

### Secondary-Surface Verification

- [ ] **SURF-01**: Demo and secondary package verification commands are discoverable from the relevant package manifests or top-level docs instead of hidden in ad-hoc maintainer knowledge.
- [ ] **SURF-02**: `packages/occt-babylon-loader` can run its test surface without depending on undeclared hoisted Babylon dependencies.
- [ ] **SURF-03**: Secondary-surface checks remain explicitly conditional to changes under `demo/`, `demo/src-tauri/`, or Babylon package surfaces and do not become unconditional root npm release prerequisites.

## Future Requirements

The follow-on sequence after `v1.5` is currently planned as:
`v1.6 Exact Semantics Helpers` → `v1.7 Exact Lifecycle & Performance` → `v1.8 Package Ecosystem & Secondary Surfaces`.

### Exact Semantics Helpers

- **FEAT-03**: `@tx-code/occt-core` can derive package-first hole and chamfer helper semantics from the shipped exact primitives without moving viewer policy into the runtime.
- **FEAT-04**: Downstream JS code can request equal-distance, symmetry, midpoint, or similar reusable helper semantics on top of the shipped placement/relation primitives.

### Lifecycle & Performance

- **LIFE-01**: Downstream JS consumers get safer exact-model lifetime management, including JS-side disposal helpers and diagnostics for unreleased exact handles.
- **PERF-01**: Exact-query and retained-model access avoid avoidable per-call copies or redundant temp-file staging that penalize large-model workflows.

### Ecosystem & Secondary Surfaces

- **ECO-01**: Babylon package versions and peer ranges stay aligned so standalone package installs and tests do not depend on repo-local hoisting.
- **ECO-02**: Demo and Tauri verification have explicit, repeatable test/build commands whose scope remains downstream of the root npm release boundary.

## Out of Scope

| Feature | Reason |
|---------|--------|
| New exact measurement semantics such as hole, chamfer, symmetry, or equal-distance helpers | Those belong to the planned `v1.6 Exact Semantics Helpers` milestone, not release hardening |
| Viewer UX work such as selection sessions, overlay rendering, labels, or widgets | The repo remains runtime-first and package-first; app-owned interaction flows stay downstream |
| Tauri-first packaging or desktop feature expansion | `v1.5` is about root release hardening and secondary-surface verification contracts, not desktop product work |
| Breaking existing root or `@tx-code/occt-core` API contracts | The milestone is corrective and governance-focused; downstream consumers must remain source-compatible |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| PATH-01 | Phase 18 | Complete |
| PATH-02 | Phase 18 | Complete |
| GOV-02 | Phase 19 | Pending |
| GOV-03 | Phase 19 | Pending |
| DOCS-02 | Phase 19 | Pending |
| SURF-01 | Phase 20 | Pending |
| SURF-02 | Phase 20 | Pending |
| SURF-03 | Phase 20 | Pending |

**Coverage:**
- v1.5 requirements: 8 total
- Mapped to phases: 8
- Unmapped: 0

---
*Requirements defined: 2026-04-17*
*Last updated: 2026-04-17 after Phase 18 Runtime Path Contract Alignment*
