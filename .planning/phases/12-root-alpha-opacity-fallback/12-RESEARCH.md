# Phase 12: Root Alpha & Opacity Fallback - Research

**Researched:** 2026-04-15  
**Domain:** Root Wasm appearance contract expansion for opacity fallback and read/exact parity.  
**Confidence:** HIGH

<user_constraints>
## User Constraints

No `12-CONTEXT.md` exists.

Use the active milestone and roadmap constraints:

- Keep Phase 12 centered on the root Wasm carrier rather than viewer-side repaint logic. [VERIFIED: .planning/PROJECT.md] [VERIFIED: .planning/ROADMAP.md] [VERIFIED: AGENTS.md]
- Add explicit alpha/opacity fallback at the root import boundary so default appearance can express transparency policy. [VERIFIED: .planning/PROJECT.md] [VERIFIED: .planning/ROADMAP.md] [VERIFIED: .planning/REQUIREMENTS.md]
- Preserve deterministic compatibility for callers that still depend on the shipped v1.2 color-only appearance contract. [VERIFIED: .planning/PROJECT.md] [VERIFIED: .planning/ROADMAP.md]
- Leave named presets, app-side settings persistence, and viewer overrides outside Phase 12. [VERIFIED: .planning/PROJECT.md] [VERIFIED: .planning/REQUIREMENTS.md] [VERIFIED: AGENTS.md]
- Keep the root release boundary on `dist/occt-js.js`, `dist/occt-js.wasm`, `dist/occt-js.d.ts`, and root runtime tests. [VERIFIED: AGENTS.md]
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| APPR-06 | Downstream JS code can control import-time alpha or opacity fallback as part of the appearance contract instead of hardcoding opacity in downstream viewers. | Add one explicit root opacity input, carry the resolved opacity into raw root DTOs, and lock read/openExact parity in root tests. [VERIFIED: .planning/REQUIREMENTS.md] [VERIFIED: .planning/ROADMAP.md] [ASSUMED] |
</phase_requirements>

## Project Constraints (from AGENTS.md)

- `AGENTS.md` is the authoritative repository instruction file. [VERIFIED: AGENTS.md]
- `dist/occt-js.js`, `dist/occt-js.wasm`, and `dist/occt-js.d.ts` are the canonical root runtime artifacts. [VERIFIED: AGENTS.md]
- If C++ bindings or importers change, `dist/` must be regenerated before the repo is considered healthy. [VERIFIED: AGENTS.md]
- Root verification belongs under `test/`, and root runtime checks come before any secondary-surface verification. [VERIFIED: AGENTS.md]

## Summary

Phase 12 should extend the existing root appearance contract with a separate `defaultOpacity` input instead of overloading `defaultColor` with alpha. The current public root contract only accepts RGB fallback color and only returns RGB materials/colors, so the Wasm carrier cannot currently express transparency policy on its own. [VERIFIED: dist/occt-js.d.ts] [VERIFIED: src/importer.hpp] [VERIFIED: src/js-interface.cpp] [ASSUMED]

The safest scope is additive and root-only: parse `defaultOpacity` in the same path that already handles `colorMode` and `defaultColor`, carry the resolved opacity through XDE and BREP default-appearance stamping, expose optional opacity on raw root DTOs, and keep `@tx-code/occt-core`, named presets, README/package governance expansion, and viewer behavior out of Phase 12. [VERIFIED: src/js-interface.cpp] [VERIFIED: src/importer-xde.cpp] [VERIFIED: src/importer-brep.cpp] [VERIFIED: .planning/ROADMAP.md] [ASSUMED]

**Primary recommendation:** add `defaultOpacity?: number` to `OcctJSReadParams`, add optional `opacity?: number` to raw root `OcctJSColor`/`OcctJSMaterial`, apply it only when `colorMode: "default"`, and keep legacy `readColors` callers unchanged when `colorMode` is omitted. [ASSUMED]

## Current Code Facts

- The public root input contract currently exposes `readColors`, `colorMode?: "source" | "default"`, and `defaultColor?: OcctJSColor`; there is no opacity input today. [VERIFIED: dist/occt-js.d.ts]
- The public root output contract currently exposes RGB-only `OcctJSColor` and RGB-only `OcctJSMaterial`; there is no alpha/opacity field on raw results today. [VERIFIED: dist/occt-js.d.ts]
- `ImportParams` already centralizes appearance behavior with `AppearanceMode`, `ShouldReadSourceColors()`, `ShouldUseDefaultColor()`, `ResolveImportedColor(...)`, and `ResolveFallbackColor()`. [VERIFIED: src/importer.hpp]
- `ParseImportParams(...)` already parses `readColors`, `colorMode`, and `defaultColor` on the shared path used by both `ReadByFormat(...)` and `OpenExactByFormat(...)`. [VERIFIED: src/js-interface.cpp]
- `ReadAndTransferXde(...)` turns OCCT XDE color extraction on or off through `cafReader.SetColorMode(params.ShouldReadSourceColors())`, so STEP and IGES already have a shared seam where default appearance disables source-color import. [VERIFIED: src/importer-xde.cpp]
- XDE default appearance currently stamps `params.defaultColor` onto `meshData.color` and face colors when `params.ShouldUseDefaultColor()` is true. [VERIFIED: src/importer-xde.cpp]
- BREP default appearance currently stamps `params.ResolveFallbackColor()` onto the mesh and `params.defaultColor` onto faces when `params.ShouldUseDefaultColor()` is true. [VERIFIED: src/importer-brep.cpp]
- `BuildResult(...)` deduplicates raw root materials from geometry and face colors, but the material key is RGB-only today. [VERIFIED: src/js-interface.cpp]
- `@tx-code/occt-core` already has internal RGBA normalization support in `normalizeColor(...)`, but `normalizeDefaultColor(...)` strips alpha before forwarding to the root carrier. [VERIFIED: packages/occt-core/src/model-normalizer.js] [VERIFIED: packages/occt-core/src/occt-core.js]
- Root appearance governance tests currently lock `colorMode` and `defaultColor`, but they do not yet assert any opacity field in docs or typings. [VERIFIED: test/release_governance_contract.test.mjs] [VERIFIED: test/package_tarball_contract.test.mjs]

## Recommended Scope

- Add one root-only input: `defaultOpacity?: number`. Do not add named presets or multiple opacity aliases in Phase 12. [ASSUMED]
- Keep the public mode switch unchanged as `colorMode: "source" | "default"` so the new behavior extends v1.2 instead of replacing it. [VERIFIED: dist/occt-js.d.ts] [ASSUMED]
- Add optional output shape only where root callers need it: `OcctJSColor.opacity?: number` and `OcctJSMaterial.opacity?: number`. Keep it additive so RGB-only callers keep working. [ASSUMED]
- Clamp `defaultOpacity` into `0..1` at parse time, matching the existing clamp style used for `defaultColor`. [VERIFIED: src/js-interface.cpp] [ASSUMED]
- Treat opacity as part of material identity when deduplicating raw root materials. [VERIFIED: src/js-interface.cpp] [ASSUMED]

### Recommended precedence

1. `colorMode: "default"` uses the effective default color plus the effective default opacity. `defaultColor` stays optional and still falls back to the built-in CAD RGB value. [VERIFIED: src/importer.hpp] [VERIFIED: dist/occt-js.d.ts] [ASSUMED]
2. `colorMode: "source"` preserves current source-color behavior and ignores `defaultOpacity`, just like it already ignores `defaultColor` semantically. [VERIFIED: test/import_appearance_contract.test.mjs] [ASSUMED]
3. When `colorMode` is omitted, legacy `readColors` behavior remains authoritative and `defaultOpacity` is ignored. [VERIFIED: dist/occt-js.d.ts] [VERIFIED: test/import_appearance_contract.test.mjs] [ASSUMED]

### Recommended root contract shape

Recommended public shape for Phase 12 only: [ASSUMED]

```ts
export interface OcctJSColor {
  r: number;
  g: number;
  b: number;
  opacity?: number;
}

export interface OcctJSMaterial {
  r: number;
  g: number;
  b: number;
  opacity?: number;
}

export interface OcctJSReadParams {
  readColors?: boolean;
  colorMode?: "source" | "default";
  defaultColor?: OcctJSColor;
  defaultOpacity?: number;
}
```

## Must-Ship Behaviors

- `ReadFile`, `ReadStepFile`, `ReadIgesFile`, and `ReadBrepFile` all accept `defaultOpacity` and return the same effective opacity policy for default appearance mode. [VERIFIED: .planning/ROADMAP.md] [VERIFIED: src/js-interface.cpp] [ASSUMED]
- `OpenExactModel`, `OpenExactStepModel`, `OpenExactIgesModel`, and `OpenExactBrepModel` return the same appearance payload as the read lane while preserving exact bindings. [VERIFIED: src/js-interface.cpp] [VERIFIED: test/import_appearance_contract.test.mjs] [ASSUMED]
- `defaultOpacity` works with both the built-in default CAD color and a caller-provided `defaultColor`. [VERIFIED: test/import_appearance_contract.test.mjs] [ASSUMED]
- `defaultOpacity` is ignored when `colorMode: "source"` is selected. [ASSUMED]
- `defaultOpacity` is ignored when `colorMode` is omitted and the caller is still using legacy `readColors` behavior. [ASSUMED]
- Material deduplication does not merge opaque and transparent appearances that share the same RGB triple. [VERIFIED: src/js-interface.cpp] [ASSUMED]

## Explicit Defers

- No named appearance presets or preset selection surface in Phase 12; that starts in Phase 13. [VERIFIED: .planning/ROADMAP.md] [VERIFIED: .planning/REQUIREMENTS.md]
- No `@tx-code/occt-core` forwarding or normalization changes in Phase 12; package-layer parity is Phase 13 work. [VERIFIED: .planning/ROADMAP.md] [VERIFIED: packages/occt-core/src/occt-core.js]
- No README/package governance expansion as a release gate yet; Phase 14 owns docs and governance hardening for the expanded contract. [VERIFIED: .planning/ROADMAP.md] [VERIFIED: test/release_governance_contract.test.mjs]
- No attempt to read source transparency from STEP/IGES/BREP payloads in this phase; the current repo implementation is RGB-only and the roadmap only requires fallback when source transparency is missing or ignored. [VERIFIED: dist/occt-js.d.ts] [VERIFIED: src/importer.hpp] [VERIFIED: .planning/ROADMAP.md]
- No viewer, Babylon, demo, or Tauri changes. The goal is to stop requiring viewer-side opacity patching, not to move that viewer work into Phase 12. [VERIFIED: AGENTS.md] [VERIFIED: .planning/PROJECT.md]

## Likely File Seams

- `src/importer.hpp`: extend `OcctColor` or adjacent appearance state with opacity, add `defaultOpacity`, and add helper methods so default appearance resolves both color and opacity from one place. [VERIFIED: src/importer.hpp] [ASSUMED]
- `src/js-interface.cpp`: parse `defaultOpacity`, serialize `opacity` on raw root DTOs, and update the raw material dedupe key to include opacity. [VERIFIED: src/js-interface.cpp] [ASSUMED]
- `src/importer-xde.cpp`: thread the effective default opacity into mesh and face appearance when default appearance is active for STEP/IGES. [VERIFIED: src/importer-xde.cpp] [ASSUMED]
- `src/importer-brep.cpp`: thread the same default opacity into BREP mesh/face fallback appearance. [VERIFIED: src/importer-brep.cpp] [ASSUMED]
- `dist/occt-js.d.ts`: publish `defaultOpacity` and document precedence next to the existing v1.2 appearance comments. [VERIFIED: dist/occt-js.d.ts] [ASSUMED]
- `test/import_appearance_contract.test.mjs`: extend the root contract tests with opacity-specific assertions and parity checks across read/exact lanes. [VERIFIED: test/import_appearance_contract.test.mjs] [ASSUMED]

## Compatibility Risks With The v1.2 Appearance Contract

- Overloading `defaultColor` with alpha would fight the current public typings and the adapter tests that intentionally strip alpha before forwarding to the root carrier. A separate `defaultOpacity` field is lower risk. [VERIFIED: dist/occt-js.d.ts] [VERIFIED: packages/occt-core/test/core.test.mjs] [VERIFIED: packages/occt-core/src/occt-core.js]
- Letting `defaultOpacity` implicitly switch the import into default appearance mode would silently change legacy `readColors` callers. The new field should be inert unless `colorMode: "default"` is already explicit. [VERIFIED: dist/occt-js.d.ts] [VERIFIED: test/import_appearance_contract.test.mjs] [ASSUMED]
- Making opacity non-optional on all raw result colors/materials would widen every appearance object in the shipped contract, which raises avoidable snapshot and deep-equality churn for v1.2 consumers. Keep the new field additive. [VERIFIED: dist/occt-js.d.ts] [ASSUMED]
- Leaving `MaterialKey` RGB-only would collapse transparent and opaque materials into the same raw `materials` entry. [VERIFIED: src/js-interface.cpp] [ASSUMED]
- Root-only delivery means `createOcctCore(...)` will not honor the new field until Phase 13. That is a planned gap, not a regression, but the planner should keep it explicit. [VERIFIED: .planning/ROADMAP.md] [VERIFIED: packages/occt-core/src/occt-core.js]
- Governance tests do not yet guard the new opacity surface, so Phase 12 needs root runtime tests to carry most of the enforcement until Phase 14 broadens docs/governance coverage. [VERIFIED: test/release_governance_contract.test.mjs] [VERIFIED: test/package_tarball_contract.test.mjs]

## Suggested 2-Plan Breakdown

### 12-01 - Root opacity-fallback parsing and raw DTO support

- Add failing root tests for `defaultOpacity` parsing, clamp behavior, and default-lane output on the stateless `Read*` path. [ASSUMED]
- Extend `ImportParams`, `ParseImportParams(...)`, raw DTO serialization, and raw material dedupe so the root carrier can express opacity itself. [VERIFIED: src/importer.hpp] [VERIFIED: src/js-interface.cpp] [ASSUMED]
- Apply the resolved default opacity in both XDE and BREP importers when default appearance mode is active. [VERIFIED: src/importer-xde.cpp] [VERIFIED: src/importer-brep.cpp] [ASSUMED]

### 12-02 - Read/exact parity and v1.2 compatibility hardening

- Extend `test/import_appearance_contract.test.mjs` so STEP, IGES, and BREP prove parity across `ReadFile`, direct `Read*`, `OpenExactModel`, and direct `OpenExact*`. [VERIFIED: test/import_appearance_contract.test.mjs] [ASSUMED]
- Add regression tests proving `defaultOpacity` is ignored in source mode and in legacy no-`colorMode` cases. [ASSUMED]
- Update `dist/occt-js.d.ts` comments so precedence between `readColors`, `colorMode`, `defaultColor`, and `defaultOpacity` is explicit before Phase 13 builds on it. [VERIFIED: dist/occt-js.d.ts] [ASSUMED]

## Environment Availability

Skipped: this phase is code/typing/test work inside the existing root Wasm carrier and adds no new external runtime dependency. [VERIFIED: .planning/ROADMAP.md] [VERIFIED: AGENTS.md]
