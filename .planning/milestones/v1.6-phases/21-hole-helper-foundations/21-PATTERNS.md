# Phase 21: Hole Helper Foundations - Pattern Map

**Mapped:** 2026-04-18
**Files analyzed:** 9 scoped files
**Analogs found:** 9 / 9

Phase 21 extends the existing exact semantics surface from measurement/placement/relation primitives into one-ref semantic helpers. The safest implementation pattern is: keep `@tx-code/occt-core` package-first, mirror the existing single-ref wrapper behavior from `suggestExactRadiusPlacement`, reuse the shipped placement frame and anchor DTO vocabulary, and if carrier help is required, add one narrow selected-ref query that follows the current `MeasureExactRadius` / `SuggestExactRadiusPlacement` binding shape instead of introducing generic topology or discovery APIs.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `packages/occt-core/src/occt-core.js` | source wrapper | package-first helper surface | current file (`suggestExactRadiusPlacement`, `measureExactRadius`) | exact |
| `packages/occt-core/test/core.test.mjs` | unit/contract test | mocked wrapper parity | current file | exact |
| `packages/occt-core/test/live-root-integration.test.mjs` | live integration test | package-to-built-carrier parity | current file | exact |
| `src/importer.hpp` | DTO structs | carrier result surface | current file (`OcctExactPlacementResult`, `OcctExactRelationResult`) | partial |
| `dist/occt-js.d.ts` | public typings | JS carrier contract | current file (`OcctJSExactPlacementResult`, `OcctJSExactQueryFailure`) | partial |
| `src/exact-query.hpp` / `src/exact-query.cpp` | carrier query | retained exact topology + analytic geometry | current file (`MeasureExactRadius`, `SuggestExactRadiusPlacement`, `ClassifyExactRelation`) | partial |
| `src/js-interface.cpp` | Embind binding | carrier-to-JS serialization | current file | exact |
| `test/exact_hole_contract.test.mjs` | root contract test | retained-model verification | `test/exact_placement_contract.test.mjs` | partial |
| `test/simple_hole.step` | fixture | deterministic supported hole geometry | `test/simple_part.step`, `test/bearing.igs` | partial |

## Pattern Assignments

### `packages/occt-core/src/occt-core.js` (source wrapper, package-first helper surface)

**Scope:** Required. This is the primary downstream API surface for Phase 21.

**Analog:** existing single-ref wrappers in the same file

**Single-ref wrapper pattern** (`packages/occt-core/src/occt-core.js`):
```javascript
async suggestExactRadiusPlacement(ref) {
  const module = await this._ensureModule();
  const exactRef = validateExactRef(ref, "suggestExactRadiusPlacement");
  ...
  return {
    ...result,
    frame: transformPlacementFrame(exactRef.transform, result.frame),
    anchors: transformPlacementAnchors(exactRef.transform, result.anchors),
    axisDirection: result.axisDirection ? transformDirection(exactRef.transform, result.axisDirection) : result.axisDirection,
    ref: exactRef,
  };
}
```

**Query-wrapper pattern** (`packages/occt-core/src/occt-core.js`):
```javascript
async measureExactRadius(ref) {
  const result = module.MeasureExactRadius(...);
  if (result?.ok !== true) {
    return result;
  }
  return {
    ok: true,
    family: result.family,
    radius: result.radius,
    ...
    ref: exactRef,
  };
}
```

Planner note: `describeExactHole(ref)` should follow this exact wrapper rhythm: validate one occurrence-scoped ref, call one carrier method, transform only the geometric fields that are in local space, and append `ref` on success.

---

### `packages/occt-core/test/core.test.mjs` (unit test, mocked wrapper parity)

**Scope:** Required. This is the fastest place to lock the package DTO shape before live carrier work lands.

**Analog:** current wrapper tests for placement and radius helpers

**Mocked wrapper contract pattern** (`packages/occt-core/test/core.test.mjs` around circular placement):
```javascript
const core = createOcctCore({
  factory: async () => ({
    SuggestExactRadiusPlacement: () => ({ ok: true, ... }),
  }),
});

const result = await core.suggestExactRadiusPlacement(ref);
assert.deepEqual(result, { ... expected occurrence-space DTO ... });
```

Planner note: add `describeExactHole(ref)` tests here first. Keep them mocked and occurrence-transform-aware so Plan 21-01 can go green without a live root implementation.

---

### `src/importer.hpp`, `dist/occt-js.d.ts`, and `src/js-interface.cpp` (DTOs + binding)

**Scope:** Required if the package helper needs a new carrier query.

**Analog:** the current placement and relation DTO/binding surfaces

**Carrier DTO pattern** (`src/importer.hpp`):
```cpp
struct OcctExactPlacementResult {
    bool ok = false;
    std::string code;
    std::string message;
    std::string kind;
    ...
    OcctExactPlacementFrame frame;
    std::vector<OcctExactPlacementAnchor> anchors;
};
```

**Typing pattern** (`dist/occt-js.d.ts`):
```ts
export interface OcctJSExactPlacementSuccess {
    ok: true;
    kind: OcctJSExactPlacementKind;
    ...
}

export type OcctJSExactPlacementResult = OcctJSExactPlacementSuccess | OcctJSExactPairwiseFailure;
```

**Binding pattern** (`src/js-interface.cpp`):
```cpp
val SuggestExactRadiusPlacementBinding(int exactModelId, int exactShapeHandle, const std::string& kind, int elementId)
{
    return SerializeExactPlacementResult(
        SuggestExactRadiusPlacement(exactModelId, exactShapeHandle, kind, elementId)
    );
}
```

Planner note: if Phase 21 adds `DescribeExactHole`, keep the DTO additive and reuse the established `ok/code/message` plus frame/anchors vocabulary where it fits. Do not invent a second binding style.

---

### `src/exact-query.hpp` / `src/exact-query.cpp` (carrier query logic)

**Scope:** Required for the minimal root addition.

**Analog:** single-ref analytic helpers plus relation classification

**Single-ref analytic query analog** (`src/exact-query.cpp`):
```cpp
const OcctExactRadiusResult radius = MeasureExactRadius(exactModelId, exactShapeHandle, kind, elementId);
...
return MakeFailure<OcctLifecycleResult>("unsupported-geometry", "...");
```

**Selected-ref semantic-classification analog** (`src/exact-query.cpp`):
```cpp
if (normalizedKindA == "edge" && normalizedKindB == "face") {
    ...
}
return MakeFailure<OcctExactRelationResult>("unsupported-geometry", "...");
```

Planner note: a hole descriptor should canonicalize one selected edge/face ref into the supported cylindrical-hole topology, derive semantic metadata only when robust, and return explicit `unsupported-geometry`-style failures for everything out of scope.

---

### `test/exact_hole_contract.test.mjs` and `test/simple_hole.step` (root contract + fixture)

**Scope:** Required. Phase 21 needs a deterministic supported case and a root contract gate.

**Analog:** `test/exact_placement_contract.test.mjs` plus small retained-model fixtures such as `test/simple_part.step`

**Root contract harness pattern** (`test/exact_placement_contract.test.mjs`):
```javascript
const module = await createModule();
const stepBytes = await loadFixture("simple_part.step");
const result = module.OpenExactStepModel(stepBytes, {});
...
const placement = module.SuggestExactRadiusPlacement(...);
assert.equal(placement?.ok, true);
```

Planner note: add a dedicated small hole fixture if the current broader fixtures do not expose a stable cylindrical-hole case. Keep the root contract focused on one selected ref in, semantic DTO out.

---

### `packages/occt-core/test/live-root-integration.test.mjs` (package live integration)

**Scope:** Required after the carrier method exists.

**Analog:** current live tests for relation and circular placement parity

**Live integration pattern** (`packages/occt-core/test/live-root-integration.test.mjs`):
```javascript
const exact = await core.openExactStep(stepBytes, ...);
const ref = resolveExactElementRef(exact, ...);
const placement = await core.suggestExactRadiusPlacement(ref);
```

Planner note: reuse this harness for `describeExactHole(ref)` so Phase 21 proves occurrence-space parity against the built carrier, not just mocked wrapper behavior.

## Shared Patterns

### Package-first semantic wrapper

**Source:** `packages/occt-core/src/occt-core.js`

Expose the downstream API from `@tx-code/occt-core` first. The root carrier stays the lower-level reference surface and should only grow by the minimum selected-ref method the package helper needs.

### Reuse placement frame and anchor vocabulary

**Source:** `src/importer.hpp`, `dist/occt-js.d.ts`, `packages/occt-core/src/occt-core.js`

Hole semantics should reuse the already-shipped frame and anchor concepts wherever possible, so later helper families can compose over one geometric vocabulary instead of multiple bespoke DTO shapes.

### Contract-first before live carrier work

**Source:** `packages/occt-core/test/core.test.mjs`, `test/exact_placement_contract.test.mjs`

Lock the package helper DTO shape with mocked tests first, then add the root contract and live integration once the carrier method name and DTO are fixed.

## No Analog Found

None. Every planned Phase 21 artifact has a direct in-repo analog from the exact measurement, placement, or relation work.

## Metadata

**Analog search scope:** `packages/occt-core/`, `src/`, `dist/`, `test/`, docs/spec references  
**Files scanned:** 12  
**Pattern extraction date:** 2026-04-18
