# External Integrations

**Analysis Date:** 2026-04-17

## APIs & External Services

**Source and build toolchain:**
- OpenCASCADE Technology source - the CAD kernel is pulled as the `occt/` git submodule declared in `.gitmodules` and compiled by `CMakeLists.txt`.
  - SDK/Client: git submodule checkout under `occt/`
  - Auth: none detected
- Emscripten SDK - the Windows toolchain bootstrap clones and installs Emscripten into `build/wasm/emsdk` from `tools/setup_emscripten_win.bat`.
  - SDK/Client: local `emsdk` install managed by `tools/setup_emscripten_win.bat`
  - Auth: none detected

**Runtime asset delivery:**
- UNPKG CDN - the production web demo loads `@tx-code/occt-js` runtime assets from `https://unpkg.com/@tx-code/occt-js@<version>/dist/` in `demo/src/hooks/useOcct.js`.
  - SDK/Client: browser script injection plus `window.OcctJS` from `demo/src/hooks/useOcct.js`
  - Auth: none detected
- Raw GitHub content - the sample-model fallback fetches `https://raw.githubusercontent.com/tx-code/occt-js/master/demo/public/samples/analysis-io1-cm-214.stp` from `demo/src/lib/sample-model.js`.
  - SDK/Client: browser `fetch()` in `demo/src/hooks/useViewerActions.js`
  - Auth: none detected

**Desktop platform integration:**
- Tauri dialog, filesystem, path, and asset APIs - the desktop app opens local CAD files and resolves bundled root Wasm resources in `demo/src/lib/desktop-file.js`, `demo/src/hooks/useOcct.js`, and `demo/src-tauri/src/lib.rs`.
  - SDK/Client: `@tauri-apps/api`, `@tauri-apps/plugin-dialog`, `@tauri-apps/plugin-fs`, `tauri`, `tauri-plugin-dialog`, `tauri-plugin-fs`
  - Auth: none detected

## Data Storage

**Databases:**
- None detected in `src/`, `packages/*/src`, `demo/src`, `demo/src-tauri`, `tools`, or `.github/workflows`.
  - Connection: not applicable
  - Client: not applicable

**File Storage:**
- Local filesystem read access only for the desktop viewer. `demo/src/lib/desktop-file.js` uses `@tauri-apps/plugin-fs` to read selected files, and `demo/src-tauri/capabilities/default.json` grants `fs:allow-read-file`.
- Bundled static assets are served from `demo/public/` for the web demo and from Tauri resources defined in `demo/src-tauri/tauri.conf.json`.
- Canonical Wasm package artifacts live in `dist/occt-js.js`, `dist/occt-js.wasm`, and `dist/occt-js.d.ts`, with packaging declared in `package.json` and Tauri bundling declared in `demo/src-tauri/tauri.conf.json`.

**Caching:**
- No explicit application cache layer is implemented in `demo/src`, `packages/*/src`, or `src/`.
- Browser HTTP caching is delegated to whichever host serves `demo/dist`, the UNPKG CDN path used by `demo/src/hooks/useOcct.js`, and the raw GitHub sample URL used by `demo/src/lib/sample-model.js`.

## Authentication & Identity

**Auth Provider:**
- None detected. The repo has no login flow, session handling, OAuth client, or identity provider integration in `demo/src`, `demo/src-tauri`, `packages/*/src`, or `src/`.
  - Implementation: not applicable

## Monitoring & Observability

**Error Tracking:**
- None detected. No Sentry, Datadog, Honeycomb, Rollbar, or equivalent service appears in `package.json`, `demo/package.json`, `demo/src-tauri/Cargo.toml`, or source imports.

**Logs:**
- Browser/runtime warnings are emitted with `console.warn` in `demo/src/hooks/useOcct.js`.
- Desktop debug logging is enabled only in debug builds through `tauri-plugin-log` in `demo/src-tauri/src/lib.rs`.
- Windows Wasm builds write logs to `build/wasm-build.log` from `tools/build_wasm_win.bat` and surface that path from `tools/build_wasm_win_dist.bat`.

## CI/CD & Deployment

**Hosting:**
- GitHub Pages hosts the browser demo. `.github/workflows/deploy-demo.yml` builds `demo/` and uploads `demo/dist`.
- npm is the intended distribution channel for the root Wasm carrier declared in `package.json`. No automated publish workflow is present under `.github/workflows/`.
- Tauri bundles the desktop app locally from `demo/src-tauri/tauri.conf.json`; no external desktop-update service is configured.

**CI Pipeline:**
- GitHub Actions is used only for demo deployment in `.github/workflows/deploy-demo.yml`.
- The workflow installs demo dependencies with npm, builds the Vite app, uploads a Pages artifact, and deploys it on pushes to `master`.
- Root release verification is scripted locally as `npm run test:release:root` in `package.json`; no matching CI workflow is present in `.github/workflows/`.

## Environment Configuration

**Required env vars:**
- None detected in repo code.
- The only environment gate used directly in source is `import.meta.env.DEV` in `demo/src/hooks/useOcct.js`.
- Build prerequisites are filesystem/toolchain markers checked by `tools/check_wasm_prereqs.mjs`: `occt/src/Standard`, `build/wasm/emsdk/emsdk_env.bat`, and `dist/occt-js.d.ts`.

**Secrets location:**
- No secrets store or checked-in secret file is referenced by source or workflow files.
- No `.env` files were detected at the repo root or under `demo/`.

## Webhooks & Callbacks

**Incoming:**
- None detected. No webhook endpoint, callback handler, or inbound HTTP server exists in `demo/src`, `demo/src-tauri`, `packages/*/src`, or `src/`.

**Outgoing:**
- Browser GET requests to UNPKG occur through the runtime loader in `demo/src/hooks/useOcct.js`.
- Browser GET requests for the remote sample fallback occur through `fetch()` in `demo/src/hooks/useViewerActions.js`, which consumes candidates from `demo/src/lib/sample-model.js`.
- GitHub Pages deployment callbacks are CI-only actions in `.github/workflows/deploy-demo.yml`, not application runtime webhooks.

---

*Integration audit: 2026-04-17*
