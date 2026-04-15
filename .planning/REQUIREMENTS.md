# Requirements: occt-js

**Defined:** 2026-04-14
**Core Value:** Downstream applications can reliably consume the OCCT Wasm runtime and its root API contract without build drift or packaging surprises.

## v1.1 Requirements

### Exact Model Lifecycle

- [x] **LIFE-01**: Downstream JS code can import STEP, IGES, or BREP bytes and keep an exact-model handle alive after import so later measurement calls do not depend on mesh-only output.
- [x] **LIFE-02**: Downstream JS code can explicitly retain and release exact-model handles with predictable lifetime behavior and actionable failure semantics.

### Exact Topology References

- [x] **REF-01**: Downstream JS code can address exact face, edge, and vertex elements through a stable reference shape that includes exact-model identity and enough occurrence context for repeated measurement calls.
- [x] **REF-02**: Downstream JS code can resolve exact face, edge, and vertex references from the ids already exported in the current mesh/topology payload through an explicit imported-topology-id mapping layer instead of introducing a second viewer-specific id system.
- [x] **REF-03**: Downstream JS code can classify exact topology references into primitive geometry families such as line, circle, plane, cylinder, cone, or sphere so app-side measurement semantics can compose on top.

### Primitive Exact Measurements

- [ ] **MEAS-01**: Downstream JS code can measure exact distance between supported topology-reference pairs and receive both the numeric result and attach points needed for app-side annotation.
- [ ] **MEAS-02**: Downstream JS code can measure exact angle between supported topology-reference pairs and receive the angle plus origin and direction vectors needed for app-side annotation.
- [x] **MEAS-03**: Downstream JS code can measure single-entity primitives including radius, center, edge length, face area, and evaluated face normal using exact topology references.
- [ ] **MEAS-04**: Downstream JS code can measure exact thickness for supported parallel-wall scenarios and receive both the numeric result and attach points needed for app-side annotation.
- [ ] **MEAS-05**: Downstream JS code receives structured exact-measurement success and failure DTOs with overlay-ready anchors and explicit invalid-handle, invalid-id, and unsupported-geometry errors.

### Downstream Adapter & Release Contract

- [ ] **ADAPT-01**: `@tx-code/occt-core` can expose JS-friendly adapters and DTOs for exact-model handles, topology references, and primitive measurement results without hiding the root Wasm contract.
- [ ] **ADAPT-02**: Root docs, package typings, and release verification cover the exact-measurement foundation while keeping app-level selection UX, overlays, and semantic feature recognition explicitly out of scope.

## Future Requirements

### App-Side Measurement Semantics

- **SEM-01**: Downstream apps can infer higher-level measurement candidates such as hole, chamfer, centerline, or nominal-vs-thickness semantics from primitive exact measurements.
- **SEM-02**: Downstream apps can run multi-pick measurement sessions with preview, candidate ranking, and pinning UX on top of exact references.

### Mesh Fallbacks & UX

- **UX-01**: Downstream apps can fall back from exact topology references to mesh or point measurements when exact refs are unavailable.
- **UX-02**: Demo or downstream viewers can render measurement overlays, callouts, and workplanes consistently for exact-measurement results.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Hole, chamfer, draft, and similar semantic feature recognition in the runtime | These build on top of primitive exact measurement and belong in downstream app logic after the kernel contract exists |
| Measurement session state machines, preview candidate ranking, or pinning UX | This milestone is limited to wasm/core foundations, not viewer behavior |
| Overlay rendering, annotation layout, or workplane visualization | These are downstream app concerns above the runtime contract |
| Replacing the current mesh/topology import payload with an exact-only API | Existing import and triangulation consumers must keep working alongside the new exact-measurement foundation |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| LIFE-01 | Phase 5 | Completed |
| LIFE-02 | Phase 5 | Completed |
| REF-01 | Phase 6 | Completed |
| REF-02 | Phase 6 | Completed |
| REF-03 | Phase 7 | Completed |
| MEAS-01 | Phase 8 | Planned |
| MEAS-02 | Phase 8 | Planned |
| MEAS-03 | Phase 7 | Completed |
| MEAS-04 | Phase 8 | Planned |
| MEAS-05 | Phase 8 | Planned |
| ADAPT-01 | Phase 8 | Planned |
| ADAPT-02 | Phase 8 | Planned |

**Coverage:**
- v1.1 requirements: 12 total
- Mapped to phases: 12
- Unmapped: 0

---
*Requirements defined: 2026-04-14*
*Last updated: 2026-04-15 after Phase 07 completion*
