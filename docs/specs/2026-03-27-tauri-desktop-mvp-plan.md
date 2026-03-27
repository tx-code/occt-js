# Tauri Desktop MVP Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Wasm runtime reproducible in isolated Windows worktrees, then rename the current frontend app from `demo/` to `app/` and add an offline Windows Tauri desktop MVP without breaking the browser app, Playwright coverage, GitHub Pages deployment, or the root npm package release flow.

**Architecture:** First harden the repository's Wasm acquisition path so `dist/occt-js.js` and `dist/occt-js.wasm` can be rebuilt inside a clean Windows worktree without depending on a shared root-level `emsdk/` directory or WSL. Then keep one React + Vite frontend app and make it serve both browser and desktop runtimes. After the build chain is stable, migrate path-based tooling from `demo/` to `app/`, replace Babylon CDN globals with a bundled compatibility runtime, isolate `occt-js` loading into explicit runtime branches, and finally scaffold Tauri v2 inside `app/src-tauri/`.

**Tech Stack:** React 18, Vite 6, Tailwind 4, Zustand, Playwright, Node built-in test runner, Emscripten 3.1.69, MinGW Makefiles, `@babylonjs/core`, `@babylonjs/materials`, Tauri v2 (`@tauri-apps/cli`, `@tauri-apps/api`, Rust `tauri`)

## Execution Update (2026-03-27)

Time-boxed execution changed the critical path.

- The frontend directory was **not renamed**. The active implementation remains in `demo/`.
- The desktop MVP now uses the **existing root `dist/occt-js.js` + `dist/occt-js.wasm` artifacts** instead of blocking on a fully reproducible clean-worktree Wasm rebuild.
- Babylon has been moved off the CDN and into local npm dependencies inside `demo/`.
- The Tauri shell has been scaffolded and configured under `demo/src-tauri/`.

This means the plan below is now partially superseded:

- `demo/ -> app/` migration is deferred.
- Full "clean worktree can rebuild Wasm from scratch" hardening is partially implemented but not on the MVP critical path.
- Desktop MVP delivery now prioritizes "ship a runnable app from existing JS/Wasm artifacts" over finishing the Wasm build cleanup.

## Status Snapshot

- [x] Added clearer root dist preflight tests and messages for missing Wasm artifacts
- [x] Added Windows-native Wasm setup/build scripts and local-toolchain checks
- [ ] Finished a full clean-worktree Wasm rebuild end-to-end
- [x] Kept the existing `demo/` browser app path intact
- [x] Replaced Babylon CDN loading with local npm packages in `demo/`
- [x] Added runtime-based OCCT loading for browser vs Tauri in `demo/src/hooks/useOcct.js`
- [x] Scaffolded `demo/src-tauri/` and bundled root `dist/occt-js.js` + `dist/occt-js.wasm` as Tauri resources
- [x] Verified root `npm test` using the existing root `dist` artifacts
- [x] Verified `cd demo && npm run build`
- [x] Verified `cd demo && npm run tauri:build -- --debug --no-bundle`
- [x] Launched the built desktop app successfully from `demo/src-tauri/target/debug/app.exe`

---

## File Map

| Path | Action | Responsibility |
|------|--------|----------------|
| `demo/` -> `app/` | Move | Rename the frontend app directory while preserving browser behavior |
| `package.json` | Modify | Add explicit Windows Wasm build commands |
| `CMakeLists.txt` | Modify | Generate OCCT build-time headers needed by clean worktree builds |
| `tools/setup_emscripten_win.bat` | Modify | Install Emscripten into a worktree-local build directory |
| `tools/check_wasm_prereqs.mjs` | Create | Centralize submodule and local toolchain preflight checks |
| `tools/build_wasm_win.bat` | Create | Configure and build Wasm on Windows without WSL |
| `tools/build_wasm_win_release.bat` | Create | Build the Release Wasm target on Windows |
| `tools/build_wasm_win_dist.bat` | Create | Copy built Wasm artifacts into `dist/` for tests and consumers |
| `README.md` | Modify | Document reproducible Wasm acquisition on Windows and artifact expectations |
| `CLAUDE.md` | Modify | Keep local build instructions aligned with the new Windows flow |
| `test/load_occt_factory.mjs` | Create | Centralize `dist/occt-js.js` loading and emit a clear preflight error if artifacts are missing |
| `test/load_occt_factory.test.mjs` | Create | Verify the preflight helper produces a clear error for missing artifacts |
| `test/wasm_build_prereqs.test.mjs` | Create | Verify missing submodule and missing local emsdk errors stay actionable |
| `test/test_multi_format_exports.mjs` | Modify | Use the shared dist preflight helper |
| `test/test_mvp_acceptance.mjs` | Modify | Use the shared dist preflight helper |
| `playwright.config.mjs` | Modify | Point browser tests at `app/tests` and `cd app` commands |
| `.github/workflows/deploy-demo.yml` -> `.github/workflows/deploy-app.yml` | Move + modify | Keep GitHub Pages deployment working after rename |
| `.codex/skills/releasing-occt-js/SKILL.md` | Modify | Keep local release instructions accurate after rename |
| `app/package.json` | Modify | Rename the package, add Babylon deps, add Tauri deps/scripts |
| `app/package-lock.json` | Regenerate | Capture npm dependency updates for Babylon and Tauri |
| `app/index.html` | Modify | Remove Babylon CDN scripts |
| `app/src/main.jsx` | Modify | Bootstrap Babylon compatibility runtime before the React app mounts |
| `app/src/lib/babylon-runtime.js` | Create | Build a local `window.BABYLON` compatibility object from npm packages |
| `app/src/lib/runtime-env.js` | Create | Runtime detection helpers for browser vs Tauri branches |
| `app/src/lib/tauri-resource.js` | Create | Resolve bundled `occt-js` resource URLs for Tauri |
| `app/src/hooks/useOcct.js` | Modify | Use explicit runtime-based OCCT asset resolution |
| `app/tests/no-cdn.spec.mjs` | Create | Browser regression test proving Babylon CDN is gone |
| `app/tests/runtime-env.test.mjs` | Create | Node tests for runtime helper behavior |
| `app/tests/tauri-resource.test.mjs` | Create | Node tests for Tauri OCCT resource URL helpers |
| `test/tauri-config.test.mjs` | Create | Config smoke test for `src-tauri` resources and commands |
| `app/src-tauri/` | Create via Tauri scaffold + targeted edits | Desktop shell, config, icons, Rust entry point |
| `docs/specs/2026-03-27-tauri-desktop-mvp-design.md` | Modify only if implementation details drift | Keep approved design synchronized with final structure |

Notes:

- Historical specs that describe earlier `demo/` work can stay historical. Update only active docs, scripts, workflows, and skills that affect current operation.
- The browser app build output remains `app/dist/`. The desktop app separately bundles the repository root `dist/occt-js.js` and `dist/occt-js.wasm` as Tauri resources.
- Current root tests already provide a real failing baseline in clean worktrees: they fail because `dist/occt-js.js` is missing and the current build flow depends on a shared ignored `emsdk/` plus `bash tools/build_wasm.sh`.

## Chunk 0: Make Wasm Artifacts Reproducible In Windows Worktrees

### Task 0: Fix the Wasm acquisition path before any app or Tauri work

**Files:**
- Modify: `package.json`
- Modify: `CMakeLists.txt`
- Modify: `tools/setup_emscripten_win.bat`
- Create: `tools/check_wasm_prereqs.mjs`
- Create: `tools/build_wasm_win.bat`
- Create: `tools/build_wasm_win_release.bat`
- Create: `tools/build_wasm_win_dist.bat`
- Create: `test/load_occt_factory.mjs`
- Create: `test/load_occt_factory.test.mjs`
- Create: `test/wasm_build_prereqs.test.mjs`
- Modify: `test/test_multi_format_exports.mjs`
- Modify: `test/test_mvp_acceptance.mjs`
- Modify: `README.md`
- Modify: `CLAUDE.md`
- Test: `node --test test/load_occt_factory.test.mjs`
- Test: `npm run build:wasm:win`
- Test: `npm test`

- [ ] **Step 1: Add a failing test for the dist preflight helper**

Create `test/load_occt_factory.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { createOcctRequireError, resolveFactoryPath } from "./load_occt_factory.mjs";

test("resolveFactoryPath returns the requested dist path", () => {
  assert.equal(
    resolveFactoryPath("E:/repo/dist/occt-js.js"),
    "E:/repo/dist/occt-js.js"
  );
});

test("createOcctRequireError explains how to build missing dist artifacts", () => {
  const error = createOcctRequireError("E:/repo/dist/occt-js.js");
  assert.match(error.message, /dist\/occt-js\.js/);
  assert.match(error.message, /npm run build:wasm:win/);
  assert.match(error.message, /bash tools\/build_wasm\.sh/);
});
```

- [ ] **Step 2: Run the helper test to verify it fails because the helper does not exist**

Run:

```powershell
node --test test/load_occt_factory.test.mjs
```

Expected: FAIL because `test/load_occt_factory.mjs` does not exist yet.

- [ ] **Step 3: Add explicit Windows Wasm build scripts to the root package**

Update `package.json` scripts to include:

```json
{
  "scripts": {
    "build:wasm": "bash tools/build_wasm.sh",
    "build:wasm:win": "tools\\build_wasm_win_dist.bat",
    "test": "node test/test_multi_format_exports.mjs && node test/test_mvp_acceptance.mjs"
  }
}
```

- [ ] **Step 4: Make Emscripten setup worktree-local on Windows**

Replace the current root-level `emsdk/` setup in `tools/setup_emscripten_win.bat` with a build-local layout under `build\\wasm\\emsdk`.

Required behavior:

- create `build\\wasm`
- clone `emsdk` into `build\\wasm\\emsdk` if missing
- install and activate Emscripten `3.1.69`
- do not create or require a repository-root `emsdk/` directory
- print the command needed to activate that local toolchain in a shell

- [ ] **Step 5: Create a Windows-native Wasm build entry point**

Create `tools/build_wasm_win.bat` modeled on the `occt-import-js` approach:

```bat
@echo off
setlocal
pushd %~dp0\..

if not exist build\wasm\emsdk\emsdk_env.bat (
  echo Missing build\wasm\emsdk\emsdk_env.bat
  echo Run tools\setup_emscripten_win.bat first.
  popd
  exit /b 1
)

call build\wasm\emsdk\emsdk_env.bat || goto :error
call emcmake cmake -S . -B build\wasm -G "MinGW Makefiles" -DCMAKE_BUILD_TYPE=%1 || goto :error
call emmake mingw32-make -C build\wasm || goto :error

popd
exit /b 0

:error
echo Build Failed with Error %errorlevel%.
popd
exit /b 1
```

- [ ] **Step 6: Add a release wrapper that copies artifacts into `dist/`**

Create:

- `tools/build_wasm_win_release.bat`
- `tools/build_wasm_win_dist.bat`

Required behavior:

- `build_wasm_win_release.bat` calls `build_wasm_win.bat Release`
- `build_wasm_win_dist.bat` calls the release wrapper, then copies `build\wasm\occt-js.js` and `build\wasm\occt-js.wasm` into `dist\`
- fail clearly if the expected build outputs are missing

- [ ] **Step 7: Create the shared dist preflight helper**

Create `test/load_occt_factory.mjs`:

```js
import { createRequire } from "node:module";
import { existsSync } from "node:fs";

export function resolveFactoryPath(defaultPath = new URL("../dist/occt-js.js", import.meta.url).pathname) {
  return defaultPath;
}

export function createOcctRequireError(factoryPath) {
  return new Error(
    `Missing ${factoryPath}. Build the Wasm artifacts first with "npm run build:wasm:win" on Windows or "bash tools/build_wasm.sh" on Linux/macOS.`
  );
}

export function loadOcctFactory(factoryPath = resolveFactoryPath()) {
  if (!existsSync(factoryPath)) {
    throw createOcctRequireError(factoryPath);
  }
  const require = createRequire(import.meta.url);
  return require(factoryPath);
}
```

- [ ] **Step 8: Refactor the root tests to use the helper**

Update:

- `test/test_multi_format_exports.mjs`
- `test/test_mvp_acceptance.mjs`

Replace direct `require("../dist/occt-js.js")` loading with:

```js
import { loadOcctFactory } from "./load_occt_factory.mjs";

const factory = loadOcctFactory();
```

- [ ] **Step 9: Run the new helper test after implementing the helper**

Run:

```powershell
node --test test/load_occt_factory.test.mjs
```

Expected: PASS.

- [ ] **Step 10: Rebuild the Wasm runtime inside the worktree using the new Windows command**

Run:

```powershell
tools\setup_emscripten_win.bat
npm run build:wasm:win
```

Expected: `dist/occt-js.js` and `dist/occt-js.wasm` are created inside the worktree.

- [ ] **Step 11: Re-run root package tests with locally rebuilt artifacts**

Run:

```powershell
npm test
```

Expected: PASS with the worktree-local `dist/` artifacts.

- [ ] **Step 12: Update the active build documentation**

Update:

- `README.md`
- `CLAUDE.md`

Required changes:

- document that tests and consumers require `dist/occt-js.js` and `dist/occt-js.wasm`
- document the Windows-native path: `tools\setup_emscripten_win.bat` then `npm run build:wasm:win`
- keep `bash tools/build_wasm.sh` as the Linux/macOS path
- remove guidance that implies a repository-root `emsdk/` is part of the tracked project layout

- [ ] **Step 13: Commit the build-infrastructure hardening**

Run:

```powershell
git add package.json tools/setup_emscripten_win.bat tools/build_wasm_win.bat tools/build_wasm_win_release.bat tools/build_wasm_win_dist.bat test/load_occt_factory.mjs test/load_occt_factory.test.mjs test/test_multi_format_exports.mjs test/test_mvp_acceptance.mjs README.md CLAUDE.md
git commit -m "build: make wasm artifacts reproducible on Windows"
```

## Chunk 1: Rename The Frontend App Directory Without Breaking Web

### Task 1: Move `demo/` to `app/` and migrate active path consumers

**Files:**
- Move: `demo/` -> `app/`
- Modify: `playwright.config.mjs`
- Move + Modify: `.github/workflows/deploy-demo.yml` -> `.github/workflows/deploy-app.yml`
- Modify: `README.md`
- Modify: `.codex/skills/releasing-occt-js/SKILL.md`
- Test: `npx playwright test`
- Test: `cd app && npm run build`

- [ ] **Step 1: Rename the frontend directory in git**

Run:

```powershell
git mv demo app
```

Expected: `git status --short` shows a moved frontend directory instead of a delete/add pair.

- [ ] **Step 2: Update `app/package.json` metadata after the move**

Change the package name from:

```json
{
  "name": "occt-js-demo"
}
```

to:

```json
{
  "name": "occt-js-app"
}
```

- [ ] **Step 3: Update Playwright to use the renamed frontend app**

Edit `playwright.config.mjs` to:

```js
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "app/tests",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: "http://localhost:5173",
    headless: true,
  },
  webServer: {
    command: "cd app && npx vite --port 5173",
    port: 5173,
    reuseExistingServer: true,
    timeout: 15_000,
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
});
```

- [ ] **Step 4: Rename and update the GitHub Pages workflow**

Move `.github/workflows/deploy-demo.yml` to `.github/workflows/deploy-app.yml` and update the active path references:

```yaml
name: Deploy App to GitHub Pages

...

      - name: Install app dependencies
        run: cd app && npm ci

      - name: Build app
        run: cd app && npm run build

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: app/dist
```

- [ ] **Step 5: Update active user-facing and operational docs**

Update these active references:

- `README.md`
- `.codex/skills/releasing-occt-js/SKILL.md`

Required changes:

- replace active `demo` path references with `app`
- replace `cd demo` commands with `cd app`
- replace `demo/dist/` references with `app/dist/`
- keep historical wording only where a document is intentionally describing past work

- [ ] **Step 6: Run the browser app build after the rename**

Run:

```powershell
cd app
npm run build
cd ..
```

Expected: Vite build succeeds from `app/`.

- [ ] **Step 7: Run the full Playwright browser suite after the rename**

Run:

```powershell
npx playwright test
```

Expected: Existing browser tests pass with the renamed frontend directory.

- [ ] **Step 8: Commit the rename-only migration**

Run:

```powershell
git add app playwright.config.mjs .github/workflows/deploy-app.yml README.md .codex/skills/releasing-occt-js/SKILL.md
git commit -m "refactor: rename demo frontend to app"
```

## Chunk 2: Remove Browser Runtime Network Dependencies

### Task 2: Write a failing browser regression proving Babylon CDN is gone

**Files:**
- Create: `app/tests/no-cdn.spec.mjs`
- Test: `npx playwright test app/tests/no-cdn.spec.mjs`

- [ ] **Step 1: Add a Playwright regression test that fails while CDN scripts still exist**

Create `app/tests/no-cdn.spec.mjs`:

```js
import { test, expect } from "@playwright/test";

test("boots without Babylon CDN requests", async ({ page }) => {
  const requests = [];
  page.on("request", (request) => requests.push(request.url()));

  await page.goto("/");
  await expect(page.locator("[data-testid='drop-zone']")).toBeVisible();

  expect(requests.some((url) => url.includes("cdn.babylonjs.com"))).toBe(false);
});
```

- [ ] **Step 2: Run the new test to verify the current app fails**

Run:

```powershell
npx playwright test app/tests/no-cdn.spec.mjs
```

Expected: FAIL because `app/index.html` still pulls Babylon from `cdn.babylonjs.com`.

### Task 3: Replace Babylon CDN globals with a bundled compatibility runtime

**Files:**
- Modify: `app/package.json`
- Regenerate: `app/package-lock.json`
- Modify: `app/index.html`
- Create: `app/src/lib/babylon-runtime.js`
- Modify: `app/src/main.jsx`
- Test: `npx playwright test app/tests/no-cdn.spec.mjs`
- Test: `npx playwright test`

- [ ] **Step 1: Add Babylon npm dependencies to the frontend app**

Update `app/package.json` dependencies:

```json
{
  "dependencies": {
    "@babylonjs/core": "^8.0.0",
    "@babylonjs/materials": "^8.0.0"
  }
}
```

- [ ] **Step 2: Install the new frontend dependencies**

Run:

```powershell
cd app
npm install
cd ..
```

Expected: `app/package-lock.json` is updated.

- [ ] **Step 3: Remove Babylon CDN scripts from `app/index.html`**

Delete:

```html
<script src="https://cdn.babylonjs.com/babylon.js"></script>
<script src="https://cdn.babylonjs.com/materialsLibrary/babylonjs.materials.min.js"></script>
```

- [ ] **Step 4: Create a local Babylon compatibility layer**

Create `app/src/lib/babylon-runtime.js`:

```js
import {
  Animation,
  ArcRotateCamera,
  Camera,
  Color3,
  Color4,
  DirectionalLight,
  Engine,
  HemisphericLight,
  Matrix,
  Mesh,
  MeshBuilder,
  PointerEventTypes,
  Quaternion,
  Scene,
  StandardMaterial,
  Tools,
  TransformNode,
  Vector3,
  VertexData,
} from "@babylonjs/core";
import { GridMaterial } from "@babylonjs/materials/grid";

export const BABYLON = {
  Animation,
  ArcRotateCamera,
  Camera,
  Color3,
  Color4,
  DirectionalLight,
  Engine,
  GridMaterial,
  HemisphericLight,
  Matrix,
  Mesh,
  MeshBuilder,
  PointerEventTypes,
  Quaternion,
  Scene,
  StandardMaterial,
  Tools,
  TransformNode,
  Vector3,
  VertexData,
};

window.BABYLON = BABYLON;
```

- [ ] **Step 5: Load the compatibility layer before the React app starts**

Update `app/src/main.jsx`:

```js
import "./lib/babylon-runtime";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./globals.css";
```

- [ ] **Step 6: Run the no-CDN regression again**

Run:

```powershell
npx playwright test app/tests/no-cdn.spec.mjs
```

Expected: PASS with no requests to `cdn.babylonjs.com`.

- [ ] **Step 7: Run the full browser suite after the Babylon migration**

Run:

```powershell
npx playwright test
```

Expected: Existing browser interactions still work with bundled Babylon.

- [ ] **Step 8: Commit the Babylon bundling migration**

Run:

```powershell
git add app/package.json app/package-lock.json app/index.html app/src/main.jsx app/src/lib/babylon-runtime.js app/tests/no-cdn.spec.mjs
git commit -m "refactor: bundle Babylon runtime locally"
```

## Chunk 3: Add Explicit Runtime-Based OCCT Asset Resolution

### Task 4: Write failing Node tests for runtime and resource helpers

**Files:**
- Create: `app/tests/runtime-env.test.mjs`
- Create: `app/tests/tauri-resource.test.mjs`
- Test: `node --test app/tests/runtime-env.test.mjs app/tests/tauri-resource.test.mjs`

- [ ] **Step 1: Write a failing test for runtime environment helpers**

Create `app/tests/runtime-env.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { ensureTrailingSlash, getWebDistBase, isTauriWindow } from "../src/lib/runtime-env.js";

test("ensureTrailingSlash appends one slash", () => {
  assert.equal(ensureTrailingSlash("https://example.com/dist"), "https://example.com/dist/");
});

test("getWebDistBase uses repo dist in dev", () => {
  const base = getWebDistBase({
    isDev: true,
    importMetaUrl: "file:///repo/app/src/hooks/useOcct.js",
    cdnBase: "https://unpkg.com/@tx-code/occt-js@0.1.4/dist/",
  });
  assert.equal(base, "file:///repo/dist/");
});

test("getWebDistBase uses CDN in prod web mode", () => {
  const base = getWebDistBase({
    isDev: false,
    importMetaUrl: "file:///repo/app/src/hooks/useOcct.js",
    cdnBase: "https://unpkg.com/@tx-code/occt-js@0.1.4/dist/",
  });
  assert.equal(base, "https://unpkg.com/@tx-code/occt-js@0.1.4/dist/");
});

test("isTauriWindow detects tauri globals", () => {
  assert.equal(isTauriWindow({ __TAURI_INTERNALS__: {} }), true);
  assert.equal(isTauriWindow({}), false);
});
```

- [ ] **Step 2: Write a failing test for Tauri resource URL resolution**

Create `app/tests/tauri-resource.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { resolveOcctTauriBase } from "../src/lib/tauri-resource.js";

test("resolveOcctTauriBase converts the bundled JS path into a webview URL base", async () => {
  const base = await resolveOcctTauriBase({
    resourcePath: "../../dist/occt-js.js",
    resolveResourceImpl: async (resourcePath) => `C:/bundle/_up_/_up_/dist/occt-js.js::${resourcePath}`,
    convertFileSrcImpl: (filePath) => `asset://localhost/${filePath.replaceAll("\\\\", "/")}`,
  });

  assert.equal(
    base,
    "asset://localhost/C:/bundle/_up_/_up_/dist/"
  );
});
```

- [ ] **Step 3: Run the new helper tests to verify they fail**

Run:

```powershell
node --test app/tests/runtime-env.test.mjs app/tests/tauri-resource.test.mjs
```

Expected: FAIL because the helper modules do not exist yet.

### Task 5: Implement the runtime helpers and wire `useOcct.js`

**Files:**
- Create: `app/src/lib/runtime-env.js`
- Create: `app/src/lib/tauri-resource.js`
- Modify: `app/src/hooks/useOcct.js`
- Test: `node --test app/tests/runtime-env.test.mjs app/tests/tauri-resource.test.mjs`
- Test: `npx playwright test --grep "preloads occt engine|imports STEP file via file input|imports BREP file|imports IGES file"`
- Test: `cd app && npm run build`

- [ ] **Step 1: Implement pure runtime environment helpers**

Create `app/src/lib/runtime-env.js`:

```js
export function ensureTrailingSlash(value) {
  return value.endsWith("/") ? value : `${value}/`;
}

export function isTauriWindow(win = typeof window === "undefined" ? undefined : window) {
  return Boolean(win && (win.__TAURI_INTERNALS__ || win.__TAURI__));
}

export function getWebDistBase({ isDev, importMetaUrl, cdnBase }) {
  if (isDev) {
    return ensureTrailingSlash(new URL("../../../dist/", importMetaUrl).href);
  }
  return ensureTrailingSlash(cdnBase);
}
```

- [ ] **Step 2: Implement Tauri resource URL resolution**

Create `app/src/lib/tauri-resource.js`:

```js
import { convertFileSrc } from "@tauri-apps/api/core";
import { resolveResource } from "@tauri-apps/api/path";
import { ensureTrailingSlash } from "./runtime-env.js";

export async function resolveOcctTauriBase({
  resourcePath = "../../dist/occt-js.js",
  resolveResourceImpl = resolveResource,
  convertFileSrcImpl = convertFileSrc,
} = {}) {
  const scriptPath = await resolveResourceImpl(resourcePath);
  const scriptUrl = convertFileSrcImpl(scriptPath);
  return ensureTrailingSlash(scriptUrl.slice(0, scriptUrl.lastIndexOf("/") + 1));
}
```

- [ ] **Step 3: Refactor `app/src/hooks/useOcct.js` to use explicit runtime branches**

Replace the current one-function base selection with this shape:

```js
import { isTauriWindow, getWebDistBase } from "../lib/runtime-env";
import { resolveOcctTauriBase } from "../lib/tauri-resource";

const CDN = "https://unpkg.com/@tx-code/occt-js@0.1.4/dist/";

async function resolveDistBase() {
  if (isTauriWindow()) {
    return resolveOcctTauriBase();
  }
  return getWebDistBase({
    isDev: import.meta.env.DEV,
    importMetaUrl: import.meta.url,
    cdnBase: CDN,
  });
}
```

Additional requirements inside `useOcct.js`:

- store the resolved base in a promise/ref so module preload is still deduplicated
- preserve staged loading messages (`Loading engine...`, `Parsing model...`)
- preserve the current `window.OcctJS` script injection approach
- keep browser dev pointing at repository root `dist/`
- keep browser prod pointing at the CDN

- [ ] **Step 4: Run the new Node tests after the helper implementation**

Run:

```powershell
node --test app/tests/runtime-env.test.mjs app/tests/tauri-resource.test.mjs
```

Expected: PASS.

- [ ] **Step 5: Run targeted browser import regressions**

Run:

```powershell
npx playwright test --grep "preloads occt engine|imports STEP file via file input|imports BREP file|imports IGES file"
```

Expected: PASS.

- [ ] **Step 6: Rebuild the browser app**

Run:

```powershell
cd app
npm run build
cd ..
```

Expected: PASS. The current Vite warning about `new URL("../../../dist/", import.meta.url)` is acceptable if the build succeeds and browser tests remain green.

- [ ] **Step 7: Commit the runtime-resolution refactor**

Run:

```powershell
git add app/src/lib/runtime-env.js app/src/lib/tauri-resource.js app/src/hooks/useOcct.js app/tests/runtime-env.test.mjs app/tests/tauri-resource.test.mjs
git commit -m "refactor: isolate occt asset resolution by runtime"
```

## Chunk 4: Add The Tauri Desktop Shell

### Task 6: Write a failing config smoke test for the desktop shell

**Files:**
- Create: `test/tauri-config.test.mjs`
- Test: `node --test test/tauri-config.test.mjs`

- [ ] **Step 1: Add a config smoke test that fails before Tauri exists**

Create `test/tauri-config.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

test("app/src-tauri exists", () => {
  assert.equal(existsSync("app/src-tauri/tauri.conf.json"), true);
});

test("tauri config bundles occt-js runtime files", () => {
  const config = JSON.parse(readFileSync("app/src-tauri/tauri.conf.json", "utf8"));
  assert.equal(config.build.devUrl, "http://localhost:5173");
  assert.equal(config.build.frontendDist, "../dist");
  assert.deepEqual(
    config.bundle.resources,
    ["../../dist/occt-js.js", "../../dist/occt-js.wasm"]
  );
  assert.equal(config.app.security.assetProtocol.enable, true);
});
```

- [ ] **Step 2: Run the config smoke test to verify it fails**

Run:

```powershell
node --test test/tauri-config.test.mjs
```

Expected: FAIL because `app/src-tauri/` does not exist yet.

### Task 7: Scaffold Tauri v2 inside `app/` and wire it to the frontend app

**Files:**
- Modify: `app/package.json`
- Regenerate: `app/package-lock.json`
- Create via scaffold + modify: `app/src-tauri/Cargo.toml`
- Create via scaffold + modify: `app/src-tauri/build.rs`
- Create via scaffold + modify: `app/src-tauri/src/main.rs`
- Create via scaffold + modify: `app/src-tauri/tauri.conf.json`
- Create via scaffold + modify: `app/src-tauri/capabilities/default.json`
- Test: `node --test test/tauri-config.test.mjs`
- Test: `cd app && npm run tauri:dev`
- Test: `cd app && npm run tauri:build`

- [ ] **Step 1: Add Tauri npm dependencies and scripts**

Update `app/package.json`:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "tauri": "tauri",
    "tauri:dev": "tauri dev",
    "tauri:build": "tauri build"
  },
  "dependencies": {
    "@tauri-apps/api": "^2.0.0"
  },
  "devDependencies": {
    "@tauri-apps/cli": "^2.0.0"
  }
}
```

- [ ] **Step 2: Install the Tauri frontend packages**

Run:

```powershell
cd app
npm install
cd ..
```

Expected: `app/package-lock.json` is updated with the Tauri packages.

- [ ] **Step 3: Scaffold `app/src-tauri/` with the official Tauri CLI**

Run:

```powershell
cd app
npm run tauri init
cd ..
```

Answer the prompts with:

```text
What is your app name? occt-js Viewer
What should the window title be? occt-js Viewer
Where are your web assets located? ../dist
What is the url of your dev server? http://localhost:5173
What is your frontend dev command? npm run dev
What is your frontend build command? npm run build
```

Expected: `app/src-tauri/` is created with icons, Rust entry files, and `tauri.conf.json`.

- [ ] **Step 4: Edit `app/src-tauri/tauri.conf.json` for this repository layout**

Normalize the generated config so these values are present:

```json
{
  "build": {
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build",
    "devUrl": "http://localhost:5173",
    "frontendDist": "../dist"
  },
  "bundle": {
    "resources": [
      "../../dist/occt-js.js",
      "../../dist/occt-js.wasm"
    ]
  },
  "app": {
    "security": {
      "assetProtocol": {
        "enable": true,
        "scope": ["$RESOURCE/**/*"]
      }
    }
  }
}
```

- [ ] **Step 5: Keep Tauri capabilities minimal**

Ensure `app/src-tauri/capabilities/default.json` includes only the default core capability unless implementation proves more is required:

```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "main-capability",
  "description": "Capability for the main window",
  "windows": ["main"],
  "permissions": ["core:default"]
}
```

- [ ] **Step 6: Run the Tauri config smoke test after scaffolding**

Run:

```powershell
node --test test/tauri-config.test.mjs
```

Expected: PASS.

- [ ] **Step 7: Launch the desktop app in development mode**

Run:

```powershell
cd app
npm run tauri:dev
```

Manual verification in the desktop window:

- import `test/simple_part.step`
- import `test/cube_10x10.igs`
- import `test/as1_pe_203.brep`
- confirm the existing in-app file picker still works
- confirm the app still renders when the network is unavailable

- [ ] **Step 8: Build the desktop app**

Run:

```powershell
cd app
npm run tauri:build
cd ..
```

Expected: PASS with a generated Windows bundle under `app/src-tauri/target/`.

- [ ] **Step 9: Commit the desktop shell**

Run:

```powershell
git add app/package.json app/package-lock.json app/src-tauri test/tauri-config.test.mjs
git commit -m "feat: add tauri desktop shell for app"
```

## Chunk 5: Final Verification And Cleanup

### Task 8: Verify the full browser + desktop workflow and update any drifted docs

**Files:**
- Modify if needed: `README.md`
- Modify if needed: `docs/specs/2026-03-27-tauri-desktop-mvp-design.md`
- Test: `npm test`
- Test: `node --test test/tauri-config.test.mjs app/tests/runtime-env.test.mjs app/tests/tauri-resource.test.mjs`
- Test: `cd app && npm run build`
- Test: `npx playwright test`
- Test: `cd app && npm run tauri:build`

- [ ] **Step 1: Run root package tests**

Run:

```powershell
npm test
```

Expected: PASS. Frontend changes must not break root package tests.

- [ ] **Step 2: Run all Node-based regression tests**

Run:

```powershell
node --test test/tauri-config.test.mjs app/tests/runtime-env.test.mjs app/tests/tauri-resource.test.mjs
```

Expected: PASS.

- [ ] **Step 3: Re-run the browser app build**

Run:

```powershell
cd app
npm run build
cd ..
```

Expected: PASS.

- [ ] **Step 4: Re-run the full browser Playwright suite**

Run:

```powershell
npx playwright test
```

Expected: PASS.

- [ ] **Step 5: Re-run the desktop build**

Run:

```powershell
cd app
npm run tauri:build
cd ..
```

Expected: PASS.

- [ ] **Step 6: Update any active docs that drifted during implementation**

Only if implementation details changed from the approved design:

- update `README.md`
- update `docs/specs/2026-03-27-tauri-desktop-mvp-design.md`
- update `.codex/skills/releasing-occt-js/SKILL.md`

Do not mass-edit historical specs just to replace old `demo` wording.

- [ ] **Step 7: Commit the final verified MVP**

Run:

```powershell
git add README.md docs/specs/2026-03-27-tauri-desktop-mvp-design.md .codex/skills/releasing-occt-js/SKILL.md
git commit -m "feat: ship tauri desktop MVP"
```
