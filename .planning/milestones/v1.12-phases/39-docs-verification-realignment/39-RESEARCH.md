# Phase 39: Docs & Verification Realignment - Research

**Date:** 2026-04-21
**Status:** Complete

## Summary

Phase 39 should finish `v1.12` by bringing the live docs, active planning truth, and conditional verification into line with the subtraction work already shipped in Phases 37 and 38. The repo no longer needs more measurement-surface design. It needs its remaining words and tests to stop describing the old product-like workflow.

The main work splits cleanly in two:

- rewrite live root/sdk/active-planning wording so the reduced sample-first/current-result boundary is the only truth left in active docs
- tighten the secondary-surface contract audit around that reduced wording and the maintained browser lane without changing `npm run test:release:root`

## Findings

### 1. The strongest live docs drift is in README and the SDK guide

- `README.md` still says the shipped browser demo keeps `selection-to-measure mapping`, `action presentation`, `overlay rendering`, and `transient run history` in app code.
- `docs/sdk/measurement.md` still uses the same old `selection-to-measure mapping` / `transient run history` wording.
- That language made sense before the `v1.12` subtraction, but it now overstates a richer measurement-product shape than the browser demo actually retains.

### 2. The package README is already the better reference point

- `packages/occt-core/README.md` now says the downstream browser demo keeps `supported exact action routing`, `overlay rendering`, and `current-result session behavior` in app code.
- That is the correct boundary language for the reduced sample and gives Phase 39 a concrete wording anchor instead of inventing a new framing from scratch.

### 3. The secondary-surface contract audit is now provably stale

- `test/secondary_surface_contract.test.mjs` still asserts that:
  - `README.md` contains `selection-to-measure mapping`
  - `packages/occt-core/README.md` contains `selection-to-measure mapping`
  - `docs/sdk/measurement.md` contains `selection-to-measure mapping`
  - `README.md` and `packages/occt-core/README.md` contain `transient run history`
- Phase 38 already removed those phrases from `packages/occt-core/README.md`, so the test is now out of sync with the retained package-facing truth.
- This is exactly the kind of drift `GOV-05` is supposed to catch once Phase 39 tightens the audit.

### 4. Active planning truth still carries one notable old-workflow claim

- `.planning/PROJECT.md` still has a validated Phase 34 bullet that says the browser demo supports `rerun/compare/clear flows`.
- That no longer matches the reduced sample-first/current-result browser demo kept after Phase 37.
- Because `.planning/PROJECT.md` is active truth, this is not harmless archive history; it should be realigned in Phase 39.

### 5. The repo shape has already moved away from dedicated demo workflow docs

- `docs/demo/` is currently missing, including the formerly referenced `docs/demo/exact-measurement-workflow.md`.
- That means Phase 39 should not depend on publishing or restoring a dedicated browser workflow guide.
- The pragmatic path is to keep the docs truth inside the surviving live surfaces: `README.md`, `docs/sdk/measurement.md`, and active `.planning/`.

### 6. Governance and release routing are already stable enough

- `test/release_governance_contract.test.mjs` already protects the split between `test:release:root` and `test:secondary:contracts`.
- The release command itself does not need to change.
- Phase 39 should therefore prefer targeted audit updates over any release-script churn.

## Recommended Implementation Shape

### Plan 39-01

- Rewrite the live docs around the reduced sample-first/current-result boundary.
- Use the Phase 38 package README wording as the canonical phrasing anchor.
- Clean active `.planning/PROJECT.md` where it still advertises removed measurement workflow behavior.

### Plan 39-02

- Update `test/secondary_surface_contract.test.mjs` to assert the reduced wording.
- Keep the maintained browser lane checks centered on the current demo loop and absence of dropped productivity surface.
- Reconfirm that `test:secondary:contracts` stays outside `test:release:root`.

## Risks and Mitigations

### Partial alignment

Risk:
- README or SDK docs could be rewritten while active planning truth or secondary contract tests still carry old terms.

Mitigation:
- Split the phase so docs/active-truth cleanup lands first and the verification audit is written against the new wording second.

### Over-documenting the demo

Risk:
- Phase 39 could drift into recreating a product-style measurement workflow doc or promising new UX shape.

Mitigation:
- Keep the documentation scope to existing live surfaces and describe the demo strictly as an integration sample.

### Governance churn

Risk:
- A docs cleanup phase could accidentally widen the release boundary or touch unrelated release scripts.

Mitigation:
- Keep `package.json` scripts unchanged and use existing governance tests as the route guard.

## Verification Strategy

### For docs and active planning truth

- `npm run test:planning:audit`

### For conditional verification and governance

- `node --test test/secondary_surface_contract.test.mjs`
- `node --test test/release_governance_contract.test.mjs`
- `npm --prefix demo run test:e2e`

## Recommended Phase Split

- `39-01-PLAN.md`: rewrite live docs and active planning truth around the reduced measurement/integration sample
- `39-02-PLAN.md`: realign secondary-surface contract tests and governance around the reduced wording and maintained browser lane

## Out of Scope Confirmation

- no new root Wasm or `occt-core` APIs
- no restored demo workflow doc under `docs/demo/`
- no new measurement-product UX or session workflows
- no release-script or root-gate widening
- no archive-wide wording sweep across historical milestone files

---

*Phase: 39-docs-verification-realignment*
*Research completed: 2026-04-21*
