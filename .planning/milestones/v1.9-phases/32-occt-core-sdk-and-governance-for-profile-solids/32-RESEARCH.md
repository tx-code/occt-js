# Phase 32 Research

## Objective

Identify the concrete package, typing, documentation, and governance gaps required to ship `SDK-02` and `GOV-02` after Phase 30/31 already landed the root runtime profile-solid contract.

## Findings

### Root runtime is already ready

- `dist/occt-js.d.ts` already publishes:
  - `OcctJSProfile2DSpec`
  - `OcctJSProfile2DValidationResult`
  - `OcctJSExtrudedShapeSpec`
  - `OcctJSExtrudedShapeValidationResult`
  - `OcctJSExtrudedShapeBuildResult`
  - `OcctJSExactExtrudedShapeOpenResult`
- `src/js-interface.cpp` already exports:
  - `ValidateProfile2DSpec`
  - `ValidateExtrudedShapeSpec`
  - `BuildExtrudedShape`
  - `OpenExactExtrudedShape`

Conclusion: Phase 32 is package/docs/governance work, not new root runtime implementation.

### occt-core wrapper gap is narrow and explicit

- `packages/occt-core/src/occt-core.js` currently wraps only revolved generated-shape entrypoints.
- `packages/occt-core/src/index.d.ts` currently types only the revolved generated-shape wrapper family.
- `packages/occt-core/test/core.test.mjs` already contains the exact mock-based pattern needed to extend generated-family wrappers additively.

Conclusion: follow the existing revolved wrapper pattern; do not invent an adapter layer.

### Normalization gap is the main functional bug

- `packages/occt-core/src/model-normalizer.js` recognizes `generated-revolved-shape` only.
- `normalizeResultSourceFormat(...)` will reject `generated-extruded-shape`.
- `normalizeOcctResult(...)` currently preserves only `revolvedShape`, so any caller using package normalization on extruded raw results loses additive family metadata.

Conclusion: add additive extruded metadata preservation alongside the existing revolved path.

### Governance/doc gap is still revolved-only

- `packages/occt-core/README.md` documents only revolved generated-shape wrappers.
- `README.md` still describes the profile-solid story mostly through the revolved-family boundary.
- `test/release_governance_contract.test.mjs` and `test/package_tarball_contract.test.mjs` assert revolved coverage but not shared-profile/extruded coverage.

Conclusion: Phase 32 must update both root and package docs, then lock that story in governance tests.

## Recommended Split

### Plan 32-01

- Add `occt-core` wrappers for shared profile and extruded runtime methods
- Publish package typings for those methods and additive normalized extruded metadata
- Extend package tests to fail on wrapper or normalization drift

### Plan 32-02

- Update root/package docs to describe the generic profile-solid contract
- Extend tarball and release-governance tests to fail on doc/typing drift
- Update `.planning` state and roadmap after successful verification

## Verification Targets

- `npm --prefix packages/occt-core test`
- `npm test`
- `npm run test:planning:audit`
- `npm run test:release:root`
