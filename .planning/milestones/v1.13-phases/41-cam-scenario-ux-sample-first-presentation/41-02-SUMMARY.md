---
phase: 41-cam-scenario-ux-sample-first-presentation
plan: "02"
subsystem: demo-cam-shell-sample-framing
tags: [demo, cam, browser, sample, tdd]
requires:
  - phase: 41-cam-scenario-ux-sample-first-presentation
    provides: Phase 41 context, research, wording baseline, and shell-framing execution plan
  - file: .planning/phases/41-cam-scenario-ux-sample-first-presentation/41-02-PLAN.md
    provides: Representative workpiece/tool CAM sample framing requirements
provides:
  - Import-first but tool-only-aware shell framing for the browser demo home state and toolbar entry
  - Representative workpiece/tool browser coverage for sample-first CAM flows, including typed unsupported `step-depth`
  - Mobile optional-tool accessibility coverage without breaking the compact toolbar contract
affects: [phase-41, demo, browser-verification, conditional-verification]
tech-stack:
  added: []
  patterns: [sample-first-shell-copy, optional-tool-accessibility, typed-unsupported-cam-proof, delegated-review-fixup]
key-files:
  modified:
    - demo/src/components/DropZone.jsx
    - demo/src/components/Toolbar.jsx
    - demo/tests/app-home.spec.mjs
    - demo/tests/demo.spec.mjs
key-decisions:
  - "Workpiece-first is now framed as guidance for most CAM samples, not a hard prerequisite; tool-only generation remains explicit and supported."
  - "Desktop keeps a visible `Optional Tool` entry, while mobile uses the compact `Gen Tool` label with accessible `Optional Tool` naming so the sample framing survives on supported small screens."
  - "Representative CAM browser coverage now locks a typed-unsupported `step-depth` path and proves overlay cleanup when switching from overlay-active `surface-to-center` to panel-only status."
requirements-completed: [UX-05]
duration: n/a
completed: 2026-04-22
---

# Phase 41 Plan 02 Summary

**The browser demo now reads as an honest CAM integration sample from empty-state shell through representative workpiece/tool checks, while keeping one current result and no history/report/tolerance workflow.**

## Accomplishments

- Updated [demo/src/components/DropZone.jsx](/E:/Coding/occt-js/demo/src/components/DropZone.jsx:1) so the empty state now presents the right sample story:
  - most CAM samples start with a workpiece, but tool-only inspection remains explicit and supported
  - the empty-state action now reads `Generate Optional Tool`
  - the supporting copy keeps the flow manual and one-action oriented instead of drifting into inspection-product language
- Updated [demo/src/components/Toolbar.jsx](/E:/Coding/occt-js/demo/src/components/Toolbar.jsx:1) so optional-tool framing survives after import on every supported viewport:
  - desktop keeps the visible `Optional Tool` label
  - mobile keeps the compact `Gen Tool` text but exposes the accessible `Optional Tool` name/title
- Extended [demo/tests/app-home.spec.mjs](/E:/Coding/occt-js/demo/tests/app-home.spec.mjs:1) and [demo/tests/demo.spec.mjs](/E:/Coding/occt-js/demo/tests/demo.spec.mjs:734) to lock:
  - home/drop-zone sample framing as guidance rather than a hard workpiece-first requirement
  - the compact mobile toolbar contract plus accessible optional-tool naming
  - representative workpiece/tool CAM flows with one successful `clearance`, one successful `surface-to-center`, and one typed-unsupported `step-depth`
  - overlay cleanup when the current result moves from overlay-active `surface-to-center` to panel-only unsupported `step-depth`

## Verification

- `npm --prefix demo test`
- `npm --prefix demo run build`
- `npx playwright test --config playwright.config.mjs demo/tests/demo.spec.mjs`
- `npm --prefix demo run test:e2e`

All commands passed on 2026-04-22.

## Process Notes

- `superpowers:test-driven-development` was followed for this plan: browser expectations for shell framing, optional-tool wording, and the representative unsupported `step-depth` path were written red first, then driven green with the smallest copy/test changes.
- `superpowers:requesting-code-review` was executed with delegated reviewers. The first review found two valid warnings:
  - empty-state copy overstated workpiece-first as a requirement
  - mobile optional-tool framing drifted and lacked coverage
- `superpowers:receiving-code-review` was applied before fixing those warnings. The follow-up re-review updated [REVIEW.md](/E:/Coding/occt-js/.planning/REVIEW.md:1) to a clean Phase `41-02` report.
- `superpowers:verification-before-completion` was satisfied with fresh unit, build, targeted browser, and maintained browser-lane verification after the review fixes.
- `npm --prefix demo run test:e2e` needed rerun discipline during verification:
  - one initial invocation failed because Playwright's Vite webServer could not bind `127.0.0.1:4173` while Windows still held the port in `TIME_WAIT`
  - one subsequent rerun produced a one-off `shows drop zone on initial load` miss that did not reproduce
  - the final full rerun passed cleanly, so no code changes were made for those environment-only blips
