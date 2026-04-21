# Phase 31: Linear Extruded Shape Runtime - Research

**Researched:** 2026-04-21  
**Domain:** Additive generic linear extruded-shape runtime over the shared `Profile2D` kernel, including validate/build/exact-open flows, canonical generated-scene output, stable wall/cap semantics, and deterministic runtime-owned appearance grouping.  
**Confidence:** HIGH for the `Profile2D` + `BRepPrimAPI_MakePrism` + retained exact-store approach and for wall/cap provenance via OCCT history; MEDIUM for how much generated-shape helper code should be extracted out of `src/revolved-tool.cpp` during the first implementation pass.

<user_constraints>
## User Constraints

Use the active `v1.9` milestone and Phase 31 context as the source of truth:

- Keep `occt-js` a lightweight Wasm geometry carrier rather than a CAD feature framework or app-owned sketch system. [VERIFIED: AGENTS.md] [VERIFIED: .planning/PROJECT.md]
- Reuse the shared `Profile2D` kernel from Phase 30 instead of inventing a second profile schema for extrusion. [VERIFIED: .planning/phases/30-shared-profile-kernel/30-CONTEXT.md] [VERIFIED: .planning/phases/30-shared-profile-kernel/30-02-SUMMARY.md]
- New public APIs and typings must stay generic and must not reintroduce `tool` language. [VERIFIED: docs/specs/2026-04-21-revolved-shape-runtime-boundary-design.md] [VERIFIED: .planning/phases/31-linear-extruded-shape-runtime/31-CONTEXT.md]
- Validation remains strict: closed profile, supported units, positive finite depth, and no auto-heal/auto-cap behavior. [VERIFIED: .planning/phases/31-linear-extruded-shape-runtime/31-CONTEXT.md]
- Canonical local space is profile in `XY` and extrusion along positive local `+Z`; symmetric/bidirectional modes are deferred. [VERIFIED: .planning/phases/31-linear-extruded-shape-runtime/31-CONTEXT.md]
- Stable face semantics must be explicit and runtime-owned: wall faces preserve caller segment provenance; caps stay runtime-owned `start_cap` / `end_cap`. [VERIFIED: .planning/phases/31-linear-extruded-shape-runtime/31-CONTEXT.md]
- Caller-supplied face colors remain out of scope; semantic appearance grouping must stay runtime-owned. [VERIFIED: .planning/phases/31-linear-extruded-shape-runtime/31-CONTEXT.md]
- Package-first wrappers and release-governance expansion remain Phase 32 work, not Phase 31. [VERIFIED: .planning/ROADMAP.md] [VERIFIED: .planning/phases/31-linear-extruded-shape-runtime/31-CONTEXT.md]
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| EXTR-01 | Downstream JS code can build a linear extruded solid from a closed planar profile and receive canonical scene data compatible with existing `rootNodes`, `geometries`, `materials`, and stats consumers. | Add additive `ValidateExtrudedShapeSpec`, `BuildExtrudedShape`, and canonical `generated-extruded-shape` scene payloads built from a shared-profile face extruded with `BRepPrimAPI_MakePrism`. |
| EXTR-02 | Downstream JS code can open a generated linear extruded solid as a retained exact model and reuse the existing exact query and lifecycle surface against it. | Reuse the build path, then register the resulting exact shape through `ExactModelStore::Register(...)` exactly like the generated revolved family. |
| MAP-03 | Downstream JS code receives stable extruded-shape face bindings keyed by profile segment provenance plus explicit runtime-owned wall, `start_cap`, and `end_cap` roles instead of relying on face order. | Use OCCT prism history: `Generated(profileEdge)` for wall faces plus `FirstShape(profileFace)` / `LastShape(profileFace)` for the two caps. |
| MAP-04 | Downstream JS code receives deterministic default appearance or material grouping for extruded-shape faces derived from runtime segment tags and roles without caller-supplied colors. | Reuse the existing generated-family role/tag color grouping pattern, but with extruded roles (`wall`, `start_cap`, `end_cap`) rather than revolved roles. |
</phase_requirements>

## Summary

Phase 31 should introduce a dedicated generic extruded-shape family instead of forcing extrusion into the existing revolved implementation. The repository already has nearly every required subsystem:

- shared profile validation and normalized segments in `src/profile-2d.cpp`, [VERIFIED: src/profile-2d.cpp]
- generated-family scene assembly and exact-open registration patterns in `src/js-interface.cpp`, [VERIFIED: src/js-interface.cpp]
- reusable triangulation and mesh extraction in `src/importer-utils.cpp`, [VERIFIED: src/importer-utils.cpp]
- shape validation and semantic face-color patterns in `src/revolved-tool.cpp`, [VERIFIED: src/revolved-tool.cpp]
- retained exact-model lifecycle in `src/exact-model-store.*`. [VERIFIED: src/exact-model-store.hpp]

The cleanest implementation path is:

1. accept a new additive `OcctJSExtrudedShapeSpec`,
2. validate it through the shared `Profile2D` kernel plus extrusion-specific checks,
3. build a planar profile face from the normalized closed loop,
4. extrude it with `BRepPrimAPI_MakePrism(face, gp_Vec(0, 0, depth), ...)`,
5. reuse the existing generated-scene / exact-open plumbing,
6. attach additive `extrudedShape` metadata with stable wall/cap bindings and runtime-owned appearance groups.

## Current Code Facts

### The shared profile kernel is already ready for family reuse

- `ValidateProfile2DSpec(...)`, `ParseAndValidateProfile2DSpec(...)`, and `ValidateNormalizedProfile2DSpec(...)` already exist and own generic closed-profile validation. [VERIFIED: src/profile-2d.hpp] [VERIFIED: src/profile-2d.cpp]
- Revolved build/openExact now uses an internal resolved-loop adapter over that shared kernel rather than rebuilding family-local profile continuity logic. [VERIFIED: src/revolved-tool.cpp] [VERIFIED: .planning/phases/30-shared-profile-kernel/30-02-SUMMARY.md]
- This means Phase 31 does not need new profile DTO design work; it needs a new family adapter over the existing shared profile seam.

### OCCT prism history directly supports wall/cap provenance

`BRepPrimAPI_MakePrism` exposes exactly the history hooks Phase 31 needs:

```cpp
Standard_EXPORT virtual const TopTools_ListOfShape& Generated(const TopoDS_Shape& S) Standard_OVERRIDE;
Standard_EXPORT TopoDS_Shape FirstShape(const TopoDS_Shape& theShape);
Standard_EXPORT TopoDS_Shape LastShape(const TopoDS_Shape& theShape);
```

[VERIFIED: occt/src/BRepPrimAPI/BRepPrimAPI_MakePrism.hxx]

- `Generated(profileEdge)` is the natural wall-face binding source.
- `FirstShape(profileFace)` and `LastShape(profileFace)` provide the two cap faces for finite prisms.
- `Canonize = true` lets OCCT reduce generated surfaces to simple analytic types where possible, which is useful for exact family checks on line-vs-arc walls. [VERIFIED: occt/src/BRepPrimAPI/BRepPrimAPI_MakePrism.hxx]

### The generated-family runtime pattern already exists

- `BuildResult(...)` already assembles canonical `rootNodes`, `geometries`, `materials`, `warnings`, and `stats` payloads from `OcctSceneData`. [VERIFIED: src/js-interface.cpp]
- `OpenExactRevolvedShapeBinding(...)` already demonstrates the additive generated-family pattern: build first, attach family metadata, then register the exact shape into `ExactModelStore`. [VERIFIED: src/js-interface.cpp]
- `TriangulateShape(...)` and `ExtractMeshFromShape(...)` are already reusable for any generated exact shape. [VERIFIED: src/importer-utils.cpp]

### Existing exact queries already understand the needed analytic families

Phase 31 does not need new exact-query APIs just to validate generated extrusion surfaces:

- planar caps are already classified as `plane`,
- line-based walls should become planar faces,
- circular-arc walls should canonize to `cylinder` when the prism is built from a circular arc.

[VERIFIED: src/exact-query.cpp] [VERIFIED: src/revolved-tool.cpp] [VERIFIED: occt/src/BRepPrimAPI/BRepPrimAPI_MakePrism.hxx]

This is enough for representative exact-family regression tests in Phase 31.

### Root tests are command-routed explicitly through `package.json`

- `npm test` and `npm run test:release:root` enumerate root contract files directly. [VERIFIED: package.json]
- Therefore, any new extruded-family contract tests must be wired into `package.json` as part of the implementation rather than assumed to be auto-discovered.

## Recommended Public API Direction

### Add one additive generic extrusion family

Recommended additive root surface:

```ts
ValidateExtrudedShapeSpec(spec: OcctJSExtrudedShapeSpec): OcctJSExtrudedShapeValidationResult;
BuildExtrudedShape(spec: OcctJSExtrudedShapeSpec, options?: OcctJSExtrudedShapeBuildOptions): OcctJSExtrudedShapeBuildResult;
OpenExactExtrudedShape(spec: OcctJSExtrudedShapeSpec, options?: OcctJSExtrudedShapeBuildOptions): OcctJSExactExtrudedShapeOpenResult;
```

Recommended top-level identity:

```ts
sourceFormat: "generated-extruded-shape"
extrudedShape: { ...metadata }
```

This follows the already-shipped generated-family pattern and keeps extrusion clearly additive rather than overloading the revolved contract.

### Keep the spec narrow

Recommended spec shape for Phase 31:

```ts
interface OcctJSExtrudedShapeSpec {
  version?: 1;
  units: "mm" | "inch";
  profile: OcctJSProfile2DSpec;
  extrusion: {
    depth: number;
  };
}
```

Notes:

- no sweep path,
- no taper/draft,
- no bidirectional modes,
- no sketch/workplane system,
- no caller-owned colors,
- no cap or wall overrides in the spec.

This is the smallest family contract that still satisfies `EXTR-01` and `EXTR-02`.

## Architecture Patterns

### Pattern 1: Use a dedicated family adapter file

**Recommendation:** add `src/extruded-shape.hpp/.cpp` as the family implementation, parallel to `src/revolved-tool.hpp/.cpp`.

Why:

- the profile kernel already exists,
- the public family boundary should be explicit,
- Phase 31 should not get bogged down in a broader generated-family helper refactor before the extrusion contract is proven.

### Pattern 2: Share build and exact-open through one exact shape build path

**Recommendation:** follow the same pattern as the revolved family:

- validate spec,
- build exact OCCT shape once,
- triangulate and extract scene once,
- for exact-open, reuse that build result and only add exact-store registration.

This is the lowest-risk way to satisfy `EXTR-02`.

### Pattern 3: Use profile-edge history for walls and face history for caps

**Recommendation:** bind:

- wall faces from `makePrism.Generated(profileEdge)`
- `start_cap` from `makePrism.FirstShape(profileFace)`
- `end_cap` from `makePrism.LastShape(profileFace)`

This gives Phase 31 stable semantics without face-order assumptions and mirrors the provenance-first direction already proven in Phase 28/30.

### Pattern 4: Reuse semantic appearance grouping rather than inventing new color policy

**Recommendation:** mirror the existing runtime-owned grouping strategy:

- walls with matching segment tags collapse to a shared appearance,
- `start_cap` and `end_cap` remain deterministic but visually distinct from wall groups,
- no caller colors in the family spec.

This satisfies `MAP-04` without widening the runtime boundary.

### Pattern 5: Route new contract tests through root scripts immediately

Because root tests are explicitly enumerated, Phase 31 should add:

- `test/extruded_shape_spec_contract.test.mjs`
- `test/generated_extruded_shape_contract.test.mjs`
- `test/exact_generated_extruded_shape_contract.test.mjs`

and wire them into:

- `npm test`
- `npm run test:release:root`

## Common Pitfalls

### Pitfall 1: Expanding into a placement/sweep framework too early

This would break the milestone boundary immediately.

**Avoidance:** keep the family contract to closed profile + positive finite depth in canonical local space.

### Pitfall 2: Letting caps inherit caller segment provenance

That would blur the line between caller-owned profile walls and runtime-owned extrusion closure.

**Avoidance:** caps are always runtime-owned `start_cap` / `end_cap`; only wall faces carry caller segment ids/tags.

### Pitfall 3: Missing package.json routing for new root contracts

The root release/test lanes are explicit.

**Avoidance:** include `package.json` in Phase 31 implementation plans whenever new root test files are added.

### Pitfall 4: Over-refactoring `src/revolved-tool.cpp` before the new family exists

There is some reusable generated-family code in the revolved implementation, but broad extraction is optional.

**Avoidance:** prefer a thin dedicated extruded family first, and only extract small shared helpers opportunistically when duplication is obviously harmful.

## Validation Architecture

| Property | Value |
|----------|-------|
| Framework | Node built-in test runner plus existing root npm script orchestration |
| Quick run command | `npm run build:wasm:win && node --test test/profile_2d_spec_contract.test.mjs test/revolved_tool_spec_contract.test.mjs test/generated_revolved_tool_contract.test.mjs test/exact_generated_revolved_tool_contract.test.mjs test/extruded_shape_spec_contract.test.mjs test/generated_extruded_shape_contract.test.mjs test/exact_generated_extruded_shape_contract.test.mjs` |
| Full suite command | `npm run build:wasm:win && node --test test/profile_2d_spec_contract.test.mjs test/revolved_tool_spec_contract.test.mjs test/generated_revolved_tool_contract.test.mjs test/exact_generated_revolved_tool_contract.test.mjs test/extruded_shape_spec_contract.test.mjs test/generated_extruded_shape_contract.test.mjs test/exact_generated_extruded_shape_contract.test.mjs && npm test` |

Wave 0 gaps:

- `src/extruded-shape.hpp` / `src/extruded-shape.cpp` do not exist yet
- `dist/occt-js.d.ts` has no extruded-family DTOs or additive root APIs
- `test/extruded_shape_spec_contract.test.mjs` does not exist yet
- `test/generated_extruded_shape_contract.test.mjs` does not exist yet
- `test/exact_generated_extruded_shape_contract.test.mjs` does not exist yet
- `package.json` does not route any generated-extruded-shape contract files through root commands yet

## Sources

- `AGENTS.md`
- `.planning/PROJECT.md`
- `.planning/REQUIREMENTS.md`
- `.planning/ROADMAP.md`
- `.planning/STATE.md`
- `.planning/phases/30-shared-profile-kernel/30-CONTEXT.md`
- `.planning/phases/30-shared-profile-kernel/30-02-SUMMARY.md`
- `.planning/phases/31-linear-extruded-shape-runtime/31-CONTEXT.md`
- `docs/specs/2026-04-21-revolved-shape-runtime-boundary-design.md`
- `package.json`
- `src/profile-2d.hpp`
- `src/profile-2d.cpp`
- `src/revolved-tool.cpp`
- `src/js-interface.cpp`
- `src/importer-utils.cpp`
- `src/exact-model-store.hpp`
- `src/exact-query.cpp`
- `occt/src/BRepPrimAPI/BRepPrimAPI_MakePrism.hxx`
- `occt/src/BRepPrimAPI/BRepPrimAPI_MakePrism.cxx`

## Metadata

**Confidence breakdown:**

- shared-profile reuse for extrusion: HIGH
- OCCT prism history for wall/cap provenance: HIGH
- exact-open reuse through existing exact store: HIGH
- minimal public extrusion spec shape: HIGH
- amount of internal helper extraction worth doing in 31-01: MEDIUM
