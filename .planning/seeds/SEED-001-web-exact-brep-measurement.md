---
id: SEED-001
status: dormant
planted: 2026-04-14
planted_during: v1.0 / Phase 1 planning
trigger_when: When the current runtime-hardening milestone completes and the next milestone is opened for downstream exact-geometry capabilities in web consumers.
scope: Large
---

# SEED-001: Web Exact BRep Measurement Kernel

## Why This Matters

Downstream web applications can already import OCCT topology and perform face-oriented picking, but the root Wasm carrier still stops at import/orientation APIs. Full-featured measurement should remain an app concern, yet the app cannot implement exact BRep measurement semantics without a stable exact-kernel contract from `@tx-code/occt-js`.

The next milestone should therefore extend the root Wasm carrier from "import + triangulation runtime" into "import + exact topology measurement kernel" without turning this repository into a viewer-first product. The kernel boundary should stay narrow: exact model lifetime, topology element refs, geometry classification, and primitive measurement APIs. Higher-level behaviors such as candidate generation, measurement session state, overlay rendering, and Fusion-like semantics should stay in downstream apps.

## When to Surface

**Trigger:** When the current runtime-hardening milestone completes and the next milestone is opened for downstream exact-geometry capabilities in web consumers.

This seed should be presented during `/gsd-new-milestone` when the milestone scope matches any of these conditions:
- The next milestone expands the root Wasm contract beyond import/orientation into exact geometry analytics.
- A downstream consumer such as `imos-app` needs exact face/edge/vertex measurement instead of mesh-only fallback.
- Packaging/runtime contract hardening is no longer the primary blocker and the team is ready to add new root APIs.

## Scope Estimate

**Large** — This is a full milestone. It likely needs new native OCCT bindings, JS-facing Wasm APIs, exact-model lifetime management, downstream contract tests, and consumer-side integration work split across multiple phases.

## Breadcrumbs

Related code and decisions found in the current codebase and referenced downstream repos:

- `.planning/PROJECT.md` — Root Wasm package is the strategic product surface; viewer/demo layers are secondary.
- `.planning/ROADMAP.md` — Current milestone is runtime-first hardening; future extension should not break the root-carrier positioning.
- `dist/occt-js.d.ts` — Current public root API exposes `Read*` and `AnalyzeOptimalOrientation`, but no exact-model lifetime or measurement APIs.
- `src/js-interface.cpp` — Current JS binding surface exports topology payloads and orientation, confirming the gap to exact measurement primitives.
- `packages/occt-core/src/model-normalizer.js` — Downstream-normalized topology already preserves `faces`, `edges`, `vertices`, and `triangleToFaceMap`.
- `../imos-app/packages/viewer-babylon/src/bindOcctMeshSelection.ts` — Current downstream Babylon selection publishes face selections and uses `triangleToFaceMap`, showing the existing web picking surface.
- `../SceneGraph.net/src/SceneGraph/App/IOcctShapeStore.cs` — Reference design for exact shape lifetime keyed by consumer geometry context.
- `../SceneGraph.net/src/SceneGraph.OcctInterop/OcctShapeStore.cs` — Reference implementation for exact shape refcount/lifecycle management.

## Notes

Target kernel API areas identified during milestone discussion:

- Exact model open/retain/release
- Exact topology element refs (`face` / `edge` / `vertex`)
- Geometry classification (`line`, `circle`, `plane`, `cylinder`, `sphere`, etc.)
- Primitive measurements:
  - distance
  - angle
  - radius
  - center
  - edge length
  - face area
  - thickness
- Optional later semantics for app-layer composition:
  - hole
  - chamfer
  - min/max/center distance variants
  - measurement candidate resolution and overlay behavior
