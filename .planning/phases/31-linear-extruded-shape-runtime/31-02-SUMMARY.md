---
phase: 31-linear-extruded-shape-runtime
plan: "02"
subsystem: extruded-face-semantics
tags: [extruded-shape, bindings, appearance, exact-open]
requirements-completed: [MAP-03, MAP-04]
completed: 2026-04-21
---

# Phase 31 Plan 02 Summary

**Generated extruded shapes now ship stable wall/cap semantics and deterministic runtime-owned appearance grouping.**

## Outcome

Completed stable semantic bindings and deterministic runtime-owned appearance for `generated-extruded-shape`.

- Added prism-history-driven face binding resolution so wall faces preserve caller profile provenance while `start_cap` and `end_cap` remain runtime-owned.
- Marked `extrudedShape.hasStableFaceBindings` true and published per-face semantic bindings through the generated scene and exact-open lanes.
- Applied deterministic role/tag-based face colors so matching wall tags collapse to a shared appearance group while caps remain visually distinct.
- Added exact-family regression guards proving representative wall/cap bindings stay aligned with `plane` and `cylinder` exact geometry families.

## Files Changed

- `src/extruded-shape.cpp`
- `test/generated_extruded_shape_contract.test.mjs`
- `test/exact_generated_extruded_shape_contract.test.mjs`

## Verification

- `npm run build:wasm:win`
- `node --test test/generated_extruded_shape_contract.test.mjs test/exact_generated_extruded_shape_contract.test.mjs`
- `npm test`

## Notes

- The extruded family now matches the generated-family semantic direction already established by revolved shapes, but with explicit `wall`, `start_cap`, and `end_cap` roles.
- Face binding resolution is based on `BRepPrimAPI_MakePrism` history rather than emitted face order, so downstream apps can stay off topology-order assumptions.
