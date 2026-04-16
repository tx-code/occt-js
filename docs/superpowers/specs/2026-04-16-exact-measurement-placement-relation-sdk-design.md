# Exact Measurement Placement And Relation SDK Design

Date: 2026-04-16  
Status: Approved design  
Repository: `occt-js`  
Target branch: `master`

## Goal

Define `v1.4 Exact Measurement Placement & Relation SDK` as a runtime-first milestone that:

- extends the shipped exact measurement foundation with stable placement helpers inspired by OCCT `PrsDim`
- adds relation classifiers for common measurement-aligned geometric relations
- keeps the root Wasm carrier and `@tx-code/occt-core` as the only productized surfaces
- introduces maintainable package-first API SDK documentation without turning this repo into a viewer framework

The goal is not to reproduce OCCT AIS dimensions in WebAssembly. The goal is to expose the reusable geometry and relation contracts that downstream apps need for overlay placement and measurement UX.

## Confirmed Decisions

The following constraints are fixed for this design:

- Delivery strategy: runtime-first, not app-first
- Scope: placement helpers and relation classifiers both ship in this milestone
- Priority: placement contract lands first, relation classifier builds on it
- API strategy: additive only; existing `MeasureExact*` contracts remain unchanged
- SDK docs strategy: `@tx-code/occt-core` is the primary documentation entry point, with root Wasm kept as the lower-level reference surface
- Product boundary: selection sessions, overlay rendering, label layout, and feature semantics remain downstream app concerns
- Release boundary: `dist/` artifacts plus `npm run test:release:root` remain authoritative

## Problem Statement

`v1.1` shipped the exact measurement kernel foundation:

- retained exact-model lifecycle
- occurrence-scoped refs
- primitive exact queries
- pairwise distance, angle, and thickness

That foundation is enough for raw measurement values, but it is not enough for stable Web measurement presentation.

Today, downstream apps still need to derive or guess:

- attachment points for dimensions
- working-plane frames for 2D overlay placement
- axis and direction data for radius, diameter, and angle presentation
- relation classification such as parallel or concentric

OCCT `PrsDim` already solves much of this geometry, but it packages those calculations together with AIS/Prs3d presentation, text, arrows, and selection behavior. That shape is not appropriate for the root Wasm carrier.

This repository needs an explicit contract that extracts the reusable parts of `PrsDim` while preserving the current runtime/package boundary.

## External Reference: OCCT `PrsDim`

`PrsDim` is the behavioral reference for this milestone, but not the API shape to expose directly.

Relevant lessons from `PrsDim`:

- dimension computation is not just a scalar value; it also needs attachment points and a presentation plane
- angle and length placement depend on surface classification and nearest-point helpers
- relation objects such as parallel, perpendicular, concentric, and tangent have their own geometric support logic
- the OCCT implementation is tightly coupled to AIS interactive objects and `Prs3d_DimensionAspect`

This milestone reuses the geometry ideas, not the interactive-object model.

## Scope

This design covers:

- new placement helpers for exact measurement presentation support
- new relation classifier APIs for common geometric relations
- root Wasm carrier bindings, types, and contract tests
- `@tx-code/occt-core` adapters that preserve occurrence transforms and expose package-first DTOs
- SDK documentation for downstream consumers
- release-governance updates to keep the new contract stable

This design does not cover:

- overlay rendering
- selection sessions, hover, preview, or pin workflows
- text layout, arrow layout, label placement policy, or style systems
- Babylon-specific measurement widgets
- hole, chamfer, draft, or feature-recognition semantics
- app-owned settings persistence or measurement state management

## Architecture

## Surface Split

The milestone keeps a strict three-layer split:

```text
root Wasm carrier
  -> exact geometry / exact measurement / placement / relation raw contract

@tx-code/occt-core
  -> package-first refs, transform adaptation, DTO normalization

downstream app
  -> selection, overlay rendering, state machine, feature semantics
```

The root carrier remains the geometry authority. `@tx-code/occt-core` remains the package-authoritative JS adapter. The app remains the UX owner.

## API Strategy

This milestone is additive. Existing measurement APIs are not widened or repurposed:

- `MeasureExactDistance`
- `MeasureExactAngle`
- `MeasureExactThickness`
- `MeasureExactRadius`
- `MeasureExactCenter`
- `MeasureExactEdgeLength`
- `MeasureExactFaceArea`
- `EvaluateExactFaceNormal`

New APIs are introduced beside them.

## Root Wasm API

The root carrier should add placement helpers with purpose-built entry points:

```ts
SuggestExactDistancePlacement(...)
SuggestExactAnglePlacement(...)
SuggestExactRadiusPlacement(...)
SuggestExactDiameterPlacement(...)
SuggestExactThicknessPlacement(...)

ClassifyExactRelation(...)
```

Design rules:

- pairwise placement helpers follow the current pairwise measurement model and accept occurrence transforms
- single-shape placement helpers operate on retained exact geometry and return local-space placement data
- `SuggestExactDiameterPlacement()` is presentation-oriented and may derive its scalar semantics from the same circular geometry used by radius queries
- `ClassifyExactRelation()` is a unified classifier rather than four separate APIs

## `@tx-code/occt-core` API

The package-first surface should wrap the new root APIs with ref-oriented entry points:

```ts
core.suggestExactDistancePlacement(refA, refB)
core.suggestExactAnglePlacement(refA, refB)
core.suggestExactRadiusPlacement(ref)
core.suggestExactDiameterPlacement(ref)
core.suggestExactThicknessPlacement(refA, refB)

core.classifyExactRelation(refA, refB, options?)
```

Adapter responsibilities:

- validate exact refs
- preserve and apply occurrence transforms
- normalize root DTOs into package-first world or occurrence-space results
- keep root API parity visible instead of inventing viewer-only abstractions

## DTO Design

This milestone should standardize two new DTO families.

### Placement DTOs

```ts
interface ExactPlacementFrame {
  origin: Vec3
  normal: Vec3
  xDir: Vec3
  yDir: Vec3
}

interface ExactPlacementAnchor {
  point: Vec3
  role: "attach" | "center" | "anchor"
}

interface ExactPlacementResult {
  ok: true
  kind: "distance" | "angle" | "radius" | "diameter" | "thickness"
  value?: number
  frame: ExactPlacementFrame
  anchors: ExactPlacementAnchor[]
  directionA?: Vec3
  directionB?: Vec3
  axisDirection?: Vec3
}
```

Contract rules:

- placement results are geometry-support DTOs, not rendering commands
- `frame` is required on success
- `anchors` is required on success
- `value` is included when the placement helper owns a natural scalar result
- pairwise helpers return occurrence-space coordinates after transforms
- single-shape helpers may return local-space data from the root carrier, but `@tx-code/occt-core` should normalize them to occurrence-space package DTOs

### Relation DTOs

```ts
interface ExactRelationResult {
  ok: true
  relation:
    | "parallel"
    | "perpendicular"
    | "concentric"
    | "tangent"
    | "none"
  frame?: ExactPlacementFrame
  pointA?: Vec3
  pointB?: Vec3
  center?: Vec3
  axisDirection?: Vec3
}
```

Contract rules:

- `none` is a valid success result, not a failure
- failures are reserved for invalid refs, unsupported geometry, or unresolved calculation paths
- supporting geometry is optional and only present when it is meaningful for the classified relation

## Compatibility Rules

Backward compatibility is a milestone requirement.

Rules:

- existing `MeasureExact*` result DTOs remain source-compatible
- existing `@tx-code/occt-core` exact measurement wrappers remain source-compatible
- release verification must continue to prove runtime-first stability
- the new placement and relation APIs must not require Babylon, demo code, or Tauri code

## Phase Plan

### Phase 15: Placement Contract Hardening

Deliver:

- root Wasm placement helpers
- package-first `occt-core` wrappers
- unified placement DTOs
- contract coverage for distance, angle, radius, diameter, and thickness placement

This phase sets the geometric placement baseline for downstream overlay code.

### Phase 16: Exact Relation Classifier Contract

Deliver:

- unified relation classifier API
- support for `parallel`, `perpendicular`, `concentric`, `tangent`, and `none`
- supporting geometry DTOs and shared failure typing
- package parity and release-gate coverage

This phase does not add feature semantics such as hole or chamfer recognition.

### Phase 17: SDK Docs & Governance

Deliver:

- package-first SDK documentation for exact measurement placement and relations
- root Wasm reference documentation for the lower-level carrier API
- documentation checks in release governance
- tarball, typings, and example coverage aligned to the new contract

This phase formalizes the new API surface as something maintainable and publishable.

## Documentation Strategy

Documentation must follow the package-first boundary.

Primary entry point:

- `packages/occt-core/README.md`

Supporting references:

- root `README.md`
- dedicated SDK doc under `docs/sdk/` if README examples become too large

Documentation requirements:

- `@tx-code/occt-core` should show the first-class JS workflow with exact refs
- root `README.md` should document the lower-level Wasm carrier entry points
- examples must remain runtime-first and independent of viewer overlays
- docs must explicitly state that overlay rendering and measurement UX remain downstream concerns

## Testing Strategy

The milestone should preserve the current runtime-first verification model.

Required verification layers:

- root Wasm build verification through `npm run build:wasm:win`
- root contract tests for placement and relation DTOs
- `packages/occt-core` tests for adapter parity and transform handling
- documentation and tarball assertions in release governance
- authoritative release verification through `npm run test:release:root`

Required test themes:

- transform-correct occurrence-space placement outputs
- stable frame orientation and anchor ordering for representative fixtures
- relation classification success and `none` behavior
- invalid-ref and unsupported-geometry failure coverage
- README and typings contract assertions for the published API

## Error Handling

The new APIs should follow the existing exact query style.

Expected failure families:

- invalid model or handle
- invalid element id
- unsupported geometry
- unresolved placement
- unresolved relation

Design rule:

- semantic absence is not a failure; return `relation: "none"` instead
- malformed refs or unsupported geometry remain explicit failures

## Done Definition

This milestone is complete when downstream JS consumers can:

- open exact geometry through the shipped runtime/package contract
- request stable placement DTOs for exact measurements
- request relation classification DTOs for common geometric relations
- consume package-first SDK documentation without consulting viewer-specific code

and when all of that is locked by typings, tests, packaged-surface checks, and `npm run test:release:root`.
