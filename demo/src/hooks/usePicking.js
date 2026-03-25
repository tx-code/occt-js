// demo/src/hooks/usePicking.js
import { useEffect, useRef, useCallback } from "react";
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
  PICK_COLORS.select = new BABYLON.Color3(0.3, 0.75, 1.0);
  PICK_COLORS.selectEmissive = new BABYLON.Color3(0.1, 0.25, 0.4);
  PICK_COLORS.hover = new BABYLON.Color3(0.96, 0.75, 0.14);
  PICK_COLORS.edge = new BABYLON.Color3(0.3, 0.85, 1.0);
}

const DRAG_THRESHOLD_PX = 5;

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

function distanceToVertex(px, py, pz, vx, vy, vz) {
  const dx = px - vx, dy = py - vy, dz = pz - vz;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function getPickThreshold(engine, camera) {
  return (5 / engine.getRenderHeight()) * camera.radius * 2;
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

function findClosestVertex(localPt, geo, threshold) {
  if (!geo.vertices || geo.vertices.length === 0) return null;
  let bestVtx = null;
  let bestDist = Infinity;
  for (let i = 0; i < geo.vertices.length; i++) {
    const v = geo.vertices[i];
    const d = distanceToVertex(localPt.x, localPt.y, localPt.z, v.x, v.y, v.z);
    if (d < bestDist) {
      bestDist = d;
      bestVtx = { index: i, vertex: v, dist: d };
    }
  }
  if (bestVtx && bestVtx.dist < threshold) return bestVtx;
  return null;
}

// ---------------------------------------------------------------------------
// Highlight builders (all in WORLD SPACE)
// ---------------------------------------------------------------------------

function createFaceHighlight(scene, pickedMesh, geo, faceId, BABYLON) {
  ensureColors(BABYLON);
  const face = geo.faces[faceId - 1]; // faceId is 1-based, array is 0-based
  if (!face) return [];
  const disposables = [];
  const worldMatrix = pickedMesh.getWorldMatrix();

  // --- Face overlay mesh ---
  const indices = new Uint32Array(geo.indices);
  const positions = new Float32Array(geo.positions);
  const normals = geo.normals ? new Float32Array(geo.normals) : null;

  const faceIndices = [];
  const vertexMap = new Map();
  let newIdx = 0;
  for (let i = face.firstIndex; i < face.firstIndex + face.indexCount; i++) {
    const origIdx = indices[i];
    if (!vertexMap.has(origIdx)) {
      vertexMap.set(origIdx, newIdx++);
    }
    faceIndices.push(vertexMap.get(origIdx));
  }

  const newPositions = new Float32Array(vertexMap.size * 3);
  const newNormals = normals ? new Float32Array(vertexMap.size * 3) : null;
  for (const [origIdx, ni] of vertexMap.entries()) {
    newPositions[ni * 3] = positions[origIdx * 3];
    newPositions[ni * 3 + 1] = positions[origIdx * 3 + 1];
    newPositions[ni * 3 + 2] = positions[origIdx * 3 + 2];
    if (newNormals) {
      newNormals[ni * 3] = normals[origIdx * 3];
      newNormals[ni * 3 + 1] = normals[origIdx * 3 + 1];
      newNormals[ni * 3 + 2] = normals[origIdx * 3 + 2];
    }
  }

  // Transform positions to world space
  for (let i = 0; i < newPositions.length; i += 3) {
    const v = new BABYLON.Vector3(newPositions[i], newPositions[i + 1], newPositions[i + 2]);
    const w = BABYLON.Vector3.TransformCoordinates(v, worldMatrix);
    newPositions[i] = w.x;
    newPositions[i + 1] = w.y;
    newPositions[i + 2] = w.z;
  }
  if (newNormals) {
    const normalMatrix = worldMatrix.clone();
    normalMatrix.setTranslation(BABYLON.Vector3.Zero());
    for (let i = 0; i < newNormals.length; i += 3) {
      const v = new BABYLON.Vector3(newNormals[i], newNormals[i + 1], newNormals[i + 2]);
      const w = BABYLON.Vector3.TransformCoordinates(v, normalMatrix);
      w.normalize();
      newNormals[i] = w.x;
      newNormals[i + 1] = w.y;
      newNormals[i + 2] = w.z;
    }
  }

  const overlay = new BABYLON.Mesh("sel_face_" + faceId, scene);
  const vd = new BABYLON.VertexData();
  vd.positions = newPositions;
  vd.indices = new Uint32Array(faceIndices);
  if (newNormals) vd.normals = newNormals;
  vd.applyToMesh(overlay);

  const mat = new BABYLON.StandardMaterial("sel_face_mat_" + faceId, scene);
  mat.diffuseColor = PICK_COLORS.select;
  mat.emissiveColor = PICK_COLORS.selectEmissive;
  mat.alpha = 0.6;
  mat.backFaceCulling = false;
  overlay.material = mat;
  overlay.isPickable = false;
  // Slight offset to prevent z-fighting
  overlay.position = new BABYLON.Vector3(0, 0, 0);
  disposables.push(overlay, mat);

  // --- Boundary edge lines ---
  if (face.boundaryEdges && face.boundaryEdges.length > 0 && geo.edges) {
    const edgeLines = [];
    for (const eIdx of face.boundaryEdges) {
      const edge = geo.edges[eIdx];
      if (!edge || !edge.points || edge.points.length < 6) continue;
      const pts = edge.points;
      const line = [];
      for (let i = 0; i < pts.length; i += 3) {
        const v = new BABYLON.Vector3(pts[i], pts[i + 1], pts[i + 2]);
        const w = BABYLON.Vector3.TransformCoordinates(v, worldMatrix);
        line.push(w);
      }
      edgeLines.push(line);
    }
    if (edgeLines.length > 0) {
      const ls = BABYLON.MeshBuilder.CreateLineSystem("sel_face_edges_" + faceId, { lines: edgeLines }, scene);
      ls.color = PICK_COLORS.edge;
      ls.isPickable = false;
      disposables.push(ls);
    }
  }

  return disposables;
}

function createEdgeHighlight(scene, pickedMesh, geo, edgeIndex, BABYLON) {
  ensureColors(BABYLON);
  const edge = geo.edges[edgeIndex];
  if (!edge || !edge.points || edge.points.length < 6) return [];
  const worldMatrix = pickedMesh.getWorldMatrix();
  const pts = edge.points;
  const line = [];
  for (let i = 0; i < pts.length; i += 3) {
    const v = new BABYLON.Vector3(pts[i], pts[i + 1], pts[i + 2]);
    const w = BABYLON.Vector3.TransformCoordinates(v, worldMatrix);
    line.push(w);
  }
  const ls = BABYLON.MeshBuilder.CreateLineSystem("sel_edge_" + edgeIndex, { lines: [line] }, scene);
  ls.color = PICK_COLORS.edge;
  ls.isPickable = false;
  return [ls];
}

function createVertexHighlight(scene, pickedMesh, geo, vertexIndex, camera, BABYLON) {
  ensureColors(BABYLON);
  const v = geo.vertices[vertexIndex];
  if (!v) return [];
  const worldMatrix = pickedMesh.getWorldMatrix();
  const localPt = new BABYLON.Vector3(v.x, v.y, v.z);
  const worldPt = BABYLON.Vector3.TransformCoordinates(localPt, worldMatrix);
  const diameter = camera.radius * 0.008;
  const sphere = BABYLON.MeshBuilder.CreateSphere("sel_vtx_" + vertexIndex, { diameter }, scene);
  sphere.position = worldPt;
  const mat = new BABYLON.StandardMaterial("sel_vtx_mat_" + vertexIndex, scene);
  mat.diffuseColor = PICK_COLORS.select;
  mat.emissiveColor = PICK_COLORS.selectEmissive;
  sphere.material = mat;
  sphere.isPickable = false;
  return [sphere, mat];
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
    boundaryEdges: face.boundaryEdges || [],
    color: face.color || geo.color || null,
    adjacentFaces: face.adjacentFaces || [],
  };
  return { mode: "face", id: `face:${meshUniqueId}:${faceId}`, meshUniqueId, info };
}

function buildEdgeDetail(geo, edgeIndex, meshUniqueId) {
  const edge = geo.edges[edgeIndex];
  if (!edge) return null;
  const info = {
    edgeId: edgeIndex,
    pointCount: edge.points ? edge.points.length / 3 : 0,
    freeEdge: edge.freeEdge || false,
    ownerFaces: edge.ownerFaces || [],
  };
  return { mode: "edge", id: `edge:${meshUniqueId}:${edgeIndex}`, meshUniqueId, info };
}

function buildVertexDetail(geo, vertexIndex, meshUniqueId) {
  const v = geo.vertices[vertexIndex];
  if (!v) return null;
  const info = {
    vertexId: vertexIndex,
    x: v.x,
    y: v.y,
    z: v.z,
  };
  return { mode: "vertex", id: `vertex:${meshUniqueId}:${vertexIndex}`, meshUniqueId, info };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function usePicking(viewerRefs) {
  const selectionSetRef = useRef(new Map()); // key → { mode, id, meshUniqueId, disposables[] }
  const hoverStateRef = useRef(null); // { mode, id, disposables[] }
  const hoverDirtyRef = useRef(false);
  const clearHoverRef = useRef(null); // set when setup() runs

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
    const { engineRef, sceneRef, cameraRef, meshGeoMapRef } = viewerRefs;

    // Wait for scene to be ready
    const intervalId = setInterval(() => {
      const scene = sceneRef.current;
      if (!scene) return;
      clearInterval(intervalId);
      setup(scene);
    }, 100);

    let observer = null;

    function setup(scene) {
      const BABYLON = window.BABYLON;
      if (!BABYLON) return;
      ensureColors(BABYLON);

      let pointerDownPos = null;

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

      function getSourceMesh(pickedMesh) {
        // For instances, get the source mesh which has the geometry data
        if (pickedMesh.sourceMesh) return pickedMesh.sourceMesh;
        return pickedMesh;
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
            const disposables = createFaceHighlight(scene, pickedMesh, geo, faceId, BABYLON);
            const detail = buildFaceDetail(geo, faceId, pickedMesh.uniqueId);
            selectionSetRef.current.set(key, { mode: "face", id: key, meshUniqueId: pickedMesh.uniqueId, disposables, detail });
          }
        } else {
          clearAll();
          const disposables = createFaceHighlight(scene, pickedMesh, geo, faceId, BABYLON);
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
            const disposables = createEdgeHighlight(scene, pickedMesh, geo, result.index, BABYLON);
            const detail = buildEdgeDetail(geo, result.index, pickedMesh.uniqueId);
            selectionSetRef.current.set(key, { mode: "edge", id: key, meshUniqueId: pickedMesh.uniqueId, disposables, detail });
          }
        } else {
          clearAll();
          const disposables = createEdgeHighlight(scene, pickedMesh, geo, result.index, BABYLON);
          const detail = buildEdgeDetail(geo, result.index, pickedMesh.uniqueId);
          selectionSetRef.current.set(key, { mode: "edge", id: key, meshUniqueId: pickedMesh.uniqueId, disposables, detail });
        }
        pushToStore();
      }

      function handleVertexPick(pickResult, ctrlKey) {
        const pickedMesh = pickResult.pickedMesh;
        if (!pickedMesh || !pickResult.pickedPoint) return;
        const sourceMesh = getSourceMesh(pickedMesh);
        const geo = meshGeoMapRef.current.get(sourceMesh);
        if (!geo || !geo.vertices) return;

        const engine = engineRef.current;
        const camera = cameraRef.current;
        if (!engine || !camera) return;

        const localPt = worldToLocal(pickResult.pickedPoint, pickedMesh, BABYLON);
        const threshold = getPickThreshold(engine, camera);
        const result = findClosestVertex(localPt, geo, threshold);
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

      function createEdgeHoverLine(worldMatrix, edge) {
        if (!edge || !edge.points || edge.points.length < 6) return null;
        const pts = edge.points;
        const line = [];
        for (let i = 0; i < pts.length; i += 3) {
          const v = new BABYLON.Vector3(pts[i], pts[i + 1], pts[i + 2]);
          const w = BABYLON.Vector3.TransformCoordinates(v, worldMatrix);
          line.push(w);
        }
        const ls = BABYLON.MeshBuilder.CreateLineSystem("hover_edge_" + Math.random(), { lines: [line] }, scene);
        ls.color = PICK_COLORS.hover;
        ls.isPickable = false;
        return ls;
      }

      function createFaceHoverHL(worldMatrix, face, geo) {
        const disposables = [];
        if (face.boundaryEdges && face.boundaryEdges.length > 0 && geo.edges) {
          for (const ei of face.boundaryEdges) {
            const hl = createEdgeHoverLine(worldMatrix, geo.edges[ei]);
            if (hl) disposables.push(hl);
          }
        }
        return disposables;
      }

      function createEdgeHoverHL(worldMatrix, edge) {
        const hl = createEdgeHoverLine(worldMatrix, edge);
        return hl ? [hl] : [];
      }

      function createVertexHoverHL(worldMatrix, vertex) {
        if (!vertex) return [];
        const localPt = new BABYLON.Vector3(vertex.x, vertex.y, vertex.z);
        const worldPt = BABYLON.Vector3.TransformCoordinates(localPt, worldMatrix);
        const camera = cameraRef.current;
        const diameter = camera ? camera.radius * 0.008 : 0.01;
        const sphere = BABYLON.MeshBuilder.CreateSphere("hover_vtx_" + Math.random(), { diameter }, scene);
        sphere.position = worldPt;
        const mat = new BABYLON.StandardMaterial("hover_vtx_mat_" + Math.random(), scene);
        mat.diffuseColor = PICK_COLORS.hover;
        mat.emissiveColor = PICK_COLORS.hover;
        sphere.material = mat;
        sphere.isPickable = false;
        return [sphere, mat];
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
          const threshold = getPickThreshold(engine, camera);
          const result = findClosestVertex(localPt, geo, threshold);
          if (result) { hoveredMode = "vertex"; hoveredId = result.index; }
        }

        // Early return if same item already highlighted
        if (hoveredId !== null && hoverStateRef.current?.mode === hoveredMode && hoverStateRef.current?.id === hoveredId) return;

        clearHover();
        if (hoveredId === null) return;

        const worldMatrix = pickedMesh.getWorldMatrix();
        let disposables = [];
        if (hoveredMode === "face") {
          const face = geo.faces[hoveredId - 1]; // hoveredId is 1-based
          if (face) disposables = createFaceHoverHL(worldMatrix, face, geo);
        } else if (hoveredMode === "edge") {
          const edge = geo.edges[hoveredId];
          if (edge) disposables = createEdgeHoverHL(worldMatrix, edge);
        } else if (hoveredMode === "vertex") {
          const vertex = geo.vertices[hoveredId];
          if (vertex) disposables = createVertexHoverHL(worldMatrix, vertex);
        }

        hoverStateRef.current = { mode: hoveredMode, id: hoveredId, disposables };
        const canvas = engineRef.current?.getRenderingCanvas();
        if (canvas) canvas.style.cursor = "pointer";
      }

      // Wire hover events
      const renderCanvas = engineRef.current?.getRenderingCanvas();
      if (renderCanvas) {
        renderCanvas.addEventListener("pointermove", () => { hoverDirtyRef.current = true; });
        renderCanvas.addEventListener("pointerleave", () => { clearHover(); hoverDirtyRef.current = false; });
      }
      scene.onBeforeRenderObservable.add(processHover);

      observer = scene.onPointerObservable.add((pointerInfo) => {
        const type = pointerInfo.type;

        if (type === BABYLON.PointerEventTypes.POINTERDOWN) {
          pointerDownPos = { x: pointerInfo.event.clientX, y: pointerInfo.event.clientY };
          return;
        }

        if (type === BABYLON.PointerEventTypes.POINTERUP) {
          if (!pointerDownPos) return;
          const dx = pointerInfo.event.clientX - pointerDownPos.x;
          const dy = pointerInfo.event.clientY - pointerDownPos.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          pointerDownPos = null;

          // If dragged, don't trigger selection
          if (dist > DRAG_THRESHOLD_PX) return;

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
              handleVertexPick(pickResult, ctrlKey);
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
      }
    );

    return () => {
      clearInterval(intervalId);
      if (observer && sceneRef.current) {
        sceneRef.current.onPointerObservable.remove(observer);
      }
      clearAllSelections();
      if (clearHoverRef.current) clearHoverRef.current();
      unsub();
    };
  }, [viewerRefs, clearAllSelections]);

  return { clearAllSelections };
}
