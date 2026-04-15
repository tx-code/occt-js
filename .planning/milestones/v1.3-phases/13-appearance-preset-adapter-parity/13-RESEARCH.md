# Phase 13: Appearance Preset & Adapter Parity - Research

**Researched:** 2026-04-15  
**Domain:** Enum-like named appearance presets on the root Wasm carrier plus `@tx-code/occt-core` forwarding and normalization parity for the expanded appearance contract.  
**Confidence:** HIGH

<user_constraints>
## User Constraints

No `13-CONTEXT.md` exists. Use the active milestone and shipped Phase 12 outcomes:

- Keep `occt-js` runtime-first and package-first; do not turn presets into viewer repaint logic. [VERIFIED: .planning/PROJECT.md] [VERIFIED: .planning/ROADMAP.md] [VERIFIED: AGENTS.md]
- Preserve the shipped `colorMode` / `defaultColor` / `defaultOpacity` contract and make any preset layer additive instead of replacing it. [VERIFIED: .planning/phases/12-root-alpha-opacity-fallback/12-01-SUMMARY.md] [VERIFIED: .planning/phases/12-root-alpha-opacity-fallback/12-02-SUMMARY.md]
- Apps still own settings persistence and user-facing preset selection UI; the runtime only consumes import-time options. [VERIFIED: .planning/PROJECT.md] [VERIFIED: .planning/REQUIREMENTS.md]
- Keep release verification centered on `npm run test:release:root` and avoid unconditional secondary-surface work. [VERIFIED: AGENTS.md] [VERIFIED: package.json]
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| APPR-07 | Downstream JS code can select named import appearance presets that map fallback color and opacity policy without requiring a viewer-side recolor pass. | Add a small enum-like root `appearancePreset` contract that resolves to the shipped default appearance primitives. |
| APPR-08 | Stateless `Read*` APIs and exact-open `OpenExact*` APIs honor the same expanded appearance semantics for supported formats. | Keep preset resolution on the shared root import param path used by both read and exact-open lanes. |
| ADAPT-05 | `@tx-code/occt-core` can accept and normalize the expanded appearance options, forwarding them to the root Wasm carrier without hiding the runtime contract. | Normalize preset/defaultOpacity input in `occt-core`, preserve root raw opacity on normalized output, and add live parity coverage. |
</phase_requirements>

## Project Constraints

- `dist/occt-js.js`, `dist/occt-js.wasm`, and `dist/occt-js.d.ts` remain the canonical root runtime artifacts. [VERIFIED: AGENTS.md]
- Any C++ importer or binding change requires a fresh `dist/` rebuild before the repo is considered healthy. [VERIFIED: AGENTS.md]
- Adapter work stays under `packages/occt-core/`; Phase 13 should not expand into demo, Babylon, or Tauri surfaces. [VERIFIED: AGENTS.md]

## Summary

Phase 13 should keep presets enum-like and runtime-owned. The shipped Phase 12 primitives are already expressive enough to describe default appearance policy; presets should be thin named bundles over those primitives, not a rich descriptor object. The lowest-risk shape is `appearancePreset?: "cad-solid" | "cad-ghosted"` on the root import params. That gives downstream apps stable names for common default-appearance policies without duplicating the existing `source` mode or inventing viewer-specific concepts. [ASSUMED]

Preset precedence should stay additive: preset first resolves to default-appearance defaults, then explicit `colorMode`, `defaultColor`, and `defaultOpacity` can override the derived bundle when callers need finer control. This preserves the shipped primitive contract while letting apps treat presets as a convenient starting point instead of a mutually exclusive second API. [ASSUMED]

`@tx-code/occt-core` currently lags behind the new root opacity contract. `normalizeImportParams(...)` only canonicalizes `defaultColor`, and `normalizeColor(...)` reads object alpha from `a` but not from the root carrier's new `opacity` property. That means normalized adapter output would currently drop raw root opacity, and caller-friendly RGBA `defaultColor` input cannot yet feed the root `defaultOpacity` contract. Phase 13 needs to fix both seams. [VERIFIED: packages/occt-core/src/occt-core.js] [VERIFIED: packages/occt-core/src/model-normalizer.js] [VERIFIED: dist/occt-js.d.ts]

**Primary recommendation:** add a small root `appearancePreset` enum for default-appearance bundles, resolve it on the shared root import path, then make `@tx-code/occt-core` normalize and forward preset/defaultOpacity semantics while preserving raw root `opacity` in normalized materials and geometry colors. [ASSUMED]

## Current Code Facts

- The root public contract now exposes `colorMode`, `defaultColor`, and `defaultOpacity`, with additive `opacity?: number` on raw colors/materials. [VERIFIED: dist/occt-js.d.ts]
- Root preset support does not exist yet; `ParseImportParams(...)` only knows about `readColors`, `colorMode`, `defaultColor`, and `defaultOpacity`. [VERIFIED: src/js-interface.cpp]
- The shared root appearance seam already covers both stateless and exact-open imports through `ImportParams` helpers, so preset resolution belongs there rather than in importer-specific branches. [VERIFIED: src/importer.hpp] [VERIFIED: src/js-interface.cpp]
- `packages/occt-core/src/occt-core.js` normalizes `defaultColor` but does not normalize `defaultOpacity` or any preset field yet. [VERIFIED: packages/occt-core/src/occt-core.js]
- `packages/occt-core/src/model-normalizer.js` accepts `a` on object colors but does not read root raw `opacity`, so Phase 12 raw opacity would be lost during normalization today. [VERIFIED: packages/occt-core/src/model-normalizer.js]
- `normalizeMaterials(...)` still derives fallback material color from explicit appearance context, but the context does not yet include preset/defaultOpacity resolution. [VERIFIED: packages/occt-core/src/model-normalizer.js]
- Existing `occt-core` tests cover custom `defaultColor` forwarding but not `defaultOpacity`, presets, or raw root opacity preservation. [VERIFIED: packages/occt-core/test/core.test.mjs] [VERIFIED: packages/occt-core/test/live-root-integration.test.mjs]

## Recommended Root Contract Shape

Phase 13 should extend the public root types like this:

```ts
export type OcctJSImportAppearancePreset = "cad-solid" | "cad-ghosted";

interface OcctJSReadParams {
  appearancePreset?: OcctJSImportAppearancePreset;
  colorMode?: "source" | "default";
  defaultColor?: OcctJSColor;
  defaultOpacity?: number;
}
```

### Recommended preset mapping

- `cad-solid` => default appearance with the built-in CAD base color and opaque opacity `1`
- `cad-ghosted` => default appearance with the built-in CAD base color and a repo-owned ghost opacity constant

[ASSUMED]

### Recommended precedence

1. Resolve `appearancePreset` into default-appearance defaults when present
2. Apply explicit `colorMode` if provided
3. Apply explicit `defaultColor` and `defaultOpacity` as overrides on top of the preset-derived defaults
4. If final `colorMode` is `"source"`, ignore preset-derived or explicit default appearance values
5. If neither preset nor explicit `colorMode` is present, preserve the shipped v1.2/v1.3 legacy `readColors` behavior

[ASSUMED]

## Adapter Recommendations

### Pattern 1: canonicalize preset and defaultOpacity before forwarding

`createOcctCore` should normalize `appearancePreset`, `defaultOpacity`, and `defaultColor` once before forwarding them to root methods. [VERIFIED: packages/occt-core/src/occt-core.js]

Recommended behavior:

- preserve canonical string preset values only
- clamp `defaultOpacity` into `0..1`
- if caller passes tuple/object `defaultColor` with alpha and no explicit `defaultOpacity`, promote that alpha into `defaultOpacity`
- keep the forwarded root shape object-based and explicit

[ASSUMED]

### Pattern 2: teach normalization to preserve root raw `opacity`

`normalizeColor(...)` currently drops the root carrier's object-form `opacity` field. That must be fixed before adapter parity can be considered complete. [VERIFIED: packages/occt-core/src/model-normalizer.js]

Recommended behavior:

- treat object `opacity` as the same alpha channel as object `a`
- preserve root raw opacity through normalized geometry colors and material `baseColor`
- keep fallback-material synthesis aligned with the final resolved appearance context

[ASSUMED]

### Pattern 3: lock live parity through the built root carrier

Live adapter tests should prove that presets and opacity survive a real root import, not just stubbed forwarding. [VERIFIED: packages/occt-core/test/live-root-integration.test.mjs]

Recommended behavior:

- one live import for a preset with built-in color/ghost opacity
- one live import for preset plus explicit override proving precedence
- exact-open normalization stays consistent with the stateless path

[ASSUMED]

## Explicit Defers

- No docs/tarball/release-governance expansion beyond keeping existing tests green; Phase 14 owns formal governance for the expanded contract. [VERIFIED: .planning/ROADMAP.md]
- No richer preset descriptors, per-face/edge palette policies, or metadata-driven mapping; keep presets enum-like in Phase 13. [VERIFIED: .planning/STATE.md] [ASSUMED]
- No app-side persistence, workspace settings, or viewer theme switching. [VERIFIED: .planning/REQUIREMENTS.md]
- No source-transparency import expansion beyond the shipped fallback/default path. [VERIFIED: .planning/phases/12-root-alpha-opacity-fallback/12-RESEARCH.md]

## Clean 2-Plan Split

### 13-01 — Add named appearance preset parsing and root import parity

- Add failing root tests for `appearancePreset` mapping, explicit override precedence, and read/openExact parity. [ASSUMED]
- Extend `dist/occt-js.d.ts`, `src/importer.hpp`, and `src/js-interface.cpp` so the root carrier can resolve presets into the shipped default appearance primitives. [ASSUMED]
- Keep preset coverage limited to runtime-first bundles such as `cad-solid` and `cad-ghosted`. [ASSUMED]

### 13-02 — Normalize expanded appearance options and preset forwarding in `@tx-code/occt-core`

- Add failing adapter tests for preset/defaultOpacity forwarding and raw opacity preservation. [ASSUMED]
- Extend `packages/occt-core/src/occt-core.js` to canonicalize preset/defaultOpacity and promote alpha from caller-friendly colors when appropriate. [ASSUMED]
- Extend `packages/occt-core/src/model-normalizer.js` plus live integration tests so normalized adapter output keeps root opacity and preset semantics end-to-end. [ASSUMED]

## Common Pitfalls

### Pitfall 1: making presets a second independent appearance API

That would force callers to choose between presets and explicit knobs and make precedence hard to reason about.

**Avoidance:** let presets resolve into the existing primitive contract, then let explicit fields override as needed.

### Pitfall 2: duplicating `source` as both a preset and a mode

That creates a redundant contract and muddies the role of `colorMode`.

**Avoidance:** keep presets focused on default-appearance bundles and leave source behavior on `colorMode`.

### Pitfall 3: forgetting that `occt-core` still drops root raw `opacity`

That would make adapter output disagree with the root carrier even if forwarding works.

**Avoidance:** update normalization to treat object `opacity` as alpha before claiming parity.

### Pitfall 4: letting adapter convenience hide the runtime contract

If `occt-core` invents its own preset-only semantics, downstream users stop knowing what the root carrier actually supports.

**Avoidance:** normalize for convenience, but forward canonical root params and keep live tests against the built root carrier.
