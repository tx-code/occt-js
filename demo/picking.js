// picking.js — Picking logic for Face, Edge, and Vertex modes
// Depends on globals: engine, camera, scene, meshGeoMap (set up by index.html after init)
// highlightMesh, highlightEdgeLines, clearSelection are also in index.html globals

// --- Color constants ---
const PICK_COLORS = {
  select: new BABYLON.Color3(0.3, 0.75, 1.0),
  selectEmissive: new BABYLON.Color3(0.1, 0.25, 0.4),
  hover: new BABYLON.Color3(0.96, 0.75, 0.14),
  edge: new BABYLON.Color3(0.3, 0.85, 1.0),
};

let pickMode = "face";

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

function createEdgeHighlight(sourceMesh, edge, color) {
  if (!edge.points || edge.points.length < 6) return null;
  const pts = edge.points;
  const line = [];
  for (let i = 0; i < pts.length; i += 3) {
    line.push(new BABYLON.Vector3(pts[i], pts[i + 1], pts[i + 2]));
  }
  const lineSystem = BABYLON.MeshBuilder.CreateLineSystem(
    "__highlight_edge__",
    { lines: [line] },
    scene
  );
  lineSystem.color = color;
  lineSystem.parent = sourceMesh;
  lineSystem.isPickable = false;
  lineSystem.renderingGroupId = 1;
  return lineSystem;
}

function createVertexHighlight(sourceMesh, vertex) {
  const sphere = BABYLON.MeshBuilder.CreateSphere(
    "__highlight_vertex__",
    { diameter: camera.radius * 0.008 },
    scene
  );
  sphere.position = new BABYLON.Vector3(
    vertex.position[0],
    vertex.position[1],
    vertex.position[2]
  );
  sphere.parent = sourceMesh;
  sphere.isPickable = false;
  sphere.renderingGroupId = 1;

  const mat = new BABYLON.StandardMaterial("mat_vertex_highlight", scene);
  mat.diffuseColor = PICK_COLORS.select;
  mat.emissiveColor = PICK_COLORS.selectEmissive;
  mat.backFaceCulling = false;
  sphere.material = mat;

  return sphere;
}

// --- Info panel ---

function showSelectionInfo(title, rows) {
  document.getElementById("selectionTitle").textContent = title;
  document.getElementById("selectionContent").innerHTML = rows
    .map(([l, v]) => `<div class="row"><span class="label">${l}</span><span class="value">${v}</span></div>`)
    .join("");
  document.getElementById("selectionPanel").style.display = "";
}

// --- Edge highlight & info ---

function highlightEdge(sourceMesh, edgeId) {
  clearSelection();
  const geo = meshGeoMap.get(sourceMesh);
  if (!geo || !geo.edges) return;

  const edge = geo.edges.find(e => e.id === edgeId);
  if (!edge) return;

  highlightEdgeLines = createEdgeHighlight(sourceMesh, edge, PICK_COLORS.edge);

  const ptCount = edge.points ? edge.points.length / 3 : 0;
  const ownerStr = (edge.ownerFaceIds && edge.ownerFaceIds.length > 0)
    ? edge.ownerFaceIds.join(", ")
    : "none";

  const rows = [
    ["Edge ID", edgeId],
    ["Points", ptCount],
    ["Free Edge", edge.isFreeEdge ? "yes" : "no"],
    ["Owner Faces", ownerStr],
  ];

  showSelectionInfo("Selected Edge", rows);
}

// --- Vertex highlight & info ---

function highlightVertex(sourceMesh, vertexId) {
  clearSelection();
  const geo = meshGeoMap.get(sourceMesh);
  if (!geo || !geo.vertices) return;

  const vertex = geo.vertices.find(v => v.id === vertexId);
  if (!vertex || !vertex.position) return;

  highlightMesh = createVertexHighlight(sourceMesh, vertex);

  const rows = [
    ["Vertex ID", vertexId],
    ["X", vertex.position[0].toFixed(2)],
    ["Y", vertex.position[1].toFixed(2)],
    ["Z", vertex.position[2].toFixed(2)],
  ];

  showSelectionInfo("Selected Vertex", rows);
}
