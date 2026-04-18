# Requirements: occt-js

**Defined:** 2026-04-18
**Core Value:** Downstream applications can reliably consume the OCCT Wasm runtime and its root API contract without build drift or packaging surprises.

## v1.6 Requirements

### Feature Semantics

- [ ] **FEAT-03**: Downstream JS can request package-first hole helper semantics from exact refs and receive stable typed outputs for supported hole cases.
- [ ] **FEAT-04**: Downstream JS can request package-first chamfer helper semantics from exact refs and receive stable typed outputs for supported chamfer cases.
- [ ] **FEAT-05**: Downstream JS can request equal-distance, symmetry, midpoint, or similar reusable helper semantics on top of the shipped placement and relation primitives.

### Adapter Boundary

- [ ] **ADAPT-09**: `@tx-code/occt-core` helper APIs preserve occurrence transforms, supporting geometry DTOs, and typed failures without adding viewer session state or app-owned policy.

### SDK Governance

- [ ] **DOCS-03**: Package-first SDK docs show exact helper workflows through `@tx-code/occt-core`, with the root Wasm carrier kept as the lower-level reference surface.
- [ ] **GOV-04**: Public typings, packaged entrypoints, and release verification lock the exact semantics helper surface without adding unconditional demo, Babylon, or Tauri release blockers.

## Future Requirements

### Lifecycle & Performance

- **LIFE-01**: Downstream JS consumers get safer exact-model lifetime management, including JS-side disposal helpers and diagnostics for unreleased exact handles.
- **PERF-01**: Exact-query and retained-model access avoid avoidable per-call copies or redundant temp-file staging that penalize large-model workflows.

### Ecosystem & Secondary Surfaces

- **ECO-01**: Babylon package versions and peer ranges stay aligned so standalone package installs and tests do not depend on repo-local hoisting.
- **ECO-02**: Demo and Tauri verification have explicit, repeatable test/build commands whose scope remains downstream of the root npm release boundary.

### Deeper Semantics

- **FEAT-06**: Downstream apps can batch-discover measurement candidates or semantic feature suggestions without embedding kernel-specific heuristics in app code.
- **FEAT-07**: Package-owned helper layers can suggest additional semantic variants such as counterbore/countersink, pattern symmetry groups, or richer equal-constraint families after the base helper contract stabilizes.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Viewer measurement session state, candidate picking workflows, overlays, or labels | Those remain downstream app concerns and are not part of the runtime or package helper contract |
| Whole-model feature recognition or batch semantic indexing | Too broad for `v1.6`; the milestone stays on additive helper APIs over caller-selected exact refs |
| Breaking existing exact placement, relation, or pairwise DTO contracts | `v1.6` must remain additive for downstream consumers such as `imos-app` |
| Making demo, Babylon, or Tauri verification an unconditional part of `npm run test:release:root` | Secondary surfaces remain conditional even when helper examples or docs are updated |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| FEAT-03 | TBD | Pending |
| FEAT-04 | TBD | Pending |
| FEAT-05 | TBD | Pending |
| ADAPT-09 | TBD | Pending |
| DOCS-03 | TBD | Pending |
| GOV-04 | TBD | Pending |

**Coverage:**
- v1.6 requirements: 6 total
- Mapped to phases: 0
- Unmapped: 6

---
*Requirements defined: 2026-04-18*
*Last updated: 2026-04-18 after initial v1.6 requirement definition*
