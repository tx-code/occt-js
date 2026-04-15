---
phase: 14
slug: appearance-expansion-governance
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-15
---

# Phase 14 — Validation Strategy

> Per-phase validation contract for appearance-expansion governance.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node built-in test runner plus existing repo integration scripts |
| **Config file** | none — direct `node --test` / `npm` invocation |
| **Quick run command** | `node --test test/package_tarball_contract.test.mjs test/release_governance_contract.test.mjs` |
| **Full suite command** | `npm run test:release:root` |
| **Estimated runtime** | ~1200 seconds |

---

## Sampling Rate

- **After every task commit:** Run the narrowest command that covers the seam just changed.
- **After Wave 1:** `node --test test/release_governance_contract.test.mjs`.
- **After Wave 2:** `node --test test/package_tarball_contract.test.mjs test/release_governance_contract.test.mjs`.
- **Before `$gsd-verify-work`:** `npm run test:release:root` must be green.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 14-01-01 | 01 | 1 | ADAPT-06 | T-14-01-01 | Root/package docs fail governance if preset/defaultOpacity contract or downstream-boundary wording drifts. | integration | `node --test test/release_governance_contract.test.mjs` | ✅ | ⬜ pending |
| 14-01-02 | 01 | 1 | ADAPT-06 | T-14-01-02 | Public typings commentary and examples describe the final preset/defaultOpacity contract without viewer scope creep. | integration | `node --test test/release_governance_contract.test.mjs` | ✅ | ⬜ pending |
| 14-02-01 | 02 | 2 | ADAPT-06 | T-14-02-01 | Packaged README/types assertions fail if preset/defaultOpacity package guidance drifts from the shipped surface. | integration | `node --test test/package_tarball_contract.test.mjs test/release_governance_contract.test.mjs` | ✅ | ⬜ pending |
| 14-02-02 | 02 | 2 | ADAPT-06 | T-14-02-02 | The authoritative root release gate still passes with the finalized appearance-expansion docs and package checks. | integration | `npm run test:release:root` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `README.md` — root docs for `appearancePreset`, `defaultOpacity`, and downstream boundaries
- [ ] `packages/occt-core/README.md` — package-first preset/defaultOpacity docs and alpha-promotion note
- [ ] `AGENTS.md` — repo-level guidance naming the finalized appearance options explicitly
- [ ] `dist/occt-js.d.ts` — final contract comments, if wording still needs tightening
- [ ] `test/package_tarball_contract.test.mjs` — packaged preset/defaultOpacity docs/types assertions
- [ ] `test/release_governance_contract.test.mjs` — governance assertions for final docs and milestone state

---

## Manual-Only Verifications

All planned Phase 14 behavior should be automated.

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency remains acceptable for incremental work
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
