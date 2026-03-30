# CAD Viewer Core Design (Packages-First, Edge-First)

Date: 2026-03-30  
Status: Approved design  
Repository: `occt-js`  
Target branch: `master`

## Goal

Define a package-first viewer-core architecture for Babylon-based CAD rendering that:

- keeps `occt-js` as the import/runtime foundation
- introduces a reusable viewer core package under `packages/`
- upgrades edge rendering quality using a triangle billboard pipeline
- preserves Web compatibility and desktop demo compatibility
- does not require React bindings in the core package

This design is intentionally additive and must not break:

- root npm package build/release flow
- existing web demo runtime
- desktop MVP shell under `demo/src-tauri`

## Confirmed Decisions

The following constraints are fixed for this iteration:

- Renderer stack: Babylon only (no Three.js path in this plan)
- Delivery strategy: `packages-first`
- New package: `packages/occt-babylon-viewer`
- v1 scope: rendering core API only (no default toolbar/panel React UI)
- Edge geometry source: only OCCT edge polylines (`geometry.edges[].points`)
- Edge strategy: backend architecture with default triangle billboard backend
- Runtime target: WebGPU-first with automatic WebGL fallback
- Quality target: visual consistency and measurable performance, both required

## Problem Statement

Current viewer behavior and rendering decisions are still concentrated inside `demo/src` hooks. That causes two issues:

- reusable viewer behavior is hard to consume from downstream products
- edge quality and CAD visual consistency are constrained by demo-level implementation choices

For productization, viewer behavior should move into a dedicated package-level rendering core with explicit contracts, diagnostics, and testable acceptance criteria.

## Scope

This design covers:

- package architecture for a Babylon viewer core
- edge rendering backend interface
- v1 triangle billboard edge backend
- scene/material/grid/view alignment at core runtime layer
- diagnostics, fallback, and acceptance thresholds

This design does not cover:

- React component system for viewer UI
- replacing demo app shell with package-owned UI widgets
- mesh-based edge extraction from triangle topology
- non-Babylon rendering adapters
- assembly-level advanced visualization modes beyond current normalized model contract

## Architecture

## Package Layout

Create a new package:

`packages/occt-babylon-viewer`

Proposed file layout:

```text
packages/occt-babylon-viewer/
  package.json
  README.md
  src/
    index.js
    runtime/create-occt-viewer-runtime.js
    runtime/runtime-state.js
    model/build-occt-render-model.js
    render/render-occt-model.js
    pipeline/scene-pipeline.js
    pipeline/material-pipeline.js
    pipeline/edge/edge-backend.js
    pipeline/edge/triangle-billboard-backend.js
    pipeline/edge/polyline-segment-builder.js
    diagnostics/viewer-diagnostics.js
  test/
    edge-segment-builder.test.mjs
    triangle-backend.test.mjs
    runtime-fallback.test.mjs
```

## Public API

The package exposes three primary entry points:

```ts
createOcctViewerRuntime(scene, options?)
buildOcctRenderModel(normalizedModel, options?)
renderOcctModel(renderModel, runtime, options?)
```

Plus diagnostics:

```ts
runtime.getDiagnostics()
```

### API Semantics

- `createOcctViewerRuntime`
  - configures scene-level rendering pipeline (camera-agnostic core setup, lights, grid/axes policies, renderer mode tracking)
  - initializes edge backend and runtime diagnostics
- `buildOcctRenderModel`
  - transforms normalized OCCT DTO into render-ready data structures
  - converts OCCT edge polylines into segment buffers for edge backend
- `renderOcctModel`
  - executes passes in order: faces, edges, overlays
  - updates runtime diagnostics counters and pass status

## Core Pipelines

### Scene Pipeline

Responsibilities:

- background/clear color policy
- renderer capability detection (`webgpu` vs `webgl`)
- fallback status registration
- shared scene toggles (grid/axes visibility hooks)

### Material Pipeline

v1 supports CAD-focused presets:

- `cad-flat-lit`
- `cad-pbr-lit`

The pipeline centralizes material creation so demo/desktop/web use the same visual logic.

### Edge Pipeline

Edge rendering is backend-driven:

- `EdgeBackend` interface
- default implementation: `TriangleBillboardBackend`

v1 only ships triangle billboard backend, but interface boundaries remain explicit for future backends.

## Data Flow

```text
occt-core normalized model
  -> buildOcctRenderModel()
    -> face buffers
    -> edge polylines -> segment buffer
  -> renderOcctModel()
    -> faces pass
    -> edge pass (triangle billboard)
    -> overlays pass
```

Hard constraint:

- no mesh-derived automatic edge extraction
- no silhouette/dihedral inference from triangle topology
- edge data authority remains OCCT-provided polyline semantics

## Error Handling And Fallback

Edge/data/runtime handling must degrade gracefully:

- missing edge arrays: keep face rendering, emit `EDGE_DATA_EMPTY`
- invalid polyline input: skip invalid polyline, increment `EDGE_POLYLINE_INVALID`
- WebGPU init failure: switch to WebGL, emit `RENDERER_FALLBACK_WEBGL`
- edge shader/pipeline failure: disable edge pass, keep faces active, emit `EDGE_PASS_DISABLED`

All warnings are surfaced through diagnostics API and optional logger callback.

## Diagnostics Contract

`runtime.getDiagnostics()` returns:

- `rendererType` (`webgpu` | `webgl`)
- `edgeSegmentCount`
- `droppedEdgePolylineCount`
- `edgePassEnabled`
- `fallbackReason` (nullable)
- `avgFrameMs` (moving window)

The diagnostics contract is part of testable behavior, not debug-only output.

## Testing Strategy

## Unit Tests

- polyline-to-segment conversion correctness
- invalid polyline filtering behavior
- triangle billboard vertex/index generation for representative segment sets
- backend interface contract coverage

## Integration Tests

- runtime creation in WebGPU-capable environment
- forced fallback path to WebGL
- pass-level behavior when edges are empty/invalid
- diagnostics counter correctness

## Visual Regression (Demo-driven)

Use fixed camera fixtures and deterministic scenes for:

- raw orientation view
- auto-oriented view
- representative CAD fixtures (including `ANC101` and `AS1`)

Assertions focus on:

- edge continuity at multiple zoom levels
- stable line visibility/occlusion behavior
- no regression in face readability

## Acceptance Criteria

v1 must satisfy both visual and performance targets:

- visual:
  - no obvious edge discontinuity in standard camera interactions
  - line width behavior remains stable across zoom bands
  - top/front/side views keep predictable edge readability
- performance:
  - target dataset around `~500k edge segments`
  - WebGPU target: `>= 30 FPS`
  - WebGL fallback target: `>= 20 FPS`
  - memory growth stabilizes after load and does not continuously increase

## Delivery Plan

## v1

- ship `occt-babylon-viewer` rendering core
- ship triangle billboard edge backend
- ship WebGPU-first + WebGL fallback behavior
- ship diagnostics and tests for core contracts

## v1.1

- refine CAD lighting/material/grid/view unification quality
- keep v1 API stable and additive

## Risks And Mitigations

- risk: triangle edge pass complexity increases implementation time  
  mitigation: keep v1 backend feature set minimal (core joins/caps only), defer advanced style modes

- risk: visual expectations vary by model class  
  mitigation: lock reference fixtures and fixed camera regression viewpoints

- risk: fallback behavior diverges between environments  
  mitigation: integration tests for explicit fallback branches and diagnostics assertions

## Out Of Scope Guardrail

To keep this plan executable in one iteration:

- do not introduce React widget framework in viewer package
- do not add Three.js adapter paths
- do not add assembly semantic visualization beyond current normalized contract
- do not block root package publication on desktop/demo-only checks
