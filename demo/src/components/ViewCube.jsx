import { useEffect, useRef, useCallback } from "react";
import { useViewerStore } from "../store/viewerStore";

const VIEWS = {
  front:  { alpha: -Math.PI/2, beta: Math.PI/2 },
  back:   { alpha: Math.PI/2,  beta: Math.PI/2 },
  top:    { alpha: -Math.PI/2, beta: 0.01 },
  bottom: { alpha: -Math.PI/2, beta: Math.PI - 0.01 },
  left:   { alpha: Math.PI,    beta: Math.PI/2 },
  right:  { alpha: 0,          beta: Math.PI/2 },
};

// 8 cube vertices in local space (-1 to 1)
const VERTS = [
  [-1,-1,-1], [1,-1,-1], [1,1,-1], [-1,1,-1], // bottom face (y=-1)
  [-1,-1, 1], [1,-1, 1], [1,1, 1], [-1,1, 1], // top face (y=1)
];

// 6 faces as [vertex indices, label, viewName]
// In Babylon Y-up: front=-Z, back=+Z, top=+Y, bottom=-Y, left=-X, right=+X
const FACES = [
  { indices: [0,1,5,4], label: "FRONT",  view: "front"  }, // -Z face
  { indices: [2,3,7,6], label: "BACK",   view: "back"   }, // +Z face
  { indices: [4,5,6,7], label: "TOP",    view: "top"    }, // +Y face
  { indices: [0,3,2,1], label: "BOTTOM", view: "bottom" }, // -Y face (reversed for outward normal)
  { indices: [0,4,7,3], label: "LEFT",   view: "left"   }, // -X face
  { indices: [1,2,6,5], label: "RIGHT",  view: "right"  }, // +X face
];

const SIZE = 100; // canvas size
const CUBE_RADIUS = 32; // half-size of projected cube

export default function ViewCube({ onCameraView, cameraRef }) {
  const canvasRef = useRef(null);
  const model = useViewerStore((s) => s.model);
  const animRef = useRef(null);
  const hoveredRef = useRef(null);

  // Project a 3D point using camera view rotation (no translation)
  const project = useCallback((x, y, z, alpha, beta) => {
    // ArcRotateCamera view direction:
    // Camera position relative to target:
    //   cx = r * sin(beta) * cos(alpha)
    //   cy = r * cos(beta)
    //   cz = r * sin(beta) * sin(alpha)
    // View matrix rotation (simplified for orientation only):
    const sa = Math.sin(alpha), ca = Math.cos(alpha);
    const sb = Math.sin(beta), cb = Math.cos(beta);

    // Right vector (screen X)
    const rx = -sa, rz = ca;
    // Up vector (screen Y)
    const ux = -cb * ca, uy = sb, uz = -cb * sa;
    // Forward vector (into screen)
    const fx = sb * ca, fy = cb, fz = sb * sa;

    const sx = x * rx + z * rz;           // only x,z contribute to right
    const sy = x * ux + y * uy + z * uz;  // all contribute to up
    const depth = x * fx + y * fy + z * fz;

    return { x: sx, y: -sy, depth };
  }, []);

  // Hit test: find which face the mouse is over
  const hitTest = useCallback((mouseX, mouseY) => {
    const camera = cameraRef?.current;
    if (!camera) return null;

    const cx = SIZE / 2, cy = SIZE / 2;
    const r = CUBE_RADIUS;
    const alpha = camera.alpha, beta = camera.beta;

    const projected = VERTS.map(([x, y, z]) => {
      const p = project(x, y, z, alpha, beta);
      return { x: cx + p.x * r, y: cy + p.y * r, depth: p.depth };
    });

    // Check faces front-to-back (reverse painter order)
    const sortedFaces = FACES.map(face => {
      const avgDepth = face.indices.reduce((s, vi) => s + projected[vi].depth, 0) / 4;
      return { ...face, avgDepth };
    }).sort((a, b) => a.avgDepth - b.avgDepth); // front first for hit test

    for (const face of sortedFaces) {
      const pts = face.indices.map(i => projected[i]);
      if (pointInQuad(mouseX, mouseY, pts)) {
        return face.view;
      }
    }
    return null;
  }, [cameraRef, project]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const camera = cameraRef?.current;
    if (!canvas || !camera) {
      animRef.current = requestAnimationFrame(draw);
      return;
    }

    const ctx = canvas.getContext("2d");
    const cx = SIZE / 2, cy = SIZE / 2;
    const r = CUBE_RADIUS;

    ctx.clearRect(0, 0, SIZE, SIZE);

    const alpha = camera.alpha;
    const beta = camera.beta;

    // Project all 8 vertices
    const projected = VERTS.map(([x, y, z]) => {
      const p = project(x, y, z, alpha, beta);
      return { x: cx + p.x * r, y: cy + p.y * r, depth: p.depth };
    });

    // Sort faces by average depth (painter's algorithm - draw back-to-front)
    const sortedFaces = FACES.map((face, i) => {
      const avgDepth = face.indices.reduce((s, vi) => s + projected[vi].depth, 0) / 4;
      return { ...face, avgDepth, idx: i };
    }).sort((a, b) => b.avgDepth - a.avgDepth); // back first

    const hovered = hoveredRef.current;

    for (const face of sortedFaces) {
      const pts = face.indices.map(i => projected[i]);

      // Check if face is front-facing (cross product of two edges)
      const ax = pts[1].x - pts[0].x, ay = pts[1].y - pts[0].y;
      const bx = pts[3].x - pts[0].x, by = pts[3].y - pts[0].y;
      const cross = ax * by - ay * bx;
      const isFront = cross > 0;

      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.closePath();

      // Fill
      if (hovered === face.view) {
        ctx.fillStyle = "rgba(76, 201, 240, 0.7)";
      } else if (isFront) {
        ctx.fillStyle = "rgba(50, 50, 70, 0.85)";
      } else {
        ctx.fillStyle = "rgba(30, 30, 45, 0.4)";
      }
      ctx.fill();

      // Stroke
      ctx.strokeStyle = hovered === face.view ? "rgba(76, 201, 240, 0.9)" : "rgba(255, 255, 255, 0.2)";
      ctx.lineWidth = hovered === face.view ? 2 : 1;
      ctx.stroke();

      // Label (only on front faces)
      if (isFront) {
        const centerX = pts.reduce((s, p) => s + p.x, 0) / 4;
        const centerY = pts.reduce((s, p) => s + p.y, 0) / 4;
        ctx.fillStyle = hovered === face.view ? "#fff" : "rgba(255,255,255,0.65)";
        ctx.font = "bold 9px system-ui";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(face.label, centerX, centerY);
      }
    }

    // Draw axis lines from center
    const axisLen = r * 1.4;
    const axes = [
      { dir: [1,0,0], color: "#cc3333", label: "X" },
      { dir: [0,1,0], color: "#33cc33", label: "Y" },
      { dir: [0,0,1], color: "#3366cc", label: "Z" },
    ];
    for (const axis of axes) {
      const p = project(axis.dir[0], axis.dir[1], axis.dir[2], alpha, beta);
      const ex = cx + p.x * axisLen;
      const ey = cy + p.y * axisLen;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(ex, ey);
      ctx.strokeStyle = axis.color;
      ctx.lineWidth = 2;
      ctx.stroke();
      // Label
      const lx = cx + p.x * (axisLen + 8);
      const ly = cy + p.y * (axisLen + 8);
      ctx.fillStyle = axis.color;
      ctx.font = "bold 10px system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(axis.label, lx, ly);
    }

    animRef.current = requestAnimationFrame(draw);
  }, [cameraRef, project]);

  useEffect(() => {
    if (!model) return;
    animRef.current = requestAnimationFrame(draw);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [model, draw]);

  const handleMove = useCallback((e) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    hoveredRef.current = hitTest(mx, my);
    // Force cursor
    if (canvasRef.current) {
      canvasRef.current.style.cursor = hoveredRef.current ? "pointer" : "default";
    }
  }, [hitTest]);

  const handleClick = useCallback((e) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const view = hitTest(mx, my);
    if (view && onCameraView) {
      onCameraView(view, VIEWS[view]);
    }
  }, [onCameraView, hitTest]);

  const handleLeave = useCallback(() => {
    hoveredRef.current = null;
  }, []);

  if (!model) return null;

  return (
    <canvas
      ref={canvasRef}
      width={SIZE}
      height={SIZE}
      className="absolute bottom-20 right-4 z-20"
      style={{ width: SIZE, height: SIZE }}
      onMouseMove={handleMove}
      onClick={handleClick}
      onMouseLeave={handleLeave}
      data-testid="viewcube"
    />
  );
}

function pointInQuad(px, py, pts) {
  // Point-in-polygon via cross product sign test
  let allPos = true, allNeg = true;
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    const cross = (pts[j].x - pts[i].x) * (py - pts[i].y) - (pts[j].y - pts[i].y) * (px - pts[i].x);
    if (cross < 0) allPos = false;
    if (cross > 0) allNeg = false;
  }
  return allPos || allNeg;
}
