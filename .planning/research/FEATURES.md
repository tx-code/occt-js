# Feature Scope: v1.1 Exact BRep Measurement Foundation

**Project:** `occt-js`
**Milestone:** `v1.1 Exact BRep Measurement Foundation`
**Researched:** 2026-04-14
**Confidence:** HIGH

## Must Ship

These are the table-stakes exact measurement primitives for downstream apps. Anything less leaves the app unable to bridge from an existing web pick to an exact OCCT result without inventing kernel behavior in app code.

### 1. Retained exact-model lifecycle

- Add a retained exact-model handle API that survives past tessellation/import and can be explicitly released.
- The handle must be stable enough for downstream apps to cache during a measurement session.
- Release semantics must be explicit and safe because the app, not `occt-js`, owns session lifetime.

Why: `dist/occt-js.d.ts` currently exposes only import/orientation calls. Without retained exact state, every measurement API is dead on arrival for downstream web apps.

### 2. Exact topology references aligned with the existing mesh payload

- Expose exact refs for `face`, `edge`, and `vertex`.
- The ref contract must map directly from today’s exported topology data:
  - `triangleToFaceMap` -> face ref
  - `faces[].id` / `faces[].edgeIndices` -> face/edge ref
  - `edges[].id` -> edge ref
  - `vertices[].id` -> vertex ref
- Preserve the existing 1-based face/edge/vertex ids as the exact-id contract.

Why: `imos-app` already reconstructs face selection from `triangleToFaceMap` and face ids. v1.1 should not force a second, viewer-specific id system.

### 3. Geometry classification for exact refs

- Add an exact geometry-type query for refs: `line`, `circle`, `plane`, `cylinder`, `sphere`, `cone`, `torus`, `unknown`.
- The app should use this to decide which primitive measurement to offer.

Why: the app owns semantic interpretation. That only works cleanly if the core can say what kind of exact geometry a picked edge/face actually is.

### 4. Two-selection exact primitives

- Exact minimum distance between two refs, returning value plus attach points.
- Exact angle between supported exact pairs:
  - linear edge <-> linear edge
  - planar face <-> planar face
- Exact thickness/offset between parallel planar faces, using analytic plane distance rather than trimmed-boundary minimum distance.
- Results must include the geometric data needed for app-side overlay placement:
  - distance attach points
  - angle vertex / rays / working plane
  - thickness attach points / working plane

Why: this is the minimum exact kernel needed for a serious downstream dimension tool. SceneGraph’s measurement layer builds its higher-level behavior on exactly these primitives.

### 5. Single-selection exact primitives

- Radius for circular edges and supported analytic faces, returning center/axis-or-plane/anchor data.
- Center query for supported analytic edges/faces.
- Edge length.
- Face area, including centroid and face normal.
- Face normal evaluation at an arbitrary query point on or near the face.

Why: a serious web measurement implementation needs exact one-pick dimensions and anchor data, not just pairwise measurements.

### 6. Structured result contract

- Every exact query must return:
  - stable success/failure status
  - explicit unsupported-geometry / invalid-id / invalid-handle errors
  - overlay-ready geometric anchors, not scalar values alone
  - unit-consistent values aligned with the existing `sourceUnit` / `unitScaleToMeters` import contract

Why: downstream apps own UX and fallback policy. They need data-rich success results and machine-actionable failure results.

### Smallest shippable feature set

The smallest v1.1 cut that still unblocks a serious downstream web measurement implementation is:

1. Retained exact-model open/release
2. Exact face/edge/vertex refs that map from today’s exported ids
3. Geometry classification
4. Exact `distance`, `angle`, and `thickness`
5. Exact `radius`, `edge length`, `face area`, and `face normal at point`

`center` should ship in v1.1 as well, but if schedule pressure appears, it can be delivered as part of `radius` / `area` result payloads first rather than as a separate convenience entrypoint. Do not cut lifecycle, ref mapping, classification, or the core pairwise primitives.

## Defer

These are follow-on semantics or app-owned behaviors and should not define the v1.1 milestone boundary.

### Semantic feature recognition

- Hole recognition from cylindrical faces or circular edges
- Chamfer recognition from planar chamfer faces or adjacent edges
- Draft-angle, slot, boss, pocket, fillet, or similar feature inference

Why defer: these are feature semantics, not kernel primitives. The local `SceneGraph.net` reference already implements them as separate higher-order calls on top of the primitive measurement surface.

### Candidate-resolution logic

- “Prefer thickness over distance for parallel planar faces”
- “Prefer angle over distance for non-parallel linear edges”
- Automatic candidate generation / preview ranking
- Measurement mode inference from the current selection

Why defer: this is app behavior. `SceneGraph.net` performs these choices in `MeasureWidget`, not in the native topology store itself.

### Viewer/session/overlay behavior

- Picking/raycast plumbing
- Selection state machines
- Hover/selected highlighting
- Measurement session persistence
- Annotation layout, labels, callouts, and overlay rendering

Why defer: the app boundary is already agreed. `imos-app` and Babylon code own this layer.

### Convenience and extended measurement variants

- Diameter as a separate top-level primitive
- Loop length / circumference convenience queries
- Projected / min / max / center distance variants
- Free-point measurement APIs that are not anchored to topology refs
- Cross-document measurement between independently retained model handles, if same-model measurement is already covered

Why defer: useful, but not required to unblock exact topology-driven measurement in the downstream web app.

## Acceptance Behaviors

The milestone is complete when these behaviors are true.

### Lifecycle and mapping

- A downstream app can import a model, retain exact state, render from the existing tessellated payload, and later issue exact measurement calls without re-importing the CAD bytes.
- After explicit release, exact queries against that handle fail with a structured invalid-handle error.
- Face picks derived from `triangleToFaceMap` resolve to the same exact face ids exported in `geometries[].faces`.
- Edge and vertex refs resolve from exported `edges[].id` and `vertices[].id` without a second id translation layer.

### Primitive correctness

- For parallel planar faces, exact thickness returns plane-to-plane offset, not trimmed-boundary minimum distance.
- For non-parallel linear edges, exact angle is available with overlay-ready ray/vertex data.
- For parallel linear edges, exact distance returns nominal line/segment separation with usable attach points.
- Circular-edge radius returns the expected radius and center.
- Exact edge length matches the analytic edge length.
- Exact face area returns area plus centroid/normal.
- Face-normal evaluation returns the expected normal when queried on planar and cylindrical faces.

### Failure behavior

- Radius on a non-circular edge returns an explicit unsupported-geometry error, not `0` or a fake radius.
- Thickness on non-parallel faces returns an explicit unsupported-geometry error.
- Invalid topology ids return explicit invalid-id errors.
- APIs do not silently fall back to mesh-approximate answers when exact refs are supplied.

### Boundary preservation

- `dist/occt-js.d.ts` exposes pure wasm/core primitives only.
- No public API in v1.1 owns selection state, measurement sessions, overlay rendering, or semantic feature recognition.
- Hole and chamfer remain out of the v1.1 acceptance contract even if local reference projects already implement them elsewhere.

### Downstream-unblock proof

- A downstream web app can take an existing face/edge/vertex pick, convert it to an exact ref, call exact primitives, and render its own overlays from the returned attach data.
- The downstream app does not need repo-local Babylon helpers or Tauri code to perform exact measurement.

## Sources

- `E:/Coding/occt-js/.planning/PROJECT.md`
- `E:/Coding/occt-js/.planning/milestones/v1.0-ROADMAP.md`
- `E:/Coding/occt-js/.planning/seeds/SEED-001-web-exact-brep-measurement.md`
- `E:/Coding/occt-js/dist/occt-js.d.ts`
- `E:/Coding/occt-js/src/js-interface.cpp`
- `E:/Coding/imos-app/apps/web/src/features/viewer/local-occt-model.ts`
- `E:/Coding/imos-app/packages/viewer-babylon/src/bindOcctMeshSelection.ts`
- `E:/Coding/SceneGraph.net/src/SceneGraph.Avalonia.Inspect/Widgets/TopologyElementResolver.cs`
- `E:/Coding/SceneGraph.net/src/SceneGraph.Avalonia.Inspect/Widgets/TopologyElements.cs`
- `E:/Coding/SceneGraph.net/src/SceneGraph.Avalonia.Inspect/Widgets/IOcctShapeIdProvider.cs`
- `E:/Coding/SceneGraph.net/src/SceneGraph.OcctInterop/Native/NativeMethods.Measure.cs`
- `E:/Coding/SceneGraph.net/src/SceneGraph.OcctInterop.Native/exports.h`
- `E:/Coding/SceneGraph.net/src/SceneGraph/App/IOcctShapeStore.cs`
- `E:/Coding/SceneGraph.net/src/SceneGraph.OcctInterop/OcctShapeStore.cs`
- `E:/Coding/SceneGraph.net/tests/SceneGraph.Avalonia.Inspect.OcctNative.Tests/Widgets/MeasureWidgetPrsDimSemanticsTests.cs`
- `E:/Coding/SceneGraph.net/tests/SceneGraph.Avalonia.Inspect.OcctNative.Tests/Widgets/MeasureWidgetHoleTests.cs`
- `E:/Coding/SceneGraph.net/tests/SceneGraph.Avalonia.Inspect.OcctNative.Tests/Widgets/MeasureWidgetChamferTests.cs`
- `E:/Coding/SceneGraph.net/tests/SceneGraph.OcctInterop.Tests/OcctMeasurementTests.cs`
