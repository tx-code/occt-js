# Phase 18: Runtime Path Contract Alignment - Context

**Gathered:** 2026-04-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 18 aligns the root preflight/runtime-path contract with the concrete `dist/occt-js.js` and `dist/occt-js.wasm` artifact paths already used by maintained root consumers and the demo dev runtime. This phase is limited to removing runtime-path drift and restoring a passing `npm run test:wasm:preflight` without broadening into release-governance decoupling or secondary-surface package cleanup.

</domain>

<decisions>
## Implementation Decisions

### Runtime contract anchor
- **D-01:** Treat the concrete repo-root `dist/occt-js.js` and `dist/occt-js.wasm` file paths as the shared local/dev runtime contract. Root preflight should align to the concrete file-path lookup already used in `demo/src/hooks/useOcct.js` and asserted in `demo/tests/use-occt-runtime-contract.test.mjs`.
- **D-02:** Do not revert the demo hook back to a directory-base `dist/` lookup just to satisfy stale preflight assertions. The stale root contract test should move toward the shipped concrete-file behavior, not the other way around.

### Phase 18 scope boundary
- **D-03:** Keep this phase strictly on `PATH-01` and `PATH-02`: fix the runtime-path drift, keep the `dist/` artifact boundary explicit, and restore a green `npm run test:wasm:preflight`.
- **D-04:** Any `.planning` archive-state decoupling, release-governance restructuring, or documentation-wide gate rewrite stays in Phase 19. Phase 18 may only make minimal adjacent edits needed to keep the runtime-path story coherent.

### Verification strategy
- **D-05:** Use `npm run test:wasm:preflight` as the canonical success gate for this phase, supported by targeted runtime-path contract tests rather than a broad milestone-wide verification sweep.
- **D-06:** Preserve negative coverage around missing or misplaced `dist/` artifacts. The solution must keep the canonical packaged artifact boundary strict rather than weakening checks to make the test suite pass.

### Runtime variant handling
- **D-07:** Keep the existing runtime split intact: local dev resolves concrete repo-root `dist/` files, Tauri resolves bundled `dist/` resources, and production web fallback behavior remains unchanged unless a minimal consistency fix is required. CDN/offline hardening is not a Phase 18 objective.

### the agent's Discretion
- Consolidate or trim duplicate runtime-path assertions if two tests are enforcing the same concrete-file contract with no additional signal.
- Choose the most maintainable assertion style for source-text contract tests as long as it stays explicit about the concrete JS and Wasm artifact paths.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone and phase contract
- `.planning/PROJECT.md` — Active milestone goal, release-boundary constraints, and the decision to harden release flow before adding new runtime APIs.
- `.planning/REQUIREMENTS.md` — `PATH-01` and `PATH-02` define the required outcome for this phase.
- `.planning/ROADMAP.md` — Phase 18 goal, dependency chain, and success criteria.
- `AGENTS.md` — Repository-level release boundary, canonical `dist/` artifacts, and root-vs-secondary-surface verification rules.

### Runtime path consumers and tests
- `demo/src/hooks/useOcct.js` — Current concrete local-dev `dist/occt-js.js` / `dist/occt-js.wasm` lookup and runtime variant split.
- `demo/tests/use-occt-runtime-contract.test.mjs` — Existing demo-side assertion that local dev uses concrete runtime file URLs instead of a directory base.
- `test/dist_contract_consumers.test.mjs` — Stale root consumer contract test that still expects a directory-base lookup and must be reconciled.
- `package.json` — `test:wasm:preflight` script definition and the authoritative root command surface touched by this phase.

### Dist-boundary guardrails
- `tools/check_wasm_prereqs.mjs` — Existing prerequisite helpers that define the expected `dist/` type-definition and toolchain markers.
- `test/load_occt_factory.test.mjs` — Negative and positive `dist/` artifact checks that show the repo already treats concrete `dist` files as the runtime boundary.
- `test/wasm_build_prereqs.test.mjs` — Existing preflight-style prerequisite coverage for missing markers and tracked type definitions.
- `README.md` — Public docs describing the packaged `dist/` carrier and the current root test/release entrypoints.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `test/dist_contract_consumers.test.mjs`: Existing root contract suite already owns the runtime-path drift and should remain the main Phase 18 test-edit target.
- `demo/tests/use-occt-runtime-contract.test.mjs`: Demo-side contract test already encodes the recommended concrete-file lookup and can serve as the alignment reference.
- `demo/src/hooks/useOcct.js`: Central runtime resolver for local dev, Tauri, and production web; any implementation change should stay localized here.
- `tools/check_wasm_prereqs.mjs`, `test/load_occt_factory.test.mjs`, `test/wasm_build_prereqs.test.mjs`: Existing preflight helpers and dist-boundary tests that can be extended without inventing a new verification surface.

### Established Patterns
- Root contract tests use `node:test` plus `node:assert/strict` and often read source files as text to assert explicit packaging/runtime guarantees.
- Runtime-boundary expectations are encoded as concrete artifact paths in `package.json`, `README.md`, and the root loader/preflight tests rather than through abstract config layers.
- `demo/src/hooks/useOcct.js` already isolates runtime selection by environment, which supports small surgical changes instead of a broader loader redesign.

### Integration Points
- `package.json` `test:wasm:preflight` is the phase-defining command surface.
- `test/dist_contract_consumers.test.mjs` and `demo/tests/use-occt-runtime-contract.test.mjs` are the primary assertion points that must stop disagreeing.
- `demo/src/hooks/useOcct.js` is the maintained implementation that root preflight must describe accurately.

</code_context>

<specifics>
## Specific Ideas

- The current concrete-file lookup in `demo/src/hooks/useOcct.js` is treated as the correct local/dev contract because it already distinguishes `occt-js.js` from `occt-js.wasm` explicitly and matches the demo-side contract test.
- The cleanest Phase 18 outcome is likely to update the stale root contract assertion and keep the rest of the runtime-variant logic as untouched as possible.
- Avoid turning this phase into a proxy debate about production CDN fallback, offline support, or release-governance coupling. Those belong in later phases.

</specifics>

<deferred>
## Deferred Ideas

- Release-governance decoupling from `.planning` archive state belongs to Phase 19.
- Demo/Babylon command discoverability and package-local verification fixes belong to Phase 20.
- Production web local-asset fallback, CDN integrity, or offline runtime-hardening remain future work outside this phase boundary.

</deferred>

---

*Phase: 18-runtime-path-contract-alignment*
*Context gathered: 2026-04-17*
