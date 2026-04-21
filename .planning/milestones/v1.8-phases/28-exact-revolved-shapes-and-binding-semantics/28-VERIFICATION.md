---
phase: 28-exact-revolved-shapes-and-binding-semantics
verified: 2026-04-21T09:37:03.7132817+08:00
status: passed
score: 4/4 must-haves verified
overrides_applied: 0
---

# Phase 28 Verification Report

**Phase Goal:** Generated revolved shapes preserve exact-model utility and explicit face-binding semantics that downstream apps can consume deterministically.
**Status:** passed

## Must-Have Truths

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Generated-shape flows can return retained exact-model handles and geometry bindings compatible with the existing exact lifecycle/query surface. | ✓ VERIFIED | `OpenExactRevolvedShape(...)` is covered in `test/exact_generated_revolved_tool_contract.test.mjs`, including exact-store registration and released-handle cleanup. |
| 2 | Generated output exposes explicit `systemRole` values instead of relying on face order. | ✓ VERIFIED | `test/generated_revolved_tool_contract.test.mjs` asserts `revolvedShape.faceBindings` and supported runtime roles for full and partial revolves. |
| 3 | Segment provenance stays stable for semantic edge cases such as axis-touching and adjacent coplanar profile segments. | ✓ VERIFIED | Root tests lock `tip-axis`, coplanar annulus provenance, and coplanar semantic color separation. |
| 4 | Default face appearance is deterministic and runtime-owned. | ✓ VERIFIED | Root tests assert grouped semantic colors/materials without caller-supplied colors, including distinct closure and cap appearance. |

## Command Verification

| Command | Result |
| --- | --- |
| `npm run build:wasm:win` | PASS |
| `node --test test/generated_revolved_tool_contract.test.mjs test/exact_generated_revolved_tool_contract.test.mjs` | PASS |
| `npm test` | PASS |
| `npm run test:release:root` | PASS |

## Requirement Coverage

| Requirement | Status | Evidence |
| --- | --- | --- |
| `GEOM-02` | ✓ SATISFIED | Deterministic semantic appearance and material grouping ship in the root generated-shape payload |
| `GEOM-03` | ✓ SATISFIED | Exact-open generated-shape flow reuses retained exact-model handles and representative exact queries |
| `MAP-01` | ✓ SATISFIED | Stable face bindings preserve segment index plus optional id/tag provenance |
| `MAP-02` | ✓ SATISFIED | Runtime-owned `systemRole` values distinguish profile, closure, axis, cap, and degenerated faces |

## Conclusion

Phase 28 is complete and verified. The exact-open and binding-semantics surface is ready for package-first SDK and governance closeout work.
