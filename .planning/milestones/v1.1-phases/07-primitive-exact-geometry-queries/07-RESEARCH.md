# Phase 7: Primitive Exact Geometry Queries - Research

**Researched:** 2026-04-15  
**Domain:** Exact analytic-family classification and single-entity primitive queries on retained OCCT definitions.  
**Confidence:** HIGH for phase boundary and plan split; MEDIUM for complete cone/sphere fixture coverage until execution proves the current corpus.

<user_constraints>
## User Constraints

No phase-specific `07-CONTEXT.md` exists.

Use the current milestone decisions and roadmap constraints for planning:

- Keep `occt-js` centered on the runtime-first Wasm carrier and `@tx-code/occt-core`.
- Preserve the stateless `Read*` lane and the Phase 5-6 exact lifecycle/ref-mapping contract.
- Keep exact-model state and definition-local topology lookup inside wasm.
- Keep occurrence transforms, world/local conversion, and app composition in `occt-core`.
- Keep Phase 7 limited to single-entity primitives. Pairwise measurements stay in Phase 8.
- Favor a two-plan split aligned to roadmap `07-01` and `07-02`.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| REF-03 | Downstream JS code can classify exact topology references into primitive families such as line, circle, plane, cylinder, cone, or sphere. | Classification should run in wasm from retained exact definitions and be exposed through exact-ref-aware `occt-core` wrappers. |
| MEAS-03 | Downstream JS code can measure radius, center, edge length, face area, and evaluated face normal using exact topology references. | Single-entity primitive math belongs in wasm; `occt-core` should adapt occurrence-scoped refs and world/local transforms. |
</phase_requirements>

## Summary

Phase 7 should keep the split established in Phases 5-6:

1. wasm owns retained exact definition state and definition-space OCCT queries
2. `occt-core` owns thin wrappers from occurrence-scoped exact refs into wasm query calls

The critical lookup seam is already present. [importer-utils.cpp](/E:/Coding/occt-js/src/importer-utils.cpp) assigns `face.id`, `edge.id`, and `vertex.id` from `TopExp::MapShapes(shape, ...)` on the exported definition subshape. Exact importers push that same definition `subShape` into `exactGeometryShapes` in lockstep with exported `scene.meshes` in [importer-xde.cpp](/E:/Coding/occt-js/src/importer-xde.cpp) and [importer-brep.cpp](/E:/Coding/occt-js/src/importer-brep.cpp). Phase 6 then exposed that alignment as `exactShapeHandle` in [src/js-interface.cpp](/E:/Coding/occt-js/src/js-interface.cpp) and [dist/occt-js.d.ts](/E:/Coding/occt-js/dist/occt-js.d.ts).

That means Phase 7 queries must resolve refs as:

- `exactModelId`
- `exactShapeHandle`
- topology `kind`
- `elementId`

against `ExactModelEntry.exactGeometryShapes[exactShapeHandle - 1]`.

They must not resolve against the retained root `exactShape`, because those topology ids are geometry-local and will not stay aligned to the exported per-geometry ids.

## Existing Code Seams

### Root exact state

- [src/exact-model-store.hpp](/E:/Coding/occt-js/src/exact-model-store.hpp) retains `exactShape` plus `exactGeometryShapes`.
- [src/exact-model-store.cpp](/E:/Coding/occt-js/src/exact-model-store.cpp) currently exposes lifecycle only; Phase 7 needs a read-only query seam or helper around retained entries.
- [src/js-interface.cpp](/E:/Coding/occt-js/src/js-interface.cpp) is still a thin marshaling layer and should stay that way.

### OCCT primitives already proven in-repo

- [src/orientation.cpp](/E:/Coding/occt-js/src/orientation.cpp) already uses `BRepAdaptor_Surface`, `BRepAdaptor_Curve`, `BRepGProp`, and `GeomAbs_*`, so Phase 7 should reuse that analytic seam.
- Face classification should use `BRepAdaptor_Surface(face).GetType()` and canonical accessors such as `Plane()`, `Cylinder()`, `Cone()`, `Sphere()`, `Torus()`.
- Edge classification should use `BRepAdaptor_Curve(edge)` or the `(edge, ownerFace)` overload when pcurve-only edges need deterministic context.
- Edge length and face area should use `BRepGProp::LinearProperties` and `BRepGProp::SurfaceProperties`.
- Face-normal evaluation should prefer `BRepLProp_SLProps(BRepAdaptor_Surface(face), u, v, ...)` after projecting a definition-space query point onto the trimmed face.

### Downstream adapter seam

- [packages/occt-core/src/exact-ref-resolver.js](/E:/Coding/occt-js/packages/occt-core/src/exact-ref-resolver.js) already produces `{ exactModelId, exactShapeHandle, kind, elementId, transform }`.
- [packages/occt-core/src/occt-core.js](/E:/Coding/occt-js/packages/occt-core/src/occt-core.js) is the right place for thin exact-query wrapper methods.
- `occt-core` should convert world-space query points into definition space for face-normal evaluation, then transform returned points/vectors back into occurrence space.

## Recommended Public API Direction

Recommended root query identity:

```ts
type OcctJSExactElementKind = "face" | "edge" | "vertex";

interface OcctJSExactQueryRef {
  exactModelId: number;
  exactShapeHandle: number;
  kind: OcctJSExactElementKind;
  elementId: number;
}
```

Recommended root geometry family enum:

```ts
type OcctJSExactGeometryType =
  | "unknown"
  | "line"
  | "circle"
  | "plane"
  | "cylinder"
  | "sphere"
  | "cone"
  | "torus";
```

Recommended failure family:

- `invalid-handle`
- `released-handle`
- `invalid-id`
- `unsupported-geometry`
- `query-out-of-range`
- `internal-error`

Phase 7 should expose root exact query functions for:

- geometry classification
- radius
- center
- edge length
- face area
- face-normal evaluation

`occt-core` should wrap those functions using occurrence-scoped exact refs and apply transforms where needed. It should not hide the root exact contract or grow into viewer/session logic.

## Pitfalls

### Pitfall 1: resolving topology ids on the wrong shape

Do not query the model-level root `exactShape`. Resolve topology ids on `exactGeometryShapes[exactShapeHandle - 1]`, because exported ids are geometry-local.

### Pitfall 2: projecting onto the carrier surface instead of the trimmed face

Face-normal evaluation must validate the projected UV/point against the trimmed face, not just the underlying surface bounds.

### Pitfall 3: forgetting face orientation

`BRepLProp_SLProps` gives the geometric normal. Reverse it when the face orientation is reversed, just as the mesh extractor already corrects normals in [src/importer-utils.cpp](/E:/Coding/occt-js/src/importer-utils.cpp).

### Pitfall 4: mixing occurrence transforms into wasm

Reused assemblies intentionally share one `exactShapeHandle` but differ by JS-side occurrence transform. Keep world/local conversion in `occt-core`.

### Pitfall 5: using area centroid as a guaranteed on-surface point

`GProp_GProps::CentreOfMass()` is useful metadata for face area, but it is not a safe query point for normal evaluation on curved faces.

## Fixture Strategy

The current corpus likely covers the key families needed for Wave 1:

- `cube_10x10.igs` or `simple_part.step` for line/plane
- `bearing.igs` for circle/cylinder
- `assembly.step` for repeated-geometry occurrence adaptation in `occt-core`

Cone/sphere coverage should be proven during execution or explicitly deferred with a small targeted fixture without widening scope.

## Recommended Plan Split

### 07-01 — Add geometry classification plus exact radius and center primitives

- add a read-only retained-query seam around exact model entries
- resolve exact refs from `exactModelId + exactShapeHandle + kind + elementId`
- add root classification, radius, and center bindings plus typings
- add thin `occt-core` wrappers that consume occurrence-scoped exact refs

### 07-02 — Add exact edge length, face area, and face-normal evaluation contracts

- add root edge-length, face-area, and face-normal bindings plus typings
- keep primitive math exact and definition-scoped in wasm
- add transform-aware `occt-core` wrappers for world/local query-point handling
- validate repeated-geometry normal evaluation through live integration

## Validation Architecture

| Property | Value |
|----------|-------|
| Framework | Node built-in test runner plus existing repo integration scripts |
| Quick run command | `node --test test/exact_primitive_queries_contract.test.mjs && npm --prefix packages/occt-core test` |
| Full suite command | `npm run build:wasm:win && node --test test/exact_primitive_queries_contract.test.mjs && npm --prefix packages/occt-core test && npm test` |

Wave 0 gaps:

- `test/exact_primitive_queries_contract.test.mjs` does not exist yet
- `dist/occt-js.d.ts` has no exact query typings yet
- `occt-core` has no exact primitive-query wrappers yet
- retained exact models have no query/read accessor today

## Sources

- [AGENTS.md](/E:/Coding/occt-js/AGENTS.md)
- [.planning/ROADMAP.md](/E:/Coding/occt-js/.planning/ROADMAP.md)
- [.planning/REQUIREMENTS.md](/E:/Coding/occt-js/.planning/REQUIREMENTS.md)
- [.planning/STATE.md](/E:/Coding/occt-js/.planning/STATE.md)
- [src/js-interface.cpp](/E:/Coding/occt-js/src/js-interface.cpp)
- [src/exact-model-store.hpp](/E:/Coding/occt-js/src/exact-model-store.hpp)
- [src/exact-model-store.cpp](/E:/Coding/occt-js/src/exact-model-store.cpp)
- [src/importer-utils.cpp](/E:/Coding/occt-js/src/importer-utils.cpp)
- [src/orientation.cpp](/E:/Coding/occt-js/src/orientation.cpp)
- [dist/occt-js.d.ts](/E:/Coding/occt-js/dist/occt-js.d.ts)
- [packages/occt-core/src/occt-core.js](/E:/Coding/occt-js/packages/occt-core/src/occt-core.js)
- [packages/occt-core/src/exact-ref-resolver.js](/E:/Coding/occt-js/packages/occt-core/src/exact-ref-resolver.js)
- [packages/occt-core/test/live-root-integration.test.mjs](/E:/Coding/occt-js/packages/occt-core/test/live-root-integration.test.mjs)
- [test/cube_10x10.igs](/E:/Coding/occt-js/test/cube_10x10.igs)
- [test/bearing.igs](/E:/Coding/occt-js/test/bearing.igs)
- [test/simple_part.step](/E:/Coding/occt-js/test/simple_part.step)
- [test/assembly.step](/E:/Coding/occt-js/test/assembly.step)
- [E:/Coding/SceneGraph.net/src/SceneGraph.OcctInterop/OcctMeasurement.cs](</E:/Coding/SceneGraph.net/src/SceneGraph.OcctInterop/OcctMeasurement.cs>)
- [E:/Coding/SceneGraph.net/src/SceneGraph.OcctInterop/OcctMeasurementResults.cs](</E:/Coding/SceneGraph.net/src/SceneGraph.OcctInterop/OcctMeasurementResults.cs>)
