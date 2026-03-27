# Tauri Desktop MVP Design

**Date**: 2026-03-27
**Status**: Approved

## Goal

Add a Windows desktop MVP for the existing `demo` viewer using Tauri, while preserving the current web demo as the primary browser-facing workflow.

The desktop MVP must be able to launch the existing viewer UI in a native window and import local STEP, IGES, and BREP files using the current in-app file picker. The desktop app must work offline.

## Non-Negotiable Constraints

- The desktop MVP must not break the current web demo.
- Existing web development and build commands must keep working.
- Existing npm package publishing from the repository root must not depend on Tauri.
- The desktop MVP is additive. It must not replace the browser demo workflow.
- The desktop MVP must not require internet access at runtime.

## In Scope

- Add a Tauri app shell around the existing `demo` React + Vite frontend.
- Support `tauri dev` and `tauri build` from inside `demo/`.
- Keep the existing in-app file picker for model import.
- Bundle Babylon.js locally instead of loading it from a CDN.
- Bundle `occt-js.js` and `occt-js.wasm` into the desktop app so the viewer works offline.

## Out of Scope

- Native file-open dialog integration
- File associations
- Native application menu
- Auto-update
- Code signing
- Installer customization
- Multi-window support
- Replacing the existing web demo deployment path

## Recommended Approach

Use `demo/` as the only frontend project and add Tauri inside `demo/src-tauri/`.

This is the least disruptive approach because:

- the existing UI, state, hooks, and tests stay in one place
- the root npm package layout remains focused on `@tx-code/occt-js`
- desktop-specific configuration can be isolated to `demo/src-tauri/`
- web and desktop can share the same React app while keeping separate runtime wiring

## Project Structure

```text
demo/
  package.json
  index.html
  vite.config.js
  src/
    App.jsx
    hooks/
      useOcct.js
      usePicking.js
      useViewer.js
    lib/
      babylon-runtime.js      -- local Babylon compatibility layer
      runtime-env.js          -- runtime detection helpers
      tauri-resource.js       -- Tauri resource URL resolution
  src-tauri/
    Cargo.toml
    build.rs
    src/
      main.rs
    tauri.conf.json
    capabilities/
      default.json
```

## Runtime Split

### Web

The browser demo remains the baseline workflow.

- `npm run dev` in `demo/` must continue to start the Vite web app.
- `npm run build` in `demo/` must continue to produce a web build.
- Existing Playwright web tests remain targeted at the browser demo.

### Desktop

The desktop app is an additional entry path that wraps the same React app.

- `npm run tauri:dev` starts the Vite dev server and launches the Tauri window.
- `npm run tauri:build` packages the existing frontend into a Tauri desktop app.

## Babylon.js Strategy

Current web demo behavior depends on Babylon globals injected by CDN scripts in `demo/index.html`.

That is not acceptable for an offline desktop app, so Babylon must move to local npm dependencies.

Implementation strategy:

- add `@babylonjs/core` and `@babylonjs/materials` to `demo/package.json`
- remove Babylon CDN `<script>` tags from `demo/index.html`
- create `demo/src/lib/babylon-runtime.js` that imports Babylon modules and exposes a compatibility object
- assign the compatibility object to `window.BABYLON`

This keeps existing viewer logic stable while replacing the network dependency with a bundled runtime.

## OCCT Wasm Strategy

The existing `useOcct.js` already distinguishes between local `dist/` usage in dev and CDN usage in production web mode.

Desktop introduces a third runtime:

- Web dev: continue loading from repository-local `dist/`
- Web prod: continue loading from the current CDN path so the published web demo behavior is unchanged
- Tauri dev/build: load `occt-js.js` and `occt-js.wasm` from Tauri bundled resources

Desktop resource resolution should use Tauri APIs:

- `isTauri()` to detect the runtime
- `resolveResource()` to resolve bundled resource paths
- `convertFileSrc()` to turn resolved file paths into URLs loadable by the webview

## Tauri Resource Packaging

The desktop app must bundle the root repository `dist/` artifacts:

- `../dist/occt-js.js`
- `../dist/occt-js.wasm`

Because `src-tauri/` lives under `demo/`, the resource declaration must point back to the repository root `dist/` directory.

Tauri configuration must:

- set `build.devUrl` to the fixed Vite dev URL
- set `build.frontendDist` to `../dist`
- include the OCCT runtime files under `bundle.resources`
- enable `app.security.assetProtocol`

The desktop frontend will then resolve and load those files through Tauri resource APIs without affecting the web path.

## Security and Permissions

Desktop MVP should stay minimal.

Only enable the permissions needed for the main window and bundled resource reads. Do not introduce broader file system access or plugin capabilities that are not required by the current MVP.

## Commands

`demo/package.json` should keep current web commands and add desktop-only commands.

Required web commands:

- `dev`
- `build`
- `preview`

Required desktop commands:

- `tauri:dev`
- `tauri:build`

These desktop commands must live only in `demo/package.json`, not the repository root package.

## Verification Gates

The MVP is only complete when all of these are true:

1. `cd demo && npm run dev` still works for the web app
2. `cd demo && npm run build` still succeeds
3. Existing web tests still pass or remain intentionally unchanged
4. `cd demo && npm run tauri:dev` launches the desktop window
5. The desktop window can import a local STEP, IGES, or BREP file with the current file picker
6. The desktop app works offline because Babylon and OCCT runtime files are bundled locally

## Risks

### Babylon migration risk

The current code assumes `window.BABYLON` exists. Replacing the CDN path with npm imports must preserve the expected global shape closely enough that existing hooks continue to work.

### Resource path risk

`occt-js.js` dynamically locates `occt-js.wasm`. Desktop loading must keep both files in a location that Tauri can expose consistently to the webview.

### Web regression risk

Changing runtime loading paths can easily break current browser development or production behavior. The implementation must preserve the existing web branches explicitly instead of trying to unify everything into one implicit path.

## Acceptance Summary

The desktop MVP is accepted when the repository still has a working browser demo and also has a separate Tauri desktop entry path under `demo/`, with offline Babylon and OCCT runtime loading, and without introducing desktop-only requirements into the root package publishing flow.
