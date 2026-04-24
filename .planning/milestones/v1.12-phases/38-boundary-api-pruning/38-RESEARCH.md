# Phase 38: Boundary & API Pruning - Research

**Date:** 2026-04-21
**Status:** Complete

## Summary

Phase 38 does not need another measurement capability expansion. The retained root and package surface is already narrow enough after the `v1.11` rollback and Phase 37 demo subtraction. The remaining work is ownership cleanup:

- tighten demo-owned helper seams so they no longer read like shared SDK analysis utilities
- harden `@tx-code/occt-core` exports and typings around the reduced contract
- defer the broader docs/governance rewrite to Phase 39

## Findings

### 1. The package surface is already mostly in the right place

- `packages/occt-core/src/occt-core.js` and `packages/occt-core/src/index.d.ts` expose retained exact primitives, placement helpers, relation classification, hole/chamfer/counterbore/countersink helpers, midpoint/equal-distance/symmetry helpers, and exact face-area/edge-length primitives.
- `packages/occt-core/test/package-contract.test.mjs` already asserts the absence of candidate-analysis descriptors such as `OcctExactMeasurementCandidate` and `analyzeExactMeasurementCandidates`.
- This means Phase 38 should avoid inventing package churn unless the audit finds a real leaked public seam.

### 2. The clearest remaining drift is in demo-owned helper naming

- `demo/src/lib/measurement-actions.js` is on the correct side of the boundary because it lives under `demo/`, but its exported names still read generic:
  - `deriveMeasurementAvailability(...)`
  - `runMeasurementAction(...)`
- The file also still carries internal wording like `ACTION_DEFINITIONS` and older test descriptions that refer to "candidate descriptors," which no longer matches the accepted boundary.
- This is the best target for `38-01`: tighten naming and ownership without changing the shipped exact capability set.

### 3. Browser-visible copy still leaks internal ownership jargon

- `SelectionPanel.jsx` currently displays `Explicit demo-owned exact actions`.
- That copy is technically true, but it is not good boundary language for a user-facing integration sample. The user should see "supported exact actions" or similarly neutral wording.
- This is a small but concrete subtraction that fits Phase 38 better than another feature.

### 4. Real docs/test drift still exists, but it belongs mostly to Phase 39

- `README.md`, `packages/occt-core/README.md`, `docs/sdk/measurement.md`, and `test/secondary_surface_contract.test.mjs` still assert wording such as:
  - `selection-to-measure mapping`
  - `transient run history`
- That wording is now stale after Phase 37, but rewriting those materials is exactly what Phase 39 is for.
- Phase 38 should only touch docs/tests here if a code-adjacent contract would otherwise be actively misleading.

### 5. Release-boundary discipline is already strong and should stay unchanged

- `test/release_governance_contract.test.mjs` keeps `npm run test:release:root` focused on the authoritative root gate.
- Phase 38 should preserve that routing and avoid broad verification churn.
- The likely governance work in this phase is small: targeted contract hardening around package exports or helper ownership, not release-flow redesign.

## Recommended Implementation Shape

### Plan 38-01

- Clean up the demo-owned measurement action seam.
- Make naming and browser copy explicitly downstream/sample-local.
- Remove stale candidate-style wording from demo tests and helper code.
- Preserve the Phase 37 import-first, current-result-centric browser workflow.

### Plan 38-02

- Audit `@tx-code/occt-core` exports and typings against the reduced contract.
- Add or tighten contract tests that prove:
  - demo routing/session semantics are not published
  - retained helper/primitive exports stay available
  - release-boundary routing stays unchanged
- Only edit package barrel/types if the audit finds a real ambiguous or leaked surface.

## Risks and Mitigations

### Fake subtraction

Risk:
- The phase could degenerate into wording-only cleanup without clarifying an actual ownership seam.

Mitigation:
- Make `38-01` change the demo helper seam itself, not only comments or docs.

### Over-pruning

Risk:
- The package audit could remove or destabilize retained helper primitives that are legitimate reusable contract surface.

Mitigation:
- Keep `packages/occt-core/test/package-contract.test.mjs` centered on retained public behavior and absence-of-drift checks.

### Scope spill into docs/governance

Risk:
- Fixing stale wording could pull Phase 38 into a broad README/SDK/secondary-contract rewrite.

Mitigation:
- Treat Phase 39 as the default destination for doc/governance cleanup and only make minimal code-adjacent wording fixes in Phase 38 when necessary.

## Verification Strategy

### For demo-owned seam cleanup

- `npm --prefix demo test`
- `npm --prefix demo run build`
- `npm --prefix demo run test:e2e`
- `npx playwright test --config playwright.config.mjs demo/tests/demo.spec.mjs`

### For package/export hardening

- `npm --prefix packages/occt-core test`
- `node --test test/release_governance_contract.test.mjs`

## Recommended Phase Split

- `38-01-PLAN.md`: tighten the demo-owned measurement action seam and remove stale pseudo-SDK wording
- `38-02-PLAN.md`: harden package typings/exports and targeted contract coverage around the reduced surface

## Out of Scope Confirmation

- no new root Wasm APIs
- no new exact helper families
- no new candidate-analysis or session-productivity behavior
- no full README/SDK/governance rewrite in this phase
- no change to the authoritative `npm run test:release:root` boundary

---

*Phase: 38-boundary-api-pruning*
*Research completed: 2026-04-21*
