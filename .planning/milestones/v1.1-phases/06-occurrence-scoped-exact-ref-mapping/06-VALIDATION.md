---
phase: 6
slug: occurrence-scoped-exact-ref-mapping
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-14
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node built-in test runner plus existing repo integration scripts |
| **Config file** | none — direct `node --test` invocation |
| **Quick run command** | `node --test test/exact_ref_mapping_contract.test.mjs && npm --prefix packages/occt-core test` |
| **Full suite command** | `npm run build:wasm:win && node --test test/exact_ref_mapping_contract.test.mjs && npm --prefix packages/occt-core test && npm test` |
| **Estimated runtime** | ~900 seconds |

---

## Sampling Rate

- **After every task commit:** Run the most local command that covers the changed seam.
- **After every plan wave:** Run `node --test test/exact_ref_mapping_contract.test.mjs && npm --prefix packages/occt-core test`.
- **Before phase completion:** Run the full suite command.
- **Max feedback latency:** 20 seconds for quick ref-mapping checks.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 1 | REF-01 | T-06-01-01 | Exact open returns one exact-definition binding per exported geometry and keeps binding counts aligned under reused geometry definitions. | integration | `node --test test/exact_ref_mapping_contract.test.mjs` | ❌ W0 | ⬜ pending |
| 06-01-02 | 01 | 1 | REF-01 | T-06-01-02 | Exact definition bindings stay definition-scoped and do not encode viewer-specific occurrence ids. | static + integration | `node --test test/exact_ref_mapping_contract.test.mjs` | ❌ W0 | ⬜ pending |
| 06-02-01 | 02 | 2 | REF-02 | T-06-02-01 | `occt-core` resolves existing node/geometry/topology ids into occurrence-scoped exact refs without hiding invalid-id or invalid-handle failures. | unit + integration | `npm --prefix packages/occt-core test` | ✅ | ⬜ pending |
| 06-02-02 | 02 | 2 | REF-01, REF-02 | T-06-02-02 | Reused geometry instances share one exact definition handle but keep distinct occurrence context across repeated calls. | live integration | `powershell -NoProfile -Command "npm --prefix packages/occt-core test; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; npm test"` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `test/exact_ref_mapping_contract.test.mjs` — new root contract test for exact-definition binding alignment and reused-geometry coverage
- [ ] `dist/occt-js.d.ts` — exact-definition binding types for the exact-open result
- [ ] `packages/occt-core/src/exact-model-normalizer.js` — normalize root exact-open binding payload into geometry-id keyed metadata
- [ ] `packages/occt-core/src/exact-ref-resolver.js` — resolve occurrence-scoped exact refs with explicit failure DTOs

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Downstream app keeps `geometryId` available when persisting face selections across UI hops | REF-02 | `imos-app` selection-store shape is outside this repo and currently drops `geometryId` from face selection items | After implementation, verify the downstream caller path still has access to `nodeId`, `geometryId`, and `elementId` when reconstructing a measurement ref from a stored selection |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 20s for quick checks
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
