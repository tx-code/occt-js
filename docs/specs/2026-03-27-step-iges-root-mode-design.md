# STEP/IGES Root Mode Design

**Date**: 2026-03-27
**Status**: Approved

## Goal

Add an explicit root-shape mode for STEP and IGES import so callers can choose between:

- `one-shape`: return a single aggregated root shape
- `multiple-shapes`: return each top-level imported shape as an independent root

This should align `occt-js` with OCCT's native import semantics while keeping the library focused on Babylon-oriented consumption.

## Problem Statement

`occt-js` already has implicit support for multiple imported roots through the XDE path:

- `STEP/IGES` import uses XDE readers
- imported free shapes are collected through `XCAFDoc_ShapeTool::GetFreeShapes()`
- each free shape becomes a root node in the returned scene payload

However, this behavior is not formalized as a library contract, and there is no explicit caller-controlled option for forcing a single merged root.

For downstream Babylon consumers such as `imos-app/viewer-babylon`, both modes are useful:

- a single root is simpler for common viewer flows
- multiple roots preserve top-level separation when needed

## Scope

This design only covers:

- `ReadStepFile`
- `ReadIgesFile`
- `ReadFile("step", ...)`
- `ReadFile("iges", ...)`

This design does **not** change:

- BREP import behavior
- Babylon rendering code
- Tauri or demo UI defaults beyond consuming the new option later

## Reference Behavior In OCCT

OCCT supports both result modes.

For STEP/IGES translation readers:

- `NbShapes()` returns the number of translated results
- `Shape(rank)` returns a specific result
- `OneShape()` returns:
  - null if no results
  - the single result if there is one
  - a compound if there are several

For XDE shape management:

- `GetFreeShapes()` returns all top-level free shapes
- `GetOneShape()` returns one shape built from the free top-level shapes

References:

- https://dev.opencascade.org/doc/occt-7.4.0/overview/html/occt_user_guides__iges.html
- https://dev.opencascade.org/doc/refman/html/class_x_c_a_f_doc___shape_tool.html

## Recommended API

Extend STEP/IGES import parameters with:

```ts
rootMode?: "one-shape" | "multiple-shapes";
```

Behavior:

- `one-shape`
  - import all free shapes
  - expose one logical root in the returned scene data
  - if OCCT yields multiple top-level shapes, aggregate them into one compound-style root
- `multiple-shapes`
  - preserve each free shape as an independent root node

Default:

```ts
rootMode: "one-shape"
```

## Data Contract

### one-shape

- `rootNodeIndices.length === 1`
- returned root may reference one or more meshes
- if the source had multiple top-level shapes, the returned scene still presents one root entry

### multiple-shapes

- `rootNodeIndices.length >= 1`
- each top-level imported shape produces its own root entry
- existing multi-root traversal behavior remains intact

## Implementation Direction

The implementation should remain inside the existing XDE import path in `src/importer-xde.cpp`.

Recommended shape:

1. Add `rootMode` to the import parameter model and JS binding surface
2. Keep current `GetFreeShapes()` traversal as the `multiple-shapes` behavior
3. Add a `one-shape` branch that builds one explicit root from the imported free shapes
4. Keep mesh extraction and triangulation code shared between both modes

The library should not introduce Babylon runtime types into the import payload.

## Testing

Add focused coverage for:

- STEP default import returns one root
- IGES default import returns one root
- `multiple-shapes` preserves multiple roots for a multi-root fixture
- `one-shape` collapses the same fixture to one root
- `ReadFile()` dispatch preserves the same behavior as direct STEP/IGES entry points

## Non-Goals

- No BREP root-mode changes in this phase
- No scene-graph abstraction redesign
- No Babylon viewer API redesign
- No assembly/instance semantic expansion in this change

## Why This Direction

This keeps `occt-js` aligned with its intended role:

- bottom-layer OCCT import library
- Babylon-friendly output
- no duplication of Babylon scene-graph responsibilities

It also gives downstream consumers one stable, explicit contract for the most common top-level import choice.
