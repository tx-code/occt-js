# Phase 30: Shared Profile Kernel - Research

**Researched:** 2026-04-21  
**Domain:** Generic 2D profile normalization and validation for profile-driven solids, with the existing revolved-shape runtime refactored to consume that kernel without public drift.  
**Confidence:** HIGH for the shared-kernel extraction strategy, family-vs-kernel closure split, and drift-guard verification path; MEDIUM for the exact naming of the first additive shared-profile runtime surface until execution proves it against the current root/package contract.

<user_constraints>
## User Constraints

Use the active `v1.9` milestone and Phase 30 context as the source of truth:

- Keep `occt-js` as a lightweight Wasm geometry carrier, not a CAD feature framework or CAM kernel. [VERIFIED: AGENTS.md] [VERIFIED: docs/specs/2026-04-21-revolved-shape-runtime-boundary-design.md]
- Do not reintroduce `tool` coupling into new runtime contracts, docs, or tests. [VERIFIED: .planning/PROJECT.md] [VERIFIED: .planning/phases/30-shared-profile-kernel/30-CONTEXT.md]
- The shared kernel must stay generic-first and geometry-only: no caller-owned colors, no tool-library ownership, no sketch UX, no CAM semantics. [VERIFIED: .planning/phases/30-shared-profile-kernel/30-CONTEXT.md]
- Existing `ValidateRevolvedShapeSpec`, `BuildRevolvedShape`, and `OpenExactRevolvedShape` public contracts must remain stable through the refactor. [VERIFIED: .planning/REQUIREMENTS.md] [VERIFIED: .planning/phases/30-shared-profile-kernel/30-CONTEXT.md]
- Shared profile coordinates are generic local 2D coordinates, not hardcoded revolve `radius/z` semantics. Family layers own embedding into 3D construction space. [VERIFIED: .planning/phases/30-shared-profile-kernel/30-CONTEXT.md]
- The shared kernel accepts explicit closed contours only; family-specific auto-closure (for example revolve `auto_axis`) stays outside the shared kernel as family-owned synthetic provenance. [VERIFIED: .planning/phases/30-shared-profile-kernel/30-CONTEXT.md]
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PROF-01 | Downstream JS can submit one normalized 2D profile spec with line and circular-arc segments that can be consumed by multiple generated-solid families. | Add additive root `Profile2D` DTOs plus one shared validation seam, then make family specs reuse those segment types instead of duplicating them. |
| PROF-02 | Downstream JS receives typed diagnostics for invalid profile continuity, closure, unsupported segment data, or degenerate profile input before OCCT construction runs. | Move family-neutral parse/continuity/closure checks into a generic profile validator with stable diagnostic vocabulary. |
| PROF-03 | Existing revolved-shape APIs reuse the shared profile kernel without changing their public caller contract or losing validation behavior. | Keep revolved public DTOs stable, adapt them into the shared kernel internally, and lock behavior with existing root contract tests plus new drift guards. |
</phase_requirements>

## Summary

Phase 30 should extract a reusable profile kernel from the current revolved runtime rather than inventing a second family-specific parser for extrusion later. The repository already has almost all the building blocks in one place:

- the current revolved-shape parser/validator/wire builder in `src/revolved-tool.cpp`, [VERIFIED: src/revolved-tool.cpp]
- shared DTO and result surfaces in `src/importer.hpp` and `dist/occt-js.d.ts`, [VERIFIED: src/importer.hpp] [VERIFIED: dist/occt-js.d.ts]
- stable generated-shape regression suites for validation, build, and exact-open behavior, [VERIFIED: test/revolved_tool_spec_contract.test.mjs] [VERIFIED: test/generated_revolved_tool_contract.test.mjs] [VERIFIED: test/exact_generated_revolved_tool_contract.test.mjs]
- a thin package wrapper layer that must keep working without owning a second contract. [VERIFIED: packages/occt-core/src/occt-core.js] [VERIFIED: packages/occt-core/src/index.d.ts]

**Primary recommendation:** introduce a dedicated generic seam such as `src/profile-2d.hpp/.cpp` that owns:

1. local 2D point and segment DTOs,
2. family-neutral diagnostics,
3. profile continuity / closure / arc validation,
4. provenance-preserving normalized segment output,
5. an additive root validator such as `ValidateProfile2DSpec(spec)`.

Then refactor the current revolved-shape flow so family-owned parsing still accepts the shipped `RevolvedShapeSpec`, but converts it into a normalized shared profile before validation/build. This satisfies `PROF-01` and `PROF-02` without violating `PROF-03`.

## Current Code Facts

### The shared-kernel candidate already exists inside `src/revolved-tool.cpp`

- `TryParsePoint2`, `ValidateArcCenterSegment`, `ValidateArc3PointSegment`, `ParseSegment`, and `ParseProfile` already implement most of the generic profile parsing/validation logic Phase 30 needs. [VERIFIED: src/revolved-tool.cpp]
- `TryBuildProfileWire`, `TryAppendTrackedEdge`, and `RevolvedProfileEdgeSource` already carry provenance and normalized edge intent through to later face-binding work. [VERIFIED: src/revolved-tool.cpp]
- The problem today is not missing logic. The problem is that the logic is embedded inside one family implementation and still names everything as revolved tool data. [VERIFIED: src/revolved-tool.cpp] [VERIFIED: src/importer.hpp]

### Current public revolved-shape types already expose a stable caller contract

- `dist/occt-js.d.ts` defines `OcctJSRevolvedShapeSpec`, `OcctJSRevolvedShapeSegment`, typed diagnostics, and build/open result types. [VERIFIED: dist/occt-js.d.ts]
- `src/js-interface.cpp` exports `ValidateRevolvedShapeSpec`, `BuildRevolvedShape`, and `OpenExactRevolvedShape` as additive root methods. [VERIFIED: src/js-interface.cpp]
- `packages/occt-core` mirrors those exact names and DTOs instead of inventing a second schema. [VERIFIED: packages/occt-core/src/occt-core.js] [VERIFIED: packages/occt-core/src/index.d.ts]

### Existing tests already lock the public drift boundary

- `test/revolved_tool_spec_contract.test.mjs` locks strict validation behavior for unsupported units, invalid arcs, negative radius, explicit closure, and revolve angle diagnostics. [VERIFIED: test/revolved_tool_spec_contract.test.mjs]
- `test/generated_revolved_tool_contract.test.mjs` locks build payload shape, stable face-binding semantics, semantic appearance grouping, and partial-revolve behavior. [VERIFIED: test/generated_revolved_tool_contract.test.mjs]
- `test/exact_generated_revolved_tool_contract.test.mjs` locks exact-open lifecycle and representative exact-family mapping. [VERIFIED: test/exact_generated_revolved_tool_contract.test.mjs]

### Generic profile validation should not inherit revolved-only geometry rules

- The current revolved validator rejects negative `profile.start[0]` and negative radius coordinates because the current profile plane is interpreted as `[radius, z]`. [VERIFIED: src/revolved-tool.cpp]
- Phase 30 explicitly changes the shared kernel to generic local 2D coordinates, so negative `x` or `y` in a shared profile must be legal unless a consuming family forbids them. [VERIFIED: .planning/phases/30-shared-profile-kernel/30-CONTEXT.md]
- Therefore, negative-radius checks must stay in the revolved family adapter, not in the shared profile validator.

## Recommended Public API Direction

### Add one additive generic root validator in Phase 30

Recommended additive root API:

```ts
ValidateProfile2DSpec(spec: OcctJSProfile2DSpec): OcctJSProfile2DValidationResult;
```

Why this is the cleanest fit:

- `PROF-01` asks for a reusable downstream-facing shared profile contract now, not only an internal helper.
- It gives Phase 31 a stable surface to reuse for extrusion without forcing callers to wait for a second family API before they can validate a shared profile directly.
- It remains additive and does not break `ValidateRevolvedShapeSpec(...)`.

### Keep shared profile DTOs generic and minimal

Recommended generic shape:

```ts
interface OcctJSProfile2DSpec {
  version?: 1;
  start: [number, number];
  segments: OcctJSProfile2DSegment[];
}
```

Recommended rules:

- no plane
- no closure mode field
- no family-specific axis semantics
- closed loop required by validator (last segment must end at `start`)
- optional per-segment `id` and `tag` preserved as provenance only

### Reuse shared segment types inside family specs

Recommended TypeScript direction:

- `OcctJSProfile2DSegment*` becomes the canonical segment family
- `OcctJSRevolvedShapeSegment` becomes an alias of the shared segment type
- `OcctJSRevolvedShapeSpec.profile` keeps its current public fields (`plane`, `start`, `closure`, `segments`) but internally routes through the shared kernel

This keeps the current public revolved payload stable while making the shared profile contract canonical for future families.

## Architecture Patterns

### Pattern 1: Extract generic profile logic into its own native seam

**What:** `src/revolved-tool.cpp` already contains the generic logic, but it is buried in a family file. [VERIFIED: src/revolved-tool.cpp]

**Recommendation:** move shared parse/validate/normalize helpers into a new `src/profile-2d.hpp/.cpp` seam. Keep family-specific construction in `src/revolved-tool.cpp`.

### Pattern 2: Split shared profile validation from family validation

**What:** some current diagnostics are generic (`invalid-arc`, `degenerate-segment`, explicit closure), while others are family-owned (`negative-radius`, `invalid-revolve-angle`, `unsupported-plane`, `invalid-closure`). [VERIFIED: src/revolved-tool.cpp]

**Recommendation:** keep two layers:

- shared `Profile2D` validator for continuity, closure, unsupported segment data, and degeneracy
- revolved adapter for radius, plane, closure-mode, unit, and angle rules

This is the only clean way to make the shared kernel reusable for extrusion without leaking revolve semantics into it.

### Pattern 3: Treat `auto_axis` as a family adapter, not as a shared profile feature

**What:** current `auto_axis` closure is synthesized in `TryBuildProfileWire(...)` by adding runtime-owned closure and axis segments. [VERIFIED: src/revolved-tool.cpp]

**Recommendation:** formalize that behavior in the revolved family adapter:

- shared kernel only consumes explicitly closed local 2D profiles
- revolve family converts `auto_axis` into synthetic closure/axis edges before shared validation/build
- synthetic edges keep runtime-owned provenance so face-binding semantics remain stable

### Pattern 4: Preserve generated-shape regressions as the drift gate

**What:** Phase 30 is an internal architecture extraction, but the public runtime boundary is already locked by root tests and package wrappers. [VERIFIED: test/generated_revolved_tool_contract.test.mjs] [VERIFIED: test/exact_generated_revolved_tool_contract.test.mjs] [VERIFIED: packages/occt-core/test/core.test.mjs]

**Recommendation:** Phase 30 must add new shared-profile tests, but it must also keep the existing revolved build/openExact test suites green. That is the cheapest reliable proof of `PROF-03`.

## Clean 2-Plan Split

### 30-01 — Shared DTOs, diagnostics, and root validation seam

- Add shared `Profile2D` DTOs and diagnostics to the public/native surfaces
- Expose `ValidateProfile2DSpec(...)`
- Lock generic profile validation behavior in a new root contract test file
- Route `ValidateRevolvedShapeSpec(...)` through the shared kernel while preserving current caller-visible validation semantics

### 30-02 — Refactor revolved build/exact flows onto the shared kernel

- Update the revolved builder to consume normalized shared profile segments
- Keep `auto_axis` synthesis and runtime-owned provenance in the family layer
- Preserve generated-scene, face-binding, appearance-grouping, and exact-open behavior
- Re-run root and package regressions to prove no public drift

## Common Pitfalls

### Pitfall 1: Making the shared kernel revolve-first again

That would violate the core reason this milestone exists.

**Avoidance:** shared profile coordinates remain local 2D with no radius/axis semantics; family adapters own 3D embedding.

### Pitfall 2: Letting family closure policy leak into the shared DTO

If `auto_axis` or cap logic lands in the shared profile contract, extrusion will inherit the wrong semantics immediately.

**Avoidance:** shared profiles are always explicitly closed; family adapters synthesize any runtime-owned closure before construction.

### Pitfall 3: Losing segment provenance during refactor

If shared normalization strips `id`, `tag`, or runtime-owned synthetic markers, Phase 31 will have no stable basis for wall/cap/segment bindings.

**Avoidance:** make shared normalized segments provenance-carrying by design, including synthetic family-owned segments.

### Pitfall 4: Shipping a private-only shared kernel

That would satisfy an internal refactor but undershoot `PROF-01`, which explicitly calls for a downstream-facing normalized 2D profile spec.

**Avoidance:** add an additive root `ValidateProfile2DSpec(...)` surface in Phase 30 and make it the canonical shared contract.

## Validation Architecture

| Property | Value |
|----------|-------|
| Framework | Node built-in test runner plus existing root npm script orchestration |
| Quick run command | `npm run build:wasm:win && node --test test/profile_2d_spec_contract.test.mjs test/revolved_tool_spec_contract.test.mjs test/generated_revolved_tool_contract.test.mjs test/exact_generated_revolved_tool_contract.test.mjs` |
| Full suite command | `npm run build:wasm:win && node --test test/profile_2d_spec_contract.test.mjs test/revolved_tool_spec_contract.test.mjs test/generated_revolved_tool_contract.test.mjs test/exact_generated_revolved_tool_contract.test.mjs && npm --prefix packages/occt-core test && npm test` |

Wave 0 gaps:

- `src/profile-2d.hpp` / `src/profile-2d.cpp` do not exist yet
- `dist/occt-js.d.ts` has no shared `Profile2D` DTOs or `ValidateProfile2DSpec(...)`
- `test/profile_2d_spec_contract.test.mjs` does not exist yet
- the current revolved runtime still mixes generic and family-specific validation logic in `src/revolved-tool.cpp`

## Sources

- `AGENTS.md`
- `.planning/PROJECT.md`
- `.planning/REQUIREMENTS.md`
- `.planning/ROADMAP.md`
- `.planning/STATE.md`
- `.planning/phases/30-shared-profile-kernel/30-CONTEXT.md`
- `docs/specs/2026-04-21-revolved-shape-runtime-boundary-design.md`
- `src/importer.hpp`
- `src/revolved-tool.hpp`
- `src/revolved-tool.cpp`
- `src/js-interface.cpp`
- `dist/occt-js.d.ts`
- `test/revolved_tool_spec_contract.test.mjs`
- `test/generated_revolved_tool_contract.test.mjs`
- `test/exact_generated_revolved_tool_contract.test.mjs`
- `packages/occt-core/src/occt-core.js`
- `packages/occt-core/src/index.d.ts`
- `packages/occt-core/src/model-normalizer.js`
- `packages/occt-core/test/core.test.mjs`

## Metadata

**Confidence breakdown:**

- shared-kernel extraction path: HIGH
- additive shared public validator direction: HIGH
- family-owned `auto_axis` synthesis split: HIGH
- exact final naming of new shared DTOs: MEDIUM
