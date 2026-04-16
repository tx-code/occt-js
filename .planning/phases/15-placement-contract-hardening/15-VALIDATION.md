---
phase: 15
slug: placement-contract-hardening
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-16
---

# Phase 15 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node built-in test runner plus existing repo integration scripts |
| **Config file** | none - direct `node --test` invocation |
| **Quick run command** | `node --test test/exact_placement_contract.test.mjs && npm --prefix packages/occt-core test` |
| **Full suite command** | `npm run build:wasm:win && node --test test/exact_placement_contract.test.mjs && npm --prefix packages/occt-core test && npm test` |
| **Estimated runtime** | ~1200 seconds |

---

## Sampling Rate

- **After every task commit:** Run the most local command that covers the changed seam.
- **After every plan wave:** Run `node --test test/exact_placement_contract.test.mjs && npm --prefix packages/occt-core test`.
- **Before phase completion:** Run the full suite command.
- **Max feedback latency:** 30 seconds for quick placement checks.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 15-01-01 | 01 | 1 | PLCT-01, PLCT-02, PLCT-04 | T-15-01-01 | Root pairwise placement helpers return stable anchors plus full frame data for supported exact distance, angle, and thickness flows. | integration | `node --test test/exact_placement_contract.test.mjs` | ❌ W0 | ⬜ pending |
| 15-01-02 | 01 | 1 | PLCT-01, PLCT-02, PLCT-04 | T-15-01-02 | Pairwise placement failures stay explicit for invalid ids, unsupported geometry, and degenerate frame cases instead of guessing overlay geometry. | integration | `node --test test/exact_placement_contract.test.mjs` | ❌ W0 | ⬜ pending |
| 15-02-01 | 02 | 2 | PLCT-03 | T-15-02-01 | Root circular placement helpers return stable center, anchor, axis, and frame data for supported circular geometry. | integration | `node --test test/exact_placement_contract.test.mjs` | ❌ W0 | ⬜ pending |
| 15-02-02 | 02 | 2 | ADAPT-07 | T-15-02-02 | `occt-core` placement wrappers preserve occurrence transforms for both pairwise and circular placement helpers without inventing viewer-only abstractions. | unit + integration | `npm --prefix packages/occt-core test` | ✅ | ⬜ pending |

*Status: ⬜ pending - ✅ green - ❌ red - ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `test/exact_placement_contract.test.mjs` - new root contract test covering pairwise and circular placement DTOs
- [ ] `dist/occt-js.d.ts` - placement DTO typings and `SuggestExact*Placement(...)` signatures
- [ ] `packages/occt-core/src/occt-core.js` - package-first placement wrappers using occurrence-scoped exact refs
- [ ] `packages/occt-core/test/live-root-integration.test.mjs` - repeated-geometry coverage for occurrence-space placement wrappers

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Placement frames are stable enough for overlay consumption, not just numerically orthogonal | PLCT-01, PLCT-02, PLCT-03, PLCT-04 | Repo tests can assert normalization and orthogonality, but not whether downstream overlay code prefers a particular frame handedness or anchor ordering | After implementation, inspect one distance, one angle, and one circular placement result from a live caller path and confirm the returned `frame.origin/normal/xDir/yDir` is sufficient for downstream overlay placement without extra frame heuristics |
| Diameter placement semantics stay presentation-oriented rather than viewer-policy-specific | PLCT-03 | Root tests can lock DTO shape, but not whether downstream overlay code prefers one of multiple equivalent diameter anchor layouts | After implementation, inspect one supported circular result and confirm diameter placement returns stable center/anchor/frame data without introducing text placement or annotation-style policy |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s for quick checks
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
