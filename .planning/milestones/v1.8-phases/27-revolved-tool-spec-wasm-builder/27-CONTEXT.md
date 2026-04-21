# Phase 27: Revolved Tool Spec & Wasm Builder - Context

**Gathered:** 2026-04-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 27 adds additive root Wasm APIs for validating one app-neutral revolved tool contract and building scene-compatible generated tool geometry from it. Scope is limited to spec shape, validation rules, diagnostics, OCCT revolve construction, triangulation, and result DTOs that remain compatible with current runtime scene consumers. This phase must not absorb app-specific tool-library schemas, adapter registries, retained exact generated-shape lifecycles, or the full stable segment-to-face history semantics planned for Phase 28.

</domain>

<decisions>
## Implementation Decisions

### Contract boundary and API shape
- **D-01:** The root runtime owns one normalized `RevolvedToolSpec`; upstream applications are responsible for translating their own tool definitions before calling the runtime. No adapter/plugin layer belongs in the root runtime.
- **D-02:** Phase 27 exposes two additive entry points: `ValidateRevolvedToolSpec(spec)` and `BuildRevolvedTool(spec, options)`. Exact-retained generated-tool entry points are deferred to Phase 28 as `OpenExactRevolvedTool(...)`.
- **D-03:** `BuildRevolvedTool` must return the same scene-style top-level contract shape already used by the runtime (`rootNodes`, `geometries`, `materials`, `warnings`, `stats`) so existing downstream render paths do not need a second scene schema.

### Spec strictness and normalized geometry contract
- **D-04:** `RevolvedToolSpec v1` is strict. Supported profile primitives are `line`, `arc_center`, and `arc_3pt` only.
- **D-05:** The normalized profile contract stays revolve-first: fixed sketch plane `XZ`, normalized units limited to `mm` and `inch`, explicit profile start point plus ordered segments, and closure modes limited to `explicit` and `auto_axis`.
- **D-06:** Full and partial revolves are both in scope for Phase 27, but malformed or unsupported inputs must fail validation with typed diagnostics. The runtime must not silently coerce, auto-repair, auto-close, or reinterpret invalid geometry.
- **D-07:** Segment records may carry optional caller-owned `id` and `tag`. These are semantic hints only and must not turn the root runtime into the owner of app-specific tool schemas.

### Metadata, semantics, and appearance ownership
- **D-08:** System-owned surface semantics use runtime roles such as `profile`, `closure`, `axis`, `start_cap`, `end_cap`, and `degenerated`. Caller-supplied face colors are not part of the spec.
- **D-09:** Phase 27 should not overload the existing face DTO with custom per-face segment metadata. Generated-tool semantics should live in an additive top-level `generatedTool` metadata block keyed back to geometry and face identifiers so current normalizers remain compatible.
- **D-10:** Default appearance is runtime-owned, not caller-supplied. If Phase 27 needs a renderable fallback to preserve the raw scene contract, it may emit a stable neutral/default material while preserving semantic metadata for richer tag/role-driven appearance resolution in JS and later phases.

### Phase boundary and failure semantics
- **D-11:** Phase 27 stops at validation plus scene build. Retained exact generated shapes, stable `BRepPrimAPI_MakeRevol::Generated(...)` face bindings, and deterministic closure/cap/degenerated mapping belong to Phase 28.
- **D-12:** Raw Wasm validation and build flows return structured diagnostics for spec issues. `@tx-code/occt-core` may throw on hard invocation/build failures while still surfacing diagnostics through typed validation-oriented results.

### the agent's Discretion
- Choose the exact JSON property names for `RevolvedToolSpec` as long as they preserve the locked concepts above: versioning, units, axis/plane, profile start plus segments, closure mode, optional segment `id`/`tag`, and partial revolve angle.
- Choose whether build-tuning fields live inside `spec` or inside a separate `options` bag as long as validation and build remain separate additive APIs.
- Choose the exact shape of `generatedTool.segments` and `generatedTool.faceBindings` as long as they do not depend on face order and do not rely on extending the current face DTO shape.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone and repository contracts
- `.planning/ROADMAP.md` — Phase 27 goal, success criteria, and two-plan split (`27-01`, `27-02`).
- `.planning/REQUIREMENTS.md` — `TOOL-01`, `TOOL-02`, `TOOL-03`, and `GEOM-01` milestone requirements for the generated revolved tool surface.
- `.planning/PROJECT.md` — current milestone framing: app-neutral Wasm+JS generated tool contract, not a tool-library manager.
- `.planning/STATE.md` — active milestone status and current workflow position.
- `AGENTS.md` — authoritative repository rules for root runtime artifacts, package boundaries, and required verification surfaces.

### Root runtime scene and binding surfaces
- `src/js-interface.cpp` — current Embind binding style, `BuildResult(...)` scene DTO contract, and additive API registration pattern.
- `src/importer.hpp` — canonical mesh/scene/topology data structures (`OcctSceneData`, `OcctMeshData`, faces, edges, vertices, `triangleToFaceMap`).
- `dist/occt-js.d.ts` — published root runtime type surface that the new additive APIs must extend without breaking.
- `test/test_multi_format_exports.mjs` — canonical runtime scene/topology contract assertions for `rootNodes`, `geometries`, `materials`, `warnings`, `stats`, and face/topology invariants.
- `test/import_appearance_contract.test.mjs` — existing root appearance/material contract tests that generated tool scene output must not accidentally violate.

### Package-first wrapper and normalization surfaces
- `packages/occt-core/src/occt-core.js` — wrapper naming/error-handling patterns and the future extension point for validate/build/openExact generated tool helpers.
- `packages/occt-core/src/model-normalizer.js` — current normalization boundary; it preserves only the minimal face DTO, which is why generated-tool metadata should stay top-level.
- `packages/occt-core/src/index.d.ts` — public package typings shape that later phases must extend for generated tool helpers.

### OCCT revolve and history primitives
- `occt/src/BRepPrimAPI/BRepPrimAPI_MakeRevol.hxx` — official OCCT revolve builder API including `Generated(...)`, `FirstShape(...)`, `LastShape(...)`, and `Degenerated()` hooks that Phase 28 will use for stable history-aware bindings.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/js-interface.cpp` already has reusable helpers for typed arrays, scene tree serialization, lifecycle/error result conversion, and additive Embind exports.
- `BuildResult(...)` and `MeshToVal(...)` already define the canonical scene payload the generated-tool path should reuse instead of inventing a second mesh/result shape.
- `packages/occt-core/src/occt-core.js` already separates validate-like wrappers from build/open-style wrappers and provides the expected hard-failure handling pattern for package consumers.

### Established Patterns
- Root runtime APIs are additive and explicit (`ReadFile`, `OpenExactModel`, `RetainExactModel`, `ReleaseExactModel`) rather than overloading one catch-all command.
- `packages/occt-core/src/model-normalizer.js` treats faces as a fixed minimal schema; ad-hoc extra face properties would currently be dropped or become a drift risk.
- Runtime contract tests already assert stable scene arrays and topology invariants, so generated tool output should satisfy those invariants instead of creating an exception path.
- Exact lifecycle is already owned by the retained exact-model store. Generated-tool exact retention must plug into that model later instead of creating a parallel retained-state system.

### Integration Points
- New C++ parsing/validation/builder code will sit under `src/` beside `js-interface.cpp` and the existing importer utilities.
- Root runtime typings must grow additively in `dist/occt-js.d.ts`.
- Package wrappers and future normalization glue will extend `packages/occt-core/src/occt-core.js` and `packages/occt-core/src/index.d.ts`.
- Root tests under `test/` should become the first verification point for generated-tool validation/build behavior and scene payload compatibility.

</code_context>

<specifics>
## Specific Ideas

- The normalized tool contract discussed here is revolve-first: explicit profile start point plus ordered segments, not an app-level tool-library schema.
- Caller-owned segment `tag` is expected to carry labels such as `tip`, `cutting`, `corner`, `neck`, `shoulder`, and `shank`.
- Runtime-owned `role` semantics must cover non-caller surfaces such as closure sheets, axis surfaces, caps, and degenerated outputs.
- Stable segment-to-face mapping must come from OCCT generation history (`BRepPrimAPI_MakeRevol::Generated(...)`) rather than final face order. Phase 27 only needs to preserve a clean path for this; Phase 28 locks the full mapping contract.

</specifics>

<deferred>
## Deferred Ideas

- App-specific tool-library schemas, adapter registries, and `.fctb` compatibility stay upstream and out of root runtime scope.
- Any generalized non-revolved procedural solid-generation framework broader than the normalized revolve contract.
- Retained exact generated-model open flow and stable history-aware face binding semantics are Phase 28 work.
- Package docs, published wrapper ergonomics, and release-governance lock-in are Phase 29 work.

</deferred>

---

*Phase: 27-revolved-tool-spec-wasm-builder*
*Context gathered: 2026-04-20*
