# Phase 20: Conditional Secondary-Surface Verification - Pattern Map

**Mapped:** 2026-04-17
**Files analyzed:** 10 scoped files
**Analogs found:** 10 / 10

Phase 20 sits at the repo boundary between the authoritative root Wasm release gate and the optional demo/Babylon surfaces. The safest implementation pattern is: expose runnable commands from the surface-local manifests, keep the root docs on a touched-path routing matrix, and lock the policy with a separate opt-in contract test rather than extending `npm run test:release:root`.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `demo/package.json` | manifest | command-surface | `packages/occt-babylon-viewer/package.json` | partial |
| `demo/src/lib/auto-orient.js` | source helper | demo node-test target | `demo/src/hooks/useOcct.js` | partial |
| `demo/tests/auto-orient.test.mjs` | test | demo node lane | current file | exact |
| `playwright.config.mjs` | config | demo browser E2E harness | current file | exact |
| `packages/occt-babylon-loader/package.json` | manifest | package dependency ownership | `packages/occt-babylon-viewer/package.json` | partial |
| `packages/occt-babylon-loader/README.md` | docs | package-local verification note | `packages/occt-core/README.md` | partial |
| `packages/occt-babylon-viewer/README.md` | docs | package-local verification note | `packages/occt-core/README.md` | partial |
| `packages/occt-babylon-widgets/README.md` | docs | package-local verification note | `packages/occt-core/README.md` | partial |
| `README.md` / `AGENTS.md` | docs | conditional verification routing | current files | exact |
| `package.json` / `test/secondary_surface_contract.test.mjs` | manifest + test | opt-in contract audit | `package.json` + `test/release_governance_contract.test.mjs` | partial |

## Pattern Assignments

### `demo/package.json` (manifest, command-surface)

**Scope:** Required. This is the missing manifest-first demo verification entrypoint for `SURF-01`.

**Analog:** package-local `test` scripts in `packages/occt-babylon-*`

**Existing package test script pattern** (`packages/occt-babylon-viewer/package.json`):
```json
"scripts": {
  "test": "node --test test/*.test.mjs"
}
```

**Current demo gap** (`demo/package.json`):
```json
"scripts": {
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview",
  "tauri:dev": "tauri dev",
  "tauri:build": "tauri build"
}
```

Planner note: add explicit non-Tauri demo commands directly in `demo/package.json` rather than documenting raw one-off invocations only in prose. Keep browser-style and E2E lanes distinct from `tauri:*`.

---

### `demo/tests/auto-orient.test.mjs` and `demo/src/lib/auto-orient.js` (test + helper)

**Scope:** Required for a runnable demo node-test lane. The current direct `node --test demo/tests/*.test.mjs` pass fails before any manifest exists because this test imports a missing helper.

**Analog:** current file plus the auto-orient logic already living in `demo/src/hooks/useOcct.js`

**Current drift evidence** (`demo/tests/auto-orient.test.mjs`):
```javascript
import { applyOrientationToResult, getOcctFormatFromFileName, resolveAutoOrientedResult } from "../src/lib/auto-orient.js";
```

**Current implementation home to mine instead of inventing new behavior** (`demo/src/hooks/useOcct.js`):
```javascript
let autoOrientResult = null;
...
autoOrientResult = orientedResult;
```

Planner note: either restore a real `demo/src/lib/auto-orient.js` helper around the existing logic or intentionally narrow the node-test lane to the maintained subset. Do not leave `npm --prefix demo test` pointing at a known broken import.

---

### `playwright.config.mjs` (config, demo browser E2E harness)

**Scope:** Required reference. The browser E2E lane already exists and should be reused instead of cloned into `demo/`.

**Analog:** current file

**Current harness pattern** (`playwright.config.mjs`):
```javascript
export default defineConfig({
  testDir: "demo/tests",
  webServer: {
    command: "cd demo && npx vite --port 5173",
    port: 5173,
  },
});
```

Planner note: demo manifest scripts should delegate to this root Playwright config so the repo keeps one browser-E2E definition.

---

### `packages/occt-babylon-loader/package.json` (manifest, dependency ownership)

**Scope:** Required. This is the main `SURF-02` failure point.

**Analog:** `packages/occt-babylon-viewer/package.json`

**Current loader manifest drift** (`packages/occt-babylon-loader/package.json`):
```json
"peerDependencies": {
  "@tx-code/occt-core": "^0.1.7",
  "@tx-code/occt-babylon-viewer": "^0.1.7",
  "@babylonjs/core": "^8.0.0"
}
```

**Direct import evidence** (`packages/occt-babylon-loader/src/occt-scene-builder.js`):
```javascript
import { TransformNode } from "@babylonjs/core/Meshes/transformNode.js";
...
import {
  createCadPartMaterial,
  resolveShadingNormals,
} from "@tx-code/occt-babylon-viewer";
```

**Dependency-owned analog** (`packages/occt-babylon-viewer/package.json`):
```json
"dependencies": {
  "@babylonjs/core": "^9.0.0",
  "@babylonjs/materials": "^9.0.0"
}
```

Planner note: move direct runtime/test imports into loader-owned dependencies. Keep `@tx-code/occt-core` caller-supplied unless loader source starts importing it directly.

---

### `packages/occt-babylon-*/README.md` (docs, package-local verification note)

**Scope:** Required for package-local discoverability once commands are stable.

**Analog:** concise maintainer note style in `packages/occt-core/README.md`

**Concise note pattern** (`packages/occt-core/README.md`):
```markdown
- Root release verification is driven by `npm run test:release:root` from the repository root; demo, Babylon, and Tauri checks remain conditional secondary-surface verification.
```

Planner note: add short package-local verification notes, not large release sections. The important thing is the local `npm --prefix packages/<pkg> test` entrypoint and its conditional role.

---

### `README.md` and `AGENTS.md` (docs, touched-path routing)

**Scope:** Required. These files already define the root-vs-secondary boundary and should be extended with explicit follow-up commands, not rewritten.

**Analog:** current files

**Existing conditional-policy wording** (`README.md`):
```markdown
Demo, Babylon, and Tauri surfaces are conditional secondary-surface verification only. Run their checks when your release changes `demo/`, `demo/tests/`, `demo/src-tauri/`, or the Babylon package surfaces.
```

**Existing repo-policy wording** (`AGENTS.md`):
```markdown
- keep conditional secondary-surface verification limited to changes under `demo/`, `demo/src-tauri/`, or Babylon package surfaces
```

Planner note: add a compact touched-path-to-command matrix. Keep `npm run test:release:root` authoritative and avoid burying commands in prose paragraphs.

---

### `package.json` and `test/secondary_surface_contract.test.mjs` (manifest + opt-in audit)

**Scope:** Strongly recommended. Phase 20 needs a contract lock, but it should stay outside the authoritative root release gate.

**Analog:** `package.json` plus `test/release_governance_contract.test.mjs`

**Root optional-audit script pattern** (`package.json`):
```json
"test:planning:audit": "node --test test/planning_archive_contract.test.mjs"
```

**Repo-text contract test pattern** (`test/release_governance_contract.test.mjs`):
```javascript
function readRepoText(relativePath) {
  return readFileSync(resolve(repoRoot, relativePath), "utf8");
}

function readRepoJson(relativePath) {
  return JSON.parse(readRepoText(relativePath));
}
```

Planner note: create a separate `test:secondary:contracts` lane that checks demo/Babylon manifest discoverability, loader dependency ownership, and continued exclusion from `test:release:root`.

## Shared Patterns

### Manifest-first secondary-surface commands

**Source:** `packages/occt-babylon-viewer/package.json`, `packages/occt-babylon-widgets/package.json`

Expose surface-local test commands from the package manifest that owns the surface. Use top-level docs only to route maintainers to those commands.

### One browser-E2E harness

**Source:** `playwright.config.mjs`

Do not create a second Playwright config under `demo/`. Delegate from the demo manifest to the repo-root harness so browser-E2E stays centralized.

### Separate opt-in policy audit

**Source:** `package.json`, `test/planning_archive_contract.test.mjs`

If Phase 20 adds a contract test for secondary surfaces, wire it to a dedicated root `test:*` script and keep it out of both `npm test` and `npm run test:release:root`.

## No Analog Found

None. Every planned Phase 20 artifact has either an existing in-repo analog or a direct current file to refine.

## Metadata

**Analog search scope:** `demo/`, `packages/`, root manifests/docs/tests, `.planning/`  
**Files scanned:** 14  
**Pattern extraction date:** 2026-04-17
