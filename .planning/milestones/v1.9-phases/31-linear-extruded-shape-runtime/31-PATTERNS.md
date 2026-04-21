# Phase 31: Linear Extruded Shape Runtime - Pattern Map

**Mapped:** 2026-04-21  
**Files analyzed:** 13 scoped files  
**Analogs found:** 12 / 13

Phase 31 is a parallel generated-family addition rather than a greenfield system. The repository already has the exact profile-kernel, generated-scene, exact-open, and semantic-metadata patterns needed; the work is to apply them to a new extrusion family cleanly.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/extruded-shape.hpp` / `src/extruded-shape.cpp` | new family adapter | `ExtrudedShapeSpec` -> shared profile kernel -> OCCT prism build -> generated scene / exact metadata | `src/revolved-tool.hpp` / `src/revolved-tool.cpp` | exact |
| `src/importer.hpp` | shared DTO/type seam | extruded DTOs + shared generated metadata -> JS serialization | current generated revolved / profile DTO blocks | exact |
| `src/js-interface.cpp` | Embind export surface | additive extruded validate/build/openExact bindings -> canonical result payload | existing generated revolved bindings | exact |
| `dist/occt-js.d.ts` | published root type surface | shared profile + extruded family typings | current revolved-shape and shared-profile typings | exact |
| `package.json` | root contract routing | new extruded root tests -> `npm test` / release gate | current generated revolved test routing | exact |
| `test/extruded_shape_spec_contract.test.mjs` | new root validation contract | built runtime -> additive extruded validator | `test/revolved_tool_spec_contract.test.mjs` | exact |
| `test/generated_extruded_shape_contract.test.mjs` | generated-scene regression suite | built runtime -> canonical scene + topology + semantic metadata | `test/generated_revolved_tool_contract.test.mjs` | exact |
| `test/exact_generated_extruded_shape_contract.test.mjs` | exact-open regression suite | built runtime -> retained exact extruded shapes + representative exact families | `test/exact_generated_revolved_tool_contract.test.mjs` | exact |
| `src/profile-2d.hpp` / `src/profile-2d.cpp` | shared dependency | closed profile validation + normalized segments | existing files from Phase 30 | exact |
| `src/importer-utils.cpp` | shared build helper | exact shape -> triangulation / mesh extraction | existing generated-family build pattern | exact |
| `src/exact-model-store.*` | shared lifecycle helper | exact generated shape -> retained exact model registration | existing exact-open family pattern | exact |
| `occt/src/BRepPrimAPI/BRepPrimAPI_MakePrism.hxx` | OCCT construction primitive | planar profile face -> finite prism + history | no current in-repo usage, but exact OCCT family analog to `BRepPrimAPI_MakeRevol` | partial |
| `packages/occt-core/*` | downstream wrapper surface | extruded family wrappers eventually mirrored in Phase 32 | current revolved family wrapper surface | partial |

## Pattern Assignments

### `src/extruded-shape.hpp` / `src/extruded-shape.cpp`

**Scope:** Required.  
**Analog:** `src/revolved-tool.hpp` / `src/revolved-tool.cpp`.

Planner note: keep this a dedicated family adapter over the shared `Profile2D` kernel. Do not bury extrusion logic back into `src/revolved-tool.cpp`, and do not widen it into generic sweep/feature infrastructure.

---

### `src/importer.hpp`

**Scope:** Required.  
**Analog:** current shared/profile/revolved DTO blocks.

Planner note: add additive extruded DTOs and metadata in the same style as the existing generated-family results. If generic generated-shape helper structs are extracted, keep the public family result blocks explicit.

---

### `src/js-interface.cpp`

**Scope:** Required.  
**Analog:** current `ValidateRevolvedShapeSpec`, `BuildRevolvedShape`, and `OpenExactRevolvedShape` binding rhythm.

Planner note: add one thin binding layer for extruded validate/build/openExact methods and attach `extrudedShape` metadata exactly the same additive way `revolvedShape` metadata is attached today.

---

### `dist/occt-js.d.ts`

**Scope:** Required.  
**Analog:** current shared-profile + revolved-shape typing surface.

Planner note: Phase 31 should publish explicit extruded-family typings rather than hiding them behind generic `any` payloads or reusing revolved names.

---

### Root contract tests

**Scope:** Required.  
**Analog 1:** `test/revolved_tool_spec_contract.test.mjs` for family validation.  
**Analog 2:** `test/generated_revolved_tool_contract.test.mjs` for generated-scene semantics.  
**Analog 3:** `test/exact_generated_revolved_tool_contract.test.mjs` for exact-open and representative exact-family mapping.

Planner note: copy the overall testing shape, not the specific roles. Extruded-family tests should speak in `wall`, `start_cap`, and `end_cap` semantics.

## Shared Patterns

### Additive family APIs are explicit

The repo prefers explicit generated-family entrypoints over overloaded routers. `ValidateExtrudedShapeSpec`, `BuildExtrudedShape`, and `OpenExactExtrudedShape` should be direct root exports.

### Exact-open is build-first then register

Generated families do not own separate exact construction paths. Build once, then reuse the exact shape for retained exact registration.

### Semantic metadata stays top-level

Stable bindings and semantic appearance live in additive family metadata (`revolvedShape` today). Extruded semantics should follow the same pattern with `extrudedShape`, not mutate the canonical mesh/face DTO shape.

### Root scripts are authoritative and explicit

Contract tests only matter if `package.json` routes them through `npm test` and `npm run test:release:root`. New extruded tests must be wired in explicitly.

### Shared profile kernel remains family-neutral

Extruded plans should consume `Profile2D` as-is. No family-specific closure or cap semantics should leak back into `src/profile-2d.cpp`.

## No Analog Found

There is no existing in-repo additive family for linear profile extrusion yet. The only intentionally new pattern in Phase 31 is the exact DTO/metadata shape for `generated-extruded-shape`.

## Metadata

**Analog search scope:** `src/profile-2d.hpp`, `src/profile-2d.cpp`, `src/revolved-tool.hpp`, `src/revolved-tool.cpp`, `src/importer.hpp`, `src/js-interface.cpp`, `src/importer-utils.cpp`, `src/exact-model-store.hpp`, `dist/occt-js.d.ts`, `package.json`, `test/revolved_tool_spec_contract.test.mjs`, `test/generated_revolved_tool_contract.test.mjs`, `test/exact_generated_revolved_tool_contract.test.mjs`, `occt/src/BRepPrimAPI/BRepPrimAPI_MakePrism.hxx`
