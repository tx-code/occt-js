# Phase 41: CAM Scenario UX & Sample-First Presentation - Research

**Date:** 2026-04-22
**Status:** Complete

## Summary

Phase 41 is not a kernel phase. The accepted CAM workflows already exist in the browser sample after Phase 40. The real gap is presentation: the demo needs more task-oriented wording and clearer sample framing without drifting back into inspection-product behavior.

## Findings

### 1. The main gap is wording, not capability

- `clearance`, `step depth`, `center-to-center`, and `surface-to-center` already exist as demo-owned actions.
- The browser sample can already execute them and preserve current-result invalidation correctly.
- The remaining issue is that the visible wording is still mostly generic exact-measurement copy.

Conclusion:
- Phase 41 should target labels, summaries, empty-state guidance, and scenario presentation rather than new computation.

### 2. The best seams are already centralized

- `ACTION_PRESENTATION` in `demo/src/lib/measurement-actions.js` is the narrowest place to refine action names.
- `buildSuccessSummary(...)` is the narrowest place to make successful CAM runs read more like concrete sample tasks.
- `SelectionPanel.jsx` owns the subtitle, empty-state text, and current-result card wording.
- `DropZone.jsx` and `Toolbar.jsx` already frame the import-first / optional-tool workflow and can carry any needed sample-level CAM guidance.

Conclusion:
- Phase 41 can stay small if it focuses on those seams instead of adding new UI structures.

### 3. CAM wording must stay honest and conditional

- The milestone goal is not to rename all exact measurements into CAM language.
- Where a workflow is truly just generic exact distance or thickness, the demo should not overclaim.
- Where a workflow is already a narrow accepted CAM composition, the sample can safely use more task-oriented copy.

Conclusion:
- The plan should explicitly preserve generic exact wording for ambiguous selections while tightening accepted CAM-specific runs.

### 4. The main drift risk is inspection-product creep

- The current repo boundary explicitly rejects history, rerun stacks, tolerance/pass-fail, reporting, probing, PMI/CMM, and broader workflow policy.
- Any attempt to make the current-result card look like a report or to add multi-step process guidance would violate both the milestone and the reduced-surface cleanup from `v1.12`.

Conclusion:
- Phase 41 should improve readability through narrow copy and scenario proof only, not through richer product chrome.

### 5. Browser verification should prove representative scenarios, not a bigger product

- Existing browser tests already prove cross-model exact flows plus `clearance` and `surface-to-center`.
- The missing browser proof is that the demo reads as a CAM sample in a representative workpiece/tool flow, while staying one-result and panel-first.
- A focused addition such as `step-depth` or `center-to-center` plus updated copy assertions is enough.

Conclusion:
- Keep verification to `demo` unit/build/browser lanes and do not widen release routing.

## Recommended Implementation Shape

### Plan 41-01

- Tighten action labels, success/failure summaries, unsupported wording, panel subtitles, and current-result copy.
- Keep changes centered in `measurement-actions.js` and `SelectionPanel.jsx`.
- Add targeted unit and browser assertions for revised wording.

### Plan 41-02

- Tighten workpiece/tool sample framing in the browser shell and representative workflows.
- Add one representative scenario beyond the current Phase 40 set, most likely `step-depth` or `center-to-center`.
- Keep UI changes minimal and explicit; do not add history/reporting surfaces.

## Risks and Mitigations

### Misleading CAM claims

Risk:
- The demo could imply broader CAM support than the underlying exact workflow honestly provides.

Mitigation:
- Keep CAM-specific wording only on the accepted demo-owned workflow ids and preserve generic exact wording elsewhere.

### Inspection-product drift

Risk:
- Improving presentation could accidentally reintroduce reporting, tolerance, or workspace semantics.

Mitigation:
- Lock the one-current-result contract and avoid adding new controls beyond copy/grouping changes.

### Brittle browser copy tests

Risk:
- Overly broad text assertions could make the browser suite fragile.

Mitigation:
- Assert the narrow sample-facing phrases that carry boundary value, not the entire panel copy verbatim.

## Verification Strategy

### Unit coverage

- `demo/tests/measurement-actions.test.mjs`
- Tighten expectations for labels, summaries, and unsupported wording where needed.

### Browser coverage

- `demo/tests/demo.spec.mjs`
- `demo/tests/app-home.spec.mjs`
- Assert revised panel/sample wording plus one additional representative workpiece/tool CAM flow.

### Commands

- `npm --prefix demo test`
- `npm --prefix demo run build`
- `npm --prefix demo run test:e2e`
- `npx playwright test --config playwright.config.mjs demo/tests/demo.spec.mjs`

## Recommended Phase Split

- `41-01-PLAN.md`: copy and current-result wording cleanup for accepted CAM workflows
- `41-02-PLAN.md`: representative workpiece/tool scenario presentation and browser-proof tightening

## Out of Scope Confirmation

- no new root Wasm APIs
- no new `@tx-code/occt-core` APIs
- no history, compare, export, or report workflows
- no tolerance or pass/fail semantics
- no probing, PMI, or CMM behavior
- no whole-model CAM analysis

---

*Phase: 41-cam-scenario-ux-sample-first-presentation*
*Research completed: 2026-04-22*
