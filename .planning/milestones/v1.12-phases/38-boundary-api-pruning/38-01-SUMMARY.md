---
phase: 38-boundary-api-pruning
plan: "01"
subsystem: demo-owned-action-seam-cleanup
tags: [demo, boundary, subtraction, naming, tdd]
requires:
  - phase: 38-boundary-api-pruning
    provides: Phase 38 context, research, and boundary-cleanup baseline
  - file: .planning/phases/38-boundary-api-pruning/38-01-PLAN.md
    provides: Demo-owned action seam and neutral browser-copy requirements
provides:
  - Explicitly demo-local measurement action helper naming instead of generic pseudo-SDK exports
  - Neutral browser copy that presents supported exact actions without internal ownership jargon
  - Preserved measurement/helper behavior and browser coverage for the simplified sample-first loop
affects: [phase-38, demo, browser-verification]
tech-stack:
  added: []
  patterns: [demo-local-helper-seam, neutral-supported-action-copy, tdd]
key-files:
  modified:
    - demo/src/lib/measurement-actions.js
    - demo/src/hooks/useMeasurement.js
    - demo/src/components/SelectionPanel.jsx
    - demo/tests/measurement-actions.test.mjs
    - demo/tests/demo.spec.mjs
key-decisions:
  - "The demo action helper seam now uses explicitly downstream names: `deriveDemoMeasurementActions(...)` and `runDemoMeasurementAction(...)`."
  - "The selection inspector now tells users `Supported exact actions` instead of surfacing internal `demo-owned` wording."
  - "Behavior stayed unchanged on purpose: this plan clarified ownership and naming without altering the retained exact measurement/helper surface."
duration: n/a
completed: 2026-04-21
---

# Phase 38 Plan 01 Summary

**The demo measurement action seam now reads clearly as downstream demo code instead of a shared SDK analysis layer, while keeping the same sample-first measurement behavior.**

## Accomplishments

- Tightened [demo/src/lib/measurement-actions.js](/E:/Coding/occt-js/demo/src/lib/measurement-actions.js:1) to use explicitly demo-local exports:
  - `deriveDemoMeasurementActions(...)`
  - `runDemoMeasurementAction(...)`
- Aligned [demo/src/hooks/useMeasurement.js](/E:/Coding/occt-js/demo/src/hooks/useMeasurement.js:1) with the renamed helper seam without changing current-result execution behavior.
- Updated [demo/src/components/SelectionPanel.jsx](/E:/Coding/occt-js/demo/src/components/SelectionPanel.jsx:1) so the inspector copy now says `Supported exact actions` instead of exposing internal ownership jargon.
- Refreshed verification surfaces to lock the reduced boundary:
  - [demo/tests/measurement-actions.test.mjs](/E:/Coding/occt-js/demo/tests/measurement-actions.test.mjs:1) now expects the demo-local helper seam and no longer uses stale candidate-style wording
  - [demo/tests/demo.spec.mjs](/E:/Coding/occt-js/demo/tests/demo.spec.mjs:523) now asserts the neutral `Supported exact actions` panel copy during the maintained browser loop

## Verification

- `npm --prefix demo test`
- `npm --prefix demo run build`
- `npm --prefix demo run test:e2e`
- `npx playwright test --config playwright.config.mjs demo/tests/demo.spec.mjs`

All commands passed on 2026-04-21.

## Process Notes

- `superpowers:test-driven-development` was followed for this plan: the node/browser expectations were updated first, verified red through the missing renamed exports, then driven green with the smallest seam-and-copy implementation.
- `superpowers:systematic-debugging` was applied during verification when the first `test:e2e` attempt hit transient port `4173` contention; the port was rechecked, the condition had cleared, and the rerun passed without code changes.
- `superpowers:verification-before-completion` was satisfied with fresh demo test, build, and browser command output before closeout.
- `superpowers:requesting-code-review` was intentionally skipped because the repository rules require explicit user permission before spawning delegated review agents, and that permission was not granted in this turn.
