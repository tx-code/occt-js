---
phase: 11
slug: appearance-governance-downstream-contract
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-15
---

# Phase 11 — Validation Strategy

> Per-phase validation contract for import appearance docs, packaged typings, and governance hardening.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node built-in test runner plus existing repo release command |
| **Config file** | none — direct `node --test` / `npm` invocation |
| **Quick run command** | `node --test test/release_governance_contract.test.mjs test/package_tarball_contract.test.mjs` |
| **Full suite command** | `npm run test:release:root` |
| **Estimated runtime** | ~1200 seconds |

---

## Sampling Rate

- **After every task commit:** Run the narrowest governance command that covers the files just touched.
- **After Wave 1:** `node --test test/release_governance_contract.test.mjs`.
- **After Wave 2:** `node --test test/package_tarball_contract.test.mjs test/release_governance_contract.test.mjs`.
- **Before `$gsd-verify-work`:** `npm run test:release:root` must be green.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 11-01-01 | 01 | 1 | ADAPT-04 | T-11-01-01 | Governance tests fail until root/package docs and typings describe the shipped appearance contract and downstream boundary. | docs+contract | `node --test test/release_governance_contract.test.mjs` | ✅ | ⬜ pending |
| 11-01-02 | 01 | 1 | ADAPT-04 | T-11-01-02 | README/package docs/AGENTS/type comments agree on `colorMode`, `defaultColor`, built-in fallback, and app-owned settings persistence. | docs+contract | `node --test test/release_governance_contract.test.mjs` | ✅ | ⬜ pending |
| 11-02-01 | 02 | 2 | ADAPT-04 | T-11-02-01 | Package-contract tests fail until packed typings expose the appearance option shape needed by downstream consumers. | package+contract | `node --test test/package_tarball_contract.test.mjs` | ✅ | ⬜ pending |
| 11-02-02 | 02 | 2 | ADAPT-04 | T-11-02-02 | Root release verification fails if packaged appearance typings or governance coverage drift from the implemented contract. | package+release | `npm run test:release:root` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `README.md` — root package-first appearance contract docs and examples
- [ ] `packages/occt-core/README.md` — adapter-side appearance docs and downstream-boundary wording
- [ ] `dist/occt-js.d.ts` — appearance option comments that match the shipped contract
- [ ] `AGENTS.md` — runtime-first guidance that keeps settings persistence and viewer overrides downstream
- [ ] `test/release_governance_contract.test.mjs` — governance assertions for appearance docs and planning state
- [ ] `test/package_tarball_contract.test.mjs` — packed-typings assertions for appearance options

---

## Manual-Only Verifications

All planned Phase 11 behavior should be automated.

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency remains acceptable for incremental work
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
