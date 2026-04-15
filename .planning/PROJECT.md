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

### Active

- (None yet — define the next milestone with `/gsd-new-milestone`.)

### Out of Scope

- Evolving this repo into a full viewer framework as the primary goal — the main value is the OCCT Wasm runtime.
- Making Tauri or desktop packaging a prerequisite for root npm publishing — root runtime must stay independently releasable.
- Treating Babylon/demo layers as first-order release gates for the root runtime.
- App-level measurement session UX, overlays, candidate ranking, or feature semantics such as hole/chamfer recognition — these remain downstream concerns until a later milestone explicitly changes scope.

## Current State

`v1.1 Exact BRep Measurement Foundation` shipped on 2026-04-15. The root runtime now exposes a complete exact-measurement foundation for downstream web applications: retained exact-model lifecycle APIs, occurrence-scoped exact refs, exact primitive geometry queries, and pairwise distance/angle/thickness measurements, all without changing the runtime-first product boundary.

The repository is now back in an archive state with no active milestone plan. The next change to `.planning/REQUIREMENTS.md` and `.planning/ROADMAP.md` should come from `/gsd-new-milestone`, not from extending the shipped v1.1 scope in place.

## Next Milestone Goals

- Decide the next runtime-level slice on top of the shipped measurement foundation instead of expanding app/UI semantics into the root package by default.
- Carry forward small runtime-adapter follow-ups, including an explicit import option that ignores source colors and uses the default CAD color.
- Keep release governance centered on `npm run test:release:root` and preserve the root Wasm carrier as the authoritative contract surface.

## Context

- Brownfield repository with an established Wasm build flow, root package contract, demo app, Tauri shell, and package-layer adapters.
- Root package version is still `0.1.7`; the root runtime and root tests remain the primary maintained contract.
- `imos-app` remains the key downstream consumer signal: it vendors `@tx-code/occt-js` and consumes the Wasm/runtime surface directly, while viewer semantics live on the app side.
- `SceneGraph.net` remains the best local reference for measurement behavior above the kernel layer, but `occt-js` intentionally stopped at exact-kernel foundations in v1.1.
- GSD is now the primary repository workflow, with superpowers skills used to tighten execution discipline and verification.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Use GSD as the primary repository workflow | The repo still needs disciplined planning, but the primary object being managed is the Wasm runtime contract rather than the whole viewer stack | ✓ Good |
| Initialize planning from current docs instead of running a separate codebase map first | The repository already had strong local docs and the user explicitly asked to bootstrap from them first | ✓ Good |
| Treat the root Wasm package as the strategic product surface | Downstream consumers primarily need the OCCT Wasm carrier; viewer/demo layers are secondary and should not dominate planning | ✓ Good |
| Keep existing `AGENTS.md` as the authoritative repo instruction file | The repo already consolidated agent guidance there; generic regeneration would risk overwriting local rules | ✓ Good |
| Use `npm run test:release:root` as the canonical root release gate | One command is easier to document, test, and reuse across README, AGENTS, skills, and future planning | ✓ Good |
| Keep demo, Babylon, and Tauri checks conditional secondary-surface verification | Root release flow must stay aligned with the Wasm carrier boundary and avoid secondary-surface gate creep | ✓ Good |
| Keep exact measurement semantics in downstream apps and limit v1.1 to wasm/core primitives | The main value is exposing a reliable geometric kernel contract; selection UX, overlays, and feature interpretation belong above the runtime | ✓ Good |

<details>
<summary>Archived v1.1 milestone framing</summary>

## Current Milestone: v1.1 Exact BRep Measurement Foundation

**Goal:** Extend the root Wasm/runtime surface just enough to support exact BRep measurement in downstream web apps without turning `occt-js` into a viewer framework.

**Target features:**
- Exact model lifecycle handles for retained imported shapes
- Exact topology references for face, edge, and vertex measurement targets
- Primitive measurement APIs for exact geometric values and attach points

</details>

---
*Last updated: 2026-04-15 after v1.1 milestone closeout*
