# 27-02 Summary

## Outcome

Completed the OCCT revolve build path for Phase 27 and shipped generated tools through the canonical root scene contract.

- Added `BuildRevolvedTool(spec, options?)` to the root Wasm API.
- Reused the normalized spec seam from `27-01` for both validation and build execution.
- Built supported `line`, `arc_center`, and `arc_3pt` profiles into OCCT faces, revolved them around `Z`, triangulated them, and exported the result through the existing scene DTO shape.
- Added additive top-level `generatedTool` metadata without introducing stable face bindings yet.
- Routed the new generated-tool contract tests through `npm test` and `npm run test:release:root`.

## Files Changed

- `dist/occt-js.d.ts`
- `package.json`
- `src/importer.hpp`
- `src/revolved-tool.hpp`
- `src/revolved-tool.cpp`
- `src/js-interface.cpp`
- `test/generated_revolved_tool_contract.test.mjs`

## Verification

- `npm run build:wasm:win`
- `node --test test/revolved_tool_spec_contract.test.mjs test/generated_revolved_tool_contract.test.mjs`
- `npm test`

## Notes

- Successful generated tools now return `sourceFormat: "generated-revolved-tool"` with standard `rootNodes`, `geometries`, `materials`, `warnings`, and `stats`.
- Build failures stay explicit and typed through `diagnostics`, including validation-pass / build-fail cases such as zero-area profiles.
- Stable face/history bindings are still intentionally deferred to Phase `28`, where `BRepPrimAPI_MakeRevol::Generated(...)` will become the primary mapping source.
