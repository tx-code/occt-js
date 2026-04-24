---
phase: 40-demo-cam-workflow-composition
plan: "02"
subsystem: demo-cam-browser-sample
tags: [demo, cam, browser, measurement, tdd]
requires:
  - phase: 40-demo-cam-workflow-composition
    provides: Phase 40 context, research, and composed CAM action runner
  - file: .planning/phases/40-demo-cam-workflow-composition/40-02-PLAN.md
    provides: Browser-sample CAM workflow and invalidation requirements
provides:
  - Browser-visible CAM sample wording inside the existing single current-result measurement inspector
  - Representative workpiece/tool browser coverage for `clearance` and `surface-to-center`
  - Store/browser regression coverage that keeps deterministic invalidation and no-history behavior intact for CAM action ids
affects: [phase-40, demo, browser-verification, conditional-verification]
tech-stack:
  added: []
  patterns: [cam-sample-copy, browser-scenario-locking, one-result-cam-sample, delegated-review-clean]
key-files:
  modified:
    - demo/src/components/SelectionPanel.jsx
    - demo/tests/demo.spec.mjs
    - demo/tests/viewer-store.test.mjs
key-decisions:
  - "Cross-model selections that expose CAM workflows now identify themselves as `Supported exact and CAM sample actions`, but the inspector still remains a single current-result sample rather than a report/history surface."
  - "The maintained browser lane locks one clearance path and one supported face-pair `surface-to-center` path using the existing generated-tool workpiece/tool scenario."
  - "Deterministic invalidation remains action-agnostic: CAM action ids clear on tool-pose changes and actor replacement just like the existing exact sample."
requirements-completed: [DEMO-06]
duration: n/a
completed: 2026-04-22
---

# Phase 40 Plan 02 Summary

**The browser demo now proves the first CAM-oriented sample loop end to end: the inspector exposes CAM sample wording, and the maintained browser lane executes `clearance` plus `surface-to-center` without reviving history or reporting behavior.**

## Accomplishments

- Updated [demo/src/components/SelectionPanel.jsx](/E:/Coding/occt-js/demo/src/components/SelectionPanel.jsx:1) with the smallest truthful browser copy change for Phase 40:
  - cross-model selections that expose CAM workflows now read `Supported exact and CAM sample actions`
  - the empty-state helper text also reflects exact-or-CAM sample actions
  - single-face and non-CAM selections still stay on the narrower exact wording
- Extended [demo/tests/demo.spec.mjs](/E:/Coding/occt-js/demo/tests/demo.spec.mjs:679) so the maintained browser lane now locks:
  - the updated measurement-panel wording for CAM-capable workpiece/tool selections
  - one successful `clearance` path in the current-result inspector
  - one successful supported face-pair `surface-to-center` path over the existing workpiece/tool sample
  - deterministic clearing after a CAM current result is invalidated by tool-pose change
- Extended [demo/tests/viewer-store.test.mjs](/E:/Coding/occt-js/demo/tests/viewer-store.test.mjs:354) with explicit CAM action ids:
  - `clearance` still clears on tool-pose invalidation
  - `surface-to-center` still clears on actor replacement
  - the store continues to expose only one `currentMeasurement` and no history-oriented measurement surface

## Verification

- `npm --prefix demo test`
- `npm --prefix demo run build`
- `npm --prefix demo run test:e2e`
- `npx playwright test --config playwright.config.mjs demo/tests/demo.spec.mjs`

All commands passed on 2026-04-22.

## Process Notes

- `superpowers:test-driven-development` was followed for this plan: browser/store expectations for CAM sample wording and representative workflows were written first, verified red through the stale `Supported exact actions` panel copy, then driven green with the smallest inspector copy change.
- `superpowers:verification-before-completion` was satisfied with fresh unit, build, maintained browser lane, and targeted browser-spec verification before closeout.
- `superpowers:requesting-code-review` was executed with a delegated reviewer. The Phase 40-02 review returned clean and updated [REVIEW.md](/E:/Coding/occt-js/.planning/REVIEW.md:1) with a no-findings report.
- One isolated rerun of `demo.spec.mjs` hit a transient Chromium `ERR_NO_BUFFER_SPACE` during `page.goto("/")`; the lane passed cleanly on immediate rerun and the maintained `test:e2e` lane also passed, so no code changes were made for that environment-only blip.
