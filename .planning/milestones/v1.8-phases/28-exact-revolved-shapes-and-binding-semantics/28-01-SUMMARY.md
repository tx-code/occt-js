---
phase: 28-exact-revolved-shapes-and-binding-semantics
plan: "01"
subsystem: exact-generated-shapes
tags: [revolved-shape, exact-open, retained-models, root-contract]
requirements-completed: [GEOM-03, GEOM-02]
completed: 2026-04-21
---

# Phase 28 Plan 01 Summary

**Generated revolved shapes now support retained exact-open flows through the root Wasm carrier.**

## Accomplishments

- Added `OpenExactRevolvedShape(spec, options?)` to the root runtime.
- Returned additive exact metadata: `exactModelId`, `exactGeometryBindings`, and `revolvedShape.shapeValidation`.
- Reused the existing exact-model lifecycle and exact-store diagnostics instead of creating a separate generated-shape store.
- Added root contract coverage for exact-open success, exact-family lookup parity, explicit invalid-spec failures, and released-handle behavior after cleanup.

## Verification

- `npm run build:wasm:win`
- `node --test test/generated_revolved_tool_contract.test.mjs test/exact_generated_revolved_tool_contract.test.mjs`

Both commands passed.
