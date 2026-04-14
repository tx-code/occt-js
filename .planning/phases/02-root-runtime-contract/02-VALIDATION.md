---
phase: 02
slug: root-runtime-contract
status: draft
nyquist_compliant: false
wave_0_complete: true
created: 2026-04-14
---

# Phase 02 — Validation Strategy

> Per-phase validation contract for root Wasm runtime contract work.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Existing Node.js runtime test scripts plus Windows Wasm rebuild |
| **Config file** | none |
| **Quick run command** | `node test/test_multi_format_exports.mjs && node test/test_step_iges_root_mode.mjs && node test/test_brep_root_mode.mjs && node test/test_optimal_orientation_api.mjs && node test/test_optimal_orientation_reference.mjs` |
| **Full suite command** | `npm run build:wasm:win && npm test` |
| **Estimated runtime** | ~15 seconds targeted runtime checks / ~90 seconds rebuild plus full suite |

---

## Sampling Rate

- **After pure JS test edits:** run the relevant targeted `node test/...` command first.
- **After any C++ or Embind edit:** run `npm run build:wasm:win` followed by the relevant targeted `node test/...` command.
- **After every plan wave:** run `npm run build:wasm:win && npm test`.
- **Before Phase 02 is considered complete:** `npm run build:wasm:win && npm test` must be green.
- **Max feedback latency:** ~90 seconds after code-generation tasks that touch the Wasm runtime.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Status |
|---------|------|------|-------------|-----------|-------------------|--------|
| 02-01-01 | 01 | 1 | CORE-02 | contract | `node test/test_multi_format_exports.mjs` | ⬜ pending |
| 02-01-02 | 01 | 1 | CORE-02 | rebuild+contract | `npm run build:wasm:win && node test/test_multi_format_exports.mjs` | ⬜ pending |
| 02-02-01 | 02 | 1 | CORE-03 | contract | `node test/test_step_iges_root_mode.mjs && node test/test_brep_root_mode.mjs` | ⬜ pending |
| 02-02-02 | 02 | 1 | CORE-03 | rebuild+contract | `npm run build:wasm:win && node test/test_step_iges_root_mode.mjs && node test/test_brep_root_mode.mjs` | ⬜ pending |
| 02-03-01 | 03 | 2 | CORE-04 | contract | `node test/test_optimal_orientation_api.mjs && node test/test_optimal_orientation_reference.mjs` | ⬜ pending |
| 02-03-02 | 03 | 2 | CORE-04 | rebuild+contract | `npm run build:wasm:win && node test/test_optimal_orientation_api.mjs && node test/test_optimal_orientation_reference.mjs` | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing fixtures and the Phase 01 build baseline cover Wave 0 prerequisites for this phase.

---

## Manual-Only Verifications

None expected. All Phase 02 contract changes must be backed by automated tests.

---

## Validation Sign-Off

- [x] All planned tasks have automated verification
- [x] Wave 0 prerequisites exist
- [x] Full rebuild gate is defined
- [x] No watch-mode commands are required
- [ ] Feedback latency under 30s for all tasks

**Approval:** pending
