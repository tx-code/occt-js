---
phase: 37-demo-simplification-sample-first-workflow
plan: "02"
subsystem: demo-state-and-entrypoint-subtraction
tags: [demo, measurement, subtraction, workflow, tdd]
requires:
  - phase: 37-demo-simplification-sample-first-workflow
    provides: Phase 37 context, research, and subtraction baseline
  - file: .planning/phases/37-demo-simplification-sample-first-workflow/37-02-PLAN.md
    provides: Reduced state and workflow-entrypoint requirements
provides:
  - Single-result measurement state in the demo store instead of history-plus-active-id machinery
  - Viewer overlay synchronization driven from one current measurement result
  - Clearer import-first and generate-tool-second browser entrypoint copy
affects: [phase-37, demo, browser-verification]
tech-stack:
  added: []
  patterns: [single-current-measurement, import-first-entrypoints, sample-first-browser-copy, tdd]
key-files:
  modified:
    - demo/src/store/viewerStore.js
    - demo/src/hooks/useMeasurement.js
    - demo/src/hooks/useViewer.js
    - demo/src/components/SelectionPanel.jsx
    - demo/src/components/DropZone.jsx
    - demo/src/components/Toolbar.jsx
    - demo/tests/viewer-store.test.mjs
    - demo/tests/demo.spec.mjs
    - demo/tests/app-home.spec.mjs
key-decisions:
  - "The demo store now owns one `currentMeasurement` instead of a compare-oriented history model."
  - "Overlay synchronization now follows the current measurement directly, while preserving the same invalidation boundaries for reset, actor replacement, and actor-pose changes."
  - "Browser copy now makes the workflow explicit: import a workpiece first, then generate a tool only when a second actor is needed."
requirements-completed: [DEMO-05, UX-04]
duration: n/a
completed: 2026-04-21
---

# Phase 37 Plan 02 Summary

**The browser demo now keeps only the state and entrypoints needed for one explicit import-plus-tool-plus-measure loop, finishing the Phase 37 subtraction target.**

## Accomplishments

- Reduced [demo/src/store/viewerStore.js](/E:/Coding/occt-js/demo/src/store/viewerStore.js:1) from history-oriented measurement state to a single `currentMeasurement`:
  - removed `measurementRuns`
  - removed `activeMeasurementId`
  - removed `measurementRunSeq`
  - replaced `recordMeasurementRun(...)` with `setCurrentMeasurement(...)`
  - preserved deterministic clearing on reset, actor replacement, and actor-pose changes
- Aligned [demo/src/hooks/useMeasurement.js](/E:/Coding/occt-js/demo/src/hooks/useMeasurement.js:1) and [demo/src/hooks/useViewer.js](/E:/Coding/occt-js/demo/src/hooks/useViewer.js:1) with the reduced state shape:
  - executing an action now replaces the current result instead of appending history
  - overlay synchronization now follows one current measurement directly
- Tightened the visible browser workflow in:
  - [demo/src/components/SelectionPanel.jsx](/E:/Coding/occt-js/demo/src/components/SelectionPanel.jsx:1)
  - [demo/src/components/DropZone.jsx](/E:/Coding/occt-js/demo/src/components/DropZone.jsx:1)
  - [demo/src/components/Toolbar.jsx](/E:/Coding/occt-js/demo/src/components/Toolbar.jsx:1)
  - The empty state now explicitly says to import a workpiece first.
  - Generated-tool entrypoints now read as `Generate Tool`, not a separate `Tool MVP` mode.
- Updated verification surfaces to lock the reduced contract:
  - [demo/tests/viewer-store.test.mjs](/E:/Coding/occt-js/demo/tests/viewer-store.test.mjs:240) now asserts the absence of the old history-oriented store surface
  - [demo/tests/demo.spec.mjs](/E:/Coding/occt-js/demo/tests/demo.spec.mjs:523) now snapshots one `currentMeasurement`
  - [demo/tests/app-home.spec.mjs](/E:/Coding/occt-js/demo/tests/app-home.spec.mjs:1) now locks the import-first entrypoint copy

## Verification

- `npm --prefix demo test`
- `npm --prefix demo run build`
- `npm --prefix demo run test:e2e`
- `npx playwright test --config playwright.config.mjs demo/tests/demo.spec.mjs`

All commands passed on 2026-04-21.

## Process Notes

- `superpowers:test-driven-development` was followed for this plan: the reduced store/browser contract was written first, verified red through `demo/tests/viewer-store.test.mjs`, then driven green through the store, hook, overlay, and entrypoint changes.
- `superpowers:verification-before-completion` was satisfied with fresh node-test, build, and browser verification before closeout.
- `superpowers:requesting-code-review` was intentionally skipped because the repository rules require explicit user permission before spawning delegated review agents, and that permission was not granted in this turn.
