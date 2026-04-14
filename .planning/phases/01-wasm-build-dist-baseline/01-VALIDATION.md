---
phase: 01
slug: wasm-build-dist-baseline
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-14
---

# Phase 01 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js built-in test runner plus existing root `node` script execution |
| **Config file** | none |
| **Quick run command** | `node --test test/wasm_build_prereqs.test.mjs test/load_occt_factory.test.mjs test/dist_contract_consumers.test.mjs test/wasm_build_contract.test.mjs` |
| **Full suite command** | `npm run build:wasm:win && npm test` |
| **Estimated runtime** | ~180 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node --test test/wasm_build_prereqs.test.mjs test/load_occt_factory.test.mjs test/dist_contract_consumers.test.mjs test/wasm_build_contract.test.mjs`
- **After every plan wave:** Run `npm run build:wasm:win && npm test`
- **Before `/gsd-verify-work`:** `npm run build:wasm:win && npm test` must be green
- **Max feedback latency:** 180 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | CORE-01 | T-01-01 / T-01-02 | Script and CMake contract keep `dist/` canonical and preserve retained diagnostics | unit | `node --test test/wasm_build_contract.test.mjs` | ✅ | ⬜ pending |
| 01-01-02 | 01 | 1 | CORE-01 | T-01-01 / T-01-02 | Clean Windows flow produces canonical `dist/` artifacts and keeps `build/wasm-build.log` plus retry guidance | smoke | `npm run build:wasm:win && npm test` | ✅ | ⬜ pending |
| 01-02-01 | 02 | 1 | CORE-01 | T-01-03 | Fast preflight catches missing submodule/toolchain/type-definition/runtime-artifact states with actionable messaging | unit | `node --test test/wasm_build_prereqs.test.mjs test/load_occt_factory.test.mjs` | ✅ | ⬜ pending |
| 01-02-02 | 02 | 1 | CORE-01 | T-01-04 | Package, demo, and Tauri references stay anchored to canonical `dist/` artifacts | unit | `node --test test/wasm_build_prereqs.test.mjs test/load_occt_factory.test.mjs test/dist_contract_consumers.test.mjs` | ✅ | ⬜ pending |
| 01-03-01 | 03 | 2 | CORE-01 | T-01-06 | Root command surface exposes fast preflight separately from full runtime verification | cli | `npm pkg get scripts.test scripts.test:wasm:preflight` | ✅ | ⬜ pending |
| 01-03-02 | 03 | 2 | CORE-01 | T-01-05 | README and AGENTS describe the same Windows-first build and troubleshooting contract | grep | `rg -n \"build/wasm/emsdk|npm run build:wasm:win|test:wasm:preflight|npm test|dist/occt-js\\.(js|wasm|d\\.ts)|build/wasm-build.log|BUILD_JOBS=1\" README.md AGENTS.md package.json` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

---

## Manual-Only Verifications

All phase behaviors have automated verification.

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 180s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
