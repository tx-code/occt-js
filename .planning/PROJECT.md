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
- ✓ Phase 24 lifecycle governance now ships additive root diagnostics (`GetExactModelDiagnostics`), deterministic released-handle exact-query behavior, and package-first managed disposal wrappers in `@tx-code/occt-core`. — Phase 24
- ✓ Phase 25 performance hardening now removes avoidable retained-query/store copy overhead, shares IGES temp-file staging across import and orientation paths, and adds an explicit perf visibility lane (`npm run test:perf:exact`). — Phase 25
- ✓ Phase 26 closeout now publishes package-first lifecycle/performance guidance, governance locks for perf/soak routing, and explicit long-session evidence via `npm run test:soak:exact`. — Phase 26
- ✓ Downstream JS code can validate and build app-neutral revolved shapes from one normalized profile spec through the root Wasm runtime. — Phase 27
- ✓ Generated revolved-shape flows now retain exact geometry, expose stable segment-to-face bindings, and report explicit closure/cap/profile roles plus deterministic default appearance. — Phase 28
- ✓ `@tx-code/occt-core`, published typings, docs, and release governance now lock the generic revolved-shape contract package-first without widening the runtime-first boundary. — Phase 29
- ✓ Downstream JS code can validate one shared `Profile2D` contract reused across generated solid families without revolved-only drift. — Phase 30
- ✓ Downstream JS code can validate, build, and exact-open linear extruded solids with stable wall/cap bindings and deterministic runtime-owned appearance. — Phase 31
- ✓ `@tx-code/occt-core`, published typings, docs, tarball checks, and the authoritative root release gate now lock the shared-profile and extruded-shape contract package-first. — Phase 32
- ✓ The browser demo now retains actor-scoped exact state for an imported workpiece plus generated tool and resolves viewer picks into occurrence-safe exact refs suitable for shipped measurement primitives. — Phases 33-33.1
- ✓ The browser demo now supports typed exact measurement runs, explicit supported actions, and current-result inspection with placement-backed overlays without widening the root DTO boundary. — Phase 34
- ✓ Demo/package docs, browser verification, and conditional governance now lock the exact measurement workflow as a secondary-surface lane outside the authoritative root release gate. — Phase 35
- ✓ `@tx-code/occt-core` now ships package-first `counterbore` / `countersink` helpers over one narrow selected-ref carrier addition, while candidate analysis and higher-level measurement action mapping remain outside the package contract. — Phase 36
- ✓ Phase 38 boundary cleanup now keeps demo-local action/session semantics out of the published `@tx-code/occt-core` surface through stronger package/governance checks and minimal package-facing wording fixes, without widening the authoritative root release gate. — Phase 38
- ✓ Root README, SDK docs, active planning truth, and conditional verification now describe and enforce the reduced browser measurement sample through supported exact action routing, current-result inspection, and unchanged root release routing instead of older workflow-history wording. — Phase 39
- ✓ Root/package/sdk docs plus conditional secondary/governance coverage now lock the `v1.13` CAM sample ownership split (`clearance / step depth`, `center-to-center`, `surface-to-center`) as demo-owned composition over shipped exact primitives without widening `npm run test:release:root`. — Phase 42

### Recently Shipped

- `v1.13 CAM Measurement Integration Sample` shipped on 2026-04-22.
- The browser demo now exposes CAM-flavored measurement sample workflows while keeping those semantics demo-owned.
- Root/package release boundaries stayed unchanged: conditional secondary-surface governance remained outside `npm run test:release:root`.
- No active milestone is open after `v1.13`; start the next milestone with `$gsd-new-milestone`.

### Out of Scope

- Evolving this repo into a full viewer framework as the primary goal — the main value is the OCCT Wasm runtime.
- Making Tauri or desktop packaging a prerequisite for root npm publishing — root runtime must stay independently releasable.
- Treating Babylon/demo layers as first-order release gates for the root runtime.
- Moving selection sessions, overlay rendering, label layout, or measurement widgets into the runtime/package layer — those remain downstream app concerns even if `v1.10` adds a demo-owned MVP.
- Automatic whole-model measurement candidate discovery or semantic feature mining — `v1.10` is proving the manual selection-to-measure loop first.
- Full AIS/Prs3d-style dimension authoring, annotation editing, or label-layout systems — the milestone needs inspection-grade demo behavior, not a full dimension product surface.
- New broad exact-runtime APIs before the demo loop proves a concrete missing primitive — the current kernel/package surface is already broad, and only additive cross-model pairwise support justified by the workpiece-plus-tool loop is in scope.
- Persistent measurement history, reporting, tolerance analysis, or collaboration workflows — those are app/product features above the geometry/runtime layer.
- PMI / GD&T authoring, CMM programming, probing result import, or enterprise quality-data loops — useful reference context, but outside the current `occt-js` milestone boundary.
- Whole-model CAM analysis such as minimum-radius heatmaps, accessibility / undercut analysis, or deviation-coloring workflows — these require a future explicit milestone rather than silent scope creep.

## Current State

`v1.13 CAM Measurement Integration Sample` shipped on 2026-04-22. Phases 40, 41, and 42 are complete: the browser demo now exposes demo-owned CAM workflows (`clearance / step depth`, `center-to-center`, `surface-to-center`) over shipped exact primitives, sample-first wording is aligned for workpiece/tool scenarios, and docs plus conditional governance now lock CAM drift without widening `npm run test:release:root`.

There is currently no active milestone. The next milestone should be created with `$gsd-new-milestone` so requirements and roadmap scope are re-established explicitly.

`v1.12 Surface Subtraction & Boundary Cleanup` shipped on 2026-04-21 and is now archived in `.planning/milestones/`. Phases 37-39 completed the intended subtraction pass: the browser demo is a simpler integration sample, package/demo boundary drift was pruned, and live docs plus conditional verification now enforce the reduced surface without widening `npm run test:release:root`.

`v1.11 Supported Semantic Helpers` shipped on 2026-04-21 and is now archived in `.planning/milestones/`. The shipped result is intentionally narrow: package-first compound-hole helpers (`counterbore` / `countersink`) now exist over the retained exact surface, while candidate-analysis, demo candidate suggestion, pinned/exportable session workflows, and related productivity-governance follow-on were dropped before acceptance and are not part of the archived shipped behavior.

`v1.10 Exact Measurement Demo Loop` shipped on 2026-04-21 and is now archived in `.planning/milestones/`. The browser demo now keeps imported workpiece and generated tool actors alive in one shared exact workspace, resolves Babylon picks into actor-scoped occurrence-safe refs, supports additive cross-model exact pairwise measurement, and exposes demo-owned typed measurement plus placement-backed overlay flows without widening the authoritative root release gate.

`v1.3 Appearance Expansion` shipped on 2026-04-15 and is now archived in `.planning/milestones/`. The root runtime now exposes `appearancePreset`, `colorMode`, `defaultColor`, and `defaultOpacity`; `occt-core` forwards and normalizes that full contract without inventing viewer-side repaint behavior; and root/package docs plus `npm run test:release:root` now lock the shipped semantics in place.

`v1.4 Exact Measurement Placement & Relation SDK` shipped on 2026-04-16 and is now archived in `.planning/milestones/`. The root runtime and `occt-core` now expose additive exact placement helpers plus exact relation classification for `parallel`, `perpendicular`, `concentric`, `tangent`, and `none`, all with occurrence-safe supporting geometry DTOs. Package-first SDK docs, packaged typings, tarball assertions, and the authoritative release gate now lock that exact measurement surface end to end.

`v1.5 Root Release Hardening` shipped on 2026-04-18 and is now archived in `.planning/milestones/`. Phases 18-20 stabilized the root runtime-path contract, separated `.planning` governance audits from the authoritative release gate, and made demo/Babylon verification explicit and conditional through manifest-first commands and `test:secondary:contracts`.

`v1.6 Exact Semantics Helpers` shipped on 2026-04-18 and is now archived in `.planning/milestones/`. The milestone added package-first hole/chamfer descriptors, midpoint/equal-distance/symmetry helpers, published `@tx-code/occt-core` typings, and helper-aware authoritative release-governance coverage for the shipped family.

`v1.7 Exact Lifecycle & Performance` shipped on 2026-04-20 and is now archived in `.planning/milestones/`. Phases 24-26 shipped lifecycle diagnostics, managed disposal helpers, retained-query/store and IGES staging performance hardening, governance-locked lifecycle/perf docs, and explicit long-session soak evidence.

`v1.8 Wasm+JS Revolved Shape Generation` shipped on 2026-04-21 and is now archived in `.planning/milestones/`. The repo now exposes a generic revolved-shape runtime/package surface with retained exact-open support, stable face-binding semantics, and governance-locked package/docs coverage while keeping tool-library ownership downstream.

`v1.9 Generic Profile Solids` shipped on 2026-04-21 and is now archived in `.planning/milestones/`. Phases 30-32 delivered the shared `Profile2D` kernel, additive linear extruded runtime, and package-first `occt-core`/docs/governance coverage while keeping app-specific schema ownership, CAM semantics, and viewer behavior outside the root runtime.

## No Active Milestone

`v1.13` is archived and complete.

Start the next milestone with:

`$gsd-new-milestone`

<details>
<summary>Archived v1.12 milestone framing</summary>

## Current Milestone: v1.12 Surface Subtraction & Boundary Cleanup

**Goal:** Pull `occt-js` back to a cleaner runtime/package/demo-integration boundary by removing unnecessary demo/product complexity, pruning app-owned surface drift, and realigning docs/tests to the reduced scope.

**Target features:**
- Simplify the browser demo so it reads as an explicit integration sample instead of a half-product measurement workflow.
- Prune or tighten boundary-drifting package/demo surfaces so app-owned policy stays downstream.
- Realign docs, typings, and verification to the reduced surface without widening the authoritative root release gate.

</details>

## Context

- Brownfield repository with an established Wasm build flow, root package contract, demo app, Tauri shell, and package-layer adapters.
- Root package version is `0.1.8`; the root runtime and root tests remain the primary maintained contract.
- `imos-app` remains the key downstream consumer signal: it vendors `@tx-code/occt-js` and consumes the Wasm/runtime surface directly, while viewer semantics live on the app side.
- `SceneGraph.net` remains the best local reference for measurement behavior above the kernel layer, but `occt-js` intentionally stopped at exact-kernel foundations plus package-first placement/relation support.
- OCCT `PrsDim` remains the local geometry reference for placement and relation behavior, but `occt-js` intentionally stops short of AIS/Prs3d interactive dimensions.
- The current exact runtime now exposes retained exact-model lifecycle, primitive exact queries, pairwise distance/angle/thickness, placement DTOs, relation classification, narrow selected-ref hole/chamfer/counterbore/countersink semantics, package-only midpoint/equal-distance/symmetry helpers, published package typings, helper-aware release verification, additive lifecycle diagnostics, package-first managed disposal wrappers, and explicit perf/soak verification lanes.
- The runtime/package surface already includes `measureExactCenter(...)`, so center-based CAM workflows can start as demo-owned compositions instead of demanding new workflow-shaped root APIs.
- `v1.7`, `v1.8`, `v1.9`, `v1.10`, `v1.11`, and `v1.12` are archived in `.planning/milestones/`.
- The demo now supports a multi-actor workspace for imported workpieces and generated tools, actor-scoped selection-to-exact-ref bridging, and demo-owned measurement plus overlay behavior on top of the shipped kernel.
- Cross-model exact pairwise support now ships additively through explicit root entrypoints plus package-first dispatch, so workpiece-plus-tool measurements no longer require one shared `exactModelId`.
- The dormant `SEED-001-web-exact-brep-measurement` direction has now been partially resolved as a demo-first integration milestone; any broader measurement-product work should be scoped explicitly in a future milestone.
- `v1.11` shipped as a helper-only milestone; `v1.12` intentionally reverses some accumulated surface complexity before any broader measurement productivity work is reconsidered.
- Recent CAM comparison research was absorbed as prioritization input, but only the demo-first subset fits the current repo boundary: practical measurement workflows such as spacing, clearance, and step depth, not PMI/CMM/probing/reporting platforms.
- GSD is the primary repository workflow; superpowers remain optional support tooling for narrow tasks only.

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
| Keep lifecycle diagnostics explicit and managed disposal package-first | Phase 24 needed safer lifecycle ergonomics while preserving root numeric handle ownership and avoiding viewer/global disposal policy | ✓ Good |
| Model generated shapes as app-neutral revolved profile specs instead of importing third-party tool schemas into the root runtime | Different tool-definition apps need one stable geometry contract, while schema ownership and adapter logic stay upstream | ✓ Good |
| Derive generated-shape appearance from runtime tag and role semantics rather than caller-supplied colors | The generated-shape surface should stay easy to consume in downstream apps without forcing every caller to own material policy | ✓ Good |
| Reuse one shared 2D profile kernel across revolved and extruded families | Avoid duplicated validation/spec seams and keep profile-driven geometry generic-first | ✓ Good |
| Keep `v1.9` limited to linear extrusion over planar closed profiles | Shared profile abstractions need one more proven family before loft/sweep or richer feature stacks | ✓ Good |
| Lock shared-profile and extruded-shape coverage package-first without inventing a second schema | Downstream JS needs one stable contract across root/runtime/package/docs, while app-owned tool adapters stay upstream | ✓ Good |
| Prove exact measurement usability through a demo-owned integration loop before adding more kernel surface | The runtime and `occt-core` already ship a broad measurement kernel; the highest remaining risk is integration correctness, lifecycle safety, and demo ergonomics | ✓ Good |
| Keep selection-to-exact-ref mapping inside the demo bridge instead of pushing viewer ids into root APIs | Exact refs must stay occurrence-safe and retained-handle-aware, while Babylon entity ids are app-local and disposable | ✓ Good |
| Introduce a multi-actor demo workspace before shipping the measurement MVP | The requested workpiece-plus-tool loop requires simultaneous retained exact actors, movable tool pose, and actor-scoped selection state before measurement commands can be correct | ✓ Good |
| Treat cross-model exact pairwise support as an additive, demo-proven kernel gap rather than a generic API expansion | Current pairwise wrappers require one shared `exactModelId`; the workpiece-plus-tool loop makes that limitation concrete enough to justify a narrow additive extension | ✓ Good |
| Keep measurement execution, typed result normalization, and overlay ownership demo-local over `@tx-code/occt-core` | The shipped kernel/package surface was already broad enough; the remaining risk was integration correctness rather than more viewer/runtime abstraction | ✓ Good |
| Reuse the existing Babylon line-pass overlay instead of introducing dimension widgets or label systems | `v1.10` needed scene guides and inspection output without turning the repo into a full annotation framework | ✓ Good |
| Keep measurement verification manifest-routed and conditional | The demo loop needed strong docs and browser coverage, but `npm run test:release:root` must remain the authoritative root gate | ✓ Good |
| Keep `v1.11` limited to supported semantic helpers after dropping unaccepted productivity scope | The retained value is helper-first package/runtime work; action mapping and session UX should not keep widening the active milestone | ✓ Good |
| Keep selection-to-action mapping demo-owned instead of adding a package candidate-analysis API | Supported measurement suggestions are app behavior above the helper contract and should not pull viewer policy into package code | ✓ Good |
| Clarify the demo-owned measurement action seam before touching package exports | The most immediate remaining drift was generic demo helper naming and internal ownership copy, not missing runtime/package capability | ✓ Good |
| Prefer stronger contract tests and one minimal package-facing wording fix over unnecessary occt-core export churn | The package barrel/types were already minimal, so boundary cleanup should lock and describe that fact rather than pretending an API rewrite was needed | ✓ Good |
| Keep pinned session state and export behavior outside the current active milestone | Session persistence improves usability, but it should remain downstream product scope rather than widening the root or package contract | ✓ Good |
| Use `v1.12` for subtraction before more feature growth | The repository now benefits more from simplification and boundary cleanup than from adding another layer of behavior on top of the current surfaces | ✓ Good |
| Open `v1.13` as a milestone instead of planting another seed | The shipped exact surface plus recent CAM workflow research now define a narrow, executable demo-first scope rather than a vague future direction | ✓ Good |
| Keep CAM workflow semantics demo-owned and compose them over shipped exact primitives | `clearance`, `step depth`, and center-based spacing are workflow labels above the reusable exact kernel and do not justify new workflow-shaped root APIs yet | ✓ Good |
| Treat PMI/CMM/probing/reporting capability as reference context, not accepted milestone scope | Those workflows exceed the current runtime/package/demo boundary and would turn `occt-js` into a different product | ✓ Good |

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
<summary>Archived v1.11 milestone framing</summary>

## Current Milestone: v1.11 Supported Semantic Helpers

**Goal:** Add supported package-first semantic helpers over the shipped exact surface without widening the authoritative root Wasm release boundary or pulling measurement action/session policy into package/root code.

**Target features:**
- Package-first semantic measurement helpers for supported `counterbore` and `countersink` cases over the shipped exact surface.
- Typed `@tx-code/occt-core` helper APIs with occurrence-safe outputs and explicit unsupported behavior.
- Keep measurement action mapping, candidate suggestion, and session UX in downstream app code rather than package/root code.

</details>

<details>
<summary>Archived v1.10 milestone framing</summary>

## Current Milestone: v1.10 Exact Measurement Demo Loop

**Goal:** Prove the shipped exact measurement kernel through one browser demo workflow without widening the authoritative root Wasm release boundary or turning `occt-js` into a viewer framework.

**Target features:**
- Managed exact-model retention in the demo import lane plus clean disposal and reset behavior.
- Multi-actor workspace support for an imported workpiece plus generated tool, including movable tool pose.
- Actor-scoped selection-to-exact-ref bridging from rendered face, edge, and vertex picks.
- Demo-owned exact measurement commands, typed results, and minimal placement-backed overlay or inspection output, including workpiece-tool measurement paths.
- Docs, tests, and conditional secondary-surface verification for the measurement demo loop.

</details>

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
*Last updated: 2026-04-22 after v1.13 phase 42 completion*
