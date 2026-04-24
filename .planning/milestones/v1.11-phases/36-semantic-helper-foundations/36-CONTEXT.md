# Phase 36: Semantic Helper Foundations - Context

**Gathered:** 2026-04-21
**Status:** Ready for planning

> Historical note (2026-04-21): this context was written before the milestone was narrowed. The retained active scope keeps only Phase `36-01` compound-hole helper work; the candidate-analysis follow-on described below was dropped before acceptance.

<domain>
## Phase Boundary

Phase 36 opens `v1.11` by adding genuinely new semantic-helper foundations on top of the shipped exact measurement kernel. Existing helper surfaces already cover selected-ref hole and chamfer descriptors plus package-only midpoint, equal-distance, and midplane-style symmetry compositions, so this phase must not re-plan or re-implement them. Instead it should extend single-ref semantics into supported compound-hole variants and add deterministic candidate-analysis descriptors over caller-supplied exact refs so Phase 37 can surface suggestions without viewer-only coupling or mesh heuristics.

</domain>

<decisions>
## Implementation Decisions

### Supported semantic family scope
- **D-01:** Phase 36 focuses on supported compound-hole variants, specifically `counterbore` and `countersink`, as the next additive semantic family over the shipped exact surface. Slot-width, groove, and richer symmetry families are deferred.
- **D-02:** Supported inputs stay narrow and selected-ref-based: circular edge refs and cylindrical or conical face refs that can be normalized into a stable hole-family interpretation. Phase 36 must not widen into whole-model feature scans, tool schemas, mesh heuristics, or viewer-owned ids.
- **D-03:** Existing `describeExactHole(ref)` semantics remain intact for simple cylindrical holes. New compound-hole helpers should be additive package surfaces rather than retrofitting broad new meaning into the existing helper contract.

### Package/runtime boundary
- **D-04:** `@tx-code/occt-core` remains the primary downstream entry point. Public Phase 36 APIs should be package-first helpers such as `describeExactCounterbore(ref)` and `describeExactCountersink(ref)` or an equivalent family-specific surface.
- **D-05:** If current root hole primitives are insufficient, the runtime may add one narrow selected-ref compound-hole descriptor that stays additive and avoids generic topology traversal, whole-model feature recognition, or batch discovery APIs.
- **D-06:** Any new root DTO should describe semantic facts rather than raw adjacency: base-hole diameter or depth, counterbore diameter or depth, countersink diameter or included angle, stable frame and anchors, and any validated orientation data needed by downstream placement or preview logic.

### Candidate-analysis surface
- **D-07:** Candidate analysis must stay package-first and deterministic over caller-supplied exact refs. The package should expose one typed selection-analysis API that advertises supported measurement or helper actions from the current selection without introducing demo-owned policy.
- **D-08:** Candidate descriptors should compose over shipped and new helper surfaces rather than duplicate geometry heuristics. Existing exact measurement wrappers and helper APIs remain the canonical source of truth for support decisions.
- **D-09:** Candidate outputs must remain occurrence-safe and helper-oriented. They may carry normalized refs, helper or action identifiers, selection arity, family, and minimal preview data, but they must not include viewer ids, labels, ranking policy, or session persistence concerns.

### Failure and compatibility semantics
- **D-10:** Follow the existing exact-helper pattern: supported helpers return `ok: true` semantic DTOs, while invalid, mixed-model, unsupported, or degenerate selections return explicit typed failures with stable codes and messages.
- **D-11:** Candidate analysis should stay explicit as well. Unsupported selections may return a typed failure or an empty deterministic success result, but the chosen contract must not silently guess semantics or depend on mesh fallback behavior.
- **D-12:** `packages/occt-core/src/index.d.ts` must remain the typed package contract. Any new root additions also extend `dist/occt-js.d.ts` additively.

### Verification strategy
- **D-13:** Split verification by boundary. Compound-hole helper work gets focused root contract coverage plus package mocked and live integration coverage. Candidate-analysis descriptors get package contract and live integration coverage only.
- **D-14:** Prefer existing shipped fixtures and retained-model helpers first. If no current fixture exposes stable counterbore or countersink candidates, adding one minimal dedicated CAD fixture is acceptable, but only for the supported Phase 36 families.
- **D-15:** No demo/browser work belongs in Phase 36. Suggestion UI, pinned sessions, and export flows remain Phase 37 and Phase 38 concerns.

### the agent's Discretion
- Choose the final shared carrier descriptor name as long as it stays selected-ref-based and narrower than a generic feature-discovery API.
- Choose the exact candidate-descriptor schema as long as it is typed, deterministic, occurrence-safe, and package-first.
- Decide whether the package analysis API returns an empty supported set or a typed unsupported failure for valid-but-unsupported selections, as long as the behavior stays explicit and stable.

</decisions>

<specifics>
## Specific Ideas

- `DescribeExactHole(...)` already resolves hole candidate faces, boundary openness, depth, and a stable frame in the carrier. Compound-hole support should build from that topology walk instead of inventing a second broad discovery path.
- The package layer already proves the right composition model: one-ref semantic wrappers for root-backed helpers, and package-only compositions for midpoint, equal-distance, and symmetry. Phase 36 should keep that split and unify it with typed candidate descriptors.
- A package-first candidate-analysis API should help Phase 37 replace ad hoc command enablement logic with deterministic exact-ref-derived suggestions. It should be selection-driven rather than actor-global so the demo can remain a downstream consumer instead of the place where support rules live.
- Local sibling-tooling patterns also point to compound-hole semantics as a practical next step: `E:\Coding\SceneGraph.net\src\SceneGraph.Avalonia.Inspect\Measurement\Data\HoleMeasurement.cs` already reserves `counterboreDiameter`, `counterboreDepth`, `countersinkDiameter`, and `countersinkAngle`, which matches the likely downstream callout payloads for Phase 36.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone and repo contract
- `.planning/PROJECT.md` — Active milestone goal and the locked package-first versus runtime-first boundary.
- `.planning/REQUIREMENTS.md` — `FEAT-07` and `SDK-03` define the required Phase 36 outcomes.
- `.planning/ROADMAP.md` — Phase 36 goal, success criteria, and the locked two-plan split.
- `.planning/STATE.md` — Current milestone position and carry-forward constraints from `v1.10`.
- `AGENTS.md` — Repository-level rules for GSD ownership, release boundaries, and when superpowers is only a helper.

### Prior semantic-helper context
- `.planning/milestones/v1.6-phases/21-hole-helper-foundations/21-CONTEXT.md` — Locked pattern for package-first semantic helpers with narrow root additions only when topology insight is unavoidable.
- `.planning/milestones/v1.6-phases/22-chamfer-constraint-helpers/22-CONTEXT.md` — Confirms chamfer plus midpoint, equal-distance, and symmetry helpers already shipped and should not be replanned.
- `.planning/milestones/v1.6-phases/22-02-SUMMARY.md` — Carry-forward evidence that pairwise helper compositions already belong at the package layer.
- `.planning/milestones/v1.10-phases/35-demo-docs-verification/35-RESEARCH.md` — Confirms the current milestone starts from an already shipped exact measurement demo loop rather than a missing kernel.

### Existing code and typed contracts
- `packages/occt-core/src/occt-core.js` — Existing helper wrappers, occurrence transforms, and package-only helper compositions to extend.
- `packages/occt-core/src/index.d.ts` — Typed package surface that must grow additively for new helpers and candidate descriptors.
- `src/exact-query.cpp` — Current hole and chamfer semantic logic plus failure-style patterns that constrain any new root descriptor.
- `src/exact-query.hpp` — Additive carrier declaration patterns.
- `src/js-interface.cpp` — JS-facing bindings that must stay additive if the carrier grows.
- `src/importer.hpp` — Root DTO structures and explicit failure conventions already used by the exact helper surface.
- `dist/occt-js.d.ts` — Published carrier typings for the root Wasm surface.

### Current docs and helper boundary
- `docs/sdk/measurement.md` — Current package-first measurement guide listing the already shipped helper families and their support boundaries.
- `packages/occt-core/README.md` — Package-first exact helper entry point that shows the currently supported helper set.

### Verification patterns
- `test/exact_hole_contract.test.mjs` — Root contract pattern for selected-ref semantic helpers.
- `packages/occt-core/test/core.test.mjs` — Package wrapper and mocked helper contract patterns.
- `packages/occt-core/test/live-root-integration.test.mjs` — Package-first retained-model integration pattern against the built carrier.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/exact-query.cpp`: `DescribeExactHole(...)` already resolves candidate faces, validates cylindrical support, collects boundary info, and emits stable frame and anchor data. Compound-hole support should reuse this foundation rather than opening raw topology APIs.
- `packages/occt-core/src/occt-core.js`: `describeExactHole(ref)` and `describeExactChamfer(ref)` already show the one-ref wrapper rhythm, while midpoint, equal-distance, and symmetry helpers already demonstrate package-only composition over existing exact wrappers.
- `packages/occt-core/src/index.d.ts`: the package already exports typed helper results and method signatures, but there is no current typed candidate-analysis surface.
- `dist/occt-js.d.ts`: the root carrier currently exposes hole and chamfer descriptors only, confirming that any new runtime support in Phase 36 must stay narrow and helper-specific.

### Established Patterns
- Package wrappers validate exact refs, call a retained-model root method when needed, transform local-space geometry into occurrence space, and append the validated ref or refs on success.
- Pairwise helper compositions stay entirely in `@tx-code/occt-core` when the shipped measurement or relation primitives already expose enough geometry support.
- Root exact APIs use explicit `{ ok, code, message }` failures instead of null-like behavior or demo-owned policy.

### Integration Points
- Plan `36-01` will likely touch `src/importer.hpp`, `src/exact-query.*`, `src/js-interface.cpp`, `dist/occt-js.d.ts`, `packages/occt-core/src/occt-core.js`, `packages/occt-core/src/index.d.ts`, and focused root/package tests.
- Plan `36-02` should stay package-first and concentrate on `packages/occt-core/src/occt-core.js`, `packages/occt-core/src/index.d.ts`, and package tests plus live integration.
- Phase 37 should consume the Phase 36 candidate-analysis surface rather than re-deriving suggestion logic inside demo-only code.

</code_context>

<deferred>
## Deferred Ideas

- Slot-width, groove, or broader profile semantics
- Richer symmetry variants beyond the already shipped midplane helper
- Whole-model semantic discovery, feature ranking, or AI-assisted heuristics
- Demo inspector UX, persisted suggestion state, and export flows

</deferred>

---

*Phase: 36-semantic-helper-foundations*
*Context gathered: 2026-04-21*
