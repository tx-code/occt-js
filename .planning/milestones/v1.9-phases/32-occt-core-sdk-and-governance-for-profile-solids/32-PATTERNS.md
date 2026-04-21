# Phase 32 Patterns

## Wrapper Pattern

**Source:** `packages/occt-core/src/occt-core.js`

- Each additive method:
  - awaits `_ensureModule()`
  - checks `typeof module.MethodName === "function"`
  - throws a clear missing-method error if absent
  - forwards the root DTO unchanged

Use this pattern for:
- `validateProfile2DSpec`
- `validateExtrudedShapeSpec`
- `buildExtrudedShape`
- `openExactExtrudedShape`

## Generated-Family Normalization Pattern

**Source:** `packages/occt-core/src/model-normalizer.js`

- Keep generated-family metadata additive at the top level.
- Preserve root geometry DTOs as canonical.
- Attach `geometryId` to face bindings only during normalization.

Use this pattern for:
- `extrudedShape.segments`
- `extrudedShape.faceBindings`
- `sourceFormat: "generated-extruded-shape"`

## Package Typing Pattern

**Source:** `packages/occt-core/src/index.d.ts`

- Import canonical root DTOs directly from `@tx-code/occt-js`.
- Expose package wrapper methods using those canonical types.
- Add normalized metadata aliases only where the package materially transforms data, such as `geometryId` attachment in normalized face bindings.

## Governance Test Pattern

**Sources:** `test/release_governance_contract.test.mjs`, `test/package_tarball_contract.test.mjs`

- Assert public commands from tracked `package.json`.
- Assert public docs from tracked README files.
- Assert public typings from tracked `dist/occt-js.d.ts`.
- Keep conditional secondary surfaces explicitly outside the authoritative root release gate.

## Mock Test Pattern

**Source:** `packages/occt-core/test/core.test.mjs`

- Use inline factory mocks with a minimal module surface.
- Assert exact forwarded spec/options objects.
- Cover both success and missing-method failure paths for each additive wrapper.
