# Requirements: occt-js

**Defined:** 2026-04-21
**Core Value:** Downstream applications can reliably consume the OCCT Wasm runtime and its root API contract without build drift or packaging surprises.

## v1 Requirements

### Demo Exact Bridge

- [ ] **DEMO-01**: Demo users can import a CAD model or load a generated shape and retain a managed exact model alongside the rendered scene until the model is replaced or explicitly cleared.
- [ ] **DEMO-02**: Demo users can select a rendered face, edge, or vertex and the app resolves that pick into an occurrence-safe `OcctExactRef` suitable for existing exact queries and measurement commands.

### Measurement Workflows

- [ ] **MEAS-01**: Demo users can run supported exact distance, angle, thickness, radius or diameter, edge-length, and face-area workflows from current selections and receive typed results or explicit unsupported feedback.
- [ ] **MEAS-02**: Demo users can inspect placement-backed measurement output for supported workflows through anchors, frames, or guide geometry rendered by the demo without changing the shipped root DTO contracts.
- [ ] **MEAS-03**: Demo users can clear, rerun, and compare measurements during one loaded-model session without stale retained-handle errors, orphaned overlay state, or invalid selection carryover.

### Docs & Verification

- [ ] **DOCS-05**: Demo and package docs explain the exact measurement workflow, supported selection-to-measure mappings, and exact-model lifecycle expectations.
- [ ] **E2E-01**: Automated demo verification covers load, select, measure, and reset or disposal behavior for the measurement MVP.
- [ ] **GOV-03**: Demo measurement integration remains a conditional secondary-surface verification lane and does not widen the authoritative `npm run test:release:root` gate.

## v2 Requirements

### Broader Discovery & UX

- **FEAT-06**: The demo or package layer can suggest measurement candidates or semantic feature picks automatically across the loaded model instead of relying on explicit user selections.
- **FEAT-07**: Downstream apps can reuse richer semantic measurement helpers such as counterbore, countersink, slot-width, or extended symmetry families once the current demo loop proves the integration boundary.
- **UX-03**: Downstream apps can persist, pin, export, or compare measurement sessions beyond the current in-memory MVP.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Whole-model measurement candidate discovery | `v1.10` is proving the manual selection-to-measure loop first |
| Full AIS/Prs3d-style dimension widgets, label layout, or annotation editing | The milestone needs a demo-owned MVP, not a full dimension authoring system |
| New broad root exact APIs without a demo-proven gap | The current kernel/package surface is already broad; integration risk is the immediate problem |
| Desktop or Tauri-specific measurement UX or packaging | The browser demo is the target validation surface for this milestone |
| Persistent measurement history, reporting, tolerance analysis, or collaboration workflows | Those are product features above the geometry/runtime layer |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DEMO-01 | Phase 33 | Planned |
| DEMO-02 | Phase 33 | Planned |
| MEAS-01 | Phase 34 | Planned |
| MEAS-02 | Phase 34 | Planned |
| MEAS-03 | Phase 34 | Planned |
| DOCS-05 | Phase 35 | Planned |
| E2E-01 | Phase 35 | Planned |
| GOV-03 | Phase 35 | Planned |

**Coverage:**
- v1 requirements: 8 total
- Mapped to phases: 8
- Unmapped: 0

---
*Requirements defined: 2026-04-21*
*Last updated: 2026-04-21 starting v1.10 Exact Measurement Demo Loop*
