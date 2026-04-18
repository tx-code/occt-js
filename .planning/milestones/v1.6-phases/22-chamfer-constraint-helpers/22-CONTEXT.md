# Phase 22: Chamfer & Constraint Helpers - Context

**Gathered:** 2026-04-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 22 extends `v1.6` from the shipped hole helper into selected chamfer semantics plus reusable exact helper relations built on top of the existing placement and relation foundation. The phase should ship one package-first chamfer descriptor for supported selected refs, then add package-owned midpoint, equal-distance, symmetry, and similar helper semantics without widening viewer/session policy or turning the root carrier into a generic constraint engine.

</domain>

<decisions>
## Implementation Decisions

### Supported chamfer cases
- **D-01:** Initial chamfer support is limited to caller-selected planar chamfer face refs that bridge exactly two planar support faces. Phase 22 must not widen into fillets, drafts, cylindrical-support chamfers, broad feature discovery, or mixed-topology heuristics.
- **D-02:** Face refs are the only required input shape for initial chamfer support. Boundary-edge entry points are deferred because they are more ambiguous and would broaden the root/package contract without a clear Phase 22 need.
- **D-03:** Chamfer success results should describe semantic facts rather than raw topology: the supported profile or variant, the two support distances, the included support angle, a stable working frame, supporting anchors, and enough orientation data for downstream overlays to stay package-first.

### Chamfer API boundary
- **D-04:** `@tx-code/occt-core` remains the primary downstream entry point. Chamfer semantics should ship as a single-ref helper such as `describeExactChamfer(ref)` that mirrors the one-ref `describeExactHole(ref)` pattern more closely than the pairwise measurement wrappers.
- **D-05:** Phase 22 may add one narrow root carrier query for chamfer semantics because the occurrence-scoped exact ref object does not include adjacency or support-face topology. Any root addition must keep the current retained-model signature shape (`exactModelId`, `exactShapeHandle`, `kind`, `elementId`) and must not open generic topology traversal APIs.
- **D-06:** Constraint helpers such as midpoint, equal-distance, and symmetry must not introduce new root carrier APIs in this phase. They should be composed in `@tx-code/occt-core` on top of shipped measurement, placement, and relation surfaces.

### Constraint helper family
- **D-07:** Midpoint and symmetry should be treated as package-first placement-style helpers over supported pairwise refs, reusing the current placement frame and anchor vocabulary instead of inventing a new DTO family.
- **D-08:** Equal-distance should be treated as an explicit comparison helper over two measured pairs, returning stable numeric comparison data and any minimal supporting geometry needed for downstream use, not a viewer-owned presentation command.
- **D-09:** The initial symmetry scope stays narrow: derive midpoint or midplane style symmetry from supported parallel pair placements and relation checks, rather than trying to recognize generic mirror or pattern symmetry across arbitrary geometry families.

### DTO and failure semantics
- **D-10:** Follow the Phase 21 helper style: semantic helpers return `ok: true` success objects for supported cases and explicit typed failures for invalid handles, invalid ids, unsupported geometry, unsupported topology, or degenerate calculations. Do not overload relation-style `kind: "none"` into single-helper semantics.
- **D-11:** Package-first helper successes must carry the validated occurrence-scoped refs or ref pairs plus occurrence-space geometry. Downstream callers should not need to manually reapply transforms or maintain hidden package-side session state.
- **D-12:** Reuse the shipped failure vocabulary where possible. Only add helper-specific codes when the failure meaning cannot be expressed with the current exact-query language.

### Verification strategy
- **D-13:** Prefer shipped fixtures first. A quick Phase 22 scan already found stable planar chamfer-face candidates in `test/ANC101.stp`, so the default plan should try to prove the contract against shipped geometry before adding a new dedicated chamfer fixture.
- **D-14:** Split verification by boundary: chamfer needs dedicated root contract coverage plus package wrapper/live-integration parity, while the package-only constraint helpers need focused `occt-core` contract and live integration tests without widening the authoritative root release gate beyond touched helper surfaces.

### the agent's Discretion
- Choose the final helper names as long as hole/chamfer stay in the `describe...` semantic family and midpoint/symmetry stay aligned with the existing placement-helper vocabulary.
- Choose the exact chamfer scalar naming and tolerance rules as long as the result stays additive, semantic, and occurrence-safe.
- Decide which symmetry-style helper is narrow enough for Phase 22 as long as it is clearly derived from the shipped placement/relation foundation and not a generic constraint solver.

</decisions>

<specifics>
## Specific Ideas

- Phase 21 proved the right product shape for semantic helpers: a package-first `describe...` wrapper over one selected exact ref, with only one narrow carrier descriptor when topology insight is unavoidable. Chamfer should reuse that pattern rather than reopening the runtime boundary.
- Unlike hole semantics, pairwise midpoint/equal-distance/symmetry helpers can and should live entirely in `@tx-code/occt-core`, because the shipped `MeasureExactDistance`, `SuggestExactDistancePlacement`, and `ClassifyExactRelation` APIs already expose the geometry-support DTOs needed for those helpers.
- `test/ANC101.stp` appears to expose planar-face candidates that behave like deterministic chamfers. Unless contract coverage proves those candidates brittle, Phase 22 should prefer shipped fixture reuse over adding a new CAD fixture immediately.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone and repo contract
- `.planning/PROJECT.md` — Active milestone goal and the locked runtime-first/package-first product boundary for exact helper work.
- `.planning/REQUIREMENTS.md` — `FEAT-04` and `FEAT-05` define the required Phase 22 outcome.
- `.planning/ROADMAP.md` — Phase 22 goal, success criteria, and the two-plan split between chamfer semantics and reusable helper relations.
- `.planning/STATE.md` — Current milestone position and carry-forward constraints from Phase 21.
- `AGENTS.md` — Repository-level rules for root release boundaries, secondary-surface scope, and package/runtime responsibilities.

### Prior helper-semantic context
- `.planning/phases/21-hole-helper-foundations/21-CONTEXT.md` — Locked Phase 21 pattern for package-first semantic helpers and narrow root additions.
- `.planning/phases/21-hole-helper-foundations/21-DISCUSSION-LOG.md` — Auto-selected decision pattern that Phase 22 should remain consistent with.
- `.planning/phases/21-hole-helper-foundations/21-VERIFICATION.md` — Verification split and completion evidence for the first helper-semantic phase.
- `.planning/phases/21-hole-helper-foundations/21-02-SUMMARY.md` — Notes the carry-forward pattern for extending the helper family in Phase 22.

### Existing package and carrier patterns
- `packages/occt-core/src/occt-core.js` — Existing exact wrapper patterns for single-ref helpers, pairwise helpers, occurrence transforms, and face-normal queries.
- `packages/occt-core/src/exact-ref-resolver.js` — Occurrence-safe exact-ref resolution that Phase 22 helpers must preserve.
- `src/exact-query.cpp` — Current exact geometry, placement, relation, and hole-helper logic plus failure-style patterns that constrain any new chamfer descriptor.
- `src/exact-query.hpp` — Current root exact-query entry points and the additive signature pattern Phase 22 must follow.
- `src/js-interface.cpp` — JS-facing binding layer that must stay additive if a new chamfer descriptor is introduced.
- `src/importer.hpp` — Public C++ DTO structures and failure/result conventions already used by the exact helper surface.
- `dist/occt-js.d.ts` — Published exact helper typings and failure vocabulary that Phase 22 must extend additively if the carrier grows.

### Existing docs and helper boundary
- `docs/sdk/measurement.md` — Current package-first measurement guide that still marks hole/chamfer semantics as downstream and therefore frames the boundary Phase 22 is intentionally crossing.
- `docs/superpowers/specs/2026-04-16-exact-measurement-placement-relation-sdk-design.md` — Phase 15-17 design contract that intentionally excluded feature semantics and defined the placement/relation foundation Phase 22 must build on.
- `packages/occt-core/README.md` — Current package-first exact entry point that Phase 22 should extend rather than bypass.

### Verification patterns and fixture candidates
- `test/exact_hole_contract.test.mjs` — Root helper contract pattern for selected-ref semantic helpers and typed unsupported failures.
- `packages/occt-core/test/core.test.mjs` — Package wrapper unit/contract patterns for exact semantics over occurrence-scoped refs.
- `packages/occt-core/test/live-root-integration.test.mjs` — Package-first retained-model integration coverage pattern against the live carrier.
- `test/exact_placement_contract.test.mjs` — Current placement-support contract style and geometry helpers that midpoint/symmetry composition should reuse conceptually.
- `test/ANC101.stp` — Shipped fixture currently showing plausible planar chamfer candidates for Phase 22 contract coverage.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `packages/occt-core/src/occt-core.js`: `validateExactRef`, `validatePairwiseExactRefs`, `transformPlacementFrame`, `transformPlacementAnchors`, `transformPoint`, and `transformDirection` already provide the wrapper machinery that new package helpers should reuse.
- `src/exact-query.cpp`: `DescribeExactHole(...)`, `BuildFrameFromNormalAndX(...)`, `BuildFrameFromXAxis(...)`, and the pairwise placement helpers show the current carrier-side pattern for semantic descriptors, supporting anchors, and working frames.
- `EvaluateExactFaceNormal(...)` and `GetExactGeometryType(...)`: existing root queries already provide enough primitive support for planner-era chamfer probing and package-side helper composition.
- `packages/occt-core/test/live-root-integration.test.mjs`: existing retained-model helpers such as `findSupportedHoleOccurrenceRef` and repeated-geometry tests provide the right integration-test shape for new helper coverage.

### Established Patterns
- Package wrappers validate refs, call the carrier with retained-model ids and local topology ids, then normalize local-space geometry into occurrence space before returning it.
- Root exact APIs use additive DTOs with explicit `{ ok, code, message }` failure handling instead of silent nulls or viewer-owned policy.
- The repo already distinguishes between semantic descriptors that need carrier topology (`describeExactHole`) and package-first wrappers that can be built by composition over shipped primitives.

### Integration Points
- Chamfer semantics will extend `packages/occt-core/src/occt-core.js`, its tests, and likely the root `src/exact-query.*`, `src/js-interface.cpp`, and `dist/occt-js.d.ts` surfaces if a new descriptor lands.
- Midpoint, equal-distance, and symmetry-style helpers should connect primarily at the package layer and reuse the existing pairwise distance, placement, and relation wrappers.
- Phase verification will touch the root exact contract suites in `test/` for chamfer plus the package-level `packages/occt-core/test/` suites for both chamfer parity and package-only helper behavior.

</code_context>

<deferred>
## Deferred Ideas

- Edge-ref chamfer semantics, cylindrical-support chamfers, draft detection, fillets, or broad feature-recognition families — later helper-expansion work after the base planar chamfer contract stabilizes
- Generic symmetry groups, pattern inference, or solver-style geometric constraints — future deeper-semantics work outside Phase 22
- Viewer picking flows, overlays, labels, measurement sessions, or packaged widgets — downstream app concerns outside the package/runtime helper boundary

</deferred>

---

*Phase: 22-chamfer-constraint-helpers*
*Context gathered: 2026-04-18*
