# React + Babylon.js CAD Viewer Design

**Date**: 2026-03-25
**Status**: Approved

## Goal

Rewrite the vanilla HTML demo into a React + Babylon.js professional CAD viewer with shadcn/ui + Tailwind, compact overlay layout (toolbar + floating panels, no fixed sidebars), and all existing picking/hover/multi-select functionality preserved.

## Layout

Compact Overlays: top toolbar with all controls, full-screen Babylon.js canvas, floating overlay panels for selection info and stats. Model tree as left drawer (triggered by toolbar button). No fixed sidebars — canvas takes maximum space.

## Tech Stack

- **React 18+** with JSX (no TypeScript for MVP)
- **Vite** for dev server + build
- **Tailwind CSS** for styling
- **shadcn/ui** for UI components (Button, Tooltip, Drawer, etc.)
- **Zustand** for state management
- **Babylon.js** from CDN (same as current demo)
- **@babylonjs/gui** — not used (HTML overlays instead)

## Project Structure

```
demo/
  index.html                    — Vite entry
  vite.config.js
  package.json
  postcss.config.js
  tailwind.config.js
  components.json               — shadcn/ui config
  src/
    main.jsx                    — React entry
    App.jsx                     — Main layout
    globals.css                 — Tailwind base + dark theme variables
    lib/utils.js                — shadcn cn() helper
    components/
      ui/                       — shadcn/ui components (Button, Tooltip, Drawer, etc.)
      Toolbar.jsx               — Top toolbar with all button groups
      ViewCanvas.jsx            — Babylon.js canvas container
      SelectionPanel.jsx        — Floating selection info (top-right)
      StatsPanel.jsx            — Floating model stats (bottom-left)
      ModelTreeDrawer.jsx       — Left drawer with assembly tree
      DropZone.jsx              — Initial file upload overlay
      LoadingOverlay.jsx        — Loading spinner overlay
    hooks/
      useViewer.js              — Babylon.js Engine/Scene/Camera lifecycle
      usePicking.js             — Selection/hover/multi-select logic
      useOcct.js                — Wasm loading + file import
      useModelTree.js           — Scene tree traversal + visibility control
    store/
      viewerStore.js            — Zustand global state
  tests/
    demo.spec.mjs              — Playwright e2e tests (migrated + new)
    interaction.spec.mjs        — Interaction regression tests
```

Old `demo/index.html`, `demo/picking.js`, `demo/server.mjs` are deleted (not moved to legacy).

## Component Hierarchy

```
App.jsx
├── <DropZone />              — Full-screen overlay (hidden after model load)
├── <LoadingOverlay />        — Loading spinner (shown during import)
├── <Toolbar />               — Fixed top bar
│   ├── Brand: "occt-js" + fileName
│   ├── File: Open button
│   ├── Camera: Front/Back/Top/Bottom/Left/Right/Iso
│   ├── Projection: Ortho / Persp (radio)
│   ├── Display: Faces / Edges (toggle)
│   ├── Select: Face / Edge / Vtx (radio)
│   ├── Tools: Snapshot / Theme / Tree
│   └── View: Fit
├── <ViewCanvas />            — Full-screen Babylon.js (position:absolute, inset:0, z-index:0)
├── <SelectionPanel />        — Top-right floating overlay
├── <StatsPanel />            — Bottom-left floating overlay
└── <ModelTreeDrawer />       — Left slide-in drawer
```

## Zustand Store

```javascript
viewerStore = {
  // Model
  model: null,                    // Raw OCCT import result (retained for tree panel)
  fileName: "",
  loading: false,

  // View
  projectionMode: "perspective",  // "perspective" | "orthographic"
  facesVisible: true,
  edgesVisible: true,
  theme: "dark",                  // "dark" | "light"

  // Selection (serializable summary only — NO Babylon.js objects here)
  pickMode: "face",               // "face" | "edge" | "vertex"
  selectedItems: [],              // [{ mode, id, meshUniqueId }] — derived from usePicking's internal Map
  // hoverTarget is NOT in store — lives in usePicking ref (frame-rate driven, no React re-renders)

  // Panels
  treeOpen: false,

  // Actions
  loadFile(file) {},
  setPickMode(mode) {},
  setCameraView(direction) {},
  setProjection(mode) {},         // "perspective" | "orthographic" (not toggle — radio needs explicit set)
  toggleFaces() {},
  toggleEdges() {},
  toggleTheme() {},
  takeSnapshot() {},
  fitAll() {},
  clearSelection() {},
  setTreeOpen(open) {},
  setSelectedItems(items) {},     // called by usePicking to sync serializable summary to store
}
```

### Babylon.js ↔ React boundary

**Principle:** Zustand store contains ONLY serializable values. All Babylon.js objects (Engine, Scene, Camera, Mesh, Material, highlight disposables) live in refs.

**Implementation:**

- `useViewer` hook: owns `engineRef`, `sceneRef`, `cameraRef`, `meshGeoMapRef` (Map<Mesh, geo>). Returns these refs for other hooks.
- `usePicking` hook: receives viewer refs. Owns the internal `selectionSet` Map (with disposables) and `hoverState` as local refs. On selection change, pushes serializable `selectedItems` to Zustand for `SelectionPanel` to read.
- `viewerContext`: a shared ref object (NOT React Context — just a plain object ref) passed from `useViewer` to `usePicking`. Avoids prop drilling without causing re-renders.

```javascript
// In ViewCanvas.jsx:
const viewerRefs = useViewer(canvasRef);     // { engineRef, sceneRef, cameraRef, meshGeoMapRef }
usePicking(viewerRefs);                       // attaches pointer handlers, manages selection
```

## Toolbar Button Groups

```
[occt-js | file.step] [Open] | [Front Back Top Bottom Left Right Iso] | [Ortho Persp] | [Faces Edges] | [Face Edge Vtx] | [📷 🌙 🌳] [Fit]
```

| Group | Buttons | Behavior |
|-------|---------|----------|
| Brand | Logo + fileName | Read-only display |
| File | Open | Opens file picker (also accepts drag-and-drop on canvas) |
| Camera | Front/Back/Top/Bottom/Left/Right/Iso | Preset camera angles with 0.3s animation |
| Projection | Ortho / Persp | Mutually exclusive radio toggle |
| Display | Faces / Edges | Independent toggles |
| Select Mode | Face / Edge / Vtx | Mutually exclusive radio |
| Tools | Snapshot / Theme / Tree | Individual actions |
| View | Fit | Reset camera to model bounding box |

## Camera View Presets

7 presets computed from model bounding box center + extent:

Babylon.js `ArcRotateCamera` uses: alpha = rotation around Y from +X axis, beta = angle from +Y axis.

| View | alpha | beta | Description |
|------|-------|------|-------------|
| Front | -π/2 | π/2 | Looking along -Z (from +Z side) |
| Back | π/2 | π/2 | Looking along +Z (from -Z side) |
| Top | -π/2 | 0.01 | Looking down -Y (near pole, avoid gimbal) |
| Bottom | -π/2 | π - 0.01 | Looking up +Y |
| Left | π | π/2 | Looking along +X (from -X side) |
| Right | 0 | π/2 | Looking along -X (from +X side) |
| Iso | π/4 | π/3 | Default isometric |

**Note:** Exact angles must be verified against Babylon.js conventions during implementation. The implementer should test with simple_part.step and adjust if needed.

- Animated transition using `BABYLON.Animation` (0.3s ease)
- Radius preserved (no zoom change on view switch)
- Orthographic mode auto-adjusts `orthoLeft/Right/Top/Bottom` based on model extent

## Babylon.js Integration (`useViewer` hook)

```javascript
function useViewer(canvasRef) {
  const engineRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);

  useEffect(() => {
    // Create Engine, Scene, Camera, Lights on mount
    // Subscribe to Zustand store changes → sync to Babylon
    // Return cleanup (dispose engine)
  }, []);

  return { engineRef, sceneRef, cameraRef };
}
```

- Engine/Scene/Camera stored in refs (not state)
- Store subscription via `viewerStore.subscribe()` for reactive sync
- Camera zoom limits + clipping set from model bounding box (existing logic)

## Selection / Picking (`usePicking` hook)

Migrated from current `picking.js` + `index.html` picking code:
- `POINTERTAP` for mesh clicks
- `POINTERUP` + drag threshold for empty-space clicks (clear selection)
- `processHover` in `onBeforeRenderObservable`
- World-space highlight positioning (for instances)
- All existing geometry math functions preserved

## Model Tree Drawer

- shadcn `Drawer` component (opens from left)
- Recursive tree built from `model.rootNodes`
- Each node shows: name, expand/collapse, visibility toggle (eye icon)
- Click node → fit camera to that node's bounding box
- Visibility toggle → `mesh.isVisible = false` for that subtree

## Screenshot

- `BABYLON.Tools.CreateScreenshot(engine, camera, { width, height })`
- Downloads as `occt-js-snapshot.png`

## Theme

- Dark (default) / Light toggle
- Tailwind `dark:` variant classes
- Babylon.js `scene.clearColor` synced
- CSS variables for overlay panel backgrounds

## Migration from Old Demo

| Old | New | Notes |
|-----|-----|-------|
| `demo/index.html` inline JS | `hooks/useViewer.js` + `hooks/useOcct.js` | Scene build, model load |
| `demo/picking.js` | `hooks/usePicking.js` + `store/viewerStore.js` | Selection + state |
| `demo/index.html` CSS | `globals.css` + Tailwind | Style migration |
| `demo/server.mjs` | Deleted (Vite replaces it) | |
| `demo/tests/*.spec.mjs` | `demo/tests/*.spec.mjs` (updated selectors) | Playwright tests |
| `playwright.config.mjs` | Updated for Vite webServer | |

## Unchanged

- `dist/` — Wasm build artifacts
- `packages/occt-core/`, `packages/occt-babylon-loader/`
- `src/` — C++ source
- `test/` — Node.js Wasm tests (npm test)
- CDN loading (unpkg `@tx-code/occt-js@0.1.1`)

## Playwright Tests

All existing test scenarios (~23 in demo.spec.mjs + 7 in interaction-regression.spec.mjs = 30 total) preserved with updated DOM selectors:
- Old: `#toggleFaces` → New: `button[data-testid="toggle-faces"]`
- Vite dev server in `playwright.config.mjs` webServer

New tests added:
- Camera view presets (click Front → camera animates)
- Ortho/Perspective toggle
- Screenshot download
- Model tree drawer open/close + node visibility toggle
- Theme toggle (dark/light)

## GitHub Pages Deployment

- `vite build` outputs to `demo/dist/`
- GitHub Actions workflow: `npm run build` in `demo/` → deploy `demo/dist/` to gh-pages
- Or: commit `demo/dist/` directly (simpler for now)
