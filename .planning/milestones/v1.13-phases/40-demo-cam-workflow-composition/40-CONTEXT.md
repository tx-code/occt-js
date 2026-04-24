# Phase 40: Demo CAM Workflow Composition - Context

**Gathered:** 2026-04-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 40 is a demo-first composition phase. It adds a narrow set of CAM-flavored workflows to the existing browser measurement sample by composing the shipped exact surface that already exists in the root Wasm carrier and `@tx-code/occt-core`.

This phase is allowed to add demo-owned action ids, composition handlers, synthetic result summaries, and any minimal placement adaptation needed to render or inspect those workflows inside the current one-result measurement sample. It may reuse exact distance, thickness, center, radius, relation, and supported hole-family helpers, but it must keep that reuse inside `demo/`.

This phase does not deliver new root Wasm APIs, new `@tx-code/occt-core` APIs, PMI/GD&T behavior, probing/reporting workflows, tolerance products, whole-model feature mining, or a richer session/history model. Those all remain outside the accepted boundary for `v1.13`.

</domain>

<decisions>
## Implementation Decisions

### Demo-first composition guardrails
- **D-01:** Phase 40 starts from the existing reduced browser sample, not from a new product surface. The retained user story stays: import a workpiece, optionally generate/place a tool, select exact refs, run one supported action, inspect one current result.
- **D-02:** CAM workflow names such as `clearance`, `step depth`, `center-to-center`, and `surface-to-center` remain demo-owned semantics over exact refs. They are not new package or root contract names by default.
- **D-03:** If a desired workflow appears to need a new root/package API, the plan must first prove that the shipped exact primitives cannot express it honestly in demo code. No such gap is assumed upfront.

### Exact primitive reuse
- **D-04:** `clearance` should compose over exact distance semantics, and `step depth` should compose over exact thickness semantics where the selected geometry supports them.
- **D-05:** `center-to-center` and `surface-to-center` should start from shipped center-capable primitives such as `measureExactCenter(...)`, `measureExactRadius(...)`, and supported hole-family helpers. For center-based flows, the demo may synthesize a current-result summary and a placement DTO using existing `distance`/`thickness` placement vocabulary where that is truthful.
- **D-06:** Mixed `face + edge` routing is not an assumed requirement for Phase 40. The first `surface-to-center` workflow should be a supported face-pair variant where one selected face acts as the support surface and the other selected face is center-capable. Edge-mixed routing is deferred unless browser scenarios prove it is necessary.

### Sample-first UX and lifecycle
- **D-07:** Phase 40 must preserve the single current-result contract introduced in `v1.12`. No result history, compare mode, export, or tolerance workflow may re-enter through CAM naming.
- **D-08:** Tool/workpiece scenarios remain valuable only as proofs of multi-actor exact integration. CAM workflow wording must not turn the demo into a full machining-product workspace.
- **D-09:** Existing invalidation seams remain authoritative: reset, actor replacement, exact-session replacement, and actor-pose changes still clear current measurement state deterministically.

### Verification and release boundary
- **D-10:** Verification stays conditional on `demo/` surfaces. Phase 40 should strengthen node/browser coverage for the new composed workflows without changing `npm run test:release:root`.
- **D-11:** The overlay pipeline should be reused where possible. If composed workflows can reuse existing placement kinds such as `distance` or `thickness`, prefer that over inventing a new overlay grammar.

### The agent's discretion
- The exact action ids and labels for the first CAM sample set, as long as they stay narrow and truthful.
- Whether a workflow is rendered with full overlay guidance or explicit panel-only messaging, as long as placement honesty is preserved.
- The exact supported face-pair semantics for the first `surface-to-center` workflow, as long as mixed-selection routing remains deferred.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone and repository contract
- `.planning/PROJECT.md` - active `v1.13` framing and repo boundary.
- `.planning/ROADMAP.md` - Phase 40 goal, success criteria, and the `40-01` / `40-02` split.
- `.planning/REQUIREMENTS.md` - `DEMO-06`, `UX-05`, and `BOUND-02` plus milestone-wide out-of-scope guardrails.
- `.planning/STATE.md` - current workflow position and expectation that Phase 40 planning is next.
- `AGENTS.md` - repository rules for GSD ownership, demo verification, release boundaries, and mandatory execution gates.

### CAM scope and ownership guidance
- `docs/plan/cam-measurement-matrix.md` - repo-local CAM workflow priority and main-library/demo ownership split.
- `README.md` - canonical package/runtime boundary wording for exact measurement and helpers.
- `docs/sdk/measurement.md` - canonical package-first SDK wording and downstream-app boundary.

### Existing measurement sample surfaces
- `demo/src/lib/measurement-actions.js` - current explicit action matrix and one-call measurement/helper runner.
- `demo/src/hooks/useMeasurement.js` - current measurement hook and current-result bridge.
- `demo/src/components/SelectionPanel.jsx` - current action panel and current-result presentation.
- `demo/src/lib/measurement-overlay.js` - current placement-to-overlay translation for supported placement kinds.
- `demo/src/store/viewerStore.js` - current one-result measurement state and invalidation seams.

### Shipped exact primitive and helper surfaces
- `packages/occt-core/src/index.d.ts` - current package-first typings for `measureExactDistance`, `measureExactThickness`, `measureExactCenter`, `measureExactRadius`, `describeExactHole`, and related helpers.
- `packages/occt-core/src/occt-core.js` - package-first exact wrapper implementations and current exported measurement surface.
- `.planning/milestones/v1.10-phases/34-measurement-commands-overlay-mvp/34-CONTEXT.md` - original demo measurement MVP boundary and local action-runner assumptions.
- `.planning/milestones/v1.11-phases/36-semantic-helper-foundations/36-01-SUMMARY.md` - retained helper-only surface after broader product scope was dropped.
- `.planning/milestones/v1.12-phases/37-demo-simplification-sample-first-workflow/37-01-SUMMARY.md` - current sample-first inspector truth.
- `.planning/milestones/v1.12-phases/37-demo-simplification-sample-first-workflow/37-02-SUMMARY.md` - current single-result measurement store truth.

### Verification surfaces
- `demo/tests/measurement-actions.test.mjs` - current action-matrix and runner contract.
- `demo/tests/measurement-overlay.test.mjs` - current placement-kind overlay coverage.
- `demo/tests/viewer-store.test.mjs` - current one-result invalidation coverage.
- `demo/tests/demo.spec.mjs` - maintained browser workflow suite for workpiece/tool selection and measurement.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable assets
- `measureExactCenter(...)` already exists in the runtime/package surface and returns `center` plus `axisDirection`. That is enough to start center-based demo compositions without reopening package APIs.
- `describeExactHole(...)`, `describeExactCounterbore(...)`, and `describeExactCountersink(...)` already expose center-adjacent information such as axis direction, anchors, and frame data for supported feature families.
- `measurement-actions.js` already centralizes action availability, core dispatch, result normalization, and current-result summaries. That is the right seam for Phase 40 composition work.
- `measurement-overlay.js` already understands placement kinds like `distance`, `thickness`, `radius`, `diameter`, and supported helper kinds. Reusing those shapes is lower risk than introducing a new overlay vocabulary.

### Current constraints worth changing
- `measurement-actions.js` currently assumes an action is mostly “one core call plus optional placement call.” That is too narrow for center-based CAM workflows that need multi-call composition.
- Action availability is currently derived from coarse selection shape (`one face`, `two faces`, `one edge`, `two edges`) rather than by explicit center-capable or CAM-workflow-friendly semantics.
- The browser demo currently proves generic exact measurement and helper flows, but it does not yet expose CAM-oriented workflow labels or summaries.

### Integration points
- Adding composed workflows will likely touch `demo/src/lib/measurement-actions.js` first, then flow into `useMeasurement.js`, `SelectionPanel.jsx`, and browser tests.
- If composed workflows synthesize placement DTOs with existing kinds (`distance`, `thickness`), overlay risk stays low and current line-pass rendering can remain unchanged.
- Tool/workpiece browser scenarios should remain explicit in `demo/tests/demo.spec.mjs` so current-result behavior and invalidation stay proven across actor boundaries.

</code_context>

<specifics>
## Specific Ideas

- Treat `clearance` as a CAM-flavored framing of exact distance where the selected refs and scenario make that wording honest.
- Treat `step depth` as a CAM-flavored framing of exact thickness or explicit planar-depth semantics, not as a generic replacement for all face-pair distances.
- Treat `center-to-center` as a spacing workflow built from two center-capable exact refs rather than as a new root primitive.
- Treat `surface-to-center` as a supported face-pair composition only when the selected refs and shipped primitives let the demo derive one honest center point and one honest surface distance without reopening mixed-selection routing.

</specifics>

<deferred>
## Deferred Ideas

- New root/package exact primitives for CAM naming alone.
- Whole-model accessibility, minimum-radius, deviation-heatmap, or undercut analysis.
- PMI/GD&T, CMM, probing result import, PDF reporting, tolerance analysis, or persistent inspection products.
- Desktop-specific CAM workflow design that changes browser-first assumptions.

</deferred>

---

*Phase: 40-demo-cam-workflow-composition*
*Context gathered: 2026-04-22*
