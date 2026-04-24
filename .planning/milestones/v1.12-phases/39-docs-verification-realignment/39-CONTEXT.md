# Phase 39: Docs & Verification Realignment - Context

**Gathered:** 2026-04-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 39 is the final subtractive cleanup phase for `v1.12`. Phases 37 and 38 already simplified the browser demo and pruned demo-owned action/session semantics away from the retained package surface. The remaining work is to make the live docs, active planning truth, and conditional verification say the same thing.

This phase is allowed to rewrite root/package/sdk wording that still implies a richer measurement-product workflow, tighten secondary-surface contract tests around the reduced browser sample, and refresh active `.planning/` truth where it still advertises removed demo workflow behavior.

This phase does not reopen runtime/package capability work, restore dropped workflow docs, add new measurement helpers, widen the authoritative root release gate, or recreate the browser demo as a product surface.

</domain>

<decisions>
## Implementation Decisions

### Documentation scope
- **D-01:** Phase 39 is about alignment, not expansion. It should make the currently shipped surface easier to understand without introducing new promises.
- **D-02:** The canonical message is now: `occt-js` ships exact primitives and narrow helpers package-first; the browser demo is an integration sample with explicit supported actions and one current-result flow.
- **D-03:** Root and SDK docs should stop claiming `selection-to-measure mapping` or `transient run history` as meaningful shipped concepts now that the demo no longer presents that richer workflow.
- **D-04:** The missing `docs/demo/exact-measurement-workflow.md` file should not be resurrected just to satisfy old wording. Phase 39 should instead align the surviving live docs with the reduced sample-first boundary.

### Active planning truth
- **D-05:** Active `.planning/` documents should not keep advertising removed demo workflow behavior such as `rerun/compare/clear flows` once the subtraction milestone intentionally removed it from the live sample.
- **D-06:** Historical archived milestone artifacts may retain historical wording, but active milestone truth should describe only the current shipped surface and current milestone intent.

### Verification and governance
- **D-07:** `test/secondary_surface_contract.test.mjs` is the main conditional verification seam for this phase. It should assert the reduced docs language and the maintained browser lane without widening the authoritative root release route.
- **D-08:** `npm run test:release:root` must remain unchanged. If governance needs extra coverage, prefer tightening targeted docs/secondary assertions rather than changing release scripts.
- **D-09:** Browser/sample verification should keep proving the maintained measurement loop while avoiding assertions about removed candidate/session/productivity surfaces.

### Sequencing
- **D-10:** Rewrite live docs and active planning truth first, then tighten conditional verification around the updated language so the tests lock the final wording instead of stale assumptions.

### The agent's discretion
- Whether active planning drift should be corrected only in `.planning/PROJECT.md` or also in a small number of other active milestone files if they still misstate the retained workflow.
- Whether Phase 39 needs a small release-governance assertion refresh in addition to the secondary-surface audit once the docs rewrite is complete.
- Whether neutral wording should center on `supported exact actions`, `current-result session behavior`, and `integration sample`, or equivalent phrasing that preserves the same boundary.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone and repository contract
- `.planning/PROJECT.md` - active `v1.12` subtraction framing and the live validated/current-state wording that may need realignment.
- `.planning/ROADMAP.md` - Phase 39 goal, success criteria, and the `39-01` / `39-02` split.
- `.planning/REQUIREMENTS.md` - `DOCS-07` and `GOV-05` plus the subtractive out-of-scope guardrails.
- `.planning/STATE.md` - current workflow position and expectation that Phase 39 planning is next.
- `AGENTS.md` - repository rules for GSD ownership, mandatory execution gates, and the split between authoritative root verification and conditional secondary-surface checks.

### Prior phase outputs that define the reduced surface
- `.planning/phases/37-demo-simplification-sample-first-workflow/37-01-SUMMARY.md`
- `.planning/phases/37-demo-simplification-sample-first-workflow/37-02-SUMMARY.md`
- `.planning/phases/38-boundary-api-pruning/38-01-SUMMARY.md`
- `.planning/phases/38-boundary-api-pruning/38-02-SUMMARY.md`

### Live docs and tests that currently drift
- `README.md` - still contains older measurement-product wording in the exact measurement/helper SDK section.
- `packages/occt-core/README.md` - already partially aligned after Phase 38 and should be treated as the package-facing reference point.
- `docs/sdk/measurement.md` - still contains older downstream workflow wording that no longer matches the reduced browser sample.
- `test/secondary_surface_contract.test.mjs` - still asserts stale wording such as `selection-to-measure mapping` and `transient run history`.

### Active planning truth surfaces
- `.planning/PROJECT.md`
- `.planning/ROADMAP.md`
- `.planning/STATE.md`

### Browser and governance anchors
- `demo/tests/demo.spec.mjs` - maintained browser lane for the reduced sample.
- `test/release_governance_contract.test.mjs` - existing governance anchor that must not imply a wider root release gate.
- `package.json` - source of truth for `test:release:root` and `test:secondary:contracts`.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable assets
- `packages/occt-core/README.md` already uses the reduced language: `supported exact action routing`, `overlay rendering`, and `current-result session behavior` remain downstream.
- The browser demo and its maintained Playwright lane already reflect the simplified sample-first/current-result workflow from Phase 37.
- `test/release_governance_contract.test.mjs` already protects the authoritative root release route, so Phase 39 does not need to redesign release governance.

### Observed docs and verification drift
- `README.md` still says the shipped browser demo keeps `selection-to-measure mapping` and `transient run history` in app code.
- `docs/sdk/measurement.md` still repeats the same stale phrasing.
- `test/secondary_surface_contract.test.mjs` still expects the old phrases in `README.md`, `packages/occt-core/README.md`, and `docs/sdk/measurement.md`, even though the package README no longer contains them.
- Active `.planning/PROJECT.md` still contains an older validated bullet for Phase 34 that advertises `rerun/compare/clear flows`, which no longer matches the reduced browser sample retained by `v1.12`.
- `docs/demo/` is currently absent, so any plan that depends on reviving a dedicated demo workflow doc would be fighting the current repo shape instead of aligning it.

### Established patterns
- Root/package docs describe retained reusable contract behavior; demo app behavior is documented only as an example integration boundary, not as a first-class package workflow.
- Conditional verification lives in `test/secondary_surface_contract.test.mjs` and should assert docs/manifest/demo-lane truth without becoming part of the authoritative root release gate.
- Active `.planning/` files are allowed to evolve with the current milestone even when archived milestone files preserve historical behavior descriptions.

### Integration points
- Wording changes in `README.md` and `docs/sdk/measurement.md` should be mirrored in `test/secondary_surface_contract.test.mjs`.
- Any active planning truth cleanup should stay consistent with the already-completed Phase 37/38 summaries and the current `v1.12` subtractive milestone framing.
- If governance wording needs minor refresh, it should remain a targeted test adjustment rather than a command or release-pipeline change.

</code_context>

<specifics>
## Specific Ideas

- Rewrite the exact measurement/helper SDK docs so they describe the browser demo as a simplified integration sample with explicit supported actions and current-result inspection.
- Align the active planning truth so `v1.12` no longer carries forward Phase 34-era workflow claims as if they are still the current browser surface.
- Update the secondary-surface contract audit to assert the reduced wording and to stop expecting removed workflow concepts.
- Keep the docs self-contained in existing live surfaces rather than reviving a separate demo workflow guide.

</specifics>

<deferred>
## Deferred Ideas

- New measurement primitives, helper families, or action-analysis APIs.
- Any package-owned session workflow, reporting, or measurement-product UX.
- Restoring or expanding dedicated demo workflow docs beyond what the live README/SDK docs need.
- Changing `npm run test:release:root` or turning conditional browser/demo checks into unconditional release gates.

</deferred>

---

*Phase: 39-docs-verification-realignment*
*Context gathered: 2026-04-21*
