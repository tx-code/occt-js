# Phase 37: Demo Simplification & Sample-First Workflow - Research

**Date:** 2026-04-21
**Status:** Complete

## Summary

Phase 37 does not need new root or package capabilities. The necessary exact-measurement and exact-helper path is already present. The work is demo-local subtraction: simplify the inspector, reduce workflow state, and make the browser experience read as an integration sample instead of a partially productized measurement workspace.

## Current Demo Complexity Worth Reducing

### Inspector density

- `demo/src/components/SelectionPanel.jsx` currently combines:
  - selection metadata
  - tool-pose controls
  - a measurement action panel
  - rerun and clear controls
  - selectable measurement run rows
  - active-result overlay status
- This is functional, but it reads more like a mini workspace than a sample integration panel.

### Measurement state depth

- `demo/src/hooks/useMeasurement.js` and `demo/src/store/viewerStore.js` still carry run history and active-result selection semantics originally added for the measurement MVP.
- That state is not wrong, but it is richer than what a sample-first demo must prove.

### Workflow entrypoint sprawl

- `DropZone.jsx`, `Toolbar.jsx`, and `useViewerActions.js` expose multiple entrypoints for import, sample loading, tool generation, and other viewer controls.
- Sample autoload is already disabled by default, which is correct, but the loaded and empty states can still be clearer about the core workflow they are demonstrating.

## Reusable Surfaces That Should Stay

### Exact-measurement plumbing

- `measurement-actions.js` already gives the repo an explicit, demo-owned selection-to-action table.
- `useMeasurement.js` already isolates package calls and typed result normalization.
- `viewerStore.js` already owns the correct invalidation boundaries for reset, actor replacement, and actor-pose changes.

### Multi-actor sample value

- The workpiece-plus-tool workflow remains valuable because it proves actor-scoped exact refs and actor-pose-sensitive invalidation.
- The generated tool path should remain available, but only as a narrow supporting workflow.

### Verification base

- `demo/tests/measurement-actions.test.mjs` already locks the explicit action matrix.
- `demo/tests/viewer-store.test.mjs` already covers the invalidation seams that must survive subtraction.
- `demo/tests/demo.spec.mjs` already exercises import, tool generation, selection, and measurement in browser flows.

## Recommended Implementation Shape

### Plan 37-01

- Simplify the selection inspector and measurement presentation.
- Keep supported actions explicit and demo-owned.
- Reduce or remove UI emphasis on product-style history controls such as rerun or active-row switching.
- Favor one clear current-result presentation with explicit clear behavior.

### Plan 37-02

- Reduce demo state to the minimum required by the simplified inspector.
- Tighten empty-state and toolbar entrypoints so the browser app reads as a sample workflow.
- Keep generated-tool setup and tool-pose adjustment as supporting affordances, not the center of the product.

## Risks and Mitigations

### Over-subtraction

Risk:
- The phase could remove controls that are still needed to demonstrate exact measurement integration.

Mitigation:
- Preserve the import or generate or select or run or inspect loop in browser tests and keep actor-pose invalidation coverage intact.

### State or UI mismatch

Risk:
- Simplifying the inspector first and the state second could create temporary inconsistencies.

Mitigation:
- Split the phase exactly along those seams: `37-01` for presentation, `37-02` for underlying state and workflow cleanup.

### Boundary drift during cleanup

Risk:
- Cleanup work can accidentally reopen package or root contract discussions.

Mitigation:
- Keep every Phase 37 change under `demo/` and defer public-surface cleanup to Phase 38.

## Verification Strategy

- Node tests:
  - explicit supported action presentation
  - reduced inspector behavior
  - reduced measurement state with preserved invalidation
- Browser verification:
  - import a workpiece
  - generate a tool
  - select refs
  - run one supported measurement
  - inspect the current result
  - clear it
  - verify actor-pose change still invalidates the result
- Commands:
  - `npm --prefix demo test`
  - `npm --prefix demo run build`
  - `npm --prefix demo run test:e2e`
  - `npx playwright test --config playwright.config.mjs demo/tests/demo.spec.mjs`

## Recommended Phase Split

- `37-01-PLAN.md`: simplify inspector and measurement action presentation
- `37-02-PLAN.md`: subtract unnecessary demo state and tighten tool/workpiece workflow entrypoints

## Out of Scope Confirmation

- no new root Wasm APIs
- no new `@tx-code/occt-core` APIs
- no renewed candidate-analysis or session export work
- no desktop-first redesign
- no docs or governance rewrite in this phase

---

*Phase: 37-demo-simplification-sample-first-workflow*
*Research completed: 2026-04-21*
