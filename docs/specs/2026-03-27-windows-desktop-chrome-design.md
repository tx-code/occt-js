# Windows Desktop Chrome Design

**Date**: 2026-03-27
**Status**: Approved

## Goal

Add a Windows-only custom titlebar to the existing Tauri desktop MVP so the app feels closer to a native Win11 desktop app without changing the web experience.

## Scope

- In scope:
  - Windows-only custom titlebar in the Tauri app
  - Drag region
  - Minimize / maximize / close
  - Double-click titlebar to toggle maximize
  - Native-feeling Win11 visual treatment
- Out of scope:
  - macOS titlebar adaptation
  - Linux adaptation
  - Native app menu
  - Mica / Acrylic effects
  - Native file dialog

## Constraints

- The browser app must remain unchanged.
- The titlebar must render only inside the Tauri desktop app on Windows.
- Existing viewer layout and interactions must continue to work.
- The implementation should use Tauri window APIs with explicit capabilities, not ad-hoc DOM-only hacks.

## Approach

Keep the current `demo/` frontend and add a small desktop-only chrome layer above the existing app UI.

- Add a runtime helper that distinguishes web, Tauri Windows, and Tauri macOS.
- Add a `DesktopChrome` component that only renders on Tauri Windows.
- Use Tauri window APIs for minimize, toggle maximize, close, and maximized-state reads.
- Keep the main viewer layout intact by reserving a small top inset only when the Windows desktop chrome is active.

## UI

- Height: approximately `42px`
- Left: app mark + current file name / app title
- Center: drag region
- Right: minimize / maximize / close buttons
- Buttons should feel like Win11 controls:
  - subtle hover on minimize/maximize
  - red hover on close
  - square-ish geometry, not playful rounded pills

## Verification

- `cd demo && npm run build` still succeeds
- `cd demo && node --test tests/desktop-runtime.test.mjs` passes
- `cd demo && npm run tauri:build -- --debug --no-bundle` still succeeds
- Built desktop app launches and shows the custom titlebar on Windows
