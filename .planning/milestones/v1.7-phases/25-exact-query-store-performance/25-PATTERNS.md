# Phase 25: Exact Query & Store Performance - Pattern Map

**Mapped:** 2026-04-20  
**Files analyzed:** 10 scoped files  
**Analogs found:** 9 / 10

Phase 25 is an internal performance-hardening phase. The safest pattern is to optimize hot paths behind existing contracts: remove avoidable retained-entry copy overhead in the exact-query lane, centralize duplicated IGES temp-file staging, and keep lifecycle/query DTO semantics unchanged.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/exact-model-store.hpp` / `src/exact-model-store.cpp` | retained store hot path | lookup/lifecycle bookkeeping for exact query entry | current store APIs (`Register`, `Retain`, `Release`, `GetEntry`) | exact |
| `src/exact-query.cpp` | query hot path consumer | per-query retained lookup + shape resolution | `LookupGeometryShape`, `ResolveFace/Edge/Vertex` | exact |
| `test/exact_*_contract.test.mjs` | root query semantics guardrail | retained-query behavior parity after internals change | current exact lifecycle/primitive/pairwise suites | exact |
| `src/importer-xde.cpp` | import staging hotspot | IGES byte input -> temp-file -> XDE transfer | `ReadAndTransferXde` IGES branch | exact |
| `src/orientation.cpp` | orientation staging hotspot | IGES byte input -> temp-file -> XDE transfer | `ReadAndTransferXde` (orientation copy) | exact |
| shared IGES staging utility (new internal file) | deduped staging behavior | importer + orientation convergence | duplicated inline staging blocks in above files | partial |
| `test/test_optimal_orientation_api.mjs` / IGES import tests | behavioral parity guardrail | orientation/import behavior unchanged after staging refactor | existing orientation and IGES import script tests | exact |
| optional perf harness under `test/` | performance visibility lane | repeatable metrics for store/query + IGES staging | existing script-style `test/test_*.mjs` runners | partial |
| `package.json` perf command wiring (if needed) | command discoverability | maintainer/CI perf lane execution | existing script naming conventions | exact |
| root/public typings (`dist/occt-js.d.ts`, package typings) | contract surface | public API shape | no intended changes in Phase 25 | not-touched |

## Pattern Assignments

### Store/query optimization stays behind existing contracts

**Scope:** Required.  
**Analog:** `ExactModelStore` + `LookupGeometryShape` flow.

Planner note: optimize access mechanics (copy removal and lookup mechanics) while preserving typed failure behavior and result DTOs.

---

### IGES staging behavior should be shared, not duplicated

**Scope:** Required.  
**Analog:** duplicated IGES branches in `src/importer-xde.cpp` and `src/orientation.cpp`.

Planner note: extract one internal helper for temp-file staging + cleanup semantics. Keep file-based fallback until OCCT evidence allows a safe `ReadStream` switch.

---

### Regression evidence uses deterministic contracts plus explicit perf lane

**Scope:** Required.  
**Analog 1:** existing root contract tests under `test/*.test.mjs` and `test/test_*.mjs`.  
**Analog 2:** package and root release script-driven verification patterns in `package.json`.

Planner note: keep deterministic correctness checks in standard suites; keep timing-sensitive evidence in an explicit perf command/harness.

## Shared Patterns

### Preserve typed failure semantics

**Source:** `src/exact-query.cpp`, `src/exact-model-store.cpp`, `test/exact_model_lifecycle_contract.test.mjs`

Do not regress `released-handle`/`invalid-handle`/`invalid-id` signaling while optimizing internals.

### Keep optimization additive and runtime-first

**Source:** `AGENTS.md`, `.planning/PROJECT.md`, `.planning/ROADMAP.md`

Phase 25 is not a feature-expansion phase. Avoid widening viewer policy or adding unrelated root/package APIs.

### Treat IGES temp-file staging as a toolchain constraint

**Source:** `src/importer-xde.cpp`, `src/orientation.cpp`, `.planning/codebase/CONCERNS.md`

Keep temp-file fallback behavior but reduce drift and duplicate overhead by unifying the implementation.

## No Analog Found

A dedicated repeatable performance harness for exact-query/store + IGES staging does not yet exist in the current root suite. This is the primary new pattern to introduce in Phase 25.

## Metadata

**Analog search scope:** `src/exact-model-store.*`, `src/exact-query.cpp`, `src/importer-xde.cpp`, `src/orientation.cpp`, `test/*.test.mjs`, `test/test_*.mjs`, `.planning/codebase/*.md`
