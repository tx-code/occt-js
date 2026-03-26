import { useEffect, useRef, useCallback } from "react";
import { useViewerStore } from "../store/viewerStore";

// ═══════════════════════════════════════════════════════════════════════════
// Camera angle presets for all 26 regions (6 faces + 12 edges + 8 corners)
// ═══════════════════════════════════════════════════════════════════════════
const PI = Math.PI;
const VIEWS = {
  front:  { alpha: -PI/2, beta: PI/2 },
  back:   { alpha:  PI/2, beta: PI/2 },
  top:    { alpha: -PI/2, beta: 0.01 },
  bottom: { alpha: -PI/2, beta: PI - 0.01 },
  left:   { alpha:  PI,   beta: PI/2 },
  right:  { alpha:  0,    beta: PI/2 },

  "front-top":    { alpha: -PI/2,    beta: PI/4 },
  "front-bottom": { alpha: -PI/2,    beta: 3*PI/4 },
  "front-left":   { alpha: -3*PI/4,  beta: PI/2 },
  "front-right":  { alpha: -PI/4,    beta: PI/2 },
  "back-top":     { alpha:  PI/2,    beta: PI/4 },
  "back-bottom":  { alpha:  PI/2,    beta: 3*PI/4 },
  "back-left":    { alpha:  3*PI/4,  beta: PI/2 },
  "back-right":   { alpha:  PI/4,    beta: PI/2 },
  "top-left":     { alpha:  PI,      beta: PI/4 },
  "top-right":    { alpha:  0,       beta: PI/4 },
  "bottom-left":  { alpha:  PI,      beta: 3*PI/4 },
  "bottom-right": { alpha:  0,       beta: 3*PI/4 },

  "front-top-left":     { alpha: -3*PI/4, beta: PI/4 },
  "front-top-right":    { alpha: -PI/4,   beta: PI/4 },
  "front-bottom-left":  { alpha: -3*PI/4, beta: 3*PI/4 },
  "front-bottom-right": { alpha: -PI/4,   beta: 3*PI/4 },
  "back-top-left":      { alpha:  3*PI/4, beta: PI/4 },
  "back-top-right":     { alpha:  PI/4,   beta: PI/4 },
  "back-bottom-left":   { alpha:  3*PI/4, beta: 3*PI/4 },
  "back-bottom-right":  { alpha:  PI/4,   beta: 3*PI/4 },
};

// ═══════════════════════════════════════════════════════════════════════════
// Cube geometry definitions (Y-up for Babylon.js)
// Ported from SceneGraph.net ViewCubeGeometry.cs, adapted Z-up -> Y-up
// ═══════════════════════════════════════════════════════════════════════════

// 8 cube vertices in normalized coordinates (-0.5 to 0.5), Y-up
const VERTICES = [
  [-0.5, -0.5, -0.5], // 0: FrontBottomLeft  (-X, -Y, -Z)
  [ 0.5, -0.5, -0.5], // 1: FrontBottomRight (+X, -Y, -Z)
  [-0.5,  0.5, -0.5], // 2: FrontTopLeft     (-X, +Y, -Z)
  [ 0.5,  0.5, -0.5], // 3: FrontTopRight    (+X, +Y, -Z)
  [-0.5, -0.5,  0.5], // 4: BackBottomLeft   (-X, -Y, +Z)
  [ 0.5, -0.5,  0.5], // 5: BackBottomRight  (+X, -Y, +Z)
  [-0.5,  0.5,  0.5], // 6: BackTopLeft      (-X, +Y, +Z)
  [ 0.5,  0.5,  0.5], // 7: BackTopRight     (+X, +Y, +Z)
];

// Vertex index → corner region name
const VERTEX_TO_CORNER = [
  "front-bottom-left",  // 0
  "front-bottom-right", // 1
  "front-top-left",     // 2
  "front-top-right",    // 3
  "back-bottom-left",   // 4
  "back-bottom-right",  // 5
  "back-top-left",      // 6
  "back-top-right",     // 7
];

// Face vertex indices (CCW winding when viewed from outside)
// Order: Front(-Z), Back(+Z), Top(+Y), Bottom(-Y), Left(-X), Right(+X)
const FACE_INDICES = [
  [0, 2, 3, 1], // 0: Front (-Z)
  [5, 7, 6, 4], // 1: Back  (+Z)
  [2, 6, 7, 3], // 2: Top   (+Y)
  [0, 1, 5, 4], // 3: Bottom(-Y)
  [0, 4, 6, 2], // 4: Left  (-X)
  [1, 3, 7, 5], // 5: Right (+X)
];

// Face normal vectors (outward pointing, Y-up)
const FACE_NORMALS = [
  [ 0,  0, -1], // 0: Front
  [ 0,  0,  1], // 1: Back
  [ 0,  1,  0], // 2: Top
  [ 0, -1,  0], // 3: Bottom
  [-1,  0,  0], // 4: Left
  [ 1,  0,  0], // 5: Right
];

// Face labels
const FACE_LABELS = ["FRONT", "BACK", "TOP", "BOTTOM", "LEFT", "RIGHT"];

// 12 edge definitions: [v1, v2, face1, face2]
// Order: FrontTop, FrontBottom, FrontLeft, FrontRight,
//        BackTop, BackBottom, BackLeft, BackRight,
//        TopLeft, TopRight, BottomLeft, BottomRight
const EDGE_DEFS = [
  [2, 3, 0, 2], // 0:  FrontTop     (FTL-FTR, Front+Top)
  [0, 1, 0, 3], // 1:  FrontBottom  (FBL-FBR, Front+Bottom)
  [0, 2, 0, 4], // 2:  FrontLeft    (FBL-FTL, Front+Left)
  [1, 3, 0, 5], // 3:  FrontRight   (FBR-FTR, Front+Right)
  [6, 7, 1, 2], // 4:  BackTop      (BTL-BTR, Back+Top)
  [4, 5, 1, 3], // 5:  BackBottom   (BBL-BBR, Back+Bottom)
  [4, 6, 1, 4], // 6:  BackLeft     (BBL-BTL, Back+Left)
  [5, 7, 1, 5], // 7:  BackRight    (BBR-BTR, Back+Right)
  [2, 6, 4, 2], // 8:  TopLeft      (FTL-BTL, Left+Top)
  [3, 7, 5, 2], // 9:  TopRight     (FTR-BTR, Right+Top)
  [0, 4, 4, 3], // 10: BottomLeft   (FBL-BBL, Left+Bottom)
  [1, 5, 5, 3], // 11: BottomRight  (FBR-BBR, Right+Bottom)
];

// Edge region name mapping (index -> view name)
const EDGE_NAMES = [
  "front-top", "front-bottom", "front-left", "front-right",
  "back-top", "back-bottom", "back-left", "back-right",
  "top-left", "top-right", "bottom-left", "bottom-right",
];

// Corner adjacent faces (3 faces per vertex)
const CORNER_ADJ_FACES = [
  [0, 3, 4], // 0: FBL  - Front, Bottom, Left
  [0, 3, 5], // 1: FBR  - Front, Bottom, Right
  [0, 2, 4], // 2: FTL  - Front, Top, Left
  [0, 2, 5], // 3: FTR  - Front, Top, Right
  [1, 3, 4], // 4: BBL  - Back, Bottom, Left
  [1, 3, 5], // 5: BBR  - Back, Bottom, Right
  [1, 2, 4], // 6: BTL  - Back, Top, Left
  [1, 2, 5], // 7: BTR  - Back, Top, Right
];

// Corner region name mapping (vertex index -> view name)
const CORNER_NAMES = [
  "front-bottom-left",  // 0
  "front-bottom-right", // 1
  "front-top-left",     // 2
  "front-top-right",    // 3
  "back-bottom-left",   // 4
  "back-bottom-right",  // 5
  "back-top-left",      // 6
  "back-top-right",     // 7
];

// ═══════════════════════════════════════════════════════════════════════════
// Sub-region lookup tables per face
// Ported from ViewCubeHitTest.cs MapFaceVertexToCornerRegion / MapFaceEdgeIndexToRegion
//
// For each face, the CCW vertex order is [v0, v1, v2, v3].
// The local coordinate system has:
//   u-axis: v0 -> v3 (bottom-left to bottom-right)
//   v-axis: v0 -> v1 (bottom-left to top-left)
// The 3x3 grid:
//   6(TL) 7(T)  8(TR)
//   3(L)  4(C)  5(R)
//   0(BL) 1(B)  2(BR)
// ═══════════════════════════════════════════════════════════════════════════

// Corners: grid positions 0(BL)=v0, 2(BR)=v3, 6(TL)=v1, 8(TR)=v2
// Edges: grid 1(B)=edge v0-v3, 3(L)=edge v0-v1, 5(R)=edge v2-v3, 7(T)=edge v1-v2

// Face 0 (Front -Z): verts [0,2,3,1] = [FBL, FTL, FTR, FBR]
//   v0=FBL, v1=FTL, v2=FTR, v3=FBR
// FACE_SUBREGIONS: for each face, map edge indices (0-3) and corner vertex positions (0-3)
// Edge i = quad[i] → quad[(i+1)%4]
// Corner i = vertex at quad[i] (where edges (i-1)%4 and i meet)
const FACE_SUBREGIONS = [
  // Face 0: Front (-Z), quad [0=FBL, 2=FTL, 3=FTR, 1=FBR]
  {
    edges: { 0: "front-left", 1: "front-top", 2: "front-right", 3: "front-bottom" },
    corners: { 0: "front-bottom-left", 1: "front-top-left", 2: "front-top-right", 3: "front-bottom-right" },
    center: "front",
  },
  // Face 1: Back (+Z), quad [5=BBR, 7=BTR, 6=BTL, 4=BBL]
  {
    edges: { 0: "back-right", 1: "back-top", 2: "back-left", 3: "back-bottom" },
    corners: { 0: "back-bottom-right", 1: "back-top-right", 2: "back-top-left", 3: "back-bottom-left" },
    center: "back",
  },
  // Face 2: Top (+Y), quad [2=FTL, 6=BTL, 7=BTR, 3=FTR]
  {
    edges: { 0: "top-left", 1: "back-top", 2: "top-right", 3: "front-top" },
    corners: { 0: "front-top-left", 1: "back-top-left", 2: "back-top-right", 3: "front-top-right" },
    center: "top",
  },
  // Face 3: Bottom (-Y), quad [0=FBL, 1=FBR, 5=BBR, 4=BBL]
  {
    edges: { 0: "front-bottom", 1: "bottom-right", 2: "back-bottom", 3: "bottom-left" },
    corners: { 0: "front-bottom-left", 1: "front-bottom-right", 2: "back-bottom-right", 3: "back-bottom-left" },
    center: "bottom",
  },
  // Face 4: Left (-X), quad [0=FBL, 4=BBL, 6=BTL, 2=FTL]
  {
    edges: { 0: "bottom-left", 1: "back-left", 2: "top-left", 3: "front-left" },
    corners: { 0: "front-bottom-left", 1: "back-bottom-left", 2: "back-top-left", 3: "front-top-left" },
    center: "left",
  },
  // Face 5: Right (+X), quad [1=FBR, 3=FTR, 7=BTR, 5=BBR]
  {
    edges: { 0: "front-right", 1: "top-right", 2: "back-right", 3: "bottom-right" },
    corners: { 0: "front-bottom-right", 1: "front-top-right", 2: "back-top-right", 3: "back-bottom-right" },
    center: "right",
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// Projection and hit test functions
// ═══════════════════════════════════════════════════════════════════════════

const CANVAS_SIZE = 140;
const CUBE_HALF = 50; // half-size in canvas pixels
const EDGE_RATIO = 0.25;

/**
 * Transform a 3D vertex by the 3x3 rotation part of a 4x4 view matrix.
 * Equivalent to Vector3D.TransformNormal(v, viewMatrix) in SceneGraph.net.
 */
function transformNormal(v, m) {
  // m is a Float32Array(16) from Babylon's Matrix, column-major layout
  // m[0..3] = col0, m[4..7] = col1, m[8..11] = col2, m[12..15] = col3
  // TransformNormal: result = v.x*col0 + v.y*col1 + v.z*col2 (no translation)
  return [
    v[0] * m[0] + v[1] * m[4] + v[2] * m[8],
    v[0] * m[1] + v[1] * m[5] + v[2] * m[9],
    v[0] * m[2] + v[1] * m[6] + v[2] * m[10],
  ];
}

/**
 * Project all cube geometry to 2D screen space.
 * Ported from ViewCubeGeometry.Project().
 */
function projectCube(viewMatrixValues, cx, cy, size) {
  const m = viewMatrixValues;
  const projected = new Array(8);
  const depths = new Array(8);

  // Project 8 vertices
  for (let i = 0; i < 8; i++) {
    const vp = transformNormal(VERTICES[i], m);
    projected[i] = [cx + vp[0] * size, cy - vp[1] * size];
    depths[i] = vp[2];
  }

  // Build face projections
  const faces = new Array(6);
  const faceFrontFacing = new Array(6);
  for (let i = 0; i < 6; i++) {
    const idx = FACE_INDICES[i];
    const verts = [projected[idx[0]], projected[idx[1]], projected[idx[2]], projected[idx[3]]];
    const viewNormal = transformNormal(FACE_NORMALS[i], m);
    const depth = viewNormal[2]; // positive Z = facing camera
    faceFrontFacing[i] = depth < 0; // Babylon left-handed: negative Z = facing camera
    faces[i] = { index: i, verts, depth, isFrontFacing: depth < 0, viewNormal }; // Babylon left-handed: Z < 0 = facing camera
  }

  // Build edge projections
  const edges = new Array(12);
  for (let i = 0; i < 12; i++) {
    const [v1, v2, f1, f2] = EDGE_DEFS[i];
    edges[i] = {
      index: i,
      start: projected[v1],
      end: projected[v2],
      depth: (depths[v1] + depths[v2]) / 2,
      isVisible: faceFrontFacing[f1] || faceFrontFacing[f2],
      adjFaces: [f1, f2],
    };
  }

  // Build corner projections
  const corners = new Array(8);
  for (let i = 0; i < 8; i++) {
    const adj = CORNER_ADJ_FACES[i];
    corners[i] = {
      index: i,
      pos: projected[i],
      depth: depths[i],
      isVisible: faceFrontFacing[adj[0]] || faceFrontFacing[adj[1]] || faceFrontFacing[adj[2]],
    };
  }

  return { faces, edges, corners, projected, depths };
}

/**
 * Check if a point is inside a convex quad (cross-product sign test).
 * Ported from ViewCubeHitTest.IsPointInQuad().
 */
function isPointInQuad(px, py, quad) {
  let expectedSign = null;
  for (let i = 0; i < 4; i++) {
    const a = quad[i];
    const b = quad[(i + 1) % 4];
    const cross = (b[0] - a[0]) * (py - a[1]) - (b[1] - a[1]) * (px - a[0]);
    if (Math.abs(cross) < 0.001) continue;
    const sign = cross > 0;
    if (expectedSign === null) expectedSign = sign;
    else if (expectedSign !== sign) return false;
  }
  return true;
}

/**
 * Compute local (u,v) coordinates within a projected quad using
 * inverse bilinear (parallelogram approximation).
 * quad[0]=v0, quad[1]=v1, quad[2]=v2, quad[3]=v3 (CCW winding)
 * u-axis: v0 → v3 direction, v-axis: v0 → v1 direction
 */
function toFaceLocalCoords(px, py, quad) {
  const e0x = quad[3][0] - quad[0][0], e0y = quad[3][1] - quad[0][1];
  const e1x = quad[1][0] - quad[0][0], e1y = quad[1][1] - quad[0][1];
  const px0 = px - quad[0][0], py0 = py - quad[0][1];

  const det = e0x * e1y - e0y * e1x;
  if (Math.abs(det) < 0.001) return [0.5, 0.5];

  const u = (px0 * e1y - py0 * e1x) / det;
  const v = (e0x * py0 - e0y * px0) / det;
  return [Math.max(0, Math.min(1, u)), Math.max(0, Math.min(1, v))];
}

/**
 * Determine sub-region from (u,v) parametric coordinates within a face.
 * u < EDGE_RATIO → left edge zone (edge 0: v0→v1)
 * u > 1-EDGE_RATIO → right edge zone (edge 2: v2→v3)
 * v < EDGE_RATIO → bottom edge zone (edge 3: v3→v0)
 * v > 1-EDGE_RATIO → top edge zone (edge 1: v1→v2)
 * Corners at intersections of two edge zones.
 */
function getSubRegion(faceIndex, u, v) {
  u = Math.max(0, Math.min(1, u));
  v = Math.max(0, Math.min(1, v));
  const T = EDGE_RATIO;
  const isLeft = u < T, isRight = u > 1 - T;
  const isBot = v < T, isTop = v > 1 - T;
  const sr = FACE_SUBREGIONS[faceIndex];

  // Corners (vertex positions 0-3)
  if (isBot && isLeft)  return { type: "corner", name: sr.corners[0] }; // v0
  if (isTop && isLeft)  return { type: "corner", name: sr.corners[1] }; // v1
  if (isTop && isRight) return { type: "corner", name: sr.corners[2] }; // v2
  if (isBot && isRight) return { type: "corner", name: sr.corners[3] }; // v3

  // Edges (edge i = vi→v(i+1)%4)
  if (isLeft)  return { type: "edge", name: sr.edges[0] }; // v0→v1
  if (isTop)   return { type: "edge", name: sr.edges[1] }; // v1→v2
  if (isRight) return { type: "edge", name: sr.edges[2] }; // v2→v3
  if (isBot)   return { type: "edge", name: sr.edges[3] }; // v3→v0

  return { type: "face", name: sr.center };
}

/**
 * Full hit test.
 * Ported from ViewCubeHitTest.HitTest().
 */
function hitTest(px, py, projection, cx, cy, size) {
  const dx = px - cx, dy = py - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist > size * 1.1) return null; // corners can extend beyond face extents

  // Sort front-facing faces front-to-back (descending depth for correct occlusion)
  const sortedFaces = projection.faces
    .filter(f => f.isFrontFacing)
    .sort((a, b) => a.depth - b.depth); // front-to-back: most negative depth first (closest to camera)

  for (const face of sortedFaces) {
    if (!isPointInQuad(px, py, face.verts)) continue;
    const [u, v] = toFaceLocalCoords(px, py, face.verts);
    const region = getSubRegion(face.index, u, v);
    return region;
  }

  // If no face hit, check proximity to visible corners (projected cube vertices)
  const cornerThreshold = size * 0.25;
  let bestCornerDist = cornerThreshold;
  let bestCorner = null;
  for (let vi = 0; vi < 8; vi++) {
    // Corner is visible if any adjacent face is front-facing
    const adjFaces = CORNER_ADJ_FACES[vi];
    const visible = adjFaces.some(fi => projection.faces[fi].isFrontFacing);
    if (!visible) continue;
    const vp = projection.projected[vi];
    const dx = px - vp[0], dy = py - vp[1];
    const d = Math.sqrt(dx*dx + dy*dy);
    if (d < bestCornerDist) { bestCornerDist = d; bestCorner = vi; }
  }
  if (bestCorner !== null) {
    // Find which corner region this vertex maps to
    const cornerName = VERTEX_TO_CORNER[bestCorner];
    if (cornerName) return { type: "corner", name: cornerName };
  }

  // Check proximity to visible edges
  const edgeThreshold = size * 0.15;
  let bestEdgeDist = edgeThreshold;
  let bestEdge = null;
  for (let ei = 0; ei < 12; ei++) {
    const [v1, v2, f1, f2] = EDGE_DEFS[ei];
    const visible = projection.faces[f1].isFrontFacing || projection.faces[f2].isFrontFacing;
    if (!visible) continue;
    const p1 = projection.projected[v1], p2 = projection.projected[v2];
    const d = pointToSegmentDist(px, py, p1[0], p1[1], p2[0], p2[1]);
    if (d < bestEdgeDist) { bestEdgeDist = d; bestEdge = ei; }
  }
  if (bestEdge !== null) {
    const edgeName = EDGE_NAMES[bestEdge];
    if (edgeName) return { type: "edge", name: edgeName };
  }

  return null;
}

function pointToSegmentDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const lenSq = dx*dx + dy*dy;
  if (lenSq < 0.001) return Math.sqrt((px-ax)*(px-ax)+(py-ay)*(py-ay));
  let t = ((px-ax)*dx + (py-ay)*dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t*dx - px, cy = ay + t*dy - py;
  return Math.sqrt(cx*cx + cy*cy);
}

// ═══════════════════════════════════════════════════════════════════════════
// Region type classification helpers (for highlighting)
// ═══════════════════════════════════════════════════════════════════════════

const FACE_NAMES_SET = new Set(["front", "back", "top", "bottom", "left", "right"]);
const EDGE_NAMES_SET = new Set(EDGE_NAMES);
const CORNER_NAMES_SET = new Set(CORNER_NAMES);

function regionCategory(name) {
  if (!name) return "none";
  if (FACE_NAMES_SET.has(name)) return "face";
  if (EDGE_NAMES_SET.has(name)) return "edge";
  if (CORNER_NAMES_SET.has(name)) return "corner";
  return "none";
}

// Map face name -> face index
const FACE_NAME_TO_INDEX = { front: 0, back: 1, top: 2, bottom: 3, left: 4, right: 5 };

// Map edge name -> edge index
const EDGE_NAME_TO_INDEX = {};
EDGE_NAMES.forEach((n, i) => { EDGE_NAME_TO_INDEX[n] = i; });

// Map corner name -> vertex index
const CORNER_NAME_TO_INDEX = {};
CORNER_NAMES.forEach((n, i) => { CORNER_NAME_TO_INDEX[n] = i; });

// ═══════════════════════════════════════════════════════════════════════════
// Style constants (matching SceneGraph.net ViewCubeStyle)
// ═══════════════════════════════════════════════════════════════════════════

const STYLE = {
  // Face
  faceColor: "rgba(64, 64, 71, 1)",          // 0.25, 0.25, 0.28
  faceHoverColor: "rgba(77, 115, 166, 1)",    // 0.3, 0.45, 0.65
  faceBorderColor: "rgba(128, 128, 128, 1)",  // 0.5, 0.5, 0.5
  faceBorderWidth: 1.5,
  backFaceColor: "rgba(64, 64, 71, 0.3)",     // same but 0.3 alpha
  backFaceAlpha: 0.3,

  // Edge
  edgeColor: "rgba(153, 153, 153, 1)",        // 0.6, 0.6, 0.6
  edgeHoverColor: "rgba(102, 179, 255, 1)",   // 0.4, 0.7, 1.0
  edgeWidth: 3,
  edgeHoverWidth: 5,

  // Corner
  cornerColor: "rgba(153, 153, 153, 1)",      // 0.6, 0.6, 0.6
  cornerHoverColor: "rgba(102, 179, 255, 1)", // 0.4, 0.7, 1.0
  cornerRadius: 5,
  cornerHoverRadius: 7,

  // Label
  labelColor: "rgba(230, 230, 230, 1)",       // 0.9, 0.9, 0.9
  labelHoverColor: "#ffffff",
  labelFontSize: 11,
  labelMinDepth: 0.3,

  // Axis
  axisLength: 55,
  axisWidth: 2,
  axisXColor: "#e04040",
  axisYColor: "#40b050",
  axisZColor: "#4060e0",
  axisThickness: 3,
  axisLabelSize: 10,
};

// ═══════════════════════════════════════════════════════════════════════════
// Rendering
// ═══════════════════════════════════════════════════════════════════════════

function drawViewCube(ctx, projection, hoveredRegion, cx, cy, size) {
  const { faces, edges, corners } = projection;
  const hCat = regionCategory(hoveredRegion);

  // --- Sort faces back-to-front for painter's algorithm ---
  const sortedFaces = [...faces].sort((a, b) => b.depth - a.depth); // back-to-front: most positive (farthest) drawn first

  // --- 1. Back faces (semi-transparent) ---
  for (const face of sortedFaces) {
    if (face.isFrontFacing) continue;
    const v = face.verts;

    ctx.beginPath();
    ctx.moveTo(v[0][0], v[0][1]);
    for (let i = 1; i < 4; i++) ctx.lineTo(v[i][0], v[i][1]);
    ctx.closePath();

    ctx.fillStyle = STYLE.backFaceColor;
    ctx.globalAlpha = STYLE.backFaceAlpha;
    ctx.fill();

    ctx.strokeStyle = STYLE.faceBorderColor;
    ctx.lineWidth = STYLE.faceBorderWidth;
    ctx.globalAlpha = STYLE.backFaceAlpha * 0.5;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // --- 2. Front faces (opaque) ---
  for (const face of sortedFaces) {
    if (!face.isFrontFacing) continue;
    const v = face.verts;
    // Face is hovered if: directly hovered, OR an edge/corner on this face is hovered
    const sr = FACE_SUBREGIONS[face.index];
    const allRegionNames = [sr.center, ...Object.values(sr.edges), ...Object.values(sr.corners)];
    const isHovered = hoveredRegion && allRegionNames.includes(hoveredRegion);

    ctx.beginPath();
    ctx.moveTo(v[0][0], v[0][1]);
    for (let i = 1; i < 4; i++) ctx.lineTo(v[i][0], v[i][1]);
    ctx.closePath();

    ctx.fillStyle = isHovered ? STYLE.faceHoverColor : STYLE.faceColor;
    ctx.globalAlpha = 1;
    ctx.fill();

    // Border
    ctx.strokeStyle = STYLE.faceBorderColor;
    ctx.lineWidth = STYLE.faceBorderWidth;
    ctx.globalAlpha = 1;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // --- 3. Edges (on top of faces) ---
  const sortedEdges = [...edges].sort((a, b) => b.depth - a.depth);
  for (const edge of sortedEdges) {
    if (!edge.isVisible) continue;
    const isHovered = hCat === "edge" && EDGE_NAME_TO_INDEX[hoveredRegion] === edge.index;

    ctx.beginPath();
    ctx.moveTo(edge.start[0], edge.start[1]);
    ctx.lineTo(edge.end[0], edge.end[1]);
    ctx.strokeStyle = isHovered ? STYLE.edgeHoverColor : STYLE.edgeColor;
    ctx.lineWidth = isHovered ? STYLE.edgeHoverWidth : STYLE.edgeWidth;
    ctx.stroke();
  }

  // --- 4. Corners (on top of edges) ---
  const sortedCorners = [...corners].sort((a, b) => b.depth - a.depth);
  for (const corner of sortedCorners) {
    if (!corner.isVisible) continue;
    const isHovered = hCat === "corner" && CORNER_NAME_TO_INDEX[hoveredRegion] === corner.index;

    ctx.beginPath();
    ctx.arc(
      corner.pos[0], corner.pos[1],
      isHovered ? STYLE.cornerHoverRadius : STYLE.cornerRadius,
      0, Math.PI * 2
    );
    ctx.fillStyle = isHovered ? STYLE.cornerHoverColor : STYLE.cornerColor;
    ctx.fill();
  }

  // --- 5. Labels (on top of everything) ---
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const face of sortedFaces) {
    if (!face.isFrontFacing) continue;
    const absDepth = Math.abs(face.depth);
    if (absDepth < STYLE.labelMinDepth) continue;

    // Label is "hovered" only when the face center itself is hovered
    const isFaceHovered = hCat === "face" && FACE_NAME_TO_INDEX[hoveredRegion] === face.index;
    // Also highlight label when any sub-region of this face is hovered
    const sr = FACE_SUBREGIONS[face.index];
    const allRegionNames = [sr.center, ...Object.values(sr.edges), ...Object.values(sr.corners)];
    const isAnyHovered = hoveredRegion && allRegionNames.includes(hoveredRegion);

    const label = FACE_LABELS[face.index];
    const fcx = (face.verts[0][0] + face.verts[1][0] + face.verts[2][0] + face.verts[3][0]) / 4;
    const fcy = (face.verts[0][1] + face.verts[1][1] + face.verts[2][1] + face.verts[3][1]) / 4;

    // Scale font size based on face foreshortening
    const scale = Math.min(1, absDepth * 1.5);
    const fontSize = Math.round(STYLE.labelFontSize * scale);
    if (fontSize < 6) continue;

    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.fillStyle = (isFaceHovered || isAnyHovered) ? STYLE.labelHoverColor : STYLE.labelColor;
    ctx.globalAlpha = Math.min(1, (absDepth - STYLE.labelMinDepth) * 3);
    ctx.fillText(label, fcx, fcy);
    ctx.globalAlpha = 1;
  }

  // --- 6. Axis triad ---
  const axisLen = STYLE.axisLength;
  const axes = [
    { dir: [1, 0, 0], color: STYLE.axisXColor, label: "X" },
    { dir: [0, 1, 0], color: STYLE.axisYColor, label: "Y" },
    { dir: [0, 0, 1], color: STYLE.axisZColor, label: "Z" },
  ];

  const viewMatrixValues = projection._viewMatrix;
  for (const axis of axes) {
    const tip = transformNormal(axis.dir, viewMatrixValues);
    const endX = cx + tip[0] * axisLen;
    const endY = cy - tip[1] * axisLen;

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(endX, endY);
    ctx.strokeStyle = axis.color;
    ctx.lineWidth = STYLE.axisThickness;
    // Fade back-facing axis lines
    ctx.globalAlpha = tip[2] > 0 ? 1 : 0.25;
    ctx.stroke();

    // Axis label
    const labelDist = axisLen + 10;
    const lx = cx + tip[0] * labelDist;
    const ly = cy - tip[1] * labelDist;
    ctx.font = `bold ${STYLE.axisLabelSize}px sans-serif`;
    ctx.fillStyle = axis.color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(axis.label, lx, ly);
    ctx.globalAlpha = 1;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// React component
// ═══════════════════════════════════════════════════════════════════════════

export default function ViewCube({ onCameraView, cameraRef }) {
  const canvasRef = useRef(null);
  const hoveredRef = useRef(null);
  const projectionRef = useRef(null);
  const animFrameRef = useRef(null);
  const model = useViewerStore((s) => s.model);

  // Render loop
  useEffect(() => {
    if (!model) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = CANVAS_SIZE * dpr;
    canvas.height = CANVAS_SIZE * dpr;

    function renderFrame() {
      const camera = cameraRef?.current;
      if (!camera) {
        animFrameRef.current = requestAnimationFrame(renderFrame);
        return;
      }

      const vm = camera.getViewMatrix();
      const m = vm.m; // Float32Array(16), column-major

      const cx = (CANVAS_SIZE * dpr) / 2;
      const cy = (CANVAS_SIZE * dpr) / 2;
      const cubeSize = CUBE_HALF * dpr;

      const projection = projectCube(m, cx, cy, cubeSize);
      projection._viewMatrix = m; // stash for axis drawing
      projectionRef.current = projection;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      drawViewCube(ctx, projection, hoveredRef.current, cx, cy, cubeSize);
      ctx.restore();

      animFrameRef.current = requestAnimationFrame(renderFrame);
    }

    animFrameRef.current = requestAnimationFrame(renderFrame);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [model, cameraRef]);

  const getCanvasCoords = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    return [
      (e.clientX - rect.left) * dpr,
      (e.clientY - rect.top) * dpr,
    ];
  }, []);

  const handleMove = useCallback((e) => {
    const coords = getCanvasCoords(e);
    if (!coords) return;
    const [px, py] = coords;
    const projection = projectionRef.current;
    if (!projection) return;

    const dpr = window.devicePixelRatio || 1;
    const cx = (CANVAS_SIZE * dpr) / 2;
    const cy = (CANVAS_SIZE * dpr) / 2;
    const cubeSize = CUBE_HALF * dpr;

    const result = hitTest(px, py, projection, cx, cy, cubeSize);
    hoveredRef.current = result ? result.name : null;
    canvasRef.current.style.cursor = result ? "pointer" : "default";
  }, [getCanvasCoords]);

  const handleClick = useCallback((e) => {
    const coords = getCanvasCoords(e);
    if (!coords || !onCameraView) return;
    const [px, py] = coords;
    const projection = projectionRef.current;
    if (!projection) return;

    const dpr = window.devicePixelRatio || 1;
    const cx = (CANVAS_SIZE * dpr) / 2;
    const cy = (CANVAS_SIZE * dpr) / 2;
    const cubeSize = CUBE_HALF * dpr;

    const result = hitTest(px, py, projection, cx, cy, cubeSize);
    if (result && VIEWS[result.name]) {
      onCameraView(result.name, VIEWS[result.name]);
    }
  }, [onCameraView, getCanvasCoords]);

  const handleLeave = useCallback(() => {
    hoveredRef.current = null;
    if (canvasRef.current) canvasRef.current.style.cursor = "default";
  }, []);

  if (!model) return null;
  return (
    <canvas ref={canvasRef} width={CANVAS_SIZE} height={CANVAS_SIZE}
      className="absolute bottom-4 right-4 z-20"
      style={{ width: CANVAS_SIZE, height: CANVAS_SIZE, borderRadius: 10 }}
      onMouseMove={handleMove} onClick={handleClick} onMouseLeave={handleLeave}
      data-testid="viewcube" />
  );
}
