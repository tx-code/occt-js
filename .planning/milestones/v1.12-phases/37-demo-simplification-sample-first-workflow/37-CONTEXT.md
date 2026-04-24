# Phase 37: Demo Simplification & Sample-First Workflow - Context

**Gathered:** 2026-04-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 37 is a subtractive, demo-only phase. It simplifies the browser demo back toward an explicit integration sample for import, optional tool generation, actor-scoped selection, and manual exact measurement. The phase is allowed to remove UI chrome, workflow branches, and demo-owned state that reads like a product workspace, but it must preserve the underlying import-plus-measure loop already proven in `v1.10` and narrowed in `v1.11`.

This phase delivers a smaller measurement inspector, a clearer tool/workpiece setup flow, and reduced demo workflow state that still proves how downstream apps integrate exact refs and exact measurement helpers.

This phase does not deliver new exact kernels, new helper families, package-owned action analysis, persistent measurement history, export, reporting, tolerance workflows, or any widening of the root Wasm release boundary.

</domain>

<decisions>
## Implementation Decisions

### Subtractive phase guardrails
- **D-01:** Phase 37 is demo-local subtraction. It should remove or collapse unnecessary behavior before it adds any new behavior.
- **D-02:** The retained user story is narrow: import a workpiece, optionally generate or place a tool, select exact refs, run an explicit supported action, and inspect the current result.
- **D-03:** If a desired change would widen `@tx-code/occt-core`, root Wasm bindings, or Babylon package contracts, it belongs to a later boundary discussion, not Phase 37.

### Measurement presentation
- **D-04:** Measurement action mapping remains demo-owned and explicit. The demo should continue to surface only supported action buttons for the current selection and never imply package-owned candidate discovery.
- **D-05:** The inspector should read as a sample integration panel, not a measurement workspace. Product-style compare or rerun emphasis, selectable result history, or other workflow chrome may be removed or collapsed if they do not prove integration value.
- **D-06:** Numeric truth remains panel-first. Overlay status may still be shown, but the panel must be the primary place where the current result is interpreted.
- **D-07:** Unsupported selections must stay explicit and typed. Simplification must not regress into silent no-op behavior or ambiguous UI absence.

### Tool and workspace flow
- **D-08:** Workpiece and tool remain actor-scoped and generic. The generated tool flow is retained only as a way to prove multi-actor exact integration, not as a product-specific machining workflow.
- **D-09:** Tool pose controls exist only to demonstrate actor-pose-sensitive measurement and invalidation. They should stay compact and obviously secondary to the import or select or measure loop.
- **D-10:** Sample loading remains manual or opt-in only. No default autoload or hidden startup import path may re-enter the primary browser experience.

### Lifecycle and verification
- **D-11:** Reset, actor replacement, exact-session replacement, and actor-pose changes remain hard invalidation boundaries for measurement state.
- **D-12:** Desktop remains additive. Phase 37 must not make the browser flow depend on Tauri-only assumptions.
- **D-13:** Verification remains a conditional secondary-surface lane centered on `demo/`; `npm run test:release:root` must remain untouched.

### The agent's discretion
- The exact visual split between selection metadata, tool-pose controls, supported actions, and current-result output within the inspector.
- Whether the simplified inspector keeps one current result only or a very small non-interactive result trace, as long as it no longer reads like a productivity surface.
- The copy and labeling for demo entrypoints, as long as import and generated-tool setup remain explicit and manual.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone and repository contract
- `.planning/PROJECT.md` - active `v1.12` subtraction framing and repo boundary.
- `.planning/ROADMAP.md` - Phase 37 goal, success criteria, and the `37-01` / `37-02` split.
- `.planning/REQUIREMENTS.md` - `DEMO-05` and `UX-04` plus milestone-wide out-of-scope guardrails.
- `.planning/STATE.md` - current workflow position and expectation that Phase 37 planning is next.
- `AGENTS.md` - repository rules for GSD ownership, demo verification, and root release boundaries.

### Prior milestone decisions that constrain subtraction
- `.planning/milestones/v1.10-phases/34-measurement-commands-overlay-mvp/34-CONTEXT.md` - measurement MVP boundary and current demo-owned action runner assumptions.
- `.planning/milestones/v1.10-phases/34-measurement-commands-overlay-mvp/34-RESEARCH.md` - prior reasoning about measurement runner, overlay ownership, and demo-local state.
- `.planning/milestones/v1.10-phases/35-demo-docs-verification/35-01-SUMMARY.md` - documented browser workflow and invalidation rules that simplification must respect.
- `.planning/milestones/v1.11-phases/36-semantic-helper-foundations/36-01-SUMMARY.md` - helper-only retained surface and the explicit rejection of candidate-analysis and exportable session scope.

### Demo integration surfaces
- `demo/src/components/SelectionPanel.jsx` - current combined inspector for selection metadata, tool pose, action execution, and measurement history.
- `demo/src/hooks/useMeasurement.js` - current demo-owned measurement runner and result selection bridge.
- `demo/src/lib/measurement-actions.js` - explicit supported action mapping and typed result normalization.
- `demo/src/store/viewerStore.js` - current demo measurement session state, workspace actors, and invalidation boundaries.
- `demo/src/App.jsx` - current shell composition and generated-tool or selection-panel mounting.
- `demo/src/hooks/useViewerActions.js` - import, sample-open, and close-model entrypoint orchestration.
- `demo/src/components/DropZone.jsx` - empty-state workflow and import or tool-generation copy.
- `demo/src/components/Toolbar.jsx` - loaded-state workflow entrypoints and control density.
- `demo/src/lib/sample-autoload.js` - explicit rule that sample autoload is opt-in only.

### Existing verification surfaces
- `demo/tests/measurement-actions.test.mjs` - supported action matrix and typed unsupported behavior.
- `demo/tests/viewer-store.test.mjs` - measurement state invalidation and workspace-actor lifecycle coverage.
- `demo/tests/demo.spec.mjs` - maintained browser workflow suite for import, generated tool, selection, and measurement.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable assets
- `SelectionPanel.jsx` already centralizes the selection inspector and the tool-pose affordance, so subtraction should start there instead of spreading new panels across the app.
- `useMeasurement.js` already isolates demo-owned measurement orchestration from the rest of the viewer runtime.
- `measurement-actions.js` already keeps action mapping explicit and table-driven, which matches the milestone goal of avoiding package-owned inference.
- `viewerStore.js` already defines the authoritative invalidation seams for actor replacement, reset, and actor-pose changes.
- `App.jsx`, `DropZone.jsx`, `Toolbar.jsx`, and `useViewerActions.js` already define the user-visible workflow branches that can now be simplified or relabeled.

### Established patterns
- The demo keeps serializable app state in Zustand and runtime-heavy objects in hooks or refs.
- The browser demo now defaults to a truly empty landing state; sample loading is already opt-in only.
- Measurement and helper actions are intentionally demo-owned and package-first, not root-owned or viewer-owned abstractions.
- Browser verification focuses on concrete flows like import, tool generation, pick, and measure rather than on broad product behavior.

### Integration points
- Inspector simplification must stay aligned with `deriveMeasurementAvailability()` so the action surface remains explicit.
- State subtraction must preserve invalidation behavior in `viewerStore.js`.
- Workflow-entrypoint simplification should be limited to `App.jsx`, `DropZone.jsx`, `Toolbar.jsx`, and `useViewerActions.js` so Phase 37 does not accidentally reopen package or root boundaries.

</code_context>

<specifics>
## Specific Ideas

- Treat the demo as an answer to "how do I integrate import plus tool plus selection plus measurement?" not as "how do I ship a browser measurement product?"
- Favor a simpler current-result presentation over interactive result-management behavior.
- Keep generated tools because they prove the multi-actor exact story, but avoid letting the generator dominate the landing state or toolbar semantics.
- Keep the empty state and the loaded state visually explicit about what the user is doing next: import CAD, generate a tool if needed, then measure.

</specifics>

<deferred>
## Deferred Ideas

- Package or root API pruning. That belongs to Phase 38.
- Docs and governance rewriting. That belongs to Phase 39.
- New exact measurement primitives, new helper families, or renewed candidate-analysis work.
- Persistent measurement sessions, export, pinning, comparison products, reporting, or tolerance workflows.
- Desktop-specific workflow redesign that changes the browser-first contract.

</deferred>

---

*Phase: 37-demo-simplification-sample-first-workflow*
*Context gathered: 2026-04-21*
