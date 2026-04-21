---
phase: 31
slug: linear-extruded-shape-runtime
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-21
verified: 2026-04-21
---

# Phase 31 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node built-in test runner plus existing root npm script orchestration |
| **Config file** | none - direct `node --test` invocation plus repo npm scripts |
| **Quick run command** | `npm run build:wasm:win && node --test test/profile_2d_spec_contract.test.mjs test/revolved_tool_spec_contract.test.mjs test/generated_revolved_tool_contract.test.mjs test/exact_generated_revolved_tool_contract.test.mjs test/extruded_shape_spec_contract.test.mjs test/generated_extruded_shape_contract.test.mjs test/exact_generated_extruded_shape_contract.test.mjs` |
| **Full suite command** | `npm run build:wasm:win && node --test test/profile_2d_spec_contract.test.mjs test/revolved_tool_spec_contract.test.mjs test/generated_revolved_tool_contract.test.mjs test/exact_generated_revolved_tool_contract.test.mjs test/extruded_shape_spec_contract.test.mjs test/generated_extruded_shape_contract.test.mjs test/exact_generated_extruded_shape_contract.test.mjs && npm test` |
| **Estimated runtime** | ~2700 seconds |

---

## Sampling Rate

- **After every task commit:** Run the most local contract command covering the changed seam.
- **After every plan wave:** Run the quick run command.
- **Before phase completion:** Run the full suite command.
- **Max feedback latency:** 900 seconds for shared-profile / generated-family regressions after a rebuild.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 31-01-01 | 01 | 1 | EXTR-01 | T-31-01-01 | Extruded spec validation rejects unsupported units, non-positive depth, and invalid profile input before OCCT build. | integration | `npm run build:wasm:win && node --test test/extruded_shape_spec_contract.test.mjs` | ✅ | ✅ green |
| 31-01-02 | 01 | 1 | EXTR-01, EXTR-02 | T-31-01-02 | Build and exact-open for generated extruded shapes return canonical scene payloads and retained exact handles without drifting shared-profile or revolved behavior. | integration | `npm run build:wasm:win && node --test test/profile_2d_spec_contract.test.mjs test/revolved_tool_spec_contract.test.mjs test/generated_revolved_tool_contract.test.mjs test/exact_generated_revolved_tool_contract.test.mjs test/extruded_shape_spec_contract.test.mjs test/generated_extruded_shape_contract.test.mjs test/exact_generated_extruded_shape_contract.test.mjs` | ✅ | ✅ green |
| 31-02-01 | 02 | 1 | MAP-03 | T-31-02-01 | Extruded wall faces keep caller segment provenance while `start_cap` and `end_cap` remain runtime-owned and stable. | integration | `npm run build:wasm:win && node --test test/generated_extruded_shape_contract.test.mjs test/exact_generated_extruded_shape_contract.test.mjs` | ✅ | ✅ green |
| 31-02-02 | 02 | 1 | MAP-04 | T-31-02-02 | Runtime-owned wall/cap appearance grouping remains deterministic and representative exact-family bindings stay aligned with semantic face roles. | integration | `npm run build:wasm:win && node --test test/generated_extruded_shape_contract.test.mjs test/exact_generated_extruded_shape_contract.test.mjs && npm test` | ✅ | ✅ green |

*Status: ⬜ pending - ✅ green - ❌ red - ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `src/extruded-shape.hpp` / `src/extruded-shape.cpp` - new extruded-family adapter over the shared profile kernel
- [x] `dist/occt-js.d.ts` - additive generated-extruded-shape typings
- [x] `test/extruded_shape_spec_contract.test.mjs` - new root extruded-family validation contract test
- [x] `test/generated_extruded_shape_contract.test.mjs` - new generated-scene / semantic extruded-family regression suite
- [x] `test/exact_generated_extruded_shape_contract.test.mjs` - new exact-open / exact-family regression suite
- [x] `package.json` - route new root contract coverage through authoritative root commands

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| One representative rounded profile extrusion still looks like a clean prismatic solid with no unexpected cap inversion or missing wall band | EXTR-01, MAP-03 | Array-level tests lock topology and bindings, but a human should still spot obvious visual seam mistakes once | Inspect one representative `BuildExtrudedShape(...)` result using a mixed line/arc profile and confirm the prismatic silhouette and cap orientation look correct |
| Default cap and wall semantic colors remain easy to distinguish in one representative generated extruded result | MAP-04 | Tests can prove deterministic grouping and parity, but not whether the visual distinction is still practically legible | Inspect one representative generated extruded scene and confirm cap colors are visibly distinct from wall groups |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 900s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** granted 2026-04-21 after root contract and full runtime verification passed.
