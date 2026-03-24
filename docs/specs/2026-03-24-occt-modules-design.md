# OCCT Core + Babylon Loader Module Design

Date: 2026-03-24

## Goal

No Babylon.js fork maintenance. Keep one source of truth in `occt-js`, but maintain two modules inside this same repository:

1. Core module: OCCT Wasm runtime and CAD import normalization.
2. Babylon module: model-loader and Babylon scene construction.

## Package Boundaries

### `@tx-code/occt-core`

Responsibilities:

- Resolve and instantiate OCCT Wasm module (`OcctJS` factory).
- Route format to OCCT method (`ReadStepFile`, `ReadIgesFile`, `ReadBrepFile`).
- Normalize raw OCCT payloads into a single scene DTO:
  - `rootNodes` with `assembly|part`
  - deduplicated `geometries`
  - deduplicated `materials`
  - unified `stats`, `warnings`, units

Non-goals:

- Babylon classes (`Mesh`, `Material`, `TransformNode`)
- Scene graph materialization for any render engine

### `@tx-code/occt-babylon-loader`

Responsibilities:

- Infer CAD format from extension (`.step/.stp/.iges/.igs/.brep/.brp`).
- Delegate parsing to `@tx-code/occt-core`.
- Build Babylon runtime nodes/materials from normalized DTO.
- Provide SceneLoader plugin (`OcctFileLoader`) with no format-specific branches in forked Babylon code.

Non-goals:

- OCCT/Wasm lifetime management internals
- CAD parsing logic

## Data Contract

The cross-package boundary is the normalized model DTO produced by `occt-core`.  
Babylon module only consumes this DTO and does not parse raw `ReadStepFile` output directly.

## Extensibility

- New OCCT-backed formats are added in `occt-core` first (method routing + normalization).
- Babylon support for new format becomes route mapping updates in `occt-babylon-loader`, not a new loader stack.
- Future render-engine adapters can reuse `occt-core` without touching importer code.

## Current Implementation Status

- `packages/occt-core` provides tested format normalization, import routing, and result normalization.
- `packages/occt-babylon-loader` provides tested extension routing and loader/scene-builder skeleton.
