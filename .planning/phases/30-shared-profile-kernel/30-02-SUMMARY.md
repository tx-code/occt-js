# 30-02 Summary

## Outcome

Completed the revolved build/openExact refactor onto the shared profile kernel without changing the public runtime surface.

- Added an internal resolved closed-loop adapter so revolved build paths consume normalized shared `Profile2D` segments instead of re-deriving closure during wire construction.
- Kept `auto_axis` synthetic closure family-owned in the revolved layer while validating the synthesized closed loop through the shared profile validator.
- Added face-binding fallback to generated-face hints so freeform `arc_3pt` faces keep caller provenance instead of dropping bindings during partial revolves.
- Added no-drift regression coverage for `auto_axis` build/openExact behavior plus a package-wrapper guard in `@tx-code/occt-core`.
- Removed dead revolved-local profile parsing helpers that were superseded by the shared profile kernel.

## Files Changed

- `src/revolved-tool.cpp`
- `test/generated_revolved_tool_contract.test.mjs`
- `test/exact_generated_revolved_tool_contract.test.mjs`
- `packages/occt-core/test/core.test.mjs`

## Verification

- `npm run build:wasm:win`
- `node --test test/profile_2d_spec_contract.test.mjs test/revolved_tool_spec_contract.test.mjs test/generated_revolved_tool_contract.test.mjs test/exact_generated_revolved_tool_contract.test.mjs`
- `npm --prefix packages/occt-core test`
- `npm test`

## Notes

- The shared profile kernel still stays geometry-only; revolved-specific closure policy and negative-radius rules remain family-owned.
- `auto_axis` partial revolves now preserve the caller `arc_3pt` segment binding through exact-open and generated-scene lanes.
- Phase `30` is complete; the next GSD step is `Phase 31` discussion/planning.
