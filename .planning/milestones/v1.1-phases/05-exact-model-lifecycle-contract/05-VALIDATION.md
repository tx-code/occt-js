---
phase: 5
slug: exact-model-lifecycle-contract
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-14
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node built-in test runner plus existing repo integration scripts |
| **Config file** | none — direct `node --test` invocation |
| **Quick run command** | `node --test test/exact_model_lifecycle_contract.test.mjs && npm --prefix packages/occt-core test` |
| **Full suite command** | `npm run build:wasm:win && node --test test/exact_model_lifecycle_contract.test.mjs && npm --prefix packages/occt-core test && npm test` |
| **Estimated runtime** | ~900 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node --test test/exact_model_lifecycle_contract.test.mjs`
- **After every plan wave:** Run `node --test test/exact_model_lifecycle_contract.test.mjs && npm --prefix packages/occt-core test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds for quick lifecycle contract checks

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 1 | LIFE-01 | T-05-01 | Exact open returns a retained model handle while the current stateless import lane remains intact. | integration | `node --test test/exact_model_lifecycle_contract.test.mjs` | ❌ W0 | ⬜ pending |
| 05-01-02 | 01 | 1 | LIFE-02 | T-05-01 | Exact retain and release operations are explicit, deterministic, and do not silently accept unknown handles. | integration | `node --test test/exact_model_lifecycle_contract.test.mjs` | ❌ W0 | ⬜ pending |
| 05-02-01 | 02 | 2 | LIFE-02 | T-05-02 | Root typings and downstream adapter coverage expose lifecycle success and failure DTOs without hiding invalid-after-release semantics. | static + integration | `node --test test/exact_model_lifecycle_contract.test.mjs && npm --prefix packages/occt-core test` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `test/exact_model_lifecycle_contract.test.mjs` — new root lifecycle contract test covering exact open, retain, release, invalid handle, and released-handle behavior
- [ ] `dist/occt-js.d.ts` — lifecycle types for exact open results and retain/release DTOs
- [ ] `packages/occt-core/test/core.test.mjs` — exact-session adapter assertions if `occt-core` gains a lifecycle wrapper in this phase

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Wasm memory drops after explicit release under real repeated app usage | LIFE-02 | The repo test surface can verify API semantics but not realistic long-lived memory behavior in a downstream app loop | After implementation, import the same CAD payload repeatedly through the exact lane, retain/release it, and confirm no obvious retained-session growth using browser or Node memory observation |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s for quick checks
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
