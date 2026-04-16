# Phase 16: Exact Relation Classifier Contract - Context

**Gathered:** 2026-04-16  
**Status:** Ready for planning  
**Source:** Active `v1.4` milestone docs plus the shipped Phase 15 placement/runtime surface

<domain>
## Phase Boundary

Phase 16 adds the relation-classification half of the `v1.4 Exact Measurement Placement & Relation SDK` milestone.

This phase delivers:

- a root Wasm exact relation classifier for `parallel`, `perpendicular`, `concentric`, `tangent`, and `none`
- additive relation DTOs plus supporting geometry suitable for downstream presentation logic
- package-first `@tx-code/occt-core` wrappers that preserve occurrence transforms and keep `none` distinct from failures

This phase does not deliver:

- SDK docs, README examples, tarball checks, or release-governance closeout
- overlay rendering, label layout, or measurement widgets
- selection sessions, preview/pin flows, or feature semantics such as hole/chamfer

</domain>

<decisions>
## Implementation Decisions

### API Boundary
- Keep `v1.4` runtime-first. Root Wasm remains the exact-geometry authority; `@tx-code/occt-core` remains the occurrence-aware adapter; downstream apps own measurement UX and relation interpretation policy.
- Add a unified relation classifier beside the shipped `MeasureExact*` and `SuggestExact*Placement` APIs. Do not widen or repurpose the shipped result DTOs.
- Keep relation results geometry-support oriented. They return relation kind plus supporting geometry, not rendering commands or viewer policy.

### Success And Failure Semantics
- Valid analytic pairs with no supported relation must return `ok: true` and `kind: "none"`.
- Invalid handles, invalid ids, unsupported geometry, or degenerate/ambiguous analytic cases must continue to use explicit typed failures.
- Keep the existing same-model pairwise signature with two occurrence transforms so repeated geometry stays exact through `occt-core`.

### Supporting Geometry Policy
- Reuse the shipped placement frame and anchor vocabulary where that reduces DTO duplication.
- Return supporting geometry only when it is meaningful for downstream presentation, such as directions, center/axis data, tangent points, anchors, or a stable frame.
- Keep the relation DTO additive and JS-friendly. Avoid exposing OCCT presentation or AIS/Prs3d concepts directly.

### Scope Guards
- Limit Phase 16 to `parallel`, `perpendicular`, `concentric`, `tangent`, and `none`.
- Keep demo, Babylon, Tauri, and overlay concerns outside the phase boundary.
- Keep the contract additive and source-compatible for existing exact measurement consumers.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone And Repo Rules
- `AGENTS.md`
- `.planning/PROJECT.md`
- `.planning/REQUIREMENTS.md`
- `.planning/ROADMAP.md`
- `.planning/STATE.md`

### Prior Phase Context
- `.planning/phases/15-placement-contract-hardening/15-CONTEXT.md`
- `.planning/phases/15-placement-contract-hardening/15-RESEARCH.md`
- `.planning/phases/15-placement-contract-hardening/15-VALIDATION.md`
- `.planning/phases/15-placement-contract-hardening/15-01-SUMMARY.md`
- `.planning/phases/15-placement-contract-hardening/15-02-SUMMARY.md`

### Current Exact Runtime Surface
- `src/importer.hpp`
- `src/exact-query.hpp`
- `src/exact-query.cpp`
- `src/js-interface.cpp`
- `dist/occt-js.d.ts`
- `packages/occt-core/src/occt-core.js`

### Existing Contract Coverage
- `test/exact_pairwise_measurement_contract.test.mjs`
- `test/exact_placement_contract.test.mjs`
- `packages/occt-core/test/core.test.mjs`
- `packages/occt-core/test/live-root-integration.test.mjs`

### OCCT Geometry Reference
- `occt/src/PrsDim/PrsDim.hxx`
- `occt/src/PrsDim/PrsDim.cxx`
- `occt/src/PrsDim/PrsDim_KindOfRelation.hxx`
- `occt/src/PrsDim/PrsDim_ParallelRelation.cxx`
- `occt/src/PrsDim/PrsDim_PerpendicularRelation.cxx`
- `occt/src/PrsDim/PrsDim_ConcentricRelation.cxx`
- `occt/src/PrsDim/PrsDim_TangentRelation.cxx`

### Local Downstream Reference
- `E:/Coding/SceneGraph.net/src/SceneGraph.OcctInterop/OcctMeasurement.cs`
- `E:/Coding/SceneGraph.net/src/SceneGraph.OcctInterop/OcctMeasureError.cs`
- `E:/Coding/SceneGraph.net/tests/SceneGraph.Avalonia.Inspect.OcctNative.Tests/Widgets/MeasureWidgetPrsDimSemanticsTests.cs`

</canonical_refs>

<specifics>
## Specific Ideas

- Use a root API named `ClassifyExactRelation(...)` with the existing same-model pairwise signature plus two transforms.
- Keep relation support additive in `dist/occt-js.d.ts`, likely with `OcctJSExactRelationKind` and `OcctJSExactRelationResult`.
- Reuse placement DTO concepts where possible so downstream overlay code does not need a second frame or anchor vocabulary.
- Add `core.classifyExactRelation(refA, refB)` in `@tx-code/occt-core` and preserve `refA` / `refB` on successful results, including `kind: "none"`.

</specifics>

<deferred>
## Deferred Ideas

- SDK docs, README examples, tarball checks, and release-governance updates move to Phase 17.
- Feature semantics such as hole, chamfer, midpoint, symmetry, or equal-distance remain future work above the relation contract.
- Cross-model exact relation classification remains out of scope while the root pairwise surface stays same-model plus transforms.

</deferred>

---

*Phase: 16-exact-relation-classifier-contract*  
*Context gathered: 2026-04-16 via active v1.4 planning inputs*
