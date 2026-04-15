# Phase 14: Appearance Expansion Governance - Research

**Researched:** 2026-04-15  
**Domain:** Docs, typings commentary, package tarball checks, and release-governance coverage for the finalized preset/defaultOpacity appearance contract.  
**Confidence:** HIGH

<user_constraints>
## User Constraints

No `14-CONTEXT.md` exists. Use the active milestone and shipped Phase 13 outcomes:

- Keep the authoritative surface on the root Wasm carrier and `@tx-code/occt-core`; do not turn Phase 14 into viewer work. [VERIFIED: .planning/PROJECT.md] [VERIFIED: .planning/ROADMAP.md] [VERIFIED: AGENTS.md]
- Preserve the shipped root contract shape: `appearancePreset`, `colorMode`, `defaultColor`, and `defaultOpacity`. [VERIFIED: dist/occt-js.d.ts] [VERIFIED: .planning/phases/13-appearance-preset-adapter-parity/13-01-SUMMARY.md]
- Keep app-side settings persistence and viewer overrides clearly out of scope. [VERIFIED: README.md] [VERIFIED: packages/occt-core/README.md] [VERIFIED: AGENTS.md]
- Keep release verification centered on `npm run test:release:root` and packaged downstream behavior. [VERIFIED: AGENTS.md] [VERIFIED: package.json]
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ADAPT-06 | Root typings, package docs, tarball checks, and release verification define the expanded appearance contract while keeping app-side preset persistence or display overrides out of scope. | Update docs/type comments/package tests to describe preset/defaultOpacity semantics and lock them in the authoritative release gate. |
</phase_requirements>

## Project Constraints

- `dist/occt-js.js`, `dist/occt-js.wasm`, and `dist/occt-js.d.ts` remain the canonical root runtime artifacts. [VERIFIED: AGENTS.md]
- Governance hardening must stay package/runtime-first and avoid unconditional demo/Babylon/Tauri gates. [VERIFIED: AGENTS.md]
- Phase 14 should harden shipped semantics rather than reopen runtime or adapter behavior. [VERIFIED: .planning/ROADMAP.md]

## Summary

Phase 14 should be a pure governance closeout. Phases 12 and 13 already shipped the runtime and adapter behavior for `appearancePreset`, `defaultOpacity`, and raw `opacity`; the remaining gap is documentation and packaging verification. [VERIFIED: .planning/phases/12-root-alpha-opacity-fallback/12-01-SUMMARY.md] [VERIFIED: .planning/phases/13-appearance-preset-adapter-parity/13-02-SUMMARY.md]

The current docs still under-describe the final contract. The root README and `@tx-code/occt-core` README explain `colorMode` / `defaultColor`, but they do not yet mention `appearancePreset`, `defaultOpacity`, the built-in `cad-solid` / `cad-ghosted` meanings, or alpha-promotion behavior on the adapter side. [VERIFIED: README.md] [VERIFIED: packages/occt-core/README.md]

The package tests also lag. `test/package_tarball_contract.test.mjs` currently pins only `colorMode` / `defaultColor`, and `test/release_governance_contract.test.mjs` only lightly checks the new types; it does not yet force docs/package guidance to mention presets and opacity. [VERIFIED: test/package_tarball_contract.test.mjs] [VERIFIED: test/release_governance_contract.test.mjs]

**Primary recommendation:** treat Phase 14 as two governance-only steps. First, update root/package/agent docs and type comments to describe the finalized preset/defaultOpacity contract clearly and keep downstream setting responsibility explicit. Second, extend tarball and release-governance tests so those docs and packaged typings cannot drift. [ASSUMED]

## Current Code Facts

- The public root type surface now exposes `OcctJSImportAppearancePreset`, `appearancePreset?: ...`, `defaultOpacity?: number`, and optional raw `opacity?: number` on colors/materials. [VERIFIED: dist/occt-js.d.ts]
- The root README still shows only `colorMode` / `defaultColor` in its import appearance example and omits presets and default opacity. [VERIFIED: README.md]
- The `@tx-code/occt-core` README still documents only `colorMode` / `defaultColor` and does not explain alpha promotion or preset forwarding. [VERIFIED: packages/occt-core/README.md]
- `AGENTS.md` already mentions import appearance options, settings persistence, and viewer overrides, but it does not yet name `appearancePreset` / `defaultOpacity` explicitly. [VERIFIED: AGENTS.md]
- `test/package_tarball_contract.test.mjs` still only asserts `colorMode`, `defaultColor`, and the color-only doc wording. [VERIFIED: test/package_tarball_contract.test.mjs]
- `test/release_governance_contract.test.mjs` now checks the type surface for preset/defaultOpacity, but the docs assertions still only require `colorMode` and `defaultColor`. [VERIFIED: test/release_governance_contract.test.mjs]

## Recommended 2-Plan Split

### 14-01 — Finalize docs and typings for expanded appearance options

- Add failing governance tests for root/package/agent docs that must mention `appearancePreset`, `defaultOpacity`, and the downstream settings boundary. [ASSUMED]
- Update `README.md`, `packages/occt-core/README.md`, `AGENTS.md`, and any needed `dist/occt-js.d.ts` comments to describe the finalized contract clearly. [ASSUMED]
- Keep examples package-first and import-time focused; no viewer workflows. [ASSUMED]

### 14-02 — Extend release governance and downstream packaging verification

- Add failing tarball and governance tests that pin preset/defaultOpacity docs and packaged typing coverage. [ASSUMED]
- Re-run `npm run test:release:root` as the final milestone gate once docs/tests are updated. [ASSUMED]
- Keep package verification centered on published files and exports, not repo-local secondary surfaces. [ASSUMED]

## Common Pitfalls

### Pitfall 1: reopening runtime behavior in a governance phase

That would expand scope unnecessarily and risk destabilizing the now-shipped contract.

**Avoidance:** keep Phase 14 limited to docs, type commentary, package tests, and release governance.

### Pitfall 2: documenting presets without documenting boundaries

If the docs mention presets but omit that apps still own persistence and viewer overrides, the repo contract becomes fuzzy again.

**Avoidance:** explicitly keep persistence/UI concerns downstream in both READMEs and `AGENTS.md`.

### Pitfall 3: hardening docs without hardening packaged verification

Without updated tarball/governance tests, preset/defaultOpacity wording can drift silently after the milestone closes.

**Avoidance:** pin both docs and packaged types in `test/package_tarball_contract.test.mjs` and `test/release_governance_contract.test.mjs`.
