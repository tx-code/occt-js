# Phase 30: Shared Profile Kernel - Pattern Map

**Mapped:** 2026-04-21  
**Files analyzed:** 11 scoped files  
**Analogs found:** 10 / 11

Phase 30 is mostly an extraction/refactor phase. The repository already contains the behavior it needs; the work is to pull that behavior into a reusable generic seam without drifting the shipped revolved runtime contract.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/profile-2d.hpp` / `src/profile-2d.cpp` | new shared geometry seam | JS DTOs -> shared profile normalization/validation -> family adapters | generic portions of `src/revolved-tool.cpp` | partial |
| `src/importer.hpp` | shared DTO/type seam | shared profile DTOs -> family DTOs -> JS serialization | current exact-helper and revolved-shape DTO blocks | exact |
| `src/revolved-tool.cpp` | family adapter + build seam | `RevolvedShapeSpec` -> shared profile kernel -> OCCT revolve/build/exact metadata | current `src/revolved-tool.cpp` | exact |
| `src/js-interface.cpp` | Embind export surface | additive validator export + existing revolved exports | current root utility bindings | exact |
| `dist/occt-js.d.ts` | published root type surface | shared profile DTOs + additive validator + existing revolved aliases | current exact-helper and revolved-shape typings | exact |
| `test/profile_2d_spec_contract.test.mjs` | new root contract test | built runtime -> generic profile validator | `test/revolved_tool_spec_contract.test.mjs` | exact |
| `test/revolved_tool_spec_contract.test.mjs` | drift guard validation contract | built runtime -> revolved family validation still stable | existing file | exact |
| `test/generated_revolved_tool_contract.test.mjs` | build regression guard | built runtime -> generated scene / face-binding / appearance semantics | existing file | exact |
| `test/exact_generated_revolved_tool_contract.test.mjs` | exact-open regression guard | built runtime -> retained exact generated shape semantics | existing file | exact |
| `package.json` | root contract test routing | root validator test -> `npm test` / release gate coverage | current exact helper and revolved runtime test routing | exact |
| `packages/occt-core/test/core.test.mjs` | downstream drift guard | wrapper surface remains stable despite root internal refactor | existing package test surface | partial |

## Pattern Assignments

### `src/profile-2d.hpp` / `src/profile-2d.cpp`

**Scope:** Required.  
**Analog:** the parsing and validation helpers currently embedded in `src/revolved-tool.cpp`.

Planner note: this should become the single owner of generic profile DTO normalization and diagnostics. Do not clone the current revolved parser into a second family file.

---

### `src/revolved-tool.cpp`

**Scope:** Required.  
**Analog:** current file, but with less ownership.

Planner note: after Phase 30, this file should own only revolved-family concerns:

- units / plane / angle validation
- `auto_axis` and other family-owned synthetic closure logic
- embedding local 2D into revolved construction space
- build/openExact/family metadata

It should stop owning generic segment parsing and generic closure/continuity logic.

---

### `src/js-interface.cpp`

**Scope:** Required.  
**Analog:** current additive export rhythm for utility-style root methods.

Planner note: add one thin binding for `ValidateProfile2DSpec(...)`, keep serialization logic in the interface layer, and avoid embedding validation logic here.

---

### `dist/occt-js.d.ts`

**Scope:** Required.  
**Analog:** current revolved-shape typings plus exact-helper DTO families.

Planner note: Phase 30 should publish shared segment and profile DTOs directly here. Keep revolved-shape public names stable by aliasing or reusing the shared segment types rather than replacing the public revolved payload shape.

---

### Root runtime contract tests

**Scope:** Required.  
**Analog 1:** `test/revolved_tool_spec_contract.test.mjs` for validation behavior.  
**Analog 2:** `test/generated_revolved_tool_contract.test.mjs` and `test/exact_generated_revolved_tool_contract.test.mjs` for build/openExact regression protection.

Planner note: the new shared validator test must prove the kernel is generic-local-2D rather than revolved-only, while the existing revolved tests remain the public drift guard for `PROF-03`.

## Shared Patterns

### Additive APIs are explicit and narrow

The repo favors explicit root methods over overloaded routers for utility behavior. If Phase 30 exposes a shared validator, it should be one additive explicit method (`ValidateProfile2DSpec`) rather than a generic dispatcher.

### Public contracts evolve additively while internal ownership changes underneath

The repo already shipped public revolved-shape names. Phase 30 should preserve them and refactor beneath them, not force a second caller migration only one phase after public rename cleanup.

### Generated-shape semantics stay top-level, not embedded into face DTOs

The package normalizer still expects the base face DTO shape to stay small. Shared profile work should preserve that pattern and keep provenance/semantic richness in additive metadata or family-owned result blocks.

### Package wrappers trail root runtime ownership

`@tx-code/occt-core` mirrors root contracts. Phase 30 should keep package drift guards green, but wrapper expansion belongs to Phase 32.

## No Analog Found

The exact public naming and DTO shape of the first generic shared-profile validator has no direct in-repo analog yet. This is the one intentionally new pattern in Phase 30.

## Metadata

**Analog search scope:** `src/importer.hpp`, `src/revolved-tool.hpp`, `src/revolved-tool.cpp`, `src/js-interface.cpp`, `dist/occt-js.d.ts`, `test/revolved_tool_spec_contract.test.mjs`, `test/generated_revolved_tool_contract.test.mjs`, `test/exact_generated_revolved_tool_contract.test.mjs`, `packages/occt-core/src/occt-core.js`, `packages/occt-core/src/model-normalizer.js`, `packages/occt-core/test/core.test.mjs`, `package.json`
