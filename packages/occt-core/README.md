# @tx-code/occt-core

Engine-agnostic adapter layer on top of `@tx-code/occt-js`.

## What It Provides

- Unified `importModel` API (`step` / `iges` / `brep`)
- Works with both format-specific exports (`ReadStepFile`/`ReadIgesFile`/`ReadBrepFile`) and generic `ReadFile(format, ...)`
- Result normalization for both `occt-js` and `occt-import-js` style payloads
- Canonical scene graph with deduplicated geometry/material data
- Shared `Profile2D` validation and generated profile-solid wrappers above the shipped root runtime contract

## Install

```bash
npm install @tx-code/occt-js @tx-code/occt-core
```

## Quick Example

```js
import OcctJS from "@tx-code/occt-js";
import occtWasmUrl from "@tx-code/occt-js/dist/occt-js.wasm?url";
import { createOcctCore } from "@tx-code/occt-core";

const core = createOcctCore({
  factory: OcctJS,
  wasmBinaryLoader: () => fetch(occtWasmUrl).then((response) => response.arrayBuffer()),
});

const model = await core.importModel(stepBytes, {
  fileName: "part.step",
  importParams: {
    appearancePreset: "cad-ghosted",
    rootMode: "one-shape",
    linearDeflectionType: "bounding_box_ratio",
    linearDeflection: 0.001,
    angularDeflection: 0.5,
    readNames: true,
    colorMode: "default",
    defaultColor: [51, 102, 153],
    defaultOpacity: 0.5,
  },
});
```

Notes:

- `createOcctCore(...)` stays package-first and engine-agnostic. It does not require Babylon or any repo-local demo layer.
- Pass `format` explicitly when you already know it, or pass `fileName` and let `occt-core` infer the format from the extension.
- Use `wasmBinary` when you already have the bytes in memory, or `wasmBinaryLoader` when the adapter should fetch them lazily.
- Root release verification is driven by `npm run test:release:root` from the repository root; demo, Babylon, and Tauri checks remain conditional secondary-surface verification.
- Run `npm run test:planning:audit` separately only when you intentionally want to verify `.planning/` milestone/archive consistency; it is not part of the authoritative root release gate.

## Import Appearance Contract

`@tx-code/occt-core` forwards the root runtime appearance contract in package-first form:

```js
const model = await core.importModel(stepBytes, {
  fileName: "part.step",
  importParams: {
    appearancePreset: "cad-ghosted",
    colorMode: "default",
    defaultColor: [51, 102, 153],
    defaultOpacity: 0.5,
  },
});
```

Contract rules:

- `appearancePreset: "cad-solid"` forwards the built-in CAD base appearance as an opaque default import style.
- `appearancePreset: "cad-ghosted"` forwards the built-in ghost preset, which uses the built-in CAD base color plus ghost opacity `0.35` until explicit overrides are supplied.
- `colorMode: "source"` preserves imported source colors.
- `colorMode: "default"` requests one default CAD color for the imported result.
- If `defaultColor` is omitted in default mode, the built-in fallback is `[0.9, 0.91, 0.93]`.
- If `defaultOpacity` is omitted, preset-derived opacity is preserved when present; otherwise the default appearance stays opaque.
- `readColors` is still accepted as a legacy toggle, but only when `colorMode` is omitted.
- `@tx-code/occt-core` normalizes tuple/object `defaultColor` input before forwarding the canonical root contract.
- If `defaultOpacity` is omitted but `defaultColor` carries alpha or opacity, `@tx-code/occt-core` promotes that alpha channel into the canonical root `defaultOpacity`.
- Explicit `defaultOpacity` wins over any alpha promoted from `defaultColor`.

Apps own settings persistence, and `@tx-code/occt-core` only consumes the chosen import-time appearance options.
Viewer overrides remain downstream concerns; the adapter does not own repaint, theme switching, or post-import display policy.

## Shared Profile and Extruded Shape SDK

`@tx-code/occt-core` exposes package-first wrappers for the shared `Profile2D` validator and additive generated-extruded-shape runtime surface:

```js
const profile = {
  version: 1,
  start: [0, 0],
  segments: [
    { kind: "line", id: "base", tag: "base", end: [6, 0] },
    { kind: "line", id: "right-wall", tag: "wall", end: [6, 10] },
    { kind: "line", id: "top", tag: "cap", end: [0, 10] },
    { kind: "line", id: "left-wall", tag: "wall", end: [0, 0] },
  ],
};

const profileValidation = await core.validateProfile2DSpec(profile);

const extrudedSpec = {
  version: 1,
  units: "mm",
  profile,
  extrusion: { depth: 24 },
};

const extrudedValidation = await core.validateExtrudedShapeSpec(extrudedSpec);
const built = await core.buildExtrudedShape(extrudedSpec, {
  linearDeflectionType: "bounding_box_ratio",
  linearDeflection: 0.001,
  angularDeflection: 0.5,
});
const exact = await core.openExactExtrudedShape(extrudedSpec);
```

Profile-solid wrapper rules:

- `validateProfile2DSpec(profile)` forwards the typed shared-profile validation lane unchanged.
- `validateExtrudedShapeSpec(spec)` forwards the strict extruded validation lane unchanged.
- `buildExtrudedShape(spec, options?)` returns the root `generated-extruded-shape` payload, including `extrudedShape.faceBindings` and runtime-owned wall/cap appearance grouping.
- `openExactExtrudedShape(spec, options?)` returns the retained exact payload for the same generated solid.
- `normalizeOcctResult(...)` and `normalizeExactOpenResult(...)` preserve additive `generated-extruded-shape` metadata when callers want canonical `geometryId` / `nodeId` attachment on top of raw root payloads.
- Upstream apps still own tool-library schemas, vendor adapters, and any translation into shared `Profile2D` or extruded-shape specs.

`@tx-code/occt-core` also mirrors the generic helical sweep lane exposed by the root runtime:

```js
const helicalSpec = {
  version: 1,
  units: "mm",
  helix: {
    radius: 8,
    pitch: 3,
    turns: 4,
    handedness: "right",
  },
  section: {
    kind: "circle",
    radius: 0.8,
    segments: 24,
  },
};

const helicalValidation = await core.validateHelicalSweepSpec(helicalSpec);
const helicalBuilt = await core.buildHelicalSweep(helicalSpec, {
  linearDeflectionType: "bounding_box_ratio",
  linearDeflection: 0.001,
  angularDeflection: 0.5,
});
const helicalExact = await core.openExactHelicalSweep(helicalSpec);
```

Generic helical sweep wrapper rules:

- `validateHelicalSweepSpec(spec)` forwards the typed helical sweep validation lane unchanged.
- `buildHelicalSweep(spec, options?)` returns the root `generated-helical-sweep` payload, including additive `helicalSweep.faceBindings`.
- `openExactHelicalSweep(spec, options?)` returns retained exact handles for the same generated helical sweep.

## Generic Composite Shape SDK

`@tx-code/occt-core` also exposes package-first wrappers for generic boolean composition over generated operands:

```js
const compositeSpec = {
  version: 1,
  units: "mm",
  seed: {
    family: "revolved",
    spec,
  },
  steps: [
    {
      op: "cut",
      operand: {
        family: "helical-sweep",
        spec: helicalSpec,
      },
    },
  ],
};

const compositeValidation = await core.validateCompositeShapeSpec(compositeSpec);
const compositeBuilt = await core.buildCompositeShape(compositeSpec, {
  linearDeflectionType: "bounding_box_ratio",
  linearDeflection: 0.001,
  angularDeflection: 0.5,
});
const compositeExact = await core.openExactCompositeShape(compositeSpec);
```

Generic composite-shape wrapper rules:

- `validateCompositeShapeSpec(spec)` validates a generic seed + boolean-step pipeline over `revolved`, `extruded`, and `helical-sweep` operands.
- `buildCompositeShape(spec, options?)` returns the root `generated-composite-shape` payload with additive `compositeShape` metadata.
- `openExactCompositeShape(spec, options?)` returns retained exact handles for the same generated composite body.

## Generated Revolved Shape SDK

`@tx-code/occt-core` also exposes package-first wrappers for the generated revolved-shape Wasm surface:

```js
const spec = {
  version: 1,
  units: "mm",
  profile: {
    plane: "XZ",
    start: [0, 0],
    closure: "explicit",
    segments: [
      { kind: "line", id: "tip", tag: "tip", end: [3, 0] },
      { kind: "line", id: "flute", tag: "cutting", end: [3, 12] },
      { kind: "line", id: "axis-top", tag: "closure", end: [0, 12] },
      { kind: "line", id: "axis-bottom", tag: "closure", end: [0, 0] },
    ],
  },
  revolve: { angleDeg: 360 },
};

const validation = await core.validateRevolvedShapeSpec(spec);
const built = await core.buildRevolvedShape(spec, {
  linearDeflectionType: "bounding_box_ratio",
  linearDeflection: 0.001,
  angularDeflection: 0.5,
});
const exact = await core.openExactRevolvedShape(spec);
```

Generated revolved-shape wrapper rules:

- `validateRevolvedShapeSpec(spec)` forwards the typed validation lane and returns the root validation DTO unchanged.
- `buildRevolvedShape(spec, options?)` forwards the generated scene build lane and returns the root revolved-shape payload, including `revolvedShape.faceBindings` and semantic face colors.
- `openExactRevolvedShape(spec, options?)` forwards the retained exact-open lane and returns the root exact payload, including `exactModelId` and `exactGeometryBindings`.
- These wrappers stay package-first but intentionally do not invent a second revolved-shape DTO layer on top of the root runtime contract.

## Exact Measurement and Helper SDK

`@tx-code/occt-core` keeps exact measurement and helper semantics package-first by wrapping the root Wasm carrier's retained exact-model APIs and occurrence transforms:

```js
const rawExact = await core.openExactStep(stepBytes, {
  fileName: "part.step",
});

const refA = {
  exactModelId: rawExact.exactModelId,
  exactShapeHandle: rawExact.exactGeometryBindings[0].exactShapeHandle,
  kind: "face",
  elementId: 1,
  transform: [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ],
};
const refB = { ...refA, elementId: 2 };

const distance = await core.measureExactDistance(refA, refB);
const placement = await core.suggestExactDistancePlacement(refA, refB);
const relation = await core.classifyExactRelation(refA, refB);
```

Available package-first measurement and helper surfaces:

- `measureExactDistance(refA, refB)`, `measureExactAngle(refA, refB)`, and `measureExactThickness(refA, refB)`
- `suggestExactDistancePlacement(refA, refB)`, `suggestExactAnglePlacement(refA, refB)`, and `suggestExactThicknessPlacement(refA, refB)`
- `suggestExactRadiusPlacement(ref)` and `suggestExactDiameterPlacement(ref)`
- `classifyExactRelation(refA, refB)`
- `describeExactHole(ref)` and `describeExactChamfer(ref)`
- `suggestExactMidpointPlacement(refA, refB)`, `describeExactEqualDistance(refA, refB, refC, refD, options?)`, and `suggestExactSymmetryPlacement(refA, refB)`

These helpers keep occurrence transforms explicit and return package-friendly DTOs:

- pairwise measurements return numeric results plus supporting points or axes
- placement helpers return stable anchors and working-plane frames
- relation classification returns `parallel`, `perpendicular`, `concentric`, `tangent`, or `none`
- helper wrappers and package-only compositions keep the same ref/frame/anchor vocabulary instead of inventing a second viewer API

Shipped helper boundaries stay intentionally narrow:

- `describeExactHole(ref)` only recognizes a supported cylindrical hole from a circular edge ref or cylindrical face ref.
- `describeExactChamfer(ref)` only recognizes a supported planar chamfer face ref.
- `suggestExactSymmetryPlacement(refA, refB)` is a midplane-style symmetry helper for supported parallel pairs.
- `suggestExactMidpointPlacement(...)` and `describeExactEqualDistance(...)` stay package-first compositions over the shipped placement and pairwise measurement primitives.

If you need the raw carrier directly, the underlying root Wasm entrypoints are `MeasureExactDistance`, `MeasureExactAngle`, `MeasureExactThickness`, `SuggestExactDistancePlacement`, `SuggestExactAnglePlacement`, `SuggestExactThicknessPlacement`, `SuggestExactRadiusPlacement`, `SuggestExactDiameterPlacement`, `ClassifyExactRelation`, `DescribeExactHole`, and `DescribeExactChamfer`.

For a longer package-first walkthrough, see [`docs/sdk/measurement.md`](../../docs/sdk/measurement.md).
The downstream browser demo remains a simplified integration sample and keeps supported exact action routing, overlay rendering, and current-result session behavior in app code without turning those UI decisions into package behavior. For the current `v1.13` CAM sample, demo-owned workflow names (`clearance / step depth`, `center-to-center`, and `surface-to-center`) compose over shipped exact primitives and do not become package API names.

## Exact Lifecycle and Performance Guidance

`@tx-code/occt-core` is the package-first lifecycle surface for retained exact models:

```js
const managed = await core.openManagedExactModel(stepBytes, {
  fileName: "part.step",
});

try {
  const diagnostics = await core.getExactModelDiagnostics();
  console.log(diagnostics.liveExactModelCount);

  // measure/classify/helper calls using managed.exactModel refs
} finally {
  await managed.dispose();
}
```

Lifecycle ownership rules:

- `dispose()` is deterministic and authoritative for cleanup in package-first code.
- Root lower-level APIs (`RetainExactModel`, `ReleaseExactModel`, `GetExactModelDiagnostics`) remain the source-of-truth carrier contract.
- `FinalizationRegistry` fallback is best-effort only and must not be treated as guaranteed cleanup.
- released handles must still be expected to return typed `released-handle` failures by contract.

Performance-sensitive verification lanes (from repository root):

- `npm run test:perf:exact` — explicit perf visibility lane
- `npm run test:soak:exact` — explicit long-session lifecycle/perf soak lane

These lanes are optional maintainer verification and stay outside the authoritative `npm run test:release:root` gate.

Richer feature discovery, overlay rendering, selection UX, label layout, and app-owned viewer policy remain downstream concerns. `@tx-code/occt-core` stays at the adapter boundary and does not require Babylon, viewer widgets, or demo-local code.
