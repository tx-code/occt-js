# Phase 9: Root Import Appearance Mode - Research

**Researched:** 2026-04-15  
**Domain:** Import-time appearance strategy for root Wasm CAD imports, with explicit source/default color behavior and legacy `readColors` compatibility.  
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

No phase-specific `09-CONTEXT.md` exists.

Use the current milestone decisions and roadmap constraints:

- Keep `occt-js` centered on the runtime-first Wasm carrier rather than viewer repaint logic. [VERIFIED: .planning/PROJECT.md] [VERIFIED: .planning/ROADMAP.md]
- Let downstream apps drive the import appearance choice from user settings, but keep settings persistence outside the runtime. [VERIFIED: .planning/PROJECT.md] [VERIFIED: .planning/REQUIREMENTS.md]
- Add an explicit path to ignore source colors and use a default CAD color; do not force apps to recolor meshes after import. [VERIFIED: .planning/PROJECT.md] [VERIFIED: .planning/STATE.md]
- Preserve packaged/vendored downstream consumption patterns such as `imos-app`. [VERIFIED: .planning/PROJECT.md] [VERIFIED: AGENTS.md]
- Keep release verification centered on `npm run test:release:root`. [VERIFIED: AGENTS.md] [VERIFIED: package.json]
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| APPR-01 | Downstream JS can choose source colors vs a default CAD color via an explicit import appearance mode. | Add `colorMode` to root import params and apply it at the C++ import layer. |
| APPR-02 | Default appearance mode without an override returns one documented built-in CAD color consistently. | Lift the existing `occt-core` fallback color into the root import contract as the built-in default. |
| APPR-05 | Existing `readColors` callers keep deterministic compatibility with explicit precedence relative to new options. | Treat `colorMode` as the new explicit contract and keep `readColors` as a legacy fallback only when `colorMode` is omitted. |
</phase_requirements>

## Project Constraints (from AGENTS.md)

- `AGENTS.md` is the authoritative repository instruction file. [VERIFIED: AGENTS.md]
- `dist/occt-js.js`, `dist/occt-js.wasm`, and `dist/occt-js.d.ts` remain the canonical root runtime artifacts. [VERIFIED: AGENTS.md]
- If C++ bindings or importers change, `dist/` must be rebuilt before the repo is considered healthy. [VERIFIED: AGENTS.md]
- Root verification belongs under `test/`, and root runtime checks precede any secondary-surface verification. [VERIFIED: AGENTS.md]

## Summary

Phase 9 should make appearance mode explicit at the same place that import behavior is already decided: `ImportParams`, `ParseImportParams`, and the C++ importers behind `ReadByFormat` and `OpenExactByFormat`. [VERIFIED: src/importer.hpp] [VERIFIED: src/js-interface.cpp]

The built-in default CAD color should match the current package-level fallback `DEFAULT_CAD_BASE_COLOR = [0.9, 0.91, 0.93, 1]` so the root runtime and `occt-core` stop drifting. Phase 9 only needs the RGB portion at the Wasm boundary because the root result schema does not currently expose alpha. [VERIFIED: packages/occt-core/src/model-normalizer.js] [VERIFIED: dist/occt-js.d.ts]

**Primary recommendation:** add `colorMode: "source" | "default"` to `OcctJSReadParams`; keep `readColors` as a legacy-only flag when `colorMode` is omitted; and apply the built-in default color directly while constructing `OcctSceneData` so both `Read*` and `OpenExact*` return the final imported colors/materials without viewer-side repaint rules. [ASSUMED]

## Current Code Facts

- Root import params currently expose `readNames`, `readColors`, deflection settings, units, and root mode only. [VERIFIED: src/importer.hpp] [VERIFIED: src/js-interface.cpp] [VERIFIED: dist/occt-js.d.ts]
- XDE imports read source colors through `STEPCAFControl_Reader` / `IGESCAFControl_Reader` with `cafReader.SetColorMode(params.readColors)`. [VERIFIED: src/importer-xde.cpp]
- XDE scene extraction stamps `meshData.color` and face colors from `XCAFDoc_ColorTool` lookup when available. [VERIFIED: src/importer-xde.cpp]
- BREP imports currently do not stamp any colors at all; meshes remain colorless. [VERIFIED: src/importer-brep.cpp]
- Root `materials` are built from geometry and face colors inside `BuildResult`, so importing a default color at the scene layer is enough to expose a material contract. [VERIFIED: src/js-interface.cpp]
- `ReadByFormat` and `OpenExactByFormat` both parse the same `ImportParams`, so appearance-mode semantics can be shared if the importers are updated consistently. [VERIFIED: src/js-interface.cpp]

## Standard Stack

### Core

| Library / Surface | Version | Purpose | Why Standard |
|-------------------|---------|---------|--------------|
| OCCT submodule | 7.9.3 [VERIFIED: AGENTS.md] | STEP/IGES/BREP import and XDE color extraction | Already ships in-repo and owns the source-color lane. [VERIFIED: src/importer-xde.cpp] |
| Embind root API | repo-local [VERIFIED: src/js-interface.cpp] | Parses import params and serializes result DTOs | Existing import-option behavior is already centralized here. [VERIFIED: src/js-interface.cpp] |
| `@tx-code/occt-core` | 0.1.7 [VERIFIED: packages/occt-core/package.json] | Package-layer normalization and current default material fallback | Provides the color fallback that Phase 9 should align with. [VERIFIED: packages/occt-core/src/model-normalizer.js] |
| Node built-in test runner | repo-local [VERIFIED: package.json] | Root contract verification | Existing root contract and lifecycle tests already use `node --test`. [VERIFIED: package.json] |

### Supporting

| Library / Surface | Purpose | When to Use |
|-------------------|---------|-------------|
| `XCAFDoc_ColorTool` | Reads shape/face colors from XDE labels | Source-color mode for STEP/IGES. [VERIFIED: src/importer-xde.cpp] |
| `DEFAULT_CAD_BASE_COLOR` | Existing package-level fallback color | Use as the built-in RGB baseline for Phase 9 to avoid drift. [VERIFIED: packages/occt-core/src/model-normalizer.js] |
| `test/ANC101_colored.stp` | Fixture with real imported colors | Source/default mode regression tests. [VERIFIED: test/test_multi_format_exports.mjs] |
| `test/bearing.igs`, `test/ANC101_isolated_components.brep` | Colorless IGES/BREP fixtures | Default-color mode and parity tests. [VERIFIED: test/test_multi_format_exports.mjs] |

**Installation:** None; Phase 9 should add no new npm dependencies. [VERIFIED: package.json] [VERIFIED: packages/occt-core/package.json]

## Architecture Patterns

### Pattern 1: Make appearance mode explicit in `ImportParams`

**What:** The new contract should live beside the existing import options in `ImportParams` and `ParseImportParams`, not in downstream normalizers. [VERIFIED: src/importer.hpp] [VERIFIED: src/js-interface.cpp]

**When to use:** Every root import entry point (`ReadFile`, `ReadStepFile`, `ReadIgesFile`, `ReadBrepFile`, `OpenExactModel`, and format-specific exact open methods).

**Recommendation:** Add an enum-style appearance field with three internal states:
- legacy `readColors` behavior when `colorMode` is omitted
- explicit source-color mode
- explicit built-in default-color mode

[ASSUMED]

### Pattern 2: Apply the built-in default color while building `OcctSceneData`

**What:** The root result’s `materials` array is derived from mesh and face colors in `BuildResult`, so the correct place to force the built-in default is while constructing `scene.meshes`. [VERIFIED: src/js-interface.cpp]

**When to use:** Any import path where the caller selected `colorMode: "default"`.

**Recommendation:** Stamp `meshData.color` and face colors in the C++ importers rather than waiting for `occt-core` to invent a fallback later. That keeps `Read*` and `OpenExact*` aligned and makes packaged root consumers deterministic even without `occt-core`. [ASSUMED]

### Pattern 3: Keep legacy `readColors` semantics unchanged unless `colorMode` is present

**What:** Existing callers may rely on `readColors: false` producing colorless root results today. [VERIFIED: src/js-interface.cpp] [VERIFIED: packages/occt-core/test/core.test.mjs]

**When to use:** Compatibility behavior during and after Phase 9.

**Recommendation:** Use this precedence:
1. If `colorMode` is present, it overrides `readColors`
2. If `colorMode` is omitted, keep the current `readColors` semantics

That lets new callers opt into the stable contract without silently rewriting old behavior. [ASSUMED]

## Recommended Root API Surface

Phase 9 only needs the built-in default mode:

```ts
interface OcctJSReadParams {
  rootMode?: "one-shape" | "multiple-shapes";
  linearUnit?: "millimeter" | "centimeter" | "meter" | "inch" | "foot";
  linearDeflectionType?: "bounding_box_ratio" | "absolute_value";
  linearDeflection?: number;
  angularDeflection?: number;
  readNames?: boolean;
  readColors?: boolean; // legacy: only used when colorMode is omitted
  colorMode?: "source" | "default";
}
```

**Recommended built-in default CAD color:** `[0.9, 0.91, 0.93]` in root result RGB fields, aligned with the existing package fallback `[0.9, 0.91, 0.93, 1]`. [VERIFIED: packages/occt-core/src/model-normalizer.js] [ASSUMED]

## Compatibility Policy

| Inputs | Recommended behavior | Why |
|--------|----------------------|-----|
| `colorMode: "source"` | Preserve source colors where supported, regardless of `readColors` | Explicit new contract should override the legacy toggle. [ASSUMED] |
| `colorMode: "default"` | Ignore source colors and return only the built-in default CAD color | This is the capability the milestone is adding. [ASSUMED] |
| no `colorMode`, `readColors: true` | Preserve current source-color behavior | Backward compatibility. [VERIFIED: src/importer-xde.cpp] |
| no `colorMode`, `readColors: false` | Preserve current colorless behavior | Backward compatibility; do not silently remap old callers to the new contract. [ASSUMED] |

## Clean 2-Plan Split

### 09-01 — Root appearance mode and built-in default color

- Add failing root contract tests in `test/import_appearance_contract.test.mjs` for explicit source/default behavior. [ASSUMED]
- Extend `ImportParams`, `ParseImportParams`, and the XDE/BREP importers with `colorMode` plus the built-in default CAD color. [VERIFIED: src/importer.hpp] [VERIFIED: src/js-interface.cpp] [VERIFIED: src/importer-xde.cpp] [VERIFIED: src/importer-brep.cpp]
- Add `colorMode` to `dist/occt-js.d.ts`. [VERIFIED: dist/occt-js.d.ts]

### 09-02 — Legacy compatibility and exact-open parity

- Add tests for `readColors` compatibility, `colorMode` precedence, and `OpenExact*`/`OpenExactModel` parity. [ASSUMED]
- Harden the root importer policy so XDE readers disable source-color extraction for `default` mode, force extraction for `source` mode, and keep legacy `readColors` behavior only when `colorMode` is omitted. [ASSUMED]
- Document precedence inline in `dist/occt-js.d.ts` comments and lock multi-entry-point parity in root tests. [ASSUMED]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Default CAD color selection | New arbitrary viewer color | Existing `DEFAULT_CAD_BASE_COLOR` baseline | The repo already shipped this value downstream; reusing it minimizes drift. [VERIFIED: packages/occt-core/src/model-normalizer.js] |
| Appearance-mode branching in JS only | Viewer-side recolor passes or `occt-core`-only patches | C++ import-time color stamping | Root consumers need deterministic colors without extra package logic. [VERIFIED: src/js-interface.cpp] |
| Exact-open color divergence | Separate exact-open-only appearance logic | Shared `ImportParams` and importer helpers | `ReadByFormat` and `OpenExactByFormat` already share import params. [VERIFIED: src/js-interface.cpp] |

## Common Pitfalls

### Pitfall 1: leaving the built-in default color only in `occt-core`

That would keep root Wasm consumers colorless and force downstream packages to invent their own recolor rules. [VERIFIED: packages/occt-core/src/model-normalizer.js] [VERIFIED: dist/occt-js.d.ts]

**Avoidance:** Make the built-in default a root import contract first; `occt-core` can then align to it rather than invent it. [ASSUMED]

### Pitfall 2: silently changing `readColors: false` behavior

Current callers may rely on `readColors: false` disabling source colors without any default-color material being forced. [VERIFIED: src/js-interface.cpp] [VERIFIED: packages/occt-core/test/core.test.mjs]

**Avoidance:** Keep `readColors` as a legacy fallback when `colorMode` is omitted, and state precedence explicitly in tests and typings. [ASSUMED]

### Pitfall 3: implementing the feature only for `Read*` and forgetting `OpenExact*`

The milestone boundary is import appearance, not just stateless mesh import. `OpenExactByFormat` returns the same scene payload plus exact bindings. [VERIFIED: src/js-interface.cpp]

**Avoidance:** Lock exact-open parity in Phase 9 tests even if the implementation falls out of the shared import path automatically. [ASSUMED]

### Pitfall 4: forcing default color only at the `materials` array

`BuildResult` derives `materials` from geometry and face colors. Injecting a material without geometry colors would leave the scene graph inconsistent. [VERIFIED: src/js-interface.cpp]

**Avoidance:** Stamp geometry and face colors first, then let `BuildResult` derive materials from that canonical data. [ASSUMED]
