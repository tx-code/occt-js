# Phase 16: Exact Relation Classifier Contract - Research

**Researched:** 2026-04-16  
**Domain:** Additive exact relation classification on top of the shipped lifecycle, primitive-measurement, pairwise-measurement, and placement surfaces.  
**Confidence:** HIGH for phase boundary, public API direction, and adapter split; MEDIUM for final supported analytic-pair matrix until execution proves the current fixture corpus.

<user_constraints>
## User Constraints

Use the approved `v1.4` milestone and the shipped Phase 15 surface as the source of truth:

- Stay on pure GSD workflow for this milestone.
- Keep `occt-js` centered on the runtime-first Wasm carrier and `@tx-code/occt-core`.
- Keep the exact kernel boundary from `v1.1`: wasm owns exact geometry and math, `occt-core` owns occurrence transforms and JS ergonomics, downstream apps own UX and semantics.
- Ship both placement and relation in `v1.4`, but keep docs/governance in Phase 17.
- Keep the work additive. Existing `MeasureExact*` and `SuggestExact*Placement` contracts must remain source-compatible.
- Keep the relation surface limited to `parallel`, `perpendicular`, `concentric`, `tangent`, and `none`.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| REL-01 | Downstream JS code can classify parallel or perpendicular relations between compatible exact refs and receive supporting geometry needed for presentation. | Root classifier should reuse the shipped line-line and plane-plane analytic seams already proven by exact angle and thickness. |
| REL-02 | Downstream JS code can classify concentric or tangent relations between compatible exact refs and receive supporting geometry needed for presentation. | Root classifier should stay on analytic families such as circle/cylinder/line/plane and return compact support geometry instead of viewer policy. |
| REL-03 | The relation classifier returns explicit `none` for valid non-related refs and uses shared typed failures for invalid or unsupported cases. | `none` should be a success result, while invalid, unsupported, or degenerate requests remain on the existing pairwise failure family. |
| ADAPT-08 | `@tx-code/occt-core` exposes package-first relation classification that preserves occurrence transforms and normalizes supporting geometry DTOs without hiding the runtime contract. | Package wrappers should mirror the shipped pairwise measurement and placement adapter seam: validate refs, forward transforms, normalize any local support geometry, attach refs on success. |
</phase_requirements>

## Summary

Phase 16 should add a unified exact relation classifier beside the shipped measurement and placement APIs, not inside them. The runtime already has most of the analytic ingredients:

- `GetExactGeometryType` can distinguish line, circle, plane, cylinder, cone, sphere, and torus families on retained exact refs. [VERIFIED: src/exact-query.cpp] [VERIFIED: dist/occt-js.d.ts]
- `MeasureExactAngle`, `MeasureExactThickness`, and the Phase 15 placement helpers already prove line-line and plane-plane carrier logic, explicit `parallel-geometry` / `coincident-geometry` failures, and frame construction. [VERIFIED: src/exact-query.cpp] [VERIFIED: test/exact_pairwise_measurement_contract.test.mjs] [VERIFIED: test/exact_placement_contract.test.mjs]
- `MeasureExactRadius` and `MeasureExactCenter` already expose center and axis data for circle, cylinder, sphere, cone, and torus families. [VERIFIED: src/exact-query.cpp] [VERIFIED: dist/occt-js.d.ts]
- `@tx-code/occt-core` already validates pairwise exact refs, forwards occurrence transforms, and normalizes placement data into occurrence space. [VERIFIED: packages/occt-core/src/occt-core.js]

The missing product surface is a JS-friendly `ClassifyExactRelation(...)` contract that can say `parallel`, `perpendicular`, `concentric`, `tangent`, or `none` without forcing downstream apps to reverse-engineer `PrsDim` or duplicate exact analytic tests.

**Primary recommendation:** introduce additive root APIs and DTOs for exact relation classification, keep the root signature same-model plus two transforms, use `kind: "none"` as a success case, and let `@tx-code/occt-core` expose one package-first `classifyExactRelation(refA, refB)` wrapper. Keep docs and tarball governance out of Phase 16.

## Existing Code Seams

### Root analytic seam

- `src/exact-query.cpp` already centralizes retained exact lookup, pairwise transform application, family detection, and explicit failure shaping. Relation classification should live in this seam, not in JS. [VERIFIED: src/exact-query.cpp]
- The helper layer already contains reusable pieces:
  - `ResolveFace`, `ResolveEdge`, `ResolveElementShape`
  - `ApplyOccurrenceTransform`
  - `MeasureMinimumDistance`
  - `TryMakeDirection`
  - `BuildFrameFromNormalAndX`
  - `BuildFrameFromXAxis`
  [VERIFIED: src/exact-query.cpp]
- `src/importer.hpp` and `dist/occt-js.d.ts` already define additive pairwise and placement DTO families. Relation DTOs should be added beside them, not fused into existing result types. [VERIFIED: src/importer.hpp] [VERIFIED: dist/occt-js.d.ts]
- `src/js-interface.cpp` already does matrix parsing and exact DTO serialization for pairwise and placement results. Relation serialization belongs there. [VERIFIED: src/js-interface.cpp]

### Current adapter seam

- `packages/occt-core/src/occt-core.js` already provides `validatePairwiseExactRefs(...)`, transform helpers, and the pattern of attaching `refA` / `refB` on successful pairwise results. [VERIFIED: packages/occt-core/src/occt-core.js]
- Pairwise wrappers already forward occurrence transforms unchanged to the root carrier. Relation wrappers should keep the same boundary rather than introducing occurrence ids or viewer abstractions. [VERIFIED: packages/occt-core/src/occt-core.js]
- Placement wrappers already normalize local supporting geometry into occurrence space. If relation results reuse frames, anchors, axes, or centers in local space, the same adapter pattern can be extended. [VERIFIED: packages/occt-core/src/occt-core.js]

### Existing contract coverage to extend

- `test/exact_pairwise_measurement_contract.test.mjs` already proves parallel, coincident, and unsupported pairwise failures on analytic fixtures. That fixture logic can be reused to lock relation classification. [VERIFIED: test/exact_pairwise_measurement_contract.test.mjs]
- `test/exact_placement_contract.test.mjs` already proves stable frame and anchor DTOs on pairwise and circular cases. Relation tests can reuse those DTO expectations where appropriate. [VERIFIED: test/exact_placement_contract.test.mjs]
- `packages/occt-core/test/core.test.mjs` and `packages/occt-core/test/live-root-integration.test.mjs` already prove wrapper shape and repeated-geometry behavior. Extend those files instead of inventing a new package harness. [VERIFIED: packages/occt-core/test/core.test.mjs] [VERIFIED: packages/occt-core/test/live-root-integration.test.mjs]

## OCCT Reference Findings

### `PrsDim` is a design reference, not an API template

`PrsDim_KindOfRelation.hxx` shows the OCCT relation space includes `CONCENTRIC`, `PARALLEL`, `PERPENDICULAR`, and `TANGENT`, which matches the scope chosen for `v1.4`. [VERIFIED: occt/src/PrsDim/PrsDim_KindOfRelation.hxx]

The reusable ideas for `occt-js` are:

- `GetPlaneFromFace(...)`
- `Nearest(...)`
- `ProjectPointOnPlane(...)`
- `ProjectPointOnLine(...)`

These are geometry helpers, not presentation objects. [VERIFIED: occt/src/PrsDim/PrsDim.hxx] [VERIFIED: occt/src/PrsDim/PrsDim.cxx]

### Not all `PrsDim` relations are equally mature

- `PrsDim_ParallelRelation::ComputeTwoFacesParallel(...)` throws `Standard_NotImplemented`. [VERIFIED: occt/src/PrsDim/PrsDim_ParallelRelation.cxx]
- `PrsDim_PerpendicularRelation` has separate face/edge presentation paths, but the face implementation is still presentation-oriented and not a reusable web DTO shape. [VERIFIED: occt/src/PrsDim/PrsDim_PerpendicularRelation.cxx]
- `PrsDim_ConcentricRelation` is strongest on edge/edge and edge/vertex presentation built around circles. [VERIFIED: occt/src/PrsDim/PrsDim_ConcentricRelation.cxx]
- `PrsDim_TangentRelation` uses curve extrema and presentation logic for tangent markers; again, this is reference behavior, not a candidate Wasm API shape. [VERIFIED: occt/src/PrsDim/PrsDim_TangentRelation.cxx]

**Implication:** Phase 16 should productize the exact analytic relation kernel directly. Do not attempt to mirror `PrsDim_*Relation` classes or their AIS/Prs3d presentation semantics.

## Recommended Public API Direction

Recommended root relation kind:

```ts
type OcctJSExactRelationKind =
  | "parallel"
  | "perpendicular"
  | "concentric"
  | "tangent"
  | "none";
```

Recommended supporting geometry:

```ts
interface OcctJSExactRelationSuccess {
  ok: true;
  kind: OcctJSExactRelationKind;
  frame?: OcctJSExactPlacementFrame;
  anchors?: OcctJSExactPlacementAnchor[];
  directionA?: [number, number, number];
  directionB?: [number, number, number];
  center?: [number, number, number];
  axisDirection?: [number, number, number];
  tangentPoint?: [number, number, number];
}
```

Recommended root API:

- `ClassifyExactRelation(exactModelId, exactShapeHandleA, kindA, elementIdA, exactShapeHandleB, kindB, elementIdB, transformA, transformB)`

Recommended package API:

- `core.classifyExactRelation(refA, refB)`

### Recommended support matrix

Keep the first shipped matrix tight and analytic:

- `parallel` / `perpendicular`
  - line-line
  - plane-plane
- `concentric`
  - circle-circle
  - circle-cylinder
  - cylinder-cylinder
  - optionally sphere-sphere if center coincidence is trivial and stable on current fixtures
- `tangent`
  - line-circle
  - circle-circle
  - plane-cylinder
  - cylinder-cylinder only if a stable tangent point and classification rule can be proven exactly

When a pair is analytically valid but does not satisfy any supported relation, return `kind: "none"`.  
When a pair is not analytically supported by the phase scope, return `unsupported-geometry`.

## Architecture Patterns

### Pattern 1: `none` is a successful classification, not a failure

`REL-03` only makes sense if valid analytic pairs can say "no supported relation" without masquerading as an error.

**Recommendation:** use `ok: true, kind: "none"` for valid non-related analytic pairs and reserve failure DTOs for invalid or unsupported requests.

### Pattern 2: relation classification should stay same-model plus transform-aware

The shipped pairwise exact APIs already rely on one retained model plus two transforms to preserve reused-geometry correctness. [VERIFIED: dist/occt-js.d.ts] [VERIFIED: packages/occt-core/src/occt-core.js]

**Recommendation:** keep `ClassifyExactRelation(...)` on the same signature and do not introduce cross-model roots or viewer ids in `v1.4`.

### Pattern 3: supporting geometry should reuse placement vocabulary where it helps

Phase 15 already established stable frames and anchors. Duplicating a second frame vocabulary for relations would create needless downstream drift. [VERIFIED: dist/occt-js.d.ts] [VERIFIED: test/exact_placement_contract.test.mjs]

**Recommendation:** reuse `OcctJSExactPlacementFrame` and `OcctJSExactPlacementAnchor` concepts inside relation results whenever a relation needs a stable frame or point set.

### Pattern 4: package wrappers should remain thin and explicit

The current `occt-core` seam is strong because wrappers validate refs, forward transforms, normalize local-to-occurrence data, and attach refs on success without hiding root behavior. [VERIFIED: packages/occt-core/src/occt-core.js]

**Recommendation:** `classifyExactRelation(refA, refB)` should preserve `kind: "none"` and shared failures, and only normalize support geometry into occurrence space when the root result uses local coordinates.

## Pitfalls

### Pitfall 1: conflating unsupported geometry with `none`

If `none` is used for unsupported combinations, downstream apps cannot distinguish "no relation" from "kernel cannot classify this pair."

**Avoidance:** return `none` only for valid analytic pairs with no supported relation. Use `unsupported-geometry` for unsupported kinds or family combinations.

### Pitfall 2: treating zero distance as enough to prove tangency

Minimum distance near zero is necessary but not sufficient for tangency. Coincidence, overlap, or numerical noise can masquerade as tangent contact.

**Avoidance:** use carrier-specific rules and explicit `insufficient-precision` or `coincident-geometry` failures where exact tangency cannot be stably disambiguated.

### Pitfall 3: mirroring `PrsDim_*Relation` presentation classes too literally

`PrsDim` relation classes are tied to AIS/Prs3d and do not map cleanly to a JS SDK surface. Parallel-face presentation is not even implemented in OCCT. [VERIFIED: occt/src/PrsDim/PrsDim_ParallelRelation.cxx]

**Avoidance:** ship a compact exact-kernel relation DTO, not interactive-dimension objects.

### Pitfall 4: widening the relation surface to feature semantics too early

`SceneGraph` uses relation-like semantics to help candidate ranking, but hole/chamfer/thickness interpretation still lives above the kernel layer. [VERIFIED: E:/Coding/SceneGraph.net/tests/SceneGraph.Avalonia.Inspect.OcctNative.Tests/Widgets/MeasureWidgetPrsDimSemanticsTests.cs]

**Avoidance:** keep Phase 16 at exact relation classification plus support geometry only.

### Pitfall 5: losing occurrence correctness in package wrappers

Phase 15 already proved that placement support geometry needs explicit occurrence normalization. Relation support geometry will have the same risk.

**Avoidance:** reuse the shipped transform helpers and prove repeated-geometry relation behavior through live package tests.

## Fixture Strategy

The current corpus likely covers most of Phase 16, but tangent and concentric may need one small augmentation:

- `test/simple_part.step`
  - line-line parallel/perpendicular
  - plane-plane parallel/perpendicular
  - valid analytic `none` cases
- `test/bearing.igs` or `test/as1_pe_203.brep`
  - circle/cylinder families for concentric and tangent candidates
- `test/assembly.step`
  - repeated-geometry occurrence behavior through `occt-core`

If the current corpus cannot deterministically expose a tangent or concentric pair, add a minimal synthetic fixture or compact retained-shape helper during execution rather than weakening the contract assertions.

## Recommended Plan Split

### 16-01 - Add root exact relation classifier semantics and supporting geometry DTOs

- add root relation DTO structs and typings
- add root `ClassifyExactRelation(...)`
- add root contract tests for `parallel`, `perpendicular`, `concentric`, `tangent`, `none`, and explicit failures

### 16-02 - Normalize relation classifier adapters and failure parity in `occt-core`

- add `classifyExactRelation(refA, refB)` in `occt-core`
- normalize any local support geometry into occurrence space
- extend package unit and live tests to prove repeated-geometry and `none`/failure parity

## Validation Architecture

| Property | Value |
|----------|-------|
| Framework | Node built-in test runner plus existing repo integration scripts |
| Quick run command | `node --test test/exact_relation_contract.test.mjs && npm --prefix packages/occt-core test` |
| Full suite command | `npm run build:wasm:win && node --test test/exact_relation_contract.test.mjs && npm --prefix packages/occt-core test && npm test` |

Wave 0 gaps:

- `test/exact_relation_contract.test.mjs` does not exist yet
- `dist/occt-js.d.ts` has no relation DTOs or `ClassifyExactRelation(...)` signature
- `packages/occt-core` has no package-first relation wrapper yet
- no current tests lock `kind: "none"` success semantics or relation-support geometry shape

## Sources

- `AGENTS.md`
- `.planning/PROJECT.md`
- `.planning/REQUIREMENTS.md`
- `.planning/ROADMAP.md`
- `.planning/STATE.md`
- `.planning/phases/15-placement-contract-hardening/15-CONTEXT.md`
- `.planning/phases/15-placement-contract-hardening/15-RESEARCH.md`
- `.planning/phases/15-placement-contract-hardening/15-VALIDATION.md`
- `.planning/phases/15-placement-contract-hardening/15-01-SUMMARY.md`
- `.planning/phases/15-placement-contract-hardening/15-02-SUMMARY.md`
- `src/importer.hpp`
- `src/exact-query.hpp`
- `src/exact-query.cpp`
- `src/js-interface.cpp`
- `dist/occt-js.d.ts`
- `packages/occt-core/src/occt-core.js`
- `packages/occt-core/test/core.test.mjs`
- `packages/occt-core/test/live-root-integration.test.mjs`
- `test/exact_pairwise_measurement_contract.test.mjs`
- `test/exact_placement_contract.test.mjs`
- `occt/src/PrsDim/PrsDim.hxx`
- `occt/src/PrsDim/PrsDim.cxx`
- `occt/src/PrsDim/PrsDim_KindOfRelation.hxx`
- `occt/src/PrsDim/PrsDim_ParallelRelation.cxx`
- `occt/src/PrsDim/PrsDim_PerpendicularRelation.cxx`
- `occt/src/PrsDim/PrsDim_ConcentricRelation.cxx`
- `occt/src/PrsDim/PrsDim_TangentRelation.cxx`
- `E:/Coding/SceneGraph.net/src/SceneGraph.OcctInterop/OcctMeasurement.cs`
- `E:/Coding/SceneGraph.net/src/SceneGraph.OcctInterop/OcctMeasureError.cs`
- `E:/Coding/SceneGraph.net/tests/SceneGraph.Avalonia.Inspect.OcctNative.Tests/Widgets/MeasureWidgetPrsDimSemanticsTests.cs`
