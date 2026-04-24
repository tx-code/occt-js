# Phase 36: Semantic Helper Foundations - Research

**Researched:** 2026-04-21
**Domain:** Package-first semantic-helper expansion and deterministic candidate analysis over the shipped exact measurement kernel
**Confidence:** HIGH

> Historical note (2026-04-21): the candidate-analysis branch discussed below was later dropped before acceptance when `v1.11` was narrowed back to helper-only scope. The retained Phase 36 scope is Plan `36-01` compound-hole helpers only.

<user_constraints>
## User Constraints

Use the active milestone and the already shipped exact-measurement foundation:

- Stay in GSD for milestone and phase tracking; use supporting rigor inside that boundary rather than replacing it with a second planning system. [VERIFIED: `AGENTS.md`]
- Keep the root carrier narrow and additive. New runtime support is allowed only when package composition cannot derive the required topology safely. [VERIFIED: `AGENTS.md`] [VERIFIED: `.planning/REQUIREMENTS.md`]
- Keep candidate discovery deterministic, exact-ref-driven, and actor-safe rather than mesh-heuristic- or viewer-id-driven. [VERIFIED: `.planning/STATE.md`] [VERIFIED: `.planning/REQUIREMENTS.md`]
- Build on the shipped exact measurement loop from `v1.10`; do not reopen demo ownership or UI policy in this phase. [VERIFIED: `.planning/ROADMAP.md`] [VERIFIED: `.planning/milestones/v1.10-phases/35-demo-docs-verification/35-RESEARCH.md`]
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FEAT-07 | Downstream apps can use package-first semantic measurement helpers for supported families such as counterbore, countersink, slot width, or richer symmetry variants over the shipped exact surface. | The repo already ships hole, chamfer, midpoint, equal-distance, and symmetry helpers, so the remaining Phase 36 value lies in a genuinely new helper family. Compound-hole variants have the clearest topology and downstream measurement precedent. |
| SDK-03 | `@tx-code/occt-core` exposes typed package-first semantic-helper and candidate-analysis APIs that preserve occurrence-safe refs, explicit unsupported results, and additive compatibility with existing exact wrappers. | `packages/occt-core/src/index.d.ts` currently types the shipped helpers but exposes no candidate-analysis API, which makes Phase 36 the right place to add a typed selection-analysis layer over exact refs. |
</phase_requirements>

## Project Constraints

- `docs/sdk/measurement.md` and `packages/occt-core/README.md` already list the shipped helper surface, so Phase 36 should not re-plan midpoint, equal-distance, or symmetry as if they were missing. [VERIFIED: `docs/sdk/measurement.md`] [VERIFIED: `packages/occt-core/README.md`]
- `DescribeExactHole(...)` and `DescribeExactChamfer(...)` are the only current root semantic helper queries, confirming that the carrier is intentionally narrow today. [VERIFIED: `src/exact-query.hpp`] [VERIFIED: `dist/occt-js.d.ts`]
- `@tx-code/occt-core` already owns package-only helper composition for midpoint, equal-distance, and symmetry, which should remain package-owned in Phase 36 as well. [VERIFIED: `packages/occt-core/src/occt-core.js`] [VERIFIED: `.planning/milestones/v1.6-phases/22-chamfer-constraint-helpers/22-CONTEXT.md`]

## Summary

Phase 36 should not spend effort re-adding helper semantics that already exist. The shipped package surface already includes:

- single-ref semantic helpers: `describeExactHole(ref)` and `describeExactChamfer(ref)` [VERIFIED: `packages/occt-core/src/occt-core.js`] [VERIFIED: `docs/sdk/measurement.md`]
- package-only pairwise helpers: `suggestExactMidpointPlacement(...)`, `describeExactEqualDistance(...)`, and `suggestExactSymmetryPlacement(...)` [VERIFIED: `packages/occt-core/src/occt-core.js`] [VERIFIED: `packages/occt-core/src/index.d.ts`]

That means the next meaningful semantic expansion is a new supported family. Compound-hole variants are the strongest Phase 36 target for three reasons:

1. The existing root hole descriptor already walks stable cylindrical-hole topology, boundary openness, depth, and frame information, so the carrier has a natural starting point for counterbore or countersink extensions. [VERIFIED: `src/exact-query.cpp`]
2. Downstream measurement products commonly need exactly these fields. A local sibling reference, `E:\Coding\SceneGraph.net\src\SceneGraph.Avalonia.Inspect\Measurement\Data\HoleMeasurement.cs`, already models `counterboreDiameter`, `counterboreDepth`, `countersinkDiameter`, and `countersinkAngle`, which aligns with likely callout payloads. [VERIFIED: `E:\Coding\SceneGraph.net\src\SceneGraph.Avalonia.Inspect\Measurement\Data\HoleMeasurement.cs`]
3. Compound-hole semantics deepen measurement value without expanding into broad slot recognition, whole-model feature discovery, or solver-style symmetry work. [ASSUMED]

The second missing piece is typed candidate analysis. Today, `@tx-code/occt-core` exposes direct measurement and helper calls, but it does not expose a typed package API that says, for a given set of exact refs, which supported actions are available. That gap matters for Phase 37 because otherwise the demo has to keep re-deriving suggestion logic locally. The right Phase 36 contract is a deterministic selection-analysis surface over caller-supplied exact refs that composes existing measurements and helper calls rather than inventing new heuristics. [VERIFIED: `packages/occt-core/src/index.d.ts`] [ASSUMED]

## Current Code Facts

- `packages/occt-core/src/occt-core.js` already implements:
  - `describeExactHole(ref)`
  - `describeExactChamfer(ref)`
  - `suggestExactMidpointPlacement(refA, refB)`
  - `describeExactEqualDistance(refA, refB, refC, refD, options?)`
  - `suggestExactSymmetryPlacement(refA, refB)` [VERIFIED: `packages/occt-core/src/occt-core.js`]
- `packages/occt-core/src/index.d.ts` already types those helpers, but it has no candidate-analysis method or candidate descriptor types. [VERIFIED: `packages/occt-core/src/index.d.ts`]
- `src/exact-query.cpp::DescribeExactHole(...)` already resolves selected hole faces, checks cylindrical support, classifies inside or outside behavior, derives open boundaries, and computes depth plus frame data. [VERIFIED: `src/exact-query.cpp`]
- `src/exact-query.hpp` and `dist/occt-js.d.ts` currently expose root semantic helper queries only for hole and chamfer. [VERIFIED: `src/exact-query.hpp`] [VERIFIED: `dist/occt-js.d.ts`]
- The milestone roadmap already reserves Phase 36 for semantic-helper and candidate-analysis foundations, so there is no need to reopen milestone direction. [VERIFIED: `.planning/ROADMAP.md`]

## Recommended 2-Plan Split

### 36-01 — Add package-first compound-hole helpers for supported `counterbore` and `countersink` cases

- Add failing root and package tests first.
- Reuse the hole-helper topology pattern and add one narrow selected-ref compound-hole carrier descriptor only if package composition alone cannot express the necessary topology safely.
- Expose additive package-first helpers and types in `@tx-code/occt-core`.

### 36-02 — Add typed candidate-analysis descriptors over exact selections

- Add failing package tests for deterministic candidate descriptors over single-ref, pairwise, and multi-ref selections.
- Expose one typed package analysis API that composes current exact measurements plus shipped and new helper surfaces.
- Keep the analysis outputs package-first, occurrence-safe, and free of demo-only ids, labels, or ranking policy.

## Common Pitfalls

### Pitfall 1: replanning already shipped helpers

If Phase 36 tries to "add" midpoint, equal-distance, or symmetry again, it will spend milestone capacity on code and docs the repo already has.

**Avoidance:** treat those helpers as existing building blocks and focus Phase 36 on new compound-hole semantics plus typed selection analysis.

### Pitfall 2: letting candidate analysis become whole-model feature recognition

That would drag the phase into open-ended discovery, ranking, and unsupported guesses that violate the milestone boundary.

**Avoidance:** keep the API driven by caller-supplied exact refs and deterministic helper composition only.

### Pitfall 3: widening the carrier with generic topology traversal

A broad topology API would violate the repo's additive-runtime rule and create a larger support surface than the milestone needs.

**Avoidance:** if new root work is necessary, keep it to one selected-ref compound-hole descriptor.

### Pitfall 4: leaking demo policy into the package surface

If candidate descriptors start carrying viewer ids, labels, ranking, or pinned-session state, Phase 36 will blur package versus demo ownership before the demo phase even starts.

**Avoidance:** keep descriptors typed, exact-ref-based, and action-oriented only.

---

*Phase: 36-semantic-helper-foundations*
*Research completed: 2026-04-21*
