# Phase 15: Placement Contract Hardening - Context

**Gathered:** 2026-04-16  
**Status:** Ready for planning  
**Source:** Approved `v1.4` milestone design plus active `.planning` docs

<domain>
## Phase Boundary

Phase 15 adds the placement half of the `v1.4 Exact Measurement Placement & Relation SDK` milestone.

This phase delivers:

- root Wasm placement helpers for exact distance, angle, thickness, radius, and diameter
- additive placement DTOs with stable anchors and full working-plane frame data
- package-first `@tx-code/occt-core` wrappers that preserve occurrence transforms

This phase does not deliver:

- relation classifiers
- overlay rendering, label layout, or measurement widgets
- selection sessions, preview/pin flows, or feature semantics

</domain>

<decisions>
## Implementation Decisions

### API Boundary
- Keep `v1.4` runtime-first. Root Wasm remains the geometry authority; `@tx-code/occt-core` remains the occurrence-aware adapter; downstream apps own measurement UX.
- Add placement helpers beside existing `MeasureExact*` APIs. Do not widen or repurpose shipped result DTOs.
- Keep placement helpers geometry-support oriented. They return anchors, directions, and frame data, not rendering commands or viewer policy.

### DTO Shape
- Standardize a placement frame with `origin`, `normal`, `xDir`, and `yDir`.
- Standardize placement anchors as explicit 3D points with stable semantic roles.
- Include scalar values when the placement helper owns a natural numeric result, but keep placement distinct from the existing measurement APIs.

### Transform And Adapter Policy
- Pairwise root placement helpers follow the existing pairwise exact-measurement signature and accept occurrence transforms.
- Single-entity root placement helpers operate on retained exact geometry identity only; `@tx-code/occt-core` normalizes their results into occurrence space.
- `@tx-code/occt-core` should expose package-first helpers without hiding the underlying root contract.

### Scope Guards
- Keep Phase 15 limited to placement. Relation classification stays in Phase 16.
- Keep Phase 15 additive. Existing `MeasureExactDistance`, `MeasureExactAngle`, `MeasureExactThickness`, `MeasureExactRadius`, and related wrappers must remain source-compatible.
- Keep Babylon, demo, Tauri, and overlay concerns outside the phase boundary.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone And Repo Rules
- `AGENTS.md` - repository workflow, release boundary, and verification rules
- `.planning/PROJECT.md` - active milestone framing and out-of-scope boundaries
- `.planning/REQUIREMENTS.md` - Phase 15 requirement mapping
- `.planning/ROADMAP.md` - Phase 15 goal, success criteria, and canonical refs
- `.planning/STATE.md` - active milestone state

### Approved Design Input
- `docs/superpowers/specs/2026-04-16-exact-measurement-placement-relation-sdk-design.md` - approved `v1.4` API and phase framing

### Current Exact Runtime Surface
- `src/exact-query.hpp`
- `src/exact-query.cpp`
- `src/js-interface.cpp`
- `src/importer.hpp`
- `dist/occt-js.d.ts`
- `packages/occt-core/src/occt-core.js`
- `packages/occt-core/src/index.js`

### Existing Contract Coverage
- `test/exact_pairwise_measurement_contract.test.mjs`
- `test/exact_primitive_queries_contract.test.mjs`
- `packages/occt-core/test/core.test.mjs`
- `packages/occt-core/test/live-root-integration.test.mjs`

### OCCT Geometry Reference
- `occt/src/PrsDim/PrsDim.hxx`
- `occt/src/PrsDim/PrsDim.cxx`
- `occt/src/PrsDim/PrsDim_LengthDimension.cxx`
- `occt/src/PrsDim/PrsDim_AngleDimension.cxx`

</canonical_refs>

<specifics>
## Specific Ideas

- Use `SuggestExactDistancePlacement`, `SuggestExactAnglePlacement`, and `SuggestExactThicknessPlacement` for pairwise helpers.
- Use `SuggestExactRadiusPlacement` and `SuggestExactDiameterPlacement` for circular placement helpers.
- Keep pairwise helpers transform-aware at the root boundary so repeated geometry can produce stable placement DTOs without app-side reconstruction.
- Keep circular placement helpers local at the root boundary and let `occt-core` transform returned centers, anchors, axes, and frames into occurrence space.

</specifics>

<deferred>
## Deferred Ideas

- `ClassifyExactRelation(...)` and relation DTOs move to Phase 16.
- SDK docs, README examples, tarball checks, and release governance updates move to Phase 17.
- Hole, chamfer, midpoint, equal-distance, or symmetry semantics remain future work above the placement contract.

</deferred>

---

*Phase: 15-placement-contract-hardening*  
*Context gathered: 2026-04-16 via approved v1.4 design inputs*
