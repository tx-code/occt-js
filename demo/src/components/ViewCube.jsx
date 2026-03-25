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
const FACE_SUBREGIONS = [
  // Face 0: Front (-Z), verts [0=FBL, 2=FTL, 3=FTR, 1=FBR]
  {
    corners: {
      0: "front-bottom-left",  // BL = v0 = FBL
      2: "front-bottom-right", // BR = v3 = FBR
      6: "front-top-left",     // TL = v1 = FTL
      8: "front-top-right",    // TR = v2 = FTR
    },
    edges: {
      1: "front-bottom", // B = v0-v3 = FBL-FBR
      3: "front-left",   // L = v0-v1 = FBL-FTL
      5: "front-right",  // R = v2-v3 = FTR-FBR
      7: "front-top",    // T = v1-v2 = FTL-FTR
    },
    center: "front",
  },
  // Face 1: Back (+Z), verts [5=BBR, 7=BTR, 6=BTL, 4=BBL]
  {
    corners: {
      0: "back-bottom-right",  // BL = v0 = BBR
      2: "back-bottom-left",   // BR = v3 = BBL
      6: "back-top-right",     // TL = v1 = BTR
      8: "back-top-left",      // TR = v2 = BTL
    },
    edges: {
      1: "back-bottom",  // B = v0-v3 = BBR-BBL
      3: "back-right",   // L = v0-v1 = BBR-BTR
      5: "back-left",    // R = v2-v3 = BTL-BBL
      7: "back-top",     // T = v1-v2 = BTR-BTL
    },
    center: "back",
  },
  // Face 2: Top (+Y), verts [2=FTL, 6=BTL, 7=BTR, 3=FTR]
  {
    corners: {
      0: "front-top-left",   // BL = v0 = FTL
      2: "front-top-right",  // BR = v3 = FTR
      6: "back-top-left",    // TL = v1 = BTL
      8: "back-top-right",   // TR = v2 = BTR
    },
    edges: {
      1: "front-top",   // B = v0-v3 = FTL-FTR
      3: "top-left",    // L = v0-v1 = FTL-BTL
      5: "top-right",   // R = v2-v3 = BTR-FTR
      7: "back-top",    // T = v1-v2 = BTL-BTR
    },
    center: "top",
  },
  // Face 3: Bottom (-Y), verts [0=FBL, 1=FBR, 5=BBR, 4=BBL]
  {
    corners: {
      0: "front-bottom-left",   // BL = v0 = FBL
      2: "back-bottom-left",    // BR = v3 = BBL
      6: "front-bottom-right",  // TL = v1 = FBR
      8: "back-bottom-right",   // TR = v2 = BBR
    },
    edges: {
      1: "bottom-left",    // B = v0-v3 = FBL-BBL
      3: "front-bottom",   // L = v0-v1 = FBL-FBR
      5: "back-bottom",    // R = v2-v3 = BBR-BBL
      7: "bottom-right",   // T = v1-v2 = FBR-BBR
    },
    center: "bottom",
  },
  // Face 4: Left (-X), verts [0=FBL, 4=BBL, 6=BTL, 2=FTL]
  {
    corners: {
      0: "front-bottom-left",  // BL = v0 = FBL
      2: "front-top-left",     // BR = v3 = FTL
      6: "back-bottom-left",   // TL = v1 = BBL
      8: "back-top-left",      // TR = v2 = BTL
    },
    edges: {
      1: "front-left",    // B = v0-v3 = FBL-FTL
      3: "bottom-left",   // L = v0-v1 = FBL-BBL
      5: "top-left",      // R = v2-v3 = BTL-FTL
      7: "back-left",     // T = v1-v2 = BBL-BTL
    },
    center: "left",
  },
  // Face 5: Right (+X), verts [1=FBR, 3=FTR, 7=BTR, 5=BBR]
  {
    corners: {
      0: "front-bottom-right",  // BL = v0 = FBR
      2: "front-top-right",     // BR = v3 = FTR  -- wait, v3=BBR? let me recheck
      6: "back-bottom-right",   // TL = v1 = FTR? -- Need to recheck
      8: "back-top-right",      // TR = v2 = BTR
    },
    edges: {
      1: "front-right",    // B = v0-v3
      3: "bottom-right",   // L = v0-v1
      5: "top-right",      // R = v2-v3
      7: "back-right",     // T = v1-v2
    },
    center: "right",
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// Let me re-derive the sub-regions carefully from the face vertex definitions.
//
// The local coord system for each face quad [v0, v1, v2, v3]:
//   e0 = v3 - v0 (u-direction, "bottom edge")
//   e1 = v1 - v0 (v-direction, "left edge")
//
// Grid layout (u,v):
//   (0,1)TL  (0.5,1)T   (1,1)TR
//   (0,0.5)L (0.5,0.5)C (1,0.5)R
//   (0,0)BL  (0.5,0)B   (1,0)BR
//
// So: BL=v0, BR=v0+e0=v3, TL=v0+e1=v1, TR=v0+e0+e1≈v2
// ═══════════════════════════════════════════════════════════════════════════

// Re-derive properly:
// Face 5: Right (+X), verts [1=FBR, 3=FTR, 7=BTR, 5=BBR]
//   v0=FBR(1), v1=FTR(3), v2=BTR(7), v3=BBR(5)
//   BL=v0=FBR, BR=v3=BBR, TL=v1=FTR, TR=v2=BTR
FACE_SUBREGIONS[5] = {
  corners: {
    0: "front-bottom-right",  // BL = FBR
    2: "back-bottom-right",   // BR = BBR
    6: "front-top-right",     // TL = FTR
    8: "back-top-right",      // TR = BTR
  },
  edges: {
    1: "bottom-right",  // B = FBR-BBR
    3: "front-right",   // L = FBR-FTR
    5: "back-right",    // R = BTR-BBR
    7: "top-right",     // T = FTR-BTR
  },
  center: "right",
};

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
    faceFrontFacing[i] = depth > 0;
    faces[i] = { index: i, verts, depth, isFrontFacing: depth > 0, viewNormal };
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
 * Convert screen point to face local coordinates (0-1 range).
 * Ported from ViewCubeHitTest.ToFaceLocalCoords().
 */
function toFaceLocalCoords(px, py, quad) {
  const v0 = quad[0]; // bottom-left
  const v1 = quad[1]; // top-left
  const v3 = quad[3]; // bottom-right

  const e0x = v3[0] - v0[0], e0y = v3[1] - v0[1]; // u direction
  const e1x = v1[0] - v0[0], e1y = v1[1] - v0[1]; // v direction
  const pdx = px - v0[0], pdy = py - v0[1];

  const cross_e0_e1 = e0x * e1y - e0y * e1x;
  if (Math.abs(cross_e0_e1) < 0.0001) return [0.5, 0.5];

  const u = (pdx * e1y - pdy * e1x) / cross_e0_e1;
  const v = (e0x * pdy - e0y * pdx) / cross_e0_e1;
  return [u, v];
}

/**
 * Determine sub-region within a face using 3x3 grid.
 * Ported from ViewCubeHitTest.GetSubRegion().
 */
function getSubRegion(faceIndex, u, v) {
  u = Math.max(0, Math.min(1, u));
  v = Math.max(0, Math.min(1, v));

  const zoneX = u < EDGE_RATIO ? 0 : (u > 1 - EDGE_RATIO ? 2 : 1);
  const zoneY = v < EDGE_RATIO ? 0 : (v > 1 - EDGE_RATIO ? 2 : 1);
  const gridIndex = zoneY * 3 + zoneX;

  const sr = FACE_SUBREGIONS[faceIndex];
  if (gridIndex === 4) return { type: "face", name: sr.center };

  if (sr.corners[gridIndex] !== undefined) {
    return { type: "corner", name: sr.corners[gridIndex] };
  }
  if (sr.edges[gridIndex] !== undefined) {
    return { type: "edge", name: sr.edges[gridIndex] };
  }
  return { type: "face", name: sr.center };
}

/**
 * Full hit test.
 * Ported from ViewCubeHitTest.HitTest().
 */
function hitTest(px, py, projection, cx, cy, size) {
  const dx = px - cx, dy = py - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist > size * 0.75) return null;

  // Sort front-facing faces front-to-back (descending depth for correct occlusion)
  const sortedFaces = projection.faces
    .filter(f => f.isFrontFacing)
    .sort((a, b) => b.depth - a.depth);

  for (const face of sortedFaces) {
    if (!isPointInQuad(px, py, face.verts)) continue;
    const [u, v] = toFaceLocalCoords(px, py, face.verts);
    return getSubRegion(face.index, u, v);
  }

  return null;
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
  faceColor: "#c8cad0",
  faceHoverColor: "#4488cc",
  faceBorderColor: "rgba(0,0,0,0.15)",
  backFaceColor: "#808590",
  backFaceAlpha: 0.4,
  labelColor: "#333",
  labelHoverColor: "#fff",
  labelMinDepth: 0.3,
  labelFontSize: 11,
  edgeColor: "rgba(0,0,0,0.12)",
  edgeHoverColor: "#4488cc",
  edgeWidth: 1,
  edgeHoverWidth: 4,
  cornerRadius: 4,
  cornerHoverRadius: 6,
  cornerColor: "rgba(0,0,0,0.15)",
  cornerHoverColor: "#4488cc",
  axisLength: 55,
  axisWidth: 2,
  axisXColor: "#e04040",
  axisYColor: "#40b050",
  axisZColor: "#4060e0",
  axisLabelSize: 11,
};

// ═══════════════════════════════════════════════════════════════════════════
// Rendering
// ═══════════════════════════════════════════════════════════════════════════

function drawViewCube(ctx, projection, hoveredRegion, cx, cy, size) {
  const { faces, edges, corners } = projection;
  const hCat = regionCategory(hoveredRegion);

  // --- Sort faces back-to-front for painter's algorithm ---
  const sortedFaces = [...faces].sort((a, b) => a.depth - b.depth);

  // --- Draw faces ---
  for (const face of sortedFaces) {
    const v = face.verts;
    const isHovered = hCat === "face" && FACE_NAME_TO_INDEX[hoveredRegion] === face.index;

    ctx.beginPath();
    ctx.moveTo(v[0][0], v[0][1]);
    for (let i = 1; i < 4; i++) ctx.lineTo(v[i][0], v[i][1]);
    ctx.closePath();

    if (face.isFrontFacing) {
      ctx.fillStyle = isHovered ? STYLE.faceHoverColor : STYLE.faceColor;
      ctx.globalAlpha = 1;
    } else {
      ctx.fillStyle = STYLE.backFaceColor;
      ctx.globalAlpha = STYLE.backFaceAlpha;
    }
    ctx.fill();

    // Border
    ctx.strokeStyle = STYLE.faceBorderColor;
    ctx.lineWidth = 1;
    ctx.globalAlpha = face.isFrontFacing ? 1 : STYLE.backFaceAlpha * 0.5;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // --- Draw edges (visible ones) ---
  // Sort by depth for proper layering
  const sortedEdges = [...edges].sort((a, b) => a.depth - b.depth);
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

  // --- Draw corners (visible ones) ---
  const sortedCorners = [...corners].sort((a, b) => a.depth - b.depth);
  for (const corner of sortedCorners) {
    if (!corner.isVisible) continue;
    const isHovered = hCat === "corner" && CORNER_NAME_TO_INDEX[hoveredRegion] === corner.index;
    if (!isHovered) continue; // Only draw corners when hovered

    ctx.beginPath();
    ctx.arc(corner.pos[0], corner.pos[1], isHovered ? STYLE.cornerHoverRadius : STYLE.cornerRadius, 0, Math.PI * 2);
    ctx.fillStyle = isHovered ? STYLE.cornerHoverColor : STYLE.cornerColor;
    ctx.fill();
  }

  // --- Draw face labels ---
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const face of sortedFaces) {
    if (!face.isFrontFacing) continue;
    if (face.depth < STYLE.labelMinDepth) continue;

    const isHovered = hCat === "face" && FACE_NAME_TO_INDEX[hoveredRegion] === face.index;
    const label = FACE_LABELS[face.index];
    const fcx = (face.verts[0][0] + face.verts[1][0] + face.verts[2][0] + face.verts[3][0]) / 4;
    const fcy = (face.verts[0][1] + face.verts[1][1] + face.verts[2][1] + face.verts[3][1]) / 4;

    // Scale font size based on face foreshortening
    const scale = Math.min(1, face.depth * 1.5);
    const fontSize = Math.round(STYLE.labelFontSize * scale);
    if (fontSize < 6) continue;

    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.fillStyle = isHovered ? STYLE.labelHoverColor : STYLE.labelColor;
    ctx.globalAlpha = Math.min(1, (face.depth - STYLE.labelMinDepth) * 3);
    ctx.fillText(label, fcx, fcy);
    ctx.globalAlpha = 1;
  }

  // --- Draw axis lines ---
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
    ctx.lineWidth = STYLE.axisWidth;
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
