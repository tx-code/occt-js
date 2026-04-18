# Phase 20: Conditional Secondary-Surface Verification - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-17
**Phase:** 20-conditional-secondary-surface-verification
**Mode:** auto
**Areas discussed:** Command discoverability, demo verification surface, Babylon package dependency ownership, conditional verification policy

---

## Command discoverability

| Option | Description | Selected |
|--------|-------------|----------|
| Manifest-first | Expose runnable verification commands directly from `demo/package.json` and the relevant Babylon package manifests, with docs as supporting guidance | ✓ |
| Docs only | Keep raw commands in top-level docs and leave manifests mostly unchanged | |
| Root-only wrappers | Add only repo-root wrappers and keep package manifests sparse | |

**User's choice:** Auto-selected recommended option: manifest-first
**Notes:** Chosen because `SURF-01` explicitly allows manifests or top-level docs, and the current biggest gap is that maintainers cannot discover demo verification by running `npm --prefix demo test`.

---

## Demo verification surface

| Option | Description | Selected |
|--------|-------------|----------|
| Separate non-Tauri demo test commands | Add explicit demo test entrypoints for existing Node/browser verification without folding Tauri into the default demo test path | ✓ |
| One catch-all demo command including Tauri | Make the demo default test path also run desktop packaging/runtime checks | |
| Leave demo without test scripts | Keep current raw/implicit command knowledge | |

**User's choice:** Auto-selected recommended option: separate non-Tauri demo test commands
**Notes:** Chosen because the repo already has demo Node tests and Playwright E2E, while Tauri remains a conditional desktop-only surface.

---

## Babylon package dependency ownership

| Option | Description | Selected |
|--------|-------------|----------|
| Declare direct imports locally | Make `occt-babylon-loader` own the dependencies it imports directly so standalone tests stop relying on hoisted installs | ✓ |
| Keep relying on hoisted repo installs | Leave standalone package tests broken outside the repo root install shape | |
| Skip loader fix and document around it | Accept the hoist issue and only add docs | |

**User's choice:** Auto-selected recommended option: declare direct imports locally
**Notes:** Chosen because `npm --prefix packages/occt-babylon-loader test` currently fails with `ERR_MODULE_NOT_FOUND` for `@babylonjs/core`, and the loader source imports both `@babylonjs/core` and `@tx-code/occt-babylon-viewer` directly.

---

## Conditional verification policy

| Option | Description | Selected |
|--------|-------------|----------|
| Keep secondary surfaces conditional | Document touched-path routing clearly while keeping all secondary-surface checks outside `npm run test:release:root` | ✓ |
| Promote secondary surfaces into root gate | Make demo/Babylon/Tauri verification unconditional release blockers | |
| Leave routing implicit | Keep the conditional policy but do not spell out which paths trigger which commands | |

**User's choice:** Auto-selected recommended option: keep secondary surfaces conditional
**Notes:** Chosen to preserve the repo boundary established in AGENTS, README, and Phase 19.

---

## the agent's Discretion

- Choose the exact demo/Babylon script names as long as they are obvious from the relevant manifests.
- Choose the most compact touched-path routing documentation format.

## Deferred Ideas

- Wider Babylon ecosystem version alignment beyond the minimal Phase 20 fix
- CI promotion of secondary-surface checks
- Tauri product/runtime feature work
