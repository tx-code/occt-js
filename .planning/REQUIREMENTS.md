# Requirements: occt-js

**Defined:** 2026-04-21
**Core Value:** Downstream applications can reliably consume the OCCT Wasm runtime and its root API contract without build drift or packaging surprises.

## v1 Requirements

### Shared Profiles

- [ ] **PROF-01**: Downstream JS code can submit one normalized 2D profile spec with line and circular-arc segments that can be consumed by multiple generated-solid families.
- [ ] **PROF-02**: Downstream JS code receives typed diagnostics for invalid profile continuity, closure, unsupported segment data, or degenerate profile input before OCCT construction runs.
- [ ] **PROF-03**: Existing revolved-shape APIs reuse the shared profile kernel without changing their public caller contract or losing validation behavior.

### Extruded Geometry

- [ ] **EXTR-01**: Downstream JS code can build a linear extruded solid from a closed planar profile and receive canonical scene data compatible with existing `rootNodes`, `geometries`, `materials`, and stats consumers.
- [ ] **EXTR-02**: Downstream JS code can open a generated linear extruded solid as a retained exact model and reuse the existing exact query and lifecycle surface against it.

### Binding Semantics

- [ ] **MAP-03**: Downstream JS code receives stable extruded-shape face bindings keyed by profile segment provenance plus explicit runtime-owned wall, `start_cap`, and `end_cap` roles instead of relying on face order.
- [ ] **MAP-04**: Downstream JS code receives deterministic default appearance or material grouping for extruded-shape faces derived from runtime segment tags and roles without caller-supplied colors.

### SDK & Governance

- [ ] **SDK-02**: Downstream JS code can use `@tx-code/occt-core` wrappers and typings for shared profile validation plus extruded-shape validate, build, and exact-open flows.
- [ ] **GOV-02**: The shared-profile and extruded-shape contract is documented, typed, packaged, and enforced by contract coverage plus the authoritative root release gate without widening unconditional secondary-surface checks.

## v2 Requirements

### Additional Shape Families

- **SWEEP-01**: Downstream JS code can generate solids by sweeping a closed profile along a non-trivial path while preserving stable semantic face bindings.
- **LOFT-01**: Downstream JS code can generate solids by lofting between multiple profiles without inventing app-specific intermediate schemas.

### Richer Profile Geometry

- **PROF-04**: Downstream JS code can define shared profile kernels with spline or NURBS segments once the line/arc contract has stabilized across more than one solid family.
- **FEAT-08**: Downstream JS code can compose additive post-generation features such as shelling, hole patterns, or boolean cuts on top of generated profile solids.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Non-linear sweep or pipe solids | `v1.9` is limited to one more profile-driven family beyond revolve: straight linear extrusion |
| Lofts or multi-profile blends | Shared profile reuse should be proven on a simpler family before profile-to-profile interpolation work |
| Boolean feature stacks on generated solids | Post-generation feature modeling would expand the milestone beyond the core shared-profile and extrusion contract |
| App-owned sketch editing, constraints, or profile authoring UX | The runtime/package layer should stop at geometry contracts, not become a sketcher |
| Reintroducing tool-library or CAM workflow ownership into the root runtime | Upstream apps must continue owning tool schemas and process semantics |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| PROF-01 | — | Pending |
| PROF-02 | — | Pending |
| PROF-03 | — | Pending |
| EXTR-01 | — | Pending |
| EXTR-02 | — | Pending |
| MAP-03 | — | Pending |
| MAP-04 | — | Pending |
| SDK-02 | — | Pending |
| GOV-02 | — | Pending |

**Coverage:**
- v1 requirements: 9 total
- Mapped to phases: 0
- Unmapped: 9 ⚠️

---
*Requirements defined: 2026-04-21*
*Last updated: 2026-04-21 after initial v1.9 requirement definition*
