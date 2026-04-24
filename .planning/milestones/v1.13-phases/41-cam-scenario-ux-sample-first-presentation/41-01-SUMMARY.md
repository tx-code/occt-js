---
phase: 41-cam-scenario-ux-sample-first-presentation
plan: "01"
subsystem: demo-cam-wording-sample-framing
tags: [demo, cam, wording, browser, tdd]
requires:
  - phase: 41-cam-scenario-ux-sample-first-presentation
    provides: Phase 41 context, research, and execution plan
  - file: .planning/phases/41-cam-scenario-ux-sample-first-presentation/41-01-PLAN.md
    provides: CAM wording and sample-framing requirements
provides:
  - Tighter demo-owned CAM wording for accepted workflow ids without widening the runtime/package contract
  - Sample-first current-result framing that avoids report/tolerance/history drift
  - Browser coverage for CAM wording seams plus the tool-only no-selection branch
affects: [phase-41, demo, browser-verification, conditional-verification]
tech-stack:
  added: []
  patterns: [cam-wording-tightening, sample-first-copy, one-result-panel-guard, delegated-review-fixup]
key-files:
  modified:
    - demo/src/lib/measurement-actions.js
    - demo/src/components/SelectionPanel.jsx
    - demo/tests/measurement-actions.test.mjs
    - demo/tests/demo.spec.mjs
key-decisions:
  - "Accepted CAM workflow wording stays demo-owned: `Clearance Check`, `Step Depth Check`, `Center Spacing`, and task-oriented summaries now live only in the browser sample seam."
  - "The current-result card now reads as `Current Check` for the reduced sample, while generic exact actions still stay under the neutral `Measurements` heading."
  - "Tool-only state no longer renders a misleading measurement empty state; the panel only appears when a selection exists or an active result is still present."
requirements-completed: []
duration: n/a
completed: 2026-04-22
---

# Phase 41 Plan 01 Summary

**The browser demo now uses tighter CAM-facing wording where semantics are known, while preserving the reduced one-result measurement sample and keeping generic exact actions out of fake CAM language.**

## Accomplishments

- Updated [demo/src/lib/measurement-actions.js](/E:/Coding/occt-js/demo/src/lib/measurement-actions.js:1) with narrower demo-owned CAM wording:
  - accepted workflow labels now read `Clearance Check`, `Step Depth Check`, and `Center Spacing`
  - accepted CAM summaries are task-oriented: `Clearance check ...`, `Step depth check ...`, `Center spacing ...`, and `Surface-to-center offset ...`
  - unsupported mixed-selection guidance now points to the actual supported selection shapes for exact/CAM sample actions
- Updated [demo/src/components/SelectionPanel.jsx](/E:/Coding/occt-js/demo/src/components/SelectionPanel.jsx:1) so the browser inspector stays sample-first:
  - CAM-capable selections now read `Supported exact actions and CAM sample checks`
  - the current-result card now reads `Current Check`
  - the mixed exact/CAM action group keeps the neutral `Measurements` heading instead of forcing generic exact actions into CAM language
  - tool-only state no longer shows a misleading measurement empty state when no selection or active result exists
- Extended [demo/tests/measurement-actions.test.mjs](/E:/Coding/occt-js/demo/tests/measurement-actions.test.mjs:50) and [demo/tests/demo.spec.mjs](/E:/Coding/occt-js/demo/tests/demo.spec.mjs:680) to lock:
  - accepted CAM label and summary wording
  - mixed-selection unsupported guidance
  - sample-first panel subtitle and current-check wording
  - the tool-only generated-tool branch where `measurement-panel` must stay hidden without selection

## Verification

- `npm --prefix demo test`
- `npm --prefix demo run build`
- `npx playwright test --config playwright.config.mjs demo/tests/demo.spec.mjs`
- `npm --prefix demo run test:e2e`

All commands passed on 2026-04-22.

## Process Notes

- `superpowers:test-driven-development` was followed for this plan: unit/browser expectations for CAM labels, summaries, and panel wording were written first, verified red, then driven green with the smallest copy-only implementation.
- `superpowers:verification-before-completion` was satisfied with fresh demo unit, build, targeted browser, and maintained `test:e2e` verification after the final review fixes.
- `superpowers:requesting-code-review` was executed with delegated review. The first pass found two valid warnings in the selection-panel seam:
  - tool-only state exposed an impossible measurement empty state
  - a mixed exact/CAM group heading drifted into fake CAM wording
- `superpowers:receiving-code-review` was applied before fixing those warnings. After the fixes landed, the delegated re-check updated [REVIEW.md](/E:/Coding/occt-js/.planning/REVIEW.md:1) to a clean Phase `41-01` report.
