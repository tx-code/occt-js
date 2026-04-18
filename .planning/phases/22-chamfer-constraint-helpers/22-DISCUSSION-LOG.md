# Phase 22: Chamfer & Constraint Helpers - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-18
**Phase:** 22-chamfer-constraint-helpers
**Mode:** auto
**Areas discussed:** Supported chamfer cases, helper API boundary, constraint helper composition, DTO and failure semantics, verification strategy

---

## Supported chamfer cases

| Option | Description | Selected |
|--------|-------------|----------|
| Selected-ref planar chamfer faces | Start with caller-selected planar chamfer face refs that bridge two planar support faces and expose stable chamfer semantics without whole-model feature scanning | ✓ |
| Broad feature recognition | Try to recognize arbitrary chamfer chains, fillets, draft faces, cylindrical supports, or mixed topologies in Phase 22 | |
| Let the agent decide | Planner may widen or narrow the support boundary later | |

**User's choice:** Auto-selected recommended option: selected-ref planar chamfer faces
**Notes:** Chosen because Phase 21 already established the package-first single-feature pattern, while current exact refs do not carry enough topology for stable package-only chamfer inference. A selected planar chamfer face is the narrowest stable input that still gives downstream apps reusable semantics.

---

## Helper API boundary

| Option | Description | Selected |
|--------|-------------|----------|
| Single-ref package-first chamfer helper with one narrow carrier query | Expose `describeExactChamfer(ref)` from `@tx-code/occt-core`, backed by one additive ref-based root query when topology insight is required | ✓ |
| Multi-ref orchestration API | Make callers assemble support faces, boundary edges, or topology relationships before chamfer semantics can be returned | |
| Package-only heuristics | Forbid any new root support and force the package layer to infer chamfers from current primitives alone | |

**User's choice:** Auto-selected recommended option: single-ref package-first chamfer helper with one narrow carrier query
**Notes:** Chosen because the exact-ref object alone does not include adjacency data, and the repo already accepted the same narrow-expansion pattern for `DescribeExactHole(...)` in Phase 21. One selected-ref chamfer descriptor is additive; generic topology APIs are not.

---

## Constraint helper composition

| Option | Description | Selected |
|--------|-------------|----------|
| Package-only helpers over shipped primitives | Build midpoint, equal-distance, symmetry-style helpers by composing `MeasureExactDistance`, `SuggestExactDistancePlacement`, and `ClassifyExactRelation` in `@tx-code/occt-core` | ✓ |
| New root helper family | Add new Wasm carrier APIs for midpoint, symmetry, or equal-distance directly in Phase 22 | |
| Leave helpers app-side | Keep these semantics outside the package layer and let downstream apps reimplement the math | |

**User's choice:** Auto-selected recommended option: package-only helpers over shipped primitives
**Notes:** Chosen because `FEAT-05` explicitly says these helpers should sit on top of the shipped placement/relation foundation. The runtime already returns the geometry-support DTOs; Phase 22 should reuse them rather than widen the carrier again.

---

## Constraint helper surface

| Option | Description | Selected |
|--------|-------------|----------|
| Pairwise midpoint/symmetry placements plus equal-distance comparison | Treat midpoint and symmetry as placement-style helpers over supported pairwise refs, and treat equal-distance as an explicit comparison helper over two measured pairs | ✓ |
| Generic constraint solver | Try to model broad CAD constraint families or full symbolic symmetry in Phase 22 | |
| Let the agent decide | Planner may invent the helper surface later | |

**User's choice:** Auto-selected recommended option: pairwise midpoint/symmetry placements plus equal-distance comparison
**Notes:** Chosen because it stays close to the current `SuggestExact*Placement` and relation vocabulary. It gives downstream JS reusable geometry without turning `occt-core` into a constraint engine.

---

## DTO and failure semantics

| Option | Description | Selected |
|--------|-------------|----------|
| Explicit semantic DTOs + typed failures | Supported cases return semantic success objects; invalid or unsupported selections stay explicit with `{ ok, code, message }` failures | ✓ |
| `none` / soft-null semantics | Unsupported chamfer or helper cases return success-ish variants instead of explicit failures | |
| Let the agent decide | Planner may define failure style later | |

**User's choice:** Auto-selected recommended option: explicit semantic DTOs + typed failures
**Notes:** Chosen because the current exact runtime and `occt-core` already use explicit failure DTOs for unsupported geometry, while relation-style `kind: "none"` is specific to pairwise relation classification.

---

## Verification strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Contract-first, reuse shipped fixture if deterministic | Add focused root/package contract tests, preferring shipped fixtures such as `ANC101.stp` when they expose stable chamfer candidates | ✓ |
| Add new fixture immediately | Create a dedicated chamfer fixture before confirming whether existing shipped geometry is stable enough | |
| Reuse broad fixtures ad hoc | Depend on incidental geometry from large fixtures without narrowing the contract surface | |

**User's choice:** Auto-selected recommended option: contract-first, reuse shipped fixture if deterministic
**Notes:** Chosen because a quick scan already found stable planar chamfer-face candidates in `test/ANC101.stp`, which may let Phase 22 keep using shipped assets unless contract coverage proves brittle.

---

## the agent's Discretion

- Choose the final helper names as long as they read clearly as package-first semantics over exact refs rather than generic CAD kernels.
- Decide the exact chamfer scalar vocabulary (`distanceA` / `distanceB`, `angle`, `variant`, and similar) as long as the result stays semantic and additive.
- Decide the default numeric tolerance shape for equal-distance comparisons as long as callers can still override it explicitly if needed.

## Deferred Ideas

- Edge-ref chamfer selection, cylindrical-support chamfers, fillets, drafts, and broad feature-recognition families — later helper-expansion work after the face-based chamfer contract stabilizes
- Generic symmetry groups, pattern inference, or solver-style geometric constraints — future deeper-semantics work, not Phase 22
- Viewer picking workflows, overlays, labels, or session-owned measurement UX — downstream app concerns outside Phase 22
