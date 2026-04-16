---
phase: 17
slug: sdk-docs-governance
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-16
---

# Phase 17 - Validation Strategy

> Per-phase validation contract for SDK docs and governance.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node built-in test runner plus existing repo integration scripts |
| **Config file** | none - direct `node --test` / `npm` invocation |
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
| 17-01-01 | 01 | 1 | DOCS-01 | T-17-01-01 | Governance fails until root/package docs and dedicated SDK docs describe package-first placement/relation workflows without viewer scope creep. | integration | `node --test test/release_governance_contract.test.mjs` | ✅ | ⬜ pending |
| 17-01-02 | 01 | 1 | DOCS-01 | T-17-01-02 | Planning/governance drift is caught if Phase 17 state or docs-readiness expectations no longer match the active milestone. | integration | `node --test test/release_governance_contract.test.mjs` | ✅ | ⬜ pending |
| 17-02-01 | 02 | 2 | GOV-01 | T-17-02-01 | Packaged README, typings, and root script assertions fail if the placement/relation SDK contract drifts from the shipped root/package surface. | integration | `node --test test/package_tarball_contract.test.mjs test/release_governance_contract.test.mjs` | ✅ | ⬜ pending |
| 17-02-02 | 02 | 2 | GOV-01 | T-17-02-02 | The authoritative root release gate remains runtime-first while enforcing placement/relation coverage. | integration | `npm run test:release:root` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `README.md` - root reference docs for placement/relation entrypoints and release boundary
- [ ] `packages/occt-core/README.md` - package-first placement/relation walkthroughs
- [ ] `docs/sdk/measurement.md` - dedicated measurement SDK guide
- [ ] `package.json` - authoritative root test and release scripts
- [ ] `test/package_tarball_contract.test.mjs` - packaged placement/relation docs/types assertions
- [ ] `test/release_governance_contract.test.mjs` - governance assertions for SDK docs and Phase 17 state

---

## Manual-Only Verifications

All planned Phase 17 behavior should be automated.

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency remains acceptable for incremental work
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
