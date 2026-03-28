# Optimal Orientation Analysis Design

Date: 2026-03-28
Status: Approved design
Repository: `occt-js`
Target branch: `feature/occtjs-core-next`

## Goal

Add a C++/Wasm orientation-analysis API to `occt-js` for single-part CAD models so downstream Babylon consumers can request a manufacturing-oriented "auto upright" transform without reimplementing OCCT-level geometry reasoning in JavaScript.

The target use case is:

- single part
- `STEP`, `IGES`, or `BREP`
- sheet-metal, boxy, and prismatic machined parts
- Babylon-based downstream consumers such as `imos-app/viewer-babylon`

The API should expose a recommended transform and diagnostics. It should not silently mutate the existing import path.

## Problem Statement

The current `occt-js` API can import CAD data and expose triangulation plus topology-oriented scene payloads, but it does not expose an algorithm for determining a manufacturing-friendly part orientation.

For simple viewer UX, a downstream application can derive a rough orientation from mesh data. That is not sufficient for a result comparable to AnalysisSitus.

The AnalysisSitus reference implementation does not treat orientation as a pure mesh problem. Its algorithm first reasons over exact B-Rep geometry and only then uses projection-based refinement:

- `asiAlgo_OrientCnc` inspects planar and cylindrical faces, areas, and candidate machining axes
- `asiAlgo_FindOptimalOrientation` then refines rotation around `Z` using discrete HLR projection and a minimum-area rectangle

Relevant references:

- [asiAlgo_OrientCnc.cpp](E:/Coding/AnalysisSitus/src/asiAlgo/auxiliary/asiAlgo_OrientCnc.cpp)
- [asiAlgo_FindOptimalOrientation.cpp](E:/Coding/AnalysisSitus/src/asiAlgo/auxiliary/asiAlgo_FindOptimalOrientation.cpp)
- [features_smru-orientation.html](E:/Coding/AnalysisSitus/docs/www/featuresext/features_smru-orientation.html)

If `occt-js` leaves this entirely to JavaScript, downstream code must either:

- accept a weaker mesh-only heuristic, or
- re-export substantial exact geometry metadata and rebuild the decision logic outside OCCT

Both are inferior to running the core analysis in C++ on top of the original `TopoDS_Shape`.

## Scope

This design covers:

- a new Wasm-facing orientation-analysis API
- `STEP`, `IGES`, and `BREP` single-part inputs
- single-root / `one-shape` workflows only
- a manufacturing-oriented orientation mode
- a structured result payload containing transform, local frame, bounding-box extents, and diagnostics

This design does not cover:

- `multiple-shapes` or assembly-wide orientation
- automatic mutation of `ReadFile` / `ReadStepFile` / `ReadIgesFile` / `ReadBrepFile`
- Babylon runtime code
- point-cloud or mesh-native formats
- full replication of every AnalysisSitus orientation rule

## Why This Belongs In C++

This feature should live in the C++/OCCT layer because the decisive inputs are exact B-Rep properties:

- planar face detection
- cylindrical face detection
- exact face area
- plane normal / placement
- cylinder axis
- projection and HLR-based 2D refinement

Those capabilities already exist naturally at the OCCT level. Rebuilding them in JavaScript would either:

- lose precision by working from tessellation only, or
- force `occt-js` to expose a much larger geometry-metadata payload than necessary

For this feature, `occt-js` should provide the algorithm, not merely the raw ingredients.

## Reference Behavior In AnalysisSitus

The AnalysisSitus workflow relevant to this design has two main stages.

### Stage 1: Identify A Machining-Oriented Axis

`asiAlgo_OrientCnc`:

- computes a characteristic scale from the part bounding volume
- collects planar faces whose area exceeds a relative threshold
- collects cylindrical face axes
- sorts planar candidates by area
- prefers the largest planar candidate that has supporting parallel cylinder axes
- otherwise falls back to the most common cylinder axis
- aligns the detected axis to global `Z`

This stage is the key reason the algorithm is not a pure mesh heuristic.

### Stage 2: Refine Rotation Around Z

`asiAlgo_FindOptimalOrientation` then:

- applies the first-stage transform
- ensures triangulation exists
- builds a discrete HLR projection of the oriented part onto `XOY`
- discretizes the projected edges into 2D points
- computes a minimum-area rectangle using rotating calipers
- applies the resulting rotation around `Z`

This makes the final in-plane orientation tighter and more stable for flat or quasi-flat parts.

### Local Reference Frame

AnalysisSitus also reports a local reference frame derived from the oriented bounding box:

- `X` = longest box direction
- `Y` = medium direction
- `Z` = shortest direction

That convention should be reflected in the `occt-js` result contract.

## Recommended API

Add a new top-level Wasm API alongside the existing read functions:

```ts
AnalyzeOptimalOrientation(
  format: "step" | "iges" | "brep",
  content: Uint8Array,
  params?: OcctJSOrientationParams
): OcctJSOrientationResult;
```

This is intentionally separate from `Read*`:

- `Read*` imports CAD and returns structured scene data
- `AnalyzeOptimalOrientation` computes a recommended orientation transform

The orientation algorithm should not run implicitly during every import.

## Input Parameters

Keep the first version narrow:

```ts
interface OcctJSOrientationParams {
  linearUnit?: "millimeter" | "centimeter" | "meter" | "inch" | "foot";
  mode?: "manufacturing";
  presetAxis?: {
    origin: [number, number, number];
    direction: [number, number, number];
  };
}
```

Notes:

- `mode` exists to reserve space for future variants, but the only supported mode in v1 is `"manufacturing"`
- `presetAxis` mirrors the preset-axis concept in AnalysisSitus and allows constrained turning scenarios
- implementation thresholds should remain internal in v1

Do not expose algorithm tuning knobs yet:

- area thresholds
- HLR sampling tolerances
- min-area-rectangle tolerances
- per-stage enable/disable switches

## Output Contract

Return a structured result rather than a bare matrix.

```ts
interface OcctJSOrientationResult {
  success: boolean;
  error?: string;
  transform?: number[];
  localFrame?: {
    origin: [number, number, number];
    xDir: [number, number, number];
    yDir: [number, number, number];
    zDir: [number, number, number];
  };
  bbox?: {
    dx: number;
    dy: number;
    dz: number;
  };
  strategy?: string;
  stage1?: {
    baseFaceId?: number;
    usedCylinderSupport: boolean;
    detectedAxis: [number, number, number];
  };
  stage2?: {
    rotationAroundZDeg: number;
  };
  confidence?: number;
}
```

### Required Semantics

- `transform`
  - column-major 4x4 matrix to stay aligned with the existing Babylon-facing contract
- `localFrame`
  - the recommended part-local reference frame after orientation analysis
- `bbox`
  - extents in that local frame
- `strategy`
  - short explanation of which path won, for example:
    - `planar-base-with-cylinder-support`
    - `dominant-cylinder-axis`
    - `projected-min-area-rect`
- `confidence`
  - coarse quality indicator in `[0, 1]`

The diagnostics are not optional design flourishes. They make the result testable and explainable.

## Implementation Direction

The implementation should remain internal to the OCCT/C++ layer and should not require the caller to import the model first.

Recommended shape:

1. Parse bytes to `TopoDS_Shape` using the existing import readers
2. Normalize to the single-part / `one-shape` path
3. Run a new orientation-analysis routine modeled on the AnalysisSitus flow
4. Return the computed transform and diagnostics through Embind

### Internal Structure

Introduce a dedicated C++ orientation module rather than burying this inside the importers.

Expected shape:

- `src/orientation.hpp`
- `src/orientation.cpp`
- optional small format-specific helpers if needed

Responsibilities:

- import the source bytes into a shape
- compute manufacturing-oriented orientation
- compute the local frame and extents
- package diagnostics for JS

`js-interface.cpp` should only parse params and marshal the result.

## First-Phase Algorithm Boundary

The first implementation should cover the core AnalysisSitus path but not every special case.

### Include In Phase 1

- planar candidate detection
- exact face-area ranking
- cylindrical-axis support
- fallback to dominant cylinder axis
- first-stage alignment to `Z`
- discrete HLR projection
- minimum-area rectangle refinement around `Z`
- local-frame and oriented-bbox reporting

### Exclude From Phase 1

- assembly-level orientation
- `multiple-shapes`
- dedicated sheet-metal straight-edge validation rules
- full feature-recognizer integration
- advanced user-tunable heuristics

This boundary keeps the first version focused while still being meaningfully comparable to the reference algorithm.

## Testing

Testing should happen in the root Wasm/runtime layer.

Add focused coverage for:

- `STEP` single part returns `success: true`
- `IGES` single part returns `success: true`
- `BREP` single part returns `success: true`
- planar/prismatic fixtures produce a stable non-identity orientation when tilted
- already aligned fixtures produce either identity or near-identity transforms
- `presetAxis` changes the admissible result path
- returned `bbox.dx >= bbox.dy >= bbox.dz`
- `localFrame` directions are orthonormal within tolerance
- `strategy` and `stage1/stage2` fields are populated consistently

The AnalysisSitus-derived fixtures already added under `test/` are the right place to start.

## Non-Goals

- No automatic application of the transform inside existing import functions
- No Babylon scene mutation utilities in the root package
- No point-cloud orientation support
- No mesh-only fallback API in this phase

## Why This Direction

This design keeps `occt-js` aligned with its intended role:

- a CAD/B-Rep runtime built on OCCT
- a stable Wasm boundary for downstream Babylon consumers
- not a viewer framework

At the same time, it prevents downstream Babylon code from having to reconstruct a manufacturing-oriented orientation algorithm from incomplete scene data.

The result is a cleaner split:

- `occt-js` computes exact orientation guidance from CAD geometry
- `viewer-babylon` decides whether and how to apply that guidance in the user experience
