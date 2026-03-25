import { useEffect, useRef, useState, useCallback } from "react";
import { useViewerStore } from "../store/viewerStore";

// Camera angles for each clickable region
// Babylon ArcRotateCamera: alpha = rotation around Y from +X, beta = angle from +Y
const VIEWS = {
  // Faces
  front:  { alpha: -Math.PI / 2, beta: Math.PI / 2 },
  back:   { alpha: Math.PI / 2,  beta: Math.PI / 2 },
  top:    { alpha: -Math.PI / 2, beta: 0.01 },
  bottom: { alpha: -Math.PI / 2, beta: Math.PI - 0.01 },
  left:   { alpha: Math.PI,      beta: Math.PI / 2 },
  right:  { alpha: 0,            beta: Math.PI / 2 },
  // Edges (45 degree views)
  "front-top":    { alpha: -Math.PI / 2, beta: Math.PI / 4 },
  "front-bottom": { alpha: -Math.PI / 2, beta: 3 * Math.PI / 4 },
  "front-left":   { alpha: -3 * Math.PI / 4, beta: Math.PI / 2 },
  "front-right":  { alpha: -Math.PI / 4, beta: Math.PI / 2 },
  "back-top":     { alpha: Math.PI / 2, beta: Math.PI / 4 },
  "back-bottom":  { alpha: Math.PI / 2, beta: 3 * Math.PI / 4 },
  "back-left":    { alpha: 3 * Math.PI / 4, beta: Math.PI / 2 },
  "back-right":   { alpha: Math.PI / 4, beta: Math.PI / 2 },
  "top-left":     { alpha: Math.PI, beta: Math.PI / 4 },
  "top-right":    { alpha: 0, beta: Math.PI / 4 },
  "bottom-left":  { alpha: Math.PI, beta: 3 * Math.PI / 4 },
  "bottom-right": { alpha: 0, beta: 3 * Math.PI / 4 },
  // Corners (isometric views)
  "front-top-left":     { alpha: -3 * Math.PI / 4, beta: Math.PI / 4 },
  "front-top-right":    { alpha: -Math.PI / 4, beta: Math.PI / 4 },
  "front-bottom-left":  { alpha: -3 * Math.PI / 4, beta: 3 * Math.PI / 4 },
  "front-bottom-right": { alpha: -Math.PI / 4, beta: 3 * Math.PI / 4 },
  "back-top-left":      { alpha: 3 * Math.PI / 4, beta: Math.PI / 4 },
  "back-top-right":     { alpha: Math.PI / 4, beta: Math.PI / 4 },
  "back-bottom-left":   { alpha: 3 * Math.PI / 4, beta: 3 * Math.PI / 4 },
  "back-bottom-right":  { alpha: Math.PI / 4, beta: 3 * Math.PI / 4 },
};

const CUBE_SIZE = 70;
const HALF = CUBE_SIZE / 2;
const EDGE_THICKNESS = 10;
const CORNER_SIZE = 14;

export default function ViewCube({ onCameraView, cameraRef }) {
  const [hovered, setHovered] = useState(null);
  const cubeRef = useRef(null);
  const model = useViewerStore((s) => s.model);
  const animFrameRef = useRef(null);

  // Sync cube rotation with camera
  useEffect(() => {
    if (!model) return;

    function updateRotation() {
      const camera = cameraRef?.current;
      const cube = cubeRef.current;
      if (!camera || !cube) {
        animFrameRef.current = requestAnimationFrame(updateRotation);
        return;
      }

      // Convert ArcRotateCamera alpha/beta to CSS rotation
      const alpha = camera.alpha;
      const beta = camera.beta;

      // CSS rotations: rotateX for pitch (beta), rotateY for yaw (alpha)
      const pitch = -(beta - Math.PI / 2);
      const yaw = alpha + Math.PI / 2;

      cube.style.transform = `rotateX(${pitch}rad) rotateY(${yaw}rad)`;

      animFrameRef.current = requestAnimationFrame(updateRotation);
    }

    animFrameRef.current = requestAnimationFrame(updateRotation);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [model, cameraRef]);

  const handleClick = useCallback(
    (viewName) => {
      const view = VIEWS[viewName];
      if (view && onCameraView) {
        onCameraView(viewName, view);
      }
    },
    [onCameraView],
  );

  if (!model) return null;

  // --- Face rendering ---
  const faceBase = {
    position: "absolute",
    width: CUBE_SIZE,
    height: CUBE_SIZE,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 9,
    fontWeight: 600,
    cursor: "pointer",
    userSelect: "none",
    backfaceVisibility: "hidden",
    border: "1px solid rgba(255,255,255,0.15)",
    transition: "background 0.15s, color 0.15s",
    letterSpacing: 0.5,
  };

  const faceStyle = (transform, viewName) => ({
    ...faceBase,
    transform,
    background:
      hovered === viewName
        ? "rgba(76,201,240,0.6)"
        : "rgba(40,40,60,0.75)",
    color:
      hovered === viewName ? "#fff" : "rgba(255,255,255,0.7)",
  });

  const faces = [
    { name: "front", label: "FRONT", transform: `translateZ(${HALF}px)` },
    { name: "back", label: "BACK", transform: `rotateY(180deg) translateZ(${HALF}px)` },
    { name: "left", label: "LEFT", transform: `rotateY(-90deg) translateZ(${HALF}px)` },
    { name: "right", label: "RIGHT", transform: `rotateY(90deg) translateZ(${HALF}px)` },
    { name: "top", label: "TOP", transform: `rotateX(90deg) translateZ(${HALF}px)` },
    { name: "bottom", label: "BOTTOM", transform: `rotateX(-90deg) translateZ(${HALF}px)` },
  ];

  // --- Edge zones ---
  // Edges are thin rectangular hotspots placed along each cube edge.
  // 12 edges total: 4 on top face perimeter, 4 on bottom, 4 vertical.
  const edgeLen = CUBE_SIZE - CORNER_SIZE; // leave room for corners
  const edgeT = EDGE_THICKNESS;

  const edgeConfigs = [
    // Front-face horizontal edges
    { name: "front-top",    transform: `translateZ(${HALF}px) translateX(${CORNER_SIZE / 2}px) translateY(${-edgeT / 2}px)`, w: edgeLen, h: edgeT },
    { name: "front-bottom", transform: `translateZ(${HALF}px) translateX(${CORNER_SIZE / 2}px) translateY(${CUBE_SIZE - edgeT / 2}px)`, w: edgeLen, h: edgeT },
    // Front-face vertical edges
    { name: "front-left",   transform: `translateZ(${HALF}px) translateX(${-edgeT / 2}px) translateY(${CORNER_SIZE / 2}px)`, w: edgeT, h: edgeLen },
    { name: "front-right",  transform: `translateZ(${HALF}px) translateX(${CUBE_SIZE - edgeT / 2}px) translateY(${CORNER_SIZE / 2}px)`, w: edgeT, h: edgeLen },
    // Back-face horizontal edges
    { name: "back-top",     transform: `rotateY(180deg) translateZ(${HALF}px) translateX(${CORNER_SIZE / 2}px) translateY(${-edgeT / 2}px)`, w: edgeLen, h: edgeT },
    { name: "back-bottom",  transform: `rotateY(180deg) translateZ(${HALF}px) translateX(${CORNER_SIZE / 2}px) translateY(${CUBE_SIZE - edgeT / 2}px)`, w: edgeLen, h: edgeT },
    // Back-face vertical edges
    { name: "back-left",    transform: `rotateY(180deg) translateZ(${HALF}px) translateX(${CUBE_SIZE - edgeT / 2}px) translateY(${CORNER_SIZE / 2}px)`, w: edgeT, h: edgeLen },
    { name: "back-right",   transform: `rotateY(180deg) translateZ(${HALF}px) translateX(${-edgeT / 2}px) translateY(${CORNER_SIZE / 2}px)`, w: edgeT, h: edgeLen },
    // Top-face horizontal edges (left-right)
    { name: "top-left",     transform: `rotateX(90deg) translateZ(${HALF}px) translateX(${-edgeT / 2}px) translateY(${CORNER_SIZE / 2}px)`, w: edgeT, h: edgeLen },
    { name: "top-right",    transform: `rotateX(90deg) translateZ(${HALF}px) translateX(${CUBE_SIZE - edgeT / 2}px) translateY(${CORNER_SIZE / 2}px)`, w: edgeT, h: edgeLen },
    // Bottom-face horizontal edges (left-right)
    { name: "bottom-left",  transform: `rotateX(-90deg) translateZ(${HALF}px) translateX(${-edgeT / 2}px) translateY(${CORNER_SIZE / 2}px)`, w: edgeT, h: edgeLen },
    { name: "bottom-right", transform: `rotateX(-90deg) translateZ(${HALF}px) translateX(${CUBE_SIZE - edgeT / 2}px) translateY(${CORNER_SIZE / 2}px)`, w: edgeT, h: edgeLen },
  ];

  // --- Corner zones ---
  // 8 corners placed at cube vertices.
  const c = CORNER_SIZE;
  const ch = c / 2;
  const cornerConfigs = [
    // Front face corners
    { name: "front-top-left",     transform: `translateZ(${HALF}px) translateX(${-ch}px) translateY(${-ch}px)` },
    { name: "front-top-right",    transform: `translateZ(${HALF}px) translateX(${CUBE_SIZE - ch}px) translateY(${-ch}px)` },
    { name: "front-bottom-left",  transform: `translateZ(${HALF}px) translateX(${-ch}px) translateY(${CUBE_SIZE - ch}px)` },
    { name: "front-bottom-right", transform: `translateZ(${HALF}px) translateX(${CUBE_SIZE - ch}px) translateY(${CUBE_SIZE - ch}px)` },
    // Back face corners
    { name: "back-top-left",      transform: `rotateY(180deg) translateZ(${HALF}px) translateX(${CUBE_SIZE - ch}px) translateY(${-ch}px)` },
    { name: "back-top-right",     transform: `rotateY(180deg) translateZ(${HALF}px) translateX(${-ch}px) translateY(${-ch}px)` },
    { name: "back-bottom-left",   transform: `rotateY(180deg) translateZ(${HALF}px) translateX(${CUBE_SIZE - ch}px) translateY(${CUBE_SIZE - ch}px)` },
    { name: "back-bottom-right",  transform: `rotateY(180deg) translateZ(${HALF}px) translateX(${-ch}px) translateY(${CUBE_SIZE - ch}px)` },
  ];

  return (
    <div
      className="absolute bottom-20 right-4 z-20"
      style={{
        width: CUBE_SIZE + 40,
        height: CUBE_SIZE + 40,
        perspective: 300,
      }}
      data-testid="viewcube"
    >
      {/* Axis labels */}
      <div
        style={{
          position: "absolute",
          bottom: -2,
          left: "50%",
          transform: "translateX(-50%)",
          fontSize: 10,
          color: "rgba(255,255,255,0.3)",
          pointerEvents: "none",
        }}
      >
        <span style={{ color: "#cc3333" }}>X</span>{" "}
        <span style={{ color: "#33cc33" }}>Y</span>{" "}
        <span style={{ color: "#3366cc" }}>Z</span>
      </div>

      {/* 3D Cube container */}
      <div
        style={{
          width: CUBE_SIZE,
          height: CUBE_SIZE,
          position: "relative",
          margin: "20px auto 0",
          transformStyle: "preserve-3d",
          transition: "transform 0.05s linear",
        }}
        ref={cubeRef}
      >
        {/* 6 Faces */}
        {faces.map(({ name, label, transform }) => (
          <div
            key={name}
            style={faceStyle(transform, name)}
            onMouseEnter={() => setHovered(name)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => handleClick(name)}
          >
            {label}
          </div>
        ))}

        {/* 12 Edges */}
        {edgeConfigs.map(({ name, transform, w, h }) => (
          <div
            key={name}
            style={{
              position: "absolute",
              width: w,
              height: h,
              transform,
              cursor: "pointer",
              background:
                hovered === name
                  ? "rgba(76,201,240,0.5)"
                  : "transparent",
              transition: "background 0.15s",
              backfaceVisibility: "hidden",
            }}
            onMouseEnter={() => setHovered(name)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => handleClick(name)}
          />
        ))}

        {/* 8 Corners */}
        {cornerConfigs.map(({ name, transform }) => (
          <div
            key={name}
            style={{
              position: "absolute",
              width: CORNER_SIZE,
              height: CORNER_SIZE,
              transform,
              cursor: "pointer",
              borderRadius: 2,
              background:
                hovered === name
                  ? "rgba(76,201,240,0.7)"
                  : "transparent",
              transition: "background 0.15s",
              backfaceVisibility: "hidden",
            }}
            onMouseEnter={() => setHovered(name)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => handleClick(name)}
          />
        ))}
      </div>
    </div>
  );
}
