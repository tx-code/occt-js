---
phase: 31-linear-extruded-shape-runtime
verified: 2026-04-21T12:08:06.3064174+08:00
status: passed
score: 4/4 must-haves verified
overrides_applied: 0
---

# Phase 31 Verification Report

**Phase Goal:** Downstream JS can validate, build, and exact-open linear extruded solids from shared profiles with stable semantic face bindings.
**Status:** passed

## Must-Have Truths

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | The root runtime exposes additive linear extruded-shape validate, build, and exact-open flows on top of the shared `Profile2D` kernel. | ✓ VERIFIED | `src/extruded-shape.hpp`, `src/extruded-shape.cpp`, `src/js-interface.cpp`, and `dist/occt-js.d.ts` expose `ValidateExtrudedShapeSpec`, `BuildExtrudedShape`, and `OpenExactExtrudedShape`. |
| 2 | Generated extruded output returns canonical scene data plus retained exact-model handles without drifting shared-profile or revolved behavior. | ✓ VERIFIED | `test/extruded_shape_spec_contract.test.mjs`, `test/generated_extruded_shape_contract.test.mjs`, and `test/exact_generated_extruded_shape_contract.test.mjs` cover the additive extruded family while `npm test` keeps the broader runtime green. |
| 3 | Stable face bindings preserve profile provenance and explicit `wall`, `start_cap`, and `end_cap` roles instead of face-order assumptions. | ✓ VERIFIED | `test/generated_extruded_shape_contract.test.mjs` and `test/exact_generated_extruded_shape_contract.test.mjs` assert prism-history-driven wall/cap bindings and representative exact-family parity. |
| 4 | Deterministic default appearance grouping remains runtime-owned for representative prismatic profiles. | ✓ VERIFIED | Root extruded contract tests lock semantic wall/cap grouping without caller-supplied colors and verify stable runtime-owned grouping. |

## Command Verification

| Command | Result |
| --- | --- |
| `npm run build:wasm:win` | PASS |
| `node --test test/extruded_shape_spec_contract.test.mjs test/generated_extruded_shape_contract.test.mjs test/exact_generated_extruded_shape_contract.test.mjs` | PASS |
| `npm test` | PASS |
| `npm run test:release:root` | PASS |

## Requirement Coverage

| Requirement | Status | Evidence |
| --- | --- | --- |
| `EXTR-01` | ✓ SATISFIED | Linear extruded-shape build returns canonical scene payloads compatible with existing root consumers |
| `EXTR-02` | ✓ SATISFIED | Exact-open generated extruded shapes reuse retained exact-model handles and the existing exact query surface |
| `MAP-03` | ✓ SATISFIED | Stable face bindings preserve segment provenance plus explicit wall/start-cap/end-cap roles |
| `MAP-04` | ✓ SATISFIED | Default appearance grouping stays deterministic and runtime-owned across representative prismatic profiles |

## Conclusion

Phase 31 is complete and verified. The generic linear extrusion family is ready for package-first SDK and governance lock-in.
