# 27-01 Summary

## Outcome

Completed the strict root-side revolved tool validation surface for Phase 27.

- Added `ValidateRevolvedToolSpec(spec)` to the root Wasm API.
- Added tracked TypeScript typings for the normalized revolved-tool spec and typed diagnostics.
- Added a dedicated `src/revolved-tool.hpp/.cpp` seam for parsing and validating the strict spec.
- Added built-runtime contract coverage in `test/revolved_tool_spec_contract.test.mjs`.

## Files Changed

- `dist/occt-js.d.ts`
- `src/importer.hpp`
- `src/revolved-tool.hpp`
- `src/revolved-tool.cpp`
- `src/js-interface.cpp`
- `test/revolved_tool_spec_contract.test.mjs`

## Verification

- `npm run build:wasm:win`
- `node --test test/revolved_tool_spec_contract.test.mjs`

## Notes

- Validation returns explicit typed diagnostics with stable codes such as `unsupported-unit`, `negative-radius`, `invalid-arc`, `profile-not-closed`, and `invalid-revolve-angle`.
- The generated-tool build path remains intentionally out of scope for `27-01`; Phase `27-02` will consume the same normalized spec seam and add OCCT revolve construction plus canonical scene export.
