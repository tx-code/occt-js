# Picking & Interaction Enhancement Design

**Date**: 2026-03-24
**Status**: Approved

## Goal

Upgrade the demo viewer from single-face-click selection to a full CAD-grade picking system with three selection modes (Face/Edge/Vertex), hover preview, multi-select, and info panel navigation.

## Scope

- **Demo only** (`demo/index.html`) — no C++ or Wasm changes needed, all data already available
- **Three phases** executed in order: A (selection modes), B (hover), C (multi-select & navigation)
- **Not in scope**: framework selection, GPU picking, box/lasso select (deferred to Phase B of the larger project)

## Phase A: Selection Mode Expansion

### Mode Switching

Bottom toolbar adds a mode selector next to existing Face/Edge toggles:

```
[ Faces ] [ Edges ]   |   Select: [ Face | Edge | Vertex ]
```

- Three mutually exclusive toggle buttons, default = Face
- No keyboard shortcuts (toolbar only)
- Active mode has `border-color: #4cc9f0; color: #4cc9f0` styling (same as existing toggles)
- **Switching mode clears current selection set and hover state**

### Face Picking (existing, refined)

```
scene.pick() → pickResult.faceId (triangle index)
→ geo.triangleToFaceMap[triIdx] → topoFaceId
→ highlightFace(sourceMesh, topoFaceId)
```

No change to existing logic except integration with new state management.

### Edge Picking (new)

```
scene.pick() → pickResult.pickedPoint (world coords)
→ transform to picked mesh's local coords (use pickResult.pickedMesh.getWorldMatrix().invert(), NOT sourceMesh — critical for instances)
→ for each edge in geo.edges:
     compute min distance from point to edge polyline segments
→ find closest edge where distance < threshold
→ highlightEdge(sourceMesh, edgeId)
```

**Distance calculation**: point-to-line-segment distance for each consecutive pair of points in `edge.points[]`. Take the minimum across all segments of all edges.

**Threshold**: screen-space 5px mapped to world space:
```javascript
const threshold = (5 / engine.getRenderHeight()) * camera.radius * 2;
```

### Vertex Picking (new)

```
scene.pick() → pickResult.pickedPoint (world coords)
→ transform to picked mesh's local coords (same instance-aware inversion as Edge mode)
→ for each vertex in geo.vertices:
     compute distance from point to vertex.position
→ find closest vertex where distance < threshold
→ highlightVertex(sourceMesh, vertexId)
```

Same threshold formula as edges.

**Fallback**: if scene.pick() misses all meshes (click on empty space near a vertex), vertex picking won't work. This is acceptable — vertex selection requires clicking on or near a mesh surface.

### Highlight Visuals

| Mode | Highlight | Color |
|------|-----------|-------|
| Face | Overlay mesh (translucent) + boundary edges | `#4cc9f0` (cyan blue) |
| Edge | Edge polyline redrawn as duplicate `CreateLineSystem` with brighter color (native line width is GPU-limited; no GreasedLine dependency) | `#4cc9f0` |
| Vertex | `SphereBuilder` mesh, diameter = `camera.radius * 0.008`, positioned at vertex coords | `#4cc9f0` |

### Info Panel Content

**Face** (existing, unchanged):
- Face ID, Triangles, Boundary Edges, Color swatch, Adjacent Faces

**Edge** (new):
- Edge ID
- Point Count (polyline resolution)
- Free Edge (yes/no)
- Owner Faces (list of face IDs)

**Vertex** (new):
- Vertex ID
- Position (x, y, z) formatted to 2 decimal places

## Phase B: Hover Preview

### Throttling

- `pointermove` handler gated by `requestAnimationFrame` — at most one pick per frame (~60Hz)
- Flag `hoverDirty = true` on `pointermove`, process in rAF callback

### Hover Visuals (lightweight, no mesh creation for faces)

| Mode | Hover Visual | Color |
|------|-------------|-------|
| Face | Boundary edges only (line system) | `#fbbf24` (warm yellow) |
| Edge | Duplicate `CreateLineSystem` with hover color | `#fbbf24` |
| Vertex | `SphereBuilder` mesh, same sizing as select but hover color | `#fbbf24` |

- Hover does NOT create face overlay mesh (performance)
- Click creates full highlight (overlay mesh + edges + info panel)

### State Structure

```javascript
let hoverState = null;   // { mode, id, sourceMesh, disposables[] }
let selectState = null;  // { mode, id, sourceMesh, disposables[] }  (Phase A single-select)
```

- On `pointermove`: dispose old hoverState.disposables, compute new hover, create new disposables
- Hover skips the currently selected element (don't hover what's already selected)
- On `pointerleave` (canvas): dispose hover

### Cursor

- Default cursor when hovering empty space
- `pointer` cursor when hovering a pickable element

## Phase C: Multi-Select & Navigation

### Multi-Select

- **Ctrl + click**: toggle item in selection set (add if not present, remove if present)
- **Plain click**: clear all, select clicked item only
- **Plain click empty**: clear all
- **Ctrl + click empty**: no-op (preserve selection)

### Selection Set

```javascript
let selectionSet = new Map();  // key="face:<mesh.uniqueId>:3" → { mode, id, sourceMesh, disposables[] }
```

Key format: `"<mode>:<mesh.uniqueId>:<elementId>"` — includes mesh identity to avoid collision when different geometries share element IDs (common in assemblies).

- Mixed-mode selections allowed (2 faces + 1 edge)
- Each selected item has its own disposables (highlight mesh/lines/sphere)
- All use select color (`#4cc9f0`)

### Info Panel (multi-select)

- Single selection: detailed info (same as Phase A)
- Multi-selection: summary header `"3 items selected"` with breakdown `"(2 faces, 1 edge)"`, then a list of selected IDs grouped by type
- Clicking an item in the list → isolates that item (clears rest, selects only it)

### Navigation Links

- Face info panel → "Adjacent Faces: 2, 5, 7" → each ID is a clickable `<a>` → click jumps selection to that face **on the same sourceMesh** (navigation links carry sourceMesh reference, not just face ID)
- Edge info panel → "Owner Faces: 3, 4" → clickable → switches to Face mode + selects that face **on the same sourceMesh**
- Vertex info panel → no links (no vertex→face adjacency in current data, deferred)

### State Management Upgrade (Phase A → C transition)

Phase A uses single `selectState`. Phase C replaces it with `selectionSet` Map.

Migration: `selectState` is removed, all selection logic uses `selectionSet`. Single-click = clear map + add one entry. Ctrl+click = toggle entry in map.

## Files Changed

| File | Change |
|------|--------|
| `demo/index.html` | All picking/hover/multi-select logic + UI additions |
| `demo/tests/demo.spec.mjs` | New Playwright tests for edge/vertex picking, hover, multi-select |

## Test Plan

### Phase A Tests
- Select mode buttons switch correctly (mutual exclusion)
- Face picking still works (regression)
- Edge picking: click near an edge → info panel shows Edge ID + owner faces
- Vertex picking: click near a vertex → info panel shows Vertex ID + coordinates
- Clicking empty space clears selection in all modes

### Phase B Tests
- Hover on face → boundary edges appear in yellow (visual, may need screenshot comparison)
- Hover off → yellow lines disappear
- Hover doesn't interfere with existing selection

### Phase C Tests
- Ctrl+click adds to selection (info panel shows count)
- Ctrl+click on selected item removes it
- Plain click replaces entire selection
- Adjacent face link in info panel works (click → jumps to that face)
- Edge owner face link works (click → switches to Face mode)

## Color Palette

| Usage | Color | Hex |
|-------|-------|-----|
| Hover | Warm yellow | `#fbbf24` |
| Select | Cyan blue | `#4cc9f0` |
| Select face overlay | Cyan blue, alpha 0.6 | `#4cc9f0` @ 60% |
| Select face emissive | Dark cyan | `#1a4060` |
| Edge lines (default) | Dark gray | `#262630` |

## Implementation Order

1. Phase A: Selection modes (Face/Edge/Vertex) + mode toolbar + info panels
2. Phase B: Hover preview (throttled pointermove + lightweight hover visuals)
3. Phase C: Multi-select (Ctrl+click + selectionSet + info panel navigation)

Each phase is independently testable and committable.
