# Phase 03 Research: Downstream Consumption Contract

**Generated:** 2026-04-14
**Phase:** 03 - Downstream Consumption Contract
**Requirements:** CONS-01, CONS-02

## Objective

Identify the real packaged-consumption contract for the root Wasm carrier and `@tx-code/occt-core`, then split Phase 03 into execution plans that harden vendored/tarballed downstream use without widening scope into repo-local Babylon/demo behavior.

## Current Root Package Surface

### Published tarball shape

Root `package.json` currently publishes:

- `main: "dist/occt-js.js"`
- `types: "dist/occt-js.d.ts"`
- `files: ["dist/occt-js.js", "dist/occt-js.wasm", "dist/occt-js.d.ts", "LICENSE"]`

`npm pack --dry-run --json` confirms the published tarball includes only:

- `package.json`
- `README.md`
- `LICENSE`
- `dist/occt-js.js`
- `dist/occt-js.wasm`
- `dist/occt-js.d.ts`

This is the right minimal publish surface for a Wasm carrier, but it is only lightly verified today.

Current gap:

- the root package does not declare an explicit `exports` map, so the intended public surface is still partly implicit

### Wasm location contract

`dist/occt-js.d.ts` exposes two caller-controlled runtime hooks:

- `locateFile?: (filename: string) => string`
- `wasmBinary?: ArrayBuffer | Uint8Array`

The generated `dist/occt-js.js` also clearly supports those paths:

- `locateFile(...)` overrides the resolved wasm path
- `wasmBinary` bypasses path-based fetch/read
- default behavior loads `occt-js.wasm` adjacent to `occt-js.js`

This is enough for vendored and bundler flows in principle, but the repository does not yet have focused tests that treat the packed tarball as the contract surface.

Current gap:

- the runtime calls `locateFile(filename, scriptDirectory)`, but the published type only declares `(filename) => string`
- README/docs currently describe the loader more like an ES module entry than the generated runtime actually guarantees

### Existing root verification

`test/dist_contract_consumers.test.mjs` already checks:

- root `package.json` stays on canonical `dist/` artifacts
- demo dev/runtime paths stay on `dist/`
- Tauri bundles only `dist/occt-js.js` and `dist/occt-js.wasm`

Current gap:

- no test exercises a packed or unpacked consumer view of `@tx-code/occt-js`
- no explicit test locks the `locateFile` / `wasmBinary` consumption contract
- no contract test guards future `package.json` surface changes such as `exports`
- no guard exists against release drift in downstream-facing fallback version strings

## Current `@tx-code/occt-core` Surface

### Public API

`packages/occt-core/src/index.js` exports:

- `createOcctCore`
- `OcctCoreClient`
- `normalizeOcctFormat`
- `getReadMethodName`
- `listSupportedFormats`
- `normalizeOcctResult`
- `applyOrientationToModel`
- `resolveAutoOrientedModel`

`OcctCoreClient` currently supports:

- `factory`
- `factoryGlobalName`
- `wasmBinary`
- `wasmBinaryLoader`
- format-specific method dispatch first, then `ReadFile(format, ...)` fallback
- `fileName`-derived format inference

This is already the correct adapter shape for downstream consumers that do not want repo-local Babylon/demo coupling.

Current gap:

- the package has no published type definitions, so the public API contract is JS-only today

### Normalization contract

`normalizeOcctResult(...)` already gives a stable normalized model with:

- canonical `sourceFormat`
- `rootNodes`, `geometries`, `materials`, `warnings`, `stats`
- passthrough `sourceUnit` and `unitScaleToMeters`
- fallback compatibility with older `occt-import-js` style payloads

This is a strong starting point, but the tests currently focus on smoke coverage rather than full downstream contract edges.

### Existing `occt-core` verification

`packages/occt-core/test/core.test.mjs` already covers:

- format normalization
- normalization of current and legacy payload styles
- format-specific import routing
- `ReadFile(...)` fallback
- orientation application helper behavior

Current gap:

- no explicit test for `fileName` inference when `format` is omitted
- no explicit test for `factoryGlobalName`
- no explicit test for `wasmBinaryLoader`
- no focused test that `sourceUnit`, `unitScaleToMeters`, warnings, and fallback stats remain stable normalization outputs
- no package-level contract test that proves `occt-core` stands alone as the engine-agnostic consumer surface
- no regression guard exists for known normalizer edge cases such as 0-255 color alpha handling or legacy face/edge canonicalization

## Existing Documentation / Downstream Signals

### Root README

The root `README.md` is now strong on:

- Windows build and `dist/` artifact expectations
- root runtime API shape
- root-mode and orientation semantics

Current gap:

- it still reads primarily as a repo/runtime README rather than a downstream package-consumption guide
- it does not yet show the canonical npm-package usage path for `@tx-code/occt-js`
- it does not document the `locateFile` / `wasmBinary` choice clearly for vendored or tarballed consumers
- it does not clearly explain the generated module-format story for package consumers

### `occt-core` README

`packages/occt-core/README.md` is concise and accurate, but very thin.

Current gap:

- no explicit downstream guidance for using `occt-core` on top of the packed root Wasm carrier
- no contract language that `occt-core` is Babylon-independent and package-first

### Downstream consumer signal

The working assumption from prior repository context is correct:

- `imos-app` consumes vendored `@tx-code/occt-js` and `@tx-code/occt-core`
- it does not depend on the repo-local Babylon viewer layers as its primary contract

That means Phase 03 should optimize for packaged and vendored runtime consumption, not for repo-local demo convenience.

## Requirement Coverage Gaps

### CONS-01: packaged Wasm carrier

What exists:

- minimal root tarball surface
- explicit `locateFile` / `wasmBinary` hooks
- repo-level `dist/` artifact guardrails

What remains risky:

- no tarball-consumer tests
- no explicit contract around adjacent-file vs `locateFile` vs `wasmBinary`
- no guard against package metadata drift that would break vendored downstreams
- docs/types/runtime still leave room for ambiguity about how package consumers should import and initialize the loader

### CONS-02: engine-agnostic `occt-core`

What exists:

- `occt-core` already wraps the root Wasm module cleanly
- normalized model output and orientation helper are already Babylon-independent in principle

What remains risky:

- normalization and loader options are under-specified in tests
- no strong contract saying `occt-core` is the canonical downstream adapter
- README/test coverage is not yet aligned around packaged-consumption use
- some current normalizer behaviors likely do not match downstream expectations consistently enough to be treated as a stable contract yet

## Planning Constraints

- Keep scope on packaged/vendored downstream consumption.
- Do not widen into new CAD features, Babylon viewer work, or demo UX changes.
- Prefer contract tests first, then make only the minimum package/adapter/doc changes required.
- Preserve the root Wasm carrier as the strategic product surface.
- Split execution so root package contract work and `occt-core` contract work can run in parallel.

## Recommended Plan Shape

### 03-01: Root package tarball and wasm-locate contract

Focus:

- verify the packed `@tx-code/occt-js` surface directly
- lock `dist/occt-js.js`, `dist/occt-js.wasm`, and `dist/occt-js.d.ts`
- make `locateFile` / `wasmBinary` semantics explicit for downstream consumers
- resolve or explicitly document the current package entry / module-format contract

Likely files:

- `test/package_tarball_contract.test.mjs`
- `package.json`
- `dist/occt-js.d.ts`

### 03-02: `occt-core` public API and normalization guarantees

Focus:

- make `occt-core` the explicit engine-agnostic consumption contract
- lock loader option behavior and normalization outputs
- keep Babylon/demo layers out of the package contract
- fix any real normalization inconsistencies that block stable downstream use

Likely files:

- `packages/occt-core/test/core.test.mjs`
- `packages/occt-core/src/occt-core.js`
- `packages/occt-core/src/model-normalizer.js`
- `packages/occt-core/src/index.js`

### 03-03: Packaging/docs reconciliation for vendored downstream use

Focus:

- document the root package and `occt-core` consumption path clearly
- make package-first usage more prominent than repo-local viewer layers
- keep docs aligned with the verified contract from 03-01 and 03-02

Likely files:

- `README.md`
- `packages/occt-core/README.md`
- `test/dist_contract_consumers.test.mjs`

## Recommended Execution Waves

### Wave 1

- `03-01` root package tarball/wasm-locate contract
- `03-02` `occt-core` API/normalizer contract

These touch different surfaces and should be safe to execute in parallel.

### Wave 2

- `03-03` packaging/docs reconciliation

This should follow Wave 1 so the docs reflect the final verified consumption contract.

## Open Questions (Resolved for planning)

### Should Phase 03 change the root Wasm API?

No. Phase 03 should harden the packaged-consumption contract around the existing root runtime rather than add new Wasm APIs.

### Should Phase 03 make Babylon/demo packages part of the downstream contract?

No. The contract should remain root-package-first, with `occt-core` as the canonical adapter and Babylon/demo layers clearly secondary.

### Should Phase 03 optimize for repo-local development or vendored consumers?

Vendored and tarballed consumers first. Repo-local development remains useful, but it is not the strategic contract boundary.
