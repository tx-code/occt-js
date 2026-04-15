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

### Active

- (None yet — define the next milestone with `/gsd-new-milestone`.)

### Out of Scope

- Evolving this repo into a full viewer framework as the primary goal — the main value is the OCCT Wasm runtime.
- Making Tauri or desktop packaging a prerequisite for root npm publishing — root runtime must stay independently releasable.
- Treating Babylon/demo layers as first-order release gates for the root runtime.
- Viewer-side repaint, theme switching, or display overrides after import — shipped appearance work stays at import-time contract boundaries, not post-import presentation logic.
- Persistent user-setting storage inside the runtime — downstream apps own settings persistence and pass the chosen appearance options into import calls.

## Current State

`v1.2 Import Appearance Contract` shipped on 2026-04-15. The root runtime now exposes explicit import appearance controls through `colorMode` and `defaultColor`, `occt-core` forwards and normalizes that contract without inventing fallback materials unless default appearance is explicit, and the root/package docs plus release governance now lock the shipped semantics in place.

The repository is now back in an archive state with no active milestone plan. The next change to `.planning/REQUIREMENTS.md` and `.planning/ROADMAP.md` should come from `/gsd-new-milestone`, not from extending the shipped v1.2 scope in place.

## Next Milestone Goals

- Decide the next runtime-level slice on top of the shipped import appearance contract instead of broadening app/UI semantics into the root package by default.
- Revisit appearance follow-ups only if they stay runtime-first, such as additional import-time fallback controls or richer package-level appearance presets.
- Keep release governance centered on `npm run test:release:root` and preserve the root Wasm carrier as the authoritative contract surface.

## Context

- Brownfield repository with an established Wasm build flow, root package contract, demo app, Tauri shell, and package-layer adapters.
- Root package version is still `0.1.7`; the root runtime and root tests remain the primary maintained contract.
- `imos-app` remains the key downstream consumer signal: it vendors `@tx-code/occt-js` and consumes the Wasm/runtime surface directly, while viewer semantics live on the app side.
- `SceneGraph.net` remains the best local reference for measurement behavior above the kernel layer, but `occt-js` intentionally stopped at exact-kernel foundations in v1.1.
- The shipped root import contract now exposes `colorMode?: "source" | "default"` and `defaultColor?: { r, g, b }` on the Wasm boundary.
- `packages/occt-core/src/model-normalizer.js` only synthesizes fallback materials when callers explicitly request default appearance, preserving colorless runtime output otherwise.
- GSD is now the primary repository workflow, with superpowers skills used to tighten execution discipline and verification.

## Constraints

- **Release boundary**: `dist/occt-js.js`, `dist/occt-js.wasm`, and `dist/occt-js.d.ts` remain the root runtime contract — release verification stays centered on `npm run test:release:root`.
- **Backward compatibility**: Existing callers that still use `readColors` need deterministic compatibility or explicit precedence when new appearance options land.
- **Product boundary**: App code owns persisted user settings; the runtime only consumes import appearance options and returns the resulting colors/materials.
- **Downstream compatibility**: Changes to import params, typings, or normalized materials must preserve packaged and vendored consumption paths such as `imos-app`.

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
| Treat import appearance as a runtime contract instead of a viewer repaint convention | Downstream apps need deterministic imported material output that can be driven by settings and reused across package consumers | ✓ Good |

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
*Last updated: 2026-04-15 after v1.2 milestone closeout*
