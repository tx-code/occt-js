---
phase: 31-linear-extruded-shape-runtime
plan: "01"
subsystem: extruded-runtime
tags: [extruded-shape, root-runtime, profile2d, exact-open]
requirements-completed: [EXTR-01, EXTR-02]
completed: 2026-04-21
---

# Phase 31 Plan 01 Summary

**The root runtime now exposes additive generic linear extruded-shape validate, build, and exact-open flows.**

## Outcome

Completed the additive `generated-extruded-shape` runtime family on top of the shared `Profile2D` kernel.

- Added strict root entrypoints `ValidateExtrudedShapeSpec`, `BuildExtrudedShape`, and `OpenExactExtrudedShape`.
- Introduced a narrow generic extruded spec: shared closed `Profile2D` plus positive finite `extrusion.depth`.
- Built exact prisms through `BRepPrimAPI_MakePrism` in canonical local `XY +Z` space and reused the existing generated-scene plus retained exact-model flow.
- Published root typings and metadata for `generated-extruded-shape` without reintroducing tool language.
- Routed the new root contract suites through `package.json` and verified that shared-profile plus revolved behavior stayed green.

## Files Changed

- `dist/occt-js.d.ts`
- `package.json`
- `src/importer.hpp`
- `src/extruded-shape.hpp`
- `src/extruded-shape.cpp`
- `src/js-interface.cpp`
- `test/extruded_shape_spec_contract.test.mjs`
- `test/generated_extruded_shape_contract.test.mjs`
- `test/exact_generated_extruded_shape_contract.test.mjs`

## Verification

- `npm run build:wasm:win`
- `node --test test/extruded_shape_spec_contract.test.mjs test/generated_extruded_shape_contract.test.mjs test/exact_generated_extruded_shape_contract.test.mjs`
- `node --test test/profile_2d_spec_contract.test.mjs test/revolved_tool_spec_contract.test.mjs test/generated_revolved_tool_contract.test.mjs test/exact_generated_revolved_tool_contract.test.mjs test/extruded_shape_spec_contract.test.mjs test/generated_extruded_shape_contract.test.mjs test/exact_generated_extruded_shape_contract.test.mjs`
- `npm test`

## Notes

- This plan intentionally stops short of stable wall/cap semantic bindings; `extrudedShape.hasStableFaceBindings` remains false until `31-02`.
- Exact-open already reuses the same build path, so later semantic binding work can stay additive over the retained exact shape rather than opening a second geometry lane.
