# Phase 21: Hole Helper Foundations - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-18
**Phase:** 21-hole-helper-foundations
**Mode:** auto
**Areas discussed:** Supported hole cases, helper API shape, runtime expansion policy, DTO and failure semantics, verification strategy

---

## Supported hole cases

| Option | Description | Selected |
|--------|-------------|----------|
| Selected-ref analytic cylindrical holes | Start with caller-selected circular edge or cylindrical face refs that can map to stable cylindrical hole semantics without whole-model scanning | ✓ |
| Broad feature recognition | Try to recognize arbitrary hole families, counterbores, countersinks, or model-wide candidates in Phase 21 | |
| Let the agent decide | Planner may widen or narrow the support boundary later | |

**User's choice:** Auto-selected recommended option: selected-ref analytic cylindrical holes
**Notes:** Chosen because the roadmap and requirements explicitly keep `v1.6` additive and package-first, while `docs/sdk/measurement.md` and the Phase 16 design doc previously treated hole semantics as downstream. The narrowest useful step is to promote only supported cylindrical hole cases from caller-selected exact refs.

---

## Helper API shape

| Option | Description | Selected |
|--------|-------------|----------|
| Single-ref package-first helper | Expose hole semantics from `@tx-code/occt-core` as an occurrence-scoped helper over one selected exact ref, mirroring the existing single-ref placement helpers | ✓ |
| Multi-ref orchestration API | Make callers assemble multiple refs or topology relationships before hole semantics can be returned | |
| Let the agent decide | Planner may choose the wrapper shape later | |

**User's choice:** Auto-selected recommended option: single-ref package-first helper
**Notes:** Chosen because `packages/occt-core/src/occt-core.js` already has a strong single-ref wrapper pattern for radius/diameter placement, and `packages/occt-core/src/exact-ref-resolver.js` already resolves occurrence-safe refs without viewer session state.

---

## Runtime expansion policy

| Option | Description | Selected |
|--------|-------------|----------|
| Narrow ref-based runtime addition if needed | Prefer composition from shipped exact primitives, but allow one additive root query around a selected ref if stable hole classification needs topology insight | ✓ |
| Package-only heuristics | Forbid any new root support and force the package layer to infer hole semantics from current primitives even if brittle | |
| Generic topology/discovery APIs | Add broad topology traversal or feature-discovery runtime APIs now | |

**User's choice:** Auto-selected recommended option: narrow ref-based runtime addition if needed
**Notes:** Chosen because current root primitives expose circle/cylinder geometry, radius, center, and placement data, but not generic adjacency/topology semantics. If supportable hole classification needs more than composition, the right addition is a narrow selected-ref descriptor, not a reopened kernel surface.

---

## DTO and failure semantics

| Option | Description | Selected |
|--------|-------------|----------|
| Explicit semantic DTO + typed failures | Return `ok: true` semantic hole data for supported cases and `ok: false` typed failures for invalid or unsupported selections | ✓ |
| `none` / `unknown` success variant | Return success objects for non-hole or unsupported cases instead of explicit failures | |
| Let the agent decide | Planner may define failure style later | |

**User's choice:** Auto-selected recommended option: explicit semantic DTO + typed failures
**Notes:** Chosen because the current exact query surface already standardizes `{ ok, code, message }` failures in `dist/occt-js.d.ts`, and relation-style `none` is specific to pairwise classification rather than single-ref helper semantics.

---

## Verification strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Contract-first with dedicated fixture if needed | Add focused root/package contract tests and introduce a small stable hole fixture if existing models are not deterministic enough | ✓ |
| Reuse existing large fixtures only | Depend on broad existing STEP/BREP fixtures and ad hoc assertions without narrowing the phase test surface | |
| Let the agent decide | Planner may choose the test strategy later | |

**User's choice:** Auto-selected recommended option: contract-first with dedicated fixture if needed
**Notes:** Chosen because `test/exact_placement_contract.test.mjs` and `packages/occt-core/test/*.test.mjs` already establish the contract-testing style for exact semantics, and Phase 21 should avoid brittle fixture archaeology.

---

## the agent's Discretion

- Choose the final helper naming (`describe`, `classify`, `get`, or similar) as long as it reads as package-first hole semantics rather than raw kernel plumbing.
- Decide whether robust blind/through depth metadata is part of the initial supported DTO or deferred when it cannot be derived without widening scope.
- Shape supporting-anchor metadata in the most reusable way for later helper families, as long as occurrence transforms and typed failures stay consistent.

## Deferred Ideas

- Counterbore, countersink, threaded-hole, and richer multi-stage hole taxonomy — later helper-expansion work after the base contract stabilizes
- Whole-model feature recognition, semantic candidate discovery, or batch indexing — future `FEAT-06` / `FEAT-07` style work
- Viewer picking flows, overlays, labels, or session-owned measurement UX — downstream app concerns outside Phase 21
