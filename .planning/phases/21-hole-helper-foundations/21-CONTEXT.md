# Phase 21: Hole Helper Foundations - Context

**Gathered:** 2026-04-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 21 adds package-first hole helper semantics over caller-selected occurrence-scoped exact refs. The scope is limited to supported analytic cylindrical hole cases and only the minimal additive root/runtime support needed to classify those cases from a selected ref. This phase must not widen into whole-model feature recognition, viewer/session workflows, or richer hole families such as counterbore or countersink semantics.

</domain>

<decisions>
## Implementation Decisions

### Supported hole cases
- **D-01:** Initial support is limited to caller-selected analytic cylindrical hole cases that can be anchored from a single occurrence-scoped exact ref on the feature. The main supported entry refs are circular edge refs and cylindrical face refs.
- **D-02:** Counterbore, countersink, threaded holes, slots, pockets, and ambiguous partial geometry remain unsupported in Phase 21. If a selected ref does not map cleanly to a supported cylindrical hole semantic, the helper should return an explicit typed unsupported/failure result instead of app-side heuristics.

### Package-first helper shape
- **D-03:** `@tx-code/occt-core` is the primary downstream entry point. Hole semantics should be exposed as a single-ref helper API over an occurrence-scoped exact ref, following the existing single-ref placement helper shape more closely than the pairwise measurement APIs.
- **D-04:** Hole helper results must carry the validated occurrence-scoped ref plus occurrence-transformed semantic geometry, so downstream callers do not need to manually combine exact-ref resolution, local-space DTO transforms, or viewer session state.
- **D-05:** The helper contract should describe semantic hole facts rather than a raw topology dump: supported variant, radius/diameter, axis or working frame, supporting anchors, and open-ended or depth-style metadata only when the runtime can derive it robustly.

### Runtime expansion policy
- **D-06:** Prefer composition from the shipped root exact primitives where that composition is stable, but allow one narrow additive root query around a caller-selected ref if stable hole classification requires topology insight that the current carrier does not expose.
- **D-07:** Any new root/runtime surface for hole semantics should accept the same retained-model carrier inputs already used by `MeasureExact*`, `SuggestExact*Placement`, and `ClassifyExactRelation`: `exactModelId`, `exactShapeHandle`, `kind`, and `elementId`. Do not introduce generic topology traversal APIs, batch discovery APIs, or viewer-oriented selection helpers in this phase.

### DTO and failure semantics
- **D-08:** Follow the existing exact DTO style: `ok: true` success objects with explicit semantic fields, and `ok: false` typed failures for invalid handles, invalid ids, unsupported geometry, or unsupported hole topology. Do not overload the relation-style `none` success for hole semantics.
- **D-09:** Reuse the current failure vocabulary where it remains meaningful (`invalid-handle`, `released-handle`, `invalid-id`, `unsupported-geometry`, `internal-error`, and similar). Only add helper-specific failure codes if a durable semantic distinction cannot be expressed with the existing failure language.

### Verification strategy
- **D-10:** Add focused contract coverage at the package and root layers touched by the phase. If a new root hole query is introduced, it needs root contract tests; the package wrapper also needs dedicated tests and retained-model integration coverage that verifies occurrence transforms and helper DTO parity.
- **D-11:** Prefer a small dedicated fixture with stable cylindrical hole geometry if the current STEP/BREP fixtures do not expose deterministic supported hole cases. Do not build Phase 21 around brittle assembly archaeology or viewer-side picks.

### the agent's Discretion
- Choose the final helper naming as long as it communicates package-first hole semantics rather than a raw kernel primitive.
- Choose the most reusable supporting-anchor shape for later helper families, as long as occurrence transforms and typed failures stay consistent.
- Decide whether blind/through depth metadata is part of the initial supported DTO or deferred when it cannot be derived without widening runtime scope.

</decisions>

<specifics>
## Specific Ideas

- `docs/sdk/measurement.md` and the Phase 16 design spec explicitly treated hole or chamfer semantics as downstream. Phase 21 crosses that boundary only enough to ship reusable package-first helper semantics, not to reopen viewer UX or broad feature indexing.
- Existing root primitives already expose circle/cylinder geometry families, radius, center, and placement anchors. The new hole helper should feel like a semantic wrapper layered on that vocabulary, not a second unrelated API family.
- If topology insight beyond the existing primitives is unavoidable, the cleanest additive carrier surface is a selected-ref hole descriptor rather than a generic topology or discovery API.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone and repo contract
- `.planning/PROJECT.md` — Active milestone goal and the decision to carry forward only package-first helper semantics from the earlier exact-measurement seed.
- `.planning/REQUIREMENTS.md` — `FEAT-03` and `ADAPT-09` define the required Phase 21 outcome.
- `.planning/ROADMAP.md` — Phase 21 goal, success criteria, and the explicit split between package DTO/API work and only minimal carrier additions.
- `AGENTS.md` — Repository-level runtime/package boundaries, release-gate constraints, and the rule that viewer/session workflows stay downstream.

### Prior exact semantics boundary
- `docs/sdk/measurement.md` — Current package-first measurement/placement/relation SDK and the documented boundary that previously left hole/chamfer semantics downstream.
- `docs/superpowers/specs/2026-04-16-exact-measurement-placement-relation-sdk-design.md` — Phase 15-17 design contract that intentionally excluded feature semantics and locked the additive runtime-first approach.
- `packages/occt-core/README.md` — Current package-first exact semantics entry point that Phase 21 should extend rather than bypass.

### Existing package and carrier patterns
- `packages/occt-core/src/occt-core.js` — Existing exact helper wrapper patterns including single-ref validation, occurrence-transform application, and package-first method shape.
- `packages/occt-core/src/exact-ref-resolver.js` — Occurrence-safe exact-ref resolution contract that callers already use before package helpers.
- `src/exact-query.cpp` — Existing exact geometry, radius, center, placement, and relation logic plus failure-style patterns that constrain any minimal carrier addition.
- `src/js-interface.cpp` — JS-facing binding layer that must stay additive if new carrier DTOs are introduced.
- `dist/occt-js.d.ts` — Public failure vocabulary and exact DTO conventions already shipped to downstream consumers.

### Verification patterns
- `test/exact_placement_contract.test.mjs` — Existing root exact placement contract style for retained-model fixtures, typed failures, and transformed anchors.
- `packages/occt-core/test/core.test.mjs` — Package wrapper unit/contract patterns for exact semantics over occurrence-scoped refs.
- `packages/occt-core/test/live-root-integration.test.mjs` — Package-first retained-model integration coverage pattern for exact semantics against the live carrier.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `packages/occt-core/src/occt-core.js`: `validateExactRef`, `transformPlacementFrame`, `transformPlacementAnchors`, and the single-ref placement wrappers already show how a hole helper should validate refs, call the carrier, and return occurrence-space DTOs.
- `packages/occt-core/src/exact-ref-resolver.js`: Existing occurrence-safe ref resolution keeps helper APIs package-first and viewer-independent.
- `src/exact-query.cpp`: Existing circle/cylinder classification, radius/center measurement, and placement helpers provide the closest carrier building blocks for supported hole semantics.
- `test/exact_placement_contract.test.mjs`, `packages/occt-core/test/core.test.mjs`, and `packages/occt-core/test/live-root-integration.test.mjs`: Existing contract and integration tests establish the test shape Phase 21 should follow.

### Established Patterns
- Package wrappers validate occurrence-scoped refs, call the root carrier with retained-model ids and local topology ids, then transform local-space result geometry into occurrence space before returning it.
- Root exact APIs use additive DTOs with explicit `{ ok, code, message }` failure handling rather than silent nulls or viewer-owned policy.
- Documentation and release governance keep the root Wasm carrier as the lower-level reference surface while `@tx-code/occt-core` remains the first-class downstream API.

### Integration Points
- The package helper surface will extend `packages/occt-core/src/occt-core.js` and its associated tests and docs.
- Any new carrier support will flow through `src/exact-query.cpp`, `src/js-interface.cpp`, and `dist/occt-js.d.ts`.
- Phase verification will touch the root exact contract suites in `test/` plus the package-level `packages/occt-core/test/` suites.

</code_context>

<deferred>
## Deferred Ideas

- Counterbore, countersink, threaded-hole, and richer hole-family taxonomy — later helper-expansion work after the base contract stabilizes
- Whole-model feature recognition, batch semantic suggestion, or candidate discovery APIs — future deeper-semantics work outside Phase 21
- Viewer picking, overlays, labels, or measurement session state — downstream app concerns outside the package/runtime helper boundary

</deferred>

---

*Phase: 21-hole-helper-foundations*
*Context gathered: 2026-04-18*
