# Phase 18: Runtime Path Contract Alignment - Pattern Map

**Mapped:** 2026-04-17
**Files analyzed:** 3 scoped files
**Analogs found:** 3 / 3

Context points to one required edit target: `test/dist_contract_consumers.test.mjs`. `demo/tests/use-occt-runtime-contract.test.mjs` and `demo/src/hooks/useOcct.js` are conditional sync points only if deduplication or a minimal consistency fix is needed.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `test/dist_contract_consumers.test.mjs` | test | file-I/O | `test/release_governance_contract.test.mjs` | exact |
| `demo/tests/use-occt-runtime-contract.test.mjs` | test | file-I/O | `demo/tests/use-occt-runtime-contract.test.mjs` | exact |
| `demo/src/hooks/useOcct.js` | hook | request-response | `demo/src/hooks/useOcct.js` | exact |

## Pattern Assignments

### `test/dist_contract_consumers.test.mjs` (test, file-I/O)

**Scope:** Required. `18-CONTEXT.md` names this as the stale root consumer contract test that must be reconciled with the shipped concrete-file runtime lookup.

**Analog:** `test/release_governance_contract.test.mjs`

**Imports and repo-read helper pattern** (`test/release_governance_contract.test.mjs` lines 1-16):
```javascript
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");

function readRepoText(relativePath) {
  return readFileSync(resolve(repoRoot, relativePath), "utf8");
}

function readRepoJson(relativePath) {
  return JSON.parse(readRepoText(relativePath));
}
```

**Source-text contract assertion pattern** (`test/release_governance_contract.test.mjs` lines 71-76):
```javascript
test("demo fallback CDN derives its semver from the root package instead of a hardcoded version", () => {
  const demoHook = readRepoText("demo/src/hooks/useOcct.js");

  assert.match(demoHook, /import packageJson from "\.\.\/\.\.\/\.\.\/package\.json";/);
  assert.match(demoHook, /https:\/\/unpkg\.com\/@tx-code\/occt-js@\$\{packageJson\.version\}\/dist\//);
  assert.doesNotMatch(demoHook, /https:\/\/unpkg\.com\/@tx-code\/occt-js@0\.\d+\.\d+\/dist\//);
});
```

**Concrete runtime-path assertion to copy** (`demo/tests/use-occt-runtime-contract.test.mjs` lines 10-14):
```javascript
test("dev local dist lookup targets concrete repo-root runtime files instead of a directory base", () => {
  assert.match(useOcctSource, /new URL\(\s*"\.\.\/\.\.\/\.\.\/dist\/occt-js\.js",\s*import\.meta\.url\s*\)/);
  assert.match(useOcctSource, /new URL\(\s*"\.\.\/\.\.\/\.\.\/dist\/occt-js\.wasm",\s*import\.meta\.url\s*\)/);
  assert.doesNotMatch(useOcctSource, /new URL\(\s*\/\*\s*@vite-ignore\s*\*\/\s*"\.\.\/\.\.\/\.\.\/dist\/"/);
  assert.doesNotMatch(useOcctSource, /new URL\(\s*"\.\.\/\.\.\/\.\.\/dist\/",\s*import\.meta\.url\s*\)/);
});
```

**Strict negative `dist/` boundary coverage to preserve** (`test/load_occt_factory.test.mjs` lines 22-35):
```javascript
test("loadOcctFactory fails when dist/occt-js.wasm is missing", () => {
  const repoRoot = mkdtempSync(path.join(tmpdir(), "occt-js-dist-"));
  const distDir = path.join(repoRoot, "dist");
  const factoryPath = path.join(distDir, "occt-js.js");
  const wasmPath = path.join(distDir, "occt-js.wasm");

  mkdirSync(distDir, { recursive: true });
  writeFileSync(factoryPath, "module.exports = { loaded: true };");

  assert.throws(() => loadOcctFactory(factoryPath, wasmPath), (error) => {
    assert.match(error.message, /dist[\\/]occt-js\.wasm/);
    assert.match(error.message, /npm run build:wasm:win/);
    return true;
  });
});
```

Planner note: keep the root file's existing `readRepoText` / `readRepoJson` structure, but replace the stale directory-base assertion with the demo test's concrete `occt-js.js` and `occt-js.wasm` checks.

---

### `demo/tests/use-occt-runtime-contract.test.mjs` (test, file-I/O)

**Scope:** Conditional. Only touch this file if duplicate runtime-path assertions are consolidated or wording is synchronized with the root preflight test.

**Analog:** current file

**Imports and source-read pattern** (`demo/tests/use-occt-runtime-contract.test.mjs` lines 1-8):
```javascript
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const useOcctSource = readFileSync(resolve(__dirname, "..", "src", "hooks", "useOcct.js"), "utf8");
```

**Single-purpose assertion style** (`demo/tests/use-occt-runtime-contract.test.mjs` lines 10-14):
```javascript
test("dev local dist lookup targets concrete repo-root runtime files instead of a directory base", () => {
  assert.match(useOcctSource, /new URL\(\s*"\.\.\/\.\.\/\.\.\/dist\/occt-js\.js",\s*import\.meta\.url\s*\)/);
  assert.match(useOcctSource, /new URL\(\s*"\.\.\/\.\.\/\.\.\/dist\/occt-js\.wasm",\s*import\.meta\.url\s*\)/);
  assert.doesNotMatch(useOcctSource, /new URL\(\s*\/\*\s*@vite-ignore\s*\*\/\s*"\.\.\/\.\.\/\.\.\/dist\/"/);
  assert.doesNotMatch(useOcctSource, /new URL\(\s*"\.\.\/\.\.\/\.\.\/dist\/",\s*import\.meta\.url\s*\)/);
});
```

Planner note: if this file remains, keep it narrow and concrete. Do not broaden it into a general runtime-loader suite; Phase 18 wants a small explicit contract test.

---

### `demo/src/hooks/useOcct.js` (hook, request-response)

**Scope:** Conditional. `18-CONTEXT.md` treats this hook as the implementation anchor; only touch it if root-test alignment uncovers a real mismatch rather than a stale test.

**Analog:** current file

**Imports pattern** (`demo/src/hooks/useOcct.js` lines 1-7):
```javascript
import { useRef, useEffect, useCallback } from "react";
import { convertFileSrc, isTauri } from "@tauri-apps/api/core";
import { resolveResource } from "@tauri-apps/api/path";
import { inferOcctFormatFromFileName } from "@tx-code/occt-babylon-loader";
import { createOcctCore, resolveAutoOrientedModel } from "@tx-code/occt-core";
import packageJson from "../../../package.json";
import { useViewerStore } from "../store/viewerStore";
```

**Runtime split pattern** (`demo/src/hooks/useOcct.js` lines 16-29):
```javascript
function getWebRuntime() {
  if (import.meta.env.DEV) {
    const moduleUrl = new URL("../../../dist/occt-js.js", import.meta.url).href;
    const wasmUrl = new URL("../../../dist/occt-js.wasm", import.meta.url).href;
    return {
      moduleUrl,
      locateFile: () => wasmUrl,
    };
  }
  return {
    moduleUrl: CDN + "occt-js.js",
    locateFile: (fileName) => CDN + fileName,
  };
}
```

**Tauri vs web runtime resolution pattern** (`demo/src/hooks/useOcct.js` lines 44-63):
```javascript
runtimePromiseRef.current = (async () => {
  if (isTauri()) {
    const [jsPath, wasmPath] = await Promise.all([
      resolveResource("dist/occt-js.js"),
      resolveResource("dist/occt-js.wasm"),
    ]);
    return {
      moduleUrl: convertFileSrc(jsPath),
      locateFile: () => convertFileSrc(wasmPath),
    };
  }

  const webRuntime = getWebRuntime();
  return {
    moduleUrl: webRuntime.moduleUrl,
    locateFile: webRuntime.locateFile,
    fallbackModuleUrl: CDN + "occt-js.js",
    fallbackLocateFile: (fileName) => CDN + fileName,
  };
})()
```

**Async fallback and error-reset pattern** (`demo/src/hooks/useOcct.js` lines 93-109):
```javascript
try {
  await loadScript(runtime.moduleUrl);
} catch (error) {
  if (!runtime.fallbackModuleUrl) {
    throw error;
  }
  await loadScript(runtime.fallbackModuleUrl);
  runtime.locateFile = runtime.fallbackLocateFile;
}

const module = await window.OcctJS({ locateFile: runtime.locateFile });
moduleRef.current = module;
return module;
})().catch((error) => {
  modulePromiseRef.current = null;
  throw error;
});
```

**Testing references**:
- `demo/tests/use-occt-runtime-contract.test.mjs` lines 10-14 lock the concrete dev `dist/occt-js.js` and `dist/occt-js.wasm` URLs.
- `test/dist_contract_consumers.test.mjs` lines 26-33 are the root preflight mirror that should describe the same contract.

Planner note: preserve the current runtime split. Phase 18 is not a loader redesign; it is a contract-alignment phase.

## Shared Patterns

### Root source-text contract helpers

**Source:** `test/release_governance_contract.test.mjs` lines 1-16  
**Apply to:** Root contract tests that inspect repo files as text or JSON
```javascript
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");

function readRepoText(relativePath) {
  return readFileSync(resolve(repoRoot, relativePath), "utf8");
}

function readRepoJson(relativePath) {
  return JSON.parse(readRepoText(relativePath));
}
```

### Concrete runtime-path assertions

**Source:** `demo/tests/use-occt-runtime-contract.test.mjs` lines 10-14  
**Apply to:** `test/dist_contract_consumers.test.mjs` and any companion runtime-path contract tests
```javascript
assert.match(useOcctSource, /new URL\(\s*"\.\.\/\.\.\/\.\.\/dist\/occt-js\.js",\s*import\.meta\.url\s*\)/);
assert.match(useOcctSource, /new URL\(\s*"\.\.\/\.\.\/\.\.\/dist\/occt-js\.wasm",\s*import\.meta\.url\s*\)/);
assert.doesNotMatch(useOcctSource, /new URL\(\s*\/\*\s*@vite-ignore\s*\*\/\s*"\.\.\/\.\.\/\.\.\/dist\/"/);
assert.doesNotMatch(useOcctSource, /new URL\(\s*"\.\.\/\.\.\/\.\.\/dist\/",\s*import\.meta\.url\s*\)/);
```

### Strict `dist/` boundary guards

**Source:** `test/wasm_build_contract.test.mjs` lines 23-26  
**Apply to:** Root preflight tests; do not reintroduce `build/wasm` as a competing runtime origin
```javascript
assert.match(distScript, /dist\\occt-js\.js/);
assert.match(distScript, /dist\\occt-js\.wasm/);
assert.doesNotMatch(distScript, /build\\wasm\\occt-js\.(js|wasm)/);
```

**Source:** `tools/check_wasm_prereqs.mjs` lines 17-18, 33-36, 53-57  
**Apply to:** Preflight helpers and any adjacent negative-coverage assertions
```javascript
export function resolveTypeDefinitionsMarker(repoRoot = resolveRepoRoot()) {
  return path.join(repoRoot, "dist", "occt-js.d.ts");
}

export function createMissingTypeDefinitionsError(markerPath) {
  return new Error(
    `Missing ${markerPath}. Restore the tracked type definitions with "git restore --source=HEAD -- dist/occt-js.d.ts".`
  );
}

export function assertTypeDefinitionsPresent(repoRoot = resolveRepoRoot()) {
  const markerPath = resolveTypeDefinitionsMarker(repoRoot);
  if (!existsSync(markerPath)) {
    throw createMissingTypeDefinitionsError(markerPath);
  }
}
```

**Source:** `package.json` lines 24-29  
**Apply to:** Any plan step that verifies Phase 18 completion
```json
"scripts": {
  "build:wasm": "bash tools/build_wasm.sh",
  "build:wasm:win": "tools\\build_wasm_win_dist.bat",
  "test:release:root": "npm run build:wasm:win && node --test test/wasm_build_contract.test.mjs test/package_tarball_contract.test.mjs test/release_governance_contract.test.mjs test/exact_pairwise_measurement_contract.test.mjs test/exact_placement_contract.test.mjs test/exact_relation_contract.test.mjs && npm --prefix packages/occt-core test && npm test",
  "test:wasm:preflight": "node --test test/wasm_build_prereqs.test.mjs test/load_occt_factory.test.mjs test/dist_contract_consumers.test.mjs",
  "test": "npm run test:wasm:preflight && node --test test/exact_model_lifecycle_contract.test.mjs test/exact_ref_mapping_contract.test.mjs test/exact_primitive_queries_contract.test.mjs test/exact_pairwise_measurement_contract.test.mjs test/exact_placement_contract.test.mjs test/exact_relation_contract.test.mjs test/import_appearance_contract.test.mjs && node test/test_multi_format_exports.mjs && node test/test_iges_degenerated_edges.mjs && node test/test_step_iges_root_mode.mjs && node test/test_brep_root_mode.mjs && node test/test_optimal_orientation_api.mjs && node test/test_optimal_orientation_reference.mjs && node test/test_mvp_acceptance.mjs"
}
```

## No Analog Found

None. All scoped Phase 18 files already exist in the repository and have direct in-repo analogs or self-patterns.

## Metadata

**Analog search scope:** `test/`, `demo/tests/`, `demo/src/hooks/`, `demo/src/lib/`, `tools/`, repo root manifests/docs, `.planning/`  
**Files scanned:** 19  
**Project context:** `CLAUDE.md` shim present; repo-root `.claude/skills/` and `.agents/skills/` directories were not present  
**Pattern extraction date:** 2026-04-17
