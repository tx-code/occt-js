---
phase: 20-conditional-secondary-surface-verification
verified: 2026-04-17T14:27:02.5032179Z
status: passed
score: 4/4 must-haves verified
overrides_applied: 0
---

# Phase 20: Conditional Secondary-Surface Verification Report

**Phase Goal:** Maintainers can discover and run secondary-surface verification intentionally, with package-local dependency declarations and without turning those checks into unconditional root release prerequisites.
**Verified:** 2026-04-17T14:27:02.5032179Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Demo and Babylon verification commands are discoverable from manifests or top-level docs instead of hidden in maintainer lore. | ✓ VERIFIED | `demo/package.json` now exposes `test` and `test:e2e`; `README.md` and `AGENTS.md` publish a touched-path command matrix; the Babylon package READMEs now surface `npm --prefix packages/... test`. |
| 2 | `packages/occt-babylon-loader` runs from declared package-owned dependencies instead of undeclared hoisted Babylon installs. | ✓ VERIFIED | `packages/occt-babylon-loader/package.json` now declares `@babylonjs/core` and repo-local `@tx-code/occt-babylon-viewer` dependencies plus repo-local `@tx-code/occt-core` test support; `npm install --prefix packages/occt-babylon-loader --no-package-lock` succeeded; `npm --prefix packages/occt-babylon-loader test` passed. |
| 3 | Secondary-surface routing is explicitly conditional and locked through a separate audit outside the authoritative root release gate. | ✓ VERIFIED | `package.json` now exposes `test:secondary:contracts`; `test/secondary_surface_contract.test.mjs` passed both directly and through the script; `README.md` and `AGENTS.md` state that the audit and the touched-path commands remain outside the root release gate. |
| 4 | The authoritative root release gate remains unchanged and green after the secondary-surface hardening work. | ✓ VERIFIED | `npm run test:release:root` passed end to end after the Phase 20 changes, and `test/release_governance_contract.test.mjs` still confirms that demo/Babylon/Tauri checks stay outside the root release command. |

**Score:** 4/4 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `demo/package.json` | Explicit non-Tauri demo verification commands | ✓ VERIFIED | `test` runs the demo node lane; `test:e2e` runs a current-shell Playwright smoke check. |
| `demo/src/lib/auto-orient.js` and `demo/tests/auto-orient.test.mjs` | Stable demo node-test support for auto-orient helpers | ✓ VERIFIED | The helper exists, `useOcct.js` consumes it, and `npm --prefix demo test` passed. |
| `packages/occt-babylon-loader/package.json` | Loader-owned direct imports plus caller-supplied `occt-core` | ✓ VERIFIED | Direct imports moved into manifest dependencies; `occt-core` remains a peer contract with repo-local test support. |
| `package.json` and `test/secondary_surface_contract.test.mjs` | Separate secondary-surface contract audit | ✓ VERIFIED | `test:secondary:contracts` exists and passed without entering `test:release:root`. |
| `README.md`, `AGENTS.md`, Babylon package READMEs | Conditional touched-path verification guidance | ✓ VERIFIED | All touched docs now include explicit follow-up commands keyed to demo, Tauri, and Babylon package paths. |

### Key Link Verification

| From | To | Via | Status | Details |
| --- | --- | --- | --- | --- |
| `demo/package.json` | `demo/tests/app-home.spec.mjs` | `test:e2e` script membership | ✓ WIRED | The browser lane points to a current-shell smoke spec instead of the stale legacy viewer suite. |
| `packages/occt-babylon-loader/package.json` | `packages/occt-babylon-loader/src/occt-scene-builder.js` | direct import ownership | ✓ WIRED | Loader manifest dependencies now match the direct imports used by the scene builder. |
| `package.json` | `test/secondary_surface_contract.test.mjs` | `test:secondary:contracts` script membership | ✓ WIRED | The opt-in secondary audit is discoverable from the root manifest. |
| `README.md` / `AGENTS.md` | demo and Babylon manifests | touched-path command matrix | ✓ WIRED | Root docs now route maintainers to the same commands exposed in the relevant manifests. |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| --- | --- | --- | --- |
| Demo node lane passes from manifest | `npm --prefix demo test` | 34 tests passed, 0 failed | ✓ PASS |
| Demo browser smoke lane passes from manifest | `npm --prefix demo run test:e2e` | 1 Playwright smoke test passed | ✓ PASS |
| Demo production build still succeeds | `npm --prefix demo run build` | Vite build passed | ✓ PASS |
| Loader package installs repo-local deps and passes its tests | `npm install --prefix packages/occt-babylon-loader --no-package-lock` then `npm --prefix packages/occt-babylon-loader test` | install succeeded; 5 tests passed | ✓ PASS |
| Viewer package still passes | `npm --prefix packages/occt-babylon-viewer test` | 33 tests passed, 0 failed | ✓ PASS |
| Widgets package still passes | `npm --prefix packages/occt-babylon-widgets test` | 2 tests passed, 0 failed | ✓ PASS |
| Secondary-surface contract audit passes | `npm run test:secondary:contracts` | 5 tests passed, 0 failed | ✓ PASS |
| Root release gate remains authoritative and green | `npm run test:release:root` | full build + governance + `occt-core` + root runtime suite passed | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| --- | --- | --- | --- | --- |
| `SURF-01` | `20-01-PLAN.md`, `20-02-PLAN.md` | Demo and secondary package verification commands are discoverable from manifests or top-level docs. | ✓ SATISFIED | `demo/package.json` now exposes `test` and `test:e2e`; `README.md`, `AGENTS.md`, and Babylon package READMEs publish the touched-path command matrix. |
| `SURF-02` | `20-02-PLAN.md` | Loader tests no longer depend on undeclared hoisted Babylon installs. | ✓ SATISFIED | Loader manifest owns `@babylonjs/core` and repo-local viewer dependencies; install + test now passes locally. |
| `SURF-03` | `20-02-PLAN.md` | Secondary-surface checks remain conditional and outside unconditional root release prerequisites. | ✓ SATISFIED | `test:secondary:contracts` is separate; docs explicitly keep demo/Babylon/Tauri checks outside `npm run test:release:root`; the root release gate stayed unchanged and passed. |

Orphaned requirements: none. Phase 20 maps exactly to `SURF-01`, `SURF-02`, and `SURF-03`, and all three are covered by executed plan artifacts.

### Gaps Summary

No blocking gaps found. Phase 20 achieved manifest-first discoverability, package-local ownership, and conditional-secondary-surface routing without contaminating the authoritative root release gate.

---

_Verified: 2026-04-17T14:27:02.5032179Z_  
_Verifier: Codex (local verification pass)_
