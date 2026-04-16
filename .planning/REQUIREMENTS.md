# Requirements: occt-js

**Defined:** 2026-04-16
**Core Value:** Downstream applications can reliably consume the OCCT Wasm runtime and its root API contract without build drift or packaging surprises.

## v1.4 Requirements

### Placement Contract

- [x] **PLCT-01**: Downstream JS code can request exact distance placement from two exact refs and receive stable occurrence-space anchors plus a full working-plane frame.
- [x] **PLCT-02**: Downstream JS code can request exact angle placement from exact refs and receive stable origin, attachment directions, anchors, and working-plane frame data.
- [x] **PLCT-03**: Downstream JS code can request exact radius and diameter placement from circular exact geometry and receive stable center, anchor, axis, and frame data.
- [x] **PLCT-04**: Downstream JS code can request exact thickness placement from compatible exact refs and receive stable occurrence-space anchors plus working-plane frame data.

### Relation Contract

- [ ] **REL-01**: Downstream JS code can classify parallel or perpendicular relations between compatible exact refs and receive supporting geometry needed for presentation.
- [ ] **REL-02**: Downstream JS code can classify concentric or tangent relations between compatible exact refs and receive supporting geometry needed for presentation.
- [ ] **REL-03**: The relation classifier returns explicit `none` for valid non-related refs and uses shared typed failures for invalid or unsupported cases.

### Adapter & SDK

- [x] **ADAPT-07**: `@tx-code/occt-core` exposes package-first placement helpers that preserve occurrence transforms and normalize root placement DTOs without hiding the runtime contract.
- [ ] **ADAPT-08**: `@tx-code/occt-core` exposes package-first relation classification that preserves occurrence transforms and normalizes supporting geometry DTOs without hiding the runtime contract.
- [ ] **DOCS-01**: Package-first SDK docs show placement and relation workflows through `@tx-code/occt-core`, with root Wasm documented as the lower-level reference surface.
- [ ] **GOV-01**: Root typings, tarball checks, and release verification lock the exact placement and relation SDK contract on the authoritative runtime-first release gate.

## Future Requirements

### Feature Semantics

- **FEAT-01**: Downstream apps can derive hole, chamfer, or similar measurement semantics from the shipped placement and relation primitives.
- **FEAT-02**: Downstream JS code can request richer relation or presentation suggestions such as equal distance, equal radius, midpoint, or symmetry helpers.

### App Integration

- **UX-05**: Downstream apps can run measurement selection, preview, and pin workflows on top of package-owned helpers without reimplementing ref resolution.
- **UX-06**: Downstream apps can render reusable measurement overlays or widgets directly from package-owned viewer helpers.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Overlay rendering, label layout, or measurement widgets | This milestone stays at geometry-support DTOs and SDK contract boundaries, not viewer presentation |
| Selection sessions, hover, preview, or pin workflows | Those are app-owned measurement UX flows above wasm/core |
| Hole, chamfer, or feature-recognition semantics | The base placement and relation contract needs to stabilize first |
| Breaking or reshaping existing `MeasureExact*` result contracts | `v1.4` is additive and must preserve current downstream consumers |
| Babylon- or Tauri-specific measurement UI abstractions | The milestone remains runtime-first and package-first, not demo- or desktop-first |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| PLCT-01 | Phase 15 | Completed |
| PLCT-02 | Phase 15 | Completed |
| PLCT-03 | Phase 15 | Completed |
| PLCT-04 | Phase 15 | Completed |
| ADAPT-07 | Phase 15 | Completed |
| REL-01 | Phase 16 | Pending |
| REL-02 | Phase 16 | Pending |
| REL-03 | Phase 16 | Pending |
| ADAPT-08 | Phase 16 | Pending |
| DOCS-01 | Phase 17 | Pending |
| GOV-01 | Phase 17 | Pending |

**Coverage:**
- v1.4 requirements: 11 total
- Mapped to phases: 11
- Unmapped: 0

---
*Requirements defined: 2026-04-16*
*Last updated: 2026-04-16 after completing Phase 15 placement contract hardening*
