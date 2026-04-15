---
phase: 10
slug: custom-default-color-adapter-parity
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-15
---

# Phase 10 — Validation Strategy

> Per-phase validation contract for custom default colors and adapter parity.

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
| 10-01-01 | 01 | 1 | APPR-03, APPR-04 | T-10-01-01 | Root contract tests fail until custom default colors override the built-in color consistently. | integration | `node --test test/import_appearance_contract.test.mjs` | ✅ | ⬜ pending |
| 10-01-02 | 01 | 1 | APPR-03, APPR-04 | T-10-01-02 | Root read/openExact lanes parse and honor `defaultColor` with deterministic precedence. | integration | `powershell -NoProfile -Command "npm run build:wasm:win; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; node --test test/import_appearance_contract.test.mjs"` | ✅ | ⬜ pending |
| 10-02-01 | 02 | 2 | ADAPT-03 | T-10-02-01 | `occt-core` normalizes and forwards appearance params without inventing fallback colors unless requested. | unit+integration | `node --test packages/occt-core/test/core.test.mjs packages/occt-core/test/live-root-integration.test.mjs` | ✅ | ⬜ pending |
| 10-02-02 | 02 | 2 | APPR-03, APPR-04, ADAPT-03 | T-10-02-02 | Built root carrier plus adapter keep custom-default behavior aligned under release-gate verification. | integration | `npm run test:release:root` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `dist/occt-js.d.ts` — public `defaultColor` typing plus precedence comments
- [ ] `src/importer.hpp` / `src/js-interface.cpp` — root parsing and resolved default-color policy
- [ ] `src/importer-xde.cpp` / `src/importer-brep.cpp` — custom default color application in both import lanes
- [ ] `packages/occt-core/src/occt-core.js` — appearance param normalization + forwarding
- [ ] `packages/occt-core/src/model-normalizer.js` — conditional fallback-material behavior
- [ ] `packages/occt-core/src/exact-model-normalizer.js` — threaded appearance context for normalized exact-open payloads
- [ ] `test/import_appearance_contract.test.mjs` and `packages/occt-core/test/*.test.mjs` — root and adapter contract coverage

---

## Manual-Only Verifications

All planned Phase 10 behavior should be automated.

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency remains acceptable for incremental work
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
