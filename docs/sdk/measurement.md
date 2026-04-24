# Exact Measurement and Helper SDK

This is the package-first SDK guide for exact measurement and shipped helper semantics in `occt-js`.

Downstream JS consumers should normally start with `@tx-code/occt-core`. The root Wasm carrier `@tx-code/occt-js` remains the lower-level reference surface and authoritative release boundary.

## Package-First Workflow

Create the adapter once, then open an exact model and build exact refs that carry:

- `exactModelId`
- `exactShapeHandle`
- `kind`
- `elementId`
- `transform`

```js
import OcctJS from "@tx-code/occt-js";
import occtWasmUrl from "@tx-code/occt-js/dist/occt-js.wasm?url";
import { createOcctCore } from "@tx-code/occt-core";

const core = createOcctCore({
  factory: OcctJS,
  wasmBinaryLoader: () => fetch(occtWasmUrl).then((response) => response.arrayBuffer()),
});

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
```

## Pairwise Measurement

The package-first adapter exposes the exact pairwise measurement primitives shipped in `v1.1`:

```js
const distance = await core.measureExactDistance(refA, refB);
const angle = await core.measureExactAngle(refA, refB);
const thickness = await core.measureExactThickness(refA, refB);
```

These calls return the numeric result plus supporting geometry such as attachment points, directions, or working-plane data where the runtime contract defines it.

## Placement Helpers

Placement helpers are the `v1.4` addition that keeps downstream overlay code from re-deriving `PrsDim` style anchors and frames:

```js
const distancePlacement = await core.suggestExactDistancePlacement(refA, refB);
const anglePlacement = await core.suggestExactAnglePlacement(refA, refB);
const thicknessPlacement = await core.suggestExactThicknessPlacement(refA, refB);

const radiusPlacement = await core.suggestExactRadiusPlacement({
  ...refA,
  kind: "edge",
  elementId: 7,
});

const diameterPlacement = await core.suggestExactDiameterPlacement({
  ...refA,
  kind: "edge",
  elementId: 7,
});
```

Placement results expose:

- `kind`
- `frame`
- `anchors`
- optional `axisOrigin` and `axisDirection`

The runtime stops there. Overlay rendering, label layout, and measurement widgets remain downstream concerns.

## Relation Classification

The relation classifier lets apps ask for exact analytic relations without embedding OCCT-specific logic in app code:

```js
const relation = await core.classifyExactRelation(refA, refB);

if (relation.ok && relation.kind !== "none") {
  console.log(relation.kind);
  console.log(relation.frame);
  console.log(relation.anchors);
}
```

Supported relation kinds are:

- `parallel`
- `perpendicular`
- `concentric`
- `tangent`
- `none`

`none` is a valid successful result for supported geometry that simply does not satisfy one of the named relations. Invalid refs or unsupported geometry still return explicit typed failures.

## Shipped Helper Family

Phase `v1.6` extends the package-first SDK with a narrow helper family that builds on the shipped measurement, placement, and relation surfaces:

```js
const hole = await core.describeExactHole(refA);
const chamfer = await core.describeExactChamfer(refA);
const midpoint = await core.suggestExactMidpointPlacement(refA, refB);
const equalDistance = await core.describeExactEqualDistance(refA, refB, refC, refD, {
  tolerance: 0.01,
});
const symmetry = await core.suggestExactSymmetryPlacement(refA, refB);
```

Those helpers divide into two buckets:

- carrier-backed wrappers: `describeExactHole(ref)` and `describeExactChamfer(ref)`
- package-first compositions: `suggestExactMidpointPlacement(refA, refB)`, `describeExactEqualDistance(refA, refB, refC, refD, options?)`, and `suggestExactSymmetryPlacement(refA, refB)`

The shipped helper boundaries stay intentionally narrow:

- `describeExactHole(ref)` only recognizes a supported cylindrical hole from a circular edge ref or cylindrical face ref.
- `describeExactChamfer(ref)` only recognizes a supported planar chamfer face ref.
- `suggestExactSymmetryPlacement(refA, refB)` is a midplane-style symmetry helper for supported parallel pairs.
- `suggestExactMidpointPlacement(...)` and `describeExactEqualDistance(...)` stay package-first compositions over the shipped placement and pairwise measurement primitives.

The shipped browser demo consumes the same measurement and helper methods as a simplified integration sample, but supported exact action routing, overlay rendering, and current-result session behavior remain downstream app concerns rather than package APIs. For the current `v1.13` CAM sample, demo-owned workflow names (`clearance / step depth`, `center-to-center`, and `surface-to-center`) compose over shipped exact primitives instead of becoming package API names.

## Lifecycle and Performance Discipline

For retained exact models, package-first lifecycle management should use managed wrappers:

```js
const managed = await core.openManagedExactModel(stepBytes, {
  fileName: "part.step",
});

try {
  const diagnostics = await core.getExactModelDiagnostics();
  console.log(diagnostics.liveExactModelCount);
  // run measurement/helper calls
} finally {
  await managed.dispose();
}
```

Lifecycle contract notes:

- explicit `dispose()` / `ReleaseExactModel(...)` is the authoritative cleanup path
- `FinalizationRegistry` behavior is best-effort fallback only and is not guaranteed cleanup
- released handles should keep returning typed `released-handle` failures

Performance-sensitive downstream workflows should run explicit verification lanes from the repository root:

- `npm run test:perf:exact` for repeatable perf visibility
- `npm run test:soak:exact` for long-session lifecycle/perf soak evidence

These commands are maintainers' verification lanes and remain separate from the authoritative `npm run test:release:root` gate.

## Lower-Level Root Reference

If you need direct access to the carrier, the root Wasm module exposes:

- `MeasureExactDistance`
- `MeasureExactAngle`
- `MeasureExactThickness`
- `SuggestExactDistancePlacement`
- `SuggestExactAnglePlacement`
- `SuggestExactThicknessPlacement`
- `SuggestExactRadiusPlacement`
- `SuggestExactDiameterPlacement`
- `ClassifyExactRelation`
- `DescribeExactHole`
- `DescribeExactChamfer`

This lower-level reference stays additive to the package-first SDK. Most downstream JS should still use `@tx-code/occt-core` unless it needs direct retained-model orchestration.

## Boundary

This SDK intentionally stops at exact measurement DTOs and the shipped narrow helper family.

Downstream concerns include:

- overlay rendering
- selection UX
- label layout
- viewer policy
- richer feature discovery beyond the shipped helper family

The authoritative release gate for this contract remains `npm run test:release:root` from the repository root.
