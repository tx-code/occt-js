# Phase 27: Revolved Tool Spec & Wasm Builder - Pattern Map

**Mapped:** 2026-04-20  
**Files analyzed:** 9 scoped files  
**Analogs found:** 8 / 9

Phase 27 introduces a new root-side generated-geometry seam, but it should still look like the rest of the repository: thin Embind entrypoints, shared DTO structs in `src/importer.hpp`, OCCT-heavy implementation in a dedicated C++ file, and root contract tests that load the built runtime through `test/load_occt_factory.mjs`.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/revolved-tool.hpp` / `src/revolved-tool.cpp` | new generated-tool core seam | JS spec -> strict validation -> OCCT profile/revolve -> scene/build diagnostics | `src/exact-query.cpp` and `src/orientation.cpp` | partial |
| `src/importer.hpp` | shared DTO/type seam | generated-tool validation/build DTOs -> JS serialization -> published typings | current exact-helper DTO blocks | exact |
| `src/js-interface.cpp` | Embind surface | JS object parsing + DTO serialization + method export | current `ReadFile`, `OpenExactModel`, `AnalyzeOptimalOrientation`, exact-helper bindings | exact |
| `dist/occt-js.d.ts` | published root type surface | typed spec/build contract for downstream JS | current exact-helper and orientation typings | exact |
| `test/revolved_tool_spec_contract.test.mjs` | root validation contract | built dist runtime -> strict diagnostics behavior | `test/exact_*_contract.test.mjs` | exact |
| `test/generated_revolved_tool_contract.test.mjs` | root scene-build contract | built dist runtime -> canonical scene payload + generated-tool metadata | `test/exact_placement_contract.test.mjs` + `test/test_multi_format_exports.mjs` | partial |
| `package.json` | authoritative root test routing | new root contract tests -> `npm test` / `test:release:root` | current exact-helper script routing | exact |
| top-level `generatedTool` result metadata | additive semantic extension point | root build result -> future package normalization | no direct analog | new |

## Pattern Assignments

### `src/revolved-tool.hpp` / `src/revolved-tool.cpp`

**Scope:** Required.  
**Analog:** `src/exact-query.cpp` for “new root capability behind one narrow seam,” plus `src/orientation.cpp` for “non-import API with its own parse/analysis logic.”

Planner note: generated-tool validation and OCCT construction should live here, not inside `js-interface.cpp` and not by mutating importer files until everything becomes a special case.

---

### `src/importer.hpp`

**Scope:** Required.  
**Analog:** existing exact-helper DTO structs (`OcctExact*Result`) and shared scene/topology structs.

Planner note: add revolved-tool spec/build result structs here if they must cross the serialization boundary. Keep naming additive and explicit.

---

### `src/js-interface.cpp`

**Scope:** Required.  
**Analog:** existing additive export rhythm for `ReadFile`, `OpenExactModel`, `AnalyzeOptimalOrientation`, and the exact-helper bindings.

Planner note: keep parsing/serialization here and call into the new generated-tool core seam. Do not put OCCT builder logic directly into Embind glue.

---

### `dist/occt-js.d.ts`

**Scope:** Required.  
**Analog:** existing published exact-helper and orientation type families.

Planner note: Phase 27 needs a strict typed spec surface and root build result types. Remember this file is tracked and hand-maintained.

---

### Root generated-tool contract tests

**Scope:** Required.  
**Analog 1:** `test/exact_*_contract.test.mjs` for additive root method behavior over the built runtime.  
**Analog 2:** `test/test_multi_format_exports.mjs` for scene/topology invariants.

Planner note: generated-tool tests should load the built factory through `test/load_occt_factory.mjs`, use inline JS spec objects rather than external fixtures, and assert canonical scene/topology behavior rather than viewer output.

---

### `package.json`

**Scope:** Required by the end of the phase.  
**Analog:** current script routing for exact helper contracts in `npm test` and `test:release:root`.

Planner note: add generated-tool contract tests to the root test lanes once both test files exist. Keep demo/Babylon/Tauri routing unchanged.

## Shared Patterns

### Additive root APIs are explicit, not generic routers

**Source:** `src/js-interface.cpp`, `dist/occt-js.d.ts`

The repo uses named root entrypoints (`ReadFile`, `OpenExactModel`, `MeasureExactDistance`, `AnalyzeOptimalOrientation`) instead of one generic RPC-style dispatcher. Phase 27 should follow that rhythm with explicit generated-tool methods.

### Scene output must look like existing imported-model output

**Source:** `src/js-interface.cpp`, `src/importer-utils.cpp`, `test/test_multi_format_exports.mjs`

The generated-tool path should reuse the current scene topology format. New consumers should not need a second mesh/scene parser just because the model was generated rather than imported.

### Root contract tests operate on built dist artifacts

**Source:** `test/load_occt_factory.mjs`, `test/exact_*_contract.test.mjs`

Do not unit-test generated-tool behavior through mocks in Phase 27. This phase is root-runtime work, so contract tests should hit the built Wasm surface directly.

### Package normalization boundary is intentionally narrower than raw root output

**Source:** `packages/occt-core/src/model-normalizer.js`

Because the package normalizer currently strips extra face fields, Phase 27 should keep generated-tool semantics in an additive top-level result block rather than extending raw face DTOs.

## No Analog Found

The additive `generatedTool` metadata block has no direct in-repo analog yet. This is the one intentionally new pattern Phase 27 introduces. It should stay small and root-only in this phase so later phases can refine it without rewriting the scene DTO itself.

## Metadata

**Analog search scope:** `src/js-interface.cpp`, `src/importer.hpp`, `src/importer-utils.*`, `src/exact-query.cpp`, `src/orientation.cpp`, `dist/occt-js.d.ts`, `test/load_occt_factory.mjs`, `test/exact_*`, `test/test_multi_format_exports.mjs`, `packages/occt-core/src/model-normalizer.js`, `package.json`
