# Phase 10: Custom Default Color & Adapter Parity - Research

**Researched:** 2026-04-15  
**Domain:** Caller-provided import default colors, read/openExact parity, and `@tx-code/occt-core` adapter normalization for the root appearance contract.  
**Confidence:** HIGH

<user_constraints>
## User Constraints

No `10-CONTEXT.md` exists. Use the current milestone decisions:

- Keep `occt-js` runtime-first and avoid viewer-side recolor fixes. [VERIFIED: .planning/PROJECT.md] [VERIFIED: .planning/ROADMAP.md]
- Let apps keep user settings, but make the import APIs consume those settings directly. [VERIFIED: .planning/PROJECT.md] [VERIFIED: .planning/REQUIREMENTS.md]
- Preserve the explicit source-vs-default appearance choice introduced in Phase 9. [VERIFIED: .planning/phases/09-root-import-appearance-mode/09-01-SUMMARY.md] [VERIFIED: .planning/phases/09-root-import-appearance-mode/09-02-SUMMARY.md]
- Keep downstream consumption centered on the root Wasm carrier and `@tx-code/occt-core`, not Babylon or demo code. [VERIFIED: AGENTS.md] [VERIFIED: .planning/ROADMAP.md]
- Release verification must continue to center on `npm run test:release:root`. [VERIFIED: AGENTS.md] [VERIFIED: package.json]
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| APPR-03 | Downstream JS can provide an explicit default RGB color override. | Add `defaultColor` to the root import contract and make it win over the built-in default when default-mode imports are requested. |
| APPR-04 | `Read*` and `OpenExact*` honor the same appearance semantics. | Keep custom default-color resolution on the shared root import path used by both stateless and exact-open imports. |
| ADAPT-03 | `@tx-code/occt-core` accepts and normalizes appearance options without hiding the runtime contract. | Add adapter-side appearance param normalization and remove unconditional fallback-material behavior when no explicit default appearance is requested. |
</phase_requirements>

## Project Constraints

- `dist/occt-js.js`, `dist/occt-js.wasm`, and `dist/occt-js.d.ts` remain the canonical root runtime artifacts. [VERIFIED: AGENTS.md]
- Any C++ importer or binding change requires a fresh `dist/` rebuild before the repo is considered healthy. [VERIFIED: AGENTS.md]
- Root runtime checks stay under `test/`, while adapter checks stay under `packages/occt-core/test/`. [VERIFIED: AGENTS.md]

## Summary

Phase 10 should extend the Phase 9 appearance contract rather than invent a new one. The right place to add caller-provided color override behavior is still the shared root import param path: `ImportParams`, `ParseImportParams`, and the XDE/BREP color application helpers that feed both `ReadByFormat` and `OpenExactByFormat`. [VERIFIED: src/importer.hpp] [VERIFIED: src/js-interface.cpp] [VERIFIED: src/importer-xde.cpp] [VERIFIED: src/importer-brep.cpp]

The adapter work is not just "forward `defaultColor`". `packages/occt-core/src/model-normalizer.js` still synthesizes `DEFAULT_CAD_BASE_COLOR` whenever no colors or materials are present, which means `core.importModel(..., { importParams: { readColors: false } })` would currently invent a default material even when the root runtime intentionally returned a colorless payload. That is exactly the kind of hidden viewer-side contract drift this milestone is trying to remove. [VERIFIED: packages/occt-core/src/model-normalizer.js] [VERIFIED: .planning/phases/09-root-import-appearance-mode/09-02-SUMMARY.md]

**Primary recommendation:** add `defaultColor` to the root read params as an object-form RGB override, resolve it only for `colorMode: "default"` imports, and teach `@tx-code/occt-core` to normalize/forward appearance params explicitly so fallback material synthesis happens only when the caller asked for default appearance. [ASSUMED]

## Current Code Facts

- Phase 9 already added `colorMode?: "source" | "default"` to `OcctJSReadParams`, with explicit precedence over legacy `readColors`. [VERIFIED: dist/occt-js.d.ts]
- The root C++ import path now owns appearance policy through `ImportParams` helpers such as `ShouldReadSourceColors()`, `ShouldUseDefaultColor()`, and `ResolveImportedColor(...)`. [VERIFIED: src/importer.hpp]
- The root built-in default CAD color is currently stored on `ImportParams.defaultColor` as `OcctColor(0.9, 0.91, 0.93)`, so the importer path is already wired to consume a custom override if one is parsed in. [VERIFIED: src/importer.hpp]
- `ParseImportParams(...)` currently parses `colorMode`, but there is no public `defaultColor` input yet. [VERIFIED: src/js-interface.cpp]
- `@tx-code/occt-core` forwards `options.importParams` verbatim to `Read*` / `ReadFile` / `OpenExact*` / `OpenExactModel`. [VERIFIED: packages/occt-core/src/occt-core.js]
- `normalizeOcctResult(...)` still has an unconditional fallback path that creates one material using `DEFAULT_CAD_BASE_COLOR` when no colors are present. [VERIFIED: packages/occt-core/src/model-normalizer.js]
- `normalizeExactOpenResult(...)` builds on `normalizeOcctResult(...)`, so the same fallback-material drift can affect normalized exact-open payloads if appearance params are not threaded through. [VERIFIED: packages/occt-core/src/exact-model-normalizer.js]

## Recommended Root Contract Shape

Phase 10 should extend the public root types like this:

```ts
interface OcctJSReadParams {
  readColors?: boolean;
  colorMode?: "source" | "default";
  defaultColor?: OcctJSColor;
}
```

### Recommended precedence

1. `colorMode: "source"` => preserve source colors and ignore `defaultColor`
2. `colorMode: "default"` => use `defaultColor` when provided, otherwise the built-in CAD color
3. neither `colorMode` nor `defaultColor` provided => preserve the Phase 9 legacy `readColors` behavior
4. `defaultColor` with omitted `colorMode` should be ignored rather than implicitly switching appearance modes

[ASSUMED]

### Recommended value normalization

- Root runtime accepts object form `{ r, g, b }`, matching the existing public `OcctJSColor` DTO
- `@tx-code/occt-core` can normalize user-friendly array or object input into that canonical root shape before forwarding
- Clamp to 0..1 internally and reject/repair malformed values by falling back to the built-in default only when default appearance is active
- Ignore alpha for now; transparency belongs to APPR-06, not Phase 10

[ASSUMED]

## Adapter Recommendations

### Pattern 1: normalize import appearance params before forwarding

`createOcctCore` should not just pass through arbitrary `defaultColor` input. It should canonicalize the input once, then forward a clean root-runtime shape to `Read*` and `OpenExact*`. [VERIFIED: packages/occt-core/src/occt-core.js]

Recommended helper:

- `normalizeImportAppearanceParams(importParams)`
- Output canonical `colorMode` plus `defaultColor` object `{ r, g, b }`
- Preserve unrelated import params unchanged

[ASSUMED]

### Pattern 2: stop inventing fallback materials unless default appearance is explicit

The current unconditional `DEFAULT_CAD_BASE_COLOR` fallback in `normalizeMaterials(...)` hides the runtime contract. Phase 10 should make fallback material synthesis conditional on the explicit appearance params passed into normalization. [VERIFIED: packages/occt-core/src/model-normalizer.js]

Recommended behavior:

- explicit default appearance => synthesize fallback/default material when raw payload is colorless
- explicit source appearance or legacy `readColors: false` => preserve an empty/colorless material result if the raw payload is colorless
- old `occt-import-js` style inputs without appearance context can keep the current fallback path only if needed for backward compatibility

[ASSUMED]

### Pattern 3: thread appearance context into exact-open normalization too

`normalizeExactOpenResult(...)` reuses `normalizeOcctResult(...)`. If Phase 10 changes normalization policy, exact-open normalization needs the same appearance context so exact payloads and stateless payloads stay in sync. [VERIFIED: packages/occt-core/src/exact-model-normalizer.js]

Recommended approach:

- extend `normalizeOcctResult(raw, options)` to accept `options.importParams`
- keep `normalizeExactOpenResult(raw, options)` forwarding that same `options.importParams`
- keep `core.openExactModel(...)` returning the raw runtime result so the package still does not hide the underlying exact lane

[ASSUMED]

## Clean 2-Plan Split

### 10-01 — Root custom default color contract

- Add root failing tests for `defaultColor` object/tuple parsing and custom override behavior in `test/import_appearance_contract.test.mjs`. [ASSUMED]
- Add `defaultColor` typing and C++ parsing/normalization in `dist/occt-js.d.ts`, `src/importer.hpp`, and `src/js-interface.cpp`. [ASSUMED]
- Apply custom default color to both stateless and exact-open import lanes via the shared XDE/BREP importer helpers. [ASSUMED]

### 10-02 — `occt-core` appearance normalization and forwarding

- Add adapter tests showing canonical forwarding of `defaultColor`, conditional fallback-material synthesis, and live parity through the built root carrier. [ASSUMED]
- Add appearance-param normalization helper(s) to `packages/occt-core/src/occt-core.js`. [ASSUMED]
- Update `packages/occt-core/src/model-normalizer.js` and `packages/occt-core/src/exact-model-normalizer.js` so normalized outputs only synthesize fallback colors when the caller explicitly requested default appearance. [ASSUMED]

## Common Pitfalls

### Pitfall 1: treating `defaultColor` as a viewer-only concern

That would reintroduce the same post-import repaint workaround Phase 9 removed. [VERIFIED: .planning/ROADMAP.md]

**Avoidance:** keep default-color override in the root import contract first, then let `occt-core` forward it.

### Pitfall 2: leaving `model-normalizer`'s unconditional fallback untouched

That would make `occt-core` disagree with the runtime for colorless imports, especially `readColors: false`. [VERIFIED: packages/occt-core/src/model-normalizer.js] [VERIFIED: .planning/phases/09-root-import-appearance-mode/09-02-SUMMARY.md]

**Avoidance:** gate fallback synthesis on explicit default appearance.

### Pitfall 3: supporting custom default color only for `Read*`

`OpenExact*` shares the import param path and must stay in parity for downstream exact workflows. [VERIFIED: src/js-interface.cpp]

**Avoidance:** lock both lanes in the same root contract test file.

### Pitfall 4: accepting ambiguous `defaultColor` input without a precedence rule

Without a clear rule, `{ defaultColor, readColors: false }` and `{ defaultColor, colorMode: "source" }` become inconsistent edge cases.

**Avoidance:** codify the precedence table above in tests and typings before implementation.
