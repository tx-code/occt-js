# Phase 15: Placement Contract Hardening - Research

**Researched:** 2026-04-16  
**Domain:** Additive exact-placement helpers for the shipped exact-measurement foundation, with occurrence-safe package adapters and runtime-first verification.  
**Confidence:** HIGH for phase boundary and plan split; MEDIUM for final anchor ordering and frame orientation details until execution proves them on the current fixture corpus.

<user_constraints>
## User Constraints

Use the approved `v1.4` design and active milestone decisions as the source of truth:

- Stay on pure GSD workflow for this milestone; do not route normal milestone planning back through superpowers design flows.
- Keep `occt-js` centered on the runtime-first Wasm carrier and `@tx-code/occt-core`.
- Keep the exact measurement kernel boundary from `v1.1`: wasm owns geometry and exact math, `occt-core` owns occurrence transforms and JS ergonomics, downstream apps own UX.
- Ship both pairwise placement and circular placement in `v1.4`, but land placement before relation classifiers.
- Keep the work additive. Existing `MeasureExact*` and `occt-core` exact measurement contracts must remain source-compatible.
- Keep SDK docs and governance in later phases; Phase 15 is code and tests only.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PLCT-01 | Downstream JS code can request exact distance placement from two exact refs and receive stable occurrence-space anchors plus a full working-plane frame. | Root pairwise placement helper should reuse the current same-model pairwise signature, add frame `xDir/yDir`, and keep occurrence transforms in the call surface. |
| PLCT-02 | Downstream JS code can request exact angle placement from exact refs and receive stable origin, attachment directions, anchors, and working-plane frame data. | Root angle placement helper should build on the current supported line-line and plane-plane exact angle cases, but return presentation-support DTOs. |
| PLCT-03 | Downstream JS code can request exact radius and diameter placement from circular exact geometry and receive stable center, anchor, axis, and frame data. | Root circular placement helpers should reuse retained exact circular or cylindrical geometry identity and keep occurrence conversion in `occt-core`. |
| PLCT-04 | Downstream JS code can request exact thickness placement from compatible exact refs and receive stable occurrence-space anchors plus working-plane frame data. | Root thickness placement helper should stay planar-face only in `v1.4`, reusing the existing exact thickness scope. |
| ADAPT-07 | `@tx-code/occt-core` exposes package-first placement helpers that preserve occurrence transforms and normalize root placement DTOs without hiding the runtime contract. | Package wrappers should expose ref-oriented APIs and transform single-entity placement results into occurrence space while leaving root semantics visible. |
</phase_requirements>

## Summary

Phase 15 should add placement helpers beside the current exact-measurement surface, not through it. The root runtime already exposes enough exact math to prove the core geometry:

- `MeasureExactDistance`, `MeasureExactAngle`, and `MeasureExactThickness` already return anchors plus `workingPlaneOrigin` and `workingPlaneNormal`. [VERIFIED: src/exact-query.cpp] [VERIFIED: src/js-interface.cpp] [VERIFIED: dist/occt-js.d.ts]
- `MeasureExactRadius` and `MeasureExactCenter` already return local center, anchor, and axis direction data for supported circular families. [VERIFIED: src/exact-query.cpp] [VERIFIED: dist/occt-js.d.ts]
- `@tx-code/occt-core` already validates exact refs, forwards pairwise transforms, and normalizes local points and directions into occurrence space. [VERIFIED: packages/occt-core/src/occt-core.js]

The gap is not exact numeric measurement. The gap is a stable placement DTO that downstream overlay code can consume without re-deriving `PrsDim` frame construction or presentation support logic from scalar measurement results.

**Primary recommendation:** introduce additive root APIs named `SuggestExact*Placement(...)`, standardize a placement frame DTO with `origin`, `normal`, `xDir`, and `yDir`, and let `@tx-code/occt-core` expose package-first wrappers that preserve occurrence-space results. Keep relation classification and docs out of Phase 15.

## Existing Code Seams

### Root exact math and DTO marshaling

- `src/exact-query.cpp` already centralizes exact lifecycle lookups, pairwise measurement math, and failure-code shaping. Pairwise placement should stay in this seam. [VERIFIED: src/exact-query.cpp]
- `src/js-interface.cpp` already handles `gp_Trsf` parsing and exact DTO serialization for pairwise queries. New placement serializers should stay here, not in JS. [VERIFIED: src/js-interface.cpp]
- `src/importer.hpp` currently holds the success and failure DTO structs used by `dist/occt-js.d.ts`; placement result structs should be added there. [VERIFIED: src/importer.hpp]

### Current package adapter seam

- `packages/occt-core/src/occt-core.js` already provides `validateExactRef(...)`, `validatePairwiseExactRefs(...)`, `normalizeTransform(...)`, `transformPoint(...)`, and `transformDirection(...)`. The same helpers should back placement wrappers. [VERIFIED: packages/occt-core/src/occt-core.js]
- Pairwise wrappers already preserve occurrence transforms by forwarding two 16-value matrices into the root runtime. Phase 15 pairwise placement should follow this exact shape for API parity. [VERIFIED: packages/occt-core/src/occt-core.js]
- Circular wrappers already convert local center and axis data into occurrence space. Phase 15 circular placement should extend that pattern to frame and anchor DTOs. [VERIFIED: packages/occt-core/src/occt-core.js]

### Existing contract coverage to extend

- `test/exact_pairwise_measurement_contract.test.mjs` already proves retained-ref distance, angle, and thickness behavior plus failure cases. Phase 15 should add a sibling root contract file rather than widening the old tests indefinitely. [VERIFIED: test/exact_pairwise_measurement_contract.test.mjs]
- `test/exact_primitive_queries_contract.test.mjs` already proves circular and analytic retained-geometry queries. It is the right behavioral reference for circular placement coverage. [VERIFIED: test/exact_primitive_queries_contract.test.mjs]
- `packages/occt-core/test/core.test.mjs` and `packages/occt-core/test/live-root-integration.test.mjs` already prove wrapper shapes and repeated-geometry behavior. Extend them instead of inventing a new package test harness. [VERIFIED: packages/occt-core/test/core.test.mjs] [VERIFIED: packages/occt-core/test/live-root-integration.test.mjs]

## Recommended Public API Direction

Recommended root placement frame:

```ts
interface OcctJSExactPlacementFrame {
  origin: [number, number, number];
  normal: [number, number, number];
  xDir: [number, number, number];
  yDir: [number, number, number];
}
```

Recommended root placement anchor:

```ts
interface OcctJSExactPlacementAnchor {
  role: "attach" | "center" | "anchor";
  point: [number, number, number];
}
```

Recommended root placement success union:

```ts
interface OcctJSExactPlacementSuccess {
  ok: true;
  kind: "distance" | "angle" | "radius" | "diameter" | "thickness";
  value?: number;
  frame: OcctJSExactPlacementFrame;
  anchors: OcctJSExactPlacementAnchor[];
  directionA?: [number, number, number];
  directionB?: [number, number, number];
  axisDirection?: [number, number, number];
}
```

Recommended root APIs:

- `SuggestExactDistancePlacement(...)`
- `SuggestExactAnglePlacement(...)`
- `SuggestExactThicknessPlacement(...)`
- `SuggestExactRadiusPlacement(...)`
- `SuggestExactDiameterPlacement(...)`

Recommended adapter APIs:

- `core.suggestExactDistancePlacement(refA, refB)`
- `core.suggestExactAnglePlacement(refA, refB)`
- `core.suggestExactThicknessPlacement(refA, refB)`
- `core.suggestExactRadiusPlacement(ref)`
- `core.suggestExactDiameterPlacement(ref)`

These APIs are additive and should not replace the current `MeasureExact*` surface. [VERIFIED: docs/superpowers/specs/2026-04-16-exact-measurement-placement-relation-sdk-design.md]

## Architecture Patterns

### Pattern 1: placement should reuse, not reshape, existing exact measurement kernels

**What:** Pairwise placement helpers should build on the same retained exact lookup and OCCT carrier math already used by `MeasureExactDistance`, `MeasureExactAngle`, and `MeasureExactThickness`. [VERIFIED: src/exact-query.cpp]

**Recommendation:** Extract shared frame-building helpers in `src/exact-query.cpp` rather than duplicating pairwise measurement logic or mutating existing result DTOs.

### Pattern 2: keep pairwise placement transform-aware at the root boundary

**What:** Existing pairwise exact measurement APIs already accept two occurrence transforms, which is how repeated geometry stays exact in `occt-core`. [VERIFIED: dist/occt-js.d.ts] [VERIFIED: packages/occt-core/src/occt-core.js]

**Recommendation:** New pairwise placement helpers should use the same flattened signature so downstream wrappers stay aligned and repeated-geometry behavior remains exact.

### Pattern 3: keep circular placement local at the root boundary and occurrence-aware in `occt-core`

**What:** Current radius and center queries return local-space geometry from retained exact definitions, and `occt-core` transforms those into occurrence space today. [VERIFIED: dist/occt-js.d.ts] [VERIFIED: packages/occt-core/src/occt-core.js]

**Recommendation:** `SuggestExactRadiusPlacement` and `SuggestExactDiameterPlacement` should follow the same split. Do not widen the root single-entity APIs with occurrence transforms.

### Pattern 4: use `PrsDim` as a geometry reference, not an API template

**What:** OCCT `PrsDim` carries the placement logic this milestone needs, but it is tightly coupled to AIS/Prs3d interactive objects. [VERIFIED: occt/src/PrsDim/PrsDim.hxx] [VERIFIED: occt/src/PrsDim/PrsDim_Dimension.hxx]

**Recommendation:** Reuse the ideas behind working planes, attachment points, and analytic support geometry. Do not attempt to expose interactive-dimension classes or viewer-facing layout policy through wasm.

## Pitfalls

### Pitfall 1: widening existing `MeasureExact*` result shapes

Existing exact measurement DTOs are already shipped and tested. Changing them to become placement DTOs would create avoidable downstream drift.

**Avoidance:** Add `SuggestExact*Placement(...)` beside `MeasureExact*` and keep the old unions source-compatible.

### Pitfall 2: returning only plane normal without a full frame

Current pairwise measurement results expose only `workingPlaneOrigin` and `workingPlaneNormal`. That is not enough for stable 2D overlay placement.

**Avoidance:** Placement success should require a full frame with `xDir` and `yDir`, and that frame should be right-handed and normalized.

### Pitfall 3: teaching wasm about occurrence ids or app-owned semantics

The current exact boundary works because wasm only sees retained exact geometry identity plus optional transforms.

**Avoidance:** Keep occurrence scoping and package ergonomics in `occt-core`. Do not invent viewer ids or overlay policy in the root carrier.

### Pitfall 4: treating diameter as a duplicate of radius output

Diameter is not a new kernel primitive, but it is a distinct presentation helper for downstream overlays.

**Avoidance:** Implement `SuggestExactDiameterPlacement(...)` as a presentation-oriented helper over circular geometry with a stable diameter anchor pattern and value semantics, not just a renamed radius call.

### Pitfall 5: forcing relation semantics into placement

Parallel, perpendicular, concentric, tangent, and `none` belong to Phase 16.

**Avoidance:** Keep Phase 15 limited to placement DTOs for measurement operations already in scope.

## Fixture Strategy

The current test corpus should cover Phase 15 without adding new CAD fixtures:

- `test/simple_part.step` for planar faces and linear edges used by pairwise placement helpers
- `test/bearing.igs` for circular edges or cylindrical faces used by radius and diameter placement helpers
- `test/assembly.step` for repeated-geometry occurrence-space package-wrapper coverage

If frame orientation proves unstable on these fixtures, adjust helper rules or add minimal assertions first; do not widen fixture scope prematurely.

## Recommended Plan Split

### 15-01 - Add root placement helper DTOs and pairwise placement bindings

- add placement DTO structs and typings
- add root pairwise placement helpers for distance, angle, and thickness
- add root contract tests for pairwise placement DTO shape and failure behavior

### 15-02 - Add circular placement helpers and `occt-core` placement adapter parity

- add root circular placement helpers for radius and diameter
- add package-first placement wrappers for both pairwise and circular placement helpers
- extend package unit and live tests to prove occurrence-space normalization and repeated-geometry behavior

## Validation Architecture

| Property | Value |
|----------|-------|
| Framework | Node built-in test runner plus existing repo integration scripts |
| Quick run command | `node --test test/exact_placement_contract.test.mjs && npm --prefix packages/occt-core test` |
| Full suite command | `npm run build:wasm:win && node --test test/exact_placement_contract.test.mjs && npm --prefix packages/occt-core test && npm test` |

Wave 0 gaps:

- `test/exact_placement_contract.test.mjs` does not exist yet
- `dist/occt-js.d.ts` has no placement DTOs or `SuggestExact*Placement(...)` signatures
- `packages/occt-core` has no placement wrapper methods yet
- no current test locks frame `xDir/yDir` or anchor-role stability

## Sources

- `AGENTS.md`
- `.planning/PROJECT.md`
- `.planning/REQUIREMENTS.md`
- `.planning/ROADMAP.md`
- `.planning/STATE.md`
- `.planning/phases/15-placement-contract-hardening/15-CONTEXT.md`
- `docs/superpowers/specs/2026-04-16-exact-measurement-placement-relation-sdk-design.md`
- `src/importer.hpp`
- `src/exact-query.hpp`
- `src/exact-query.cpp`
- `src/js-interface.cpp`
- `dist/occt-js.d.ts`
- `packages/occt-core/src/occt-core.js`
- `packages/occt-core/src/index.js`
- `packages/occt-core/test/core.test.mjs`
- `packages/occt-core/test/live-root-integration.test.mjs`
- `test/exact_pairwise_measurement_contract.test.mjs`
- `test/exact_primitive_queries_contract.test.mjs`
- `test/simple_part.step`
- `test/bearing.igs`
- `test/assembly.step`
- `occt/src/PrsDim/PrsDim.hxx`
- `occt/src/PrsDim/PrsDim.cxx`
- `occt/src/PrsDim/PrsDim_LengthDimension.cxx`
- `occt/src/PrsDim/PrsDim_AngleDimension.cxx`
