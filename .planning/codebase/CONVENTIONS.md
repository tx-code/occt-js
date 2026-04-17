# Coding Conventions

**Analysis Date:** 2026-04-17

## Naming Patterns

**Files:**
- Use `PascalCase.jsx` for React view components under `demo/src/components/`, such as `demo/src/components/Toolbar.jsx`, `demo/src/components/ViewCube.jsx`, and `demo/src/components/DesktopChrome.jsx`.
- Use `useX.js` for React hooks under `demo/src/hooks/`, such as `demo/src/hooks/useOcct.js`, `demo/src/hooks/useViewer.js`, `demo/src/hooks/usePicking.js`, and `demo/src/hooks/useViewerActions.js`.
- Use lowercase kebab-case for reusable JS modules under `demo/src/lib/` and `packages/*/src/`, for example `demo/src/lib/desktop-runtime.js`, `packages/occt-babylon-viewer/src/viewer-line-pass-batch.js`, and `packages/occt-babylon-loader/src/occt-scene-builder.js`.
- Use lowercase kebab-case for native bridge/importer files under `src/`, for example `src/importer-step.cpp`, `src/importer-brep.cpp`, `src/exact-query.cpp`, and `src/js-interface.cpp`.
- Reserve `index.js` as the public barrel filename in packages such as `packages/occt-core/src/index.js`, `packages/occt-babylon-loader/src/index.js`, `packages/occt-babylon-viewer/src/index.js`, and `packages/occt-babylon-widgets/src/index.js`.

**Functions:**
- Use lowerCamelCase for JS functions and hooks, for example `ensureRuntime` in `demo/src/hooks/useOcct.js`, `normalizeOcctFormat` in `packages/occt-core/src/formats.js`, and `buildOcctScene` in `packages/occt-babylon-loader/src/occt-scene-builder.js`.
- Use PascalCase for React component functions, for example `App` in `demo/src/App.jsx`, `SelectionPanel` in `demo/src/components/SelectionPanel.jsx`, and `DesktopChrome` in `demo/src/components/DesktopChrome.jsx`.
- Use PascalCase for exported/native C++ helpers and bridge entrypoints, for example `ImportExactBrepFromMemory` in `src/importer-brep.cpp`, `ColorToVal` in `src/js-interface.cpp`, and `TryParseDefaultColor` in `src/js-interface.cpp`.

**Variables:**
- Use lowerCamelCase for locals and state names, for example `modulePromiseRef` in `demo/src/hooks/useOcct.js`, `shapeHashToMeshIndex` in `src/importer-brep.cpp`, and `currentSceneResources` in `packages/occt-babylon-viewer/src/occt-babylon-viewer.js`.
- Name React refs with a `Ref` suffix and booleans with `is`, `has`, `can`, or `should`, for example `sampleBootstrappedRef` in `demo/src/App.jsx`, `isFiniteBounds` in `packages/occt-babylon-viewer/src/occt-babylon-viewer.js`, and `shouldUseWindowsCustomChrome` in `demo/src/lib/desktop-runtime.js`.
- Use all-caps constants for stable literals, for example `CDN` and `DEFAULT_IMPORT_PARAMS` in `demo/src/hooks/useOcct.js`, `IDENTITY_MATRIX` in `packages/occt-core/src/occt-core.js`, and `VIEWER_ROOT_NAME` in `packages/occt-babylon-viewer/src/viewer-defaults.js`.

**Types:**
- Prefix native bridge DTOs with `Occt`, for example `OcctSceneData`, `OcctExactPlacementResult`, `OcctExactRelationResult`, and `OcctColor` in `src/importer.hpp`.
- Keep JS “type-like” identifiers as descriptive nouns even without TypeScript, for example `OcctCoreClient` in `packages/occt-core/src/occt-core.js` and `OcctFileLoader` in `packages/occt-babylon-loader/src/occt-file-loader.js`.
- Use nested enums and option structs on the C++ side instead of loose global constants, for example `ImportParams::RootMode`, `ImportParams::AppearanceMode`, and `ImportParams::LinearUnit` in `src/importer.hpp`.

## Code Style

**Formatting:**
- No repo-level formatter config is detected. `eslint.config.*`, `.eslintrc*`, `.prettierrc*`, `biome.json`, `jest.config.*`, and `vitest.config.*` are absent at `E:\Coding\occt-js`.
- Follow the house style already present in `demo/src/App.jsx`, `packages/occt-core/src/occt-core.js`, and `packages/occt-babylon-viewer/src/occt-babylon-viewer.js`: double quotes, semicolons, trailing commas in multiline literals/calls, and 2-space indentation in JS/JSX.
- Follow the native style in `src/importer.hpp`, `src/importer-brep.cpp`, and `src/js-interface.cpp`: 4-space indentation, braces on the next line for free functions/control blocks, and compact POD-style struct declarations.
- Keep JSX props inline for short elements and split long elements one prop per line, as shown in `demo/src/App.jsx` and `demo/src/components/DesktopChrome.jsx`.

**Linting:**
- No automated lint rule set is detected. Match the neighboring file instead of introducing a new style dialect.
- Preserve strict ES module syntax in `demo/src/`, `packages/*/src/`, and `test/*.mjs`. CommonJS is only used indirectly through `createRequire` in helpers such as `test/load_occt_factory.mjs`.
- Prefer frozen config objects for static lookup tables, as shown by `LINE_PASS_LAYER_STYLES` in `demo/src/hooks/useViewer.js`, `CAD_DEFAULT_PART_COLOR` in `packages/occt-babylon-viewer/src/viewer-materials.js`, and `FACE_NAME_TO_INDEX` in `packages/occt-babylon-widgets/src/viewcube-geometry.js`.

## Import Organization

**Order:**
1. Import platform/runtime and third-party modules first, such as `react`, `zustand`, `@babylonjs/*`, `@tauri-apps/*`, or Node built-ins in `demo/src/main.jsx`, `demo/src/hooks/useOcct.js`, and `test/load_occt_factory.test.mjs`.
2. Import workspace packages next when crossing repo surfaces, for example `@tx-code/occt-core`, `@tx-code/occt-babylon-loader`, and `@tx-code/occt-babylon-viewer` in `demo/src/hooks/useOcct.js` and `demo/src/hooks/useViewer.js`.
3. Import local relative modules after external and workspace imports, for example `./store/viewerStore`, `../lib/desktop-runtime.js`, and `./viewer-defaults.js` in `demo/src/App.jsx`, `demo/src/hooks/useViewer.js`, and `packages/occt-babylon-viewer/src/occt-babylon-viewer.js`.
4. Keep side-effect imports last, as shown by `./lib/babylon-runtime` and `./globals.css` in `demo/src/main.jsx`.

**Path Aliases:**
- General source code does not use app-level path aliases. It relies on relative imports or published package names across `demo/src/**/*`, `packages/*/src/**/*`, and `test/**/*`.
- `demo/vite.config.js` defines a bundler-only alias for `@tx-code/occt-babylon-viewer` to point the demo at `packages/occt-babylon-viewer/src/index.js`. Treat that as build plumbing, not as a general replacement for local relative imports.

```js
import { createOcctCore } from "@tx-code/occt-core";
import { useViewerStore } from "../store/viewerStore";
import { getAppShellLayout } from "../lib/app-shell";
```

Pattern taken from `demo/src/hooks/useOcct.js` and `demo/src/App.jsx`.

## Error Handling

**Patterns:**
- Validate inputs early and throw explicit `Error`, `TypeError`, or `RangeError` from shared JS packages, for example `packages/occt-core/src/occt-core.js`, `packages/occt-babylon-loader/src/occt-model-loader.js`, and `packages/occt-babylon-viewer/src/viewer-line-pass-batch.js`.
- Use `try`/`finally` around UI state changes that must unwind, as in `demo/src/hooks/useOcct.js`, which always clears loading with `setLoading(false)` even when import or orientation work fails.
- Treat optional downstream behavior as a soft failure when the base import should still succeed. `demo/src/hooks/useOcct.js` logs a warning and continues if auto-orient analysis fails.
- On the C++ boundary, return structured result objects instead of throwing into JS. `src/importer-brep.cpp`, `src/importer-xde.cpp`, `src/orientation.cpp`, and `src/exact-query.cpp` populate `success/error` or `ok/code/message` fields after catching `Standard_Failure`, `std::exception`, and catch-all failures.

## Logging

**Framework:** `console` in JS/JSX; no dedicated logging library is detected in `package.json`, `demo/package.json`, or `packages/*/package.json`.

**Patterns:**
- Runtime code is intentionally quiet. The only non-test diagnostic I found in active demo code is `console.warn("Auto orient failed...", ...)` in `demo/src/hooks/useOcct.js`.
- Script-style verification files under `test/test_*.mjs` use `console.log` and `console.error` for human-readable CLI output, for example `test/test_mvp_acceptance.mjs` and `test/test_read.mjs`.
- New shared/runtime code should prefer returned errors or thrown exceptions over additional logging unless the failure is intentionally non-fatal.

## Comments

**When to Comment:**
- Comment non-obvious CAD, geometry, or rendering behavior, for example topology extraction notes in `src/importer-utils.cpp`, depth-buffer behavior in `packages/occt-babylon-viewer/src/occt-babylon-viewer.js`, and Babylon picking/highlight sections in `demo/src/hooks/usePicking.js`.
- Use section-divider comments to manage very large files, as shown in `demo/src/hooks/usePicking.js`, `demo/src/hooks/useViewer.js`, and `src/importer-utils.cpp`.
- Keep terse file banner comments when a file’s role is easy to lose during navigation, for example `demo/src/App.jsx`, `demo/src/components/LoadingOverlay.jsx`, and `demo/src/hooks/useViewer.js`.

**JSDoc/TSDoc:**
- JSDoc is rare. The clearest JS example is the class header in `packages/occt-babylon-loader/src/occt-file-loader.js`.
- Doxygen-style `///` comments are used in native header surfaces like `src/importer-step.hpp`, `src/importer-iges.hpp`, `src/importer-brep.hpp`, and `src/importer-xde.hpp`.
- Do not add verbose doc blocks to every helper. Match the repo’s bias toward targeted comments only when API intent or CAD-domain behavior is not obvious.

## Function Design

**Size:** Most reusable helpers stay small and pure, but orchestration hooks and contract suites are allowed to be large when they own a complete workflow. Examples: `demo/src/hooks/useViewer.js`, `demo/src/hooks/usePicking.js`, `test/import_appearance_contract.test.mjs`, and `test/exact_placement_contract.test.mjs`.

**Parameters:**
- Prefer options objects with defaults for extensible APIs, for example `createOcctCore(options = {})` in `packages/occt-core/src/occt-core.js`, `createOcctBabylonViewer(scene, options = {})` in `packages/occt-babylon-viewer/src/occt-babylon-viewer.js`, and `loadWithOcctCore(core, data, options = {})` in `packages/occt-babylon-loader/src/occt-model-loader.js`.
- Prefer dependency injection over hidden globals when testing or crossing runtimes, for example `detectDesktopPlatform({ isTauri, userAgent })` in `demo/src/lib/desktop-runtime.js` and the injected `factory` and `core` surfaces in `packages/occt-core/src/occt-core.js` and `packages/occt-babylon-loader/src/occt-file-loader.js`.
- Freeze reusable default parameter objects when they should not mutate, for example `DEFAULT_IMPORT_PARAMS` in `demo/src/hooks/useOcct.js`.

**Return Values:**
- Return normalized DTOs and stable plain objects from package APIs, for example `normalizeOcctResult` in `packages/occt-core/src/model-normalizer.js` and `createOcctBabylonViewer` in `packages/occt-babylon-viewer/src/occt-babylon-viewer.js`.
- Zustand actions in `demo/src/store/viewerStore.js` return partial state objects through `set(...)` rather than mutating nested objects directly.
- Native APIs return explicit structs with flags and payload fields in `src/importer.hpp`. Keep that style instead of mixing exceptions and partial return values across the JS/native boundary.

## Module Design

**Exports:**
- Use named exports for reusable library surfaces, for example `packages/occt-core/src/index.js`, `packages/occt-babylon-loader/src/index.js`, and `packages/occt-babylon-viewer/src/index.js`.
- Use default exports for React view components, for example `demo/src/App.jsx`, `demo/src/components/Toolbar.jsx`, and `demo/src/components/ViewCube.jsx`.
- Export hooks as named `useX` functions, for example `demo/src/hooks/useOcct.js`, `demo/src/hooks/useViewer.js`, and `demo/src/hooks/useViewerActions.js`.

**Barrel Files:**
- Package barrels are standard. Add cross-file public exports in `packages/occt-core/src/index.js`, `packages/occt-babylon-loader/src/index.js`, `packages/occt-babylon-viewer/src/index.js`, and `packages/occt-babylon-widgets/src/index.js`.
- Demo code imports concrete files directly. Do not introduce a demo-wide barrel layer unless you also preserve the current relative-import ergonomics in `demo/src/App.jsx` and `demo/src/hooks/*`.

---

*Convention analysis: 2026-04-17*
