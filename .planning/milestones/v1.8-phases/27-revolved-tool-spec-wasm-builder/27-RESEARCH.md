# Phase 27: Revolved Tool Spec & Wasm Builder - Research

**Researched:** 2026-04-20  
**Domain:** Strict root-side revolved tool spec validation and scene-compatible OCCT revolve generation for the Wasm carrier.  
**Confidence:** HIGH for API split, profile/build pipeline, and scene-contract reuse; MEDIUM for the exact final shape of additive generated-tool metadata until execution proves it on the current root test surface.

<user_constraints>
## User Constraints

Use the active `v1.8` milestone decisions and direct user guidance as the source of truth:

- Stay on `occt-js` Wasm + JS. Do not route this milestone through FreeCAD or Python. [VERIFIED: conversation context] [VERIFIED: .planning/PROJECT.md]
- Do not own `.fctb` or any app-specific tool-library format in the root runtime. Upstream apps translate their own schemas into one normalized contract. [VERIFIED: .planning/REQUIREMENTS.md] [VERIFIED: .planning/phases/27-revolved-tool-spec-wasm-builder/27-CONTEXT.md]
- The runtime must expose a general revolved-profile contract that multiple apps can target, not one CAM-app-specific schema. [VERIFIED: .planning/phases/27-revolved-tool-spec-wasm-builder/27-CONTEXT.md]
- Caller-supplied colors are out of scope. Runtime semantics own default appearance behavior. [VERIFIED: .planning/phases/27-revolved-tool-spec-wasm-builder/27-CONTEXT.md]
- Stable post-revolve mapping must eventually come from OCCT generation history (`BRepPrimAPI_MakeRevol::Generated(...)`), not emitted face order. [VERIFIED: occt/src/BRepPrimAPI/BRepPrimAPI_MakeRevol.hxx] [VERIFIED: .planning/phases/27-revolved-tool-spec-wasm-builder/27-CONTEXT.md]
- Phase 27 stops at strict spec + validation + generated scene build. Retained exact generated models and stable face-binding semantics stay in Phase 28. [VERIFIED: .planning/ROADMAP.md] [VERIFIED: .planning/phases/27-revolved-tool-spec-wasm-builder/27-CONTEXT.md]
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TOOL-01 | Downstream JS can submit an app-neutral revolved tool spec defined by axis, profile start point, profile segments, and closure mode to the root Wasm runtime. | Add a strict typed spec surface in `dist/occt-js.d.ts`, parse it in a new root builder seam, and expose one validation API before OCCT geometry creation. |
| TOOL-02 | Downstream JS can describe revolved tool profiles with line segments, circular arcs, unit normalization, and full or partial revolve without app-specific schemas. | Use one normalized `XZ` profile contract with `line`, `arc_center`, and `arc_3pt`; build OCCT edges with `GC_MakeSegment` and `GC_MakeArcOfCircle`; revolve with `BRepPrimAPI_MakeRevol`. |
| TOOL-03 | Downstream JS receives typed validation diagnostics for malformed specs and revolve build failures. | Return one diagnostics array with stable `code`, `message`, and path/location hints from both validation and build-failure seams. |
| GEOM-01 | Downstream JS can build a generated revolved tool model that returns structured scene data compatible with existing `rootNodes`, `geometries`, `materials`, and stats consumers. | Reuse `TriangulateShape(...)`, `ExtractMeshFromShape(...)`, and `BuildResult(...)`-style scene DTO assembly so the new surface fits the shipped root consumer contract. |
</phase_requirements>

## Summary

Phase 27 should add one new narrow root seam for generated revolved tools instead of overloading the import pipeline. The repository already has the three pieces this phase needs:

- strict Embind-facing API registration and typed-array marshaling in `src/js-interface.cpp`, [VERIFIED: src/js-interface.cpp]
- reusable OCCT meshing and topology extraction in `src/importer-utils.cpp`, [VERIFIED: src/importer-utils.cpp]
- public root type and test-contract patterns in `dist/occt-js.d.ts`, `package.json`, and the existing root contract tests. [VERIFIED: dist/occt-js.d.ts] [VERIFIED: package.json] [VERIFIED: test/test_multi_format_exports.mjs]

The main gap is not meshing. The main gap is a strict profile contract and a safe builder pipeline between JS and OCCT:

1. normalize one app-neutral revolved profile spec,
2. validate geometry before touching OCCT,
3. build a closed planar profile wire/face in the `XZ` plane,
4. revolve around the `Z` axis,
5. triangulate and serialize into the existing scene DTO shape.

**Primary recommendation:** introduce a new internal seam such as `src/revolved-tool.hpp/.cpp` that owns spec DTOs, validation, profile-wire construction, revolve execution, and generated-tool metadata. Keep `src/js-interface.cpp` thin and reuse `TriangulateShape(...)` plus `ExtractMeshFromShape(...)` for the output path. Keep package wrappers and normalized package surfaces out of Phase 27. [VERIFIED: src/importer-utils.cpp] [VERIFIED: packages/occt-core/src/model-normalizer.js] [VERIFIED: .planning/ROADMAP.md]

## Current Code Facts

### Root DTO and binding seam

- `src/js-interface.cpp` already follows the house pattern for additive root methods: parse JS values, call a narrow C++ helper seam, serialize explicit DTOs, and register functions in `EMSCRIPTEN_BINDINGS(occtjs)`. [VERIFIED: src/js-interface.cpp]
- `BuildResult(...)` already returns the canonical root scene contract: `{ sourceFormat, rootNodes, geometries, materials, warnings, stats }`. [VERIFIED: src/js-interface.cpp]
- `dist/occt-js.d.ts` is tracked and hand-maintained; Wasm builds do not regenerate it. Any new generated-tool API must update this file directly. [VERIFIED: AGENTS.md] [VERIFIED: dist/occt-js.d.ts]

### Reusable meshing and topology extraction

- `TriangulateShape(TopoDS_Shape&, const ImportParams&)` already wraps `BRepMesh_IncrementalMesh` and handles unit-aware bounding-box-ratio deflection fallback. [VERIFIED: src/importer-utils.cpp]
- `ExtractMeshFromShape(const TopoDS_Shape&)` already emits faces, edges, vertices, and `triangleToFaceMap` in the root runtime topology shape. [VERIFIED: src/importer-utils.cpp]
- `OcctSceneData`, `OcctMeshData`, and related topology structs live in `src/importer.hpp`; generated-tool DTOs should extend this shared seam rather than inventing a parallel struct universe. [VERIFIED: src/importer.hpp]

### OCCT primitives already available in the vendored submodule

- `GC_MakeSegment` builds trimmed line segments from point pairs. [VERIFIED: occt/src/GC/GC_MakeSegment.hxx]
- `GC_MakeArcOfCircle` supports both three-point arcs and circle-based arc construction. [VERIFIED: occt/src/GC/GC_MakeArcOfCircle.hxx]
- `BRepBuilderAPI_MakeEdge`, `BRepBuilderAPI_MakeWire`, and `BRepBuilderAPI_MakeFace` are available for closed planar profile construction. [VERIFIED: occt/src/BRepBuilderAPI/BRepBuilderAPI_MakeEdge.hxx] [VERIFIED: occt/src/BRepBuilderAPI/BRepBuilderAPI_MakeWire.hxx] [VERIFIED: occt/src/BRepBuilderAPI/BRepBuilderAPI_MakeFace.hxx]
- `BRepPrimAPI_MakeRevol` provides the revolve kernel plus future history hooks (`Generated`, `FirstShape`, `LastShape`, `Degenerated`). [VERIFIED: occt/src/BRepPrimAPI/BRepPrimAPI_MakeRevol.hxx]

### Repo structure and command-routing facts

- `CMakeLists.txt` already globs `src/*.cpp` and `src/*.hpp`, so a new `src/revolved-tool.cpp` / `.hpp` pair will be auto-included without editing target lists. [VERIFIED: CMakeLists.txt]
- Root contract tests load the built runtime through `test/load_occt_factory.mjs`. Generated-tool contract tests should reuse that exact pattern instead of inventing a second harness. [VERIFIED: test/load_occt_factory.mjs]
- `npm test` and `npm run test:release:root` explicitly enumerate root contract files in `package.json`; new generated-tool contract tests should be routed there once the build surface exists. [VERIFIED: package.json]

### Package-boundary constraint

- `packages/occt-core/src/model-normalizer.js` normalizes only the current minimal face schema and currently drops any extra per-face fields. Generated-tool semantics therefore belong in an additive top-level metadata block during Phase 27, not as ad-hoc face fields. [VERIFIED: packages/occt-core/src/model-normalizer.js]

## Recommended Public API Direction

### Root validation surface

Recommended additive root API:

```ts
ValidateRevolvedToolSpec(spec: OcctJSRevolvedToolSpec): OcctJSRevolvedToolValidationResult;
```

Recommended validation result shape:

```ts
interface OcctJSRevolvedToolDiagnostic {
  code: string;
  message: string;
  path?: string;
  segmentIndex?: number;
  severity: "error";
}

interface OcctJSRevolvedToolValidationResult {
  ok: boolean;
  diagnostics: OcctJSRevolvedToolDiagnostic[];
}
```

Recommendation: use `ok` on validation results, matching the existing exact-query/lifecycle utility style rather than the scene-import `success` style. [VERIFIED: dist/occt-js.d.ts]

### Root build surface

Recommended additive root build API:

```ts
BuildRevolvedTool(
  spec: OcctJSRevolvedToolSpec,
  options?: OcctJSRevolvedToolBuildOptions
): OcctJSRevolvedToolBuildResult;
```

Recommended build-result direction:

- keep the existing scene contract fields (`success`, `error`, `rootNodes`, `geometries`, `materials`, `warnings`, `stats`)
- use a distinct `sourceFormat` string such as `"generated-revolved-tool"`
- add one top-level `generatedTool` metadata block
- keep deterministic face-binding semantics out of Phase 27; reserve `generatedTool` for normalized spec echo, segment descriptors, closure mode, and build facts only

### Recommended normalized spec shape

Recommended strict `v1` shape:

```ts
type OcctJSRevolvedToolUnits = "mm" | "inch";
type OcctJSRevolvedToolClosure = "explicit" | "auto_axis";
type OcctJSRevolvedToolSegmentKind = "line" | "arc_center" | "arc_3pt";

interface OcctJSRevolvedToolSpec {
  version?: 1;
  units: OcctJSRevolvedToolUnits;
  profile: {
    plane?: "XZ";
    start: [number, number]; // [radius, z]
    segments: OcctJSRevolvedToolSegment[];
    closure: OcctJSRevolvedToolClosure;
  };
  revolve?: {
    angleDeg?: number; // default 360
  };
}
```

Recommended split of responsibilities:

- `spec` owns geometry semantics: units, start point, ordered segments, closure mode, revolve angle
- `options` owns meshing knobs only: `linearDeflectionType`, `linearDeflection`, `angularDeflection`

This keeps the generated geometry contract separate from triangulation-quality controls while matching the existing repo pattern where meshing settings are not mixed into semantic DTOs. [VERIFIED: src/importer-utils.cpp] [VERIFIED: dist/occt-js.d.ts]

## Architecture Patterns

### Pattern 1: keep JS parsing thin and move generated-tool logic into its own C++ seam

**What:** `src/js-interface.cpp` already handles parsing/serialization, while exact math and orientation logic live in dedicated implementation files. [VERIFIED: src/js-interface.cpp] [VERIFIED: src/exact-query.cpp] [VERIFIED: src/orientation.cpp]

**Recommendation:** add a dedicated `src/revolved-tool.hpp/.cpp` seam for:

- normalized spec DTOs
- diagnostics creation
- validation helpers
- OCCT profile construction
- revolve execution
- generated-tool metadata assembly

Do not bury generated-tool logic directly inside `js-interface.cpp`.

### Pattern 2: reuse the existing root scene pipeline instead of inventing a second mesh/result format

**What:** the root runtime already has one canonical mesh topology DTO and one canonical scene result shape. [VERIFIED: src/importer.hpp] [VERIFIED: src/js-interface.cpp] [VERIFIED: test/test_multi_format_exports.mjs]

**Recommendation:** after the revolve shape is built, call the same meshing/extraction path used by imported geometry (`TriangulateShape` + `ExtractMeshFromShape`) and then package the result into one root node / one geometry scene payload. Keep the topology invariants identical to existing root outputs.

### Pattern 3: strict validation must happen before OCCT construction

**What:** OCCT can build edges/faces from bad geometry, but that yields ambiguous or unstable failures later. Existing exact-query code already favors explicit early failure over guessing. [VERIFIED: src/exact-query.cpp]

**Recommendation:** validate the entire normalized profile before constructing any OCCT edge:

- unsupported units
- non-finite coordinates
- negative radii
- zero-length line segments
- invalid arc-center radius mismatch
- collinear/degenerate `arc_3pt`
- non-closed explicit profiles
- invalid partial-revolve angle

Then treat OCCT kernel failures as explicit build diagnostics, not as silent null-shape fallthrough.

### Pattern 4: use a neutral material fallback in Phase 27

**What:** current root scene consumers expect renderable geometry and `materials` arrays. Imported models usually provide colors or appearance overrides; generated tools in this milestone do not take caller colors. [VERIFIED: src/js-interface.cpp] [VERIFIED: test/test_multi_format_exports.mjs]

**Recommendation:** emit one deterministic neutral tool color in Phase 27 so the generated scene remains immediately renderable. Reserve richer tag/role-driven grouping for Phase 28 and package-first appearance ergonomics for Phase 29.

### Pattern 5: reserve stable face bindings for Phase 28, but keep the metadata container now

**What:** stable post-revolve face mapping should use `BRepPrimAPI_MakeRevol::Generated(...)`, but that is not Phase 27 scope. [VERIFIED: occt/src/BRepPrimAPI/BRepPrimAPI_MakeRevol.hxx] [VERIFIED: .planning/ROADMAP.md]

**Recommendation:** Phase 27 should still create the additive `generatedTool` top-level block so later phases have a stable extension point. Keep it minimal in Phase 27: spec echo, segment list, closure mode, revolve angle, maybe build-time notes. Do not claim deterministic `faceBindings` yet.

## Clean 2-Plan Split

### 27-01 — Strict spec DTOs, diagnostics, and validation binding

- add public TypeScript types for the normalized revolved-tool spec and validation diagnostics
- add a root `ValidateRevolvedToolSpec(spec)` API
- add contract tests for strict validation behavior and explicit diagnostics
- keep the work root-only; no package wrapper work

### 27-02 — OCCT revolve build, scene export, and root command wiring

- add a root `BuildRevolvedTool(spec, options)` API
- build profile edges/wire/face, revolve them, triangulate, and serialize into the canonical root scene DTO shape
- add root contract tests for representative endmill-like and drill-like specs, full/partial revolve, neutral material fallback, and build-failure behavior
- wire the new contract tests into root command routing (`npm test` / `test:release:root`)

## Common Pitfalls

### Pitfall 1: pushing app-level schema ownership into the root runtime

That would violate the milestone boundary immediately.

**Avoidance:** the root runtime owns only one normalized geometry contract. Upstream apps adapt into it.

### Pitfall 2: storing generated-tool semantics on raw face DTOs in Phase 27

That conflicts with the current package normalizer and creates avoidable schema churn.

**Avoidance:** keep semantics top-level in `generatedTool` until Phase 29 normalizes the package surface intentionally.

### Pitfall 3: letting `auto_axis` closure silently invent the wrong silhouette

`auto_axis` is helpful, but it can hide profile mistakes if it is too permissive.

**Avoidance:** normalize `auto_axis` in one deterministic way only: connect the open profile to the axis with straight closure edges, and reject impossible or self-contradictory closure cases with diagnostics instead of “best effort” repair.

### Pitfall 4: relying on face order for future semantics

The repo already knows better from prior exact-helper work.

**Avoidance:** keep Phase 27 scene build free of face-order assumptions and explicitly reserve history-aware binding work for Phase 28.

### Pitfall 5: making package-first wrappers part of this phase

That would blur milestone boundaries and increase moving parts while the root contract is still forming.

**Avoidance:** keep Phase 27 root-first. `@tx-code/occt-core` stays Phase 29.

## Validation Architecture

| Property | Value |
|----------|-------|
| Framework | Node built-in test runner plus existing root npm script orchestration |
| Quick run command | `npm run build:wasm:win && node --test test/revolved_tool_spec_contract.test.mjs test/generated_revolved_tool_contract.test.mjs` |
| Full suite command | `npm run build:wasm:win && node --test test/revolved_tool_spec_contract.test.mjs test/generated_revolved_tool_contract.test.mjs && npm test` |

Wave 0 gaps:

- `test/revolved_tool_spec_contract.test.mjs` does not exist yet
- `test/generated_revolved_tool_contract.test.mjs` does not exist yet
- `src/revolved-tool.hpp/.cpp` does not exist yet
- `dist/occt-js.d.ts` has no revolved-tool spec/build typings yet
- `package.json` does not route generated-tool contract tests yet

## Sources

- `AGENTS.md`
- `.planning/PROJECT.md`
- `.planning/REQUIREMENTS.md`
- `.planning/ROADMAP.md`
- `.planning/STATE.md`
- `.planning/phases/27-revolved-tool-spec-wasm-builder/27-CONTEXT.md`
- `src/js-interface.cpp`
- `src/importer.hpp`
- `src/importer-utils.hpp`
- `src/importer-utils.cpp`
- `dist/occt-js.d.ts`
- `package.json`
- `test/load_occt_factory.mjs`
- `test/test_multi_format_exports.mjs`
- `packages/occt-core/src/model-normalizer.js`
- `CMakeLists.txt`
- `occt/src/GC/GC_MakeSegment.hxx`
- `occt/src/GC/GC_MakeArcOfCircle.hxx`
- `occt/src/BRepBuilderAPI/BRepBuilderAPI_MakeEdge.hxx`
- `occt/src/BRepBuilderAPI/BRepBuilderAPI_MakeWire.hxx`
- `occt/src/BRepBuilderAPI/BRepBuilderAPI_MakeFace.hxx`
- `occt/src/BRepPrimAPI/BRepPrimAPI_MakeRevol.hxx`

## Metadata

**Confidence breakdown:**

- API split and file placement: HIGH
- OCCT profile/revolve pipeline: HIGH
- additive generated-tool metadata shape: MEDIUM
- future face-binding path: HIGH for Phase 28 direction, intentionally deferred for Phase 27
