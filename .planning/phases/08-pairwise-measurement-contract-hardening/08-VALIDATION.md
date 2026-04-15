---
phase: 8
slug: pairwise-measurement-contract-hardening
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-15
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node built-in test runner plus existing repo integration scripts |
| **Config file** | none — direct `node --test` invocation |
| **Quick run command** | `node --test test/exact_pairwise_measurement_contract.test.mjs && npm --prefix packages/occt-core test` |
| **Full suite command** | `npm run build:wasm:win && node --test test/exact_pairwise_measurement_contract.test.mjs && npm --prefix packages/occt-core test && npm run test:release:root` |
| **Estimated runtime** | ~1200 seconds |

---

## Sampling Rate

- **After every task commit:** Run the most local command that covers the changed seam.
- **After every plan wave:** Run `node --test test/exact_pairwise_measurement_contract.test.mjs && npm --prefix packages/occt-core test`.
- **Before phase completion:** Run the full suite command.
- **Max feedback latency:** 30 seconds for quick pairwise checks.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 08-01-01 | 01 | 1 | MEAS-01, MEAS-02 | T-08-01-01 | Root pairwise distance and angle queries return overlay-ready attach geometry and explicit failures. | integration | `node --test test/exact_pairwise_measurement_contract.test.mjs` | ❌ W0 | ⬜ pending |
| 08-01-02 | 01 | 1 | ADAPT-01 | T-08-01-02 | `occt-core` forwards occurrence transforms and preserves pairwise success DTOs for repeated geometry. | unit + integration | `npm --prefix packages/occt-core test` | ✅ | ⬜ pending |
| 08-02-01 | 02 | 2 | MEAS-04 | T-08-02-01 | Exact thickness uses planar offset rather than boundary min distance and rejects unsupported geometry explicitly. | integration | `node --test test/exact_pairwise_measurement_contract.test.mjs` | ❌ W0 | ⬜ pending |
| 08-02-02 | 02 | 2 | MEAS-05 | T-08-02-02 | Pairwise exact failures stay stable across root and `occt-core` for invalid ids, unsupported geometry, and parallel/coincident cases. | unit + integration | `powershell -NoProfile -Command "npm --prefix packages/occt-core test; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; node --test test/exact_pairwise_measurement_contract.test.mjs"` | ✅ | ⬜ pending |
| 08-03-01 | 03 | 3 | ADAPT-01, ADAPT-02 | T-08-03-01 | Package adapters and docs describe exact pairwise measurement entrypoints without viewer-only prerequisites. | docs + contract | `node --test test/release_governance_contract.test.mjs` | ✅ | ⬜ pending |
| 08-03-02 | 03 | 3 | ADAPT-02 | T-08-03-02 | Root release verification and npm test surfaces include exact pairwise measurement coverage. | release gate | `npm run test:release:root` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `test/exact_pairwise_measurement_contract.test.mjs` — new root contract test covering exact distance, angle, thickness, and pairwise failure semantics
- [ ] `dist/occt-js.d.ts` — pairwise exact measurement typings and DTOs
- [ ] `packages/occt-core/src/occt-core.js` — pairwise exact wrappers using occurrence-scoped exact refs and transforms
- [ ] `packages/occt-core/test/live-root-integration.test.mjs` — repeated-geometry transform coverage for pairwise measurements
- [ ] `test/release_governance_contract.test.mjs` — exact pairwise measurement docs/release assertions

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Cross-model pairwise support either falls out naturally or is explicitly documented as not guaranteed for v1.1 | ADAPT-01 | Current milestone success criteria do not require separate cross-model fixtures | During execution, note whether the transform-aware root query path works when `refA.exactModelId !== refB.exactModelId`; if not, document same-model support as the guaranteed contract without widening scope |
| App-side consumers can use returned working-plane data directly for overlays without inventing extra heuristics | MEAS-01, MEAS-02 | Repo tests can validate DTO shape, not downstream annotation UX | After implementation, inspect one returned distance result and one returned angle result from a real caller path and confirm `workingPlaneOrigin` / `workingPlaneNormal` are sufficient for overlay placement |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s for quick checks
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
