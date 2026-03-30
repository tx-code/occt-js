# Babylon Viewer Packages Design

Date: 2026-03-30
Branch: feature/occtjs-viewer-packages-design

## Summary

This design introduces two new Babylon-facing package layers on top of the existing core and loader packages:

- `@tx-code/occt-babylon-viewer`
- `@tx-code/occt-babylon-widgets`

The goal is to move reusable Babylon runtime behavior out of `demo/` without turning this repository into a monolithic viewer framework.

The core rule is `scene-first`: the viewer package must accept a Babylon `Scene` supplied by the consumer. It may provide convenience helpers for creating a scene, but scene ownership and lifecycle remain with the caller.

## Problem

Today the repository is split unevenly:

- `@tx-code/occt-core` provides Wasm loading and CAD import logic
- `@tx-code/occt-babylon-loader` builds Babylon nodes from imported OCCT model data
- `demo/` still owns the actual viewer runtime behavior:
  - scene background
  - camera creation and view control
  - lights
  - grid and axis lines
  - fit-all and projection switching
  - ViewCube overlay

That means the reusable package surface is incomplete. Any downstream consumer that wants the same Babylon viewing behavior must either copy logic from `demo/` or treat the demo as the implementation source. That is the wrong boundary.

## Goals

- Make Babylon viewer runtime behavior reusable outside `demo/`
- Keep Babylon-specific concerns out of `@tx-code/occt-core`
- Keep scene ownership with the consuming application
- Preserve the existing separation between:
  - import/core logic
  - Babylon scene-building logic
  - application-specific UI
- Allow `demo/`, Tauri desktop, and downstream apps to consume the same viewer runtime packages

## Non-Goals

- Turn `occt-js` into a full application framework
- Force consumers into a specific state-management solution
- Require React or any UI framework
- Move all demo UI into packages
- Redesign the root Wasm API or the OCCT import contract

## Proposed Package Layout

### Existing Packages

#### `@tx-code/occt-core`

Responsibility:

- Wasm factory handling
- CAD file import
- format routing for OCCT-backed formats
- model normalization
- orientation analysis and other OCCT-level algorithms

This package remains engine-agnostic.

#### `@tx-code/occt-babylon-loader`

Responsibility:

- Convert OCCT model data into Babylon scene nodes
- Build meshes, transform nodes, and materials
- Provide Babylon `SceneLoader` integration where appropriate

This package must remain limited to model-to-node construction. It must not own camera, lights, background, grid, or application overlays.

### New Package: `@tx-code/occt-babylon-viewer`

Responsibility:

- Attach a reusable OCCT-oriented viewer runtime to an existing Babylon `Scene`
- Manage runtime helpers around the model:
  - camera rig
  - fit-all
  - projection mode
  - standard views
  - viewer background theme
  - default lights
  - ground grid
  - axis lines
- Provide a stable runtime API for downstream applications

This package is Babylon-specific, but not app-specific.

### New Package: `@tx-code/occt-babylon-widgets`

Responsibility:

- Provide optional viewer widgets that sit on top of the viewer runtime
- First widget: `ViewCube`

This package must not depend on React. It may use DOM, canvas, or plain browser APIs, but it must consume only the public API from `@tx-code/occt-babylon-viewer`.

## Dependency Direction

The dependency graph must remain one-way:

```text
@tx-code/occt-core
    -> @tx-code/occt-babylon-loader
        -> @tx-code/occt-babylon-viewer
            -> @tx-code/occt-babylon-widgets
                -> demo / desktop / downstream apps
```

Rules:

- `occt-babylon-loader` must not depend on `viewer`
- `viewer` may depend on `loader`, but only through its public exports
- `widgets` may depend on `viewer`, but not on `demo`
- `demo` and Tauri consume packages; packages do not read demo state or UI components

## Scene Ownership Model

### Primary Model: Scene-First

The main API must accept a Babylon `Scene` provided by the consumer.

That means the package does not own:

- engine creation
- render loop
- host canvas lifecycle
- application-level scene composition outside OCCT viewing concerns

This avoids repeating the mistake of a package that silently becomes the whole rendering framework.

### Optional Convenience Helper

A convenience helper may exist later, for example:

- `createOcctBabylonScene(canvas, options)`

But it is explicitly secondary. The main entry point must be:

- `attachOcctBabylonViewer(scene, options)`
- or equivalent constructor/factory that takes `scene`

## Proposed Viewer Runtime API

The exact naming can still be refined, but the public shape should look like this:

```ts
const viewer = createOcctBabylonViewer(scene, options)

viewer.loadOcctModel(model)
viewer.clearModel()
viewer.dispose()

viewer.fitAll()
viewer.setProjection("perspective" | "orthographic")
viewer.setView("front" | "back" | "left" | "right" | "top" | "bottom" | "iso")

viewer.setGridVisible(boolean)
viewer.setAxesVisible(boolean)
viewer.setTheme(theme)

viewer.getSceneState()
viewer.getCamera()
viewer.getRootNode()
viewer.getModelBounds()
```

The runtime should manage one OCCT root node within the supplied scene and expose enough read-only handles for widgets and applications to integrate cleanly.

## Proposed Viewer Options

The public options should be deliberately narrow.

First-phase options:

- `background`
- `camera`
- `lights`
- `grid`
- `axes`
- `theme`
- `createDefaultLights` boolean
- `createDefaultCameraController` boolean

Not first-phase options:

- deep per-widget visual customization
- application-specific state wiring
- desktop-only concerns
- toolbar behavior
- panel layout

The rule is: only runtime options that affect Babylon scene behavior belong here.

## Loader and Viewer Boundary

The handoff between packages should be explicit.

### Loader Output

`@tx-code/occt-babylon-loader` continues to accept imported OCCT model data and produce Babylon nodes.

It remains stateless with respect to the viewer.

### Viewer Input

`@tx-code/occt-babylon-viewer` should accept one of these patterns:

1. an OCCT model and internally call loader helpers
2. a prebuilt Babylon scene fragment returned by loader helpers

Recommended first-phase path:

- viewer accepts the normalized OCCT model
- internally calls the loader package to build nodes

Reason:

- keeps demo and downstream consumers on a short API path
- preserves loader as the only Babylon node-construction implementation
- avoids duplicating scene-build orchestration in every consumer

## Widget Boundary

`ViewCube` should not remain in `demo/` long-term.

It belongs in `@tx-code/occt-babylon-widgets`, but with strict limits:

- it uses only public viewer API
- it does not know about React
- it does not know about demo store state
- it does not modify application layout

Recommended widget API shape:

```ts
const widget = createViewCubeWidget(options)
widget.attach(viewer)
widget.detach()
widget.dispose()
```

The widget may render into:

- a supplied container element
- or a supplied canvas/overlay element

The consumer remains responsible for layout and positioning.

## Demo Migration

After the packages exist, `demo/` should be reduced to an application shell.

It should keep:

- toolbar
- drop zone
- selection panel
- stats panel
- model tree drawer
- desktop chrome
- app-specific state

It should stop owning:

- Babylon scene bootstrap
- default lights
- background selection
- grid and axes creation
- camera behavior and standard-view implementation
- ViewCube implementation details

`demo` becomes a consumer of:

- `occt-core`
- `occt-babylon-loader`
- `occt-babylon-viewer`
- `occt-babylon-widgets`

## Desktop Implications

The Tauri desktop shell should not get its own Babylon runtime logic.

Once the packages are introduced:

- web demo consumes them
- desktop shell consumes the same demo app
- any downstream Babylon app can also consume them directly

That preserves the current additive desktop model.

## Testing Strategy

### `@tx-code/occt-babylon-loader`

Continue focused tests around:

- format routing
- scene-node creation
- geometry/material mapping

### `@tx-code/occt-babylon-viewer`

Add tests for:

- attaching to a supplied Babylon `Scene`
- creating and disposing default lights and helper nodes
- loading and clearing OCCT models
- fit-all calculations
- projection switching
- standard view transitions
- grid and axes visibility toggles

### `@tx-code/occt-babylon-widgets`

Add tests for:

- widget attach/detach lifecycle
- viewcube to viewer interaction
- no dependency on demo state or React

### `demo`

Reduce tests so they focus on:

- application flow
- import interactions
- mode toggles
- integration with the packaged viewer runtime

## Migration Plan

This design is intended for one feature branch with multiple atomic commits.

### Phase 1: Viewer Runtime

- create `@tx-code/occt-babylon-viewer`
- move scene/camera/light/grid/axes/view-control logic out of `demo/src/hooks/useViewer.js`
- keep `demo` functional by adapting it to the new runtime API

### Phase 2: Widgets

- create `@tx-code/occt-babylon-widgets`
- move `ViewCube` into the widgets package
- adapt `demo` to consume widget package exports

### Phase 3: Cleanup

- remove duplicated viewer runtime code from `demo`
- tighten package READMEs and exports
- run root, demo, and desktop verification

## Risks

### Risk: Viewer package becomes a framework

Mitigation:

- require consumer-supplied `Scene`
- keep engine/render loop ownership outside package
- keep app UI out of packages

### Risk: Loader and viewer responsibilities blur

Mitigation:

- loader builds Babylon nodes only
- viewer owns runtime helpers only
- no duplicated mesh-building paths

### Risk: Widgets couple to demo behavior

Mitigation:

- widgets consume only public viewer API
- no React-specific code
- no store access

## Recommended Naming

- `@tx-code/occt-babylon-viewer`
- `@tx-code/occt-babylon-widgets`

These names are specific enough to communicate purpose without implying ownership of the full application stack.

## Recommendation

Proceed with a three-package Babylon-facing structure:

- keep `loader` narrow
- introduce a `viewer` runtime package around a caller-supplied `Scene`
- move `ViewCube` into a `widgets` package

That gives downstream consumers a reusable Babylon module stack without locking them into the demo's application architecture.
