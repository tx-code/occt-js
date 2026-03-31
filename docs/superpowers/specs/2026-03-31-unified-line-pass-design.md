# Unified Line Pass Design

Date: 2026-03-31  
Status: Approved design  
Repository: `occt-js`  
Target branch: `master`

## Goal

Replace the current ad hoc Babylon edge overlay path with a package-level unified line pass that:

- renders OCCT CAD edges and future toolpaths through one rendering pipeline
- uses shader-based screen-space line billboards instead of tube meshes
- supports per-segment color, dash, width, and explicit break markers
- remains Web-first and demo-compatible without introducing React dependencies into the core package

This iteration is not a short-term patch. It is the base rendering path for:

- CAD edge display
- mock toolpath display in the demo
- future real toolpath display in downstream consumers
- future hover/selection overlay layers

## Confirmed Decisions

The following choices are fixed for this design:

- renderer stack: Babylon only
- strategy: unified package-level line pass, not separate CAD/toolpath implementations
- geometry style: screen-space billboard lines, not tube meshes
- shader reference: align with `SceneGraph.Net` line billboard approach
- demo validation: include mock toolpath rendering in the browser demo
- testing discipline: TDD first, with Playwright-driven interaction validation for the demo

## Problem Statement

The current edge path in `occt-js` has three structural problems:

- rendering behavior is tied to demo hooks instead of a reusable viewer runtime
- edge rendering is split across stopgap approaches (`GreasedLine`, line systems, optional tubes)
- the current path does not provide a clean contract for toolpath-style features such as dashes, segmented colors, or discontinuous polyline breaks

That makes the system fragile for CAD use and unsuitable for CAM/toolpath growth.

The repository needs one explicit line-rendering contract that both CAD edges and toolpaths can share.

## External References

### `SceneGraph.Net`

`SceneGraph.Net` provides the architectural reference for line billboards:

- shader-driven quad expansion instead of mesh tubes
- viewport-aware pixel-stable line width
- explicit line billboard viewport uniforms
- depth bias support for stable overlay rendering

This design follows that direction rather than extending Babylon convenience line helpers.

### `imos.avalonia.latest`

`IMOS.CAM/Rendering/ToolPathRenderer.cs` provides the data-contract reference:

- one or a few polyline batches instead of many small objects
- `Points`
- `Colors` per segment
- `DashPeriods` per segment
- `BreakSegmentIndices` for true discontinuities
- `Width`

This polyline contract is the correct abstraction to carry into `occt-js`.

## Scope

This design covers:

- a new unified line-pass runtime inside `packages/occt-babylon-viewer`
- CAD edge conversion from `geometry.edges[].points`
- mock toolpath input and rendering in the demo
- shader/runtime support for per-segment width, color, dash, and break markers
- line-pass layering hooks for future hover/selection overlays
- package and demo tests for the new rendering path

This design does not cover:

- real CAM data import in this repository
- replacing current picking logic in the same iteration
- silhouette extraction from triangle topology
- a Three.js rendering path
- React widget abstractions in the core viewer package

## Architecture

## Package Layout

The line pass lives inside the existing package:

`packages/occt-babylon-viewer`

Proposed layout:

```text
packages/occt-babylon-viewer/
  src/
    index.js
    occt-babylon-viewer.js
    viewer-line-pass.js
    viewer-line-pass-material.js
    viewer-line-pass-mesh.js
    viewer-line-pass-batch.js
    viewer-line-pass-types.js
    viewer-edges.js
  test/
    viewer-line-pass.test.mjs
    viewer-edges.test.mjs
```

`viewer-edges.js` becomes a thin adapter from OCCT edge polyline data into the generic line-pass batch contract.

## Core Data Contract

The runtime contract is a normalized polyline batch:

```ts
type LinePassBatch = {
  id?: string
  points: ArrayLike<number> | Array<{ x: number, y: number, z: number }>
  breakSegmentIndices?: ArrayLike<number>
  segmentColors?: ArrayLike<number> | Array<{ r: number, g: number, b: number, a?: number }>
  segmentDashPeriods?: ArrayLike<number>
  width?: number
  depthBiasPerPixel?: number
  layer?: "cad-edges" | "toolpath" | "hover" | "selection"
  pickable?: boolean
}
```

Contract rules:

- `points.length >= 2`
- segment count is `points.length - 1`
- `segmentColors.length`, if provided, must equal segment count
- `segmentDashPeriods.length`, if provided, must equal segment count
- `breakSegmentIndices`, if provided, refer to segment indices where connectivity stops

This keeps CAD and toolpath rendering aligned from day one.

## Line Pass Runtime

Public runtime entry points:

```ts
createViewerLinePass(scene, options?)
linePass.updateBatches(batches)
linePass.setTheme(theme)
linePass.setVisible(layer, visible)
linePass.dispose()
```

Responsibilities:

- validate and normalize incoming batches
- build and update GPU buffers
- render one or more billboard meshes
- manage layer visibility
- expose an API that can be reused by hover and selection overlays

## Shader Strategy

The shader path should follow the `SceneGraph.Net` model, translated to Babylon custom shader material form:

- line segments expand in screen space into quads
- width is defined in pixels, not world units
- viewport size is passed as a uniform
- per-segment color is read from attributes or texture-backed buffers
- per-segment dash period is read from attributes
- fragment shader discards gap fragments for dashed segments
- depth test remains enabled
- depth write stays disabled
- a configurable depth bias is applied to stabilize overlays above faces

The first implementation target is triangle-billboard quads per segment. If a later optimization moves toward instancing or storage-buffer-based batching, the public batch contract should stay unchanged.

## Batch Strategy

The runtime should prefer a small number of meshes rather than one mesh per line or one mesh per section.

Batching rules for v1:

- one mesh for CAD edges
- one mesh for mock toolpath
- optional separate meshes for hover and selection layers

This mirrors the `IMOS` lesson: pipeline/object count matters. The runtime should not create many small Babylon materials or meshes for line data that can be batched.

## CAD Edge Integration

`viewer-edges.js` should:

- read `geometry.edges[].points`
- convert valid polylines into one `LinePassBatch`
- assign a stable CAD edge theme color
- use solid segments by default
- emit no false connections across invalid or discontinuous input

CAD edges are the first consumer of the generic pass, not a special case outside it.

## Toolpath Integration

The demo should include a mock toolpath provider that emits one or more `LinePassBatch` objects using:

- solid cutting moves
- dashed rapid or transition moves
- per-segment color variation
- at least one explicit discontinuity via `breakSegmentIndices`

This validates the contract before real CAM integration appears elsewhere.

## Viewer Integration

`demo/src/hooks/useViewer.js` should stop owning a dedicated edge-overlay builder reference and instead own a generic line-pass runtime reference.

High-level flow:

```text
model import
  -> build face meshes
  -> convert OCCT edges to LinePassBatch
  -> add mock toolpath LinePassBatch
  -> linePass.updateBatches([...])
```

Visibility rules:

- `edgesVisible` controls the CAD edge layer
- mock toolpath gets its own demo toggle or fixed temporary visibility during MVP validation
- future hover/selection layers reuse the same runtime with different layer IDs

## Picking And Overlay Relationship

This design does not replace `usePicking.js` in the same iteration, but it must not block that work later.

Requirements:

- the line pass API must support non-pickable visual layers
- future hover and selection rendering should reuse the same line-pass runtime instead of separate Babylon helper lines
- picking remains CPU or mesh-based for now, but the visual overlay system should already expose layer controls needed by picking-driven highlight rendering

## Error Handling

The runtime must degrade gracefully:

- invalid polyline inputs are skipped, not fatal
- mismatched segment arrays are rejected with diagnostics
- empty line batches are ignored
- shader initialization failure disables only the line pass, not face rendering

Expose diagnostics such as:

- `batchCount`
- `segmentCount`
- `droppedBatchCount`
- `droppedSegmentCount`
- `linePassEnabled`
- `lastError`

## Testing Strategy

## TDD

Implementation follows TDD:

- write the failing package test first
- watch it fail
- implement the minimum code
- re-run package tests
- then run demo validation

No production line-pass code should be written without a failing test first.

## Package Tests

Add package tests for:

- batch normalization
- break-marker handling
- segment color and dash array validation
- layer visibility behavior
- CAD edge adapter output from representative OCCT geometry input

## Demo Validation

Use Playwright-driven browser validation for:

- model import
- raw and auto-orient switching without losing CAD edge rendering
- mock toolpath visibility
- dashed and solid mock toolpath segments
- line visibility at standard camera views

The Playwright scope is interaction verification, not pixel-perfect image approval.

## Acceptance Criteria

This design is successful for the iteration when:

- CAD edges render through the unified line pass instead of `GreasedLine` or tube meshes
- mock toolpath renders through the same pass with mixed solid and dashed segments
- `raw` and `auto-orient` use the same stable edge runtime without edge disappearance
- no Babylon line helper fallback remains on the default rendering path
- package tests cover the batch contract
- Playwright verifies the demo interaction path

## Risks And Mitigations

- risk: shader/material work in Babylon is more complex than helper-based lines  
  mitigation: keep the public contract small and build the minimum screen-space line feature set first

- risk: dashed segments and break markers increase buffer complexity  
  mitigation: align data structures directly with the already-proven `IMOS` polyline contract

- risk: hover/selection needs may tempt a second overlay system later  
  mitigation: reserve line-pass layers in v1 so later overlays reuse the same runtime

## Out Of Scope Guardrail

To keep this executable in one focused iteration:

- do not integrate real CAM toolpath sources in this repository
- do not replace the whole picking stack in the same pass
- do not build React viewer widgets around the line pass
- do not keep multiple competing default edge backends alive after the unified pass lands
