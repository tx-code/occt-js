# Phase 40: Demo CAM Workflow Composition - Research

**Date:** 2026-04-22
**Status:** Complete

## Summary

Phase 40 does not need another exact-runtime expansion. The shipped exact surface already covers the narrow CAM sample set targeted by `v1.13`. The real work is in demo composition:

- extend the demo action catalog beyond “one core call plus optional placement call”
- compose CAM-flavored workflows over distance, thickness, center, radius, and supported hole-family helpers
- keep the current one-result browser sample intact while proving more practical workpiece/tool measurement stories

## Findings

### 1. The core primitives are already present

- `measureExactDistance(...)` plus `suggestExactDistancePlacement(...)` is enough for a truthful `clearance` workflow when the selected refs and scenario semantics support that naming.
- `measureExactThickness(...)` plus `suggestExactThicknessPlacement(...)` is enough for a truthful `step depth` workflow on supported planar face pairs.
- `measureExactCenter(...)` is already shipped and exposed package-first. That is the key primitive needed for center-based demo compositions.
- `measureExactRadius(...)`, `describeExactHole(...)`, `describeExactCounterbore(...)`, and `describeExactCountersink(...)` provide supporting axis/frame/anchor information for circular and hole-family cases.

Conclusion:
- No new root/package primitive gap is proven for the accepted Phase 40 workflows.

### 2. The real limitation is demo infrastructure, not kernel capability

- `demo/src/lib/measurement-actions.js` is still shaped around a direct dispatch table where one action maps to one core call and optionally one placement call.
- Center-based workflows will require multi-call compositions such as:
  - center query on one ref
  - center query on another ref, or surface distance query against a center-capable result
  - synthetic summary and possibly synthetic placement
- That means Phase 40 should first refactor the demo action catalog/executor into explicit composition handlers instead of trying to add more generic action metadata.

### 3. Mixed-selection scope should stay conservative

- Current availability logic is selection-shape-based and only supports one face, one edge, two faces, or two edges.
- Mixed `face + edge` routing is currently unsupported.
- Because `surface-to-center` could tempt the phase into broad mixed-selection work, the safest first step is to prefer:
  - face-pair or edge-pair center-based workflows when both refs are center-capable
  - supported hole/circular families where the center is already well-defined
- For `surface-to-center`, the concrete supported Phase 40 variant should be a face-pair path rather than a mixed `face + edge` route.
- If a narrow mixed-selection path proves necessary later, it should be justified by browser scenarios rather than assumed as phase entry scope.

### 4. Overlay risk is manageable if placement kinds are reused

- `demo/src/lib/measurement-overlay.js` already knows how to render placement kinds such as `distance`, `thickness`, `radius`, `diameter`, and helper families.
- If Phase 40 composes CAM workflows into synthetic placement DTOs that reuse existing placement kinds, overlay support likely needs little or no expansion.
- If a workflow cannot produce an honest existing placement shape, the phase should prefer explicit panel-only messaging rather than inventing a new overlay grammar prematurely.

### 5. Browser verification should stay scenario-focused

- The maintained sample already proves cross-model exact distance and helper flows.
- Phase 40 should add:
  - node tests for composed CAM handlers and unsupported routing
  - browser tests for at least one clearance/step-depth path and one center-based path
  - preserved tool-pose invalidation assertions for the one-result state
- Store/history complexity should remain unchanged; the current one-result model is already correct for this milestone.

## Recommended Implementation Shape

### Plan 40-01

- Refactor the demo action catalog/executor into explicit composition-capable handlers.
- Add CAM action ids and synthetic summaries over shipped exact primitives.
- Reuse existing placement kinds such as `distance` or `thickness` where honest and sufficient.
- Keep the work focused on demo-local composition and node-level verification.

### Plan 40-02

- Drive those new actions through the existing browser sample in representative workpiece/tool scenarios.
- Keep the one-result measurement surface and invalidation behavior unchanged.
- Limit UI changes to what is needed to expose and validate the new workflows; broader CAM wording cleanup belongs to Phase 41.

## Risks and Mitigations

### Fake kernel gap

Risk:
- The phase could assume a missing root/package primitive and widen public surface unnecessarily.

Mitigation:
- Require any proposed API gap to be proven against `measureExactDistance`, `measureExactThickness`, `measureExactCenter`, `measureExactRadius`, and supported hole-family helpers first.

### Over-broad selection policy

Risk:
- `surface-to-center` could drag the phase into arbitrary mixed-selection logic or weakly defined center semantics.

Mitigation:
- Start with narrow center-capable variants and honest panel-only fallback where selection semantics are not stable enough yet.

### Overlay drift

Risk:
- Composed workflows could invent a new placement kind that the overlay pipeline does not understand.

Mitigation:
- Prefer synthetic `distance`/`thickness` placement DTOs or explicit panel-only messaging over new ad hoc overlay semantics.

## Verification Strategy

### Node coverage

- `demo/tests/measurement-actions.test.mjs`
- `demo/tests/measurement-overlay.test.mjs` only if placement reuse is insufficient
- `demo/tests/viewer-store.test.mjs` if composed actions expose new invalidation-sensitive current-result behavior

### Browser coverage

- `demo/tests/demo.spec.mjs`
- At least one workpiece/tool CAM scenario using the current one-result sample
- Existing invalidation coverage must remain green

### Commands

- `npm --prefix demo test`
- `npm --prefix demo run build`
- `npm --prefix demo run test:e2e`
- `npx playwright test --config playwright.config.mjs demo/tests/demo.spec.mjs`

## Recommended Phase Split

- `40-01-PLAN.md`: refactor the demo action catalog and add CAM workflow compositions over shipped exact primitives
- `40-02-PLAN.md`: prove those workflows in the current browser sample with representative workpiece/tool scenarios and preserved one-result semantics

## Out of Scope Confirmation

- no new root Wasm APIs
- no new `@tx-code/occt-core` APIs
- no product-style inspection history, tolerance, report, or probing workflows
- no whole-model CAM analysis
- no change to the authoritative `npm run test:release:root` boundary

---

*Phase: 40-demo-cam-workflow-composition*
*Research completed: 2026-04-22*
