---
phase: 18-runtime-path-contract-alignment
verified: 2026-04-17T12:51:34Z
status: passed
score: 4/4 must-haves verified
overrides_applied: 0
---

# Phase 18: Runtime Path Contract Alignment Verification Report

**Phase Goal:** Maintainers can validate the shipped root runtime-loading contract through the same concrete `dist/` artifact paths used by root consumers and the demo dev runtime.
**Verified:** 2026-04-17T12:51:34Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | `npm run test:wasm:preflight` passes when the shipped `dist/occt-js.js` and `dist/occt-js.wasm` artifacts exist at the canonical root locations and fails when those artifacts are missing. | ✓ VERIFIED | `dist/occt-js.js`, `dist/occt-js.wasm`, and `dist/occt-js.d.ts` exist in the repo root; `package.json:28` wires `npm run test:wasm:preflight`; `npm run test:wasm:preflight` passed 17/17; `test/load_occt_factory.test.mjs:22-33` asserts missing `dist/occt-js.wasm` fails with build guidance. |
| 2 | The maintained demo dev/runtime loading path resolves the same concrete root `dist/` artifacts that preflight asserts, so maintainers verify one shared loading contract instead of parallel path conventions. | ✓ VERIFIED | `demo/src/hooks/useOcct.js:17-19` resolves `../../../dist/occt-js.js` and `../../../dist/occt-js.wasm`; `test/dist_contract_consumers.test.mjs:31-32` and `demo/tests/use-occt-runtime-contract.test.mjs:11-12` assert those same paths; `node --test demo/tests/use-occt-runtime-contract.test.mjs` passed. |
| 3 | Root runtime-path assertions no longer depend on stale directory-base assumptions that disagree with shipped artifact consumers. | ✓ VERIFIED | `test/dist_contract_consumers.test.mjs:33-34` rejects both the `@vite-ignore` and plain directory-base `../../../dist/` forms; `node --test test/dist_contract_consumers.test.mjs` passed 6/6. |
| 4 | Tauri-bundled runtime resolution and production CDN fallback remain intact. | ✓ VERIFIED | `demo/src/hooks/useOcct.js:47-48` keeps `resolveResource("dist/occt-js.js")` and `resolveResource("dist/occt-js.wasm")`; `demo/src-tauri/tauri.conf.json:36-37` bundles those same files; `demo/src/hooks/useOcct.js:26,60,94-100` keeps the CDN and retry fallback path; `npm --prefix demo run build` passed. |

**Score:** 4/4 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `test/dist_contract_consumers.test.mjs` | Root static contract coverage for package, demo, and Tauri runtime consumers | ✓ VERIFIED | 70 lines; concrete runtime-path assertions at lines 29-34; on the root preflight command surface via `package.json:28`; `node --test test/dist_contract_consumers.test.mjs` passed. |
| `demo/src/hooks/useOcct.js` | Environment-specific runtime resolution with explicit local-dev JS and Wasm file URLs | ✓ VERIFIED | 147 lines; DEV branch at lines 17-24, Tauri branch at lines 45-53, CDN/retry fallback at lines 25-27, 58-60, and 94-100; wired into `demo/src/App.jsx:4,30`; `npm --prefix demo run build` passed. |
| `demo/tests/use-occt-runtime-contract.test.mjs` | Demo-side concrete runtime-path guard | ✓ VERIFIED | 13 lines; concrete-file positive checks and directory-base negative checks at lines 10-14; directly runnable with `node --test demo/tests/use-occt-runtime-contract.test.mjs`, which passed. |

### Key Link Verification

| From | To | Via | Status | Details |
| --- | --- | --- | --- | --- |
| `test/dist_contract_consumers.test.mjs` | `demo/src/hooks/useOcct.js` | source-text assertions on the local-dev runtime resolver | ✓ WIRED | Reads the hook source and asserts the maintained `resolveResource("dist/...")` and concrete `new URL("../../../dist/occt-js.(js|wasm)")` forms at lines 29-34. |
| `package.json` | `test/dist_contract_consumers.test.mjs` | `test:wasm:preflight` script membership | ✓ WIRED | `package.json:28` includes `test/dist_contract_consumers.test.mjs` in `npm run test:wasm:preflight`; the command passed. |
| `demo/tests/use-occt-runtime-contract.test.mjs` | `demo/src/hooks/useOcct.js` | source-text runtime-path assertions | ✓ WIRED | Reads `demo/src/hooks/useOcct.js` at line 8 and asserts the same concrete-file contract at lines 11-14; direct test execution passed. |
| `demo/src/hooks/useOcct.js` | `dist/occt-js.js` and `dist/occt-js.wasm` | DEV branch of `getWebRuntime()` | ✓ WIRED | `import.meta.env.DEV` branch returns `new URL("../../../dist/occt-js.js", import.meta.url)` and `new URL("../../../dist/occt-js.wasm", import.meta.url)` at lines 17-24. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| --- | --- | --- | --- | --- |
| `demo/src/hooks/useOcct.js` | `moduleUrl`, `wasmUrl`, `locateFile` | DEV branch `new URL("../../../dist/occt-js.js", ...)` and `new URL("../../../dist/occt-js.wasm", ...)` plus Tauri `resolveResource("dist/...")` | Yes — actual runtime URLs are constructed from checked-in paths, not empty placeholders | ✓ FLOWING |
| `test/dist_contract_consumers.test.mjs` | `hookSource` | `readRepoText("demo/src/hooks/useOcct.js")` | Yes — reads the live hook source from the repo | ✓ FLOWING |
| `demo/tests/use-occt-runtime-contract.test.mjs` | `useOcctSource` | `readFileSync(.../demo/src/hooks/useOcct.js)` | Yes — reads the live hook source from the repo | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| --- | --- | --- | --- |
| Root runtime-path contract test passes | `node --test test/dist_contract_consumers.test.mjs` | 6 tests passed, 0 failed | ✓ PASS |
| Demo runtime-path contract test passes | `node --test demo/tests/use-occt-runtime-contract.test.mjs` | 1 test passed, 0 failed | ✓ PASS |
| Root preflight gate passes on the canonical `dist/` artifacts | `npm run test:wasm:preflight` | 17 tests passed, 0 failed | ✓ PASS |

Supporting evidence outside the spot-check table: `npm --prefix demo run build` completed successfully.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| --- | --- | --- | --- | --- |
| `PATH-01` | `18-02-PLAN.md` | Root preflight verifies the same concrete local `dist/occt-js.js` and `dist/occt-js.wasm` paths used by the shipped demo dev runtime instead of stale directory-base assumptions. | ✓ SATISFIED | `demo/src/hooks/useOcct.js:17-19`, `test/dist_contract_consumers.test.mjs:31-34`, and `demo/tests/use-occt-runtime-contract.test.mjs:11-14` all align on the same concrete-file contract; both direct tests passed. |
| `PATH-02` | `18-01-PLAN.md` | `npm run test:wasm:preflight` passes against the shipped runtime-loading contract while still guarding the canonical `dist/` artifact boundary. | ✓ SATISFIED | `package.json:28` keeps the preflight suite on `test/wasm_build_prereqs.test.mjs`, `test/load_occt_factory.test.mjs`, and `test/dist_contract_consumers.test.mjs`; the preflight command passed; `test/load_occt_factory.test.mjs:22-33` preserves the missing-`dist/` failure path. |

Orphaned requirements: none. `REQUIREMENTS.md` maps only `PATH-01` and `PATH-02` to Phase 18, and both appear in plan frontmatter.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| --- | --- | --- | --- | --- |
| `test/dist_contract_consumers.test.mjs` | 51 | Non-runtime documentation assertions still live on the preflight path | ℹ️ Info | The preflight file now verifies the Phase 18 runtime-path truths, but it also includes README/docs assertions outside runtime-path alignment scope. |
| `demo/src/hooks/useOcct.js` | 94 | CDN retry branch is source-verified, not runtime-simulated by the Phase 18 command set | ℹ️ Info | The fallback path is present and the demo build passed, but Phase 18 automation does not induce a failed local script load and observe the CDN retry. |

No TODO/FIXME/placeholder stub markers were found in `test/dist_contract_consumers.test.mjs`, `demo/src/hooks/useOcct.js`, or `demo/tests/use-occt-runtime-contract.test.mjs`.

### Gaps Summary

No blocking gaps found. Phase 18 achieves the runtime-path contract goal in the checked-in code and on the declared root/demo verification commands.

---

_Verified: 2026-04-17T12:51:34Z_  
_Verifier: Claude (gsd-verifier)_
