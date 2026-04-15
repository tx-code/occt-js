---
phase: 7
slug: primitive-exact-geometry-queries
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-15
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node built-in test runner plus existing repo integration scripts |
| **Config file** | none — direct `node --test` invocation |
| **Quick run command** | `node --test test/exact_primitive_queries_contract.test.mjs && npm --prefix packages/occt-core test` |
| **Full suite command** | `npm run build:wasm:win && node --test test/exact_primitive_queries_contract.test.mjs && npm --prefix packages/occt-core test && npm test` |
| **Estimated runtime** | ~900 seconds |

---

## Sampling Rate

- **After every task commit:** Run the most local command that covers the changed seam.
- **After every plan wave:** Run `node --test test/exact_primitive_queries_contract.test.mjs && npm --prefix packages/occt-core test`.
- **Before phase completion:** Run the full suite command.
- **Max feedback latency:** 20 seconds for quick exact-primitive checks.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 07-01-01 | 01 | 1 | REF-03 | T-07-01-01 | Root exact queries classify analytic edge/face families and expose radius/center primitives with explicit unsupported-geometry failures. | integration | `node --test test/exact_primitive_queries_contract.test.mjs` | ❌ W0 | ⬜ pending |
| 07-01-02 | 01 | 1 | REF-03, MEAS-03 | T-07-01-02 | `occt-core` adapts classification/radius/center queries from occurrence-scoped exact refs without leaking world/occurrence concepts into wasm. | unit + integration | `npm --prefix packages/occt-core test` | ✅ | ⬜ pending |
| 07-02-01 | 02 | 2 | MEAS-03 | T-07-02-01 | Root exact queries return edge length and face area from retained exact definitions with unit-consistent numeric results. | integration | `node --test test/exact_primitive_queries_contract.test.mjs` | ❌ W0 | ⬜ pending |
| 07-02-02 | 02 | 2 | MEAS-03 | T-07-02-02 | Face-normal evaluation transforms world query points correctly through `occt-core`, returns explicit unsupported/query-range failures, and stays stable on repeated geometry occurrences. | unit + live integration | `powershell -NoProfile -Command "npm --prefix packages/occt-core test; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; npm test"` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `test/exact_primitive_queries_contract.test.mjs` — new root contract test covering classification, radius, center, edge length, face area, and face-normal evaluation
- [ ] `dist/occt-js.d.ts` — exact query typings for primitive geometry families and single-entity result DTOs
- [ ] `packages/occt-core/src/occt-core.js` — thin exact primitive-query wrappers using occurrence-scoped exact refs
- [ ] `packages/occt-core/test/live-root-integration.test.mjs` — live repeated-geometry coverage for transformed primitive query results

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Cone/sphere family coverage is either proven by current fixtures or explicitly deferred with a targeted fixture add | REF-03 | The current corpus may or may not already include stable cone/sphere coverage | During execution, document which families are proven by `cube_10x10.igs`, `simple_part.step`, and `bearing.igs`; if cone/sphere are still unproven, add a minimal fixture or explicitly defer them without widening Phase 7 scope |
| Downstream app can pass a picked world point into face-normal evaluation without inventing viewer-specific coordinate conventions | MEAS-03 | The repo can test adapter math, but not the downstream UI pick pipeline | After implementation, verify the downstream caller can supply world-space pick coordinates into the `occt-core` wrapper and receive a world-space normal aligned with the selected occurrence |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 20s for quick checks
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
