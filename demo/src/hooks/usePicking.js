// demo/src/hooks/usePicking.js
import { useEffect, useRef, useCallback } from "react";
import {
  createPointerClickTracker,
  createOcctVertexPreviewPoints,
  createScreenSpaceVertexMarker,
  getOcctVertexCoords,
  pickOcctClosestVertex,
} from "@tx-code/occt-babylon-viewer";
import { useViewerStore } from "../store/viewerStore";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const PICK_COLORS = {
  select: null,       // lazily initialized (needs BABYLON)
  selectEmissive: null,
  hover: null,
  edge: null,
};

function ensureColors(BABYLON) {
  if (PICK_COLORS.select) return;
  // Align with SceneGraph-style semantics:
  // selection = stronger green, preselection(hover) = lighter cyan.
  PICK_COLORS.select = new BABYLON.Color3(0.0, 1.0, 0.3);
  PICK_COLORS.selectEmissive = new BABYLON.Color3(0.02, 0.14, 0.07);
  PICK_COLORS.hover = new BABYLON.Color3(0.0, 0.8, 1.0);
  PICK_COLORS.edge = new BABYLON.Color3(0.0, 1.0, 0.3);
}

const HIGHLIGHT_STYLE = Object.freeze({
  hover: Object.freeze({
    faceGain: 1.02,
    faceLift: 0.015,
    faceBlend: 0.2,
    edgeVisibleAlpha: 0.9,
    edgeXrayAlpha: 0.45,
  }),
  select: Object.freeze({
    faceGain: 1.06,
    faceLift: 0.03,
    faceBlend: 0.38,
    edgeVisibleAlpha: 1,
    edgeXrayAlpha: 0,
  }),
});

// ---------------------------------------------------------------------------
// Geometry math helpers
// ---------------------------------------------------------------------------
function pointToSegmentDistanceSq(px, py, pz, ax, ay, az, bx, by, bz) {
  const abx = bx - ax, aby = by - ay, abz = bz - az;
  const apx = px - ax, apy = py - ay, apz = pz - az;
  const dot = apx * abx + apy * aby + apz * abz;
  const lenSq = abx * abx + aby * aby + abz * abz;
  let t = lenSq > 0 ? dot / lenSq : 0;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * abx - px;
  const cy = ay + t * aby - py;
  const cz = az + t * abz - pz;
  return cx * cx + cy * cy + cz * cz;
}

function distanceToEdgePolyline(px, py, pz, points) {
  let minSq = Infinity;
  for (let i = 0; i < points.length - 3; i += 3) {
    const dSq = pointToSegmentDistanceSq(
      px, py, pz,
      points[i], points[i + 1], points[i + 2],
      points[i + 3], points[i + 4], points[i + 5]
    );
    if (dSq < minSq) minSq = dSq;
  }
  return Math.sqrt(minSq);
}

function getPickThreshold(engine, camera) {
  return (5 / engine.getRenderHeight()) * camera.radius * 2;
}

function toIntArray(values) {
  if (Array.isArray(values)) {
    return values;
  }
  if (ArrayBuffer.isView(values)) {
    return Array.from(values);
  }
  return [];
}

function worldToLocal(worldPoint, mesh, BABYLON) {
  const inv = mesh.getWorldMatrix().clone().invert();
  return BABYLON.Vector3.TransformCoordinates(worldPoint, inv);
}

function findClosestEdge(localPt, geo, threshold) {
  if (!geo.edges || geo.edges.length === 0) return null;
  let bestEdge = null;
  let bestDist = Infinity;
  for (let i = 0; i < geo.edges.length; i++) {
    const edge = geo.edges[i];
    if (!edge.points || edge.points.length < 6) continue;
    const d = distanceToEdgePolyline(localPt.x, localPt.y, localPt.z, edge.points);
    if (d < bestDist) {
      bestDist = d;
      bestEdge = { index: i, edge, dist: d };
    }
  }
  if (bestEdge && bestEdge.dist < threshold) return bestEdge;
  return null;
}

function getSourceMesh(mesh) {
  return mesh?.sourceMesh || mesh;
}

// ---------------------------------------------------------------------------
// Highlight builders (all in WORLD SPACE)
// ---------------------------------------------------------------------------

function clamp01(value) {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function getMeshBaseColor(mesh) {
  const fallback = { r: 0.9, g: 0.91, b: 0.93, a: 1 };
  const material = mesh?.material;
  if (!material) return fallback;

  if (material.albedoColor) {
    return {
      r: clamp01(material.albedoColor.r),
      g: clamp01(material.albedoColor.g),
      b: clamp01(material.albedoColor.b),
      a: 1,
    };
  }

  if (material.diffuseColor) {
    return {
      r: clamp01(material.diffuseColor.r),
      g: clamp01(material.diffuseColor.g),
      b: clamp01(material.diffuseColor.b),
      a: 1,
    };
  }

  return fallback;
}

function ensureColorBuffer(mesh, BABYLON) {
  const positions = mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);
  if (!positions || positions.length === 0) return null;

  const vertexCount = Math.floor(positions.length / 3);
  const expected4 = vertexCount * 4;
  const raw = mesh.getVerticesData(BABYLON.VertexBuffer.ColorKind);
  const baseColor = getMeshBaseColor(mesh);
  const colors = new Float32Array(expected4);

  if (raw && raw.length >= expected4) {
    for (let v = 0; v < vertexCount; v++) {
      colors[v * 4] = raw[v * 4];
      colors[v * 4 + 1] = raw[v * 4 + 1];
      colors[v * 4 + 2] = raw[v * 4 + 2];
      colors[v * 4 + 3] = 1;
    }
  } else if (raw && raw.length >= vertexCount * 3) {
    for (let v = 0; v < vertexCount; v++) {
      colors[v * 4] = raw[v * 3];
      colors[v * 4 + 1] = raw[v * 3 + 1];
      colors[v * 4 + 2] = raw[v * 3 + 2];
      colors[v * 4 + 3] = 1;
    }
  } else {
    for (let v = 0; v < vertexCount; v++) {
      colors[v * 4] = baseColor.r;
      colors[v * 4 + 1] = baseColor.g;
      colors[v * 4 + 2] = baseColor.b;
      colors[v * 4 + 3] = baseColor.a;
    }
  }

  mesh.setVerticesData(BABYLON.VertexBuffer.ColorKind, colors, true);
  mesh.useVertexColors = true;
  mesh.hasVertexAlpha = false;
  const material = mesh.material;
  if (material) {
    if ("useVertexColors" in material) material.useVertexColors = true;
    if ("useVertexColor" in material) material.useVertexColor = true;
    if ("useVertexAlpha" in material) material.useVertexAlpha = false;
  }

  return colors;
}

function buildFaceVertexMap(geo) {
  const map = new Map();
  if (!geo?.faces || !geo?.indices) return map;

  const indices = geo.indices;
  for (let fi = 0; fi < geo.faces.length; fi++) {
    const face = geo.faces[fi];
    if (!face || face.indexCount <= 0) continue;

    const used = new Set();
    const start = face.firstIndex;
    const end = face.firstIndex + face.indexCount;
    for (let i = start; i < end; i++) {
      const vi = indices[i];
      if (Number.isFinite(vi)) {
        used.add(vi | 0);
      }
    }

    if (used.size > 0) {
      map.set(fi + 1, Uint32Array.from(used));
    }
  }

  return map;
}

function tintColorChannel(value, style) {
  const gain = style?.faceGain ?? 1.1;
  const lift = style?.faceLift ?? 0.04;
  return clamp01(value * gain + (1 - value) * lift);
}

function applyFaceTint(colors, vertexIndices, style, targetColor) {
  if (!vertexIndices || vertexIndices.length === 0) return;
  const blend = clamp01(style?.faceBlend ?? 0.25);
  const tr = clamp01(targetColor?.r ?? 0.9);
  const tg = clamp01(targetColor?.g ?? 0.9);
  const tb = clamp01(targetColor?.b ?? 0.9);
  for (let i = 0; i < vertexIndices.length; i++) {
    const offset = vertexIndices[i] * 4;
    const nr = tintColorChannel(colors[offset], style);
    const ng = tintColorChannel(colors[offset + 1], style);
    const nb = tintColorChannel(colors[offset + 2], style);
    colors[offset] = clamp01(nr * (1 - blend) + tr * blend);
    colors[offset + 1] = clamp01(ng * (1 - blend) + tg * blend);
    colors[offset + 2] = clamp01(nb * (1 - blend) + tb * blend);
    colors[offset + 3] = 1;
  }
}

function ensureFaceTintState(pickedMesh, geo, BABYLON, faceTintStates) {
  const colorMesh = pickedMesh?.sourceMesh || pickedMesh;
  if (!colorMesh || !geo) return null;

  let state = faceTintStates.get(colorMesh);
  if (state) return state;

  const baseColors = ensureColorBuffer(colorMesh, BABYLON);
  if (!baseColors) return null;

  state = {
    mesh: colorMesh,
    baseColors: new Float32Array(baseColors),
    workingColors: new Float32Array(baseColors),
    faceVertices: buildFaceVertexMap(geo),
    selectedFaces: new Map(),
    hoverFaceId: null,
  };
  faceTintStates.set(colorMesh, state);
  return state;
}

function refreshFaceTintState(state, BABYLON) {
  state.workingColors.set(state.baseColors);

  for (const [faceId, count] of state.selectedFaces.entries()) {
    if (count <= 0) continue;
    const vertices = state.faceVertices.get(faceId);
    if (!vertices) continue;
    for (let i = 0; i < count; i++) {
      applyFaceTint(state.workingColors, vertices, HIGHLIGHT_STYLE.select, PICK_COLORS.select);
    }
  }

  if (state.hoverFaceId !== null && !state.selectedFaces.has(state.hoverFaceId)) {
    const vertices = state.faceVertices.get(state.hoverFaceId);
    applyFaceTint(state.workingColors, vertices, HIGHLIGHT_STYLE.hover, PICK_COLORS.hover);
  }

  state.mesh.updateVerticesData(BABYLON.VertexBuffer.ColorKind, state.workingColors, false, false);
}

function makeFaceTintDisposable(pickedMesh, geo, faceId, kind, BABYLON, faceTintStates) {
  const state = ensureFaceTintState(pickedMesh, geo, BABYLON, faceTintStates);
  if (!state) return null;

  if (kind === "hover") {
    state.hoverFaceId = faceId;
    refreshFaceTintState(state, BABYLON);
    return {
      dispose() {
        if (state.hoverFaceId === faceId) {
          state.hoverFaceId = null;
          refreshFaceTintState(state, BABYLON);
          if (state.selectedFaces.size === 0) {
            faceTintStates.delete(state.mesh);
          }
        }
      },
    };
  }

  const count = state.selectedFaces.get(faceId) || 0;
  state.selectedFaces.set(faceId, count + 1);
  refreshFaceTintState(state, BABYLON);

  return {
    dispose() {
      const current = state.selectedFaces.get(faceId) || 0;
      if (current <= 1) {
        state.selectedFaces.delete(faceId);
      } else {
        state.selectedFaces.set(faceId, current - 1);
      }
      refreshFaceTintState(state, BABYLON);
      if (state.hoverFaceId === null && state.selectedFaces.size === 0) {
        faceTintStates.delete(state.mesh);
      }
    },
  };
}

function buildWorldEdgePolyline(pickedMesh, edge, BABYLON) {
  if (!edge || !edge.points || edge.points.length < 6) {
    return null;
  }

  const worldMatrix = pickedMesh.getWorldMatrix();
  const pts = edge.points;
  const line = [];
  for (let i = 0; i < pts.length; i += 3) {
    const v = new BABYLON.Vector3(pts[i], pts[i + 1], pts[i + 2]);
    const w = BABYLON.Vector3.TransformCoordinates(v, worldMatrix);
    line.push(w.x, w.y, w.z);
  }
  return line.length >= 6 ? line : null;
}

function createLinePassHighlightDisposable(viewerRefs, kind, token, lines) {
  if (!viewerRefs?.setEdgeHighlight || !viewerRefs?.clearEdgeHighlight) {
    return null;
  }
  if (!lines || lines.length === 0) {
    return null;
  }

  viewerRefs.setEdgeHighlight(kind, token, lines);
  return {
    dispose() {
      viewerRefs.clearEdgeHighlight(kind, token);
    },
  };
}

function createFaceBoundaryHighlight(viewerRefs, pickedMesh, geo, face, faceId, kind, BABYLON) {
  if (!face.edgeIndices || face.edgeIndices.length === 0 || !geo.edges) {
    return [];
  }

  const edgeLines = [];
  for (const eIdx of face.edgeIndices) {
    const line = buildWorldEdgePolyline(pickedMesh, geo.edges[eIdx], BABYLON);
    if (line) {
      edgeLines.push(line);
    }
  }

  if (edgeLines.length === 0) {
    return [];
  }

  const token = `face:${pickedMesh.uniqueId}:${faceId}`;
  const disposable = createLinePassHighlightDisposable(
    viewerRefs,
    kind,
    token,
    edgeLines,
  );
  return disposable ? [disposable] : [];
}

function createFaceHighlight(
  viewerRefs,
  pickedMesh,
  geo,
  faceId,
  BABYLON,
  faceTintStates,
  kind = "select",
) {
  ensureColors(BABYLON);
  const face = geo.faces[faceId - 1]; // faceId is 1-based, array is 0-based
  if (!face) return [];

  const disposables = [];
  const colorDisposable = makeFaceTintDisposable(
    pickedMesh,
    geo,
    faceId,
    kind,
    BABYLON,
    faceTintStates,
  );
  if (colorDisposable) {
    disposables.push(colorDisposable);
  }

  disposables.push(
    ...createFaceBoundaryHighlight(viewerRefs, pickedMesh, geo, face, faceId, kind, BABYLON),
  );

  return disposables;
}

function createEdgeHighlight(viewerRefs, kind, pickedMesh, geo, edgeIndex, BABYLON) {
  ensureColors(BABYLON);
  const edge = geo.edges[edgeIndex];
  const line = buildWorldEdgePolyline(pickedMesh, edge, BABYLON);
  if (!line) {
    return [];
  }

  const token = `edge:${pickedMesh.uniqueId}:${edgeIndex}`;
  const disposable = createLinePassHighlightDisposable(
    viewerRefs,
    kind,
    token,
    [line],
  );
  return disposable ? [disposable] : [];
}

function createVertexHighlight(scene, pickedMesh, geo, vertexIndex, camera, BABYLON) {
  ensureColors(BABYLON);
  const v = geo.vertices[vertexIndex];
  if (!v) return [];
  const coords = getOcctVertexCoords(v);
  if (!coords) return [];
  const worldMatrix = pickedMesh.getWorldMatrix();
  const localPt = new BABYLON.Vector3(coords.x, coords.y, coords.z);
  const worldPt = BABYLON.Vector3.TransformCoordinates(localPt, worldMatrix);
  const marker = createScreenSpaceVertexMarker(scene, worldPt, camera, BABYLON, {
    markerType: "select",
    coreColor: PICK_COLORS.select,
    ringColor: new BABYLON.Color3(0.04, 0.05, 0.06),
    corePixelSize: 7.2,
    ringScale: 1.42,
    ringAlpha: 0.76,
    coreAlpha: 0.97,
  });
  return marker ? [marker] : [];
}

// ---------------------------------------------------------------------------
// Build detail info for store
// ---------------------------------------------------------------------------
function buildFaceDetail(geo, faceId, meshUniqueId) {
  const face = geo.faces[faceId - 1]; // faceId is 1-based
  if (!face) return null;
  const info = {
    faceId,
    triangles: face.indexCount / 3,
    boundaryEdges: face.edgeIndices || [],
    color: face.color || geo.color || null,
    adjacentFaces: face.adjacentFaces || [],
  };
  return { mode: "face", id: `face:${meshUniqueId}:${faceId}`, meshUniqueId, info };
}

function buildEdgeDetail(geo, edgeIndex, meshUniqueId) {
  const edge = geo.edges[edgeIndex];
  if (!edge) return null;
  const ownerFaces = toIntArray(edge.ownerFaceIds ?? edge.ownerFaces);
  const freeEdge = edge.isFreeEdge ?? edge.freeEdge ?? false;
  const info = {
    edgeId: edgeIndex,
    pointCount: edge.points ? edge.points.length / 3 : 0,
    freeEdge: !!freeEdge,
    ownerFaces,
  };
  return { mode: "edge", id: `edge:${meshUniqueId}:${edgeIndex}`, meshUniqueId, info };
}

function buildVertexDetail(geo, vertexIndex, meshUniqueId) {
  const v = geo.vertices[vertexIndex];
  if (!v) return null;
  const coords = getOcctVertexCoords(v);
  if (!coords) return null;
  const info = {
    vertexId: Number.isFinite(v.id) ? v.id : vertexIndex,
    x: coords.x,
    y: coords.y,
    z: coords.z,
  };
  return { mode: "vertex", id: `vertex:${meshUniqueId}:${vertexIndex}`, meshUniqueId, info };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function usePicking(viewerRefs) {
  const selectionSetRef = useRef(new Map()); // key → { mode, id, meshUniqueId, disposables[] }
  const hoverStateRef = useRef(null); // { mode, id, disposables[] }
  const faceTintStateRef = useRef(new WeakMap());
  const hoverDirtyRef = useRef(false);
  const clearHoverRef = useRef(null); // set when setup() runs
  const vertexPreviewRef = useRef([]);

  const clearAllSelections = useCallback(() => {
    for (const entry of selectionSetRef.current.values()) {
      for (const d of entry.disposables) {
        if (d && typeof d.dispose === "function") d.dispose();
      }
    }
    selectionSetRef.current.clear();
    useViewerStore.getState().setSelectedItems([]);
    useViewerStore.getState().setSelectedDetail(null);
  }, []);

  useEffect(() => {
    if (!viewerRefs) return;
    const { engineRef, sceneRef, cameraRef, meshGeoMapRef, meshesRef } = viewerRefs;

    // Wait for scene to be ready
    const intervalId = setInterval(() => {
      const scene = sceneRef.current;
      if (!scene) return;
      clearInterval(intervalId);
      setup(scene);
    }, 100);

    let observer = null;
    let hoverObserver = null;
      let renderCanvas = null;
      let pointerMoveHandler = null;
      let pointerLeaveHandler = null;

      function clearVertexPreview() {
        for (const disposable of vertexPreviewRef.current) {
          if (disposable && typeof disposable.dispose === "function") {
            disposable.dispose();
          }
        }
        vertexPreviewRef.current = [];
      }

      function refreshVertexPreview(activeScene, BABYLON) {
        clearVertexPreview();
        if (useViewerStore.getState().pickMode !== "vertex") {
          return;
        }
        if (!activeScene || !BABYLON) {
          return;
        }
        vertexPreviewRef.current = createOcctVertexPreviewPoints(
          activeScene,
          meshesRef.current || [],
          (mesh) => meshGeoMapRef.current.get(getSourceMesh(mesh)),
          BABYLON,
        );
      }

    function setup(scene) {
      const BABYLON = window.BABYLON;
      if (!BABYLON) return;
      ensureColors(BABYLON);

      const pointerClickTracker = createPointerClickTracker();

      // Sync selectionSet → store
      function pushToStore() {
        const items = [];
        for (const entry of selectionSetRef.current.values()) {
          items.push({ mode: entry.mode, id: entry.id, meshUniqueId: entry.meshUniqueId });
        }
        useViewerStore.getState().setSelectedItems(items);

        // Build detail
        if (items.length === 0) {
          useViewerStore.getState().setSelectedDetail(null);
        } else {
          const detailItems = [];
          for (const entry of selectionSetRef.current.values()) {
            if (entry.detail) detailItems.push(entry.detail);
          }
          const modes = new Set(detailItems.map((d) => d.mode));
          useViewerStore.getState().setSelectedDetail({
            mode: modes.size === 1 ? [...modes][0] : "mixed",
            items: detailItems,
          });
        }
      }

      function removeSelection(key) {
        const entry = selectionSetRef.current.get(key);
        if (!entry) return;
        for (const d of entry.disposables) {
          if (d && typeof d.dispose === "function") d.dispose();
        }
        selectionSetRef.current.delete(key);
      }

      function clearAll() {
        for (const key of [...selectionSetRef.current.keys()]) {
          removeSelection(key);
        }
        pushToStore();
      }

      function handleFacePick(pickResult, ctrlKey) {
        const pickedMesh = pickResult.pickedMesh;
        if (!pickedMesh) return;
        const sourceMesh = getSourceMesh(pickedMesh);
        const geo = meshGeoMapRef.current.get(sourceMesh);
        if (!geo || !geo.faces || !geo.triangleToFaceMap) return;

        const triIdx = pickResult.faceId;
        const faceId = geo.triangleToFaceMap[triIdx];
        if (faceId === undefined || faceId === null) return;

        const key = `face:${pickedMesh.uniqueId}:${faceId}`;

        if (ctrlKey) {
          if (selectionSetRef.current.has(key)) {
            removeSelection(key);
          } else {
            const disposables = createFaceHighlight(
              viewerRefs,
              pickedMesh,
              geo,
              faceId,
              BABYLON,
              faceTintStateRef.current,
            );
            const detail = buildFaceDetail(geo, faceId, pickedMesh.uniqueId);
            selectionSetRef.current.set(key, { mode: "face", id: key, meshUniqueId: pickedMesh.uniqueId, disposables, detail });
          }
        } else {
          clearAll();
          const disposables = createFaceHighlight(
            viewerRefs,
            pickedMesh,
            geo,
            faceId,
            BABYLON,
            faceTintStateRef.current,
          );
          const detail = buildFaceDetail(geo, faceId, pickedMesh.uniqueId);
          selectionSetRef.current.set(key, { mode: "face", id: key, meshUniqueId: pickedMesh.uniqueId, disposables, detail });
        }
        pushToStore();
      }

      function handleEdgePick(pickResult, ctrlKey) {
        const pickedMesh = pickResult.pickedMesh;
        if (!pickedMesh || !pickResult.pickedPoint) return;
        const sourceMesh = getSourceMesh(pickedMesh);
        const geo = meshGeoMapRef.current.get(sourceMesh);
        if (!geo || !geo.edges) return;

        const engine = engineRef.current;
        const camera = cameraRef.current;
        if (!engine || !camera) return;

        const localPt = worldToLocal(pickResult.pickedPoint, pickedMesh, BABYLON);
        const threshold = getPickThreshold(engine, camera);
        const result = findClosestEdge(localPt, geo, threshold);
        if (!result) return;

        const key = `edge:${pickedMesh.uniqueId}:${result.index}`;

        if (ctrlKey) {
          if (selectionSetRef.current.has(key)) {
            removeSelection(key);
          } else {
            const disposables = createEdgeHighlight(viewerRefs, "select", pickedMesh, geo, result.index, BABYLON);
            const detail = buildEdgeDetail(geo, result.index, pickedMesh.uniqueId);
            selectionSetRef.current.set(key, { mode: "edge", id: key, meshUniqueId: pickedMesh.uniqueId, disposables, detail });
          }
        } else {
          clearAll();
          const disposables = createEdgeHighlight(viewerRefs, "select", pickedMesh, geo, result.index, BABYLON);
          const detail = buildEdgeDetail(geo, result.index, pickedMesh.uniqueId);
          selectionSetRef.current.set(key, { mode: "edge", id: key, meshUniqueId: pickedMesh.uniqueId, disposables, detail });
        }
        pushToStore();
      }

      function handleVertexPick(pickResult, ctrlKey, pointerX, pointerY) {
        const pickedMesh = pickResult.pickedMesh;
        if (!pickedMesh || !pickResult.pickedPoint) return;
        const sourceMesh = getSourceMesh(pickedMesh);
        const geo = meshGeoMapRef.current.get(sourceMesh);
        if (!geo || !geo.vertices) return;

        const engine = engineRef.current;
        const camera = cameraRef.current;
        if (!engine || !camera) return;

        const localPt = worldToLocal(pickResult.pickedPoint, pickedMesh, BABYLON);
        const result = pickOcctClosestVertex({
          pickedMesh,
          geometry: geo,
          localPoint: localPt,
          pointerX,
          pointerY,
          scene,
          camera,
          engine,
          BABYLON,
        });
        if (!result) return;

        const key = `vertex:${pickedMesh.uniqueId}:${result.index}`;

        if (ctrlKey) {
          if (selectionSetRef.current.has(key)) {
            removeSelection(key);
          } else {
            const disposables = createVertexHighlight(scene, pickedMesh, geo, result.index, camera, BABYLON);
            const detail = buildVertexDetail(geo, result.index, pickedMesh.uniqueId);
            selectionSetRef.current.set(key, { mode: "vertex", id: key, meshUniqueId: pickedMesh.uniqueId, disposables, detail });
          }
        } else {
          clearAll();
          const disposables = createVertexHighlight(scene, pickedMesh, geo, result.index, camera, BABYLON);
          const detail = buildVertexDetail(geo, result.index, pickedMesh.uniqueId);
          selectionSetRef.current.set(key, { mode: "vertex", id: key, meshUniqueId: pickedMesh.uniqueId, disposables, detail });
        }
        pushToStore();
      }

      // -----------------------------------------------------------------------
      // Hover system
      // -----------------------------------------------------------------------
      function clearHover() {
        if (hoverStateRef.current) {
          for (const d of hoverStateRef.current.disposables) d.dispose();
          hoverStateRef.current = null;
        }
        const canvas = engineRef.current?.getRenderingCanvas();
        if (canvas) canvas.style.cursor = "";
      }
      clearHoverRef.current = clearHover;

      function createVertexHoverHL(worldMatrix, vertex) {
        if (!vertex) return [];
        const coords = getOcctVertexCoords(vertex);
        if (!coords) return [];
        const localPt = new BABYLON.Vector3(coords.x, coords.y, coords.z);
        const worldPt = BABYLON.Vector3.TransformCoordinates(localPt, worldMatrix);
        const camera = cameraRef.current;
        if (!camera) return [];
        const marker = createScreenSpaceVertexMarker(scene, worldPt, camera, BABYLON, {
          markerType: "hover",
          coreColor: PICK_COLORS.hover,
          ringColor: new BABYLON.Color3(0.03, 0.04, 0.05),
          corePixelSize: 7.2,
          ringScale: 1.42,
          ringAlpha: 0.68,
          coreAlpha: 0.92,
        });
        return marker ? [marker] : [];
      }

      function processHover() {
        if (!hoverDirtyRef.current) return;
        hoverDirtyRef.current = false;

        const engine = engineRef.current;
        const camera = cameraRef.current;
        if (!scene || !engine || !camera) return;

        const pickResult = scene.pick(scene.pointerX, scene.pointerY);
        if (!pickResult.hit || !pickResult.pickedMesh) { clearHover(); return; }

        const pickedMesh = pickResult.pickedMesh;
        const sourceMesh = pickedMesh.sourceMesh || pickedMesh;
        const geo = meshGeoMapRef.current.get(sourceMesh);
        if (!geo) { clearHover(); return; }

        const pickMode = useViewerStore.getState().pickMode;
        let hoveredMode = null, hoveredId = null;

        if (pickMode === "face" && geo.triangleToFaceMap) {
          const triIndex = pickResult.faceId;
          if (triIndex >= 0 && triIndex < geo.triangleToFaceMap.length) {
            const faceId = geo.triangleToFaceMap[triIndex];
            if (faceId >= 1) { hoveredMode = "face"; hoveredId = faceId; }
          }
        } else if (pickMode === "edge") {
          const localPt = worldToLocal(pickResult.pickedPoint, pickedMesh, BABYLON);
          const threshold = getPickThreshold(engine, camera);
          const result = findClosestEdge(localPt, geo, threshold);
          if (result) { hoveredMode = "edge"; hoveredId = result.index; }
        } else if (pickMode === "vertex") {
          const localPt = worldToLocal(pickResult.pickedPoint, pickedMesh, BABYLON);
          const result = pickOcctClosestVertex({
            pickedMesh,
            geometry: geo,
            localPoint: localPt,
            pointerX: scene.pointerX,
            pointerY: scene.pointerY,
            scene,
            camera,
            engine,
            BABYLON,
          });
          if (result) { hoveredMode = "vertex"; hoveredId = result.index; }
        }

        if (hoveredId !== null) {
          const hoverKey = `${hoveredMode}:${pickedMesh.uniqueId}:${hoveredId}`;
          if (selectionSetRef.current.has(hoverKey)) {
            clearHover();
            const canvas = engineRef.current?.getRenderingCanvas();
            if (canvas) canvas.style.cursor = "pointer";
            return;
          }
        }

        // Early return if same item already highlighted
        if (hoveredId !== null && hoverStateRef.current?.mode === hoveredMode && hoverStateRef.current?.id === hoveredId) return;

        clearHover();
        if (hoveredId === null) return;

        let disposables = [];
        if (hoveredMode === "face") {
          disposables = createFaceHighlight(
            viewerRefs,
            pickedMesh,
            geo,
            hoveredId,
            BABYLON,
            faceTintStateRef.current,
            "hover",
          );
        } else if (hoveredMode === "edge") {
          disposables = createEdgeHighlight(viewerRefs, "hover", pickedMesh, geo, hoveredId, BABYLON);
        } else if (hoveredMode === "vertex") {
          const worldMatrix = pickedMesh.getWorldMatrix();
          const vertex = geo.vertices[hoveredId];
          if (vertex) disposables = createVertexHoverHL(worldMatrix, vertex);
        }

        hoverStateRef.current = { mode: hoveredMode, id: hoveredId, disposables };
        const canvas = engineRef.current?.getRenderingCanvas();
        if (canvas) canvas.style.cursor = "pointer";
      }

      // Wire hover events
      renderCanvas = engineRef.current?.getRenderingCanvas();
      if (renderCanvas) {
        pointerMoveHandler = () => { hoverDirtyRef.current = true; };
        pointerLeaveHandler = () => { clearHover(); hoverDirtyRef.current = false; };
        renderCanvas.addEventListener("pointermove", pointerMoveHandler);
        renderCanvas.addEventListener("pointerleave", pointerLeaveHandler);
      }
      hoverObserver = scene.onBeforeRenderObservable.add(processHover);
      refreshVertexPreview(scene, BABYLON);

      observer = scene.onPointerObservable.add((pointerInfo) => {
        const type = pointerInfo.type;

        if (type === BABYLON.PointerEventTypes.POINTERDOWN) {
          pointerClickTracker.onPointerDown(pointerInfo.event);
          return;
        }

        if (type === BABYLON.PointerEventTypes.POINTERUP) {
          const pointerUp = pointerClickTracker.consumePointerUp(pointerInfo.event);
          if (!pointerUp.tracked) return;

          // If dragged, don't trigger selection
          if (!pointerUp.click) return;

          clearHover();

          // Click on empty space → clear selection
          const pickResult = scene.pick(pointerInfo.event.offsetX, pointerInfo.event.offsetY);
          if (!pickResult || !pickResult.hit) {
            if (!pointerInfo.event.ctrlKey) {
              clearAll();
            }
            return;
          }

          const pickMode = useViewerStore.getState().pickMode;
          const ctrlKey = pointerInfo.event.ctrlKey;

          switch (pickMode) {
            case "face":
              handleFacePick(pickResult, ctrlKey);
              break;
            case "edge":
              handleEdgePick(pickResult, ctrlKey);
              break;
            case "vertex":
              handleVertexPick(
                pickResult,
                ctrlKey,
                pointerInfo.event.offsetX,
                pointerInfo.event.offsetY,
              );
              break;
          }
          return;
        }
      });
    }

    // Clear selection when pick mode changes
    const unsub = useViewerStore.subscribe(
      (state) => state.pickMode,
      () => {
        clearAllSelections();
        if (clearHoverRef.current) clearHoverRef.current();
        for (const disposable of vertexPreviewRef.current) {
          if (disposable && typeof disposable.dispose === "function") {
            disposable.dispose();
          }
        }
        vertexPreviewRef.current = [];
        const scene = sceneRef.current;
        const BABYLON = window.BABYLON;
        refreshVertexPreview(scene, BABYLON);
      }
    );

    return () => {
      clearInterval(intervalId);
      if (observer && sceneRef.current) {
        sceneRef.current.onPointerObservable.remove(observer);
      }
      if (hoverObserver && sceneRef.current) {
        sceneRef.current.onBeforeRenderObservable.remove(hoverObserver);
      }
      if (renderCanvas && pointerMoveHandler) {
        renderCanvas.removeEventListener("pointermove", pointerMoveHandler);
      }
      if (renderCanvas && pointerLeaveHandler) {
        renderCanvas.removeEventListener("pointerleave", pointerLeaveHandler);
      }
      clearAllSelections();
      if (clearHoverRef.current) clearHoverRef.current();
      for (const disposable of vertexPreviewRef.current) {
        if (disposable && typeof disposable.dispose === "function") {
          disposable.dispose();
        }
      }
      vertexPreviewRef.current = [];
      faceTintStateRef.current = new WeakMap();
      unsub();
    };
  }, [viewerRefs, clearAllSelections]);

  return { clearAllSelections };
}
