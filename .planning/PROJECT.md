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
- ✓ Package-first SDK docs, packaged typings, tarball checks, and the authoritative root release gate now lock the exact placement/relation surface end to end.
- ✓ Root preflight and the maintained demo dev runtime now share the same concrete `dist/occt-js.js` and `dist/occt-js.wasm` loading contract, with stale directory-base assumptions rejected by preflight coverage. — Phase 18
- ✓ The authoritative root release gate now verifies publishable runtime/package/docs behavior without depending on live `.planning` archive-state strings, and any retained planning audit runs separately through `npm run test:planning:audit`. — Phase 19
- ✓ README, AGENTS, `packages/occt-core/README.md`, and the thin release skill now document the same split between the authoritative root release gate and the separate planning audit path. — Phase 19
- ✓ Demo and Babylon verification are now discoverable from manifests and top-level docs, loader tests no longer depend on hoisted Babylon installs, and `npm run test:secondary:contracts` locks those surfaces outside the authoritative root release gate. — Phase 20
- ✓ Package-first exact helper semantics now include supported cylindrical hole and planar chamfer descriptors through `@tx-code/occt-core`, with the root carrier growing only by narrow selected-ref queries where package composition genuinely needed them. — Phases 21-22
- ✓ Reusable midpoint, equal-distance, and narrow midplane-style symmetry helpers now compose package-first over the shipped exact placement/relation surface without adding new root carrier APIs. — Phase 22
- ✓ Package-first helper docs, published `@tx-code/occt-core` typings, tarball checks, and the authoritative root release gate now lock the shipped exact helper family end to end without widening secondary-surface release gates. — Phase 23

### Active

- [ ] Safer exact-model lifetime management through explicit JS-side disposal helpers, deterministic invalid-after-release behavior, and diagnostics for unreleased retained handles.
- [ ] Lower per-call overhead in retained exact-model access by removing avoidable store/query copies and reducing import temp-file staging cost for large-model workflows.
- [ ] Lifecycle/performance docs, verification, and release governance for the exact runtime/package surface without widening unconditional secondary-surface release gates.

### Out of Scope

- Evolving this repo into a full viewer framework as the primary goal — the main value is the OCCT Wasm runtime.
- Making Tauri or desktop packaging a prerequisite for root npm publishing — root runtime must stay independently releasable.
- Treating Babylon/demo layers as first-order release gates for the root runtime.
- Selection sessions, overlay rendering, label layout, or measurement widgets in the runtime/package layer — those remain downstream app concerns.
- Whole-model feature discovery, batch semantic indexing, or new helper-family expansion — `v1.7` is reserved for lifecycle/performance hardening of the shipped exact surface.

## Current State

`v1.3 Appearance Expansion` shipped on 2026-04-15 and is now archived in `.planning/milestones/`. The root runtime now exposes `appearancePreset`, `colorMode`, `defaultColor`, and `defaultOpacity`; `occt-core` forwards and normalizes that full contract without inventing viewer-side repaint behavior; and root/package docs plus `npm run test:release:root` now lock the shipped semantics in place.

`v1.4 Exact Measurement Placement & Relation SDK` shipped on 2026-04-16 and is now archived in `.planning/milestones/`. The root runtime and `occt-core` now expose additive exact placement helpers plus exact relation classification for `parallel`, `perpendicular`, `concentric`, `tangent`, and `none`, all with occurrence-safe supporting geometry DTOs. Package-first SDK docs, packaged typings, tarball assertions, and the authoritative release gate now lock that exact measurement surface end to end.

`v1.5 Root Release Hardening` shipped on 2026-04-18 and is now archived in `.planning/milestones/`. Phases 18-20 stabilized the root runtime-path contract, separated `.planning` governance audits from the authoritative release gate, and made demo/Babylon verification explicit and conditional through manifest-first commands and `test:secondary:contracts`.

`v1.6 Exact Semantics Helpers` shipped on 2026-04-18 and is now archived in `.planning/milestones/`. The milestone added package-first hole/chamfer descriptors, midpoint/equal-distance/symmetry helpers, published `@tx-code/occt-core` typings, and helper-aware authoritative release-governance coverage for the shipped family.

`v1.7 Exact Lifecycle & Performance` is now the active milestone. The goal is to harden retained exact-model lifetime management, remove known retained-query and import-staging cost hotspots, and lock long-session lifecycle/performance governance before widening helper breadth or package ecosystem scope.

## Current Milestone: v1.7 Exact Lifecycle & Performance

**Goal:** Harden retained exact-model lifecycle and performance on top of the shipped exact runtime/helper surface without expanding into viewer-owned behavior or secondary-surface sprawl.

**Target features:**
- Safer exact-model lifetime management, disposal helpers, and diagnostics for retained-handle workflows.
- Lower-cost exact-model store/query access and reduced import staging overhead for large-model exact workflows.
- Long-session verification, docs, and release governance for lifecycle/performance expectations while keeping `npm run test:release:root` runtime-first.

## Context

- Brownfield repository with an established Wasm build flow, root package contract, demo app, Tauri shell, and package-layer adapters.
- Root package version is `0.1.8`; the root runtime and root tests remain the primary maintained contract.
- `imos-app` remains the key downstream consumer signal: it vendors `@tx-code/occt-js` and consumes the Wasm/runtime surface directly, while viewer semantics live on the app side.
- `SceneGraph.net` remains the best local reference for measurement behavior above the kernel layer, but `occt-js` intentionally stopped at exact-kernel foundations plus package-first placement/relation support.
- OCCT `PrsDim` remains the local geometry reference for placement and relation behavior, but `occt-js` intentionally stops short of AIS/Prs3d interactive dimensions.
- The current exact runtime now exposes retained exact-model lifecycle, primitive exact queries, pairwise distance/angle/thickness, placement DTOs, relation classification, narrow selected-ref hole/chamfer helper semantics, package-only midpoint/equal-distance/symmetry helpers, published package typings, and helper-aware release verification; `v1.7` now focuses on lifecycle safety and runtime cost hotspots inside that shipped surface.
- Known `v1.7` pressure points already visible in the current codebase include retained-model release discipline, lack of caller-facing diagnostics for unreleased handles, avoidable `ExactModelStore` copy costs, and temp-file staging overhead in import paths such as IGES.
- The formal follow-on milestone sequence after `v1.7` is:
  `v1.8 Package Ecosystem & Secondary Surfaces`.
- GSD is the primary repository workflow; superpowers remain optional support tooling for narrow tasks only.
- Deferred seed `SEED-001-web-exact-brep-measurement` is effectively exhausted: its kernel foundation shipped in `v1.1`/`v1.4`, its package-first helper layer shipped in `v1.6`, and any future follow-on should stay additive and package-first rather than reopen viewer ownership.

## Constraints

- **Release boundary**: `dist/occt-js.js`, `dist/occt-js.wasm`, and `dist/occt-js.d.ts` remain the root runtime contract — release verification stays centered on `npm run test:release:root`.
- **Backward compatibility**: Existing `MeasureExact*` result shapes and `@tx-code/occt-core` exact measurement wrappers must remain source-compatible; future additions need to stay additive.
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
| Keep SDK docs package-first with `@tx-code/occt-core` as the primary entry point | Most downstream JS consumers should start from exact refs and occurrence-safe adapters, with root Wasm documented as the lower-level reference | ✓ Good |
| Start the next cycle with release hardening before new exact helpers | The current codebase map shows root preflight drift and brittle governance checks; shipping more API surface before fixing the release boundary would compound risk | ✓ Good |
| Lock Phase 18 on the concrete local-dev JS/Wasm file URLs already used by maintained consumers | One shared runtime-path contract across preflight and demo loading is safer than reintroducing ambiguous directory-base lookup semantics | ✓ Good |
| Separate `.planning` audits from `npm run test:release:root` via an explicit maintainer command | Runtime/package release verification must stay independent of milestone lifecycle drift while planning audits remain intentionally runnable | ✓ Good |
| Keep the default demo browser E2E lane on a current Project Home smoke path instead of the stale viewer-first suite | Phase 20 needed a maintained manifest-first browser command that matches the shipped shell instead of asserting an outdated demo layout | ✓ Good |
| Lock secondary-surface routing through `npm run test:secondary:contracts` and touched-path docs instead of widening `npm run test:release:root` | Demo, Babylon, and Tauri surfaces need discoverability and repeatability without polluting the authoritative root Wasm release boundary | ✓ Good |
| Carry the deferred web exact-measurement seed forward only through package-first helper semantics | The exact kernel foundation already shipped in `v1.1`/`v1.4`; `v1.6` should build additive helper semantics, not reopen viewer or broad kernel-boundary work | ✓ Good |
| Ship hole semantics as a package-first single-ref helper backed by one narrow carrier query | `v1.6` needs reusable helper semantics without reopening whole-model feature recognition or viewer-owned selection policy | ✓ Good |
| Keep supported chamfer semantics narrow and selected-ref-based | `v1.6` needs reusable chamfer data without adding broad feature discovery or whole-model topology APIs to the root carrier | ✓ Good |
| Keep midpoint, equal-distance, and symmetry helpers package-only where shipped placement/relation DTOs already suffice | The existing occurrence-space geometry surface is rich enough to derive these helpers without reopening the root runtime boundary; symmetry stays intentionally limited to a midplane helper over supported parallel pairs | ✓ Good |
| Lock the helper SDK package-first through package-local typings plus root governance/tarball coverage | Phase 23 needed the helper family to be releasable without blurring the root/package boundary or widening secondary-surface gates | ✓ Good |
| Sequence lifecycle/performance hardening before broader semantics or ecosystem cleanup | The exact helper surface is now shipped; stabilizing retained-handle safety and large-model cost hotspots reduces downstream risk before adding more breadth | ✓ Good |

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
<summary>Archived v1.6 milestone framing</summary>

## Current Milestone: v1.6 Exact Semantics Helpers

**Goal:** Add package-first exact semantics helpers on top of the shipped kernel primitives without turning `occt-js` into a viewer-first or feature-recognition-first product.

**Target features:**
- Package-first `hole` and `chamfer` helper semantics, using existing exact primitives where possible and minimal additive kernel support only when unavoidable.
- Reusable equal-distance, symmetry, midpoint, and similar higher-level exact helper semantics built on the shipped placement/relation surface.
- Package-first docs, typings, tarball expectations, and release governance that lock the helper surface without widening secondary-surface release gates.

</details>

<details>
<summary>Archived v1.5 milestone framing</summary>

## Current Milestone: v1.5 Root Release Hardening

**Goal:** Re-stabilize the authoritative root release contract so future runtime/package milestones can ship without preflight, governance, or secondary-surface drift.

**Target features:**
- Align root preflight/runtime-path assertions with the shipped `dist/occt-js.js` and `dist/occt-js.wasm` loading contract.
- Separate root release governance from brittle `.planning/` archive-state assertions while preserving runtime/package contract coverage.
- Make secondary-surface package and demo verification discoverable and runnable without turning them into unconditional root release gates.

</details>

<details>
<summary>Archived v1.4 milestone framing</summary>

## Current Milestone: v1.4 Exact Measurement Placement & Relation SDK

**Goal:** Add runtime-first exact placement helpers, relation classifiers, and package-first SDK documentation without turning `occt-js` into a viewer framework.

**Target features:**
- Stable placement helpers for exact distance, angle, radius, diameter, and thickness
- Exact relation classifiers for `parallel`, `perpendicular`, `concentric`, `tangent`, and `none`
- Package-first SDK docs through `@tx-code/occt-core`, with root Wasm documented as the lower-level reference surface

</details>

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
*Last updated: 2026-04-18 after starting milestone v1.7 Exact Lifecycle & Performance*
