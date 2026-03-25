# React CAD Viewer — Plan 2: Interaction + Toolbar Features

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add picking/hover/multi-select interaction, camera view presets, ortho/persp toggle, screenshot, and model tree to the React demo.

**Architecture:** `usePicking` hook manages Babylon.js pointer events and selection state (in refs, not Zustand). Serializable selection summary pushed to store for UI. Toolbar extended with all button groups. New components: SelectionPanel, ModelTreeDrawer.

**Tech Stack:** React 18, Zustand, Babylon.js (CDN), shadcn/ui, Tailwind

**Spec:** `docs/specs/2026-03-25-react-viewer-design.md`, `docs/specs/2026-03-24-picking-interaction-design.md`

---

## Task 1: usePicking hook + SelectionPanel + selection mode toolbar

Migrate picking.js logic into `demo/src/hooks/usePicking.js`. Add `SelectionPanel.jsx` component. Extend Toolbar with Face/Edge/Vertex mode buttons.

## Task 2: Hover preview

Add rAF-throttled hover with lightweight highlights (face=boundary edges only, edge/vertex=colored line/sphere). Cursor changes.

## Task 3: Multi-select + navigation links

Ctrl+click toggle, selectionSet Map in usePicking ref, serializable summary to store. Adjacent face / owner face clickable links.

## Task 4: Camera view presets

7 preset buttons in toolbar: Front/Back/Top/Bottom/Left/Right/Iso. Animated camera transition (0.3s). Add to Zustand actions.

## Task 5: Ortho/Perspective toggle + Screenshot + Fit improvements

Projection mode radio in toolbar. Screenshot downloads PNG. Fix camera framing.

## Task 6: Model tree drawer

Left slide-in drawer with assembly tree. Node visibility toggle. Click-to-fit.

## Task 7: Playwright tests for all new features

Update demo.spec.mjs with tests for picking, hover, multi-select, view presets, ortho, screenshot, model tree.
