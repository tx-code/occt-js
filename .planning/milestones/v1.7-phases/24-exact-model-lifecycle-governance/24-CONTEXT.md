# Phase 24: Exact Model Lifecycle Governance - Context

**Gathered:** 2026-04-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Harden retained exact-model lifetime semantics for the already-shipped exact runtime and helper surface. This phase covers explicit release behavior, stale-handle behavior, package-first disposal helpers, and caller-facing diagnostics for unreleased handles. It does not widen the exact helper family, change viewer ownership, or absorb the Phase 25 performance work on `ExactModelStore` copies and IGES staging.

</domain>

<decisions>
## Implementation Decisions

### Ownership Model
- **D-01:** Keep the root runtime's integer `exactModelId` contract and explicit `RetainExactModel` / `ReleaseExactModel` methods authoritative. Phase 24 is additive only; existing open/query/helper entrypoints stay source-compatible.
- **D-02:** Add any safer lifecycle surface package-first in `@tx-code/occt-core` as an opt-in managed wrapper/helper around the existing exact open + release flow. Do not replace `openExactModel()` or change existing exact result DTOs into opaque ownership objects.
- **D-03:** Existing exact refs remain lightweight occurrence-scoped data. After release, stale refs and stale handles should continue to fail through deterministic typed lifecycle results rather than through hidden package-only invalidation state.

### Diagnostics Surface
- **D-04:** Diagnostics for unreleased handles should be explicit and pull-based. Prefer additive lifecycle snapshot/inspection DTOs over implicit console logging or ambient warnings on every query.
- **D-05:** The root runtime remains the authoritative source of live/released/unknown handle truth. `@tx-code/occt-core` may expose convenience helpers for consuming diagnostics, but it should not invent a separate ownership ledger.
- **D-06:** Lifecycle failures must preserve the current `{ ok, code, message }` style and extend it only additively where Phase 24 needs more detail.

### Finalizer Policy
- **D-07:** If `FinalizationRegistry` is introduced, it is best-effort only and lives behind the package-first helper layer. It may reduce forgotten-release leaks, but it is never the contractual cleanup guarantee.
- **D-08:** Docs, tests, and planner output must state clearly that explicit release/dispose remains required for deterministic cleanup. Finalizer behavior must not be assumed by the root release gate.

### the agent's Discretion
- Exact naming of any additive managed-wrapper or helper entrypoints, provided the current `openExactModel()` and numeric-handle contract remain unchanged.
- Whether diagnostics land as one snapshot API, a small pair of APIs, or a package helper layered over one root snapshot DTO.
- Whether best-effort finalizer support ships in the first lifecycle helper pass or only after the explicit disposal contract is already locked and tested.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone scope and requirements
- `.planning/ROADMAP.md` — Phase 24 goal, dependency, success criteria, and plan split for exact lifecycle governance.
- `.planning/REQUIREMENTS.md` — `LIFE-01`, `LIFE-02`, and `ADAPT-10` define the lifecycle, deterministic failure, and package-boundary requirements for this phase.
- `.planning/PROJECT.md` — Current milestone framing, release boundary, downstream compatibility constraints, and the sequencing decision that lifecycle/performance hardening comes before broader expansion.
- `AGENTS.md` — Repository-level release boundaries, testing expectations, and the rule that root runtime changes must preserve the runtime-first release gate.

### Existing risk and verification context
- `.planning/codebase/CONCERNS.md` — Records manual exact-model lifecycle management as a scaling limit, flags the exact-query/lifecycle glue as fragile, and notes that leak/soak coverage is currently missing.
- `.planning/codebase/TESTING.md` — Documents the existing root/runtime and `packages/occt-core` lifecycle contract tests and the expectation that real dist artifacts remain the source of truth for runtime contract coverage.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/exact-model-store.cpp` / `src/exact-model-store.hpp`: already owns the live/released handle split, reference counting, and lifecycle result codes; this is the natural root integration point for stricter lifecycle semantics and any additive diagnostics.
- `src/js-interface.cpp`: binds `OpenExact*Model`, `RetainExactModel`, and `ReleaseExactModel`; additive lifecycle APIs must connect here to become part of the root Wasm contract.
- `packages/occt-core/src/occt-core.js`: currently provides thin `retainExactModel()` and `releaseExactModel()` pass-through methods, making it the right package-first seam for managed wrappers or disposal helpers.
- `test/exact_model_lifecycle_contract.test.mjs`: already locks deterministic `released-handle` and `invalid-handle` behavior on the real runtime.
- `packages/occt-core/test/core.test.mjs` and `packages/occt-core/test/live-root-integration.test.mjs`: already prove that lifecycle DTOs pass through `occt-core` and that real callers manually release retained models after use.

### Established Patterns
- Root lifecycle DTOs use the narrow `{ ok, code, message }` shape for failure signaling rather than thrown exceptions.
- `@tx-code/occt-core` generally stays additive and transform-transparent; it wraps root runtime behavior but avoids introducing viewer policy or separate semantic ownership state.
- The authoritative release boundary remains runtime-first. Any lifecycle additions need root contract tests and `occt-core` coverage, not unconditional demo/Babylon/Tauri gates.

### Integration Points
- Root runtime changes will touch `src/exact-model-store.*`, `src/js-interface.cpp`, and `dist/occt-js.d.ts`.
- Package-first lifecycle helpers will touch `packages/occt-core/src/occt-core.js` and `packages/occt-core/src/index.d.ts`.
- Contract and governance updates will center on `test/exact_model_lifecycle_contract.test.mjs`, `packages/occt-core/test/core.test.mjs`, `packages/occt-core/test/live-root-integration.test.mjs`, and any additive release-governance coverage that locks the lifecycle wording without widening secondary-surface gates.

</code_context>

<specifics>
## Specific Ideas

- No external product/UI references were introduced for this phase. Recommended defaults were selected automatically to preserve the existing numeric-handle contract, keep explicit release authoritative, and avoid wrapper-only ownership semantics.
- Package-first lifecycle helpers may be more ergonomic than the current raw open/release sequence, but they must stay opt-in and additive so existing downstream code paths remain valid.

</specifics>

<deferred>
## Deferred Ideas

- Reduce `ExactModelStore::GetEntry` copy cost and related retained-query hot-path overhead — belongs to Phase 25.
- Centralize and minimize IGES temp-file staging / duplicate byte-copy work — belongs to Phase 25.
- Babylon package dependency alignment and broader secondary-surface cleanup — belongs to `v1.8`, not this lifecycle-governance phase.

</deferred>

---

*Phase: 24-exact-model-lifecycle-governance*
*Context gathered: 2026-04-18*
