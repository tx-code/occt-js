---
phase: 40-demo-cam-workflow-composition
plan: "01"
subsystem: demo-cam-action-composition
tags: [demo, cam, measurement, composition, tdd]
requires:
  - phase: 40-demo-cam-workflow-composition
    provides: Phase 40 context, research, and composition boundary
  - file: .planning/phases/40-demo-cam-workflow-composition/40-01-PLAN.md
    provides: Demo-owned CAM composition requirements and verification gates
provides:
  - Demo-local CAM action ids over the shipped exact surface without widening root or package APIs
  - Composition-capable action execution for center-based workflows and CAM-flavored distance/thickness framing
  - Regression coverage for synthetic placement reuse, async runtime normalization, and stale-selection alignment
affects: [phase-40, demo, conditional-verification]
tech-stack:
  added: []
  patterns: [demo-owned-cam-actions, composition-runner, synthetic-distance-placement, review-driven-regression-fixes, tdd]
key-files:
  modified:
    - demo/src/lib/measurement-actions.js
    - demo/src/hooks/useMeasurement.js
    - demo/tests/measurement-actions.test.mjs
    - demo/tests/measurement-overlay.test.mjs
key-decisions:
  - "CAM workflow names such as `clearance`, `step depth`, `center-to-center`, and `surface-to-center` remain demo-owned and are composed over shipped exact primitives instead of becoming new root/package API names."
  - "The demo runner now distinguishes direct exact calls from explicit composed handlers so center-based workflows can orchestrate multiple exact queries while preserving the same current-result contract."
  - "Synthetic placement stays honest by reusing the existing `distance` overlay grammar; when runtime or selection semantics fail, the runner returns typed unsupported or failure rows instead of throwing."
requirements-completed: [BOUND-02]
duration: n/a
completed: 2026-04-22
---

# Phase 40 Plan 01 Summary

**The demo measurement runner now supports a narrow CAM composition layer over shipped exact primitives, without widening the root Wasm or `@tx-code/occt-core` contract.**

## Accomplishments

- Extended [demo/src/lib/measurement-actions.js](/E:/Coding/occt-js/demo/src/lib/measurement-actions.js:1) from a one-call dispatch table into a dual-path runner:
  - retained direct exact actions such as `distance`, `thickness`, `radius`, and helper calls
  - added demo-owned CAM action ids `clearance`, `step-depth`, `center-to-center`, and `surface-to-center`
  - implemented explicit composed handlers for `center-to-center` and the supported face-pair `surface-to-center` variant
  - reused synthetic `distance` placement DTOs for center-based overlays instead of inventing a new overlay grammar
- Tightened [demo/src/hooks/useMeasurement.js](/E:/Coding/occt-js/demo/src/hooks/useMeasurement.js:1) so a measurement run snapshots one consistent selection before the async core-load gap:
  - the clicked action now executes against one `itemsSnapshot`
  - the derived availability matrix and returned refs stay aligned with the same snapshot
- Expanded node-level coverage in:
  - [demo/tests/measurement-actions.test.mjs](/E:/Coding/occt-js/demo/tests/measurement-actions.test.mjs:1)
  - [demo/tests/measurement-overlay.test.mjs](/E:/Coding/occt-js/demo/tests/measurement-overlay.test.mjs:1)
  - New coverage locks:
    - face-pair CAM action derivation
    - `center-to-center` composition over `measureExactCenter(...)`
    - supported `surface-to-center` composition over `getExactGeometryType(...)`, `measureExactCenter(...)`, `measureExactDistance(...)`, and `evaluateExactFaceNormal(...)`
    - typed unsupported handling for non-center-capable selections
    - typed `runtime-error` normalization for missing composed core methods
    - stale availability vs selection mismatch regression
    - synthetic `distance` overlay reuse for center-based compositions

## Verification

- `npm --prefix demo test`
- `npm --prefix demo run build`
- `npm --prefix demo run test:e2e`

All commands passed on 2026-04-22.

## Process Notes

- `superpowers:test-driven-development` was followed twice in this plan:
  - first for the Phase 40 CAM composition runner itself
  - then again for the review-driven fixes around async error normalization and stale selection alignment
- `superpowers:verification-before-completion` was satisfied with fresh demo unit, build, and browser verification after the follow-up fixes landed.
- `superpowers:requesting-code-review` was executed with delegated reviewers. The first review found two valid warnings; they were fixed and locked with new regression tests. A second scoped review returned clean and updated [REVIEW.md](/E:/Coding/occt-js/.planning/REVIEW.md:1) to `status: clean`.
