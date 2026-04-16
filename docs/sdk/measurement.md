# Exact Measurement SDK

This is the package-first SDK guide for exact measurement in `occt-js`.

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

This lower-level reference stays additive to the package-first SDK. Most downstream JS should still use `@tx-code/occt-core` unless it needs direct retained-model orchestration.

## Boundary

This SDK intentionally stops at exact measurement DTOs and relation semantics.

Downstream concerns include:

- overlay rendering
- selection UX
- label layout
- viewer policy
- feature semantics such as hole or chamfer recognition

The authoritative release gate for this contract remains `npm run test:release:root` from the repository root.
