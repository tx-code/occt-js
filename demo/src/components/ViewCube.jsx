import { useEffect, useRef, useCallback } from "react";
import { useViewerStore } from "../store/viewerStore";

const PI = Math.PI;

// All 26 clickable views: 6 faces + 12 edges + 8 corners
const VIEWS = {
  // Faces
  front:  { alpha: -PI/2, beta: PI/2 },
  back:   { alpha: PI/2,  beta: PI/2 },
  top:    { alpha: -PI/2, beta: 0.01 },
  bottom: { alpha: -PI/2, beta: PI - 0.01 },
  left:   { alpha: PI,    beta: PI/2 },
  right:  { alpha: 0,     beta: PI/2 },
  // Edges
  "front-top":    { alpha: -PI/2,   beta: PI/4 },
  "front-bottom": { alpha: -PI/2,   beta: 3*PI/4 },
  "front-left":   { alpha: -3*PI/4, beta: PI/2 },
  "front-right":  { alpha: -PI/4,   beta: PI/2 },
  "back-top":     { alpha: PI/2,    beta: PI/4 },
  "back-bottom":  { alpha: PI/2,    beta: 3*PI/4 },
  "back-left":    { alpha: 3*PI/4,  beta: PI/2 },
  "back-right":   { alpha: PI/4,    beta: PI/2 },
  "top-left":     { alpha: PI,      beta: PI/4 },
  "top-right":    { alpha: 0,       beta: PI/4 },
  "bottom-left":  { alpha: PI,      beta: 3*PI/4 },
  "bottom-right": { alpha: 0,       beta: 3*PI/4 },
  // Corners
  "front-top-left":     { alpha: -3*PI/4, beta: PI/4 },
  "front-top-right":    { alpha: -PI/4,   beta: PI/4 },
  "front-bottom-left":  { alpha: -3*PI/4, beta: 3*PI/4 },
  "front-bottom-right": { alpha: -PI/4,   beta: 3*PI/4 },
  "back-top-left":      { alpha: 3*PI/4,  beta: PI/4 },
  "back-top-right":     { alpha: PI/4,    beta: PI/4 },
  "back-bottom-left":   { alpha: 3*PI/4,  beta: 3*PI/4 },
  "back-bottom-right":  { alpha: PI/4,    beta: 3*PI/4 },
};

// Each face's 3x3 sub-region mapping: given (u,v) in [0,1], which edges/corners it maps to
// Edge threshold: u or v < T or > 1-T → edge/corner region
const EDGE_T = 0.25;

// For each face: [topEdge, bottomEdge, leftEdge, rightEdge, topLeftCorner, topRightCorner, bottomLeftCorner, bottomRightCorner]
const FACE_REGIONS = {
  front:  { t: "front-top",    b: "front-bottom", l: "front-left",   r: "front-right",  tl: "front-top-left",    tr: "front-top-right",    bl: "front-bottom-left",  br: "front-bottom-right" },
  back:   { t: "back-top",     b: "back-bottom",  l: "back-right",   r: "back-left",    tl: "back-top-right",    tr: "back-top-left",      bl: "back-bottom-right",  br: "back-bottom-left" },
  top:    { t: "back-top",     b: "front-top",    l: "top-left",     r: "top-right",    tl: "back-top-left",     tr: "back-top-right",     bl: "front-top-left",     br: "front-top-right" },
  bottom: { t: "front-bottom", b: "back-bottom",  l: "bottom-left",  r: "bottom-right", tl: "front-bottom-left", tr: "front-bottom-right", bl: "back-bottom-left",   br: "back-bottom-right" },
  left:   { t: "top-left",     b: "bottom-left",  l: "back-left",    r: "front-left",   tl: "back-top-left",     tr: "front-top-left",     bl: "back-bottom-left",   br: "front-bottom-left" },
  right:  { t: "top-right",    b: "bottom-right",  l: "front-right", r: "back-right",   tl: "front-top-right",   tr: "back-top-right",     bl: "front-bottom-right", br: "back-bottom-right" },
};

// 8 cube vertices in local space (-1 to 1)
const VERTS = [
  [-1,-1,-1], [1,-1,-1], [1,1,-1], [-1,1,-1],
  [-1,-1, 1], [1,-1, 1], [1,1, 1], [-1,1, 1],
];

// 6 faces: indices (CCW from outside), label, view name
const FACES = [
  { indices: [0,1,5,4], label: "FRONT",  view: "front"  },
  { indices: [2,3,7,6], label: "BACK",   view: "back"   },
  { indices: [4,5,6,7], label: "TOP",    view: "top"    },
  { indices: [0,3,2,1], label: "BOTTOM", view: "bottom" },
  { indices: [0,4,7,3], label: "LEFT",   view: "left"   },
  { indices: [1,2,6,5], label: "RIGHT",  view: "right"  },
];

const SIZE = 120;
const CUBE_RADIUS = 42;

function project(x, y, z, alpha, beta) {
  const sa = Math.sin(alpha), ca = Math.cos(alpha);
  const sb = Math.sin(beta), cb = Math.cos(beta);
  const rx = -sa, rz = ca;
  const ux = -cb * ca, uy = sb, uz = -cb * sa;
  const fx = sb * ca, fy = cb, fz = sb * sa;
  return { x: x * rx + z * rz, y: -(x * ux + y * uy + z * uz), depth: x * fx + y * fy + z * fz };
}

function pointInQuad(px, py, pts) {
  let allPos = true, allNeg = true;
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    const c = (pts[j].x - pts[i].x) * (py - pts[i].y) - (pts[j].y - pts[i].y) * (px - pts[i].x);
    if (c < 0) allPos = false;
    if (c > 0) allNeg = false;
  }
  return allPos || allNeg;
}

// Compute UV coords of a point inside a projected quad using bilinear interpolation
function quadUV(px, py, pts) {
  // Simple approach: use relative position between opposite edges
  // U: left-right, V: top-bottom (0,0 = pts[0])
  const dx1 = pts[1].x - pts[0].x, dy1 = pts[1].y - pts[0].y;
  const dx2 = pts[3].x - pts[0].x, dy2 = pts[3].y - pts[0].y;
  const dpx = px - pts[0].x, dpy = py - pts[0].y;
  const det = dx1 * dy2 - dx2 * dy1;
  if (Math.abs(det) < 0.001) return { u: 0.5, v: 0.5 };
  const u = (dpx * dy2 - dpy * dx2) / det;
  const v = (dx1 * dpy - dy1 * dpx) / det;
  return { u: Math.max(0, Math.min(1, u)), v: Math.max(0, Math.min(1, v)) };
}

export default function ViewCube({ onCameraView, cameraRef }) {
  const canvasRef = useRef(null);
  const model = useViewerStore((s) => s.model);
  const animRef = useRef(null);
  const hoveredRef = useRef(null); // stores view name string

  function getProjected(alpha, beta) {
    const cx = SIZE / 2, cy = SIZE / 2, r = CUBE_RADIUS;
    return VERTS.map(([x, y, z]) => {
      const p = project(x, y, z, alpha, beta);
      return { x: cx + p.x * r, y: cy + p.y * r, depth: p.depth };
    });
  }

  // 3x3 hit test: face → check UV → edge/corner/center
  function hitTest(mouseX, mouseY) {
    const camera = cameraRef?.current;
    if (!camera) return null;
    const projected = getProjected(camera.alpha, camera.beta);

    const sortedFaces = FACES.map(face => {
      const avgDepth = face.indices.reduce((s, vi) => s + projected[vi].depth, 0) / 4;
      return { ...face, avgDepth };
    }).sort((a, b) => a.avgDepth - b.avgDepth);

    for (const face of sortedFaces) {
      const pts = face.indices.map(i => projected[i]);
      if (!pointInQuad(mouseX, mouseY, pts)) continue;

      // Compute UV within the face
      const { u, v } = quadUV(mouseX, mouseY, pts);
      const regions = FACE_REGIONS[face.view];
      if (!regions) return face.view;

      const isTop = v < EDGE_T;
      const isBot = v > 1 - EDGE_T;
      const isLeft = u < EDGE_T;
      const isRight = u > 1 - EDGE_T;

      if (isTop && isLeft) return regions.tl;
      if (isTop && isRight) return regions.tr;
      if (isBot && isLeft) return regions.bl;
      if (isBot && isRight) return regions.br;
      if (isTop) return regions.t;
      if (isBot) return regions.b;
      if (isLeft) return regions.l;
      if (isRight) return regions.r;
      return face.view; // center = face itself
    }
    return null;
  }

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const camera = cameraRef?.current;
    if (!canvas || !camera) { animRef.current = requestAnimationFrame(draw); return; }

    const ctx = canvas.getContext("2d");
    const cx = SIZE / 2, cy = SIZE / 2, r = CUBE_RADIUS;
    ctx.clearRect(0, 0, SIZE, SIZE);

    const alpha = camera.alpha, beta = camera.beta;
    const projected = getProjected(alpha, beta);

    const sortedFaces = FACES.map(face => {
      const avgDepth = face.indices.reduce((s, vi) => s + projected[vi].depth, 0) / 4;
      return { ...face, avgDepth };
    }).sort((a, b) => b.avgDepth - a.avgDepth);

    const hovered = hoveredRef.current;
    // Check if hovered is a face, edge, or corner
    const hoveredFace = VIEWS[hovered] && Object.keys(FACE_REGIONS).includes(hovered) ? hovered : null;

    for (const face of sortedFaces) {
      const pts = face.indices.map(i => projected[i]);
      const ax = pts[1].x - pts[0].x, ay = pts[1].y - pts[0].y;
      const bx = pts[3].x - pts[0].x, by = pts[3].y - pts[0].y;
      const isFront = (ax * by - ay * bx) > 0;

      // Determine if this face or any of its sub-regions is hovered
      const regions = FACE_REGIONS[face.view] || {};
      const allRegionViews = [face.view, ...Object.values(regions)];
      const faceHovered = hovered && allRegionViews.includes(hovered);

      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.closePath();

      // Base fill
      if (hovered === face.view) {
        ctx.fillStyle = "rgba(76, 201, 240, 0.7)";
      } else if (isFront) {
        ctx.fillStyle = "rgba(50, 50, 70, 0.85)";
      } else {
        ctx.fillStyle = "rgba(30, 30, 45, 0.4)";
      }
      ctx.fill();
      ctx.strokeStyle = faceHovered ? "rgba(76, 201, 240, 0.9)" : "rgba(255, 255, 255, 0.2)";
      ctx.lineWidth = faceHovered ? 2 : 1;
      ctx.stroke();

      // Draw 3x3 sub-region highlight if an edge/corner on this face is hovered
      if (isFront && hovered && hovered !== face.view && allRegionViews.includes(hovered)) {
        // Determine which sub-region
        const { u: hu, v: hv } = getSubRegionUV(hovered, regions);
        if (hu !== null) {
          // Interpolate sub-region quad on the face
          const subPts = getSubQuadPts(pts, hu, hv);
          ctx.beginPath();
          ctx.moveTo(subPts[0].x, subPts[0].y);
          for (let i = 1; i < subPts.length; i++) ctx.lineTo(subPts[i].x, subPts[i].y);
          ctx.closePath();
          ctx.fillStyle = "rgba(76, 201, 240, 0.6)";
          ctx.fill();
        }
      }

      // Label
      if (isFront) {
        const centerX = pts.reduce((s, p) => s + p.x, 0) / 4;
        const centerY = pts.reduce((s, p) => s + p.y, 0) / 4;
        ctx.fillStyle = faceHovered ? "#fff" : "rgba(255,255,255,0.65)";
        ctx.font = "bold 9px system-ui";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(face.label, centerX, centerY);
      }
    }

    // Axis lines
    const axisLen = r * 1.3;
    for (const { dir, color, label } of [
      { dir: [1,0,0], color: "#cc3333", label: "X" },
      { dir: [0,1,0], color: "#33cc33", label: "Y" },
      { dir: [0,0,1], color: "#3366cc", label: "Z" },
    ]) {
      const p = project(dir[0], dir[1], dir[2], alpha, beta);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + p.x * axisLen, cy + p.y * axisLen);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.font = "bold 10px system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, cx + p.x * (axisLen + 10), cy + p.y * (axisLen + 10));
    }

    animRef.current = requestAnimationFrame(draw);
  }, [cameraRef]);

  useEffect(() => {
    if (!model) return;
    animRef.current = requestAnimationFrame(draw);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [model, draw]);

  const handleMove = useCallback((e) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    hoveredRef.current = hitTest(e.clientX - rect.left, e.clientY - rect.top);
    canvasRef.current.style.cursor = hoveredRef.current ? "pointer" : "default";
  }, [cameraRef]);

  const handleClick = useCallback((e) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const view = hitTest(e.clientX - rect.left, e.clientY - rect.top);
    if (view && VIEWS[view] && onCameraView) onCameraView(view, VIEWS[view]);
  }, [onCameraView, cameraRef]);

  if (!model) return null;

  return (
    <canvas
      ref={canvasRef}
      width={SIZE}
      height={SIZE}
      className="absolute bottom-4 right-4 z-20"
      style={{ width: SIZE, height: SIZE }}
      onMouseMove={handleMove}
      onClick={handleClick}
      onMouseLeave={() => { hoveredRef.current = null; }}
      data-testid="viewcube"
    />
  );
}

// Map a hovered sub-region name back to UV ranges for drawing
function getSubRegionUV(hovered, regions) {
  const T = EDGE_T;
  if (hovered === regions.tl) return { u: [0, T], v: [0, T] };
  if (hovered === regions.tr) return { u: [1-T, 1], v: [0, T] };
  if (hovered === regions.bl) return { u: [0, T], v: [1-T, 1] };
  if (hovered === regions.br) return { u: [1-T, 1], v: [1-T, 1] };
  if (hovered === regions.t)  return { u: [T, 1-T], v: [0, T] };
  if (hovered === regions.b)  return { u: [T, 1-T], v: [1-T, 1] };
  if (hovered === regions.l)  return { u: [0, T], v: [T, 1-T] };
  if (hovered === regions.r)  return { u: [1-T, 1], v: [T, 1-T] };
  return { u: null, v: null };
}

// Get screen-space quad for a UV sub-region of a projected face
function getSubQuadPts(facePts, uRange, vRange) {
  function lerp2D(pts, u, v) {
    const top = { x: pts[0].x + (pts[1].x - pts[0].x) * u, y: pts[0].y + (pts[1].y - pts[0].y) * u };
    const bot = { x: pts[3].x + (pts[2].x - pts[3].x) * u, y: pts[3].y + (pts[2].y - pts[3].y) * u };
    return { x: top.x + (bot.x - top.x) * v, y: top.y + (bot.y - top.y) * v };
  }
  return [
    lerp2D(facePts, uRange[0], vRange[0]),
    lerp2D(facePts, uRange[1], vRange[0]),
    lerp2D(facePts, uRange[1], vRange[1]),
    lerp2D(facePts, uRange[0], vRange[1]),
  ];
}
