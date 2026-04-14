# Phase 6: Occurrence-Scoped Exact Ref Mapping - Research

**Researched:** 2026-04-14  
**Domain:** Mapping current exported face/edge/vertex ids onto retained exact geometry definitions and occurrence-scoped refs for downstream JS measurement.  
**Confidence:** HIGH for boundary and plan split; MEDIUM for exact binding data shape until the root exact-open contract is extended.

<user_constraints>
## User Constraints

No phase-specific `06-CONTEXT.md` exists.

Use the current milestone decisions and roadmap constraints for planning:

- Keep `occt-js` centered on the runtime-first Wasm carrier and `occt-core`.
- Do not introduce a viewer-specific id system; reuse the ids already exported in `faces`, `edges`, `vertices`, and `triangleToFaceMap`.
- Preserve the current stateless `Read*` lane and the Phase 5 exact-model lifecycle lane.
- Keep app-side selection UX, candidate logic, and overlay rendering downstream.
- Favor a two-plan split aligned to the roadmap titles `06-01` and `06-02`.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| REF-01 | Downstream JS code can address exact face, edge, and vertex elements through a stable reference shape that includes exact-model identity and enough occurrence context for repeated measurement calls. | The ref DTO should combine the retained `exactModelId`, a definition-level exact shape handle, current `nodeId` / `geometryId`, element kind/id, and the resolved occurrence transform. |
| REF-02 | Downstream JS code can resolve exact face, edge, and vertex references from the ids already exported in the current mesh/topology payload through an explicit imported-topology-id mapping layer instead of introducing a second viewer-specific id system. | The root exact-open lane should expose per-geometry exact definition bindings, while `occt-core` should map existing `nodeId` / `geometryId` / `elementId` data into occurrence-scoped exact refs with explicit invalid-id and occurrence-mismatch failures. |
</phase_requirements>

## Summary

Phase 6 should keep the split established in Phase 5:

1. the root Wasm carrier owns retained exact state and exact definition bindings
2. `occt-core` owns resolution from scene-graph ids into occurrence-scoped exact refs

The current topology ids are already born in the right place. [importer-utils.cpp](/E:/Coding/occt-js/src/importer-utils.cpp) assigns `faces[].id`, `edges[].id`, `vertices[].id`, and `triangleToFaceMap` from `TopExp::MapShapes(...)` on the extracted subshape. Those ids are definition-local. [importer-xde.cpp](/E:/Coding/occt-js/src/importer-xde.cpp) and [importer-brep.cpp](/E:/Coding/occt-js/src/importer-brep.cpp) then reuse definition geometry by `TShape` pointer and keep placement in `scene.nodes[*].transform`. That means the correct Phase 6 boundary is:

- root exact open returns one exact definition binding per exported geometry definition
- `occt-core` combines that binding with existing `nodeId`, `geometryId`, and element ids to create an occurrence-scoped exact ref

That avoids a second viewer id system. It also matches the downstream reality in `imos-app`: normalized model data already keeps `geometryId`, `nodeId`, `faces`, `edges`, `vertices`, and `triangleToFaceMap`, while Babylon pick metadata currently carries `entityId=nodeId`, `geometryId`, and `modelId`. The missing piece is not new picking ids; it is a stable resolver that can say “this face id on this geometry definition under this node maps to this retained exact definition handle and this occurrence transform.”

## Existing Code Seams

### Root exact state today

- [src/js-interface.cpp](/E:/Coding/occt-js/src/js-interface.cpp) now exposes `OpenExact*`, `RetainExactModel`, and `ReleaseExactModel`, but the exact-open result only adds `exactModelId`.
- [src/exact-model-store.cpp](/E:/Coding/occt-js/src/exact-model-store.cpp) retains only the model-level root shape today; it does not yet track exported geometry definitions or topology-id lookup metadata.
- [dist/occt-js.d.ts](/E:/Coding/occt-js/dist/occt-js.d.ts) has lifecycle typing, but nothing for exact geometry bindings or exact refs.

### Geometry-definition seam

- [src/importer-utils.cpp](/E:/Coding/occt-js/src/importer-utils.cpp) builds mesh-local face/edge/vertex ids from `TopExp::MapShapes(shape, ...)`. This is the imported-topology-id seam that later exact queries must respect.
- [src/importer-xde.cpp](/E:/Coding/occt-js/src/importer-xde.cpp) deduplicates exported geometry definitions by `TShape` pointer and stores instance placement in `scene.nodes[*].transform`.
- [src/importer-brep.cpp](/E:/Coding/occt-js/src/importer-brep.cpp) does the same definition-vs-instance split for BREP root extraction.

### Downstream consumer seam

- [packages/occt-core/src/model-normalizer.js](/E:/Coding/occt-js/packages/occt-core/src/model-normalizer.js) preserves `geometryId`, `nodeId`, `faces`, `edges`, `vertices`, and `triangleToFaceMap` in a runtime-agnostic model.
- [E:/Coding/imos-app/packages/viewer-occt/src/loadOcctModel.ts](</E:/Coding/imos-app/packages/viewer-occt/src/loadOcctModel.ts>) keeps those ids intact when adapting to viewer-core descriptors.
- [E:/Coding/imos-app/packages/viewer-babylon/src/web-runtime.ts](</E:/Coding/imos-app/packages/viewer-babylon/src/web-runtime.ts>) stores Babylon pick metadata as `entityId=nodeId`, `geometryId`, `modelId`, and `kind`.
- [E:/Coding/imos-app/packages/viewer-babylon/src/bindOcctMeshSelection.ts](</E:/Coding/imos-app/packages/viewer-babylon/src/bindOcctMeshSelection.ts>) currently publishes face selections as `${nodeId}:face:${faceId}` plus `modelId`; it does not persist `geometryId` in the selection item, which is a real ambiguity risk when one node can reference multiple geometries sharing local face ids.

## Recommended Public API Direction

Phase 6 should add two public shapes, one on the root Wasm side and one on the `occt-core` side.

### Root Wasm exact-definition bindings

The root exact-open result should become:

```ts
interface OcctJSExactGeometryBinding {
  exactShapeHandle: number;
}

interface OcctJSExactOpenResult extends OcctJSResult {
  exactModelId?: number;
  exactGeometryBindings?: OcctJSExactGeometryBinding[];
}
```

Important properties of this shape:

- `exactGeometryBindings` stays definition-scoped and index-aligned with `geometries`
- the binding count must match `geometries.length`
- the local topology ids already exported on each geometry remain authoritative; the binding only tells later phases which retained exact definition they belong to

### `occt-core` occurrence-scoped refs

`occt-core` should expose a resolver result similar to:

```ts
type OcctExactElementKind = "face" | "edge" | "vertex";

interface OcctExactElementRef {
  exactModelId: number;
  exactShapeHandle: number;
  nodeId: string;
  geometryId: string;
  kind: OcctExactElementKind;
  elementId: number;
  transform: number[];
}

interface OcctExactRefFailure {
  ok: false;
  code: "invalid-handle" | "invalid-id" | "occurrence-mismatch";
  message: string;
}
```

The resolver can be a pure helper in `occt-core`. It does not need to be a root Wasm binding in this phase.

## Why This Split Is Correct

- The imported topology ids are definition-local, so the root exact lane should stay definition-local too.
- Occurrence context comes from the scene graph (`nodeId` + accumulated transform), not from the imported geometry definition.
- `imos-app` already has `nodeId`, `geometryId`, `triangleToFaceMap`, and face/edge/vertex ids at pick time; a resolver can consume that directly without inventing Babylon-specific ids.
- The SceneGraph reference keeps exact shape lifetime separate from measurement UX; that is the right product boundary here too.

## Required Failure Semantics

Phase 6 should freeze ref-resolution failures early so measurement phases do not guess around ambiguity.

Minimum explicit failures:

- `invalid-handle`
  - the caller supplies an unknown or released `exactModelId`
- `invalid-id`
  - `geometryId` does not exist, or the requested face/edge/vertex id is not present on that geometry definition
- `occurrence-mismatch`
  - `geometryId` exists, but the supplied `nodeId` does not reference that geometry in the current normalized scene graph

These should be resolver failures, not silent fallbacks.

## Concrete Downstream Risks

### Risk 1: `nodeId + faceId` is not enough when a node has multiple geometries

`bindOcctMeshSelection.ts` publishes face selections as `${nodeId}:face:${faceId}`. If one node references multiple geometry definitions that each have face `1`, that selection shape becomes ambiguous unless the app also keeps `geometryId`.

### Risk 2: geometry reuse means definition identity and occurrence identity must stay separate

In assemblies such as [assembly.step](/E:/Coding/occt-js/test/assembly.step), multiple nodes can reuse one exported geometry definition. Those refs should share `exactShapeHandle` but differ in `nodeId` and `transform`.

### Risk 3: geometry-only refs are insufficient for pairwise measurement

Definition-only refs cannot distinguish two repeated placements of the same part. Phase 6 must preserve occurrence context now so Phase 8 can measure between repeated instances correctly.

## Pitfalls

### Pitfall 1: baking world transforms into retained exact shapes

That would destroy geometry reuse and turn the runtime into an instance manager.

### Pitfall 2: returning viewer-facing ids from Wasm

The root runtime should not learn Babylon or app selection DTOs. `nodeId`/`geometryId` resolution belongs in `occt-core`.

### Pitfall 3: assuming `triangleToFaceMap` alone solves ref resolution

`triangleToFaceMap` only maps picked triangles to face ids. Edge and vertex refs still need the exact geometry definition binding, and repeated geometry instances still need occurrence context.

## Recommended Plan Split

### 06-01 — Add internal imported-topology-id mapping and exact-definition binding DTOs

Own the root Wasm seam:

- extend retained exact-model state with per-geometry exact definition bindings
- keep exported topology ids aligned with those bindings
- expose `exactGeometryBindings` on exact-open results and in `dist/occt-js.d.ts`
- add root contract tests for geometry-binding alignment and reused-definition coverage

### 06-02 — Expose core-side ref resolution from normalized model data and repeated-call validation

Own the `occt-core` seam:

- normalize the root exact-open binding payload into geometry-id keyed metadata
- resolve `nodeId + geometryId + kind + elementId` into occurrence-scoped exact refs
- return explicit `invalid-handle`, `invalid-id`, and `occurrence-mismatch` failures
- prove repeated geometry instances share definition handles but differ by occurrence context

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Node built-in test runner plus existing Node integration scripts |
| Config file | none — direct `node --test` invocation |
| Quick run command | `node --test test/exact_ref_mapping_contract.test.mjs && npm --prefix packages/occt-core test` |
| Full suite command | `npm run build:wasm:win && node --test test/exact_ref_mapping_contract.test.mjs && npm --prefix packages/occt-core test && npm test` |

### Wave 0 gaps

- `test/exact_ref_mapping_contract.test.mjs` does not exist yet and should be added in this phase.
- `packages/occt-core` has no exact-ref normalizer or resolver surface today.
- `dist/occt-js.d.ts` needs exact-definition binding types before `occt-core` can normalize them.

## Sources

- [AGENTS.md](/E:/Coding/occt-js/AGENTS.md)
- [.planning/ROADMAP.md](/E:/Coding/occt-js/.planning/ROADMAP.md)
- [.planning/REQUIREMENTS.md](/E:/Coding/occt-js/.planning/REQUIREMENTS.md)
- [.planning/STATE.md](/E:/Coding/occt-js/.planning/STATE.md)
- [src/importer.hpp](/E:/Coding/occt-js/src/importer.hpp)
- [src/importer-utils.cpp](/E:/Coding/occt-js/src/importer-utils.cpp)
- [src/importer-xde.cpp](/E:/Coding/occt-js/src/importer-xde.cpp)
- [src/importer-brep.cpp](/E:/Coding/occt-js/src/importer-brep.cpp)
- [src/exact-model-store.cpp](/E:/Coding/occt-js/src/exact-model-store.cpp)
- [src/js-interface.cpp](/E:/Coding/occt-js/src/js-interface.cpp)
- [packages/occt-core/src/model-normalizer.js](/E:/Coding/occt-js/packages/occt-core/src/model-normalizer.js)
- [E:/Coding/imos-app/packages/viewer-occt/src/loadOcctModel.ts](</E:/Coding/imos-app/packages/viewer-occt/src/loadOcctModel.ts>)
- [E:/Coding/imos-app/packages/viewer-babylon/src/web-runtime.ts](</E:/Coding/imos-app/packages/viewer-babylon/src/web-runtime.ts>)
- [E:/Coding/imos-app/packages/viewer-babylon/src/bindOcctMeshSelection.ts](</E:/Coding/imos-app/packages/viewer-babylon/src/bindOcctMeshSelection.ts>)
- [E:/Coding/SceneGraph.net/src/SceneGraph/App/IOcctShapeStore.cs](</E:/Coding/SceneGraph.net/src/SceneGraph/App/IOcctShapeStore.cs>)
- [E:/Coding/SceneGraph.net/src/SceneGraph.OcctInterop/OcctShapeStore.cs](</E:/Coding/SceneGraph.net/src/SceneGraph.OcctInterop/OcctShapeStore.cs>)
