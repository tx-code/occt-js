# Phase 30: Shared Profile Kernel - Context

**Gathered:** 2026-04-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 30 introduces one generic 2D profile kernel for profile-driven solids in the root Wasm runtime. Scope is limited to the shared DTO shape, strict validation and diagnostics, provenance-carrying normalized segments, and refactoring the existing revolved-shape path to consume that kernel without changing its public caller contract. This phase does not add linear extrusion yet, does not widen package-first wrappers/governance work ahead of Phase 32, and does not reopen tool-library, sketcher, or CAM ownership.

</domain>

<decisions>
## Implementation Decisions

### Shared contract surface and naming
- **D-01:** Phase 30 should establish one generic shared `Profile2D`-style contract and validation seam as a first-class runtime concept, but existing `RevolvedShapeSpec` callers must keep their current public payload shape. Family APIs adapt into the shared kernel rather than forcing caller migration in this phase.
- **D-02:** New shared-profile types, helpers, docs, and tests must use generic geometry language rather than `tool` terminology. Legacy internal filenames or structs may be renamed opportunistically when touched, but no new Phase 30 surface should reintroduce tool-coupled naming.

### Geometry scope and coordinate model
- **D-03:** The shared kernel models one ordered outer loop only in `v1.9`. Multiple loops, islands, or hole profiles are out of scope for this phase.
- **D-04:** Supported segment primitives remain `line`, `arc_center`, and `arc_3pt` only. Splines, NURBS, Bezier curves, and richer sketch entities remain deferred.
- **D-05:** Shared profile coordinates are generic local 2D coordinates, not family-specific `radius/z` semantics. Each solid family owns its own embedding from local 2D into 3D construction space.

### Closure model and strict validation
- **D-06:** The shared kernel accepts explicitly closed contours only. It must not own revolved-only closure modes such as `auto_axis`, nor any family-specific auto-completion policy.
- **D-07:** Family-owned synthetic closure edges or axis edges are created outside the shared kernel before construction, and they must stay marked as runtime-owned provenance rather than caller-owned profile data.
- **D-08:** Validation remains strict. The runtime must not auto-close, heal, reorder, or reinterpret invalid profile geometry to make it build.

### Diagnostics and migration behavior
- **D-09:** The shared kernel owns family-neutral diagnostics for segment shape, continuity, degeneracy, and closure. Family APIs layer additional diagnostics for family-specific concerns such as revolve angle, revolve plane, or family closure settings.
- **D-10:** `ValidateRevolvedShapeSpec`, `BuildRevolvedShape`, and `OpenExactRevolvedShape` keep their current public signatures and expected validation behavior in `v1.9`. Phase 30 is a shared-kernel extraction and additive contract step, not a breaking migration for existing revolved-shape callers.

### Provenance and semantic payload
- **D-11:** Normalized shared segments preserve optional caller `id` and `tag`, and the kernel must also support runtime-owned synthetic segment provenance so later face-binding logic can reference one consistent normalized segment model.
- **D-12:** Shared profile DTOs do not carry caller-owned colors, materials, or UI policy. Appearance stays runtime-owned or downstream-app-owned outside the shared profile kernel.

### the agent's Discretion
- Choose the exact exported DTO and validator names for the shared profile seam as long as they stay additive, generic-first, and clearly distinct from revolved-family APIs.
- Choose whether the initial Phase 30 public seam is a dedicated root validation entrypoint, additive shared typings used by later families, or both, as long as downstream agents can treat the shared profile contract as canonical for future profile-driven solids.
- Choose how aggressively to rename touched legacy `OcctRevolvedTool*` internals while extracting the kernel, provided the external revolved-shape contract and its tests remain stable.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone and repository contracts
- `.planning/PROJECT.md` — active `v1.9` milestone framing, product boundary, and pending decisions for shared profiles and linear extrusion.
- `.planning/REQUIREMENTS.md` — `PROF-01`, `PROF-02`, and `PROF-03` requirements plus `v1.9` out-of-scope limits.
- `.planning/ROADMAP.md` — Phase 30 goal, success criteria, and the two-plan split between shared DTO/validation work and revolved-runtime refactor work.
- `.planning/STATE.md` — current workflow position and active milestone status.
- `AGENTS.md` — authoritative repository rules for root runtime boundaries, release gates, and GSD-first workflow handling.

### Prior boundary decisions
- `.planning/milestones/v1.8-phases/27-revolved-tool-spec-wasm-builder/27-CONTEXT.md` — original normalized revolved-spec decisions, especially strict segment support, runtime-owned semantics, and app-upstream schema ownership.
- `docs/specs/2026-04-21-revolved-shape-runtime-boundary-design.md` — generic runtime boundary: lightweight Wasm geometry carrier, not a tool-library or CAM domain kernel.
- `README.md` — root package positioning and the current revolved-shape boundary language visible to downstream consumers.
- `packages/occt-core/README.md` — current package-first documentation for the generic revolved-shape contract and wrapper expectations.

### Current revolved runtime implementation
- `src/revolved-tool.hpp` — current root entrypoint declarations for revolved-shape validate/build flows.
- `src/revolved-tool.cpp` — current mixed parse/validate/profile-wire/build/history logic that Phase 30 should split into a reusable profile kernel plus a family-specific revolved consumer.
- `src/js-interface.cpp` — additive Embind export pattern and current revolved-shape binding registration.
- `src/importer.hpp` — current internal DTOs for diagnostics, normalized revolved segments/specs, generated metadata, and build results.
- `dist/occt-js.d.ts` — published root runtime type surface that Phase 30 must extend additively without breaking the shipped revolved-shape contract.

### Tests and package integration surfaces
- `test/revolved_tool_spec_contract.test.mjs` — strict validation expectations for current revolved-shape segment, closure, unit, and angle diagnostics.
- `test/generated_revolved_tool_contract.test.mjs` — generated-scene, shape-validation, face-binding, and appearance-group expectations that must stay stable after the shared-kernel refactor.
- `test/exact_generated_revolved_tool_contract.test.mjs` — retained exact-open behavior and exact-family alignment for generated revolved shapes.
- `packages/occt-core/src/occt-core.js` — current package wrapper pattern for revolved-shape validate/build/openExact entrypoints.
- `packages/occt-core/src/index.d.ts` — published package typings that currently mirror the root revolved-shape contract and should not drift ahead of the milestone plan.
- `packages/occt-core/src/model-normalizer.js` — normalization boundary showing how top-level additive generated-shape metadata is preserved without mutating the canonical face DTO.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/revolved-tool.cpp` already contains reusable profile parsing and validation pieces such as `TryParsePoint2`, `ValidateArcCenterSegment`, `ValidateArc3PointSegment`, `ParseSegment`, and `ParseProfile`. Phase 30 should extract and generalize these instead of rewriting a second parser.
- `src/revolved-tool.cpp` also already carries provenance-aware wire-building logic through `RevolvedProfileEdgeSource`, `TryAppendTrackedEdge`, and `TryBuildProfileWire`. That provenance model is the clearest starting point for a shared segment kernel that later families can reuse.
- `src/js-interface.cpp` already demonstrates the additive binding/export pattern that Phase 30 should follow for any new shared-profile runtime surface.
- `dist/occt-js.d.ts` and `packages/occt-core/src/index.d.ts` already show the repo’s current published DTO conventions for generated-shape APIs.

### Established Patterns
- Root runtime validation returns structured diagnostics instead of throwing across the Wasm boundary.
- Public runtime growth is additive and explicit; existing entrypoints are not silently reshaped when a deeper internal abstraction is introduced.
- Generated-shape semantics live in additive top-level metadata (`revolvedShape`) rather than by extending the base face DTO shape.
- `@tx-code/occt-core` stays a thin wrapper layer; package-first ergonomics and governance work belong later in the milestone rather than leaking into Phase 30.

### Integration Points
- New shared-profile code should live under `src/` as generic geometry code and be consumed by `src/revolved-tool.cpp` rather than staying embedded inside one family implementation.
- Internal DTO additions will likely touch `src/importer.hpp` and `dist/occt-js.d.ts` so the shared contract can exist without breaking current revolved-shape payloads.
- Root tests under `test/` are the primary verification surface for Phase 30. Package-wrapper expansion should stay minimal until Phase 32 unless a small additive wrapper is strictly necessary for testability.

</code_context>

<specifics>
## Specific Ideas

- The shared profile kernel should treat profile points as local 2D geometry. For revolved shapes, the family layer can continue mapping local `x` to radius and local `y` to axial height after it handles any revolved-only closure synthesis.
- Future extruded-shape work should reuse the same normalized segment provenance model so wall/cap bindings derive from the shared profile kernel instead of inventing a second segment schema.
- The shared profile seam should remain geometry-only: no caller-owned colors, no tool presets, no sketch-editing affordances, and no CAM workflow semantics.

</specifics>

<deferred>
## Deferred Ideas

- Multi-loop or island-bearing profiles for cutouts/holes inside a single profile solid.
- Spline/NURBS profile segments or richer sketch-entity support.
- Full 3D sketch frames, authored workplanes, or sketcher-style constraints and editing UX.
- Non-linear sweep/pipe solids, lofts, and post-generation boolean feature stacks.
- Package-first wrappers, docs, tarball checks, and release-governance lock-in for the shared-profile surface before Phase 32.

</deferred>

---

*Phase: 30-shared-profile-kernel*
*Context gathered: 2026-04-21*
