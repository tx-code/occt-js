// picking.js — Picking logic for Face, Edge, and Vertex modes
// Depends on globals: engine, camera, scene, meshGeoMap (set up by index.html after init)
// clearAllSelections is also available from this file as a global

// --- Color constants ---
const PICK_COLORS = {
  select: new BABYLON.Color3(0.3, 0.75, 1.0),
  selectEmissive: new BABYLON.Color3(0.1, 0.25, 0.4),
  hover: new BABYLON.Color3(0.96, 0.75, 0.14),
  edge: new BABYLON.Color3(0.3, 0.85, 1.0),
};

let pickMode = "face";

// --- Hover state ---
let hoverState = null; // { mode, id, sourceMesh, disposables[] }
let hoverDirty = false;

// --- Selection set ---
let selectionSet = new Map(); // key → { mode, id, sourceMesh, disposables[] }

function selectionKey(mode, meshUniqueId, elementId) {
  return `${mode}:${meshUniqueId}:${elementId}`;
}

function clearAllSelections() {
  for (const entry of selectionSet.values()) {
    for (const d of entry.disposables) d.dispose();
  }
  selectionSet.clear();
  document.getElementById("selectionPanel").style.display = "none";
}

function removeSelection(key) {
  const entry = selectionSet.get(key);
  if (entry) {
    for (const d of entry.disposables) d.dispose();
    selectionSet.delete(key);
  }
}

function addSelection(mode, sourceMesh, elementId, disposables) {
  const key = selectionKey(mode, sourceMesh.uniqueId, elementId);
  removeSelection(key);
  selectionSet.set(key, { mode, id: elementId, sourceMesh, disposables });
}

// --- Geometry math ---

function pointToSegmentDistanceSq(px, py, pz, ax, ay, az, bx, by, bz) {
  const dx = bx - ax, dy = by - ay, dz = bz - az;
  const lenSq = dx * dx + dy * dy + dz * dz;
  if (lenSq === 0) {
    const ex = px - ax, ey = py - ay, ez = pz - az;
    return ex * ex + ey * ey + ez * ez;
  }
  let t = ((px - ax) * dx + (py - ay) * dy + (pz - az) * dz) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx - px;
  const cy = ay + t * dy - py;
  const cz = az + t * dz - pz;
  return cx * cx + cy * cy + cz * cz;
}

function distanceToEdgePolyline(px, py, pz, points) {
  let minDistSq = Infinity;
  for (let i = 0; i + 5 < points.length; i += 3) {
    const distSq = pointToSegmentDistanceSq(
      px, py, pz,
      points[i],     points[i + 1], points[i + 2],
      points[i + 3], points[i + 4], points[i + 5]
    );
    if (distSq < minDistSq) minDistSq = distSq;
  }
  return Math.sqrt(minDistSq);
}

function distanceToVertex(px, py, pz, pos) {
  const dx = px - pos[0], dy = py - pos[1], dz = pz - pos[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function getPickThreshold() {
  return (5 / engine.getRenderHeight()) * camera.radius * 2;
}

function worldToLocal(worldPoint, pickedMesh) {
  const invWorld = new BABYLON.Matrix();
  pickedMesh.getWorldMatrix().invertToRef(invWorld);
  return BABYLON.Vector3.TransformCoordinates(worldPoint, invWorld);
}

// --- Find closest edge / vertex ---

function findClosestEdge(localPoint, geo, threshold) {
  if (!geo.edges || geo.edges.length === 0) return null;
  const px = localPoint.x, py = localPoint.y, pz = localPoint.z;
  let bestId = null, bestDist = threshold;
  for (const edge of geo.edges) {
    if (!edge.points || edge.points.length < 6) continue;
    const dist = distanceToEdgePolyline(px, py, pz, edge.points);
    if (dist < bestDist) {
      bestDist = dist;
      bestId = edge.id;
    }
  }
  return bestId;
}

function findClosestVertex(localPoint, geo, threshold) {
  if (!geo.vertices || geo.vertices.length === 0) return null;
  const px = localPoint.x, py = localPoint.y, pz = localPoint.z;
  let bestId = null, bestDist = threshold;
  for (const vertex of geo.vertices) {
    if (!vertex.position) continue;
    const dist = distanceToVertex(px, py, pz, vertex.position);
    if (dist < bestDist) {
      bestDist = dist;
      bestId = vertex.id;
    }
  }
  return bestId;
}

// --- Highlight creation helpers ---

// Transform a local-space point by a world matrix, returns BABYLON.Vector3
function transformPoint(x, y, z, worldMatrix) {
  return BABYLON.Vector3.TransformCoordinates(new BABYLON.Vector3(x, y, z), worldMatrix);
}

function createEdgeHighlight(worldMatrix, edge, color) {
  if (!edge.points || edge.points.length < 6) return null;
  const pts = edge.points;
  const line = [];
  for (let i = 0; i < pts.length; i += 3) {
    line.push(transformPoint(pts[i], pts[i + 1], pts[i + 2], worldMatrix));
  }
  const lineSystem = BABYLON.MeshBuilder.CreateLineSystem(
    "__highlight_edge__",
    { lines: [line] },
    scene
  );
  lineSystem.color = color;
  lineSystem.isPickable = false;
  lineSystem.renderingGroupId = 1;
  return lineSystem;
}

function createVertexHighlight(worldMatrix, vertex, color) {
  const sphere = BABYLON.MeshBuilder.CreateSphere(
    "__highlight_vertex__",
    { diameter: camera.radius * 0.008 },
    scene
  );
  const wp = transformPoint(vertex.position[0], vertex.position[1], vertex.position[2], worldMatrix);
  sphere.position = wp;
  sphere.isPickable = false;
  sphere.renderingGroupId = 1;

  const usedColor = color || PICK_COLORS.select;
  const mat = new BABYLON.StandardMaterial("mat_vertex_highlight", scene);
  mat.diffuseColor = usedColor;
  mat.emissiveColor = color ? new BABYLON.Color3(usedColor.r * 0.4, usedColor.g * 0.4, usedColor.b * 0.4) : PICK_COLORS.selectEmissive;
  mat.backFaceCulling = false;
  sphere.material = mat;

  return sphere;
}

// --- Disposable factory functions ---

function createFaceSelectDisposables(worldMatrix, face, geo) {
  const disposables = [];
  // Face overlay mesh — transform vertices to world space
  const srcPositions = geo.positions, srcNormals = geo.normals, srcIndices = geo.indices;
  const normalMatrix = new BABYLON.Matrix();
  worldMatrix.toNormalMatrix(normalMatrix);

  const indexRemap = new Map();
  const positions = [], normals = [], indices = [];
  for (let i = face.firstIndex; i < face.firstIndex + face.indexCount; i++) {
    const idx = srcIndices[i];
    if (!indexRemap.has(idx)) {
      const newIdx = indexRemap.size;
      indexRemap.set(idx, newIdx);
      const wp = transformPoint(srcPositions[idx*3], srcPositions[idx*3+1], srcPositions[idx*3+2], worldMatrix);
      positions.push(wp.x, wp.y, wp.z);
      if (srcNormals && srcNormals.length) {
        const wn = BABYLON.Vector3.TransformNormal(
          new BABYLON.Vector3(srcNormals[idx*3], srcNormals[idx*3+1], srcNormals[idx*3+2]), worldMatrix);
        wn.normalize();
        normals.push(wn.x, wn.y, wn.z);
      }
    }
    indices.push(indexRemap.get(idx));
  }
  const hlMesh = new BABYLON.Mesh("__hl_face__", scene);
  // No parent — positioned in world space
  const vd = new BABYLON.VertexData();
  vd.positions = new Float32Array(positions);
  vd.indices = new Uint32Array(indices);
  if (normals.length) vd.normals = new Float32Array(normals);
  vd.applyToMesh(hlMesh);
  const mat = new BABYLON.StandardMaterial("__hl_mat__", scene);
  mat.diffuseColor = PICK_COLORS.select;
  mat.emissiveColor = PICK_COLORS.selectEmissive;
  mat.alpha = 0.6; mat.backFaceCulling = false; mat.zOffset = -1;
  hlMesh.material = mat; hlMesh.isPickable = false; hlMesh.renderingGroupId = 1;
  disposables.push(hlMesh, mat);
  // Boundary edges
  if (face.edgeIndices && geo.edges) {
    for (const ei of face.edgeIndices) {
      const hl = createEdgeHighlight(worldMatrix, geo.edges[ei], PICK_COLORS.edge);
      if (hl) disposables.push(hl);
    }
  }
  return disposables;
}

function createEdgeSelectDisposables(worldMatrix, edge) {
  const hl = createEdgeHighlight(worldMatrix, edge, PICK_COLORS.select);
  return hl ? [hl] : [];
}

function createVertexSelectDisposables(worldMatrix, vertex) {
  const hl = createVertexHighlight(worldMatrix, vertex, PICK_COLORS.select);
  return hl ? [hl] : [];
}

// --- Info panel ---

function showSelectionInfo(title, rows) {
  document.getElementById("selectionTitle").textContent = title;
  document.getElementById("selectionContent").innerHTML = rows
    .map(([l, v]) => `<div class="row"><span class="label">${l}</span><span class="value">${v}</span></div>`)
    .join("");
  document.getElementById("selectionPanel").style.display = "";
}

// --- Navigation link helpers ---

function attachFaceLinks() {
  document.querySelectorAll("#selectionContent .face-link").forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const faceId = parseInt(link.dataset.faceId);
      const meshId = parseInt(link.dataset.meshId);
      const targetMesh = [...meshGeoMap.keys()].find(m => m.uniqueId === meshId);
      if (!targetMesh) return;

      // Switch to Face mode
      pickMode = "face";
      document.querySelectorAll("#selectMode button[data-mode]").forEach(b => b.classList.remove("active"));
      document.getElementById("modeFace").classList.add("active");

      // Select the face
      clearAllSelections();
      const geo = meshGeoMap.get(targetMesh);
      const face = geo && geo.faces && geo.faces.find(f => f.id === faceId);
      if (face) {
        const wm = targetMesh.getWorldMatrix();
        addSelection("face", targetMesh, faceId, createFaceSelectDisposables(wm, face, geo));
        updateSelectionPanel();
      }
    });
  });
}

// --- Per-element info display functions ---

function showFaceInfo(sourceMesh, face, geo) {
  const faceId = face.id;
  const triCount = face.indexCount / 3;
  const edgeCount = (face.edgeIndices || []).length;
  const colorStr = face.color
    ? `rgb(${(face.color.r * 255) | 0}, ${(face.color.g * 255) | 0}, ${(face.color.b * 255) | 0})`
    : "none";

  const rows = [
    ["Face ID", faceId],
    ["Triangles", triCount],
    ["Boundary Edges", edgeCount],
    ["Color", `<span style="display:inline-block;width:12px;height:12px;border-radius:2px;background:${colorStr};vertical-align:middle;border:1px solid #555"></span> ${colorStr}`],
  ];

  // Find adjacent faces via shared edges
  if (face.edgeIndices && geo.edges) {
    const adjacentFaces = new Set();
    for (const ei of face.edgeIndices) {
      const edge = geo.edges[ei];
      if (edge && edge.ownerFaceIds) {
        for (const fid of edge.ownerFaceIds) {
          if (fid !== faceId) adjacentFaces.add(fid);
        }
      }
    }
    if (adjacentFaces.size > 0) {
      const adjacentIds = Array.from(adjacentFaces).sort((a, b) => a - b);
      const adjacentHtml = adjacentIds.map(fid =>
        `<a href="#" class="face-link" data-face-id="${fid}" data-mesh-id="${sourceMesh.uniqueId}" style="color:#4cc9f0;cursor:pointer;text-decoration:none">${fid}</a>`
      ).join(", ");
      rows.push(["Adjacent Faces", adjacentHtml]);
    }
  }

  showSelectionInfo("Selected Face", rows);
  attachFaceLinks();
}

function showEdgeInfo(sourceMesh, edge) {
  const ptCount = edge.points ? edge.points.length / 3 : 0;
  const ownerHtml = (edge.ownerFaceIds && edge.ownerFaceIds.length > 0)
    ? edge.ownerFaceIds.map(fid =>
        `<a href="#" class="face-link" data-face-id="${fid}" data-mesh-id="${sourceMesh.uniqueId}" style="color:#4cc9f0;cursor:pointer;text-decoration:none">${fid}</a>`
      ).join(", ")
    : "none";

  const rows = [
    ["Edge ID", edge.id],
    ["Points", ptCount],
    ["Free Edge", edge.isFreeEdge ? "yes" : "no"],
    ["Owner Faces", ownerHtml],
  ];

  showSelectionInfo("Selected Edge", rows);
  attachFaceLinks();
}

function showVertexInfo(vertex) {
  const rows = [
    ["Vertex ID", vertex.id],
    ["X", vertex.position[0].toFixed(2)],
    ["Y", vertex.position[1].toFixed(2)],
    ["Z", vertex.position[2].toFixed(2)],
  ];

  showSelectionInfo("Selected Vertex", rows);
}

// --- Update selection panel (used by multi-select) ---

function updateSelectionPanel() {
  if (selectionSet.size === 0) {
    document.getElementById("selectionPanel").style.display = "none";
    return;
  }

  if (selectionSet.size === 1) {
    const entry = selectionSet.values().next().value;
    const geo = meshGeoMap.get(entry.sourceMesh);
    if (!geo) return;

    if (entry.mode === "face") {
      const face = geo.faces && geo.faces.find(f => f.id === entry.id);
      if (face) showFaceInfo(entry.sourceMesh, face, geo);
    } else if (entry.mode === "edge") {
      const edge = geo.edges && geo.edges.find(e => e.id === entry.id);
      if (edge) showEdgeInfo(entry.sourceMesh, edge);
    } else if (entry.mode === "vertex") {
      const vertex = geo.vertices && geo.vertices.find(v => v.id === entry.id);
      if (vertex) showVertexInfo(vertex);
    }
  } else {
    // Multi-select summary
    const counts = { face: 0, edge: 0, vertex: 0 };
    for (const entry of selectionSet.values()) counts[entry.mode]++;
    const parts = [];
    if (counts.face) parts.push(`${counts.face} face${counts.face > 1 ? "s" : ""}`);
    if (counts.edge) parts.push(`${counts.edge} edge${counts.edge > 1 ? "s" : ""}`);
    if (counts.vertex) parts.push(`${counts.vertex} ${counts.vertex > 1 ? "vertices" : "vertex"}`);

    showSelectionInfo(`${selectionSet.size} Selected`, [["Items", parts.join(", ")]]);
  }
}

// --- Legacy highlight functions (kept for backward compatibility with direct calls) ---

function highlightEdge(sourceMesh, edgeId) {
  clearAllSelections();
  const geo = meshGeoMap.get(sourceMesh);
  if (!geo || !geo.edges) return;

  const edge = geo.edges.find(e => e.id === edgeId);
  if (!edge) return;

  const worldMatrix = sourceMesh.getWorldMatrix();
  addSelection("edge", sourceMesh, edgeId, createEdgeSelectDisposables(worldMatrix, edge));
  updateSelectionPanel();
}

function highlightVertex(sourceMesh, vertexId) {
  clearAllSelections();
  const geo = meshGeoMap.get(sourceMesh);
  if (!geo || !geo.vertices) return;

  const vertex = geo.vertices.find(v => v.id === vertexId);
  if (!vertex || !vertex.position) return;

  const worldMatrix = sourceMesh.getWorldMatrix();
  addSelection("vertex", sourceMesh, vertexId, createVertexSelectDisposables(worldMatrix, vertex));
  updateSelectionPanel();
}

// --- Hover ---

function clearHover() {
  if (hoverState) {
    for (const d of hoverState.disposables) d.dispose();
    hoverState = null;
  }
  document.getElementById("renderCanvas").style.cursor = "";
}

function createFaceHoverHighlight(worldMatrix, face, geo) {
  const disposables = [];
  if (face.edgeIndices && geo.edges) {
    for (const ei of face.edgeIndices) {
      const edge = geo.edges[ei];
      const hl = createEdgeHighlight(worldMatrix, edge, PICK_COLORS.hover);
      if (hl) disposables.push(hl);
    }
  }
  return disposables;
}

function createEdgeHoverHighlight(worldMatrix, edge) {
  const hl = createEdgeHighlight(worldMatrix, edge, PICK_COLORS.hover);
  return hl ? [hl] : [];
}

function createVertexHoverHighlight(worldMatrix, vertex) {
  const hl = createVertexHighlight(worldMatrix, vertex, PICK_COLORS.hover);
  return hl ? [hl] : [];
}

function processHover() {
  if (!hoverDirty) return;
  hoverDirty = false;

  const pickResult = scene.pick(scene.pointerX, scene.pointerY);

  if (!pickResult.hit || !pickResult.pickedMesh) {
    clearHover();
    return;
  }

  const pickedMesh = pickResult.pickedMesh;
  const sourceMesh = pickedMesh.sourceMesh || pickedMesh;
  const geo = meshGeoMap.get(sourceMesh);
  if (!geo) { clearHover(); return; }

  const worldMatrix = pickedMesh.getWorldMatrix();

  // Step 1: Determine hovered element (no GPU work yet)
  let hoveredMode = null, hoveredId = null;

  if (pickMode === "face") {
    if (geo.triangleToFaceMap) {
      const triIndex = pickResult.faceId;
      if (triIndex >= 0 && triIndex < geo.triangleToFaceMap.length) {
        const faceId = geo.triangleToFaceMap[triIndex];
        if (faceId >= 1) { hoveredMode = "face"; hoveredId = faceId; }
      }
    }
  } else if (pickMode === "edge") {
    const localPt = worldToLocal(pickResult.pickedPoint, pickedMesh);
    const edgeId = findClosestEdge(localPt, geo, getPickThreshold());
    if (edgeId) { hoveredMode = "edge"; hoveredId = edgeId; }
  } else if (pickMode === "vertex") {
    const localPt = worldToLocal(pickResult.pickedPoint, pickedMesh);
    const vertexId = findClosestVertex(localPt, geo, getPickThreshold());
    if (vertexId) { hoveredMode = "vertex"; hoveredId = vertexId; }
  }

  // Step 2: Early return if hovering same item
  if (hoveredId && hoverState && hoverState.mode === hoveredMode && hoverState.id === hoveredId) {
    return;
  }

  clearHover();
  if (!hoveredId) return;

  // Step 3: Create GPU disposables in world space
  let disposables = [];
  if (hoveredMode === "face") {
    const face = geo.faces.find(f => f.id === hoveredId);
    if (face) disposables = createFaceHoverHighlight(worldMatrix, face, geo);
  } else if (hoveredMode === "edge") {
    const edge = geo.edges.find(e => e.id === hoveredId);
    if (edge) disposables = createEdgeHoverHighlight(worldMatrix, edge);
  } else if (hoveredMode === "vertex") {
    const vertex = geo.vertices.find(v => v.id === hoveredId);
    if (vertex) disposables = createVertexHoverHighlight(worldMatrix, vertex);
  }

  hoverState = { mode: hoveredMode, id: hoveredId, sourceMesh, disposables };
  document.getElementById("renderCanvas").style.cursor = "pointer";
}
