# Phase 11: Appearance Governance & Downstream Contract - Research

**Researched:** 2026-04-15  
**Domain:** Documentation, package guidance, tarball verification, and release-governance coverage for the import appearance contract.  
**Confidence:** HIGH

<user_constraints>
## User Constraints

No `11-CONTEXT.md` exists. Use the current milestone decisions:

- Keep `occt-js` runtime-first and package-first; do not let viewer concerns become part of the root contract. [VERIFIED: .planning/PROJECT.md] [VERIFIED: .planning/ROADMAP.md]
- Keep user settings persistence in the app layer; the runtime only consumes import-time appearance options. [VERIFIED: .planning/PROJECT.md] [VERIFIED: .planning/REQUIREMENTS.md]
- Preserve the shipped Phase 9/10 semantics instead of reopening runtime behavior in Phase 11. [VERIFIED: .planning/phases/09-root-import-appearance-mode/09-01-SUMMARY.md] [VERIFIED: .planning/phases/10-custom-default-color-adapter-parity/10-01-SUMMARY.md] [VERIFIED: .planning/phases/10-custom-default-color-adapter-parity/10-02-SUMMARY.md]
- Keep release verification centered on `npm run test:release:root` and avoid unconditional demo/Babylon/Tauri gates. [VERIFIED: AGENTS.md] [VERIFIED: README.md] [VERIFIED: package.json]
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ADAPT-04 | Root typings, package docs, and release verification define the import appearance contract and keep app-side settings persistence or viewer overrides out of scope. | Update root/package docs and type comments, then lock them with governance and package-contract tests. |
</phase_requirements>

## Project Constraints

- `dist/occt-js.js`, `dist/occt-js.wasm`, and `dist/occt-js.d.ts` remain the canonical root runtime artifacts. [VERIFIED: AGENTS.md]
- Root release verification stays package/runtime-first and is anchored on `npm run test:release:root`. [VERIFIED: AGENTS.md] [VERIFIED: README.md] [VERIFIED: package.json]
- Planning should harden already-shipped semantics instead of introducing new runtime behavior in this phase. [VERIFIED: .planning/ROADMAP.md] [VERIFIED: .planning/STATE.md]

## Summary

Phase 11 should not add new appearance behavior. The runtime and adapter contract are already in place after Phases 9 and 10; the remaining gap is that the docs and package-governance tests still under-describe that contract. [VERIFIED: .planning/PROJECT.md] [VERIFIED: .planning/REQUIREMENTS.md]

The biggest concrete doc drift is visible in the published examples: the root README API sample and the `@tx-code/occt-core` quick example still show `readColors: true` and do not explain `colorMode`, `defaultColor`, the built-in CAD fallback `[0.9, 0.91, 0.93]`, or the fact that app settings persistence remains downstream. [VERIFIED: README.md] [VERIFIED: packages/occt-core/README.md]

The type surface is already ahead of the docs: `dist/occt-js.d.ts` exposes `colorMode?: "source" | "default"` plus `defaultColor?: OcctJSColor`, with comments explaining precedence and the built-in default-color path. [VERIFIED: dist/occt-js.d.ts]

The governance tests are also incomplete: `test/release_governance_contract.test.mjs` proves that import appearance coverage is part of `npm test`, but it does not yet assert that README/package docs explain the appearance contract and keep user settings or viewer overrides out of scope. `test/package_tarball_contract.test.mjs` still validates canonical files and wasm init hooks, but it does not yet pin the packaged appearance typings that vendored consumers rely on. [VERIFIED: test/release_governance_contract.test.mjs] [VERIFIED: test/package_tarball_contract.test.mjs]

**Primary recommendation:** treat Phase 11 as a governance-only closeout. First, update README/package/agent docs plus type comments to describe the shipped import appearance contract clearly. Second, extend release-governance and tarball tests so those docs and packaged typings cannot drift silently in future milestones. [ASSUMED]

## Current Code Facts

- The root runtime now exposes `OcctJSImportColorMode = "source" | "default"` and `defaultColor?: OcctJSColor` on `OcctJSReadParams`. [VERIFIED: dist/occt-js.d.ts]
- The root README still uses `readColors: true` in its main API example and does not describe `colorMode` or `defaultColor`. [VERIFIED: README.md]
- The `@tx-code/occt-core` README quick example also still uses `readColors: true` and does not explain adapter-side default-color normalization. [VERIFIED: packages/occt-core/README.md]
- The root README already documents `npm run test:release:root` as the authoritative release gate and keeps demo/Babylon/Tauri surfaces conditional. [VERIFIED: README.md]
- `AGENTS.md` already protects the runtime-first release boundary, but it does not explicitly mention the import appearance contract or the downstream ownership of settings persistence and viewer overrides. [VERIFIED: AGENTS.md]
- `test/release_governance_contract.test.mjs` currently checks planning state, root release commands, and import-appearance test inclusion, but not appearance-contract docs or downstream-boundary wording. [VERIFIED: test/release_governance_contract.test.mjs]
- `test/package_tarball_contract.test.mjs` currently checks packaged files, exports, and wasm init hooks, but not packaged appearance typings. [VERIFIED: test/package_tarball_contract.test.mjs]

## Recommended 2-Plan Split

### 11-01 — Finalize docs and typings for the import appearance contract

- Add failing governance tests for root/package docs plus typing comments that describe `colorMode`, `defaultColor`, the built-in default CAD color, and the downstream settings boundary. [ASSUMED]
- Update `README.md`, `packages/occt-core/README.md`, `AGENTS.md`, and `dist/occt-js.d.ts` so the docs describe the shipped appearance contract without dragging viewer UX into scope. [ASSUMED]
- Keep examples package-first and centered on import-time settings instead of repaint flows. [ASSUMED]

### 11-02 — Extend release governance and downstream packaging verification

- Add failing package-contract tests that pin the packaged appearance typings needed by vendored/downstream consumers. [ASSUMED]
- Extend governance checks so future releases fail if package docs or packaged typings drift from the appearance contract shipped in Phases 9 and 10. [ASSUMED]
- Re-run `npm run test:release:root` as the final closeout verification for the milestone. [ASSUMED]

## Common Pitfalls

### Pitfall 1: reopening runtime behavior in a governance phase

That would expand scope and risk unnecessary rebuilds when the contract itself is already implemented. [VERIFIED: .planning/ROADMAP.md]

**Avoidance:** keep Phase 11 limited to docs, typings, and package/governance tests.

### Pitfall 2: documenting only the happy path and forgetting boundaries

If the docs mention `colorMode`/`defaultColor` but omit the downstream ownership of settings persistence and viewer overrides, the repo contract becomes fuzzy again.

**Avoidance:** explicitly document that apps store settings and viewers own repaint/display behavior.

### Pitfall 3: hardening docs without hardening packaged typings

Downstream vendored consumers rely on the published type surface, not just README prose. If `test/package_tarball_contract.test.mjs` does not pin the appearance typing surface, packaging drift can still slip through.

**Avoidance:** add package-contract assertions on `OcctJSImportColorMode`, `defaultColor`, and the `OcctJSReadParams` shape.

### Pitfall 4: pulling secondary surfaces into the authoritative release story

Phase 11 is about governance, but the authoritative gate still needs to stay runtime-first.

**Avoidance:** keep `npm run test:release:root` and the AGENTS guidance authoritative, with demo/Babylon/Tauri still conditional.
