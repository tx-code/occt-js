# Requirements: occt-js

**Defined:** 2026-04-18
**Core Value:** Downstream applications can reliably consume the OCCT Wasm runtime and its root API contract without build drift or packaging surprises.

## v1.7 Requirements

### Lifecycle Governance

- [x] **LIFE-01**: Downstream JS consumers get safer exact-model lifetime management, including JS-side disposal helpers and diagnostics for unreleased exact handles.
- [x] **LIFE-02**: Released, missing, or stale exact-model handles fail deterministically with typed failures across the root Wasm carrier and `@tx-code/occt-core`.

### Performance

- [x] **PERF-01**: Exact-query and retained-model access avoid avoidable per-call copies or redundant temp-file staging that penalize large-model workflows.
- [x] **PERF-02**: Large-model exact workflows have repeatable regression coverage or benchmarks that catch retained-store/query and import-staging regressions before release.

### Adapter Boundary

- [x] **ADAPT-10**: `@tx-code/occt-core` exposes lifecycle helpers and diagnostics without adding viewer-owned session state, implicit global disposal policy, or breaking existing exact helper APIs.

### Governance

- [ ] **DOCS-04**: Root and package docs explain exact-model lifetime, disposal expectations, and performance-sensitive usage patterns package-first through `@tx-code/occt-core`.
- [ ] **GOV-05**: Release verification and governance lock the lifecycle/performance contract without making demo, Babylon, or Tauri checks unconditional root-release blockers.

## Future Requirements

### Ecosystem & Secondary Surfaces

- **ECO-01**: Babylon package versions and peer ranges stay aligned so standalone package installs and tests do not depend on repo-local hoisting.
- **ECO-02**: Demo and Tauri verification have explicit, repeatable test/build commands whose scope remains downstream of the root npm release boundary.

### Deeper Semantics

- **FEAT-06**: Downstream apps can batch-discover measurement candidates or semantic feature suggestions without embedding kernel-specific heuristics in app code.
- **FEAT-07**: Package-owned helper layers can suggest additional semantic variants such as counterbore/countersink, pattern symmetry groups, or richer equal-constraint families after the base helper contract stabilizes.

## Out of Scope

| Feature | Reason |
|---------|--------|
| New helper families or whole-model semantic discovery | `v1.7` is for lifecycle/performance hardening of the shipped exact surface, not breadth expansion |
| Viewer-owned session state, overlays, or automatic app-wide disposal policy | Those remain downstream app concerns outside the runtime/package contract |
| GC-only cleanup as the authoritative lifetime guarantee | JS finalizers are best-effort only; explicit release and deterministic failures must remain the contract |
| Breaking existing exact placement, relation, helper, or pairwise DTO contracts | `v1.7` must stay additive for downstream consumers such as `imos-app` |
| Making demo, Babylon, or Tauri verification an unconditional part of `npm run test:release:root` | Secondary surfaces remain conditional even when lifecycle/performance docs or tests are updated |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| LIFE-01 | Phase 24 | Complete (2026-04-20) |
| LIFE-02 | Phase 24 | Complete (2026-04-20) |
| PERF-01 | Phase 25 | Complete (2026-04-20) |
| PERF-02 | Phase 25 | Complete (2026-04-20) |
| ADAPT-10 | Phase 24 | Complete (2026-04-20) |
| DOCS-04 | Phase 26 | Pending |
| GOV-05 | Phase 26 | Pending |

**Coverage:**
- v1.7 requirements: 7 total
- Mapped to phases: 7
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-18*
*Last updated: 2026-04-20 after Phase 25 completion*
