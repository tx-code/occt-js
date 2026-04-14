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
- ✓ Root release verification is now anchored on `npm run test:release:root` plus `test/release_governance_contract.test.mjs`.
- ✓ Demo, Babylon, and Tauri checks remain conditional secondary-surface verification rather than unconditional root release gates.

### Active

- [ ] Define the next milestone beyond v1 runtime hardening.
- [ ] Preserve the runtime-first contract as future analytics, CI automation, or secondary-surface work is added.

### Out of Scope

- Evolving this repo into a full viewer framework as the primary goal — the main value is the OCCT Wasm runtime.
- Making Tauri or desktop packaging a prerequisite for root npm publishing — root runtime must stay independently releasable.
- Treating Babylon/demo layers as first-order release gates for the root runtime.
- Broad format expansion beyond OCCT-backed STEP, IGES, and BREP in this milestone — current focus is stabilizing the existing runtime contract.

## Context

- Brownfield repository with existing shipped surfaces and accumulated design docs from March 2026.
- Root package version is `0.1.7`; the root runtime and root tests are the primary maintained contract.
- `imos-app` is the important downstream consumer signal: it vendors `@tx-code/occt-js` and consumes the Wasm/runtime surface directly, while Babylon viewer code is internalized on the `imos-app` side.
- Current initialization is intentionally synthesized from repository docs and concrete package/test surfaces instead of a separate `/gsd-map-codebase` run.
- Team intent is to use GSD as the primary planning/execution flow going forward, with superpowers used as supporting process skills.

## Constraints

- **Release boundary**: `dist/occt-js.js`, `dist/occt-js.wasm`, and `dist/occt-js.d.ts` remain the root runtime contract — root release must stay independent of demo and Tauri.
- **Windows build path**: Clean Windows rebuilds are expected to use `build/wasm/emsdk`, not a repo-root `emsdk/`.
- **Downstream compatibility**: Changes to C++ bindings, importers, packaging, or `dist/` loading behavior must preserve downstream runtime consumption patterns such as vendored/tarballed use in `imos-app`.
- **Non-core surfaces**: Demo, desktop, and Babylon viewer layers may exist, but they must not redefine the root package scope or release criteria.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Use GSD as the primary repository workflow | The repo still needs disciplined planning, but the primary object being managed is the Wasm runtime contract rather than the whole viewer stack | ✓ Good |
| Initialize planning from current docs instead of running a separate codebase map first | The repository already has strong local docs and the user explicitly asked to bootstrap from them first | ✓ Good |
| Treat the root Wasm package as the strategic product surface | Downstream consumers primarily need the OCCT Wasm carrier; viewer/demo layers are secondary and should not dominate planning | ✓ Good |
| Keep existing `AGENTS.md` as the authoritative repo instruction file | The repo already consolidated agent guidance there; generic regeneration would risk overwriting local rules | ✓ Good |
| Use `npm run test:release:root` as the canonical root release gate | One command is easier to document, test, and reuse across README, AGENTS, skills, and future planning | ✓ Good |
| Keep demo, Babylon, and Tauri checks conditional secondary-surface verification | Root release flow must stay aligned with the Wasm carrier boundary and avoid secondary-surface gate creep | ✓ Good |

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
*Last updated: 2026-04-14 after Phase 04 governance alignment*
