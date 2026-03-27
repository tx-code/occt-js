# Format Routing And Point-Cloud Boundary Design

Date: 2026-03-27
Status: Approved design
Repository: `occt-js`
Target branch: `feature/occtjs-core-next`

## Purpose

This document defines which model formats belong inside `occt-js` and which formats should be handled by downstream runtime loaders or a separate point-cloud pipeline.

`occt-js` is not a general-purpose 3D file ingestion layer. Its purpose is narrower and more valuable:

- CAD and B-Rep import through OCCT
- triangulation of CAD geometry
- stable topology-oriented output for downstream consumers
- structured scene output that Babylon-facing consumers can normalize

This boundary matters because the repository is intended to remain a foundational CAD import runtime that downstream Babylon-based applications can rely on. It should not absorb every mesh or point-cloud format request.

## Routing Rules

### Formats That Belong In `occt-js`

These formats should continue to be imported by `occt-js` itself:

- `STEP` / `STP`
- `IGES` / `IGS`
- `BREP`

Reason:

- they are CAD / B-Rep formats
- OCCT is the correct import and tessellation engine for them
- downstream consumers need CAD-derived semantics, not just triangles

### Formats That Should Use Babylon Native Loaders

These formats should not be added to `occt-js` and should instead be loaded in the Babylon layer:

- `glTF` / `GLB`
- `OBJ`
- `STL`

Reason:

- Babylon already has native loader support for these formats
- these formats are typically consumed as mesh assets, not B-Rep CAD
- routing them through `occt-js` would duplicate existing Babylon capability without adding CAD-specific value

### Formats That Belong To A Separate Point-Cloud Pipeline

These formats should not be added to `occt-js`:

- `PLY`
- `PCD`
- `LAS`

Reason:

- they represent point sets / scan data rather than CAD B-Rep geometry
- `occt-js` does not add the right kind of value for them
- a point-cloud stack has different parsing, rendering, memory, and interaction concerns than a CAD importer

## Why This Boundary Exists

`occt-js` should stay focused on the part of the stack that only OCCT can provide well.

That means:

- B-Rep and CAD format reading
- triangulation from CAD topology
- topology-oriented metadata such as faces, edges, vertices, and stable IDs
- normalized output that Babylon consumers can turn into renderable scene objects

It does not mean:

- acting as a general mesh conversion bus
- wrapping formats that Babylon already loads well on its own
- becoming a point-cloud ingestion library

If this boundary is not kept, the repository will drift from a focused CAD runtime into a mixed-format viewer backend with weaker contracts and more maintenance burden.

## Point-Cloud Guidance

Point clouds should be treated as a separate subsystem.

### `PLY`

`PLY` may be handled in a downstream Babylon-facing layer if the product only needs visualization.

That still does not make `PLY` an `occt-js` responsibility. The correct interpretation is:

- `PLY` is a point-cloud or mesh-adjacent format
- it may be loaded or converted in the Babylon consumer layer
- it should not be forced into the CAD importer API surface

### `PCD` And `LAS`

`PCD` and `LAS` should be treated as explicit non-`occt-js` formats.

Recommended downstream shape:

- parse into a point-cloud domain model outside `occt-js`
- build Babylon-facing point buffers / point-cloud runtime objects from that model
- keep point-cloud interaction decisions outside the CAD import contract

## Guidance For Downstream Consumers

Downstream Babylon-based consumers should route file types as follows:

- `STEP` / `IGES` / `BREP` -> `occt-js`
- `glTF` / `GLB` / `OBJ` / `STL` -> Babylon native loader path
- `PLY` / `PCD` / `LAS` -> point-cloud pipeline

This routing rule should be treated as the default architecture unless there is a very specific reason to override it.

## Immediate Implications For This Repository

- do not add `STL`, `OBJ`, or `glTF` import APIs to `occt-js`
- do not add `PLY`, `PCD`, or `LAS` import APIs to `occt-js`
- continue improving `STEP`, `IGES`, and `BREP` import quality, structure, and semantics
- document `occt-js` as a CAD-import foundation for Babylon consumers, not as a universal geometry loader
