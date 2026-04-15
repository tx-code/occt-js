# Phase 5: Exact Model Lifecycle Contract - Research

**Researched:** 2026-04-14  
**Domain:** Retained exact-model lifecycle for the root OCCT Wasm runtime, with explicit retain/release semantics and invalid-after-release behavior.  
**Confidence:** HIGH for boundary and plan split; MEDIUM for implementation seam details until exact-store code exists.

<user_constraints>
## User Constraints

No phase-specific `05-CONTEXT.md` exists.

Use the current milestone decisions and roadmap constraints for planning:

- Keep `occt-js` centered on the runtime-first Wasm carrier.
- Treat exact measurement as a wasm/core foundation; app-side measurement UX stays downstream.
- Preserve the current stateless `Read*` lane for existing consumers.
- Phase 5 must stay scoped to lifecycle/store/disposal and must not absorb Phase 6+ ref-resolution or measurement primitive work.
- Favor a plan split that keeps work executable in two plans aligned to roadmap titles `05-01` and `05-02`.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| LIFE-01 | Downstream JS code can import STEP, IGES, or BREP bytes and keep an exact-model handle alive after import so later measurement calls do not depend on mesh-only output. | The new lane should add an explicit exact-model open API beside current `Read*` entrypoints and return the existing scene payload plus a retained exact-model handle. |
| LIFE-02 | Downstream JS code can explicitly retain and release exact-model handles with predictable lifetime behavior and actionable failure semantics. | The lifecycle boundary needs deterministic `retain` / `release` behavior, structured invalid-handle failures, and tests that prove invalid-after-release semantics. |
</phase_requirements>

## Summary

Phase 5 should introduce a separate stateful exact-model lane without mutating the current stateless import contract. The existing root API surface in [js-interface.cpp](/E:/Coding/occt-js/src/js-interface.cpp) only exposes `ReadFile`, `ReadStepFile`, `ReadIgesFile`, `ReadBrepFile`, and `AnalyzeOptimalOrientation`; there is no retained handle, disposal path, or exact-session state today. The new work therefore needs a parallel lifecycle API, not hidden retained state behind `Read*`.

The right implementation seam is the importer path that already produces geometry definitions and topology ids. [importer-utils.cpp](/E:/Coding/occt-js/src/importer-utils.cpp) assigns face, edge, and vertex ids from `TopExp::MapShapes(...)`, while [importer-xde.cpp](/E:/Coding/occt-js/src/importer-xde.cpp) and [importer-brep.cpp](/E:/Coding/occt-js/src/importer-brep.cpp) already separate geometry-definition extraction from node placement. Phase 5 should reuse those seams to register retained exact shapes and bind each exported geometry to an internal exact shape handle, but it should stop before public topology-ref resolution or measurement primitives.

The smallest public contract that unlocks later phases is:

1. Exact-model open entrypoints for STEP, IGES, BREP, and generic format dispatch.
2. An `exactModelId`-style lifecycle handle returned with the existing scene payload.
3. Explicit retain/release functions with deterministic invalid-after-release behavior.
4. Structured lifecycle failures such as invalid handle or released handle.
5. Root typings and tests that prove the stateless lane still behaves exactly as before.

The strongest product boundary is to keep the retained store internal to wasm and expose only model-level lifecycle to JS in Phase 5. Public per-element refs, occurrence scoping, and measurement DTOs belong to Phases 6-8. The only per-geometry output Phase 5 should consider is whatever internal binding metadata later phases need, but that metadata can stay private or minimally typed until ref-mapping starts.

## Existing Code Seams

### Root API

- [js-interface.cpp](/E:/Coding/occt-js/src/js-interface.cpp) currently serializes `OcctSceneData` into JS objects and binds only stateless import/orientation functions.
- [dist/occt-js.d.ts](/E:/Coding/occt-js/dist/occt-js.d.ts) exposes only the stateless `OcctJSModule` contract.
- `packages/occt-core/src/occt-core.js` wraps module loading and import dispatch, but has no exact-session wrapper or disposal path.

### Import and topology seams

- [importer.hpp](/E:/Coding/occt-js/src/importer.hpp) defines `OcctSceneData`, `OcctMeshData`, and the current topology payload structures but no exact-model lifecycle structs.
- [importer-utils.cpp](/E:/Coding/occt-js/src/importer-utils.cpp) already establishes the indexed topology identity seam using `TopExp::MapShapes(shape, ...)`.
- [importer-xde.cpp](/E:/Coding/occt-js/src/importer-xde.cpp) reuses mesh definitions by `TShape` pointer and keeps placement in node transforms, which is exactly the reuse boundary later exact refs will need.
- [importer-brep.cpp](/E:/Coding/occt-js/src/importer-brep.cpp) collects root shapes and definition-space meshes but has no retained exact registry.

## Recommended Public API Direction

Phase 5 should add a model-level lifecycle API only. A concrete shape that fits the current repo boundary:

```ts
interface OcctJSExactOpenResult extends OcctJSResult {
  exactModelId: number;
}

interface OcctJSLifecycleFailure {
  ok: false;
  code: "invalid-handle" | "released-handle" | "import-failed";
  message: string;
}

interface OcctJSLifecycleSuccess {
  ok: true;
}

interface OcctJSModule {
  OpenExactModel(format: OcctFormat, content: Uint8Array, params?: OcctJSReadParams): OcctJSExactOpenResult;
  OpenExactStepModel(content: Uint8Array, params?: OcctJSReadParams): OcctJSExactOpenResult;
  OpenExactIgesModel(content: Uint8Array, params?: OcctJSReadParams): OcctJSExactOpenResult;
  OpenExactBrepModel(content: Uint8Array, params?: OcctJSReadParams): OcctJSExactOpenResult;
  RetainExactModel(exactModelId: number): OcctJSLifecycleSuccess | OcctJSLifecycleFailure;
  ReleaseExactModel(exactModelId: number): OcctJSLifecycleSuccess | OcctJSLifecycleFailure;
}
```

The names can still be adjusted during planning, but the important contract decisions are:

- open APIs return the same mesh-oriented payload shape as today, plus a handle
- lifecycle operations are explicit and synchronous
- failed lifecycle calls return structured DTOs instead of silent no-ops
- the current `Read*` and `ReadFile` contract remains unchanged

## Recommended Internal Architecture

Introduce a dedicated exact-model store rather than overloading existing scene DTOs.

Recommended internal pieces:

- `ExactModelStore`
  - owns retained imported exact state
  - allocates model handles
  - tracks reference counts
  - invalidates released handles deterministically
- `ExactModelEntry`
  - imported root shape or import session payload
  - any geometry-definition exact bindings later phases will need
  - per-model lookup structures that survive beyond the import call
- JS binding helpers in `js-interface.cpp`
  - serialize lifecycle DTOs
  - preserve existing `BuildResult(...)` path for the stateless lane

The store should stay definition-centric, not viewer-instance-centric. `importer-xde.cpp` already separates definition data from node transforms; Phase 5 should keep that architecture intact so Phase 6 can add occurrence scoping in `occt-core` rather than baking viewer concepts into wasm.

## Failure Semantics Needed Now

Phase 5 needs to freeze lifecycle failure semantics early so later phases do not backfill incompatible error handling.

Minimum lifecycle failure cases:

- `import-failed`
  - exact open failed for the same reasons current `Read*` can fail
- `invalid-handle`
  - handle was never issued by the current store
- `released-handle`
  - handle existed but has already reached zero references and was released

Behavior expectations:

- releasing an unknown handle must fail explicitly
- releasing an already released handle must fail explicitly
- retaining a released handle must fail explicitly
- releasing a valid handle should succeed exactly once unless retain count is incremented
- no lifecycle path should silently resurrect or ignore stale handles

## Tests and Verification Surface

Phase 5 should add new lifecycle-focused tests instead of stretching existing import tests to cover stateful behavior implicitly.

Recommended test surfaces:

- root Node test for exact-model lifecycle contract
  - exact open returns `exactModelId`
  - `Read*` remains unchanged
  - retain/release semantics are deterministic
  - invalid-after-release errors are explicit
- `occt-core` test for thin exact-session adaptation
  - wrapper can open and dispose exact models
  - wrapper forwards lifecycle failures without hiding root contract details
- full runtime regression
  - existing `npm test` remains green after exact lifecycle work

This phase does not need measurement-kernel tests yet. The contract proof is lifecycle, typing, and compatibility.

## Pitfalls

### Pitfall 1: Hidden retained state behind `Read*`

This would leak disposal concerns into every existing import consumer and would make it harder to preserve the current runtime-first contract.

### Pitfall 2: Public viewer-flavored handles in Phase 5

Phase 5 should not expose occurrence refs, node ids, or selection-specific DTOs. Those belong to later phases and would force premature scope growth.

### Pitfall 3: Releasing only model-level JS objects without wasm-side invalidation

If the wasm store does not explicitly invalidate handles, later exact APIs can observe stale state and fail nondeterministically.

### Pitfall 4: Binding later-phase exact-ref details into the lifecycle plan

The current topology-id seam should inform Phase 5 design, but public exact face/edge/vertex refs are not required for lifecycle completion and should stay out of this phase’s required output.

## Recommended Plan Split

### 05-01 — Add the retained exact-model store and exact open/release root APIs

Own the C++ and JS binding seam:

- add internal exact-model store and lifecycle bookkeeping
- add root exact open entrypoints and release/retain exports
- keep `Read*` and `BuildResult(...)` behavior unchanged for stateless consumers
- bind the returned exact-model handle into the open result

### 05-02 — Lock lifecycle typings, failure DTOs, and root verification for invalid-after-release behavior

Own the contract hardening seam:

- update [dist/occt-js.d.ts](/E:/Coding/occt-js/dist/occt-js.d.ts) with exact lifecycle types
- add root contract tests for open/retain/release/failure semantics
- add minimal `occt-core` lifecycle adaptation only if needed to prove downstream consumption
- verify invalid-after-release behavior and unchanged stateless imports

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Node built-in test runner plus existing Node integration scripts |
| Config file | none — direct `node --test` and existing `npm` scripts |
| Quick run command | `node --test test/exact_model_lifecycle_contract.test.mjs packages/occt-core/test/core.test.mjs` |
| Full suite command | `npm run build:wasm:win && node --test test/exact_model_lifecycle_contract.test.mjs && npm --prefix packages/occt-core test && npm test` |

### Wave 0 gaps

- `test/exact_model_lifecycle_contract.test.mjs` does not exist yet and should be added in this phase.
- `packages/occt-core/test/core.test.mjs` will likely need exact-session coverage, but the file already exists.
- `dist/occt-js.d.ts` must become the authoritative lifecycle typing surface.

## Sources

- [AGENTS.md](/E:/Coding/occt-js/AGENTS.md)
- [.planning/ROADMAP.md](/E:/Coding/occt-js/.planning/ROADMAP.md)
- [.planning/REQUIREMENTS.md](/E:/Coding/occt-js/.planning/REQUIREMENTS.md)
- [.planning/STATE.md](/E:/Coding/occt-js/.planning/STATE.md)
- [.planning/research/SUMMARY.md](/E:/Coding/occt-js/.planning/research/SUMMARY.md)
- [.planning/research/ARCHITECTURE.md](/E:/Coding/occt-js/.planning/research/ARCHITECTURE.md)
- [.planning/research/PITFALLS.md](/E:/Coding/occt-js/.planning/research/PITFALLS.md)
- [src/js-interface.cpp](/E:/Coding/occt-js/src/js-interface.cpp)
- [src/importer.hpp](/E:/Coding/occt-js/src/importer.hpp)
- [src/importer-utils.cpp](/E:/Coding/occt-js/src/importer-utils.cpp)
- [src/importer-xde.cpp](/E:/Coding/occt-js/src/importer-xde.cpp)
- [src/importer-brep.cpp](/E:/Coding/occt-js/src/importer-brep.cpp)
- [packages/occt-core/src/occt-core.js](/E:/Coding/occt-js/packages/occt-core/src/occt-core.js)
- [dist/occt-js.d.ts](/E:/Coding/occt-js/dist/occt-js.d.ts)
