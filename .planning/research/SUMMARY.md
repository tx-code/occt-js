# Research Summary: v1.1 Exact BRep Measurement Foundation

**Project:** `occt-js`  
**Milestone:** `v1.1 Exact BRep Measurement Foundation`  
**Summarized:** 2026-04-14

## Recommended Scope

Keep `occt-js` as a runtime, not a viewer framework.

- Preserve the current stateless import lane: `Read*` and `AnalyzeOptimalOrientation` stay intact.
- Add a separate stateful exact-model lane for retained shapes and primitive measurements.
- Keep wasm responsible for retained exact state, topology lookup, geometry classification, and primitive measurement kernels.
- Keep `@tx-code/occt-core` responsible for JS-friendly adaptation, placed-ref resolution from normalized scene data, and ergonomic result DTO handling.
- Keep downstream apps responsible for selection UX, measurement sessions, overlay rendering, and semantic feature interpretation.

## Must Ship

The smallest viable v1.1 cut that still unblocks serious downstream web measurement is:

1. Exact-model lifecycle: open/retain/release exact state after import
2. Exact face/edge/vertex refs aligned to the ids already exported today, backed by an explicit internal imported-topology-id mapping layer
3. Geometry classification for exact refs
4. Pairwise primitives: exact `distance`, `angle`, `thickness`
5. Single-entity primitives: `radius`, `center`, `edge length`, `face area`, `face normal at point`
6. Structured success/failure DTOs with overlay-ready anchors and explicit error codes

## Explicitly Deferred

- Hole, chamfer, draft, and similar semantic feature recognition
- Candidate ranking such as “prefer thickness over distance”
- Measurement sessions, preview/pin state, and selection workflows
- Overlay rendering, annotation layout, and workplane visualization
- Viewer-specific hit DTOs or Babylon/Tauri coupling

## Architecture Direction

Recommended internal split:

- Root wasm exact model store
  Retained exact handles, release semantics, topology lookup, imported-topology-id mapping
- Root wasm measurement kernel
  Primitive measurements and geometry classification
- `@tx-code/occt-core` exact adapter
  Exact-model wrappers, placed-ref resolution from `rootNodes` transforms, normalized DTOs

Key repo seams expected to change:

- `src/js-interface.cpp`
- `src/importer.hpp`
- `src/importer-utils.cpp`
- `src/importer-xde.cpp`
- `src/importer-brep.cpp`
- `dist/occt-js.d.ts`
- new exact-store / exact-topology / exact-measurement C++ units
- new `occt-core` exact-model / exact-ref / measurement normalizers

## Phase Decomposition

Recommended roadmap decomposition:

1. **Exact Model Lifecycle Contract**
   Add exact-model open/release, internal shape store, and geometry-level exact bindings.
2. **`occt-core` Exact Adaptation And Ref Resolution**
   Add session wrapper, `dispose()`, exact payload normalization, and placed refs from node/geometry/topology ids.
3. **Single-Element Exact Measurements**
   Ship geometry classification, edge length, face area, face normal, radius, and center.
4. **Pairwise Measurements And Contract Hardening**
   Ship distance, angle, thickness, cross-instance transform handling, then freeze typings/tests/docs.

## Acceptance Signals

- Downstream app can import once, keep exact state alive, and later measure without re-import.
- Existing face/edge/vertex ids map directly to exact refs.
- Primitive results return values plus attach geometry for app-side annotation.
- Unsupported geometry and invalid handles/ids fail explicitly, never as silent mesh fallback.
- Public APIs remain wasm/core-only and do not absorb viewer/session semantics.
