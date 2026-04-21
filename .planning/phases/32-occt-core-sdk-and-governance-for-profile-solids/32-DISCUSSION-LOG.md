# Phase 32: occt-core SDK & Governance for Profile Solids - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `32-CONTEXT.md` — this log preserves the alternatives considered.

**Date:** 2026-04-21
**Phase:** 32-occt-core-sdk-and-governance-for-profile-solids
**Areas discussed:** package SDK surface, normalization semantics, docs and release governance

---

## Package SDK Surface

| Option | Description | Selected |
|--------|-------------|----------|
| Add only extruded wrappers | Package layer exposes extruded APIs but leaves shared-profile validation root-only | |
| Add shared-profile plus extruded wrappers | Package layer mirrors the full shipped root profile-solid surface | ✓ |
| Add an adapter schema layer | Package layer invents a second JS schema above the root runtime | |

**User's choice:** Continue with the full package-first surface.
**Notes:** Prior phases already locked a package-first contract style. The next missing surface is `validateProfile2DSpec`, `validateExtrudedShapeSpec`, `buildExtrudedShape`, and `openExactExtrudedShape`, not a new adapter abstraction.

---

## Normalization Semantics

| Option | Description | Selected |
|--------|-------------|----------|
| Raw wrappers only | Return root payloads and leave `normalizeOcctResult(...)` unaware of extruded metadata | |
| Raw wrappers plus additive normalizer support | Keep wrappers thin while teaching normalization helpers to preserve `generated-extruded-shape` metadata | ✓ |
| Normalize build/openExact automatically | Package wrappers always rewrite generated-shape payloads before returning them | |

**User's choice:** Preserve the existing thin-wrapper model and add normalization support only where the package already owns it.
**Notes:** This matches the revolved-family pattern and avoids introducing a second generated-shape DTO lane.

---

## Docs And Release Governance

| Option | Description | Selected |
|--------|-------------|----------|
| Root docs only | Document profile solids in the root README and rely on package intuition | |
| Package docs only | Keep root README narrow and document profile solids only in `@tx-code/occt-core` | |
| Root plus package docs, same release gate | Keep root README as lower-level reference, package README as package-first path, and extend governance tests without widening secondary-surface gates | ✓ |

**User's choice:** Document both surfaces and keep `npm run test:release:root` authoritative.
**Notes:** The repo already uses this split for exact measurement and revolved shapes; Phase 32 should follow the same governance discipline.

---

## the agent's Discretion

- Exact naming for normalized extruded metadata types in `packages/occt-core/src/index.d.ts`
- Whether README examples emphasize root-lower-level usage, package-first usage, or both, as long as the ownership boundary remains explicit

## Deferred Ideas

None — discussion stayed within phase scope.
