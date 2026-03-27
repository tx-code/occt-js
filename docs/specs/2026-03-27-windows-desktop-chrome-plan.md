# Windows Desktop Chrome Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Windows-only custom titlebar to the existing Tauri desktop MVP without affecting the browser app.

**Architecture:** Keep the current `demo/` frontend and inject a desktop chrome layer only when running inside Tauri on Windows. Use a small runtime helper for platform detection, a focused titlebar component for UI, and Tauri window APIs plus capabilities for behavior.

**Tech Stack:** React 18, Vite 6, Tauri v2, `@tauri-apps/api`, Zustand, Node built-in test runner

---

## File Map

| Path | Action | Responsibility |
|------|--------|----------------|
| `demo/tests/desktop-runtime.test.mjs` | Create | TDD coverage for runtime/platform detection |
| `demo/src/lib/desktop-runtime.js` | Create | Detect web vs Tauri Windows/macOS and expose chrome gating helpers |
| `demo/src/components/DesktopChrome.jsx` | Create | Windows custom titlebar UI and window button behavior |
| `demo/src/App.jsx` | Modify | Reserve desktop chrome space and mount the component |
| `demo/src/globals.css` | Modify | Add Win11-like chrome styling hooks |
| `demo/src-tauri/capabilities/default.json` | Modify | Allow required window commands |
| `demo/src-tauri/tauri.conf.json` | Modify | Configure a Windows custom chrome path |

## Chunk 1: Runtime Gating

### Task 1: Add a tested desktop runtime helper

**Files:**
- Create: `demo/tests/desktop-runtime.test.mjs`
- Create: `demo/src/lib/desktop-runtime.js`
- Test: `cd demo && node --test tests/desktop-runtime.test.mjs`

- [ ] Write runtime detection tests first
- [ ] Run them and confirm they fail because the helper does not exist
- [ ] Implement the minimal helper
- [ ] Re-run the test and confirm it passes

## Chunk 2: Windows Desktop Chrome

### Task 2: Add the desktop titlebar UI and window actions

**Files:**
- Create: `demo/src/components/DesktopChrome.jsx`
- Modify: `demo/src/App.jsx`
- Modify: `demo/src/globals.css`

- [ ] Build a Windows-only desktop chrome component
- [ ] Wire minimize, toggle maximize, close, and drag handling
- [ ] Mount it only when running in Tauri on Windows
- [ ] Reserve top layout space only for that runtime

## Chunk 3: Tauri Permissions and Window Config

### Task 3: Enable the minimum required desktop window capabilities

**Files:**
- Modify: `demo/src-tauri/capabilities/default.json`
- Modify: `demo/src-tauri/tauri.conf.json`

- [ ] Add permissions for minimize, toggle maximize, close, start dragging, and maximized-state reads
- [ ] Configure the desktop window for a custom-titlebar path on Windows
- [ ] Keep web behavior unchanged

## Chunk 4: Verification

### Task 4: Verify browser and desktop still work

**Files:**
- Test only

- [ ] Run `cd demo && node --test tests/desktop-runtime.test.mjs`
- [ ] Run `cd demo && npm run build`
- [ ] Run `cd demo && npm run tauri:build -- --debug --no-bundle`
- [ ] Launch the built app and confirm the Windows titlebar renders and window controls work
