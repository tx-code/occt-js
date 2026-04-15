---
phase: 9
slug: root-import-appearance-mode
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-15
---

# Phase 9 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node built-in test runner plus existing repo integration scripts |
| **Config file** | none — direct `node --test` / `node` invocation |
| **Quick run command** | `node --test test/import_appearance_contract.test.mjs` |
| **Full suite command** | `npm run test:release:root` |
| **Estimated runtime** | ~1200 seconds |

---

## Sampling Rate

- **After every task commit:** Run the most local command that covers the changed seam.
- **After every plan wave:** Run `powershell -NoProfile -Command "npm run build:wasm:win; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; node --test test/import_appearance_contract.test.mjs; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; node test/test_multi_format_exports.mjs"`.
- **Before `$gsd-verify-work`:** `npm run test:release:root` must be green.
- **Max feedback latency:** 30 seconds for quick import-appearance checks.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 09-01-01 | 01 | 1 | APPR-01, APPR-02 | T-09-01-01 | Explicit `colorMode` contract is locked by failing root tests before implementation. | integration | `node --test test/import_appearance_contract.test.mjs` | ❌ W0 | ⬜ pending |
| 09-01-02 | 01 | 1 | APPR-01, APPR-02 | T-09-01-02 | Root read APIs return one built-in default CAD color in `default` mode and preserve source colors in `source` mode. | integration | `powershell -NoProfile -Command "npm run build:wasm:win; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; node --test test/import_appearance_contract.test.mjs"` | ✅ | ⬜ pending |
| 09-02-01 | 02 | 2 | APPR-05 | T-09-02-01 | Legacy `readColors` behavior and explicit `colorMode` precedence are locked across generic and format-specific entry points. | integration | `powershell -NoProfile -Command "node --test test/import_appearance_contract.test.mjs; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; node test/test_multi_format_exports.mjs"` | ✅ | ⬜ pending |
| 09-02-02 | 02 | 2 | APPR-01, APPR-02, APPR-05 | T-09-02-02 | `OpenExact*` import results stay in appearance-mode parity with `Read*` while preserving exact bindings and lifecycle behavior. | integration | `powershell -NoProfile -Command "npm run build:wasm:win; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; node --test test/import_appearance_contract.test.mjs test/exact_model_lifecycle_contract.test.mjs; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; node test/test_multi_format_exports.mjs"` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `test/import_appearance_contract.test.mjs` — new root contract coverage for `colorMode`, built-in default color, `readColors` precedence, and exact-open parity
- [ ] `dist/occt-js.d.ts` — `colorMode` typing plus precedence comments for legacy `readColors`
- [ ] `src/importer.hpp` — appearance-mode enum or equivalent root import-contract fields
- [ ] `src/importer-xde.cpp` / `src/importer-brep.cpp` — import-time appearance application for source/default/legacy modes

---

## Manual-Only Verifications

All phase behaviors should have automated verification.

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
