# Phase 34: Measurement Commands & Overlay MVP - Research

**Date:** 2026-04-21
**Status:** Complete

## Summary

Phase 34 does not need new root exact APIs. The current repository already has the required actor-scoped selection bridge, cross-model pairwise measurement support, package-first measurement wrappers, and placement DTOs. The work is demo-local orchestration: command routing, run-history state, typed result presentation, and placement-backed overlay rendering.

## Existing Reusable Surfaces

### Selection and Exact Inputs

- `demo/src/hooks/usePicking.js` already resolves picks into actor-scoped `exactRef` payloads with composed `actorPose * occurrenceTransform`.
- `demo/src/store/viewerStore.js` already stores `selectedItems` and `selectedDetail` as serializable summaries.
- `demo/tests/exact-selection-bridge.test.mjs` already locks the actor-aware selection contract that Phase 34 should consume rather than reopen.

### Measurement and Placement APIs

- `packages/occt-core/src/occt-core.js` already exposes:
  - pairwise: `measureExactDistance`, `measureExactAngle`, `measureExactThickness`
  - pairwise placement: `suggestExactDistancePlacement`, `suggestExactAnglePlacement`, `suggestExactThicknessPlacement`
  - single-ref placement/query: `suggestExactRadiusPlacement`, `suggestExactDiameterPlacement`, `measureExactRadius`, `measureExactEdgeLength`, `measureExactFaceArea`, `measureExactCenter`
  - helper family: `classifyExactRelation`, `describeExactHole`, `describeExactChamfer`, midpoint/equal-distance/symmetry helpers
- Cross-model dispatch is already implemented package-first, so workpiece/tool measurements can stay demo-local.
- Placement helpers already return `frame`, `anchors`, and optional `axisDirection`, which is enough for a minimal overlay MVP.

### Demo UI and Scene Integration

- `demo/src/components/SelectionPanel.jsx` is already the live inspector for tool pose and selection metadata. It is the lowest-friction place to add command buttons and typed result rows.
- `demo/src/hooks/useViewer.js` already owns reusable line-pass infrastructure and highlight layer management, including depth-safe overlay rendering in rendering group `1`.
- `packages/occt-babylon-viewer/src/occt-babylon-viewer.js` already preserves depth state for overlay-style edge rendering and should not need structural changes beyond demo-owned batch injection.

## Recommended Implementation Shape

### Plan 34-01

- Add a demo-local measurement action registry that derives supported commands from the current selection count and element kinds.
- Add a demo-local measurement runner hook that calls `@tx-code/occt-core`, normalizes success/failure rows, and stores a short in-memory run history.
- Keep measurement runs separate from selection state.
- Clear run history on workspace reset, exact-session replacement, and actor-pose changes.
- Extend the existing inspector UI with:
  - supported action buttons
  - typed result rows
  - active-result selection
  - clear and rerun controls

### Plan 34-02

- Convert placement DTOs into demo-owned overlay batches and anchor markers.
- Keep one active overlay at a time.
- Reuse line-pass layers for guide geometry; do not add 3D text labels.
- If a measurement family has no stable placement DTO, keep it panel-only and say so explicitly instead of guessing overlay geometry.

## Risks and Mitigations

### Stale measurement history

Risk:
- Historical runs can become invalid when the tool pose changes or exact sessions are replaced.

Mitigation:
- Treat actor-pose changes, workspace reset, and exact-session replacement as hard invalidation boundaries for measurement runs and overlays.

### Unsupported command combinations

Risk:
- Showing commands that the current ref kinds cannot satisfy would create noisy runtime failures and a poor MVP.

Mitigation:
- Use a table-driven action registry that surfaces only supported commands and returns typed unsupported feedback for all other combinations.

### Overlay drift or leaks

Risk:
- Overlay batches can linger after active-result switches, clears, or scene rebuilds.

Mitigation:
- Bind overlay lifecycle to one active measurement result and dispose it on result switch, clear-all, workspace reset, exact-session replacement, and actor-pose change.

## Verification Strategy

- Node tests:
  - command availability and typed result normalization
  - store invalidation of measurement runs
  - overlay translation from placement DTOs to demo-owned batches
- Browser coverage:
  - select workpiece/tool refs
  - run one or more measurements
  - inspect typed results
  - switch active result
  - clear runs
  - verify overlays appear and disappear correctly
- Commands:
  - `npm --prefix demo test`
  - `npm --prefix demo run build`
  - `npm --prefix demo run test:e2e`
  - `npx playwright test --config playwright.config.mjs demo/tests/demo.spec.mjs`

## Recommended Phase Split

- `34-01-PLAN.md`: measurement action runner, result state, typed panel, compare/clear/rerun flows
- `34-02-PLAN.md`: placement-backed overlay translation and viewer integration

## Out of Scope Confirmation

- no new root exact APIs
- no Babylon package API expansion
- no 3D text labels or full dimension widgets
- no persistent reporting/export/history
- no whole-model candidate discovery

---

*Phase: 34-measurement-commands-overlay-mvp*
*Research completed: 2026-04-21*
