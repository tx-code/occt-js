# Phase 02 Research: Root Runtime Contract

**Generated:** 2026-04-14
**Phase:** 02 - Root Runtime Contract
**Requirements:** CORE-02, CORE-03, CORE-04

## Objective

Identify what already exists in the root Wasm runtime, what is insufficiently specified or verified, and how to split Phase 02 into executable plans that harden the root API contract without widening scope into downstream packaging or viewer concerns.

## Current Runtime Surface

### Root import entrypoints

`src/js-interface.cpp` exposes the root Wasm API:

- `ReadFile(format, content, params)`
- `ReadStepFile(content, params)`
- `ReadIgesFile(content, params)`
- `ReadBrepFile(content, params)`
- `AnalyzeOptimalOrientation(format, content, params)`

`ReadByFormat(...)` normalizes `format` to lowercase and dispatches to:

- `ImportStepFromMemory(...)`
- `ImportIgesFromMemory(...)`
- `ImportBrepFromMemory(...)`

The success path goes through `BuildResult(...)`, which currently emits:

- `success`
- `sourceFormat`
- `sourceUnit` when available
- `unitScaleToMeters` when available
- `rootNodes`
- `geometries`
- `materials`
- `warnings`
- `stats`

The failure path emits:

- `success: false`
- `error`
- `sourceFormat`

### Import parameters

`ParseImportParams(...)` in `src/js-interface.cpp` already parses:

- `rootMode`
- `linearUnit`
- `linearDeflectionType`
- `linearDeflection`
- `angularDeflection`
- `readNames`
- `readColors`

The root-mode enum in `src/importer.hpp` is:

- `OneShape`
- `MultipleShapes`

### Orientation API

`AnalyzeOptimalOrientationFromMemory(...)` in `src/orientation.cpp` already supports:

- `step`
- `iges`
- `brep`

The success result currently includes:

- `transform`
- `localFrame`
- `bbox`
- `strategy`
- `stage1`
- `stage2`
- `confidence`
- `sourceUnit` when available
- `unitScaleToMeters` when available

The API also rejects unsupported formats and unsupported orientation modes.

## Existing Verification Coverage

### `test/test_multi_format_exports.mjs`

Already verifies:

- direct entrypoints exist
- generic `ReadFile(...)` exists
- invalid IGES/BREP/generic STEP fail with `success=false`
- valid STEP/IGES/BREP imports succeed
- topology arrays are populated and internally consistent
- some realistic fixtures preserve names and colors

Current gap:

- does not systematically assert the canonical top-level payload shape across direct and generic entrypoints
- does not compare direct-vs-generic payload parity beyond a few spot checks

### `test/test_step_iges_root_mode.mjs`

Already verifies:

- STEP `one-shape` vs `multiple-shapes`
- realistic STEP multi-root fixture behavior
- generic `ReadFile("step", ...)` parity for root count
- BREP root-mode behavior is covered in a separate file
- inch STEP exposes `sourceUnit` and `unitScaleToMeters`
- IGES default import returns one root

Current gap:

- IGES explicit `rootMode` semantics are not locked down
- unit metadata coverage is narrow and mostly STEP-specific
- source-unit assertions are not aligned across direct/generic import paths

### `test/test_brep_root_mode.mjs`

Already verifies:

- BREP default behavior
- BREP `one-shape` / `multiple-shapes`
- realistic multi-root BREP fixture behavior
- generic `ReadFile("brep", ...)` root-count parity

Current gap:

- focuses on root counts, not canonical result-shape parity

### `test/test_optimal_orientation_api.mjs`

Already verifies:

- unsupported format rejection
- successful STEP orientation for a simple fixture
- presence of major result fields

Current gap:

- mostly a smoke test
- does not lock diagnostics in depth across supported formats

### `test/test_optimal_orientation_reference.mjs`

Already verifies:

- reference fixture expectations for multiple formats
- some `sourceUnit` expectations
- preset-axis behavior

Current gap:

- planner should confirm whether all returned diagnostics that matter to downstream users are covered, not just a subset

## Requirement Coverage Gaps

### CORE-02: canonical root import payload

What exists:

- canonical fields are emitted on successful import
- both direct and generic entrypoints exist

What remains risky:

- no single contract test proves every supported format returns the same canonical payload shape through both direct and generic entrypoints
- no dedicated assertions for `warnings`, `materials`, `stats`, `sourceFormat`, `sourceUnit`, and `unitScaleToMeters` parity

### CORE-03: explicit root-shape semantics

What exists:

- STEP and BREP root-mode behavior already has realistic fixture coverage

What remains risky:

- semantics are spread across tests instead of expressed as one clear contract
- IGES support/behavior for explicit `rootMode` is still ambiguous from tests alone

### CORE-04: optimal orientation contract

What exists:

- orientation API works for supported formats
- reference fixtures and smoke tests already exist

What remains risky:

- result diagnostics are not clearly separated into “contract” vs “heuristic detail”
- future edits could preserve success while quietly regressing diagnostics shape or metadata

## Planning Constraints

- Keep scope on the root Wasm contract only.
- Do not widen into `occt-core`, package publishing, vendoring, or Babylon/demo behavior beyond root contract verification.
- Prefer strengthening tests first, then making only the minimum implementation changes required to satisfy the contract.
- Reuse existing fixtures unless a missing requirement cannot be expressed without adding one.

## Recommended Plan Shape

### 02-01: Import/result-shape contract

Focus:

- direct vs generic root API parity
- canonical payload shape for STEP/IGES/BREP
- explicit field-level assertions for `sourceFormat`, `rootNodes`, `geometries`, `materials`, `warnings`, `stats`, `sourceUnit`, and `unitScaleToMeters` where available

Likely files:

- `test/test_multi_format_exports.mjs`
- `src/js-interface.cpp`

### 02-02: Root-mode and unit metadata contract

Focus:

- make supported `one-shape` / `multiple-shapes` semantics explicit per format
- verify realistic multi-root fixtures remain stable
- tighten unit metadata expectations on direct and generic import paths

Likely files:

- `test/test_step_iges_root_mode.mjs`
- `test/test_brep_root_mode.mjs`
- `src/importer-xde.cpp`
- `src/importer-brep.cpp`
- `src/importer.hpp`

### 02-03: Orientation diagnostics contract

Focus:

- supported-format orientation behavior
- stable result shape and diagnostics
- meaningful checks on `transform`, `localFrame`, `bbox`, `strategy`, `stage1`, `stage2`, `confidence`, `sourceUnit`, and `unitScaleToMeters`

Likely files:

- `test/test_optimal_orientation_api.mjs`
- `test/test_optimal_orientation_reference.mjs`
- `src/orientation.cpp`
- `src/js-interface.cpp`

## Open Questions (Resolved for planning)

### Should Phase 02 add new public APIs?

No. Phase 02 should harden the existing root API contract rather than expand it.

### Should Phase 02 move into `occt-core`?

No. `occt-core` belongs to Phase 03 downstream consumption work. Phase 02 stays at the root Wasm layer.

### Should IGES get `multiple-shapes` guarantees if implementation does not truly support them?

Only if the current implementation already has meaningful behavior. Otherwise the plan should explicitly document and verify the supported semantics rather than over-promise parity that does not exist.
