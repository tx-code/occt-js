---
phase: 30-shared-profile-kernel
plan: "01"
subsystem: shared-profile-kernel
tags: [profile2d, root-runtime, validation, shared-kernel]
requirements-completed: [PROF-01, PROF-02]
completed: 2026-04-21
---

# Phase 30 Plan 01 Summary

**The root runtime now ships one generic `Profile2D` validation seam shared across generated solid families.**

## Outcome

Completed the shared 2D profile DTO and validation seam for Phase 30.

- Added additive root `ValidateProfile2DSpec(spec)` coverage to the Wasm surface.
- Published shared `Profile2D` segment/spec/diagnostic typings in `dist/occt-js.d.ts`.
- Added `src/profile-2d.hpp/.cpp` as the generic local-2D parse/validate seam.
- Routed `ValidateRevolvedShapeSpec(spec)` through the shared profile kernel while preserving revolved-only diagnostics such as `negative-radius` and `invalid-revolve-angle`.
- Added built-runtime contract coverage in `test/profile_2d_spec_contract.test.mjs` plus a revolved validation drift guard.

## Files Changed

- `dist/occt-js.d.ts`
- `package.json`
- `src/importer.hpp`
- `src/profile-2d.hpp`
- `src/profile-2d.cpp`
- `src/js-interface.cpp`
- `src/revolved-tool.cpp`
- `test/profile_2d_spec_contract.test.mjs`
- `test/revolved_tool_spec_contract.test.mjs`

## Verification

- `npm run build:wasm:win`
- `node --test test/profile_2d_spec_contract.test.mjs test/revolved_tool_spec_contract.test.mjs`

## Notes

- The shared validator is generic local-2D and does not enforce revolved-only radius rules.
- Family-owned closure policy such as revolve `auto_axis` still lives outside the shared kernel.
- Phase `30-02` will keep moving the revolved build/openExact paths onto the same shared profile seam and lock the no-drift regressions on generated-scene and exact-open behavior.
