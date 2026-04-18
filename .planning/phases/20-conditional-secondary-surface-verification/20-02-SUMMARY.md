---
phase: 20-conditional-secondary-surface-verification
plan: "02"
subsystem: secondary-surface-contracts
tags: [babylon, loader, docs, contract-tests, conditional-verification]
requires:
  - phase: 20-conditional-secondary-surface-verification
    provides: Demo manifest-first verification surface from Plan 20-01
provides:
  - Loader package dependency ownership that no longer relies on undeclared hoisted Babylon installs
  - Separate `test:secondary:contracts` audit plus touched-path verification guidance across root docs and package READMEs
  - Passing Babylon package tests, secondary-surface contract audit, and unchanged authoritative root release gate
affects: [phase-20, packages, docs, tests, root]
tech-stack:
  added: []
  patterns: [repo-local-package-ownership, opt-in-secondary-audit, touched-path-command-matrix]
key-files:
  created:
    - .planning/phases/20-conditional-secondary-surface-verification/20-02-SUMMARY.md
    - test/secondary_surface_contract.test.mjs
  modified:
    - package.json
    - README.md
    - AGENTS.md
    - packages/occt-babylon-loader/package.json
    - packages/occt-babylon-loader/README.md
    - packages/occt-babylon-loader/test/occt-scene-builder.test.mjs
    - packages/occt-babylon-viewer/README.md
    - packages/occt-babylon-widgets/README.md
key-decisions:
  - "Repo-local Babylon packages stay installable for verification by using `file:` dependencies or devDependencies where the packages are not published to npm."
  - "The loader keeps `@tx-code/occt-core` caller-supplied as a peer contract, but uses a repo-local devDependency so package-local tests can install cleanly."
  - "Secondary-surface routing is locked through `npm run test:secondary:contracts` instead of expanding `npm run test:release:root`."
patterns-established:
  - "When a repo-local package imports another unpublished repo-local package directly, express that ownership in the manifest with repo-local install metadata instead of relying on hoisting."
  - "When package tests span duplicated dependency copies, assert on stable material type/property contracts instead of `instanceof` across package boundaries."
requirements-completed: [SURF-02, SURF-03]
duration: n/a
completed: 2026-04-17
---

# Phase 20 Plan 02 Summary

**Secondary-surface verification is now codified as an explicit conditional contract: the loader owns its direct imports, root/docs routing is discoverable, and none of it polluted `npm run test:release:root`.**

## Performance

- **Duration:** n/a
- **Tasks:** 1
- **Files modified:** 9

## Accomplishments

- Updated `packages/occt-babylon-loader/package.json` so the loader owns its direct `@babylonjs/core` and `@tx-code/occt-babylon-viewer` imports, while `@tx-code/occt-core` remains caller-supplied through a peer contract backed by a repo-local devDependency for package-local testing.
- Added `npm run test:secondary:contracts` plus `test/secondary_surface_contract.test.mjs` to lock the conditional secondary-surface manifest/docs contract outside the authoritative root release gate.
- Added a touched-path verification matrix to `README.md` and `AGENTS.md`, and added package-local verification notes to the loader, viewer, and widgets READMEs.
- Hardened `packages/occt-babylon-loader/test/occt-scene-builder.test.mjs` so it asserts the material type contract without relying on cross-package `instanceof` behavior across duplicated Babylon dependency copies.
- Verified the complete conditional-secondary surface with `npm install --prefix packages/occt-babylon-loader --no-package-lock`, all three Babylon package tests, `node --test test/secondary_surface_contract.test.mjs`, `npm run test:secondary:contracts`, and a full `npm run test:release:root` regression pass.

## Task Commits

1. **Plan 20-02 implementation:** `4ddcb25` (`test(20): codify conditional secondary-surface verification`)

## Files Created/Modified

- `packages/occt-babylon-loader/package.json` - Declared loader-owned direct imports and repo-local test support for `occt-core`.
- `packages/occt-babylon-loader/test/occt-scene-builder.test.mjs` - Replaced a brittle cross-copy `instanceof` assertion with a stable material type check.
- `package.json` - Added the separate `test:secondary:contracts` audit command.
- `test/secondary_surface_contract.test.mjs` - Added contract coverage for demo commands, loader dependency ownership, docs routing, and root-gate exclusion.
- `README.md` and `AGENTS.md` - Published the touched-path command matrix and the separate secondary-surface audit path.
- `packages/occt-babylon-loader/README.md`, `packages/occt-babylon-viewer/README.md`, `packages/occt-babylon-widgets/README.md` - Added package-local verification guidance.

## Decisions Made

- Kept `test:secondary:contracts` as a separate opt-in audit instead of threading these checks into `npm run test:release:root`.
- Used repo-local `file:` package references where necessary because the Babylon-side packages are not published on npm.
- Left `@tx-code/occt-core` as the caller-facing peer contract while adding repo-local install support only for local package verification.

## Deviations from Plan

- Modified `packages/occt-babylon-loader/test/occt-scene-builder.test.mjs` even though it was not in the original file list. This was necessary because once the loader had its own Babylon dependency graph, the old `instanceof PBRMaterial` assertion became invalid across duplicate package copies despite the runtime behavior being correct.

## Issues Encountered

- `npm install --prefix packages/occt-babylon-loader --no-package-lock` initially failed because npm v7+ attempted to resolve the unpublished peer `@tx-code/occt-core` from the public registry. Adding a repo-local devDependency kept the published caller-supplied semantics while making local verification installable.

## User Setup Required

None.

## Next Phase Readiness

- Phase 20 is ready for phase-level verification and milestone closeout.
- The repo can now move into `v1.6 Exact Semantics Helpers` after `v1.5` is archived.

---
*Phase: 20-conditional-secondary-surface-verification*
*Completed: 2026-04-17*
