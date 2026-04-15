# Phase 8: Pairwise Measurement Contract Hardening - Research

**Researched:** 2026-04-15  
**Domain:** Pairwise exact measurements on retained OCCT refs, with occurrence-aware adapters and runtime-first verification.  
**Confidence:** MEDIUM

<user_constraints>
## User Constraints (from CONTEXT.md)

No phase-specific `08-CONTEXT.md` exists.

Use the current milestone decisions and roadmap constraints:

- Keep `occt-js` centered on the runtime-first Wasm carrier and `@tx-code/occt-core`. [VERIFIED: .planning/ROADMAP.md] [VERIFIED: .planning/STATE.md]
- Preserve the Phase 5-7 exact lifecycle, exact-ref mapping, and single-entity primitive-query contract. [VERIFIED: .planning/ROADMAP.md] [VERIFIED: .planning/phases/07-primitive-exact-geometry-queries/07-02-SUMMARY.md]
- Keep viewer UX, overlay rendering policy, and semantic feature recognition out of scope. [VERIFIED: .planning/REQUIREMENTS.md] [VERIFIED: .planning/STATE.md]
- Keep root release verification centered on `npm run test:release:root`. [VERIFIED: AGENTS.md] [VERIFIED: package.json]
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MEAS-01 | Exact distance between supported topology-reference pairs with numeric result and attach points. | Use a new pairwise root distance API plus `occt-core` occurrence wrappers. |
| MEAS-02 | Exact angle between supported topology-reference pairs with angle plus origin and direction vectors. | Keep v1.1 to analytic line-line and plane-plane pairs. |
| MEAS-04 | Exact thickness for supported parallel-wall scenarios with numeric result and attach points. | Treat thickness as plane-face-to-plane-face only in v1.1. |
| MEAS-05 | Structured success/failure DTOs with overlay-ready anchors and explicit failure codes. | Extend the current `ok/code/message` union pattern already used by Phase 7 queries. |
| ADAPT-01 | `@tx-code/occt-core` exposes JS-friendly adapters without hiding the root Wasm contract. | Keep root pairwise APIs low-level and let `occt-core` own ref-object validation and occurrence transforms. |
| ADAPT-02 | Root docs, typings, and release verification cover the exact-measurement foundation only. | Add typings/tests/docs to the existing runtime-first release gate. |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- `AGENTS.md` is the authoritative repository instruction file. [VERIFIED: CLAUDE.md]

## Summary

Phase 8 should keep the same split that already exists in shipped code: exact lookup and OCCT math live in `src/exact-query.cpp`, Embind marshaling stays in `src/js-interface.cpp`, and occurrence-scoped ref handling stays in `packages/occt-core`. [VERIFIED: src/exact-query.cpp] [VERIFIED: src/js-interface.cpp] [VERIFIED: packages/occt-core/src/occt-core.js]

The critical Phase 8 seam is occurrence placement. Phase 7 refs are definition-local in wasm, but `occt-core` already adds a per-occurrence `transform`, and repeated-geometry integration tests prove those transforms are required to distinguish reused instances. [VERIFIED: packages/occt-core/src/exact-ref-resolver.js] [VERIFIED: packages/occt-core/test/live-root-integration.test.mjs]

**Primary recommendation:** Add same-model pairwise root APIs for distance, angle, and thickness in `src/exact-query.cpp`; let those APIs accept optional occurrence transforms so attach geometry stays exact across repeated instances; keep v1.1 scope to trimmed-shape distance, line-line angle, plane-plane angle, and parallel-plane thickness only. [ASSUMED]

## Repo Constraints (from AGENTS.md)

- The root package and `dist/occt-js.js`, `dist/occt-js.wasm`, `dist/occt-js.d.ts` remain the canonical runtime artifacts. [VERIFIED: AGENTS.md]
- If C++ bindings change, `dist/` must be regenerated before claiming the repo is healthy. [VERIFIED: AGENTS.md]
- Root Wasm/runtime tests live under `test/`, and root verification must come before any secondary-surface checks. [VERIFIED: AGENTS.md]
- `npm run test:release:root` is the canonical root release gate; demo/Tauri checks stay conditional and secondary. [VERIFIED: AGENTS.md] [VERIFIED: package.json]

## Standard Stack

### Core

| Library / Surface | Version | Purpose | Why Standard |
|-------------------|---------|---------|--------------|
| OCCT submodule | 7.9.3 [VERIFIED: AGENTS.md] | Exact B-Rep geometry and pairwise carrier math | Already ships as the repo kernel and exposes the exact classes needed for distance/extrema and rigid shape placement. [VERIFIED: occt/src/BRepExtrema/BRepExtrema_DistShapeShape.hxx] [VERIFIED: occt/src/Extrema/Extrema_ExtCC.hxx] [VERIFIED: occt/src/Extrema/Extrema_ExtElC.hxx] [VERIFIED: occt/src/BRepBuilderAPI/BRepBuilderAPI_Transform.hxx] |
| Embind root API | repo-local [VERIFIED: src/js-interface.cpp] | Wasm DTO marshaling | Existing exact APIs already serialize `ok/code/message` unions and vector fields here. [VERIFIED: src/js-interface.cpp] |
| `@tx-code/occt-core` | 0.1.7 [VERIFIED: packages/occt-core/package.json] | Occurrence-scoped adapters | Existing exact wrappers already validate refs and convert between local and occurrence space here. [VERIFIED: packages/occt-core/src/occt-core.js] |
| Node built-in test runner | repo-local [VERIFIED: package.json] | Root and package contract testing | Current root and `occt-core` tests already use `node --test`. [VERIFIED: package.json] [VERIFIED: packages/occt-core/package.json] |

### Supporting

| Library / Surface | Purpose | When to Use |
|-------------------|---------|-------------|
| `BRepExtrema_DistShapeShape` | Exact minimum distance and attach points between trimmed shapes | Distance pairs, and as a fallback support probe for thickness failures. [VERIFIED: occt/src/BRepExtrema/BRepExtrema_DistShapeShape.hxx] |
| `Extrema_ExtElC` / `Extrema_ExtCC` | Analytic line-line extrema and parallel detection | Angle pairs on linear edges. [VERIFIED: occt/src/Extrema/Extrema_ExtElC.hxx] [VERIFIED: occt/src/Extrema/Extrema_ExtCC.hxx] |
| `gp_Pln` / `gp_Lin` carrier math | Stable plane-plane and line-line directions | Angle and thickness should use analytic carriers, not mesh samples. [VERIFIED: occt/src/gp/gp_Pln.hxx] [VERIFIED: occt/src/gp/gp_Lin.hxx] |

**Installation:** None; Phase 8 should add no new npm dependencies. [VERIFIED: package.json] [VERIFIED: packages/occt-core/package.json]

## Architecture Patterns

### Recommended Project Structure

```text
src/
├── importer.hpp          # shared DTO structs
├── exact-query.hpp/.cpp  # retained exact lookup and pairwise OCCT math
└── js-interface.cpp      # thin Embind parsing/serialization

test/
└── exact_pairwise_measurement_contract.test.mjs

packages/occt-core/
├── src/occt-core.js
└── test/{core,live-root-integration}.test.mjs
```

### Pattern 1: Keep pairwise lookup in the existing exact-query seam

**What:** Pairwise root APIs should reuse the current `exactModelId + exactShapeHandle + kind + elementId` lookup pattern against `ExactModelEntry.exactGeometryShapes`. [VERIFIED: src/exact-query.cpp]

**When to use:** All root pairwise queries.

**Recommendation:** Add shared helpers such as `ResolveQueryPair(...)`, `ApplyOccurrenceTransform(...)`, and `BuildWorkingPlane(...)` in `src/exact-query.cpp` rather than scattering pairwise logic across `js-interface.cpp`. [ASSUMED]

### Pattern 2: Keep `occt-core` as the occurrence-aware adapter layer

**What:** `resolveExactElementRef(...)` already returns `{ exactModelId, exactShapeHandle, kind, elementId, transform }`, and current wrappers already inverse-transform query points before calling wasm and forward-transform results afterward. [VERIFIED: packages/occt-core/src/exact-ref-resolver.js] [VERIFIED: packages/occt-core/src/occt-core.js]

**When to use:** Every public pairwise adapter in `@tx-code/occt-core`.

**Recommendation:** The new `occt-core` methods should accept two occurrence-scoped refs, validate same-model pairing in v1.1, forward both transforms to wasm, and append `{ refA, refB }` to success DTOs. [ASSUMED]

### Pattern 3: Extend the current exact-result union style

**What:** Phase 7 exact APIs already return `ok: true` success DTOs and `ok: false` failures with `code` and `message`. [VERIFIED: dist/occt-js.d.ts] [VERIFIED: src/js-interface.cpp]

**When to use:** Distance, angle, and thickness results.

**Recommendation:** Reuse that union style and add pairwise-specific codes: `parallel-geometry` and `coincident-geometry`, while keeping existing `invalid-handle`, `invalid-id`, `unsupported-geometry`, and `internal-error`. [ASSUMED]

### Recommended Root API Surface

The least-disruptive root signature keeps the current Phase 7 argument style and adds two optional transforms:

```ts
type OcctJSMatrix4 = [
  number, number, number, number,
  number, number, number, number,
  number, number, number, number,
  number, number, number, number
];

interface OcctJSPlane3 {
  origin: [number, number, number];
  normal: [number, number, number];
}

MeasureExactDistance(
  exactModelId: number,
  exactShapeHandleA: number,
  kindA: OcctJSExactElementKind,
  elementIdA: number,
  exactShapeHandleB: number,
  kindB: OcctJSExactElementKind,
  elementIdB: number,
  transformA?: OcctJSMatrix4,
  transformB?: OcctJSMatrix4
): OcctJSExactDistanceResult;

MeasureExactAngle(/* same leading args */): OcctJSExactAngleResult;
MeasureExactThickness(/* same leading args, face/face only */): OcctJSExactThicknessResult;
```

Recommended success DTOs:

```ts
interface OcctJSExactDistanceSuccess {
  ok: true;
  value: number;
  attachPointA: [number, number, number];
  attachPointB: [number, number, number];
  direction: [number, number, number];
  workingPlane: OcctJSPlane3;
}

interface OcctJSExactAngleSuccess {
  ok: true;
  family: "line-line" | "plane-plane";
  value: number;
  origin: [number, number, number];
  directionA: [number, number, number];
  directionB: [number, number, number];
  workingPlane: OcctJSPlane3;
}

interface OcctJSExactThicknessSuccess {
  ok: true;
  value: number;
  attachPointA: [number, number, number];
  attachPointB: [number, number, number];
  direction: [number, number, number];
  workingPlane: OcctJSPlane3;
}
```

These signatures are recommended, not existing. [ASSUMED]

## v1.1 Scope Boundary

### Recommended Supported Cases

| Operation | Keep In Scope for v1.1 | Why |
|----------|-------------------------|-----|
| Distance | Exact minimum distance between trimmed `face` / `edge` / `vertex` refs inside one exact model | `BRepExtrema_DistShapeShape` already supports face/edge/vertex shape distance and returns point pairs. [VERIFIED: occt/src/BRepExtrema/BRepExtrema_DistShapeShape.hxx] |
| Angle | `edge`-`edge` only when both edges classify as `line`; `face`-`face` only when both faces classify as `plane` | Phase 7 already classifies `line` and `plane`, and the SceneGraph reference keeps angle narrowed to edges or faces rather than arbitrary mixed pairs. [VERIFIED: test/exact_primitive_queries_contract.test.mjs] [VERIFIED: E:/Coding/SceneGraph.net/src/SceneGraph.OcctInterop/OcctMeasurement.cs] |
| Thickness | `face`-`face` only when both faces classify as `plane` and the carrier planes are parallel but not coincident | The SceneGraph reference treats thickness as planar face offset, and its tests explicitly reject non-parallel faces. [VERIFIED: E:/Coding/SceneGraph.net/src/SceneGraph.OcctInterop/OcctMeasurement.cs] [VERIFIED: E:/Coding/SceneGraph.net/tests/SceneGraph.OcctInterop.Tests/OcctMeasurementTests.cs] |

### Recommended Explicit Failures

| Case | Failure |
|------|---------|
| Mixed-kind angles (`face`-`edge`, `edge`-`vertex`, etc.) | `unsupported-geometry` |
| Curved-face angle cases (`cylinder`, `cone`, `sphere`, `torus`) | `unsupported-geometry` |
| Non-linear edge angles | `unsupported-geometry` |
| Parallel line-line or plane-plane angles | `parallel-geometry` |
| Coincident / zero-distance pairs that do not yield a stable direction or working plane | `coincident-geometry` |
| Thickness on non-face refs or non-planar faces | `unsupported-geometry` |
| Cross-model ref pairs in v1.1 | `unsupported-geometry` until the discuss/planning phase explicitly widens scope. [ASSUMED] |

**Important boundary:** Do not reinterpret generic edge-edge distance as nominal infinite-line distance; the SceneGraph reference splits those into separate APIs, and Phase 8 should avoid importing that semantic layer into the root contract. [VERIFIED: E:/Coding/SceneGraph.net/src/SceneGraph.OcctInterop/OcctMeasurement.cs] [VERIFIED: E:/Coding/SceneGraph.net/tests/SceneGraph.OcctInterop.Tests/OcctMeasurementTests.cs]

## Clean 3-Plan Split

### 08-01 — Root distance and angle primitives

- Add shared pairwise lookup / transform helpers in `src/exact-query.cpp` and declarations in `src/exact-query.hpp`. [VERIFIED: src/exact-query.hpp] [VERIFIED: src/exact-query.cpp]
- Add pairwise DTO structs to `src/importer.hpp` and marshaling in `src/js-interface.cpp`. [VERIFIED: src/importer.hpp] [VERIFIED: src/js-interface.cpp]
- Add root contract coverage in `test/exact_pairwise_measurement_contract.test.mjs`. [ASSUMED]
- Keep this plan limited to `MeasureExactDistance` and `MeasureExactAngle`, plus failure-code locking for `parallel-geometry` and `coincident-geometry`. [ASSUMED]

### 08-02 — Thickness and DTO hardening

- Add `MeasureExactThickness` in the same root seam and keep it plane-face-only. [ASSUMED]
- Finalize shared pairwise failure DTOs in `dist/occt-js.d.ts` so distance, angle, and thickness all use the same result vocabulary. [VERIFIED: dist/occt-js.d.ts]
- Prove explicit failure behavior for unsupported geometry and degenerate pair cases in root tests. [ASSUMED]

### 08-03 — `occt-core` adapters, docs, and release verification

- Add `measureExactDistance(refA, refB)`, `measureExactAngle(refA, refB)`, and `measureExactThickness(refA, refB)` wrappers in `packages/occt-core/src/occt-core.js`. [ASSUMED]
- Extend `packages/occt-core/test/core.test.mjs` for pure wrapper validation and `packages/occt-core/test/live-root-integration.test.mjs` for repeated-occurrence live coverage. [VERIFIED: packages/occt-core/test/core.test.mjs] [VERIFIED: packages/occt-core/test/live-root-integration.test.mjs]
- Update docs and release-governance assertions so the runtime-first release gate covers the new exact-measurement surface without pulling in viewer UX. [VERIFIED: test/release_governance_contract.test.mjs]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Trimmed-shape minimum distance | Custom vertex/triangle or endpoint-distance math | `BRepExtrema_DistShapeShape` | It already resolves minimum distance and point pairs across topological shape types. [VERIFIED: occt/src/BRepExtrema/BRepExtrema_DistShapeShape.hxx] |
| Occurrence placement of retained shapes | Manual coordinate rewriting of topology or mesh-space hacks | `BRepBuilderAPI_Transform` for rigid placement | It applies `gp_Trsf` to the exact shape layer without replacing the retained-topology seam. [VERIFIED: occt/src/BRepBuilderAPI/BRepBuilderAPI_Transform.hxx] |
| Parallel line detection | Dot-product thresholds scattered through JS | `Extrema_ExtElC` / `Extrema_ExtCC` `IsParallel()` or one central carrier helper in C++ | OCCT already models the analytic parallel case explicitly. [VERIFIED: occt/src/Extrema/Extrema_ExtElC.hxx] [VERIFIED: occt/src/Extrema/Extrema_ExtCC.hxx] |
| Release verification | Ad hoc command lists in docs | `npm run test:release:root` | The repo already treats this as the authoritative release gate. [VERIFIED: AGENTS.md] [VERIFIED: package.json] |

**Key insight:** The hard part in Phase 8 is not numeric distance; it is preserving exact occurrence placement and returning stable overlay anchors without leaking viewer policy into the runtime contract. [VERIFIED: packages/occt-core/src/exact-ref-resolver.js] [VERIFIED: packages/occt-core/test/live-root-integration.test.mjs] [ASSUMED]

## Common Pitfalls

### Pitfall 1: forgetting occurrence transforms on repeated geometry

Current exact refs become unique only after `occt-core` adds a per-occurrence transform, and the live repeated-geometry tests already rely on that split. [VERIFIED: packages/occt-core/src/exact-ref-resolver.js] [VERIFIED: packages/occt-core/test/live-root-integration.test.mjs]

**Avoidance:** Treat transform propagation as part of the pairwise API contract, not as a later adapter detail. [ASSUMED]

### Pitfall 2: returning nominal line or plane semantics from the generic distance API

The SceneGraph reference separates generic trimmed-shape distance from infinite-line distance and planar offset. [VERIFIED: E:/Coding/SceneGraph.net/src/SceneGraph.OcctInterop/OcctMeasurement.cs]

**Avoidance:** Keep `MeasureExactDistance` as trimmed-shape minimum distance; let `MeasureExactThickness` handle the carrier-plane case explicitly. [ASSUMED]

### Pitfall 3: pretending parallel or coincident angle/distance results are overlay-ready

The SceneGraph reference uses dedicated error states for parallel geometry, and Phase 8 requirements need stable directions and workplanes for annotation. [VERIFIED: E:/Coding/SceneGraph.net/src/SceneGraph.OcctInterop/OcctMeasureError.cs] [VERIFIED: .planning/ROADMAP.md]

**Avoidance:** Fail explicitly with `parallel-geometry` or `coincident-geometry` instead of guessing a plane or zero vector. [ASSUMED]

### Pitfall 4: moving too much behavior into `js-interface.cpp`

Current repo structure keeps lookup/math in `src/exact-query.cpp` and uses `src/js-interface.cpp` as a thin parser/serializer. [VERIFIED: src/exact-query.cpp] [VERIFIED: src/js-interface.cpp]

**Avoidance:** Keep new pairwise math and carrier helpers in `src/exact-query.cpp`, with only array parsing and DTO serialization in `src/js-interface.cpp`. [ASSUMED]

## Code Examples

Verified patterns worth copying into Phase 8:

### `occt-core` world/local adaptation pattern

```js
const result = module.EvaluateExactFaceNormal(
  exactRef.exactModelId,
  exactRef.exactShapeHandle,
  exactRef.kind,
  exactRef.elementId,
  inverseTransformPoint(exactRef.transform, queryPoint),
);
if (result?.ok !== true) {
  return result;
}
return {
  ok: true,
  point: transformPoint(exactRef.transform, result.localPoint),
  normal: transformDirection(exactRef.transform, result.localNormal),
  ref: exactRef,
};
```

Source: `packages/occt-core/src/occt-core.js`. [VERIFIED: packages/occt-core/src/occt-core.js]

### Root success/failure union marshaling pattern

```cpp
if (!result.ok) {
    return ExactFailureToVal(result);
}

val obj = val::object();
obj.set("ok", true);
```

Source: `src/js-interface.cpp`. [VERIFIED: src/js-interface.cpp]

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Mesh or viewer-derived pair measurements | Retained exact refs plus exact pairwise DTOs in wasm/core | Keeps v1.1 kernel-first and avoids guessed mesh answers. [VERIFIED: .planning/REQUIREMENTS.md] [VERIFIED: .planning/ROADMAP.md] |
| Definition-only single-entity exact primitives from Phase 7 | Occurrence-aware pairwise measurements layered on top of that surface | Reused assembly instances can be measured without inventing a viewer id system. [VERIFIED: .planning/phases/07-primitive-exact-geometry-queries/07-02-SUMMARY.md] [VERIFIED: packages/occt-core/src/exact-ref-resolver.js] [ASSUMED] |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Root pairwise APIs should accept occurrence transforms to preserve exact attach geometry across repeated instances. | Summary / Architecture Patterns | Repeated-instance pair measurements will need API churn or lose exact attach points. |
| A2 | v1.1 should stay same-model only for pairwise refs. | v1.1 Scope Boundary | Downstream cross-model measurement would need a wider API and more tests. |
| A3 | Parallel and coincident pair cases should fail explicitly instead of returning guessed overlay vectors. | Architecture Patterns / Common Pitfalls | Consumers may build on unstable annotation geometry and lock in bad DTO semantics. |

## Open Questions

1. **Should Phase 8 promise cross-model measurement now?**
   - What we know: current exact-model normalization, ref resolution, and live tests are all single-model flows. [VERIFIED: packages/occt-core/src/exact-model-normalizer.js] [VERIFIED: packages/occt-core/src/exact-ref-resolver.js] [VERIFIED: packages/occt-core/test/live-root-integration.test.mjs]
   - What's unclear: whether downstream code needs pairwise measurement between separately opened models.
   - Recommendation: plan same-model only unless discuss-phase explicitly widens scope. [ASSUMED]

2. **Should root pairwise APIs accept transforms, or should all pairwise composition stay in `occt-core`?**
   - What we know: distance/thickness need exact attach points, and current occurrence transforms only exist in `occt-core`. [VERIFIED: packages/occt-core/src/exact-ref-resolver.js]
   - What's unclear: whether transform-aware root inputs are acceptable to the user as part of the wasm contract.
   - Recommendation: plan transform-aware root inputs; if rejected, descope repeated-occurrence exact attach geometry from v1.1. [ASSUMED]

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | root/package tests | ✓ [VERIFIED: local shell] | `v24.14.1` [VERIFIED: local shell] | — |
| npm | repo scripts and release gate | ✓ [VERIFIED: local shell] | `11.11.0` [VERIFIED: local shell] | — |
| `build/wasm/emsdk` | `npm run build:wasm:win` | ✓ [VERIFIED: local shell] | repo-local path present [VERIFIED: local shell] | — |
| `occt/` submodule | Wasm rebuilds | ✓ [VERIFIED: local shell] | repo-local submodule present [VERIFIED: local shell] | — |
| `dist/occt-js.js/.wasm/.d.ts` | live root and release tests | ✓ [VERIFIED: local shell] | current artifacts present [VERIFIED: local shell] | Rebuild `dist/` after C++ changes. [VERIFIED: AGENTS.md] |

**Missing dependencies with no fallback:** None.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Node built-in test runner plus existing npm script orchestration. [VERIFIED: package.json] [VERIFIED: packages/occt-core/package.json] |
| Config file | none. [VERIFIED: package.json] [VERIFIED: packages/occt-core/package.json] |
| Quick run command | `node --test test/exact_pairwise_measurement_contract.test.mjs && npm --prefix packages/occt-core test` [ASSUMED] |
| Full suite command | `npm run test:release:root` [VERIFIED: package.json] [VERIFIED: AGENTS.md] |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MEAS-01 | exact pairwise distance with attach points | root contract + live integration | `node --test test/exact_pairwise_measurement_contract.test.mjs -t distance` [ASSUMED] | ❌ Wave 0 |
| MEAS-02 | exact line-line / plane-plane angle with origin + directions | root contract + wrapper unit | `node --test test/exact_pairwise_measurement_contract.test.mjs -t angle` [ASSUMED] | ❌ Wave 0 |
| MEAS-04 | exact planar thickness with explicit unsupported failures | root contract + live integration | `node --test test/exact_pairwise_measurement_contract.test.mjs -t thickness` [ASSUMED] | ❌ Wave 0 |
| MEAS-05 | shared success/failure DTOs | root contract + package unit | `node --test test/exact_pairwise_measurement_contract.test.mjs && npm --prefix packages/occt-core test` [ASSUMED] | ❌ / ✅ extend existing |
| ADAPT-01 | `occt-core` pairwise wrappers | package unit + live integration | `npm --prefix packages/occt-core test` [VERIFIED: packages/occt-core/package.json] | ✅ extend existing |
| ADAPT-02 | docs / release gate alignment | governance + full release | `npm run test:release:root` [VERIFIED: package.json] | ✅ extend existing |

### Sampling Rate

- **Per task commit:** `node --test test/exact_pairwise_measurement_contract.test.mjs && npm --prefix packages/occt-core test` [ASSUMED]
- **Per wave merge:** `npm test` [VERIFIED: package.json]
- **Phase gate:** `npm run test:release:root` [VERIFIED: package.json] [VERIFIED: AGENTS.md]

### Wave 0 Gaps

- [ ] `test/exact_pairwise_measurement_contract.test.mjs` — new root contract file for distance/angle/thickness.
- [ ] `packages/occt-core/test/core.test.mjs` — extend with pairwise wrapper validation.
- [ ] `packages/occt-core/test/live-root-integration.test.mjs` — add repeated-occurrence pairwise live coverage.
- [ ] `dist/occt-js.d.ts` — add pairwise result unions and method signatures.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V5 Input Validation | yes | Validate integer handles/ids, 16-number transforms, and finite numeric vectors before calling OCCT. [VERIFIED: src/js-interface.cpp] [VERIFIED: packages/occt-core/src/occt-core.js] |
| V6 Cryptography | no | — |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Malformed ref ids or released handles | Tampering | Preserve explicit `invalid-handle` / `invalid-id` failures before any OCCT call. [VERIFIED: dist/occt-js.d.ts] [VERIFIED: test/exact_model_lifecycle_contract.test.mjs] |
| Malformed transform / point arrays | Tampering | Reject non-finite or wrong-length arrays in JS before handing them to wasm. [VERIFIED: src/js-interface.cpp] [VERIFIED: packages/occt-core/src/occt-core.js] |
| OCCT exceptions on degenerate geometry | Denial of Service | Keep `Standard_Failure` catch-to-DTO conversion in `src/exact-query.cpp`. [VERIFIED: src/exact-query.cpp] |

## Sources

### Primary (HIGH confidence)

- `AGENTS.md` - root artifact contract, release gate, and verification boundaries checked.
- `.planning/ROADMAP.md` - Phase 8 goal, plans, and success criteria checked.
- `.planning/REQUIREMENTS.md` - MEAS / ADAPT requirement boundaries checked.
- `.planning/STATE.md` - current project decisions and next-phase state checked.
- `src/importer.hpp` - current exact DTO struct pattern checked.
- `src/exact-query.hpp` / `src/exact-query.cpp` - exact lookup seam and failure handling checked.
- `src/js-interface.cpp` - Embind parsing and DTO marshaling pattern checked.
- `dist/occt-js.d.ts` - current exact union types and public typings checked.
- `packages/occt-core/src/occt-core.js` - occurrence transform adaptation pattern checked.
- `packages/occt-core/src/exact-model-normalizer.js` - exact-model normalization boundary checked.
- `packages/occt-core/src/exact-ref-resolver.js` - occurrence-scoped ref shape checked.
- `packages/occt-core/test/core.test.mjs` / `packages/occt-core/test/live-root-integration.test.mjs` - existing wrapper and live integration seams checked.
- `test/exact_primitive_queries_contract.test.mjs` - current root exact-query contract pattern checked.
- `test/release_governance_contract.test.mjs` - release-governance assertions checked.
- `package.json` / `packages/occt-core/package.json` - script surfaces checked.
- `occt/src/BRepExtrema/BRepExtrema_DistShapeShape.hxx` - exact trimmed-shape distance capabilities checked.
- `occt/src/Extrema/Extrema_ExtCC.hxx` / `occt/src/Extrema/Extrema_ExtElC.hxx` - analytic curve extrema and parallel detection checked.
- `occt/src/BRepBuilderAPI/BRepBuilderAPI_Transform.hxx` - rigid shape placement seam checked.

### Secondary (MEDIUM confidence)

- `E:/Coding/SceneGraph.net/src/SceneGraph.OcctInterop/OcctMeasurement.cs` - reference API shape and supported measurement families checked.
- `E:/Coding/SceneGraph.net/src/SceneGraph.OcctInterop/OcctMeasurementResults.cs` - reference DTO fields checked.
- `E:/Coding/SceneGraph.net/src/SceneGraph.OcctInterop/OcctMeasureError.cs` - reference error taxonomy checked.
- `E:/Coding/SceneGraph.net/tests/SceneGraph.OcctInterop.Tests/OcctMeasurementTests.cs` - reference scope and failure-case tests checked.

### Tertiary (LOW confidence)

- None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all recommended surfaces already exist in-repo or in the vendored OCCT submodule.
- Architecture: MEDIUM - transform-aware root pair inputs and same-model-only v1.1 are still planning assumptions.
- Pitfalls: HIGH - current code and reference tests strongly agree on the risky edges.

**Research date:** 2026-04-15  
**Valid until:** 2026-05-15
