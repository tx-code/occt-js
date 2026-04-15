---
phase: 12
slug: root-alpha-opacity-fallback
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-15
---

# Phase 12 — Validation Strategy

> Per-phase validation contract for root opacity-fallback expansion.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node built-in test runner plus existing repo integration scripts |
| **Config file** | none — direct `node --test` / `npm` invocation |
| **Quick run command** | `node --test test/import_appearance_contract.test.mjs` |
| **Full suite command** | `npm run test:release:root` |
| **Estimated runtime** | ~1200 seconds |

---

## Sampling Rate

- **After every task commit:** Run the narrowest command that covers the seam just changed.
- **After Wave 1:** `powershell -NoProfile -Command "npm run build:wasm:win; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; node --test test/import_appearance_contract.test.mjs"`.
- **After Wave 2:** `powershell -NoProfile -Command "npm run build:wasm:win; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; node --test test/import_appearance_contract.test.mjs test/release_governance_contract.test.mjs"`.
- **Before `$gsd-verify-work`:** `npm run test:release:root` must be green.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 12-01-01 | 01 | 1 | APPR-06 | T-12-01-01 | Root contract tests fail until `defaultOpacity` is accepted as an explicit default-appearance option and raw colors/materials can expose opacity additively. | integration | `node --test test/import_appearance_contract.test.mjs` | ✅ | ⬜ pending |
| 12-01-02 | 01 | 1 | APPR-06 | T-12-01-02 | Shared root import params clamp and honor `defaultOpacity` only for `colorMode: "default"` without disturbing legacy RGB-only callers. | integration | `powershell -NoProfile -Command "npm run build:wasm:win; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; node --test test/import_appearance_contract.test.mjs"` | ✅ | ⬜ pending |
| 12-02-01 | 02 | 2 | APPR-06 | T-12-02-01 | `Read*` and `OpenExact*` keep the same opacity-fallback payload across STEP, IGES, and BREP while `source` and legacy modes still ignore `defaultOpacity`. | integration | `node --test test/import_appearance_contract.test.mjs` | ✅ | ⬜ pending |
| 12-02-02 | 02 | 2 | APPR-06 | T-12-02-02 | Root release verification catches drift in the expanded appearance contract after opacity fallback lands. | integration | `npm run test:release:root` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `dist/occt-js.d.ts` — `defaultOpacity` plus additive raw `opacity` typing/comments
- [ ] `src/importer.hpp` — opacity-aware `OcctColor` / `ImportParams` helpers
- [ ] `src/js-interface.cpp` — public import-param parsing and raw color/material serialization
- [ ] `src/importer-xde.cpp` / `src/importer-brep.cpp` — shared default-appearance opacity application if required by the importer seam
- [ ] `test/import_appearance_contract.test.mjs` — stateless and exact-lane opacity-fallback contract coverage

---

## Manual-Only Verifications

All planned Phase 12 behavior should be automated.

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency remains acceptable for incremental work
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
