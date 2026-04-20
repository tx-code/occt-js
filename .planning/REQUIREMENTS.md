# Requirements: occt-js

**Defined:** 2026-04-20
**Core Value:** Downstream applications can reliably consume the OCCT Wasm runtime and its root API contract without build drift or packaging surprises.

## v1 Requirements

### Tool Spec

- [ ] **TOOL-01**: Downstream JS code can submit an app-neutral revolved tool spec defined by axis, profile start point, profile segments, and closure mode to the root Wasm runtime.
- [ ] **TOOL-02**: Downstream JS code can describe revolved tool profiles with line segments, circular arcs, unit normalization, and full or partial revolve without depending on app-specific tool-library schemas.
- [ ] **TOOL-03**: Downstream JS code receives typed validation diagnostics for malformed specs such as unsupported units, negative radii, invalid arcs, non-closed profiles, or revolve build failures.

### Generated Geometry

- [ ] **GEOM-01**: Downstream JS code can build a generated revolved tool model that returns structured scene data compatible with existing `rootNodes`, `geometries`, `materials`, and stats consumers.
- [ ] **GEOM-02**: Downstream JS code receives deterministic default appearance or material grouping for generated tool surfaces without supplying colors explicitly.
- [ ] **GEOM-03**: Downstream JS code can open a generated revolved tool as a retained exact model and reuse the existing exact query surface against it.

### Binding Semantics

- [ ] **MAP-01**: Downstream JS code receives stable segment-to-face bindings keyed by segment index and optional segment id or tag instead of relying on emitted face order alone.
- [ ] **MAP-02**: Downstream JS code can distinguish profile faces from closure, axis, cap, or degenerated surfaces through explicit system roles in the generated result.

### SDK & Governance

- [ ] **SDK-01**: Downstream JS code can use `@tx-code/occt-core` wrappers and typings for revolved tool validation, build, and exact-open flows without calling raw Wasm bindings directly.
- [ ] **GOV-01**: The revolved tool contract is documented, typed, packaged, and enforced by contract coverage plus the authoritative root release gate without widening unconditional secondary-surface checks.

## v2 Requirements

### Geometry Expansion

- **GEOM-04**: Downstream JS code can define revolved tool profiles with spline or NURBS segments.
- **GEOM-05**: Downstream JS code can add non-axisymmetric tool features such as flutes, gashes, or wrench flats on top of the revolved base body.

### Integration Surfaces

- **INTG-01**: Downstream JS code can use built-in adapters for common third-party tool-definition schemas.
- **INTG-02**: Downstream JS code can override generated default appearance with caller-supplied semantic styles.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Built-in parsing of app-specific tool-library formats | The root runtime should stay on one normalized geometry contract instead of owning external schema churn |
| Non-axisymmetric flute or chipbreaker solids | This milestone is limited to axisymmetric revolved tools |
| Tool library management, feeds, speeds, and machine metadata | Those belong to app-side CAM workflows above geometry generation |
| Viewer-owned selection, overlays, and editing UX for generated tools | Runtime and package layers should stop at geometry and exact-model contracts |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| TOOL-01 | Phase 27 | Pending |
| TOOL-02 | Phase 27 | Pending |
| TOOL-03 | Phase 27 | Pending |
| GEOM-01 | Phase 27 | Pending |
| GEOM-02 | Phase 28 | Pending |
| GEOM-03 | Phase 28 | Pending |
| MAP-01 | Phase 28 | Pending |
| MAP-02 | Phase 28 | Pending |
| SDK-01 | Phase 29 | Pending |
| GOV-01 | Phase 29 | Pending |

**Coverage:**
- v1 requirements: 10 total
- Mapped to phases: 10
- Unmapped: 0

---
*Requirements defined: 2026-04-20*
*Last updated: 2026-04-20 after initial definition*
