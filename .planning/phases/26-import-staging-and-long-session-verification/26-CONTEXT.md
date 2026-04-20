# Phase 26: Import Staging & Long-Session Verification - Context

**Gathered:** 2026-04-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 26 closes `v1.7` by locking lifecycle/performance expectations into package-first docs and governance checks, then producing explicit long-session verification evidence. Scope is documentation, governance assertions, command routing, and soak-style verification outputs only. This phase must not add new exact helper families, viewer-owned policy, or unconditional secondary-surface gates.

</domain>

<decisions>
## Implementation Decisions

### Package-first lifecycle/performance docs
- **D-01:** Root and package docs must explicitly document the lifecycle contract around retained exact models: explicit `release`/`dispose` remains authoritative; lifecycle failures stay typed and deterministic.
- **D-02:** Docs must show package-first lifecycle ergonomics via `@tx-code/occt-core` (`openManagedExact*`, `dispose()`, `getExactModelDiagnostics()`) while keeping root carrier APIs (`RetainExactModel`, `ReleaseExactModel`, `GetExactModelDiagnostics`) as lower-level references.
- **D-03:** Docs must explicitly state `FinalizationRegistry` behavior is best-effort only and must not be presented as the cleanup contract.
- **D-04:** Docs must include performance-sensitive usage guidance and verification command routing for maintainers, including the explicit perf lane added in Phase 25.

### Governance and release-boundary enforcement
- **D-05:** Release governance contract tests must fail when lifecycle/performance docs or command routing drift from the implemented surface.
- **D-06:** `npm run test:release:root` remains the authoritative runtime-first release gate and must not absorb unconditional demo/Babylon/Tauri checks.
- **D-07:** Any long-session/soak verification command remains explicit and optional (outside unconditional root release gates), but is documented and governable.

### Long-session verification evidence
- **D-08:** Add a repeatable long-session/soak verification lane focused on retained exact-model lifecycle and performance-sensitive flows.
- **D-09:** Soak evidence should be recorded as deterministic report output suitable for milestone closeout review, not ad-hoc console-only runs.

### the agent's Discretion
- Choose exact command naming for long-session verification (for example `test:soak:exact`) as long as docs/tests/governance all reference the same route.
- Choose report format for soak evidence (JSON/Markdown) as long as it is machine-readable enough for governance and human review.
- Choose whether governance locking for Phase 26 belongs in `test/release_governance_contract.test.mjs`, `test/secondary_surface_contract.test.mjs`, or both, as long as authoritative/conditional boundaries stay explicit.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone and requirement contracts
- `.planning/ROADMAP.md` — Phase 26 goal, success criteria, and two-plan split (`26-01`, `26-02`).
- `.planning/REQUIREMENTS.md` — `DOCS-04` and `GOV-05` target requirements.
- `.planning/PROJECT.md` — runtime-first release boundary and active milestone constraints.
- `.planning/STATE.md` — current position and pending workflow state.
- `AGENTS.md` — authoritative repository guidance and release/test boundaries.

### Prior phase evidence to document and govern
- `.planning/phases/24-exact-model-lifecycle-governance/24-01-SUMMARY.md` — root lifecycle diagnostics and deterministic failure semantics.
- `.planning/phases/24-exact-model-lifecycle-governance/24-02-SUMMARY.md` — package-first managed lifecycle wrappers.
- `.planning/phases/25-exact-query-store-performance/25-01-SUMMARY.md` — retained-query/store hot-path optimization.
- `.planning/phases/25-exact-query-store-performance/25-02-SUMMARY.md` — IGES staging dedup + perf lane.
- `.planning/phases/25-exact-query-store-performance/25-VERIFICATION.md` — phase-level verification baseline for Phase 26 closeout.

### Docs and governance surfaces
- `README.md` — root package docs and release gate routing.
- `packages/occt-core/README.md` — package-first adapter docs and downstream lifecycle guidance.
- `docs/sdk/measurement.md` — package-first SDK documentation that should reflect lifecycle/performance guidance where relevant.
- `test/release_governance_contract.test.mjs` — root governance assertions for release/docs contract.
- `test/secondary_surface_contract.test.mjs` — conditional secondary-surface routing contract.
- `package.json` — authoritative command routing (`test:release:root`, `test:perf:exact`, and any new soak command).

### Implemented lifecycle/performance surfaces to document
- `packages/occt-core/src/occt-core.js` — managed lifecycle wrappers and best-effort finalizer behavior.
- `packages/occt-core/src/index.d.ts` — managed lifecycle and diagnostics package typings.
- `dist/occt-js.d.ts` — root runtime lifecycle diagnostics and handle management typings.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Phase 24 already shipped the root diagnostics API and package managed wrappers, so Phase 26 can focus on docs/governance lock-in rather than new lifecycle behavior.
- Phase 25 already shipped explicit perf visibility via `npm run test:perf:exact`.
- Governance contract tests already lock many README/AGENTS/package surface rules and can be extended instead of creating parallel governance suites.

### Established Patterns
- Release boundary is explicitly runtime-first (`npm run test:release:root`).
- `.planning` and secondary-surface checks are separate optional audits.
- Docs/governance drift is enforced via regex-based contract tests under `test/release_governance_contract.test.mjs`.

### Integration Points
- Docs updates will primarily touch `README.md`, `packages/occt-core/README.md`, and likely `docs/sdk/measurement.md`.
- Governance updates will primarily touch `test/release_governance_contract.test.mjs` (and `test/secondary_surface_contract.test.mjs` only if routing coverage needs extension).
- Long-session evidence will likely add one new script under `test/` plus script routing in `package.json` and report artifact wiring under `.planning/phases/26-*/`.

</code_context>

<specifics>
## Specific Ideas

- Add one dedicated docs section for lifecycle/disposal/performance workflow that includes package-first managed usage, diagnostics, and explicit release expectations.
- Add one explicit long-session/soak command for maintainers and keep it out of unconditional root release gates.
- Extend governance tests so missing lifecycle/performance docs or command drift breaks CI quickly.

</specifics>

<deferred>
## Deferred Ideas

- Any new helper families, whole-model feature discovery, or viewer-owned session/disposal policy changes.
- Any requirement to make demo/Babylon/Tauri verification unconditional in `npm run test:release:root`.
- Any migration of IGES fallback from temp-file staging to stream-based loading.

</deferred>

---

*Phase: 26-import-staging-and-long-session-verification*
*Context gathered: 2026-04-20*
