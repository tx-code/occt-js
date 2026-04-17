# Codebase Concerns

**Analysis Date:** 2026-04-17

## Tech Debt

**Release/Test Contract Drift:**
- Issue: `test/dist_contract_consumers.test.mjs` still asserts a directory-base dev runtime lookup (`new URL("../../../dist/", import.meta.url).href`), while `demo/src/hooks/useOcct.js` and `demo/tests/use-occt-runtime-contract.test.mjs` enforce concrete file URLs for `dist/occt-js.js` and `dist/occt-js.wasm`.
- Files: `test/dist_contract_consumers.test.mjs`, `demo/src/hooks/useOcct.js`, `demo/tests/use-occt-runtime-contract.test.mjs`
- Impact: `npm run test:wasm:preflight` fails immediately, which blocks `npm test` and the root release gate in `package.json`.
- Fix approach: Keep one runtime-path contract, update the stale root assertion to match the shipped hook behavior, and remove duplicate contract coverage where possible.

**Release Gate Coupled To Planning Archives:**
- Issue: `test/release_governance_contract.test.mjs` hardcodes archived milestone files, exact archived phase directory names, shipped dates, and `.planning/` state details alongside runtime governance checks.
- Files: `test/release_governance_contract.test.mjs`, `.planning/MILESTONES.md`, `.planning/milestones/v1.4-ROADMAP.md`, `.planning/STATE.md`, `package.json`
- Impact: the canonical root release gate is sensitive to planning-directory churn and milestone archival changes that do not affect the published Wasm runtime.
- Fix approach: keep package/runtime assertions in the root release gate and move GSD archive/process assertions into a separate planning audit command or optional governance suite.

**Duplicated XDE/IGES Loading Paths:**
- Issue: `src/importer-xde.cpp` and `src/orientation.cpp` both implement XDE setup, unit conversion, IGES temporary-file staging, and source-unit mapping.
- Files: `src/importer-xde.cpp`, `src/orientation.cpp`
- Impact: fixes to import behavior, unit handling, or IGES staging can diverge between import and orientation analysis paths.
- Fix approach: extract a shared XDE/IGES loader utility used by both import and orientation code.

**Monolithic Cross-Cutting Hotspots:**
- Issue: exact query logic, viewer scene wiring, and picking/highlight behavior are each concentrated in single large files with mixed concerns and extensive mutable state.
- Files: `src/exact-query.cpp`, `demo/src/hooks/useViewer.js`, `demo/src/hooks/usePicking.js`
- Impact: small behavior changes carry high regression risk because geometry math, lifecycle, rendering, and input handling are tightly interleaved.
- Fix approach: split these files by responsibility boundaries such as exact-ref resolution vs measurement ops, scene construction vs overlay management, and hover vs selection handling.

## Known Bugs

**Root preflight currently fails on the demo runtime-path contract:**
- Symptoms: `npm run test:wasm:preflight` fails in `test/dist_contract_consumers.test.mjs` because `demo/src/hooks/useOcct.js` no longer contains the directory-base lookup expected by the test.
- Files: `test/dist_contract_consumers.test.mjs`, `demo/src/hooks/useOcct.js`
- Trigger: run `npm run test:wasm:preflight`, `npm test`, or any gate that depends on the root preflight suite.
- Workaround: update the stale assertion before relying on root preflight or bypass that specific test locally.

**Demo node test suite contains a dead import:**
- Symptoms: `node --test demo/tests/*.test.mjs` fails because `demo/tests/auto-orient.test.mjs` imports `../src/lib/auto-orient.js`, which does not exist.
- Files: `demo/tests/auto-orient.test.mjs`, `packages/occt-core/src/orientation.js`, `demo/src/hooks/useOcct.js`
- Trigger: run the demo node test suite.
- Workaround: update the test to target `@tx-code/occt-core` orientation helpers or restore a compatibility shim.

**Loader package test surface is not runnable standalone:**
- Symptoms: `npm --prefix packages/occt-babylon-loader test` fails with `ERR_MODULE_NOT_FOUND` for `@babylonjs/core`.
- Files: `packages/occt-babylon-loader/package.json`, `packages/occt-babylon-loader/test/occt-scene-builder.test.mjs`
- Trigger: run the loader package tests from the package directory or on a clean install without hoisted Babylon dependencies.
- Workaround: install the missing Babylon test dependency manually or add explicit `dependencies`/`devDependencies` for the test surface.

## Security Considerations

**Browser demo executes remote runtime code from a CDN:**
- Risk: the production web path in `demo/src/hooks/useOcct.js` injects `https://unpkg.com/@tx-code/occt-js@${packageJson.version}/dist/occt-js.js` at runtime with no integrity pinning or local packaged fallback for the web build.
- Files: `demo/src/hooks/useOcct.js`, `package.json`
- Current mitigation: the version is pinned to `package.json`, and the desktop path uses local bundled artifacts instead of the CDN.
- Recommendations: ship the web demo with local `dist/` assets or add integrity/hash validation and explicit offline failure handling.

**Desktop file-read capability is broader than the current UI contract:**
- Risk: the Tauri capability grants `fs:allow-read-file`; if a future XSS or untrusted script path lands in the desktop app, arbitrary file reads become reachable through `@tauri-apps/plugin-fs`.
- Files: `demo/src-tauri/capabilities/default.json`, `demo/src-tauri/src/lib.rs`, `demo/src/lib/desktop-file.js`
- Current mitigation: the desktop app is local-content-only, uses no write permission, and current UI code only reads files chosen via the dialog flow.
- Recommendations: keep the desktop surface local-only, prefer dialog-scoped command mediation for file reads, and narrow Tauri permissions as the app grows.

## Performance Bottlenecks

**Exact-query lookups copy full model entries per operation:**
- Problem: `ExactModelStore::GetEntry` copies `ExactModelEntry`, including `exactGeometryShapes`, into an output parameter on every lookup, and `src/exact-query.cpp` does that before each exact measurement/classification call.
- Files: `src/exact-model-store.cpp`, `src/exact-model-store.hpp`, `src/exact-query.cpp`
- Cause: the store API returns copied entries rather than immutable shared references or handle-backed accessors.
- Improvement path: expose const/shared entry access, keep the vector of retained shapes stable in-place, and avoid per-query copying under the store mutex.

**Hover and highlight updates rebuild full line-pass meshes:**
- Problem: every hover/selection change recomputes layer batches in `demo/src/hooks/useViewer.js`, and `packages/occt-babylon-viewer/src/viewer-line-pass-mesh.js` allocates fresh typed arrays for every visible segment.
- Files: `demo/src/hooks/useViewer.js`, `demo/src/hooks/usePicking.js`, `packages/occt-babylon-viewer/src/viewer-line-pass.js`, `packages/occt-babylon-viewer/src/viewer-line-pass-mesh.js`
- Cause: static CAD edges, transient hover lines, and toolpath overlays all flow through the same full rebuild path.
- Improvement path: cache immutable CAD edge layers, isolate transient highlight layers, and update only the changed token/layer instead of rebuilding every segment buffer.

**IGES paths take an extra full-copy temp-file round trip:**
- Problem: IGES import and orientation analysis both write the uploaded bytes into a temporary `.igs` file before calling OCCT.
- Files: `src/importer-xde.cpp`, `src/orientation.cpp`
- Cause: the OCCT toolchain in use does not reliably support IGES `ReadStream`, so the code falls back to temporary-file staging.
- Improvement path: centralize the fallback implementation, use collision-safe temp names, and minimize duplicate byte copies where possible.

## Fragile Areas

**Picking/highlight lifecycle in the React demo:**
- Files: `demo/src/hooks/usePicking.js`, `demo/src/hooks/useViewer.js`, `demo/src/store/viewerStore.js`
- Why fragile: hover observers, pointer observers, canvas event listeners, selection disposables, and line-pass overlays are coordinated through refs and external store subscriptions with no small seam for isolated edits.
- Safe modification: change one concern at a time, run the demo node tests plus Playwright coverage, and watch for disposal regressions around hover clearing and scene teardown.
- Test coverage: `demo/tests/*.test.mjs` and `demo/tests/demo.spec.mjs` exist, but the demo test surface is not wired into a stable package script and one demo node test is currently stale.

**Exact query surface and lifecycle glue:**
- Files: `src/exact-query.cpp`, `src/js-interface.cpp`, `src/exact-model-store.cpp`, `packages/occt-core/src/occt-core.js`
- Why fragile: exact geometry typing, pairwise math, placement suggestion, lifecycle handle semantics, and JS binding contracts all meet in a narrow code path with many exported methods.
- Safe modification: update C++ and JS wrappers together, add or update contract tests under `test/*.test.mjs` and `packages/occt-core/test/*.test.mjs`, and verify both success and failure DTO shapes.
- Test coverage: root exact-contract coverage is strong, but there is no leak/soak coverage for long-lived exact handles.

**Governance assertions around `.planning/`:**
- Files: `test/release_governance_contract.test.mjs`, `.planning/STATE.md`, `.planning/MILESTONES.md`
- Why fragile: release verification depends on specific planning filenames, archived phase directories, and shipped-date strings rather than only on published runtime behavior.
- Safe modification: treat planning assertions as process checks, not runtime release gates, and update the suite whenever milestone archive structure changes.
- Test coverage: this area is heavily asserted, but the assertions are brittle to repository-operations changes.

## Scaling Limits

**Manual exact-model lifecycle management:**
- Current capacity: a single process-global `liveEntries` map in `src/exact-model-store.cpp` with monotonically increasing ids and no automatic cleanup path.
- Limit: callers that open exact models and forget `releaseExactModel()` retain exact geometry memory for the lifetime of the process.
- Scaling path: add JS-side disposable wrappers and optional `FinalizationRegistry` support in `packages/occt-core/src/occt-core.js`, plus diagnostics for live exact-handle counts.

**Release verification depends on local maintainer environments:**
- Current capacity: Windows Wasm build and root release verification are local/manual flows driven by `package.json`, `tools/build_wasm_win.bat`, and `tools/build_wasm_win_dist.bat`.
- Limit: there is no automated repository workflow for the root Wasm build, root tests, package tests, or desktop/browser regression matrix.
- Scaling path: add CI for Windows Wasm build plus root/package/demo verification, and keep `.github/workflows/deploy-demo.yml` as a deployment-only job.

## Dependencies at Risk

**Package and peer version drift across the Babylon surfaces:**
- Risk: the repo ships `@tx-code/occt-js` and `@tx-code/occt-core` at `0.1.8`, `@tx-code/occt-babylon-loader` and `@tx-code/occt-babylon-viewer` at `0.1.7`, and `@tx-code/occt-babylon-widgets` at `0.1.4`; `packages/occt-babylon-loader/package.json` still peers `@babylonjs/core` `^8.0.0` while the viewer and demo use Babylon `^9.0.0`.
- Impact: local `file:` links in `demo/package.json` hide the drift, but external consumers and standalone package tests can see peer conflicts, missing dependencies, or mismatched expectations.
- Migration plan: version the Babylon surfaces together when contracts move, align Babylon peer/dependency ranges, and add a repo-level package matrix test before publishing.

## Missing Critical Features

**No repo-wide automated verification workflow for the published runtime and package surfaces:**
- Problem: `.github/workflows/deploy-demo.yml` only builds and deploys the demo; it does not run `npm run test:wasm:preflight`, `npm test`, package tests, or demo tests.
- Blocks: reliable detection of release regressions before `master` updates or demo deployments.

**Demo test entrypoints are not discoverable from `demo/package.json`:**
- Problem: `demo/tests/*.test.mjs` and `demo/tests/demo.spec.mjs` exist, but `demo/package.json` exposes no `test`, `test:unit`, or `test:e2e` scripts.
- Blocks: routine execution by maintainers, CI adoption, and contributor discovery of the expected verification flow.

## Test Coverage Gaps

**Secondary-surface tests are not part of the root command surface:**
- What's not tested: root scripts in `package.json` do not execute `packages/occt-babylon-loader`, `packages/occt-babylon-viewer`, `packages/occt-babylon-widgets`, `demo/tests/*.test.mjs`, or Playwright via `playwright.config.mjs`.
- Files: `package.json`, `packages/occt-babylon-loader/package.json`, `packages/occt-babylon-viewer/package.json`, `packages/occt-babylon-widgets/package.json`, `demo/package.json`, `playwright.config.mjs`
- Risk: viewer/demo/package regressions survive until someone manually remembers to run the secondary-surface suites.
- Priority: High

**Dormant tests are already stale or broken:**
- What's not tested: the demo auto-orient node test and the loader package scene-builder test are not routinely exercised in the main verification path.
- Files: `demo/tests/auto-orient.test.mjs`, `packages/occt-babylon-loader/test/occt-scene-builder.test.mjs`
- Risk: refactors can strand dead imports and missing dependencies without failing the canonical release path.
- Priority: High

---

*Concerns audit: 2026-04-17*
