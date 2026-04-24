# Phase 42: Docs & Conditional Verification for CAM Sample - Research

**Date:** 2026-04-22
**Status:** Complete

## Summary

Phase 42 should close `v1.13` by aligning canonical docs, active planning truth, and conditional verification with what Phases 40-41 already shipped: a narrow CAM-flavored browser sample composed over existing exact primitives, with unchanged root release boundaries.

No new runtime/package feature gap is proven. The remaining work is governance consistency.

## Findings

### 1. CAM sample behavior is implemented, but canonical docs understate it

- `demo/tests/measurement-actions.test.mjs` and `demo/tests/demo.spec.mjs` already lock shipped CAM sample actions (`clearance`, `step-depth`, `center-to-center`, `surface-to-center`) and typed unsupported flows.
- Canonical docs (`README.md`, `docs/sdk/measurement.md`, `packages/occt-core/README.md`) keep the correct high-level ownership boundary, but they do not yet consistently reflect the specific `v1.13` CAM sample set that is now part of active milestone truth.

Conclusion:
- `DOCS-08` should be solved by tightening wording consistency, not by expanding APIs.

### 2. Ownership split is already clear in one source and should be promoted

- `docs/plan/cam-measurement-matrix.md` already states the intended split:
  - exact reusable primitives stay in runtime/package
  - CAM naming and action routing stay demo-owned
- This file is currently a planning reference note, not the canonical downstream doc surface.

Conclusion:
- Phase 42 should reflect that same split in canonical docs, without making the research note itself a runtime contract.

### 3. Conditional secondary contract tests do not fully lock CAM sample drift

- `test/secondary_surface_contract.test.mjs` already enforces release-boundary routing and basic measurement-loop behavior, but CAM-specific drift checks are not explicit enough for the new `v1.13` sample framing.
- The maintained browser lane is already tied to `demo/tests/demo.spec.mjs`, so adding CAM sample markers there is low risk.

Conclusion:
- `GOV-06` should add targeted CAM drift assertions to secondary/gov tests rather than changing scripts.

### 4. Release governance boundary is already stable and must remain unchanged

- `test/release_governance_contract.test.mjs` already guards that `test:secondary:contracts` stays outside `test:release:root`.
- `package.json` scripts already express the correct command split.

Conclusion:
- Phase 42 should strengthen wording/coverage while keeping release command surfaces unchanged.

### 5. Active planning truth is close, but phase state transitions still need sync

- `.planning/PROJECT.md` and `.planning/ROADMAP.md` already state Phase 42 intent.
- `.planning/STATE.md` still marks "Phase 42 planning next"; once planning artifacts are written, it should move to execution-ready.

Conclusion:
- Synchronizing planning state is required for clean GSD continuity.

## Recommended Implementation Shape

### Plan 42-01

- Align canonical docs and active planning truth to explicitly describe the shipped CAM sample ownership split.
- Keep wording narrow: demo-owned CAM workflows over reusable exact primitives.
- Verify with planning audit plus conditional docs contract checks.

### Plan 42-02

- Tighten conditional browser/governance assertions to fail on CAM sample drift.
- Keep authoritative root release routing unchanged and explicitly guarded.
- Verify with secondary/governance tests plus maintained demo browser lane.

## Risks and Mitigations

### Risk: docs overclaim package/root CAM contracts

Mitigation:
- Keep CAM names explicitly demo-owned and composition-based in docs.
- Keep primitive APIs (`distance`, `thickness`, `center`, helpers) as reusable contract surface.

### Risk: fragile conditional assertions

Mitigation:
- Assert stable markers already used in maintained tests (action ids, explicit command routing), not broad snapshot-like prose.

### Risk: release-boundary regression by over-coupling secondary checks

Mitigation:
- Keep `release_governance_contract` assertions explicit that secondary lanes remain outside `test:release:root`.

## Verification Strategy

### Docs/planning truth

- `node --test test/secondary_surface_contract.test.mjs`
- `npm run test:planning:audit`

### Conditional CAM governance

- `node --test test/secondary_surface_contract.test.mjs`
- `node --test test/release_governance_contract.test.mjs`
- `npm --prefix demo run test:e2e`

## Recommended Phase Split

- `42-01-PLAN.md`: docs and planning-truth realignment for the CAM sample ownership boundary
- `42-02-PLAN.md`: conditional browser/governance CAM drift coverage with unchanged root release routing

## Out of Scope Confirmation

- no new root Wasm or `@tx-code/occt-core` APIs
- no new demo workflows
- no widening of `npm run test:release:root`
- no PMI/CMM/probing/report or tolerance-product scope

---

*Phase: 42-docs-conditional-verification-cam-sample-lock*
*Research completed: 2026-04-22*
