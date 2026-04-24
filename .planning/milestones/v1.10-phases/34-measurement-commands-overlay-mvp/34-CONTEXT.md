# Phase 34: Measurement Commands & Overlay MVP - Context

**Gathered:** 2026-04-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 34 turns the actor-scoped exact refs from Phases 33 and 33.1 into a usable demo measurement workflow. This phase adds a demo-owned measurement action runner, typed result/history state, and a minimal placement-backed inspection overlay for the current workspace actors.

This phase delivers manual measurement execution for supported current selections, explicit unsupported feedback, clear or rerun or compare behavior during one live workspace session, and scene overlay primitives that visualize placement geometry without turning the demo into a full dimension-authoring product.

This phase does not deliver whole-model candidate discovery, semantic feature recognition beyond the shipped exact primitives and helpers, persistent measurement export, or AIS/Prs3d-style widgets and labels.

</domain>

<decisions>
## Implementation Decisions

### Measurement command surface
- **D-01:** Measurement actions remain demo-owned and package-first. The runner consumes `selectedDetail.items[*].exactRef` and calls `@tx-code/occt-core`; no new measurement command abstraction should be added to the root runtime or Babylon packages for this phase.
- **D-02:** Execution is explicit, not automatic on selection. The UI should surface only commands valid for the current selection and require a user-triggered run so users can rerun and compare deliberately.
- **D-03:** Supported command mapping should stay conservative and table-driven:
  - single face: `face-area`, plus `radius` or `diameter` only when the selected face geometry supports them
  - single edge: `edge-length`, plus `radius` or `diameter` only when the selected edge geometry supports them
  - two refs: `distance`, `angle`, and `thickness` when the current ref kinds are accepted by the shipped exact kernels
  - all other combinations: explicit unsupported feedback, not silent no-op
- **D-04:** Command availability must be derived from the current selection summary and known measurement families, not inferred from viewer meshes or tool semantics. Actor role may label results but must not alter measurement math or command validity.

### Result session model
- **D-05:** Demo-owned measurement state should be separate from selection state. Each measurement run records a stable snapshot of measurement kind, input refs and actor ids, execution status, numeric result, placement payload when available, and a human-readable summary for the panel.
- **D-06:** Selection changes may change available commands, but they must not silently mutate already-recorded measurement runs. Model replacement, exact-session replacement, or actor-pose changes must clear measurement history and overlay state to avoid stale or orphaned geometry.
- **D-07:** Compare UX should be history-list based, not simultaneous dimension authoring. Keep a short in-memory run list with one active overlay at a time, plus clear-all and rerun-current-selection actions.
- **D-08:** Unsupported, invalid-selection, and released-handle cases should be normalized into typed demo result rows with explicit status and reason, not thrown to the UI as uncaught errors.

### Overlay and inspection MVP
- **D-09:** Overlay remains scene-native and minimal. Reuse the existing Babylon line-pass and point-highlight infrastructure to render anchors, guide segments, and simple axes or frames rather than introducing text labels or full `PrsDim` widgets.
- **D-10:** Numeric values and typed metadata belong in the panel. The 3D overlay should only visualize geometry support such as anchor points, separation lines, angle arms, radius or diameter axes, or thickness directions.
- **D-11:** Overlay generation should be placement-first when placement helpers exist. If a measurement family returns numeric data without a placement DTO, Phase 34 may still show the typed result in-panel and omit scene overlay explicitly rather than inventing guessed geometry.
- **D-12:** Only the active measurement run owns visible overlay state. Switching the active result swaps overlay geometry; clearing results disposes every overlay artifact.

### Lifecycle and scope guards
- **D-13:** Tool and workpiece coexistence stays generic and actor-scoped. Phase 34 must not reintroduce tool-coupled runtime semantics; measurement inputs remain exact refs plus actor labels only.
- **D-14:** Phase 34 should prefer additive demo-local modules or store slices over widening `@tx-code/occt-core` or root Wasm APIs, unless planning uncovers a concrete missing primitive beyond the already-shipped placement and measurement helpers.
- **D-15:** Verification for this phase remains a conditional secondary-surface lane centered on demo node tests, demo build, and Playwright, not `npm run test:release:root`.

### the agent's Discretion
- The exact file split between a measurement hook, a store slice, and presentation components.
- The visual styling of the result panel and overlay colors, as long as active versus inactive measurement state is unambiguous and consistent with the current demo highlight language.
- The maximum number of in-memory result rows to retain before truncating history.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone and repository contract
- `.planning/PROJECT.md` — active `v1.10` framing, demo-first measurement scope, and root/package boundary.
- `.planning/REQUIREMENTS.md` — `MEAS-01`, `MEAS-02`, `MEAS-03`, and milestone-wide out-of-scope limits.
- `.planning/ROADMAP.md` — Phase 34 goal, success criteria, and the 34-01/34-02 plan split.
- `.planning/STATE.md` — current workflow position and the next-step expectation that planning starts from this context.
- `AGENTS.md` — repository rules for GSD workflow, root release boundaries, and conditional demo verification.

### Prior exact-measurement and multi-actor decisions
- `.planning/phases/33-demo-exact-bridge/33-CONTEXT.md` — single-model exact-session ownership, selection-to-ref mapping, and invalidation rules that Phase 34 must consume rather than reopen.
- `.planning/phases/33.1-multi-actor-exact-workspace/33.1-CONTEXT.md` — actor-scoped workspace, movable tool pose, and cross-model measurement constraints.
- `.planning/phases/33.1-multi-actor-exact-workspace/33.1-02-SUMMARY.md` — completed cross-model exact pairwise bridge and actor-aware selection flow.
- `.planning/milestones/v1.4-phases/15-placement-contract-hardening/15-CONTEXT.md` — placement DTO boundary and the rule that overlays remain downstream.
- `.planning/milestones/v1.4-phases/15-placement-contract-hardening/15-01-SUMMARY.md` — placement helper semantics for anchors, frames, and explicit failure behavior.
- `.planning/seeds/SEED-001-web-exact-brep-measurement.md` — dormant seed being resumed as demo-first measurement integration.

### Measurement SDK and package surface
- `docs/sdk/measurement.md` — shipped package-first measurement, placement, helper, and lifecycle boundaries.
- `packages/occt-core/README.md` — current package-first exact APIs, helper family, and explicit downstream viewer boundary.
- `packages/occt-core/src/occt-core.js` — package-first exact measurement and placement wrappers that the demo runner should call.
- `dist/occt-js.d.ts` — canonical root typings for exact refs, pairwise measurements, and placement helpers.

### Demo integration points
- `demo/src/App.jsx` — current shell and existing mounted inspector surfaces.
- `demo/src/store/viewerStore.js` — central serializable workspace, selection state, pose updates, and reset actions.
- `demo/src/hooks/usePicking.js` — actor-scoped `exactRef` enrichment for current selections.
- `demo/src/hooks/useViewer.js` — existing line-pass overlay pipeline and highlight infrastructure.
- `demo/src/hooks/useOcct.js` — runtime bootstrapping, exact-session replacement, and cleanup behavior.
- `demo/src/components/SelectionPanel.jsx` — current inspector surface that already hosts tool-pose and selection metadata.
- `demo/src/lib/workspace-model.js` — canonical actor-prefixed ids and actor-pose composition used by the demo workspace.
- `demo/src/lib/exact-session.js` — authoritative demo-local exact-session snapshot and disposal contract.
- `packages/occt-babylon-viewer/src/occt-babylon-viewer.js` — viewer depth and helper behavior that existing overlays rely on.

### Existing verification surfaces
- `packages/occt-core/test/live-root-integration.test.mjs` — cross-model exact pairwise coverage that Phase 34 should consume, not re-prove through new runtime work.
- `demo/tests/exact-selection-bridge.test.mjs` — actor-aware selection bridge coverage.
- `demo/tests/demo.spec.mjs` — maintained browser workflow suite for selection, tool pose, and future measurement interactions.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `demo/src/hooks/usePicking.js`: already writes actor id, actor role, actor label, and `exactRef` into `selectedDetail.items`, so the measurement runner can consume store data without reaching back into Babylon picking internals.
- `demo/src/store/viewerStore.js`: already centralizes serializable workspace and selection state; it is the natural home for measurement runs, active-result identity, and invalidation on reset or actor-pose changes.
- `demo/src/hooks/useViewer.js`: already owns line-pass layers, edge highlight maps, and batch application; a measurement overlay should reuse this pipeline instead of inventing parallel mesh-management code.
- `demo/src/components/SelectionPanel.jsx`: already serves as the demo inspector and already shows tool-pose controls plus actor metadata, making it the lowest-friction host for command buttons and typed result rows.
- `demo/src/hooks/useOcct.js`: already owns runtime bootstrapping and exact-session replacement; measurement code must align with this lifecycle and clear state when sessions are replaced.
- `demo/src/lib/workspace-model.js`: already defines canonical actor-prefixed ids and actor-pose matrix composition for the rendered workspace model.
- `demo/src/lib/exact-session.js`: already defines the exact-session snapshot and cleanup semantics that measurement state should treat as authoritative.

### Established Patterns
- Demo hooks keep Babylon objects in refs and serializable summaries in Zustand. Measurement overlay state should follow the same split.
- Actor-scoped ids are prefixed into the composed workspace model; measurement UI should display actor labels but resolve commands strictly via exact refs.
- Existing line-pass layers already reserve rendering group `1` and depth behavior for overlay-style edge rendering, which Phase 34 can extend.
- Demo error handling favors structured failures and soft warnings; measurement actions should convert kernel failures into explicit UI rows rather than add console-heavy behavior.

### Integration Points
- Selection to command availability: derive supported actions from `selectedDetail`.
- Measurement runner to store: write run history, active-result metadata, and typed status.
- Active result to `useViewer`: hydrate line and point overlay batches and dispose them on active-result change, reset, exact-session replacement, or actor-pose change.
- Verification: add demo node tests for command availability and invalidation, plus Playwright coverage for select, measure, compare, and clear flows.

</code_context>

<specifics>
## Specific Ideas

- Keep Phase 34 as an MVP inspector-plus-overlay, not a dimension-authoring product. The user wants a demo-visible measurement loop between an imported workpiece and a movable generated tool; this phase should prove that loop and stop there.
- Result semantics must stay typed and explicit. If a selected combination cannot run `radius`, `angle`, or `thickness`, the UI should say why instead of implying missing data is success.
- Compare means multiple runs in one live workspace session, not persistent reporting. One active overlay at a time is the default recommendation.
- Numeric presentation can stay panel-first; 3D text labels are intentionally deferred.

</specifics>

<deferred>
## Deferred Ideas

- Whole-model measurement suggestion and candidate discovery.
- Persistent measurement history, export, and reporting.
- 3D text labels, leader-line layout, editable dimensions, or full AIS/Prs3d-style widgets.
- Rich semantic feature measurements beyond the shipped exact primitives and helpers.
- Actor-pose-preserving historical overlays across later tool motion; Phase 34 should clear stale runs instead of simulating timeline semantics.

</deferred>

---

*Phase: 34-measurement-commands-overlay-mvp*
*Context gathered: 2026-04-21*
