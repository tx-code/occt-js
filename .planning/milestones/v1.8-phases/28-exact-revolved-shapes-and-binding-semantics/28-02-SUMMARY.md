---
phase: 28-exact-revolved-shapes-and-binding-semantics
plan: "02"
subsystem: revolved-shape-bindings
tags: [revolved-shape, face-bindings, semantic-colors, exact-history]
requirements-completed: [MAP-01, MAP-02, GEOM-02]
completed: 2026-04-21
---

# Phase 28 Plan 02 Summary

**Generated revolved shapes now ship stable binding semantics and runtime-owned default appearance.**

## Accomplishments

- Added `revolvedShape.faceBindings` with `geometryIndex`, `faceId`, `segmentIndex`, `segmentId`, `segmentTag`, and explicit `systemRole`.
- Defined stable runtime roles including `profile`, `closure`, `axis`, `start_cap`, `end_cap`, and `degenerated`.
- Grouped default face colors and materials by runtime semantics so callers do not need to pass colors for generated output.
- Fixed edge cases where axis-touching tip segments or adjacent coplanar planar segments previously lost provenance or semantic color separation.

## Verification

- `npm run build:wasm:win`
- `node --test test/generated_revolved_tool_contract.test.mjs test/exact_generated_revolved_tool_contract.test.mjs`
- `npm test`

All commands passed.
