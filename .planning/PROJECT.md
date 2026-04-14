# occt-js

## What This Is

`occt-js` is an OCCT-powered WebAssembly CAD runtime and Babylon-oriented viewer stack for importing STEP, IGES, and BREP data in JavaScript. The repository maintains one root Wasm package, a reusable Babylon package layer (`occt-core`, `occt-babylon-loader`, `occt-babylon-viewer`, `occt-babylon-widgets`), and a shared React/Tauri viewer app for browser and Windows desktop use.

## Core Value

Downstream developers can reliably import real CAD files and reuse the same viewer/runtime stack without breaking the root Wasm release contract.

## Requirements

### Validated

- ✓ Root Wasm runtime imports STEP, IGES, and BREP from memory and returns structured scene data consumed by tests and downstream JS entry points.
- ✓ Import results preserve tree-shaped `rootNodes`, geometry/material payloads, names/colors, and source-unit metadata where the source format provides it.
- ✓ Root API supports explicit root-shape selection and manufacturing-oriented orientation analysis for supported CAD formats.
- ✓ Reusable Babylon package layers exist for normalized OCCT import, Babylon scene building, viewer runtime behavior, and framework-agnostic widgets.
- ✓ Browser demo and additive Windows desktop shell share the same viewer app while keeping npm release boundaries intact.

### Active

- [ ] Stabilize the current root runtime, package surfaces, demo, and desktop contracts under a single GSD-managed roadmap.
- [ ] Raise release confidence through reproducible builds, surface-specific verification, and contract-focused docs/tests.
- [ ] Keep the Babylon package stack reusable and scene-first while future viewer and desktop work continues.

### Out of Scope

- Desktop-only product direction that replaces the browser demo — the web app remains a first-class surface.
- Making Tauri or desktop packaging a prerequisite for root npm publishing — root runtime must stay independently releasable.
- React coupling inside shared Babylon widgets — widgets remain framework-agnostic.
- Broad format expansion beyond OCCT-backed STEP, IGES, and BREP in this milestone — current focus is stabilizing existing surfaces.

## Context

- Brownfield repository with existing shipped surfaces and accumulated design docs from March 2026.
- Root package version is `0.1.7`; package-layer modules and viewer tests already exist in `packages/`, `test/`, and `demo/tests/`.
- Current initialization is intentionally synthesized from repository docs and concrete package/test surfaces instead of a separate `/gsd-map-codebase` run.
- Team intent is to use GSD as the primary planning/execution flow going forward, with superpowers used as supporting process skills.

## Constraints

- **Release boundary**: `dist/occt-js.js`, `dist/occt-js.wasm`, and `dist/occt-js.d.ts` remain the root runtime contract — root release must stay independent of demo and Tauri.
- **Desktop additivity**: Windows desktop work under `demo/src-tauri/` must not break or replace the browser workflow.
- **Windows build path**: Clean Windows rebuilds are expected to use `build/wasm/emsdk`, not a repo-root `emsdk/`.
- **Viewer architecture**: Babylon viewer runtime stays scene-first and packageized; widgets remain non-React.
- **Compatibility**: Changes to C++ bindings, importers, or build scripts require regenerated `dist/` artifacts and root verification before the repo is considered healthy.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Use GSD as the primary repository workflow | The repo now spans root runtime, package layers, web demo, and desktop shell; one planning/execution system reduces drift between surfaces | — Pending |
| Initialize planning from current docs instead of running a separate codebase map first | The repository already has strong local docs and the user explicitly asked to bootstrap from them first | — Pending |
| Treat current root/package/demo/desktop surfaces as the brownfield baseline | The roadmap should harden and extend a real existing product, not re-scope it as greenfield | ✓ Good |
| Keep existing `AGENTS.md` as the authoritative repo instruction file | The repo already consolidated agent guidance there; generic regeneration would risk overwriting local rules | ✓ Good |

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

---
*Last updated: 2026-04-14 after initialization*
