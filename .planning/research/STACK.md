# Technology Stack

**Project:** occt-js v1.1 `Exact BRep Measurement Foundation`
**Researched:** 2026-04-14
**Overall confidence:** HIGH

## Recommended Stack

This milestone does **not** need new third-party packages. The repo already vendors the exact OCCT toolkits needed for BRep measurement in the root wasm carrier, and the missing work is API/lifecycle plumbing, not ecosystem expansion.

The key design choice is:

- keep exact geometry ownership in the root wasm package
- keep normalized JS ergonomics in `@tx-code/occt-core`
- keep pick resolution, selection state, units display, and overlays in downstream apps

### Core Framework

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| OCCT vendored in `occt/` | 7.9.3 | Exact BRep measurement kernel | Already present and already compiled with the needed modules: `BRepExtrema`, `BRepGProp`, `BRepAdaptor`, `GeomAPI`, `GeomLProp`, `TopExp`, `gp`, `BRepClass3d`. |
| Root wasm carrier `@tx-code/occt-js` | 0.1.7 surface, new v1.1 API additions | Own exact shape retention and measurement bindings | This is the strategic runtime boundary and already ships the tracked `dist/occt-js.d.ts` contract. |
| `@tx-code/occt-core` | 0.1.7 surface, new v1.1 API additions | Normalize exact bindings to `geometryId`/`nodeId` aware JS APIs | Downstream apps already consume `createOcctCore()` and rely on normalized geometry ids like `geo_0`. |

### Measurement Kernel Additions Inside Root Wasm

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Internal exact-shape registry (new C++ files) | repo code | Retain per-geometry `TopoDS_Shape` handles and refcounts behind integer `shapeId` values | Current import flow extracts triangulation and drops exact shapes after returning JS objects. |
| `BRepExtrema_DistShapeShape` | OCCT 7.9.3 | Exact minimum-distance queries | Correct kernel choice for face/edge/vertex distance. Avoids mesh-space approximations. |
| `BRepGProp` | OCCT 7.9.3 | Edge length and face area | Already used in `orientation.cpp`; no new external dependency needed. |
| `BRepAdaptor_Curve` + `BRepAdaptor_Surface` | OCCT 7.9.3 | Geometry classification for angle/radius/center/thickness | Needed to validate “line”, “plane”, “circle”, “cylinder”, “sphere” cases cleanly. |
| `GeomAPI_ProjectPointOnSurf` + `GeomLProp_SLProps` | OCCT 7.9.3 | Face normal evaluation at a query point | This is the right exact-surface path for “normal at point”, not a mesh-normal lookup. |

### Supporting Package Additions

| Library / Package Surface | Version | Purpose | When to Use |
|---------------------------|---------|---------|-------------|
| `dist/occt-js.d.ts` (tracked) | repo code | Publish the new low-level exact APIs in the root package | Always update this manually when adding wasm exports. |
| `packages/occt-core` authored `.d.ts` | repo code | Ship first-class types for downstream TS consumers | Required in v1.1 because `imos-app` currently carries a local ambient declaration for `@tx-code/occt-core`. |
| `packages/occt-core` exact-session wrapper | repo code | Map root `geometryIndex -> shapeId` bindings into normalized `geometryId` refs and grouped disposal | Use when apps want measurement capability on top of the normalized model contract. |

## What Is Missing Today

### Exact Runtime/API Primitives Missing Now

| Missing primitive | Current state | Why it blocks v1.1 |
|-------------------|--------------|--------------------|
| Exact shape retention | `Read*File` returns triangulated scene data only | There is no exact kernel object left to measure after import. |
| Stable geometry-to-shape binding | Current result exposes `faces[].id`, `edges[].id`, `vertices[].id`, but no `shapeId` for the geometry they belong to | The topology ids are already useful; the missing piece is the retained exact shape they index into. |
| Release/refcount API | No `AddRef` / `Release` equivalent in wasm | Downstream apps cannot safely cache exact shapes across selection/measurement flows. |
| Exact measurement entrypoints | Root wasm exposes import and orientation only | No distance, angle, radius, center, edge-length, face-area, face-normal, or thickness functions exist today. |
| Official `@tx-code/occt-core` types | Package exports JS only | `imos-app` ships its own incomplete ambient types, which will not scale to the new exact surface. |

The important repo-specific conclusion is that **topology ids themselves are not the problem**. `src/importer-utils.cpp` already emits 1-based face/edge/vertex ids and `triangleToFaceMap` aligned to the extracted shape. v1.1 should reuse those ids, not invent a second topology numbering scheme.

## Recommended API Inventory

### Root Wasm: `@tx-code/occt-js`

Recommended additions to `dist/occt-js.d.ts` and `src/js-interface.cpp`:

| API | Return / Input | Why it belongs here |
|-----|----------------|---------------------|
| `ReadFileExact(format, content, params?)` | `OcctJSExactResult` | Import once, return the existing scene payload plus exact geometry bindings. |
| `ReadStepFileExact`, `ReadIgesFileExact`, `ReadBrepFileExact` | `OcctJSExactResult` | Keep parity with the existing import API style. |
| `ShapeAddRef(shapeId)` | `void` | Low-level lifetime control must stay with the wasm owner of the shape. |
| `ShapeRelease(shapeId)` | `void` | Required for deterministic cleanup. |
| `MeasureDistance(a, b)` | `OcctJSDistanceResult` | Exact kernel operation; should not be reimplemented in JS. |
| `MeasureAngle(a, b)` | `OcctJSAngleResult` | Exact kernel operation; planar-face / linear-edge validation belongs in OCCT. |
| `MeasureRadius(target)` | `OcctJSRadiusResult` | Needs exact surface/curve interrogation. |
| `MeasureCenter(target)` | `OcctJSCenterResult` | Needs exact rotational geometry interrogation. |
| `MeasureEdgeLength(target)` | `OcctJSScalarResult` | Exact edge length via `BRepGProp`. |
| `MeasureFaceArea(target)` | `OcctJSAreaResult` | Exact face area via `BRepGProp`. |
| `MeasureFaceNormalAtPoint(target, point)` | `OcctJSNormalResult` | Exact surface normal evaluation on the BRep face. |
| `MeasureThickness(a, b)` | `OcctJSDistanceResult` | Specialized planar-face distance is kernel logic, not viewer logic. |

Recommended root types:

| Type | Shape |
|------|-------|
| `OcctJSExactResult` | `OcctJSResult` plus `exact.geometryBindings: OcctJSExactGeometryBinding[]` |
| `OcctJSExactGeometryBinding` | `{ geometryIndex: number; shapeId: number }` |
| `OcctJSTopologyRef` | `{ shapeId: number; kind: "face" | "edge" | "vertex"; id: number; transform?: number[] }` |
| `OcctJSScalarResult` | `{ success, error?, value? }` |
| `OcctJSDistanceResult` | `{ success, error?, value?, pointA?, pointB?, workingPlane? }` |
| `OcctJSAngleResult` | `{ success, error?, value?, vertex?, pointA?, pointB?, workingPlane? }` |
| `OcctJSRadiusResult` | `{ success, error?, radius?, diameter?, center?, anchorPoint?, normal?, isSphere? }` |
| `OcctJSCenterResult` | `{ success, error?, center?, axisDirection?, geometryType? }` |
| `OcctJSAreaResult` | `{ success, error?, value?, centroid?, normal? }` |
| `OcctJSNormalResult` | `{ success, error?, normal? }` |

Recommended root behavior:

- Reuse existing face/edge/vertex ids from the extracted geometry.
- Return `geometryIndex -> shapeId`, not a new face-id remapping table.
- Allow optional `transform` on `OcctJSTopologyRef` so reused geometry instances can be measured in instance space without duplicating shapes in wasm.

### `@tx-code/occt-core`

Recommended additions:

| API | Return / Input | Why it belongs here |
|-----|----------------|---------------------|
| `importModelExact(content, options)` | `{ model: OcctCoreModel; exact: OcctCoreExactSession }` | Keeps existing `importModel()` stable for mesh-only consumers while adding an explicit measurement-capable path. |
| `exact.dispose()` | `void` | Group-release all retained `shapeId` values acquired during the import. |
| `exact.createTopologyRef({ geometryId, kind, id, nodeId? })` | `OcctCoreTopologyRef` | Convert normalized geometry ids plus optional node instance identity into wasm-ready refs. |
| `exact.measureDistance(a, b)` and sibling methods | measurement result DTOs | JS ergonomic wrapper over root wasm calls. |

Recommended core types:

| Type | Shape |
|------|-------|
| `OcctCoreExactSession` | owns shape bindings, measurement methods, and grouped disposal |
| `OcctCoreTopologyRef` | normalized ref containing `geometryId`, `kind`, `id`, `shapeId`, optional `nodeId`, optional `transform` |
| `OcctCoreExactImportResult` | `{ model, exact }` |

Recommended core responsibilities:

- Translate root `geometryIndex` bindings into normalized `geometryId` bindings (`geo_0`, etc.).
- Resolve `nodeId -> transform` from the normalized model tree for downstream instance-aware measurement.
- Ship bundled type declarations instead of forcing apps to maintain local ambient modules.

### Downstream App Boundary

What should stay in downstream apps such as `imos-app`:

- pick handling and `triangleToFaceMap` resolution
- selection state and multi-anchor workflows
- conversion from viewer hit metadata (`nodeId`, `geometryId`, `faceId`) into `OcctCoreTopologyRef`
- display-unit formatting, tolerances, labels, and overlay placement/rendering

## Root Wasm vs `@tx-code/occt-core` vs Downstream App

| Concern | Root wasm | `@tx-code/occt-core` | Downstream app |
|---------|-----------|----------------------|----------------|
| Own `TopoDS_Shape` lifetime | Yes | No | No |
| Refcount / release exact shapes | Yes | Group and forward to wasm | No |
| Exact distance/angle/radius/center/area/normal/thickness math | Yes | Thin wrapper only | No |
| Map `geometryIndex -> geometryId` | No | Yes | No |
| Map `nodeId -> transform` from normalized model tree | No | Yes | May supply explicit overrides later |
| Resolve picks to face/edge/vertex ids | No | Optional helper only | Yes |
| Measurement session UX / overlays / tolerances | No | No | Yes |

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Exact math | OCCT kernel APIs already compiled in the root carrier | JS mesh math / Babylon helpers | Not exact and violates the wasm/core-only milestone boundary. |
| Lifetime model | Geometry-local exact shape registry + explicit `ShapeRelease` | Retain only triangulation and recompute later | Would require rereading bytes or adding app-side native state guesses. |
| Instance handling | Optional per-ref transform passed into measurement calls | Duplicate transformed shapes per node in wasm | Wastes memory and fights the existing geometry dedupe / instance model in `occt-core` and Babylon. |
| Core typing | Ship authored `.d.ts` in `@tx-code/occt-core` | Keep app-local ambient declarations | `imos-app` already has a partial stopgap type file; that should not remain the source of truth. |
| Topology ids | Reuse current 1-based face/edge/vertex ids | Invent new exact-only ids | Unnecessary churn; current ids already align with extracted shape-local topology. |

## SceneGraph.net Reference Patterns

### Relevant Patterns To Reuse

| Pattern | Why it is relevant here |
|---------|-------------------------|
| `IOcctShapeStore` / `OcctShapeStore` separation of shape lifetime from UI | Same core need exists here: retain exact shapes independently from selection and overlays. |
| `OcctTopologyElement(shapeId, type, elementId)` | This is the right low-level identity model for exact refs. |
| Measurement results carrying anchor geometry, not just scalar values | Downstream web apps will need attach points / working planes later even if v1.1 does not render overlays itself. |
| Keeping topology resolution outside the kernel | `TopologyElementResolver` shows selection-hit mapping belongs above the exact geometry layer. |

### Patterns To Keep Out Of Scope For v1.1

| Pattern | Why it stays out |
|---------|------------------|
| SceneGraph’s broad `OcctMeasurement` surface (`MeasureDistancePoints`, `MeasureDistanceLines`, `MeasureHole`, `MeasureChamfer`, `MeasureLoopLength`, `GetElementGeometryType`) | Wider than the milestone requirement and would bloat the first exact foundation. |
| `OcctShapeStore` keyed by `(ContextId, GeometryId)` as a direct wasm API | That is an app/runtime concern. Root wasm should stay node-agnostic and expose low-level `shapeId` refcounts only. |
| `LinearDistanceMeasurement`, `RadiusMeasurement`, `ThicknessMeasurement`, overlay renderers, tolerance formatting | These are UI/domain layers, explicitly out of scope for this milestone. |

## New Types / Interfaces Needed

1. Add exact import result types in the root package so downstream code can retain exact shapes without abandoning the current mesh result.
2. Add a single low-level topology ref type keyed by existing 1-based ids and `shapeId`.
3. Add result DTOs for scalar, distance, angle, radius, center, area, and normal queries.
4. Add official bundled `.d.ts` support for `@tx-code/occt-core`, including exact-session types.

## Do Not Add In v1.1

- Do not add viewer selection UX, anchor state machines, or measurement session stores.
- Do not add Babylon overlay rendering, label layout, or highlight rendering APIs.
- Do not add hole, chamfer, or other semantic feature-recognition APIs.
- Do not add mesh-space fallback measurement code.
- Do not add node/context keyed shape stores to the root wasm API.
- Do not add new topology numbering schemes when the current face/edge/vertex ids already work.
- Do not make demo, Babylon, or Tauri surfaces part of the measurement release gate.

## Installation

```bash
# No new third-party packages are recommended for v1.1.
# Keep the current root carrier and package split.

# Root runtime artifacts remain authoritative
npm run build:wasm:win

# Root + core verification stays the release gate
npm run test:release:root
```

## Sources

- `E:/Coding/occt-js/.planning/PROJECT.md`
- `E:/Coding/occt-js/dist/occt-js.d.ts`
- `E:/Coding/occt-js/src/js-interface.cpp`
- `E:/Coding/occt-js/src/importer.hpp`
- `E:/Coding/occt-js/src/importer-utils.cpp`
- `E:/Coding/occt-js/src/importer-xde.cpp`
- `E:/Coding/occt-js/src/orientation.cpp`
- `E:/Coding/occt-js/CMakeLists.txt`
- `E:/Coding/occt-js/packages/occt-core/src/index.js`
- `E:/Coding/occt-js/packages/occt-core/src/occt-core.js`
- `E:/Coding/occt-js/packages/occt-core/src/model-normalizer.js`
- `E:/Coding/occt-js/packages/occt-core/test/core.test.mjs`
- `E:/Coding/occt-js/packages/occt-core/test/live-root-integration.test.mjs`
- `E:/Coding/imos-app/apps/web/src/features/viewer/local-occt-model.ts`
- `E:/Coding/imos-app/apps/web/src/types/tx-code-occt-core.d.ts`
- `E:/Coding/imos-app/packages/viewer-occt/src/loadOcctModel.ts`
- `E:/Coding/imos-app/packages/viewer-core/src/measurement.ts`
- `E:/Coding/imos-app/packages/viewer-core/src/scene-contracts.ts`
- `E:/Coding/imos-app/packages/viewer-babylon/src/occt-scene-builder.js`
- `E:/Coding/imos-app/packages/viewer-babylon/src/web-runtime.ts`
- `E:/Coding/SceneGraph.net/src/SceneGraph/App/IOcctShapeStore.cs`
- `E:/Coding/SceneGraph.net/src/SceneGraph/App/Selection/SelectionHit.cs`
- `E:/Coding/SceneGraph.net/src/SceneGraph.OcctInterop/IOcctNativeShapeApi.cs`
- `E:/Coding/SceneGraph.net/src/SceneGraph.OcctInterop/OcctShapeStore.cs`
- `E:/Coding/SceneGraph.net/src/SceneGraph.OcctInterop/OcctTopologyElement.cs`
- `E:/Coding/SceneGraph.net/src/SceneGraph.OcctInterop/OcctMeasurement.cs`
- `E:/Coding/SceneGraph.net/src/SceneGraph.OcctInterop/OcctMeasurementResults.cs`
- `E:/Coding/SceneGraph.net/src/SceneGraph.Avalonia.Inspect/Widgets/TopologyElementResolver.cs`
