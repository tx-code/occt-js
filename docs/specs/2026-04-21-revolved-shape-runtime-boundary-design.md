# Revolved Shape Runtime Boundary

## Summary

`occt-js` is a lightweight Wasm geometry carrier, not a CAM domain kernel.

The revolved-shape surface must stay narrow:

- input: one app-neutral `RevolvedShapeSpec`
- output: validation results, generated scene geometry, and optional retained exact shape handles

The runtime owns geometry construction and exact-model access only. Tool-library semantics, app-specific schemas, presets, and machining workflows stay upstream.

## Why This Boundary Exists

Different downstream apps describe tools differently. The root Wasm carrier cannot absorb those schemas without becoming a tool-definition platform instead of a reusable geometry kernel.

The correct split is:

- upstream app: translate its own tool definition into a normalized revolved profile payload
- `occt-js`: validate, build, triangulate, and optionally retain the exact generated shape
- downstream UI/SDK: present presets, manage colors/themes, persist settings, and map app semantics back onto the generated result

## Root Runtime Responsibilities

The root runtime may do the following:

- validate one strict normalized `RevolvedShapeSpec`
- build one revolved OCCT shape from that spec
- triangulate the shape into the canonical scene payload
- expose retained exact generated-shape handles for exact queries
- emit deterministic generated-face metadata and stable segment-to-face bindings derived from the normalized spec

The current root entrypoints already match this boundary:

- `ValidateRevolvedShapeSpec(spec)`
- `BuildRevolvedShape(spec, options?)`
- `OpenExactRevolvedShape(spec, options?)`

## What Must Stay Out Of `occt-js`

The root runtime must not own:

- `FlatEndmill`, `BallEndmill`, `Bullnose`, `Drill`, or similar domain enums as first-class runtime concepts
- tool-library storage, catalog CRUD, or preset registries
- adapter layers for FreeCAD, MeshLib, IMOS, vendor JSON, or any other external schema
- machining semantics such as feeds, speeds, compensation tables, holders, assemblies, or process rules unless they are reduced to pure geometry inputs
- caller-owned display colors, theme palettes, or app-specific material policies
- viewer workflows, editing UX, or tool authoring UI

If a downstream app wants those concepts, it must translate them into the normalized revolved geometry contract before calling the runtime.

## Canonical Runtime Contract

The root contract should stay centered on two concepts:

1. `RevolvedShapeSpec`
   Describes one normalized axisymmetric profile plus revolve settings.
2. Generated result
   Returns either scene geometry or exact-open state derived from that spec.

Everything else is secondary metadata.

The normalized spec may include:

- version
- units
- profile plane/axis convention
- profile start point
- supported profile segments
- closure mode
- revolve angle
- optional per-segment `id` and `tag`

The normalized build/open results may include:

- canonical scene payload
- revolved-shape metadata
- stable face bindings
- retained exact-model identifiers and exact shape handles

## Package Layer Positioning

`@tx-code/occt-core` may wrap the raw Wasm entrypoints for package-first JS consumption, but it must preserve the same runtime boundary.

That package can normalize errors and DTOs. It must not turn the root runtime into a tool-library manager by introducing app-specific tool schema ownership.

## Evolution Rules

Future additions are valid only if they still fit the lightweight geometry-kernel role.

Allowed evolution examples:

- additional normalized profile segment primitives
- tighter validation diagnostics
- richer exact generated-shape metadata
- more stable geometry/face binding DTOs

Disallowed evolution examples:

- adding named cutter families as runtime-owned schema
- importing third-party tool-definition files directly in the root Wasm carrier
- making app color policy or preset ownership part of the runtime contract
- bundling CAM workflow logic into revolved-shape geometry APIs

## Decision

For revolved shapes, `occt-js` remains a thin Wasm geometry engine with one normalized profile contract.

It accepts `RevolvedShapeSpec`, returns build/open results, and stops there.
