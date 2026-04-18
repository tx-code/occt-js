# Phase 22: Chamfer & Constraint Helpers - Pattern Map

**Mapped:** 2026-04-18
**Files analyzed:** 12 scoped files
**Analogs found:** 12 / 12

Phase 22 extends the new helper-semantic surface in two directions: a second selected-ref semantic descriptor (`chamfer`) and a package-only helper family (`midpoint`, `equal-distance`, `symmetry`) composed from the shipped exact placement and relation foundation. The safest implementation pattern is: keep chamfer aligned with the Phase 21 hole helper rhythm, keep midpoint/equal-distance/symmetry in `@tx-code/occt-core` unless the current carrier is provably insufficient, and reuse the shipped frame/anchor vocabulary instead of creating a second presentation geometry language.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `packages/occt-core/src/occt-core.js` | source wrapper/helper layer | package-first semantic surface | current file (`describeExactHole`, `suggestExactDistancePlacement`) | exact |
| `packages/occt-core/test/core.test.mjs` | unit/contract test | mocked wrapper and helper parity | current file | exact |
| `packages/occt-core/test/live-root-integration.test.mjs` | live integration test | package-to-built-carrier parity | current file | exact |
| `src/importer.hpp` | DTO structs | carrier result surface | current file (`OcctExactHoleResult`, `OcctExactPlacementResult`) | partial |
| `dist/occt-js.d.ts` | public typings | JS carrier contract | current file (`OcctJSExactHoleResult`, placement/result unions) | partial |
| `src/exact-query.hpp` / `src/exact-query.cpp` | carrier query | retained exact topology + analytic geometry | current file (`DescribeExactHole`, `ClassifyExactRelation`) | partial |
| `src/js-interface.cpp` | Embind binding | carrier-to-JS serialization | current file | exact |
| `test/exact_chamfer_contract.test.mjs` | root contract test | retained-model verification | `test/exact_hole_contract.test.mjs` | exact |
| `test/ANC101.stp` | fixture input | shipped deterministic chamfer candidate | current file (read-only fixture reuse) | exact |
| package-only midpoint/symmetry/equal-distance helpers | composed helper surface | package math over shipped placement/relation DTOs | `suggestExact*Placement`, `classifyExactRelation`, `measureExactDistance` | exact |

## Pattern Assignments

### `packages/occt-core/src/occt-core.js` (package-first semantic wrappers)

**Scope:** Required. Phase 22 adds both the chamfer wrapper and the package-only helper family here.

**Analog 1:** `describeExactHole(ref)` for single-ref semantic descriptors

**Analog 2:** `suggestExactDistancePlacement(refA, refB)` and `classifyExactRelation(refA, refB)` for pairwise helpers

Planner note: `describeExactChamfer(ref)` should follow the exact one-ref wrapper rhythm already used by `describeExactHole(ref)`: validate one occurrence-scoped ref, call one carrier method, transform local-space geometry into occurrence space, and append `ref` on success. Midpoint, equal-distance, and symmetry helpers should reuse the same validation and transform helpers but stay package-owned unless the context proves otherwise.

---

### `src/importer.hpp`, `dist/occt-js.d.ts`, and `src/js-interface.cpp` (carrier DTOs + binding)

**Scope:** Required only for the chamfer descriptor.

**Analog:** the additive hole-helper surface from Phase 21

Planner note: if Phase 22 adds `DescribeExactChamfer`, keep the DTO additive and semantic. Reuse the current `ok/code/message`, frame, and anchor vocabulary where it fits. Do not introduce a new binding style or generic topology traversal surface.

---

### `src/exact-query.hpp` / `src/exact-query.cpp` (selected-ref semantic classification)

**Scope:** Required for chamfer only.

**Analog 1:** `DescribeExactHole(...)` for selected-ref topology-aware semantic extraction

**Analog 2:** `ClassifyPlanePlaneRelation(...)` and `SuggestExactDistancePlacement(...)` for plane/line geometry support, frame construction, and anchor placement

Planner note: a chamfer descriptor should normalize one selected planar face ref into two planar support faces, derive semantic data only when the support topology is stable, and return explicit `unsupported-geometry` or `unsupported-topology` style failures for everything else.

---

### `packages/occt-core/test/core.test.mjs` and `packages/occt-core/test/live-root-integration.test.mjs` (helper verification)

**Scope:** Required for both plans.

**Analog:** current wrapper-contract tests plus live occurrence-parity tests

Planner note: lock the DTO names and failure propagation with mocked tests first, then add live carrier parity for the chamfer descriptor and live package integration for the package-only helper family.

---

### Package-only helper composition

**Scope:** Required for midpoint, equal-distance, and symmetry-style helpers.

**Analog:** current pairwise placement and relation wrappers

Planner note: build helper semantics by composing:

- `measureExactDistance(refA, refB)` for stable scalar values and attachment points
- `suggestExactDistancePlacement(refA, refB)` for midpoint-friendly frames and anchors
- `classifyExactRelation(refA, refB)` for narrow symmetry gating such as supported parallel pairs

This helper family should remain package-first and occurrence-safe. It should not add new root APIs in Phase 22.

## Shared Patterns

### Selected-ref semantic helper with narrow carrier support

**Source:** `.planning/phases/21-hole-helper-foundations/21-PATTERNS.md`

When the exact-ref object lacks topology context, add one narrowly scoped carrier descriptor keyed by the selected retained ref. Keep the package wrapper first-class and the carrier lower-level.

### Reuse the shipped frame and anchor vocabulary

**Source:** `src/importer.hpp`, `dist/occt-js.d.ts`, `packages/occt-core/src/occt-core.js`

New helper outputs should reuse `frame`, `anchors`, and direction vectors so later docs and downstream overlays can stay on one geometry-support vocabulary.

### Contract-first before live carrier work

**Source:** `packages/occt-core/test/core.test.mjs`, `test/exact_hole_contract.test.mjs`

Lock wrapper and helper names plus DTO semantics in tests before carrier work lands. For selected-ref descriptors, add one focused root contract suite rather than broad fixture archaeology.

## No Analog Found

None. Every planned Phase 22 artifact has a direct in-repo analog from the exact measurement, placement, relation, or hole-helper work.

## Metadata

**Analog search scope:** `packages/occt-core/`, `src/`, `dist/`, `test/`, `.planning/phases/21-*`, docs/spec references
