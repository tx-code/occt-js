# Phase 38: Boundary & API Pruning - Context

**Gathered:** 2026-04-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 38 is a subtractive boundary-cleanup phase. It follows the demo simplification work from Phase 37 and focuses on the remaining seams where demo-owned measurement integration behavior can still read like shared SDK behavior or package-owned policy.

This phase is allowed to tighten or rename demo-owned helper seams, prune ambiguous package-adjacent terminology, and harden the retained `@tx-code/occt-core` typing/export contract around the actually shipped measurement and helper surface.

This phase does not deliver new exact kernels, new semantic helper families, renewed candidate-analysis work, session product features, a root release-gate rewrite, or a broad docs/governance rewrite. Those documentation and verification realignment tasks belong to Phase 39.

</domain>

<decisions>
## Implementation Decisions

### Subtractive boundary guardrails
- **D-01:** Phase 38 remains subtractive. It should clarify ownership and prune drift before it adds any new runtime or package behavior.
- **D-02:** Retained public value stays the same: exact measurement primitives, placement helpers, relation classification, narrow shipped helpers, and generated-shape/profile-solid contracts remain package-first and source-compatible.
- **D-03:** Measurement action routing, action presentation, and session semantics stay downstream. If a seam still reads like package-owned workflow logic, it should be tightened or renamed rather than expanded.

### Demo-owned integration seams
- **D-04:** Demo-local measurement action helpers may stay reusable inside `demo/`, but their naming and tests should make their ownership explicit instead of sounding like a general SDK analysis layer.
- **D-05:** Browser-facing copy should describe supported actions and current-result inspection without surfacing internal ownership jargon or stale "candidate" language.
- **D-06:** Demo subtraction must preserve the Phase 37 sample-first workflow: import a workpiece, optionally generate a tool, select exact refs, run a supported action, and inspect one current result.

### Package/runtime-adjacent contract
- **D-07:** `@tx-code/occt-core` exports and published typings should only describe retained reusable primitives and helper wrappers. Demo routing/session semantics must not leak into package exports or typed names.
- **D-08:** If package audit shows the current export barrel is already minimal, Phase 38 should prefer contract hardening and naming cleanup over churn for its own sake.
- **D-09:** Root runtime and `npm run test:release:root` stay unchanged. Phase 38 may harden package or targeted governance coverage, but must not widen the authoritative root release gate.

### Verification and sequencing
- **D-10:** Demo-owned seam cleanup should land before package/export hardening so the retained contract is evaluated against the already-simplified browser sample.
- **D-11:** Docs-heavy wording cleanup and secondary-surface governance realignment are deferred to Phase 39 unless Phase 38 needs one minimal code-adjacent wording fix to keep a test honest.

### The agent's discretion
- Whether demo-local helper ownership is clarified through renamed exports, a renamed file/module, reduced UI copy, or a combination of those techniques.
- Whether package contract tightening needs actual `index.js` / `index.d.ts` edits or only stronger tests once the audit confirms the current barrel is already minimal.
- Whether a tiny amount of package-adjacent README wording must move with the code to avoid an obviously false contract statement; broader docs cleanup still belongs to Phase 39.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone and repository contract
- `.planning/PROJECT.md` - active `v1.12` subtraction framing and retained package/runtime boundary.
- `.planning/ROADMAP.md` - Phase 38 goal, success criteria, and the `38-01` / `38-02` split.
- `.planning/REQUIREMENTS.md` - `BOUND-01` and `SDK-04` plus milestone-wide out-of-scope guardrails.
- `.planning/STATE.md` - current workflow position and expectation that Phase 38 planning is next.
- `AGENTS.md` - repository rules for GSD ownership, release-boundary discipline, demo verification, and mandatory execution gates.

### Prior phase and milestone constraints
- `.planning/phases/37-demo-simplification-sample-first-workflow/37-CONTEXT.md` - Phase 37 sample-first guardrails that Phase 38 must preserve.
- `.planning/phases/37-demo-simplification-sample-first-workflow/37-RESEARCH.md` - prior reasoning about demo-owned action mapping and reduced workflow state.
- `.planning/phases/37-demo-simplification-sample-first-workflow/37-01-SUMMARY.md` - simplified inspector and current-result truth.
- `.planning/phases/37-demo-simplification-sample-first-workflow/37-02-SUMMARY.md` - reduced measurement-state and import-first workflow truth.
- `.planning/milestones/v1.11-phases/36-semantic-helper-foundations/36-01-SUMMARY.md` - helper-only retained surface after candidate-analysis and session-productivity scope was dropped.

### Package and runtime-adjacent surfaces
- `packages/occt-core/src/occt-core.js` - retained package-first exact measurement/helper wrappers and generated-shape/profile-solid adapters.
- `packages/occt-core/src/index.js` - published JS barrel.
- `packages/occt-core/src/index.d.ts` - published typing surface for `@tx-code/occt-core`.
- `packages/occt-core/test/package-contract.test.mjs` - current package contract audit and absence-of-candidate-analysis coverage.
- `test/release_governance_contract.test.mjs` - root release-boundary and package/docs contract expectations that Phase 38 must not accidentally widen.

### Demo-owned integration surfaces
- `demo/src/lib/measurement-actions.js` - current demo-owned action matrix and runner metadata.
- `demo/src/hooks/useMeasurement.js` - current demo-owned measurement execution seam.
- `demo/src/components/SelectionPanel.jsx` - inspector copy and action presentation.
- `demo/tests/measurement-actions.test.mjs` - current node-level contract for demo-owned action routing.
- `demo/tests/demo.spec.mjs` - maintained browser regression for the simplified measurement sample.

### Drift evidence likely addressed later
- `README.md`
- `packages/occt-core/README.md`
- `docs/sdk/measurement.md`
- `test/secondary_surface_contract.test.mjs`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable assets
- `packages/occt-core` no longer publishes candidate-analysis APIs. The remaining measurement/helper surface is already narrow and package-first.
- `demo/src/lib/measurement-actions.js` already isolates action routing in one place, which makes it the right seam for ownership clarification.
- `packages/occt-core/test/package-contract.test.mjs` already asserts that candidate-analysis descriptors are absent from the published typing surface.
- `test/release_governance_contract.test.mjs` already locks the root release boundary, so Phase 38 can harden package/export truth without reopening root release routing.

### Observed boundary drift
- The demo-owned action helper module still uses generic names such as `deriveMeasurementAvailability` and `runMeasurementAction`, which read more reusable than the current repo boundary intends.
- `demo/tests/measurement-actions.test.mjs` still uses stale "candidate descriptor" wording from dropped `v1.11` scope, even though the implementation is now purely demo-owned explicit routing.
- Browser inspector copy still surfaces internal ownership language (`demo-owned exact actions`) instead of simply presenting supported actions.
- Root/package docs and secondary-surface contract tests still mention `selection-to-measure mapping` and `transient run history`; that is real drift, but the bulk rewrite belongs to Phase 39 rather than this phase.

### Established patterns
- Demo-local behavior lives under `demo/src/lib` and `demo/src/hooks`; package/public behavior lives under `packages/occt-core`.
- Package contract tests routinely verify absence of undesired public surface, not just presence of desired APIs.
- The repo already prefers additive-safe pruning: keep shipped exact primitives/helpers stable while tightening downstream ownership around them.

### Integration points
- Any demo-owned helper rename or narrowing must propagate through `useMeasurement.js`, `SelectionPanel.jsx`, and `demo/tests/measurement-actions.test.mjs`.
- Any package export/typing tightening must stay aligned across `packages/occt-core/src/index.js`, `packages/occt-core/src/index.d.ts`, and `packages/occt-core/test/package-contract.test.mjs`.
- If Phase 38 touches governance tests, it should be limited to targeted contract expectations rather than full docs/governance rewrites.

</code_context>

<specifics>
## Specific Ideas

- Clarify demo-only ownership at the helper seam instead of letting a demo-local action router look like a shared SDK layer.
- Prefer user-facing copy such as "Supported exact actions" over internal phrasing like "demo-owned exact actions."
- Keep package contract hardening focused on typed exports, absence of leaked session/routing semantics, and stable retained helper wrappers.
- Treat docs/test wording drift as evidence for Phase 39, not as a reason to turn Phase 38 into a documentation sweep.

</specifics>

<deferred>
## Deferred Ideas

- Broad README, SDK-guide, and secondary-surface contract wording cleanup. That belongs to Phase 39.
- New exact measurement primitives, new helper families, renewed candidate suggestion, or whole-model analysis work.
- Persistent session, export, reporting, tolerance, or collaboration workflows.
- Root release-gate rewrites or unconditional widening of browser/demo verification.

</deferred>

---

*Phase: 38-boundary-api-pruning*
*Context gathered: 2026-04-21*
