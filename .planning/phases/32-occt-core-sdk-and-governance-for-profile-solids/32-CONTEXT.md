# Phase 32: occt-core SDK & Governance for Profile Solids - Context

**Gathered:** 2026-04-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 32 ships the already-built shared-profile and linear extruded-shape runtime contract package-first through `@tx-code/occt-core`, published typings, root/package docs, and authoritative release-governance coverage. Scope is limited to JS/package wrappers, normalized metadata preservation, documentation, and contract tests. This phase does not add new root Wasm geometry capabilities, does not widen unconditional demo/Babylon/Tauri release gates, and does not reintroduce app-owned tool schemas or viewer policy into the runtime/package boundary.

</domain>

<decisions>
## Implementation Decisions

### Package-first SDK surface
- **D-01:** `@tx-code/occt-core` must expose additive thin wrappers for `validateProfile2DSpec`, `validateExtrudedShapeSpec`, `buildExtrudedShape`, and `openExactExtrudedShape`.
- **D-02:** Those wrappers stay parallel to the existing revolved-shape wrappers: they forward root DTOs directly and do not invent a second profile or extruded-shape schema at the package layer.

### Normalization and typed metadata
- **D-03:** `normalizeOcctResult(...)` and `normalizeExactOpenResult(...)` must recognize `sourceFormat: "generated-extruded-shape"` and preserve additive top-level `extrudedShape` metadata the same way they already preserve `revolvedShape`.
- **D-04:** Shared-profile validation remains a validation-only lane. Phase 32 should not invent a synthetic normalized profile DTO when the root runtime already publishes the canonical validation result.

### Documentation and release governance
- **D-05:** Root and package docs must describe the shared `Profile2D` plus extruded-shape contract generically, while keeping tool-library schemas, app adapters, and viewer semantics explicitly downstream.
- **D-06:** The authoritative release boundary remains `npm run test:release:root`. Phase 32 must add profile-solid coverage without widening unconditional secondary-surface checks.
- **D-07:** Tarball/docs/governance tests must fail on drift in the shared-profile or extruded-shape contract across README language, packaged typings, and `@tx-code/occt-core` package-first usage.

### the agent's Discretion
- Keep naming parallel to the existing revolved package surface as long as new profile/extruded names match the published root runtime names exactly.
- Choose the narrowest normalization refactor that preserves additive family metadata for both generated solid families without disturbing import-model behavior.
- Choose whether profile-solid examples live inline in `README.md`, `packages/occt-core/README.md`, or both, as long as the authoritative docs clearly show the package-first path and lower-level root reference path.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone and repository contract
- `.planning/PROJECT.md` — active `v1.9` milestone framing and package-first release boundary.
- `.planning/REQUIREMENTS.md` — `SDK-02` and `GOV-02` plus out-of-scope limits for `v1.9`.
- `.planning/ROADMAP.md` — Phase 32 goal, success criteria, and plan split between package wrappers and governance lock-in.
- `.planning/STATE.md` — current workflow position and active milestone status.
- `AGENTS.md` — authoritative repository rules for root/package boundaries, test routing, and GSD-first workflow handling.

### Prior phase decisions
- `.planning/phases/30-shared-profile-kernel/30-CONTEXT.md` — shared `Profile2D` ownership, strict validation, and generic-first naming.
- `.planning/phases/31-linear-extruded-shape-runtime/31-CONTEXT.md` — additive extruded-shape runtime scope and stable semantic face-binding expectations.
- `.planning/phases/31-linear-extruded-shape-runtime/31-01-SUMMARY.md` — shipped root extruded validate/build/exact-open contract.
- `.planning/phases/31-linear-extruded-shape-runtime/31-02-SUMMARY.md` — shipped stable extruded wall/cap bindings and deterministic appearance grouping.
- `.planning/milestones/v1.8-phases/29-occt-core-sdk-and-governance-for-revolved-shapes/29-01-PLAN.md` — prior package-wrapper pattern for generated solid families.
- `.planning/milestones/v1.8-phases/29-occt-core-sdk-and-governance-for-revolved-shapes/29-02-PLAN.md` — prior docs/governance lock-in pattern for generated solid families.

### Existing package and governance surfaces
- `packages/occt-core/src/occt-core.js` — current thin wrapper pattern and current revolved-only gap.
- `packages/occt-core/src/index.d.ts` — published package typing surface that must mirror root runtime DTOs additively.
- `packages/occt-core/src/model-normalizer.js` — additive generated-family metadata normalization boundary.
- `packages/occt-core/src/exact-model-normalizer.js` — exact-open normalization path that must preserve additive generated-family metadata.
- `packages/occt-core/test/core.test.mjs` — package contract tests and wrapper/mock pattern to extend.
- `packages/occt-core/README.md` — package-first SDK documentation that currently stops at revolved shapes.
- `README.md` — authoritative root-facing runtime/package docs and release-boundary language.
- `test/release_governance_contract.test.mjs` — release-governance assertions for root docs and package-first coverage.
- `test/package_tarball_contract.test.mjs` — packaged README/types contract assertions for the published root carrier.

### Published runtime contract already available
- `dist/occt-js.d.ts` — canonical root typings for `OcctJSProfile2DSpec`, `OcctJSExtrudedShapeSpec`, and generated-extruded-shape payloads.
- `src/js-interface.cpp` — additive published root method names already exposed by the Wasm carrier.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `packages/occt-core/src/occt-core.js` already has the exact wrapper pattern to copy for additive generated-family methods: method-existence guard, direct root call, no second DTO layer.
- `packages/occt-core/src/model-normalizer.js` already preserves additive `revolvedShape` metadata and geometry-bound `faceBindings`; extruded support should reuse that shape instead of inventing a different normalization path.
- `packages/occt-core/test/core.test.mjs` already has inline mock-module tests for generated revolved validate/build/openExact entrypoints, which is the right pattern for Phase 32 additions.
- `test/release_governance_contract.test.mjs` and `test/package_tarball_contract.test.mjs` already encode the repo's preferred governance style: assert docs, typings, and root gate routing directly from tracked files.

### Established Patterns
- Package wrappers stay thin and mirror the root runtime names rather than creating a package-only schema translation layer.
- Generated-family metadata is additive at the top level (`revolvedShape`, now `extrudedShape`) instead of mutating the canonical geometry DTO.
- Root README stays the lower-level reference, while `packages/occt-core/README.md` is the package-first entry point for most downstream JS consumers.
- The authoritative root release gate remains runtime-first; conditional secondary surfaces stay documented separately.

### Integration Points
- Phase 32 implementation will primarily touch `packages/occt-core/src/*`, `packages/occt-core/test/core.test.mjs`, `README.md`, `packages/occt-core/README.md`, and the root governance tests under `test/`.
- No new C++ or Wasm build surface should be required; Phase 32 consumes the already-shipped root runtime/profile-solid contract from Phase 30/31.

</code_context>

<specifics>
## Specific Ideas

- Preserve symmetry with the revolved family: package wrappers should return raw root build/openExact payloads, while `normalizeOcctResult(...)` and `normalizeExactOpenResult(...)` remain the optional canonical-geometry helpers.
- Documentation should explicitly show that upstream apps own any adapter from tool/library schema to `Profile2D` and extruded-shape specs.
- Governance assertions should check both root README and package README so the lower-level and package-first stories stay aligned.

</specifics>

<deferred>
## Deferred Ideas

- Sweep, loft, taper, shell, or richer profile-solid families beyond straight linear extrusion.
- App-owned profile authoring schemas, tool libraries, or adapter registries inside `occt-js` or `@tx-code/occt-core`.
- Viewer-side material policy, recolor flows, or scene rendering behavior tied to generated profile solids.

</deferred>

---

*Phase: 32-occt-core-sdk-and-governance-for-profile-solids*
*Context gathered: 2026-04-21*
