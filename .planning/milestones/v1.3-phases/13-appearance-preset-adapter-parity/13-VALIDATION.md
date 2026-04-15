---
phase: 13
slug: appearance-preset-adapter-parity
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-15
---

# Phase 13 — Validation Strategy

> Per-phase validation contract for root presets and adapter parity.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node built-in test runner plus existing repo integration scripts |
| **Config file** | none — direct `node --test` / `npm` invocation |
| **Quick run command** | `node --test test/import_appearance_contract.test.mjs packages/occt-core/test/core.test.mjs` |
| **Full suite command** | `npm run test:release:root` |
| **Estimated runtime** | ~1200 seconds |

---

## Sampling Rate

- **After every task commit:** Run the narrowest command that covers the seam just changed.
- **After Wave 1:** `powershell -NoProfile -Command "npm run build:wasm:win; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; node --test test/import_appearance_contract.test.mjs"`.
- **After Wave 2:** `powershell -NoProfile -Command "npm run build:wasm:win; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; npm --prefix packages/occt-core test; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; node --test test/import_appearance_contract.test.mjs test/release_governance_contract.test.mjs"`.
- **Before `$gsd-verify-work`:** `npm run test:release:root` must be green.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 13-01-01 | 01 | 1 | APPR-07, APPR-08 | T-13-01-01 | Root contract tests fail until named presets resolve to explicit default-appearance behavior with read/exact parity. | integration | `node --test test/import_appearance_contract.test.mjs` | ✅ | ⬜ pending |
| 13-01-02 | 01 | 1 | APPR-07, APPR-08 | T-13-01-02 | Shared root import params parse preset values and apply explicit override precedence deterministically. | integration | `powershell -NoProfile -Command "npm run build:wasm:win; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; node --test test/import_appearance_contract.test.mjs"` | ✅ | ⬜ pending |
| 13-02-01 | 02 | 2 | ADAPT-05 | T-13-02-01 | `occt-core` normalizes preset/defaultOpacity input and preserves raw root opacity in normalized output. | unit+integration | `node --test packages/occt-core/test/core.test.mjs packages/occt-core/test/live-root-integration.test.mjs` | ✅ | ⬜ pending |
| 13-02-02 | 02 | 2 | APPR-07, APPR-08, ADAPT-05 | T-13-02-02 | Built root carrier plus adapter keep preset semantics aligned under the canonical release gate. | integration | `npm run test:release:root` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `dist/occt-js.d.ts` — `appearancePreset` enum plus precedence comments
- [ ] `src/importer.hpp` / `src/js-interface.cpp` — preset resolution on the shared root import path
- [ ] `test/import_appearance_contract.test.mjs` — preset mapping and read/exact parity coverage
- [ ] `packages/occt-core/src/occt-core.js` — preset/defaultOpacity normalization and forwarding
- [ ] `packages/occt-core/src/model-normalizer.js` — raw root `opacity` preservation during normalization
- [ ] `packages/occt-core/test/*.test.mjs` — adapter unit and live parity coverage

---

## Manual-Only Verifications

All planned Phase 13 behavior should be automated.

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency remains acceptable for incremental work
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
