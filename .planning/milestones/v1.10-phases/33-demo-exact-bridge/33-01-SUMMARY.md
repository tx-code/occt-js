---
phase: 33-demo-exact-bridge
plan: "01"
subsystem: demo-exact-session-lifecycle
tags: [demo, exact-session, lifecycle, measurement-bridge]
requires:
  - phase: 33-demo-exact-bridge
    provides: Phase 33 context and execution plan
  - file: .planning/phases/33-demo-exact-bridge/33-01-PLAN.md
    provides: Managed exact-session lifecycle requirements for import, generated-shape, and reset flows
provides:
  - One authoritative demo-local exact-session contract shared by imported CAD and generated revolved shapes
  - Deterministic exact-session replacement and reset behavior in the demo store and viewer actions
  - Runtime, store, and browser verification for exact-session stability across orientation changes and model replacement
affects: [phase-33, demo, browser-verification]
tech-stack:
  added: []
  patterns: [demo-local-managed-wrapper, explicit-exact-dispose, exact-open-render-parity]
key-files:
  modified:
    - demo/src/hooks/useOcct.js
    - demo/src/hooks/useViewerActions.js
    - demo/src/store/viewerStore.js
    - demo/src/components/GeneratedToolPanel.jsx
    - demo/tests/use-occt-runtime-contract.test.mjs
    - demo/tests/viewer-store.test.mjs
    - demo/tests/demo.spec.mjs
  added:
    - demo/src/lib/exact-session.js
key-decisions:
  - "The demo now owns one generic `exactSession` shape regardless of whether the source came from imported CAD or generated revolved geometry."
  - "Imported CAD uses `openManagedExactModel(...)`, while generated revolved geometry uses a demo-local wrapper over `openExactRevolvedShape(...)` plus `releaseExactModel(...)`."
  - "Orientation toggles stay presentation-only and do not reopen or replace the retained exact session."
requirements-completed: [DEMO-01]
duration: n/a
completed: 2026-04-21
---

# Phase 33 Plan 01 Summary

**The browser demo now retains exactly one authoritative exact session beside the rendered model and replaces or clears it deterministically across import, generated-shape, and reset flows.**

## Accomplishments

- Added a demo-local exact-session wrapper in `demo/src/lib/exact-session.js` so imported CAD and generated revolved shapes share one retained-session contract.
- Extended `viewerStore` with `exactSession` state and made `setModel`, `setImportedModels`, and `reset` clear selection-derived state when the retained session changes.
- Reworked `useOcct` so:
  - imported CAD opens through `openManagedExactModel(...)`
  - generated revolved shapes open through `openExactRevolvedShape(...)`
  - old exact sessions are explicitly cleared before the next one becomes authoritative
- Updated `useViewerActions.closeModel` to clear the retained exact session before resetting viewer state.
- Added verification coverage for:
  - runtime-hook exact-session provisioning
  - store-level replacement and reset semantics
  - browser-level exact-session stability across orientation toggles and model replacement

## Verification

- `npm --prefix demo test`
- `npm --prefix demo run build`
- `npm --prefix demo run test:e2e`
- `npx playwright test --config playwright.config.mjs demo/tests/demo.spec.mjs`

All commands passed. `demo`'s packaged `test:e2e` script still only runs `app-home.spec.mjs`, so the viewer smoke suite was executed explicitly as a separate verification step.
