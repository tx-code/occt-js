---
phase: 34-measurement-commands-overlay-mvp
plan: "01"
subsystem: measurement-commands-panel
tags: [demo, exact, measurement, inspector, tdd]
requires:
  - phase: 34-measurement-commands-overlay-mvp
    provides: Phase 34 context and plan baseline
  - file: .planning/phases/34-measurement-commands-overlay-mvp/34-01-PLAN.md
    provides: Measurement command runner and typed result panel requirements
provides:
  - Demo-owned measurement command matrix derived from actor-scoped exact selection refs
  - Store-owned measurement run history and active-result state with deterministic lifecycle invalidation
  - Selection-panel measurement UI for run, rerun, compare, and clear flows
affects: [phase-34, demo, browser-verification]
tech-stack:
  added: []
  patterns: [demo-owned-measurement-runner, typed-result-rows, lifecycle-bound-history, package-first-exact-dispatch]
key-files:
  modified:
    - demo/src/App.jsx
    - demo/src/components/SelectionPanel.jsx
    - demo/src/store/viewerStore.js
    - demo/tests/demo.spec.mjs
    - demo/tests/viewer-store.test.mjs
  added:
    - demo/src/lib/measurement-actions.js
    - demo/src/hooks/useMeasurement.js
    - demo/tests/measurement-actions.test.mjs
key-decisions:
  - "Measurement execution remains demo-owned and package-first: the runner consumes `selectedDetail.items[*].exactRef` and calls `@tx-code/occt-core` directly."
  - "Measurement history is now independent from selection state and is cleared on actor replacement, workspace reset, and actor-pose changes to prevent stale exact refs."
  - "The existing selection inspector remains the single demo surface for tool pose, selection metadata, and typed measurement rows."
  - "Single-selection radius/diameter availability is geometry-family-aware through `getExactGeometryType(...)`; pairwise actions stay conservative and selection-driven."
requirements-completed: [MEAS-01, MEAS-03]
duration: n/a
completed: 2026-04-21
---

# Phase 34 Plan 01 Summary

**The demo now exposes a real measurement command loop on top of actor-scoped exact refs, with typed run history and deterministic invalidation, without widening the root or package boundary.**

## Accomplishments

- Added a demo-local measurement command registry in [demo/src/lib/measurement-actions.js](/E:/Coding/occt-js/demo/src/lib/measurement-actions.js:1):
  - conservative selection-driven action availability
  - single-ref geometry-family gating for `radius` / `diameter`
  - typed normalization for success, unsupported, and runtime-failure rows
- Added a demo-local measurement runner seam in [demo/src/hooks/useMeasurement.js](/E:/Coding/occt-js/demo/src/hooks/useMeasurement.js:1):
  - lazy `@tx-code/occt-core` creation via the existing `ensureModule()` path
  - current-selection execution only
  - rerun-against-current-selection behavior
  - active-result bookkeeping for the inspector
- Extended [demo/src/store/viewerStore.js](/E:/Coding/occt-js/demo/src/store/viewerStore.js:1) with:
  - `measurementRuns`
  - `activeMeasurementId`
  - `recordMeasurementRun(...)`
  - `setActiveMeasurement(...)`
  - `clearMeasurements()`
- Bound measurement history invalidation to authoritative workspace lifecycle events:
  - workpiece replacement
  - tool replacement
  - `setActorPose(...)`
  - `nudgeActorPose(...)`
  - workspace reset / clear
- Extended [demo/src/components/SelectionPanel.jsx](/E:/Coding/occt-js/demo/src/components/SelectionPanel.jsx:1) into a combined selection-plus-measurement inspector:
  - supported action buttons
  - typed result rows
  - active-result highlighting
  - clear / rerun affordances
- Added focused verification coverage:
  - [demo/tests/measurement-actions.test.mjs](/E:/Coding/occt-js/demo/tests/measurement-actions.test.mjs:1) for command matrix and typed result normalization
  - [demo/tests/viewer-store.test.mjs](/E:/Coding/occt-js/demo/tests/viewer-store.test.mjs:220) for lifecycle invalidation
  - [demo/tests/demo.spec.mjs](/E:/Coding/occt-js/demo/tests/demo.spec.mjs:522) for cross-model run / rerun / clear browser flow

## Verification

- `npm --prefix demo test`
- `npm --prefix demo run build`
- `npm --prefix demo run test:e2e`
- `npx playwright test --config playwright.config.mjs demo/tests/demo.spec.mjs`

All commands passed on 2026-04-21.

## Process Notes

- `superpowers:test-driven-development` was followed for this plan: tests were added first, verified red, then driven green.
- `superpowers:verification-before-completion` was satisfied with fresh command output before closeout.
- `superpowers:requesting-code-review` was not executed in this session because the repository instructions require explicit user permission before spawning review subagents; that gate remains available later if the user wants delegated review.
