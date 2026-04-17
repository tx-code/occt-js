# Testing Patterns

**Analysis Date:** 2026-04-17

## Test Framework

**Runner:**
- Node.js built-in `node:test` is the primary runner for `test/*.test.mjs`, `demo/tests/*.test.mjs`, and `packages/*/test/*.test.mjs`. Its version comes from the active local Node installation rather than a repo-pinned config file.
- Playwright `^1.58.2` is used for browser end-to-end coverage in `demo/tests/demo.spec.mjs`, with configuration in `playwright.config.mjs`.
- Config: `playwright.config.mjs` for browser runs; package scripts in `package.json`, `packages/occt-core/package.json`, `packages/occt-babylon-loader/package.json`, `packages/occt-babylon-viewer/package.json`, and `packages/occt-babylon-widgets/package.json` for node:test entrypoints.

**Assertion Library:**
- `node:assert/strict` is the standard assertion library in `test/*.test.mjs`, `demo/tests/*.test.mjs`, and `packages/*/test/*.test.mjs`.
- `expect` from `@playwright/test` is used in `demo/tests/demo.spec.mjs`.

**Run Commands:**
```bash
npm run test:wasm:preflight            # Root preflight and dist-consumer checks from `package.json`
npm test                               # Root contract suites plus script-style runtime verification from `package.json`
npm run test:release:root              # Windows build + governance + `packages/occt-core` + root suite from `package.json`
npm --prefix packages/occt-core test   # Package-local node:test suite from `packages/occt-core/package.json`
npm --prefix packages/occt-babylon-loader test
npm --prefix packages/occt-babylon-viewer test
npm --prefix packages/occt-babylon-widgets test
node --test demo/tests/*.test.mjs      # Demo node:test suites; `demo/package.json` does not define a test script
npx playwright test                    # Browser E2E using `playwright.config.mjs`
# Watch mode: not scripted
# Coverage: not configured
```

## Test File Organization

**Location:**
- Keep root Wasm/runtime and release-governance tests in `test/`, as seen in `test/load_occt_factory.test.mjs`, `test/import_appearance_contract.test.mjs`, and `test/release_governance_contract.test.mjs`.
- Keep demo logic, desktop helpers, and Playwright browser checks in `demo/tests/`, as seen in `demo/tests/viewer-store.test.mjs`, `demo/tests/desktop-runtime.test.mjs`, and `demo/tests/demo.spec.mjs`.
- Keep package-level tests beside each package surface in `packages/*/test/`, as seen in `packages/occt-core/test/core.test.mjs`, `packages/occt-babylon-loader/test/occt-scene-builder.test.mjs`, and `packages/occt-babylon-viewer/test/viewer-line-pass.test.mjs`.
- Reusable fixtures live under `test/` and are consumed cross-surface, for example `test/simple_part.step`, `test/ANC101.stp`, `test/as1_pe_203.brep`, and `test/orientation_reference_golden.json`.

**Naming:**
- Use `*.test.mjs` for node:test suites, for example `test/load_occt_factory.test.mjs`, `demo/tests/viewer-store.test.mjs`, and `packages/occt-babylon-viewer/test/viewer-camera.test.mjs`.
- Use `*.spec.mjs` for Playwright browser suites. The current repo-wide example is `demo/tests/demo.spec.mjs`.
- Keep legacy script-style verification as `test/test_*.mjs`, for example `test/test_mvp_acceptance.mjs`, `test/test_step_iges_root_mode.mjs`, and `test/test_read.mjs`. These are invoked with plain `node`, not `node --test`.

**Structure:**
```text
test/
  *.test.mjs           # node:test contract/governance suites
  test_*.mjs           # plain-node script verifications
  *.step *.stp *.igs *.brep *.json
demo/tests/
  *.test.mjs           # node:test for demo logic/helpers
  demo.spec.mjs        # Playwright browser E2E
packages/<package>/test/
  *.test.mjs           # node:test per package
```

## Test Structure

**Suite Organization:**
```js
import test from "node:test";
import assert from "node:assert/strict";
import { useViewerStore } from "../src/store/viewerStore.js";

test("setImportedModels keeps both raw and auto-orient and defaults to auto-orient", () => {
  restoreInitialState();
  useViewerStore.getState().setImportedModels(rawModel, autoOrientModel, "part.step");
  assert.equal(useViewerStore.getState().orientationMode, "auto-orient");
});
```

Pattern taken from `demo/tests/viewer-store.test.mjs`. Package tests also use `describe` and `it` from `node:test` in files such as `packages/occt-core/test/core.test.mjs` and `packages/occt-babylon-loader/test/format-routing.test.mjs`.

**Patterns:**
- Build fresh fixtures inline per file instead of relying on a shared global harness, for example `makeModel` and `restoreInitialState` in `demo/tests/viewer-store.test.mjs`, `createColorlessRawResult` in `packages/occt-core/test/core.test.mjs`, and `createMockRuntime` in `packages/occt-babylon-viewer/test/viewer-vertex-markers.test.mjs`.
- Use real Babylon `NullEngine` and `Scene` instances when render/resource behavior matters, as shown in `packages/occt-babylon-viewer/test/viewer.test.mjs`, `packages/occt-babylon-viewer/test/viewer-line-pass.test.mjs`, and `packages/occt-babylon-loader/test/occt-scene-builder.test.mjs`.
- Load real CAD fixture bytes with `readFile`, `readFileSync`, or helper loaders when import behavior is under test, as shown in `test/exact_placement_contract.test.mjs`, `test/exact_pairwise_measurement_contract.test.mjs`, and `demo/tests/auto-orient.test.mjs`.

- Teardown is explicit. Dispose Babylon resources with `scene.dispose()`, `engine.dispose()`, or custom `dispose()` handles as shown in `packages/occt-babylon-loader/test/occt-scene-builder.test.mjs`, `packages/occt-babylon-viewer/test/viewer.test.mjs`, and `packages/occt-babylon-viewer/test/viewer-vertex-markers.test.mjs`.
- Reset singleton-like Zustand state manually between tests, as shown in `demo/tests/viewer-store.test.mjs`.
- Playwright uses `test.beforeEach` for navigation and shell bootstrapping in `demo/tests/demo.spec.mjs`; browser/page teardown is handled by the framework.

- Standard assertions are `assert.equal`, `assert.deepEqual`, `assert.ok`, `assert.match`, and `assert.throws` in node:test suites.
- Playwright assertions combine `expect(locator)` with `page.evaluate(...)` to inspect DOM state and Babylon scene internals in `demo/tests/demo.spec.mjs`.

## Mocking

**Framework:** No dedicated mocking library is detected. Tests use hand-written fakes, dependency injection, and real lightweight engines.

**Patterns:**
```js
class FakeElement {
  constructor(tagName) {
    this.tagName = tagName;
    this.dataset = {};
    this.style = {};
    this.children = [];
  }
}
```

Pattern taken from `packages/occt-babylon-viewer/test/viewer-vertex-markers.test.mjs`.

**What to Mock:**
- Mock browser and DOM surfaces with minimal fake objects in `packages/occt-babylon-viewer/test/viewer-vertex-markers.test.mjs`.
- Mock Babylon math/runtime only when a full `NullEngine` is unnecessary, for example `StubVector3` in `packages/occt-babylon-viewer/test/viewer-vertex.test.mjs`.
- Pass plain object collaborators into pure helpers, for example `detectDesktopPlatform({ ... })` in `demo/tests/desktop-runtime.test.mjs` and `resolveAutoOrientedResult({ occt: { AnalyzeOptimalOrientation() { ... } } })` in `demo/tests/auto-orient.test.mjs`.

**What NOT to Mock:**
- Do not mock the root Wasm carrier when testing public runtime contract. Root suites load the real factory through `test/load_occt_factory.mjs` and the built `dist/occt-js.js`.
- Do not replace CAD fixtures with fabricated payloads when file-import behavior is under test. Root suites and Playwright rely on real files in `test/`.
- Do not replace Babylon with stubs when mesh/material lifecycle matters. Use real `NullEngine` and `Scene` instances as done in `packages/occt-babylon-viewer/test/viewer.test.mjs`, `packages/occt-babylon-viewer/test/viewer-line-pass.test.mjs`, and `packages/occt-babylon-loader/test/occt-scene-builder.test.mjs`.

## Fixtures and Factories

**Test Data:**
```js
async function loadFixture(name) {
  return new Uint8Array(await readFile(new URL(`./${name}`, import.meta.url)));
}

const factory = loadOcctFactory();
const module = await factory();
```

Pattern taken from `test/exact_placement_contract.test.mjs` and `test/load_occt_factory.mjs`.

**Location:**
- Root CAD fixtures and golden data are stored in `test/`, for example `test/simple_part.step`, `test/ANC101.stp`, `test/as1_pe_203.brep`, and `test/orientation_reference_golden.json`.
- Cross-surface fixture reuse is intentional. `demo/tests/auto-orient.test.mjs` and `demo/tests/demo.spec.mjs` consume files from `test/`.
- `demo/vite.config.js` serves the repo-level `test/` directory at `/test` during browser runs so Playwright can upload fixtures through the same Vite server used for the app.
- Temporary filesystem fixtures are created inline with `mkdtempSync`, `mkdirSync`, and `writeFileSync` in preflight/unit suites such as `test/load_occt_factory.test.mjs` and `test/wasm_build_prereqs.test.mjs`.

## Coverage

**Requirements:** No numeric threshold, coverage reporter, or coverage script is configured in `package.json`, `demo/package.json`, `packages/*/package.json`, or separate coverage config files.

**View Coverage:**
```bash
Not configured in-repo.
```

- Coverage is contract-driven instead of percentage-driven. `package.json` enumerates named gates such as `test:wasm:preflight`, `test`, and `test:release:root`.
- Demo browser breadth is concentrated in `demo/tests/demo.spec.mjs`, which carries both desktop and mobile scenarios in a single Playwright file.

## Test Types

**Unit Tests:**
- Pure helper coverage lives in `demo/tests/*.test.mjs` and `packages/*/test/*.test.mjs`, for example `demo/tests/desktop-menu.test.mjs`, `packages/occt-babylon-loader/test/format-routing.test.mjs`, and `packages/occt-babylon-viewer/test/viewer-camera.test.mjs`.

**Integration Tests:**
- Root runtime integration suites in `test/*.test.mjs` and `test/test_*.mjs` load real dist artifacts and CAD fixtures, for example `test/exact_model_lifecycle_contract.test.mjs`, `test/import_appearance_contract.test.mjs`, and `test/test_step_iges_root_mode.mjs`.
- Package integration also exists when a package binds to the root runtime, for example `packages/occt-core/test/live-root-integration.test.mjs`.

**E2E Tests:**
- Browser E2E is implemented with Playwright in `demo/tests/demo.spec.mjs` and configured by `playwright.config.mjs`.
- `playwright.config.mjs` runs Chromium against a Vite dev server at `http://localhost:5173`.
- Mobile coverage uses `devices["iPhone 12"]` inside `demo/tests/demo.spec.mjs` rather than a separate mobile test tree.

## Common Patterns

**Async Testing:**
```js
const module = await loadOcctFactory()();
const stepBytes = await loadFixture("simple_part.step");
const result = module.OpenExactStepModel(stepBytes, {});
assert.equal(result?.success, true);
```

Pattern taken from `test/exact_placement_contract.test.mjs`.

**Error Testing:**
```js
assert.throws(
  () => normalizeLinePassBatch({
    points: [0, 0, 0, 1, 0, 0, 2, 0, 0],
    segmentDashPeriods: [0],
  }),
  /segmentDashPeriods length/,
);
```

Pattern taken from `packages/occt-babylon-viewer/test/viewer-line-pass.test.mjs`.

- Some legacy script tests define small local assertion helpers and exit nonzero on failure, for example `test/test_step_iges_root_mode.mjs` and `test/test_mvp_acceptance.mjs`. Prefer new automated coverage in `node:test` unless a script genuinely needs CLI-style streaming output.

---

*Testing analysis: 2026-04-17*
