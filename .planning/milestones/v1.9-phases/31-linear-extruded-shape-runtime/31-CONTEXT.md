# Phase 31: Linear Extruded Shape Runtime - Context

**Gathered:** 2026-04-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 31 adds one generic linear extruded-shape runtime family on top of the shared `Profile2D` kernel from Phase 30. Scope is limited to additive root Wasm validate/build/exact-open entrypoints, canonical generated-scene output, retained exact-model registration, stable face bindings, and deterministic runtime-owned appearance semantics for prismatic solids. This phase does not add package-first wrappers or release-governance work ahead of Phase 32, does not reopen multi-loop profiles or richer sketch semantics, and does not widen into sweep, loft, draft, shell, boolean feature stacks, or app-owned editing UX.

</domain>

<decisions>
## Implementation Decisions

### Public runtime surface and naming
- **D-01:** Phase 31 should ship additive generic family entrypoints named `ValidateExtrudedShapeSpec`, `BuildExtrudedShape`, and `OpenExactExtrudedShape`. The root payload identity should be `sourceFormat: "generated-extruded-shape"` with additive top-level `extrudedShape` metadata, mirroring the existing generated-family pattern without reusing tool language.
- **D-02:** The extruded family must consume the shared `Profile2D` contract introduced in Phase 30. Callers provide one normalized closed profile plus extrusion-family parameters; the family adapter owns extrusion-specific validation and construction concerns.

### Local coordinate model and placement
- **D-03:** The canonical extrusion build space is local `XY` for the profile and positive local `+Z` for depth. Phase 31 should not invent arbitrary sweep paths or non-planar embedding rules.
- **D-04:** Extrusion depth is one-sided and strictly positive in `v1.9`. Symmetric, bidirectional, or negative-distance extrusion modes are deferred.
- **D-05:** If caller-controlled placement/orientation is needed, prefer carrying it as generated occurrence transform/root-node placement rather than widening the core family contract into a feature-framework-style sketch/workplane system in this phase.

### Validation and exact-open behavior
- **D-06:** Validation stays strict, matching the shared-profile philosophy from Phase 30. The runtime must not auto-heal, auto-cap, reorder, or reinterpret invalid profile or extrusion input to make builds succeed.
- **D-07:** `BuildExtrudedShape` and `OpenExactExtrudedShape` should share one build path. Exact-open remains a retained exact-model registration of the same generated shape, not a second independent geometry lane.

### Face-binding and semantic metadata
- **D-08:** Stable extruded face bindings must not depend on face order. Lateral faces get caller provenance through profile-segment bindings, while caps remain runtime-owned.
- **D-09:** The extruded family should use explicit runtime role names `wall`, `start_cap`, and `end_cap`. Caller-owned segment provenance belongs only on wall faces derived from profile segments; runtime-owned caps must not claim caller segment ids or tags.

### Deterministic appearance semantics
- **D-10:** Phase 31 should preserve the existing runtime-owned appearance model: no caller-supplied face colors in the family spec. Deterministic default appearance groups derive from runtime roles plus caller segment tags where present.
- **D-11:** Cap appearance should stay visually distinct from wall appearance by default, and matching wall semantics/tags should collapse to stable material groups the same way revolved profile faces already do.

### the agent's Discretion
- Choose the exact extrusion-spec field names for local depth and optional placement/orientation as long as they stay generic geometry language, additive, and lightweight for a Wasm carrier.
- Choose whether Phase 31 introduces dedicated internal `extruded-shape.cpp/.hpp` files or first generalizes reusable generated-shape helpers out of `src/revolved-tool.cpp`, provided the public root family boundaries remain clear.
- Choose the narrowest internal metadata reuse strategy that avoids cloning the whole revolved pipeline while keeping `generated-extruded-shape` payloads explicit and future-proof for Phase 32 wrappers.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone and workflow anchors
- `.planning/PROJECT.md` — active `v1.9` milestone framing, product boundary, and current decisions around shared profiles and extruded solids.
- `.planning/REQUIREMENTS.md` — `EXTR-01`, `EXTR-02`, `MAP-03`, and `MAP-04`, plus `v1.9` out-of-scope limits.
- `.planning/ROADMAP.md` — Phase 31 goal, success criteria, and plan split for build/exact-open vs semantic face bindings.
- `.planning/STATE.md` — current milestone status and next-step routing.
- `AGENTS.md` — authoritative repository instructions for root runtime boundaries, testing, and GSD workflow handling.

### Prior phase decisions that constrain Phase 31
- `.planning/phases/30-shared-profile-kernel/30-CONTEXT.md` — locked decisions for the shared `Profile2D` kernel, strict validation, explicit closure, and geometry-only ownership.
- `.planning/phases/30-shared-profile-kernel/30-02-SUMMARY.md` — completed resolved-loop adaptation and no-drift expectations for generated-family build/openExact behavior.
- `docs/specs/2026-04-21-revolved-shape-runtime-boundary-design.md` — generic runtime boundary: lightweight Wasm geometry carrier, not a tool-library or CAD feature framework.

### Existing implementation patterns to reuse
- `src/profile-2d.hpp` — shared profile-kernel API available to the new extruded family.
- `src/profile-2d.cpp` — strict generic profile parse/validate behavior and normalized segment semantics.
- `src/revolved-tool.cpp` — current generated-family build pipeline, exact-open reuse, stable face-binding logic, deterministic appearance grouping, and generated-shape validation patterns.
- `src/revolved-tool.hpp` — current family entrypoint declaration pattern.
- `src/js-interface.cpp` — additive binding/export pattern, generated-family payload assembly, and exact-model registration flow.
- `src/importer.hpp` — current generated-shape DTOs, profile DTOs, diagnostics, shape-validation, and face-binding structs.
- `src/importer-utils.hpp` — triangulation/extraction helper declarations.
- `src/importer-utils.cpp` — `TriangulateShape(...)` and `ExtractMeshFromShape(...)` helpers already reused by generated-family builds.
- `src/exact-model-store.hpp` — retained exact-model registration boundary that generated extruded shapes should reuse unchanged.

### Published contract and regression surfaces
- `dist/occt-js.d.ts` — published root typings pattern for generated families and shared profiles.
- `test/generated_revolved_tool_contract.test.mjs` — generated-scene, face-binding, shape-validation, and appearance invariants that Phase 31 should mirror for extruded shapes.
- `test/exact_generated_revolved_tool_contract.test.mjs` — retained exact-open and representative exact-family mapping expectations for generated families.
- `test/profile_2d_spec_contract.test.mjs` — strict shared-profile validation behavior already locked in for family reuse.
- `packages/occt-core/src/occt-core.js` — package wrapper pattern that Phase 32 will later mirror for the extruded family.
- `packages/occt-core/src/model-normalizer.js` — generated-family metadata normalization boundary showing how top-level family payloads stay additive to canonical geometry DTOs.
- `README.md` — root public-facing runtime positioning and generated-family terminology.
- `packages/occt-core/README.md` — package-first documentation style that later phases must align with.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/profile-2d.cpp` already provides the generic closed-profile validator and normalized segments that Phase 31 should consume directly.
- `src/revolved-tool.cpp` already contains reusable generated-family patterns for build option parsing, triangulation, exact-shape validation, scene population, exact-open registration, face-binding DTO emission, and deterministic role/tag-based face coloring.
- `src/js-interface.cpp` already has the exact additive Wasm binding pattern for generated-family validate/build/openExact APIs and their top-level metadata attachment.
- `src/importer-utils.cpp` and `src/exact-model-store.*` already solve the generated-family mesh extraction and exact lifecycle problems; Phase 31 should reuse them instead of inventing a second lifecycle.

### Established Patterns
- Generated families return canonical scene payloads first, then attach family-specific metadata (`revolvedShape`) additively at the top level rather than mutating the base mesh/face DTO contract.
- Exact-open for generated families is a wrapper over the same build path plus retained exact-model registration.
- Stable semantic bindings are runtime-owned metadata, not an inference consumers make from face order.
- Deterministic appearance grouping is runtime-side and semantics-driven; caller specs do not own final face colors.

### Integration Points
- Phase 31 will likely add a new `src/extruded-shape.cpp/.hpp` family implementation or factor shared generated-family helpers out of `src/revolved-tool.cpp` if that reduces duplication cleanly.
- `src/js-interface.cpp` and `dist/occt-js.d.ts` are the additive public-surface touchpoints for the new family.
- Root tests under `test/` should lock extruded-family validate/build/exact-open behavior before any package-wrapper work starts.

</code_context>

<specifics>
## Specific Ideas

- The most lightweight family contract is a closed local `Profile2D` extruded along positive local `+Z`, with optional placement/orientation represented as occurrence transform rather than feature-framework semantics.
- Exact geometry family checks for representative extruded faces should likely cover planar caps and planar/cylindrical-or-other wall faces depending on the source segment shape.
- The extruded family should look and feel parallel to the revolved family for downstream JS, but it should not force an artificial one-to-one clone of revolved internals if a smaller seam is cleaner.

</specifics>

<deferred>
## Deferred Ideas

- Symmetric/bidirectional extrusion modes, taper/draft extrusion, and shell/thin-wall generation.
- Multi-loop profiles, islands, or cutout-aware extrusion from one profile family spec.
- Sweep/pipe solids, lofts, and any non-linear profile-path family.
- Package-first wrappers, docs, and governance for extruded shapes before Phase 32.
- App-owned sketch planes, constraints, editing UX, or feature-tree semantics.

</deferred>

---

*Phase: 31-linear-extruded-shape-runtime*
*Context gathered: 2026-04-21*
