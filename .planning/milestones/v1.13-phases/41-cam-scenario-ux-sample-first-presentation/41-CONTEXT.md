# Phase 41: CAM Scenario UX & Sample-First Presentation - Context

**Gathered:** 2026-04-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 41 is a demo-only presentation phase. Phase 40 already proved the accepted CAM-flavored workflows can be composed honestly over the shipped exact surface. Phase 41 now tightens how those workflows read in the browser sample: action labels, summaries, empty-state guidance, and representative workpiece/tool scenario framing.

This phase is allowed to change demo-owned copy, grouping, current-result wording, and narrow scenario presentation inside `demo/`. It may refine how the browser sample explains `clearance`, `step depth`, `center-to-center`, and `surface-to-center`, but it must not reopen the runtime/package surface or invent new workflow-shaped APIs.

This phase does not deliver new root Wasm APIs, new `@tx-code/occt-core` APIs, history/session features, compare mode, tolerance or pass/fail output, reporting/export, probing/PMI/CMM behavior, whole-model analysis, or broader selection/product policy.

</domain>

<decisions>
## Implementation Decisions

### Presentation ownership
- **D-01:** CAM-oriented wording remains demo-owned. Labels, summaries, and scenario framing belong in `demo/`, not in the reusable root/package contract.
- **D-02:** Wording may become more task-oriented only where the workflow semantics are known. If the current selection does not honestly imply a CAM-specific task, the demo should keep generic exact wording rather than overclaiming.
- **D-03:** The browser sample remains one current result plus optional overlay guidance. Phase 41 may improve phrasing, but it may not reintroduce history, rerun, compare, export, or reporting behavior.

### Sample-first scope
- **D-04:** The retained user story stays explicit: import a workpiece, optionally generate/place a tool, select exact refs, run one supported action, inspect one current result.
- **D-05:** Tool/workpiece scenarios are only there to prove multi-actor exact integration with practical CAM naming. They must not grow into a machining workspace, wizard, dashboard, or inspection system.
- **D-06:** Unsupported guidance should stay concise and selection-driven. It may explain the supported CAM sample variants, but it must not drift into candidate discovery or broad workflow coaching.

### Verification boundary
- **D-07:** Verification remains on the conditional demo/browser lane. Phase 41 should strengthen demo copy and scenario assertions without changing `npm run test:release:root`.
- **D-08:** Prefer narrow browser-visible wording assertions and focused unit coverage for summary text over broad snapshot-style UI locking.

### The agent's discretion
- The exact CAM-facing wording for accepted workflows, as long as it stays honest to the current action semantics.
- Whether result framing is carried primarily through action labels, summaries, section headings, or small scenario hints, as long as the demo remains clearly a sample.
- Which representative workpiece/tool scenario is added beyond existing Phase 40 coverage, as long as it stays within the accepted workflow set.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone and repository contract
- `.planning/PROJECT.md` - active `v1.13` framing and repo boundary.
- `.planning/ROADMAP.md` - Phase 41 goal, success criteria, and the `41-01` / `41-02` split.
- `.planning/REQUIREMENTS.md` - `UX-05` plus milestone-wide out-of-scope guardrails.
- `.planning/STATE.md` - current workflow position and expectation that Phase 41 planning is next.
- `AGENTS.md` - repository rules for GSD ownership, demo verification, release boundaries, and mandatory execution gates.

### Prior milestone and phase truth
- `.planning/phases/40-demo-cam-workflow-composition/40-CONTEXT.md` - Phase 40 composition guardrails that Phase 41 must preserve.
- `.planning/phases/40-demo-cam-workflow-composition/40-RESEARCH.md` - proof that the missing work is demo presentation, not new kernel capability.
- `.planning/phases/40-demo-cam-workflow-composition/40-01-SUMMARY.md` - accepted demo-owned composition surface.
- `.planning/phases/40-demo-cam-workflow-composition/40-02-SUMMARY.md` - browser-proven CAM workflows and retained one-result invalidation behavior.
- `docs/plan/cam-measurement-matrix.md` - repo-local CAM workflow priority and main-library/demo ownership split.

### Existing presentation seams
- `demo/src/lib/measurement-actions.js` - current action labels, success/failure summaries, and unsupported copy.
- `demo/src/components/SelectionPanel.jsx` - current panel headings, empty state, and current-result presentation.
- `demo/src/components/DropZone.jsx` - current import-first / optional-tool shell copy.
- `demo/src/components/Toolbar.jsx` - current explicit tool/workpiece entry points.
- `demo/src/hooks/useMeasurement.js` - current browser-facing measurement bridge.
- `demo/src/lib/measurement-overlay.js` - overlay status messages and panel-only wording.

### Verification surfaces
- `demo/tests/measurement-actions.test.mjs` - current label/summary/unit seam for action behavior.
- `demo/tests/demo.spec.mjs` - maintained browser workflow suite and current CAM assertions.
- `demo/tests/app-home.spec.mjs` - initial shell/import copy coverage.
- `demo/tests/viewer-store.test.mjs` - current one-result invalidation truth that Phase 41 must not disturb.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable seams
- `ACTION_PRESENTATION` in `demo/src/lib/measurement-actions.js` already centralizes display labels for both exact and CAM-flavored actions.
- `buildSuccessSummary(...)` is the main place where CAM workflows still read as generic `label + value`.
- `SelectionPanel.jsx` owns the most visible copy seams: panel title, subtitle, empty-state copy, section labels, and the `Current Result` heading.
- `DropZone.jsx` and `Toolbar.jsx` already frame the import-first / optional-tool flow, so small shell-copy refinement can happen without changing behavior.

### Current constraints worth changing
- The CAM sample currently reads as technically correct but too generic. `Clearance`, `Step Depth`, `Center to Center`, and `Surface to Center` are exposed, but most result summaries still look like raw exact measurements instead of representative sample tasks.
- Unsupported guidance still says “supported exact measurement actions,” which under-describes the accepted CAM sample surface.
- Current browser coverage proves the workflows run, but it does not yet fully prove that the demo reads like a CAM integration sample rather than a generic measurement inspector.

### Integration points
- `measurement-actions.js` is the correct seam for label, summary, and unsupported-message tightening.
- `SelectionPanel.jsx` is the correct seam for sample-first result framing and task-oriented wording.
- `DropZone.jsx`, `Toolbar.jsx`, and browser specs are the likely seams for representative workpiece/tool scenario presentation.

</code_context>

<specifics>
## Specific Ideas

- Keep `distance` and `thickness` as exact names, while allowing accepted CAM compositions to read more like explicit tasks when their semantics are known.
- Use the current-result card to communicate “what this run means in the sample,” not to add report-like metadata.
- Prefer copy such as “sample action”, “workpiece/tool check”, or “current check” over inspection-product language such as “report”, “tolerance”, or “session”.
- Add one more representative browser scenario beyond Phase 40's existing `clearance` and `surface-to-center` coverage, most likely `step-depth` or `center-to-center`.

</specifics>

<deferred>
## Deferred Ideas

- History, compare mode, export, reporting, tolerance/pass-fail, or probing workflows.
- Mixed-selection expansion beyond the already accepted supported CAM sample set.
- Any new root/package surface justified only by CAM wording rather than by a proven reusable primitive gap.

</deferred>

---

*Phase: 41-cam-scenario-ux-sample-first-presentation*
*Context gathered: 2026-04-22*
