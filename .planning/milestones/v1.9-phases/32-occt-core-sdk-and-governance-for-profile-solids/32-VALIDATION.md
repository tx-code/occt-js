---
phase: 32
slug: occt-core-sdk-and-governance-for-profile-solids
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-21
verified: 2026-04-21
---

# Phase 32 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node built-in test runner plus existing root/package npm script orchestration |
| **Config file** | none - direct `node --test` invocation plus repo npm scripts |
| **Quick run command** | `npm --prefix packages/occt-core test && node --test test/release_governance_contract.test.mjs test/package_tarball_contract.test.mjs` |
| **Full suite command** | `npm --prefix packages/occt-core test && node --test test/release_governance_contract.test.mjs test/package_tarball_contract.test.mjs && npm run test:planning:audit && npm test && npm run test:release:root` |
| **Estimated runtime** | ~4800 seconds |

---

## Sampling Rate

- **After every task commit:** Run the narrowest package/governance command covering the changed seam.
- **After every plan wave:** Run the quick run command.
- **Before phase completion:** Run the full suite command.
- **Max feedback latency:** 900 seconds for package-first or governance drift after a local edit.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 32-01-01 | 01 | 1 | SDK-02 | T-32-01-01 | `@tx-code/occt-core` exposes typed wrappers for shared profile and extruded-shape entrypoints without forcing raw Wasm calls. | integration | `npm --prefix packages/occt-core test` | ✅ | ✅ green |
| 32-01-02 | 01 | 1 | SDK-02 | T-32-01-02 | Normalized package helpers preserve additive `generated-extruded-shape` metadata and geometry bindings. | integration | `npm --prefix packages/occt-core test` | ✅ | ✅ green |
| 32-02-01 | 02 | 1 | GOV-02 | T-32-02-01 | Root/package docs, tarball checks, and governance tests fail on drift in the shared-profile or extruded-shape contract. | integration | `node --test test/release_governance_contract.test.mjs test/package_tarball_contract.test.mjs` | ✅ | ✅ green |
| 32-02-02 | 02 | 1 | GOV-02 | T-32-02-02 | Planning state, package docs, and the authoritative root release gate stay aligned with the shipped profile-solid contract. | integration | `npm run test:planning:audit && npm test && npm run test:release:root` | ✅ | ✅ green |

*Status: ⬜ pending - ✅ green - ❌ red - ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `packages/occt-core/src/occt-core.js` - package-first shared-profile and extruded wrapper entrypoints
- [x] `packages/occt-core/src/index.d.ts` - published package typings for the profile-solid surface
- [x] `packages/occt-core/src/model-normalizer.js` - normalized additive extruded-shape metadata preservation
- [x] `packages/occt-core/test/core.test.mjs` - package wrapper and normalized metadata regression coverage
- [x] `packages/occt-core/test/package-contract.test.mjs` - package README and typing contract coverage
- [x] `README.md` and `packages/occt-core/README.md` - generic profile-solid docs that keep schema ownership upstream
- [x] `test/release_governance_contract.test.mjs` and `test/package_tarball_contract.test.mjs` - governance and tarball drift guards

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Root and package examples still read as generic profile-solid contracts rather than tool-coupled APIs | GOV-02 | Token-based contract tests prove coverage and wording anchors, but a human still needs to judge whether docs stayed generic-first | Review `README.md` and `packages/occt-core/README.md` and confirm they describe `Profile2D` / extruded-shape ownership without reintroducing tool-library coupling |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 900s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** granted 2026-04-21 after package, governance, planning-audit, and release verification passed.
