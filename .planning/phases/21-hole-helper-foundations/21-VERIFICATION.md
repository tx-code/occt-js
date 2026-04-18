---
phase: 21-hole-helper-foundations
verified: 2026-04-18T02:49:56Z
status: passed
score: 4/4 must-haves verified
overrides_applied: 0
---

# Phase 21: Hole Helper Foundations Verification Report

**Phase Goal:** Downstream JS can request package-first hole helper semantics from exact refs while the runtime/package boundary stays additive, occurrence-safe, and free of viewer/session policy.
**Verified:** 2026-04-18T02:49:56Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | `@tx-code/occt-core` exposes a package-first hole helper API over one occurrence-scoped exact ref, with explicit typed failures and occurrence-space support geometry. | ✓ VERIFIED | `packages/occt-core/src/occt-core.js` now exports `describeExactHole(ref)`; `packages/occt-core/test/core.test.mjs` passes mocked contract tests for call shape, transforms, failures, and input validation; `npm --prefix packages/occt-core test` passed. |
| 2 | The root carrier exposes only a narrow additive selected-ref hole query rather than broad topology or discovery APIs. | ✓ VERIFIED | `src/exact-query.hpp` and `src/js-interface.cpp` add only `DescribeExactHole(...)`; `src/exact-query.cpp` implements the helper over one retained face/edge ref and reuses existing frame/anchor/result vocabulary; no generic topology API was added. |
| 3 | Supported circular edge refs and cylindrical face refs for cylindrical holes return stable hole semantics, and unsupported circular/cylindrical selections fail explicitly. | ✓ VERIFIED | `test/exact_hole_contract.test.mjs` passed 3/3, including supported edge and face success cases plus an explicit `unsupported-geometry` failure case found from shipped fixtures. |
| 4 | The new helper does not regress the current authoritative root runtime/package verification lanes. | ✓ VERIFIED | `npm run build:wasm:win`, `node --test test/exact_hole_contract.test.mjs`, `npm --prefix packages/occt-core test`, and the full `npm run test:release:root` gate all passed after the helper landed. |

**Score:** 4/4 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `packages/occt-core/src/occt-core.js` | Package-first `describeExactHole(ref)` wrapper | ✓ VERIFIED | Added single-ref wrapper with occurrence-space transform handling and explicit carrier capability check. |
| `dist/occt-js.d.ts`, `src/importer.hpp`, `src/exact-query.hpp`, `src/exact-query.cpp`, `src/js-interface.cpp` | Additive root hole DTO, carrier method, and binding | ✓ VERIFIED | All five surfaces now include the exact-hole result shape and `DescribeExactHole(...)` method. |
| `test/exact_hole_contract.test.mjs` | Root retained-model contract coverage for supported and unsupported hole cases | ✓ VERIFIED | 3 passing tests cover supported circular-edge and cylindrical-face semantics plus explicit unsupported failure. |
| `packages/occt-core/test/core.test.mjs`, `packages/occt-core/test/live-root-integration.test.mjs` | Package wrapper and live parity coverage | ✓ VERIFIED | Mocked wrapper tests and live occurrence-transform parity coverage both passed inside `npm --prefix packages/occt-core test`. |

### Key Link Verification

| From | To | Via | Status | Details |
| --- | --- | --- | --- | --- |
| `packages/occt-core/src/occt-core.js` | `src/js-interface.cpp` / `dist/occt-js.d.ts` | `describeExactHole(ref)` -> `DescribeExactHole(...)` | ✓ WIRED | The package wrapper calls the new carrier method name directly and transforms the returned geometry into occurrence space. |
| `src/exact-query.cpp` | `src/importer.hpp` / `dist/occt-js.d.ts` | exact-hole DTO population | ✓ WIRED | The root implementation fills the new hole DTO fields (`kind`, `profile`, `radius`, `diameter`, `frame`, `anchors`, `axisDirection`, `depth`, `isThrough`) and the serializers/types expose them to JS. |
| `test/exact_hole_contract.test.mjs` | shipped retained-model fixtures | dynamic supported/unsupported search | ✓ WIRED | The contract suite locates supported and unsupported circular/cylindrical candidates from `as1_pe_203.brep` and `ANC101.stp` without hardcoding brittle topology ids. |
| `packages/occt-core/test/live-root-integration.test.mjs` | built root carrier | occurrence-space parity | ✓ WIRED | The live integration suite proves translated refs produce translated hole geometry while preserving scalar semantics and axis direction. |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| --- | --- | --- | --- |
| Package wrapper contract stays green | `node --test packages/occt-core/test/core.test.mjs` | 45 tests passed, 0 failed | ✓ PASS |
| Root hole contract passes | `node --test test/exact_hole_contract.test.mjs` | 3 tests passed, 0 failed | ✓ PASS |
| Package live integration including hole parity passes | `npm --prefix packages/occt-core test` | 60 tests passed, 0 failed | ✓ PASS |
| Authoritative root release gate still passes | `npm run test:release:root` | build, root governance/runtime suite, and `occt-core` all passed | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| --- | --- | --- | --- | --- |
| `FEAT-03` | `21-01-PLAN.md`, `21-02-PLAN.md` | Downstream JS can request package-first hole helper semantics from exact refs and receive stable typed outputs for supported hole cases. | ✓ SATISFIED | `describeExactHole(ref)` is live in `@tx-code/occt-core`; root and package tests pass for supported cylindrical-hole refs and explicit unsupported failures. |
| `ADAPT-09` | `21-01-PLAN.md`, `21-02-PLAN.md` | `@tx-code/occt-core` helper APIs preserve occurrence transforms, supporting geometry DTOs, and typed failures without adding viewer session state or app-owned policy. | ✓ SATISFIED | Mocked wrapper tests and live integration both prove occurrence-space parity; no viewer/session policy was introduced in the package or root carrier. |

Orphaned requirements: none. Phase 21 maps exactly to `FEAT-03` and `ADAPT-09`, and both are satisfied by the implemented carrier/package/test surface.

### Gaps Summary

No blocking gaps found. Phase 21 achieved the first helper-semantic milestone by shipping supported cylindrical-hole semantics package-first while keeping the runtime boundary narrow and the current root release gate green.

---

_Verified: 2026-04-18T02:49:56Z_  
_Verifier: Codex (local verification pass)_
