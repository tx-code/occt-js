---
phase: 16
slug: exact-relation-classifier-contract
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-16
---

# Phase 16 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node built-in test runner plus existing repo integration scripts |
| **Config file** | none - direct `node --test` invocation |
| **Quick run command** | `node --test test/exact_relation_contract.test.mjs && npm --prefix packages/occt-core test` |
| **Full suite command** | `npm run build:wasm:win && node --test test/exact_relation_contract.test.mjs && npm --prefix packages/occt-core test && npm test` |
| **Estimated runtime** | ~1200 seconds |

---

## Sampling Rate

- **After every task commit:** Run the most local command that covers the changed seam.
- **After every plan wave:** Run `node --test test/exact_relation_contract.test.mjs && npm --prefix packages/occt-core test`.
- **Before phase completion:** Run the full suite command.
- **Max feedback latency:** 30 seconds for quick relation checks.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 16-01-01 | 01 | 1 | REL-01, REL-02, REL-03 | T-16-01-01 | Root classifier returns `parallel`, `perpendicular`, `concentric`, `tangent`, and `none` with stable support geometry for supported analytic pairs. | integration | `node --test test/exact_relation_contract.test.mjs` | ❌ W0 | ⬜ pending |
| 16-01-02 | 01 | 1 | REL-03 | T-16-01-02 | Valid non-related analytic pairs return `kind: "none"`, while invalid or unsupported inputs use explicit typed failures. | integration | `node --test test/exact_relation_contract.test.mjs` | ❌ W0 | ⬜ pending |
| 16-02-01 | 02 | 2 | ADAPT-08 | T-16-02-01 | `occt-core` exposes package-first relation classification that preserves occurrence transforms and keeps `none` distinct from failures. | unit | `npm --prefix packages/occt-core test` | ✅ | ⬜ pending |
| 16-02-02 | 02 | 2 | ADAPT-08 | T-16-02-02 | Repeated-geometry live tests prove relation wrappers preserve occurrence correctness end to end. | integration | `npm --prefix packages/occt-core test` | ✅ | ⬜ pending |

*Status: ⬜ pending - ✅ green - ❌ red - ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `test/exact_relation_contract.test.mjs` - new root relation contract coverage
- [ ] `dist/occt-js.d.ts` - relation DTO typings and `ClassifyExactRelation(...)` signature
- [ ] `packages/occt-core/src/occt-core.js` - package-first relation wrapper
- [ ] `packages/occt-core/test/live-root-integration.test.mjs` - repeated-geometry relation coverage

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `kind: "none"` remains meaningfully distinct from unsupported geometry in downstream use | REL-03 | Automated tests can lock DTO shape and explicit codes, but not whether app-level consumers can reason about `none` without ad hoc heuristics | After implementation, inspect one valid analytic pair that returns `none` and confirm the result is usable as a successful classification rather than an exception path |
| Tangent and concentric supporting geometry is presentation-support oriented rather than viewer-policy specific | REL-02 | Automated tests can prove points and axes exist, but not whether the returned support geometry is sufficient for downstream overlays without extra kernel heuristics | After implementation, inspect one tangent and one concentric result from a live caller path and confirm the support geometry is enough for downstream presentation decisions |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s for quick checks
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
