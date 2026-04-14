# Architecture Patterns

**Domain:** Exact BRep measurement foundation for the root OCCT Wasm runtime
**Researched:** 2026-04-14
**Overall confidence:** MEDIUM-HIGH

## Recommended Architecture

The clean boundary is a **two-lane runtime**:

1. Keep the current root Wasm import lane stateless: `Read*` and `AnalyzeOptimalOrientation` stay as they are.
2. Add a separate stateful exact-measurement lane for retained shapes and primitive measurements.

That split matters. The existing root contract is intentionally import-first and vendor-friendly. Exact measurement needs retained `TopoDS_Shape` state, explicit disposal, and stable topology references. Folding that into `Read*` would leak lifecycle concerns into every import consumer and would make the current root contract harder to preserve.

Recommended shape of the system:

```text
CAD bytes
  -> root wasm importers
    -> scene payload (existing stateless lane)
    -> exact model/session payload (new stateful lane)
         -> exact model store
         -> exact shape handles per extracted geometry
         -> exact topology refs (face/edge/vertex ids)
         -> primitive measurement functions

@tx-code/occt-core
  -> normalize scene payload
  -> normalize exact payload
  -> resolve placed refs from node transform + geometry handle + topology id
  -> expose engine-agnostic measurement/session helpers

Downstream app/viewer
  -> selection hits
  -> app-specific measurement UX, candidate logic, overlays, labels
```

### Why this boundary

- `src/js-interface.cpp` currently exposes only pure import/orientation functions and serializes scene DTOs directly.
- `src/importer-utils.cpp` already creates face/edge/vertex ids from `TopExp::MapShapes(...)`; that is the existing seam where exact topology identity is born.
- `packages/occt-core/src/model-normalizer.js` already acts as the engine-agnostic adaptation layer for import payloads.
- The SceneGraph reference keeps exact shape lifetime and exact measurement in a separate native layer, while selection widgets and measurement UX stay above it.

## Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| Root Wasm stateless lane | Import bytes, triangulate, return current scene DTOs | Existing `Read*`, `AnalyzeOptimalOrientation`, `occt-core importModel()` |
| Root Wasm exact model store | Retain imported exact shapes, own handles, free memory explicitly | New exact-model open/release APIs, measurement kernel |
| Root Wasm measurement kernel | Accept exact refs plus optional placement transforms, return primitive geometric facts | Exact model store, JS bindings |
| `occt-core` exact adapter | Normalize exact payloads, wrap lifecycle, resolve placed refs from scene graph data | Root Wasm exact lane, downstream apps |
| Downstream app/viewer | Picking, UX, overlays, measurement sessions, domain semantics | `occt-core` only |

## New Wasm-Side Concepts

These are the concepts worth adding. They are enough for the milestone and do not turn the repo into a viewer framework.

| Concept | Recommendation | Why |
|---------|----------------|-----|
| `ExactModelHandle` | Introduce as the public lifecycle unit for a retained import session | Gives JS one explicit thing to dispose; avoids exposing raw store internals |
| Internal exact shape store | Introduce in C++ as a refcounted registry of retained `TopoDS_Shape` data | Measurement needs retained exact geometry; JS GC is not sufficient |
| `ExactShapeHandle` | Emit per extracted geometry/subshape, not per viewer instance | Matches the current mesh extraction seam and preserves geometry reuse |
| `ExactElementRef` | Introduce as `{ shapeHandle, elementType, elementId }` | Mirrors the existing `faces` / `edges` / `vertices` ids without viewer coupling |
| Placement-aware ref | Accept as measurement input, but keep it a kernel DTO, not a Babylon hit DTO | Assemblies and reused geometry need transform context |
| Geometry classification enum | Introduce for exact edge/face kind: line, circle, plane, cylinder, sphere, cone, torus, other | Needed for radius, center, and better downstream behavior |
| Measurement result DTOs | Introduce distinct result objects per primitive with `success`, `errorCode`, `error` | Downstream apps need structured geometry facts, not UI semantics |

### Recommended DTO split

Use small, explicit DTOs instead of one mega result type.

| DTO | Fields that should exist |
|-----|--------------------------|
| `ExactModelOpenResult` | Existing scene payload plus `exactModelHandle` and per-geometry exact bindings |
| `ExactElementRef` | `shapeHandle`, `elementType`, `elementId` |
| `PlacedExactElementRef` | `shapeHandle`, `elementType`, `elementId`, `transform` |
| `DistanceResult` | `success`, `value`, `pointA`, `pointB`, `workingPlane`, `errorCode`, `error` |
| `AngleResult` | `success`, `valueRad`, `vertex`, `pointA`, `pointB`, `directionA`, `directionB`, `workingPlane`, `errorCode`, `error` |
| `RadiusResult` | `success`, `radius`, `diameter`, `center`, `axisDirection`, `anchorPoint`, `geometryType`, `errorCode`, `error` |
| `CenterResult` | `success`, `center`, `axisDirection`, `geometryType`, `errorCode`, `error` |
| `LengthResult` | `success`, `value`, `errorCode`, `error` |
| `AreaResult` | `success`, `value`, `centroid`, `normal`, `errorCode`, `error` |
| `NormalResult` | `success`, `normal`, `projectedPoint`, `errorCode`, `error` |

### Important design choice: model handle public, shape store internal

The SceneGraph reference exposes shape IDs directly and keeps a separate `OcctShapeStore`. For `occt-js`, I would not copy that public API literally.

Recommended:

- Public JS contract owns an `ExactModelHandle` or `ExactModelSession`.
- Per-geometry `ExactShapeHandle` values are included in the exact payload because topology refs need them.
- The actual refcounted store remains internal to wasm.

That keeps the public API small while still supporting reused geometry, assemblies, and explicit release.

## Where Normalization Should Happen In `@tx-code/occt-core`

`occt-core` should do the adaptation. Root wasm should stay close to kernel data.

### What stays in root wasm

- Raw exact handles
- Raw topology ids
- Raw measurement DTOs
- Exact geometry classification
- Explicit open/release functions

### What belongs in `occt-core`

- `openExactModel(...)` wrapper on top of the new wasm API
- Session object with `dispose()`
- Mapping from normalized `rootNodes` / `geometryIds` to exact handles
- Placed-ref resolution using node transforms
- Result normalization and ergonomic JS errors
- Small engine-agnostic helpers like `createFaceRef(...)`, `createEdgeRef(...)`, `measureDistance(...)`

### What should not happen in `occt-core`

- Babylon/Three/Tauri selection DTOs
- Measurement widget state machines
- Candidate generation or “smart” semantic interpretation
- Overlay placement rules or label formatting

### Recommended file split in `occt-core`

Do not overload `model-normalizer.js` with lifecycle and measurement concerns.

Recommended additions:

| File | Responsibility |
|------|----------------|
| `packages/occt-core/src/occt-core.js` | Add new exact-model entrypoints and module dispatch only |
| `packages/occt-core/src/model-normalizer.js` | Keep focused on scene import normalization |
| `packages/occt-core/src/exact-model-normalizer.js` | Normalize exact-model open payload and geometry exact bindings |
| `packages/occt-core/src/exact-ref-resolver.js` | Resolve `{ nodeId, geometryId, elementId }` into placed exact refs |
| `packages/occt-core/src/measurement-normalizer.js` | Normalize measurement DTOs and error handling |

The key architectural point is that `occt-core` should adapt **scene graph context** to **kernel refs**. That is the right place to bridge node transforms and reused geometries without introducing viewer-specific APIs into wasm.

## Main Internal Seams Likely To Change In `occt-js`

| File / seam | Why it changes |
|-------------|----------------|
| `src/js-interface.cpp` | New exact-model open/release exports, measurement exports, DTO serializers |
| `src/importer.hpp` | New exact binding fields and measurement DTO structs |
| `src/importer-utils.cpp` / `src/importer-utils.hpp` | Current topology ids are assigned here; this likely becomes the shared seam for exact refs and topology lookup alignment |
| `src/importer-xde.cpp` | Needs to register retained exact subshapes alongside current mesh extraction, while preserving assembly/local-transform behavior |
| `src/importer-brep.cpp` | Same as XDE path for BREP root extraction and exact handle registration |
| `dist/occt-js.d.ts` | Public API/types expand materially |
| `CMakeLists.txt` | New C++ translation units for exact store and measurement kernel |
| `test/` root runtime tests | New contract tests for lifecycle, refs, disposal, and measurements |

### New C++ files I expect

| File | Responsibility |
|------|----------------|
| `src/exact-model-store.hpp/.cpp` | Retained model and shape lifetime |
| `src/exact-measurement.hpp/.cpp` | Primitive measurement operations |
| `src/exact-topology.hpp/.cpp` | Shape lookup by face/edge/vertex id and geometry classification |

This is a better split than growing `importer-utils.cpp` into a catch-all file. That file already owns triangulation extraction; exact retention and exact measurement are separate concerns.

## Critical Pattern: Definition Shape + Placement Transform

This is the most important architectural seam for assemblies.

Current import behavior already separates:

- geometry definition data in `scene.meshes`
- instance placement in `scene.nodes[*].transform`

The exact-measurement foundation should preserve that same split.

Recommended rule:

- Store exact shapes in definition/local space.
- Resolve placement in `occt-core`.
- Let wasm measurement functions accept optional transforms for refs when world/instance-space math is required.

Why:

- `src/importer-xde.cpp` intentionally keeps XDE label location in node transforms.
- `TopoDS_Shape` supports locations and moved copies, so cross-instance measurement can be built without duplicating definition geometry.
- Reused geometry stays reused.

If you instead bake instance transforms into stored exact shapes, you lose reuse and quietly turn the runtime into a scene-instance manager. That is the wrong product boundary.

## Patterns To Follow

### Pattern 1: Separate stateless import from stateful exact sessions

**What:** Keep `Read*` stable and add new exact-session entrypoints instead of mutating the old import contract.

**When:** Immediately, before any measurement APIs land.

**Why:** Preserves existing consumers and makes disposal explicit only for exact-measurement users.

### Pattern 2: Resolve app picks in `occt-core`, not wasm

**What:** Convert app-facing `{ nodeId, geometryId, elementType, elementId }` data into placed exact refs in `occt-core`.

**When:** As soon as exact handles exist.

**Why:** `occt-core` already knows the normalized scene graph shape; wasm should not learn viewer hit models.

### Pattern 3: Prefer primitive APIs over semantic APIs in v1.1

**What:** Ship geometry type, distance, angle, radius, center, edge length, face area, face normal, thickness.

**When:** The whole milestone.

**Why:** Hole/chamfer semantics are app-layer composition and widen scope too early.

## Anti-Patterns To Avoid

### Anti-Pattern 1: Extending `Read*` with hidden retained-state behavior

**Why bad:** Every import would gain lifecycle coupling and disposal ambiguity.

**Instead:** Add `OpenExactModel`-style APIs beside the existing stateless APIs.

### Anti-Pattern 2: Using viewer context IDs inside wasm

**Why bad:** That copies SceneGraph’s app-level integration shape into the runtime and makes the repo more viewer-like.

**Instead:** Keep wasm refs kernel-centric; let `occt-core` and downstream apps map viewer state to them.

### Anti-Pattern 3: Treating geometry-only refs as sufficient in assemblies

**Why bad:** Reused geometry plus different node transforms makes geometry-only selection ambiguous.

**Instead:** Require placed refs or node-aware ref resolution for measurement queries.

### Anti-Pattern 4: Cramming exact-session logic into `model-normalizer.js`

**Why bad:** Import normalization and exact-session lifecycle are different concerns with different failure modes.

**Instead:** Add separate exact-model and measurement normalizers.

## Roadmap Phase Decomposition

Recommended decomposition: **4 phases**

### Phase 1: Exact Model Lifecycle Contract

**Goal:** Add the stateful exact-model lane without changing the current stateless import lane.

**Build in this phase:**
- Internal exact model / exact shape store
- New exact-model open and release exports
- Per-geometry exact shape bindings in the open result
- Type definitions and root tests for lifecycle/disposal

**Why first:** All later work depends on retained exact shapes and stable handle ownership.

### Phase 2: `occt-core` Exact Adaptation And Ref Resolution

**Goal:** Make the new exact lane consumable in downstream JS without introducing viewer coupling.

**Build in this phase:**
- `openExactModel(...)` wrapper
- Session object with `dispose()`
- Exact-model normalization
- Placed ref resolution from normalized nodes + geometry ids + topology ids

**Why second:** The raw wasm contract is not enough for real assembly usage until placed refs exist.

### Phase 3: Single-Element Exact Measurements

**Goal:** Ship the lower-risk primitives that exercise exact refs and kernel lookup without cross-ref combinatorics.

**Build in this phase:**
- Geometry classification
- Edge length
- Face area
- Face normal at point
- Radius
- Center
- Result DTO normalization and tests

**Why third:** These primitives validate the exact-session foundation with less transform complexity than pairwise measurement.

### Phase 4: Pairwise Measurements And Contract Hardening

**Goal:** Finish the high-value pairwise primitives and lock the public contract.

**Build in this phase:**
- Distance
- Angle
- Thickness
- Cross-instance transform handling
- Attach-point and working-plane DTOs
- `dist/occt-js.d.ts`, root tests, `occt-core` tests, docs/release contract updates

**Why last:** Cross-instance pairwise measurement is the hardest part and depends on every earlier seam being correct.

## Phase Ordering Rationale

1. Handles before refs: without retained exact shapes, topology refs are not useful.
2. Refs before measurements: assemblies need node-aware placed refs before exact measurement is trustworthy.
3. Single-element before pairwise: it narrows the risk surface and proves the topology/handle mapping first.
4. Hardening with pairwise work: pairwise measurement is where the final public DTOs become real, so that is the right time to freeze tests and typings.

## Scalability Considerations

| Concern | At 1 open model | At 10 open models | At long-lived app sessions |
|---------|-----------------|-------------------|----------------------------|
| Wasm memory | Explicit release is enough | Refcounted exact store becomes important | Leaks become the main risk; disposal must be tested |
| Reused geometry | Simple | Important for assemblies | Must stay definition-based, not duplicated per instance |
| Measurement throughput | Trivial | Fine | Avoid recomputing topology maps on every call; cache lookup maps per retained shape |

## Confidence And Gaps

| Area | Confidence | Notes |
|------|------------|-------|
| Separate stateless vs stateful API lanes | HIGH | Strongly supported by current repo boundary and existing public API shape |
| `occt-core` as the adaptation layer | HIGH | Matches current package role and avoids viewer-framework drift |
| Shape handle per extracted geometry definition | MEDIUM-HIGH | Strong fit with current mesh extraction seam; still needs implementation validation around reused instances |
| Placement-aware refs for assemblies | HIGH | Required by the current node-transform + reused-geometry architecture |
| Exact topology id stability across the retained shape path | MEDIUM | Current ids come from `TopExp::MapShapes(...)`; validate carefully when introducing retained shape lookup and moved/located copies |
| Face normal at point implementation details | MEDIUM | OCCT clearly supports local surface properties, but the exact point-to-UV projection path needs focused implementation work |

## Sources

### Local repository sources

- `E:/Coding/occt-js/.planning/PROJECT.md`
- `E:/Coding/occt-js/src/js-interface.cpp`
- `E:/Coding/occt-js/src/importer.hpp`
- `E:/Coding/occt-js/src/importer-utils.cpp`
- `E:/Coding/occt-js/src/importer-xde.cpp`
- `E:/Coding/occt-js/src/importer-brep.cpp`
- `E:/Coding/occt-js/packages/occt-core/src/occt-core.js`
- `E:/Coding/occt-js/packages/occt-core/src/model-normalizer.js`
- `E:/Coding/occt-js/test/load_occt_factory.mjs`
- `E:/Coding/occt-js/dist/occt-js.d.ts`

### Local reference implementation sources

- `E:/Coding/SceneGraph.net/src/SceneGraph/App/IOcctShapeStore.cs`
- `E:/Coding/SceneGraph.net/src/SceneGraph.OcctInterop/OcctShapeStore.cs`
- `E:/Coding/SceneGraph.net/src/SceneGraph.Avalonia.Inspect/Widgets/TopologyElementResolver.cs`
- `E:/Coding/SceneGraph.net/src/SceneGraph.Avalonia.Inspect/Widgets/TopologyElements.cs`
- `E:/Coding/SceneGraph.net/src/SceneGraph.OcctInterop/OcctMeasurement.cs`
- `E:/Coding/SceneGraph.net/src/SceneGraph.OcctInterop/IOcctNativeShapeApi.cs`

### Official OCCT sources

- OCCT 7.9.3 release page: https://dev.opencascade.org/release/open-cascade-technology-748
- `BRepExtrema_DistShapeShape`: https://dev.opencascade.org/doc/refman/html/class_b_rep_extrema___dist_shape_shape.html
- `BRepAdaptor_Surface`: https://dev.opencascade.org/doc/refman/html/class_b_rep_adaptor___surface.html
- `BRepAdaptor_Curve`: https://dev.opencascade.org/doc/refman/html/class_b_rep_adaptor___curve.html
- `BRepGProp`: https://dev.opencascade.org/doc/refman/html/class_b_rep_g_prop.html
- `BRepLProp_SLProps`: https://dev.opencascade.org/doc/refman/html/class_b_rep_l_prop___s_l_props.html
- `TopoDS_Shape`: https://dev.opencascade.org/doc/refman/html/class_topo_d_s___shape.html

### Research note

The requested file `E:/Coding/SceneGraph.net/src/SceneGraph/OcctInterop/Interop/IOcctInterop.cs` was not present in the checked source tree on 2026-04-14. I used the current `SceneGraph.OcctInterop` files above as the replacement reference surface.
