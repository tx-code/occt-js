# Phase 24: Exact Model Lifecycle Governance - Pattern Map

**Mapped:** 2026-04-19
**Files analyzed:** 11 scoped files
**Analogs found:** 10 / 11

Phase 24 hardens the retained exact-model lifecycle without broadening the geometry/helper product surface. The safest pattern is: keep the root runtime as the authoritative handle owner, add diagnostics additively in the same narrow lifecycle DTO style already used for `retain` / `release`, and layer any safer disposal ergonomics in `@tx-code/occt-core` as opt-in wrappers rather than as a replacement for `openExactModel()` or the numeric `exactModelId` contract.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/exact-model-store.hpp` / `src/exact-model-store.cpp` | root lifecycle state | retained OCCT shape ownership and handle bookkeeping | current files (`Retain`, `Release`, `GetEntry`) | exact |
| `src/js-interface.cpp` | Embind lifecycle binding | root lifecycle APIs to JS carrier | current file (`OpenExact*Model`, `RetainExactModel`, `ReleaseExactModel`) | exact |
| `src/importer.hpp` | shared DTO definitions | lifecycle result / diagnostics type surface | current file (`OcctLifecycleResult`, exact result DTOs) | partial |
| `dist/occt-js.d.ts` | public runtime typings | root JS lifecycle contract | current file (`OcctJSLifecycleResult`, `OcctJSModule`) | exact |
| `test/exact_model_lifecycle_contract.test.mjs` | root runtime contract tests | real dist carrier lifecycle verification | current file | exact |
| `packages/occt-core/src/occt-core.js` | package-first lifecycle helper layer | additive JS ergonomics over root lifecycle APIs | current file (`retainExactModel`, `releaseExactModel`) | exact |
| `packages/occt-core/src/index.d.ts` | package typing surface | typed package-first lifecycle helpers | current file (`OcctCoreClient` method surface) | exact |
| `packages/occt-core/test/core.test.mjs` | package unit/contract tests | mocked lifecycle wrapper behavior | current file | exact |
| `packages/occt-core/test/live-root-integration.test.mjs` | package live integration | built root carrier parity and lifecycle helper behavior | current file | exact |
| idempotent `dispose()` object APIs | additive managed-resource wrapper style | explicit cleanup helper semantics | `packages/occt-babylon-viewer/src/occt-babylon-viewer.js`, `packages/occt-babylon-widgets/src/viewcube-widget.js`, `demo/src/hooks/usePicking.js` | partial |
| `src/exact-query.cpp` performance hot paths | retained query execution | copy reduction and staging performance | current file, but deferred to Phase 25 by context | deferred |

## Pattern Assignments

### Root lifecycle state and bindings

**Scope:** Required. Phase 24 must land its authoritative lifecycle tightening in the root runtime first.

**Analog:** the existing `RetainExactModel` / `ReleaseExactModel` flow in `src/exact-model-store.*` and `src/js-interface.cpp`

Planner note: extend the current narrow integer-handle lifecycle contract instead of introducing a second ownership system. Diagnostics should be additive and use the same explicit DTO + binding rhythm as the existing lifecycle methods.

---

### Public runtime typings

**Scope:** Required. Any additive diagnostics API has to ship through `dist/occt-js.d.ts`.

**Analog:** `OcctJSLifecycleResult` plus the existing exact-query result typedefs in `dist/occt-js.d.ts`

Planner note: keep the lifecycle typing surface small and explicit. Prefer one clearly named diagnostics snapshot DTO over many tiny metadata structs unless the implementation truly needs them.

---

### Package-first lifecycle helpers

**Scope:** Required. Phase 24 is not complete if lifecycle ergonomics remain root-only.

**Analog 1:** `retainExactModel()` / `releaseExactModel()` pass-through methods in `packages/occt-core/src/occt-core.js`

**Analog 2:** repo-wide idempotent `dispose()` objects such as the Babylon viewer runtime and picking disposables

Planner note: keep helpers opt-in and additive. The managed wrapper should sit on top of the shipped open/release flow, expose explicit `dispose()` semantics, and avoid inventing viewer-owned global ownership policy.

---

### Contract-first lifecycle testing

**Scope:** Required. Lifecycle is fragile because root state, bindings, wrappers, and exact-query paths meet in one narrow surface.

**Analog:** `test/exact_model_lifecycle_contract.test.mjs`, `packages/occt-core/test/core.test.mjs`, and `packages/occt-core/test/live-root-integration.test.mjs`

Planner note: add failing contract coverage before implementation, and keep one focused root lifecycle suite plus package mocked/live tests rather than spreading release semantics through every exact query suite.

## Shared Patterns

### Keep numeric handles authoritative

**Source:** `src/exact-model-store.cpp`, `src/js-interface.cpp`, `dist/occt-js.d.ts`

The root runtime already establishes the ownership model: integer `exactModelId`, explicit retain/release, deterministic `released-handle` / `invalid-handle` failure codes. Phase 24 should preserve that instead of replacing it with opaque package-only state.

### Add lifecycle ergonomics package-first, not viewer-first

**Source:** `packages/occt-core/src/occt-core.js`, `AGENTS.md`, `.planning/phases/24-exact-model-lifecycle-governance/24-CONTEXT.md`

The new ergonomics belong in `@tx-code/occt-core`, because the repo's documented SDK boundary already treats that package as the primary downstream JS entrypoint. Demo, Babylon, and app/session ownership stay out of scope.

### Diagnostics must be explicit and pull-based

**Source:** `.planning/phases/24-exact-model-lifecycle-governance/24-CONTEXT.md`, `.planning/codebase/CONCERNS.md`

Leak diagnostics should be an additive snapshot callers can ask for when they care, not implicit console noise or a hidden package-only ledger.

### Do not smuggle Phase 25 work into Phase 24

**Source:** `.planning/ROADMAP.md`, `.planning/phases/24-exact-model-lifecycle-governance/24-CONTEXT.md`, `.planning/codebase/CONCERNS.md`

`ExactModelStore::GetEntry` copy reduction and IGES staging cleanup are already identified as Phase 25 performance items. Phase 24 should only touch those areas where lifecycle semantics require it, not as a pretext to do hot-path optimization early.

## No Analog Found

The only partial gap is a package-first managed exact-model wrapper: the repo has idempotent `dispose()` object patterns, but not yet one for retained exact-model ownership. That gap is acceptable because the existing disposal objects provide enough house style to follow.

## Metadata

**Analog search scope:** `src/exact-model-store.*`, `src/js-interface.cpp`, `src/importer.hpp`, `dist/occt-js.d.ts`, `packages/occt-core/`, `test/exact_model_lifecycle_contract.test.mjs`, `.planning/codebase/*.md`
