---
phase: 30
slug: shared-profile-kernel
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-21
---

# Phase 30 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node built-in test runner plus existing root/package npm script orchestration |
| **Config file** | none - direct `node --test` invocation plus repo npm scripts |
| **Quick run command** | `npm run build:wasm:win && node --test test/profile_2d_spec_contract.test.mjs test/revolved_tool_spec_contract.test.mjs test/generated_revolved_tool_contract.test.mjs test/exact_generated_revolved_tool_contract.test.mjs` |
| **Full suite command** | `npm run build:wasm:win && node --test test/profile_2d_spec_contract.test.mjs test/revolved_tool_spec_contract.test.mjs test/generated_revolved_tool_contract.test.mjs test/exact_generated_revolved_tool_contract.test.mjs && npm --prefix packages/occt-core test && npm test` |
| **Estimated runtime** | ~2400 seconds |

---

## Sampling Rate

- **After every task commit:** Run the most local contract command covering the changed seam.
- **After every plan wave:** Run the quick run command.
- **Before phase completion:** Run the full suite command.
- **Max feedback latency:** 900 seconds for shared-profile or revolved-regression feedback after a rebuild.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 30-01-01 | 01 | 1 | PROF-01, PROF-02 | T-30-01-01 | Generic local-2D profile validation rejects discontinuity, open loops, unsupported segments, and degenerate arcs without leaking revolve-specific assumptions. | integration | `npm run build:wasm:win && node --test test/profile_2d_spec_contract.test.mjs` | ❌ W0 | ⬜ pending |
| 30-01-02 | 01 | 1 | PROF-01, PROF-02, PROF-03 | T-30-01-02 | Shared DTOs and validator wire into the built runtime while `ValidateRevolvedShapeSpec(...)` keeps its shipped behavior. | integration | `npm run build:wasm:win && node --test test/profile_2d_spec_contract.test.mjs test/revolved_tool_spec_contract.test.mjs` | ❌ W0 | ⬜ pending |
| 30-02-01 | 02 | 1 | PROF-03 | T-30-02-01 | Revolved build/exact flows consume the shared kernel without changing generated-scene, face-binding, or exact-open semantics. | integration | `npm run build:wasm:win && node --test test/generated_revolved_tool_contract.test.mjs test/exact_generated_revolved_tool_contract.test.mjs` | ✅ | ⬜ pending |
| 30-02-02 | 02 | 1 | PROF-03 | T-30-02-02 | Root/package command routing continues to prove no public drift after the internal refactor. | integration | `npm run build:wasm:win && node --test test/profile_2d_spec_contract.test.mjs test/revolved_tool_spec_contract.test.mjs test/generated_revolved_tool_contract.test.mjs test/exact_generated_revolved_tool_contract.test.mjs && npm --prefix packages/occt-core test && npm test` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending - ✅ green - ❌ red - ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/profile-2d.hpp` / `src/profile-2d.cpp` - new shared profile normalization and validation seam
- [ ] `dist/occt-js.d.ts` - shared `Profile2D` DTOs and additive validator types
- [ ] `test/profile_2d_spec_contract.test.mjs` - new root shared-profile validator contract test
- [ ] `package.json` - route shared-profile contract coverage through root test commands if new file is added

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| One representative `auto_axis` revolved profile still produces the same visual closure/cap silhouette after the shared-kernel refactor | PROF-03 | Root tests can lock topology and metadata behavior but cannot fully judge visual seam intent from arrays alone | Inspect one representative `BuildRevolvedShape(...)` result that uses `closure: "auto_axis"` and confirm the silhouette/cap surfaces still look correct |
| Shared-profile local coordinates feel family-neutral rather than revolve-first | PROF-01 | Contract tests can prove negative/local coordinates are accepted, but a human still needs to judge whether the naming and docs remain generic | Review the new `Profile2D` DTO names and docs in `dist/occt-js.d.ts` and ensure they do not mention radius/axis/tool semantics |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 900s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
