# Phase 42: Docs & Conditional Verification for CAM Sample - Context

**Gathered:** 2026-04-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 42 is the closeout phase for `v1.13`. Phases 40 and 41 already shipped the accepted CAM-flavored demo workflows (`clearance`, `step depth`, `center-to-center`, `surface-to-center`) and sample-first wording. The remaining gap is governance alignment: live docs, active planning truth, and conditional verification must lock that shipped behavior without widening root release scope.

This phase is allowed to update root/package/sdk docs, active `.planning` truth, and conditional secondary-surface contract coverage so they all describe the same CAM sample boundary.

This phase does not add new root Wasm APIs, new `@tx-code/occt-core` APIs, new demo workflows, measurement-product UX, persistence/reporting scope, or release-pipeline changes to `npm run test:release:root`.

</domain>

<decisions>
## Implementation Decisions

### Documentation ownership and wording
- **D-01:** Canonical docs should now explicitly describe the `v1.13` CAM sample set as demo-owned compositions over shipped exact primitives, not as new runtime/package contract names.
- **D-02:** Keep package/runtime wording reusable and primitive-first (`distance`, `thickness`, `center`, helpers). Keep CAM workflow naming in the demo/sample boundary description.
- **D-03:** `README.md`, `docs/sdk/measurement.md`, and `packages/occt-core/README.md` should stay aligned on one boundary sentence: supported exact action routing, overlay rendering, and current-result behavior are downstream concerns.

### Planning truth and milestone closure
- **D-04:** Active `.planning` truth should describe `v1.13` as CAM sample composition already completed in Phases 40-41 with Phase 42 focused on docs/governance locking.
- **D-05:** Archived milestone files remain historical records; only active planning surfaces need alignment for current-state decisions.

### Conditional verification and release boundary
- **D-06:** `test/secondary_surface_contract.test.mjs` is the primary lock for docs and secondary-surface browser-lane routing; it should fail on CAM-sample wording drift.
- **D-07:** `test/release_governance_contract.test.mjs` should continue proving that secondary-surface checks remain outside `npm run test:release:root`.
- **D-08:** Browser verification remains conditional (`demo` lane). It should validate maintained CAM sample behavior without becoming an unconditional root release gate.

### Sequencing
- **D-09:** Update docs/planning truth first, then tighten conditional verification to lock the final wording and browser lane expectations.
- **D-10:** Prefer targeted assertions and small wording updates over broad rewrites or release-script churn.

### The agent's discretion
- Whether CAM sample wording appears as a compact bullet list or short prose in each doc, as long as ownership boundaries remain explicit.
- Whether browser-lane drift checks should key on action ids, summaries, or both, as long as they remain stable and meaningful.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone and repository contract
- `.planning/PROJECT.md` - active `v1.13` framing and current-state wording.
- `.planning/ROADMAP.md` - Phase 42 goal and `42-01` / `42-02` split.
- `.planning/REQUIREMENTS.md` - `DOCS-08` and `GOV-06`.
- `.planning/STATE.md` - workflow position and expected next action.
- `AGENTS.md` - GSD ownership and release-boundary rules.

### Prior phase truth that must be preserved
- `.planning/phases/40-demo-cam-workflow-composition/40-01-SUMMARY.md`
- `.planning/phases/40-demo-cam-workflow-composition/40-02-SUMMARY.md`
- `.planning/phases/41-cam-scenario-ux-sample-first-presentation/41-01-SUMMARY.md`
- `.planning/phases/41-cam-scenario-ux-sample-first-presentation/41-02-SUMMARY.md`
- `docs/plan/cam-measurement-matrix.md`

### Live docs and conditional verification seams
- `README.md`
- `docs/sdk/measurement.md`
- `packages/occt-core/README.md`
- `test/secondary_surface_contract.test.mjs`
- `test/release_governance_contract.test.mjs`
- `demo/tests/demo.spec.mjs`
- `demo/package.json`
- `package.json`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable assets
- Live docs already enforce the root-vs-secondary release boundary and conditional verification routing (`test:release:root` vs `test:secondary:contracts`).
- `docs/plan/cam-measurement-matrix.md` already captures the ownership split and accepted CAM sample workflows.
- Browser coverage in `demo/tests/demo.spec.mjs` already exercises CAM sample actions and typed unsupported behavior.

### Current drift to address
- Canonical root/sdk/package docs describe the simplified measurement sample boundary, but they do not yet consistently call out the shipped `v1.13` CAM sample set and ownership split.
- `test/secondary_surface_contract.test.mjs` still anchors on general measurement-loop assertions and does not explicitly lock CAM sample drift indicators from Phases 40-41.
- Active planning status still says Phase 42 planning next; it should be moved to execution-ready after plan artifacts land.

### Integration points
- Docs wording updates must be mirrored by conditional docs assertions in `test/secondary_surface_contract.test.mjs`.
- CAM browser drift checks should be anchored to maintained `demo/tests/demo.spec.mjs` seams already used by the secondary contract test.
- Governance routing stays in `test/release_governance_contract.test.mjs`; no script changes are expected.

</code_context>

<specifics>
## Specific Ideas

- Add concise CAM sample wording to canonical docs that keeps exact primitives package-first while naming demo-owned workflows (`clearance`, `step depth`, `center-to-center`, `surface-to-center`).
- Tighten secondary contract assertions to lock both docs ownership language and maintained CAM browser-lane markers.
- Keep release-governance assertions explicit that `test:secondary:contracts` remains outside `test:release:root`.

</specifics>

<deferred>
## Deferred Ideas

- New runtime/package exact primitives justified only by CAM naming.
- Broader CAM analytics, tolerance/probing/report workflows, PMI/CMM scope.
- Any root release command changes beyond existing governance checks.

</deferred>

---

*Phase: 42-docs-conditional-verification-cam-sample-lock*
*Context gathered: 2026-04-22*
