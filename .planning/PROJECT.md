# occt-js

## What This Is

`occt-js` is an OCCT-powered WebAssembly CAD runtime for importing STEP, IGES, and BREP data in JavaScript. The strategic surface is the root Wasm package and its `dist/` artifacts; Babylon-facing packages and demo/desktop code exist in the repo, but they are secondary to the runtime carrier role.

## Core Value

Downstream applications can reliably consume the OCCT Wasm runtime and its root API contract without build drift or packaging surprises.

## Requirements

### Validated

- ✓ Root Wasm runtime imports STEP, IGES, and BREP from memory and returns structured scene data consumed by tests and downstream JS entry points.
- ✓ Import results preserve tree-shaped `rootNodes`, geometry/material payloads, names/colors, and source-unit metadata where the source format provides it.
- ✓ Root API supports explicit root-shape selection and manufacturing-oriented orientation analysis for supported CAD formats.
- ✓ Reusable package layers and demo surfaces exist around the runtime, but they are downstream of the root Wasm contract.
- ✓ Root release verification is anchored on `npm run test:release:root` plus `test/release_governance_contract.test.mjs`.
- ✓ Exact BRep measurement foundations now ship through the root Wasm carrier and `@tx-code/occt-core`, including retained exact-model handles, occurrence-scoped refs, primitive exact queries, and pairwise distance/angle/thickness.
- ✓ App-side measurement UX, overlays, and semantic feature recognition remain explicitly outside the root runtime boundary.
- ✓ Import APIs now expose an explicit appearance strategy for preserving source colors or forcing a default CAD color, including a documented built-in CAD fallback.
- ✓ The default CAD color contract is stable across root Wasm imports and `@tx-code/occt-core`, with optional caller override for app-side user settings.
- ✓ Docs, typings, packaged tarball checks, and release verification now lock the import appearance contract without turning viewer repaint logic into a root-runtime concern.
- ✓ Downstream JS code can control import-time alpha or opacity fallback as part of the appearance contract instead of hardcoding opacity in downstream viewers.
- ✓ Downstream JS code can select named import appearance presets that map fallback color and opacity policy without requiring a viewer-side recolor pass.
- ✓ Expanded appearance options now stay aligned across root Wasm, `occt-core`, typings, docs, and release verification.
- ✓ Downstream JS code can request stable exact placement DTOs for distance, angle, radius, diameter, and thickness from the root Wasm carrier and `@tx-code/occt-core`.
- ✓ Downstream JS code can now classify exact `parallel`, `perpendicular`, `concentric`, `tangent`, and `none` relations from the root Wasm carrier and `@tx-code/occt-core`.
- ✓ Package-first exact relation classification now preserves occurrence transforms and explicit `none` / failure semantics without inventing viewer policy.

### Active

- [ ] Package-first SDK docs describe placement and relation APIs through `@tx-code/occt-core`, with root Wasm kept as the lower-level reference surface.

### Out of Scope

- Evolving this repo into a full viewer framework as the primary goal — the main value is the OCCT Wasm runtime.
- Making Tauri or desktop packaging a prerequisite for root npm publishing — root runtime must stay independently releasable.
- Treating Babylon/demo layers as first-order release gates for the root runtime.
- Selection sessions, overlay rendering, label layout, or measurement widgets in the runtime/package layer — those remain downstream app concerns.
- Hole, chamfer, or other feature-recognition semantics — `v1.4` stays at placement/relation contract boundaries, not higher-level interpretation.

## Current State

`v1.3 Appearance Expansion` shipped on 2026-04-15 and is now archived in `.planning/milestones/`. The root runtime now exposes `appearancePreset`, `colorMode`, `defaultColor`, and `defaultOpacity`; `occt-core` forwards and normalizes that full contract without inventing viewer-side repaint behavior; and root/package docs plus `npm run test:release:root` now lock the shipped semantics in place.

`v1.4 Exact Measurement Placement & Relation SDK` is now the active milestone. Phases 15 and 16 are complete: the root runtime and `occt-core` now expose additive exact placement helpers plus exact relation classification for `parallel`, `perpendicular`, `concentric`, `tangent`, and `none`, all with occurrence-safe supporting geometry DTOs. The immediate next goal is Phase 17 SDK docs and governance, while keeping viewer UX, feature semantics, and rendering policy outside the root runtime boundary.

## Current Milestone: v1.4 Exact Measurement Placement & Relation SDK

**Goal:** Add runtime-first exact placement helpers, relation classifiers, and package-first SDK documentation without turning `occt-js` into a viewer framework.

**Target features:**
- Stable placement helpers for exact distance, angle, radius, diameter, and thickness
- Exact relation classifiers for `parallel`, `perpendicular`, `concentric`, `tangent`, and `none`
- Package-first SDK docs through `@tx-code/occt-core`, with root Wasm documented as the lower-level reference surface

## Context

- Brownfield repository with an established Wasm build flow, root package contract, demo app, Tauri shell, and package-layer adapters.
- Root package version is still `0.1.7`; the root runtime and root tests remain the primary maintained contract.
- `imos-app` remains the key downstream consumer signal: it vendors `@tx-code/occt-js` and consumes the Wasm/runtime surface directly, while viewer semantics live on the app side.
- `SceneGraph.net` remains the best local reference for measurement behavior above the kernel layer, but `occt-js` intentionally stopped at exact-kernel foundations in v1.1.
- OCCT `PrsDim` is the local geometry reference for placement and relation behavior, but `v1.4` intentionally stops short of AIS/Prs3d interactive dimensions.
- The current exact runtime already exposes retained exact-model lifecycle, primitive exact queries, and pairwise distance/angle/thickness; `v1.4` extends that contract with placement and relation DTOs rather than viewer-owned semantics.
- GSD is the primary repository workflow; superpowers remain optional support tooling for narrow tasks only.

## Constraints

- **Release boundary**: `dist/occt-js.js`, `dist/occt-js.wasm`, and `dist/occt-js.d.ts` remain the root runtime contract — release verification stays centered on `npm run test:release:root`.
- **Backward compatibility**: Existing `MeasureExact*` result shapes and `@tx-code/occt-core` exact measurement wrappers must remain source-compatible; placement and relation additions need to be additive.
- **Product boundary**: App code owns selection sessions, overlay rendering, label layout, feature semantics, and settings persistence.
- **Downstream compatibility**: Changes to exact DTOs, typings, or docs must preserve packaged and vendored consumption paths such as `imos-app`.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Use GSD as the primary repository workflow | The repo still needs disciplined planning, but the primary object being managed is the Wasm runtime contract rather than the whole viewer stack | ✓ Good |
| Keep GSD as the direct default once milestone direction is decided | Milestone definition, requirements, roadmap updates, and phase execution should stay in one planning system instead of switching to auxiliary design flows midstream | ✓ Good |
| Initialize planning from current docs instead of running a separate codebase map first | The repository already had strong local docs and the user explicitly asked to bootstrap from them first | ✓ Good |
| Treat the root Wasm package as the strategic product surface | Downstream consumers primarily need the OCCT Wasm carrier; viewer/demo layers are secondary and should not dominate planning | ✓ Good |
| Keep existing `AGENTS.md` as the authoritative repo instruction file | The repo already consolidated agent guidance there; generic regeneration would risk overwriting local rules | ✓ Good |
| Use `npm run test:release:root` as the canonical root release gate | One command is easier to document, test, and reuse across README, AGENTS, skills, and future planning | ✓ Good |
| Keep demo, Babylon, and Tauri checks conditional secondary-surface verification | Root release flow must stay aligned with the Wasm carrier boundary and avoid secondary-surface gate creep | ✓ Good |
| Keep exact measurement semantics in downstream apps and limit v1.1 to wasm/core primitives | The main value is exposing a reliable geometric kernel contract; selection UX, overlays, and feature interpretation belong above the runtime | ✓ Good |
| Treat import appearance as a runtime contract instead of a viewer repaint convention | Downstream apps need deterministic imported material output that can be driven by settings and reused across package consumers | ✓ Good |
| Expand appearance only through import-time package contract changes, not viewer post-processing | `v1.3` proved the runtime/core surface can grow without absorbing preset UIs, settings storage, or repaint flows | ✓ Good |
| Use OCCT `PrsDim` as a geometry reference rather than a direct API shape | `v1.4` needs reusable placement and relation geometry, not AIS/Prs3d interactive objects in Wasm | ✓ Good |
| Keep `kind: "none"` as a successful relation result | Downstream apps need to distinguish valid analytic non-relations from unsupported geometry without inventing wrapper-only semantics | ✓ Good |
| Keep `occt-core` relation wrappers thin and transform-transparent | The runtime already returns occurrence-aware relation geometry, so the package layer should only validate refs, forward transforms, and attach refs on success | ✓ Good |
| Keep SDK docs package-first with `@tx-code/occt-core` as the primary entry point | Most downstream JS consumers should start from exact refs and occurrence-safe adapters, with root Wasm documented as the lower-level reference | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

<details>
<summary>Archived v1.3 milestone framing</summary>

## Current Milestone: v1.3 Appearance Expansion

**Goal:** Expand import-time appearance from a single fallback color into a richer package-level contract for opacity and named presets.

**Target features:**
- Explicit opacity or alpha fallback controls across root read and exact-open APIs
- Named appearance presets that map fallback color and opacity policy at import time
- Unified semantics across root Wasm, `occt-core`, typings, docs, and release verification

</details>

<details>
<summary>Archived v1.2 milestone framing</summary>

## Current Milestone: v1.2 Import Appearance Contract

**Goal:** Turn import-time color behavior into a stable runtime contract so downstream apps can choose source colors or a default CAD color explicitly.

**Target features:**
- `colorMode: "source" | "default"` across root read and exact-open APIs
- `defaultColor` override with a documented built-in CAD fallback when callers do not provide one
- Unified semantics across root Wasm, `occt-core`, typings, docs, and release verification

</details>

---
*Last updated: 2026-04-16 after completing Phase 16 exact relation classifier contract*
