# @tx-code/occt-babylon-viewer

Babylon.js viewer runtime helpers for OCCT-backed CAD models.

## Scope

- attach to a caller-supplied Babylon `Scene`
- keep scene runtime concerns out of the demo app
- expose a small, stable viewer API surface for later camera, grid, and widget work

## Current API

The initial scaffold exposes:

- `createOcctBabylonViewer(scene)`
- `viewer.getScene()`
- `viewer.loadOcctModel(model)`
- `viewer.dispose()`

This package is intentionally minimal at first. Scene ownership stays with the caller.
