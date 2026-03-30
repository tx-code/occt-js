import {
  CORNER_NAME_TO_INDEX,
  EDGE_NAME_TO_INDEX,
  FACE_LABELS,
  FACE_NAME_TO_INDEX,
  FACE_SUBREGIONS,
  VIEWS,
  projectCube,
  regionCategory,
  transformNormal,
} from "./viewcube-geometry.js";
import { hitTest } from "./viewcube-hit-test.js";
import {
  VIEWCUBE_CANVAS_SIZE,
  VIEWCUBE_CUBE_HALF,
  VIEWCUBE_STYLE,
} from "./viewcube-style.js";

function createCanvasElement(providedCanvas) {
  if (providedCanvas) {
    return { canvas: providedCanvas, ownsCanvas: false };
  }

  if (typeof document === "undefined") {
    return { canvas: null, ownsCanvas: false };
  }

  const canvas = document.createElement("canvas");
  canvas.style.display = "block";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.borderRadius = "inherit";
  canvas.style.touchAction = "none";
  return { canvas, ownsCanvas: true };
}

function resolveCamera(viewer) {
  if (!viewer) return null;
  if (typeof viewer.getCamera === "function") return viewer.getCamera();
  if (viewer.cameraRef?.current) return viewer.cameraRef.current;
  if (viewer.camera) return viewer.camera;
  return null;
}

function drawViewCube(ctx, projection, hoveredRegion, cx, cy) {
  const { faces, edges, corners } = projection;
  const hoveredCategory = regionCategory(hoveredRegion);
  const sortedFaces = [...faces].sort((left, right) => right.depth - left.depth);

  for (const face of sortedFaces) {
    if (face.isFrontFacing) continue;
    const vertices = face.verts;

    ctx.beginPath();
    ctx.moveTo(vertices[0][0], vertices[0][1]);
    for (let index = 1; index < vertices.length; index += 1) {
      ctx.lineTo(vertices[index][0], vertices[index][1]);
    }
    ctx.closePath();
    ctx.fillStyle = VIEWCUBE_STYLE.backFaceColor;
    ctx.globalAlpha = VIEWCUBE_STYLE.backFaceAlpha;
    ctx.fill();
    ctx.strokeStyle = VIEWCUBE_STYLE.faceBorderColor;
    ctx.lineWidth = VIEWCUBE_STYLE.faceBorderWidth;
    ctx.globalAlpha = VIEWCUBE_STYLE.backFaceAlpha * 0.5;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  for (const face of sortedFaces) {
    if (!face.isFrontFacing) continue;
    const vertices = face.verts;
    const regions = FACE_SUBREGIONS[face.index];
    const activeRegions = [regions.center, ...Object.values(regions.edges), ...Object.values(regions.corners)];
    const isHovered = hoveredRegion && activeRegions.includes(hoveredRegion);

    ctx.beginPath();
    ctx.moveTo(vertices[0][0], vertices[0][1]);
    for (let index = 1; index < vertices.length; index += 1) {
      ctx.lineTo(vertices[index][0], vertices[index][1]);
    }
    ctx.closePath();
    ctx.fillStyle = isHovered ? VIEWCUBE_STYLE.faceHoverColor : VIEWCUBE_STYLE.faceColor;
    ctx.fill();
    ctx.strokeStyle = VIEWCUBE_STYLE.faceBorderColor;
    ctx.lineWidth = VIEWCUBE_STYLE.faceBorderWidth;
    ctx.stroke();
  }

  const sortedEdges = [...edges].sort((left, right) => right.depth - left.depth);
  for (const edge of sortedEdges) {
    if (!edge.isVisible) continue;
    const isHovered = hoveredCategory === "edge" && EDGE_NAME_TO_INDEX[hoveredRegion] === edge.index;

    ctx.beginPath();
    ctx.moveTo(edge.start[0], edge.start[1]);
    ctx.lineTo(edge.end[0], edge.end[1]);
    ctx.strokeStyle = isHovered ? VIEWCUBE_STYLE.edgeHoverColor : VIEWCUBE_STYLE.edgeColor;
    ctx.lineWidth = isHovered ? VIEWCUBE_STYLE.edgeHoverWidth : VIEWCUBE_STYLE.edgeWidth;
    ctx.stroke();
  }

  const sortedCorners = [...corners].sort((left, right) => right.depth - left.depth);
  for (const corner of sortedCorners) {
    if (!corner.isVisible) continue;
    const isHovered = hoveredCategory === "corner" && CORNER_NAME_TO_INDEX[hoveredRegion] === corner.index;

    ctx.beginPath();
    ctx.arc(
      corner.pos[0],
      corner.pos[1],
      isHovered ? VIEWCUBE_STYLE.cornerHoverRadius : VIEWCUBE_STYLE.cornerRadius,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = isHovered ? VIEWCUBE_STYLE.cornerHoverColor : VIEWCUBE_STYLE.cornerColor;
    ctx.fill();
  }

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const face of sortedFaces) {
    if (!face.isFrontFacing) continue;

    const absoluteDepth = Math.abs(face.depth);
    if (absoluteDepth < VIEWCUBE_STYLE.labelMinDepth) continue;

    const regions = FACE_SUBREGIONS[face.index];
    const activeRegions = [regions.center, ...Object.values(regions.edges), ...Object.values(regions.corners)];
    const isFaceHovered = hoveredCategory === "face" && FACE_NAME_TO_INDEX[hoveredRegion] === face.index;
    const isAnyHovered = hoveredRegion && activeRegions.includes(hoveredRegion);
    const centerX = (face.verts[0][0] + face.verts[1][0] + face.verts[2][0] + face.verts[3][0]) / 4;
    const centerY = (face.verts[0][1] + face.verts[1][1] + face.verts[2][1] + face.verts[3][1]) / 4;
    const fontSize = Math.round(VIEWCUBE_STYLE.labelFontSize * Math.min(1, absoluteDepth * 1.5));

    if (fontSize < 6) continue;

    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.fillStyle = isFaceHovered || isAnyHovered ? VIEWCUBE_STYLE.labelHoverColor : VIEWCUBE_STYLE.labelColor;
    ctx.globalAlpha = Math.min(1, (absoluteDepth - VIEWCUBE_STYLE.labelMinDepth) * 3);
    ctx.fillText(FACE_LABELS[face.index], centerX, centerY);
    ctx.globalAlpha = 1;
  }

  const axes = [
    { dir: [1, 0, 0], color: VIEWCUBE_STYLE.axisXColor, label: "X" },
    { dir: [0, 1, 0], color: VIEWCUBE_STYLE.axisYColor, label: "Y" },
    { dir: [0, 0, 1], color: VIEWCUBE_STYLE.axisZColor, label: "Z" },
  ];

  for (const axis of axes) {
    const tip = transformNormal(axis.dir, projection.viewMatrix);
    const endX = cx + tip[0] * VIEWCUBE_STYLE.axisLength;
    const endY = cy - tip[1] * VIEWCUBE_STYLE.axisLength;

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(endX, endY);
    ctx.strokeStyle = axis.color;
    ctx.lineWidth = VIEWCUBE_STYLE.axisThickness;
    ctx.globalAlpha = tip[2] > 0 ? 1 : 0.25;
    ctx.stroke();

    ctx.font = `bold ${VIEWCUBE_STYLE.axisLabelSize}px sans-serif`;
    ctx.fillStyle = axis.color;
    ctx.fillText(
      axis.label,
      cx + tip[0] * (VIEWCUBE_STYLE.axisLength + 10),
      cy - tip[1] * (VIEWCUBE_STYLE.axisLength + 10),
    );
    ctx.globalAlpha = 1;
  }
}

export function createViewCubeWidget(options = {}) {
  let viewer = null;
  let projection = null;
  let hoveredRegion = null;
  let animationFrame = null;
  let currentContainer = options.container ?? null;
  const { canvas: initialCanvas, ownsCanvas } = createCanvasElement(options.canvas ?? null);
  const canvas = initialCanvas;
  const size = options.size ?? VIEWCUBE_CANVAS_SIZE;
  const cubeHalf = options.cubeHalf ?? VIEWCUBE_CUBE_HALF;

  function stopRenderLoop() {
    if (animationFrame !== null && typeof cancelAnimationFrame === "function") {
      cancelAnimationFrame(animationFrame);
    }
    animationFrame = null;
  }

  function resetCursor() {
    if (canvas) {
      canvas.style.cursor = "default";
    }
  }

  function syncCanvas() {
    if (!canvas) return;
    if (currentContainer && ownsCanvas && canvas.parentElement !== currentContainer) {
      currentContainer.replaceChildren(canvas);
    }

    const pixelRatio = typeof window === "undefined" ? 1 : window.devicePixelRatio || 1;
    canvas.width = size * pixelRatio;
    canvas.height = size * pixelRatio;
  }

  function renderFrame() {
    const context = canvas?.getContext?.("2d");
    const camera = resolveCamera(viewer);

    if (!canvas || !context) {
      animationFrame = null;
      return;
    }

    if (!camera?.getViewMatrix) {
      animationFrame = requestAnimationFrame(renderFrame);
      return;
    }

    const viewMatrix = camera.getViewMatrix()?.m;
    if (!viewMatrix) {
      animationFrame = requestAnimationFrame(renderFrame);
      return;
    }

    const pixelRatio = typeof window === "undefined" ? 1 : window.devicePixelRatio || 1;
    const centerX = (size * pixelRatio) / 2;
    const centerY = (size * pixelRatio) / 2;
    projection = { ...projectCube(viewMatrix, centerX, centerY, cubeHalf * pixelRatio), viewMatrix };

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.save();
    drawViewCube(context, projection, hoveredRegion, centerX, centerY);
    context.restore();
    animationFrame = requestAnimationFrame(renderFrame);
  }

  function startRenderLoop() {
    if (!canvas || animationFrame !== null || typeof requestAnimationFrame !== "function") {
      return;
    }
    animationFrame = requestAnimationFrame(renderFrame);
  }

  function getCanvasCoords(event) {
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const pixelRatio = typeof window === "undefined" ? 1 : window.devicePixelRatio || 1;
    return [
      (event.clientX - rect.left) * pixelRatio,
      (event.clientY - rect.top) * pixelRatio,
    ];
  }

  function handleMove(event) {
    const coordinates = getCanvasCoords(event);
    if (!coordinates || !projection) return;

    const pixelRatio = typeof window === "undefined" ? 1 : window.devicePixelRatio || 1;
    const centerX = (size * pixelRatio) / 2;
    const centerY = (size * pixelRatio) / 2;
    const result = hitTest(coordinates[0], coordinates[1], projection, centerX, centerY, cubeHalf * pixelRatio);
    hoveredRegion = result?.name ?? null;
    if (canvas) {
      canvas.style.cursor = result ? "pointer" : "default";
    }
  }

  function handleClick(event) {
    const coordinates = getCanvasCoords(event);
    if (!coordinates || !projection || !viewer) return;

    const pixelRatio = typeof window === "undefined" ? 1 : window.devicePixelRatio || 1;
    const centerX = (size * pixelRatio) / 2;
    const centerY = (size * pixelRatio) / 2;
    const result = hitTest(coordinates[0], coordinates[1], projection, centerX, centerY, cubeHalf * pixelRatio);
    if (!result || !VIEWS[result.name]) return;

    if (typeof viewer.setView === "function") {
      viewer.setView(result.name, VIEWS[result.name]);
      return;
    }

    if (typeof viewer.onCameraView === "function") {
      viewer.onCameraView(result.name, VIEWS[result.name]);
    }
  }

  function handleLeave() {
    hoveredRegion = null;
    resetCursor();
  }

  if (canvas) {
    canvas.addEventListener("mousemove", handleMove);
    canvas.addEventListener("click", handleClick);
    canvas.addEventListener("mouseleave", handleLeave);
  }

  return {
    attach(nextViewer) {
      viewer = nextViewer ?? null;
      syncCanvas();
      startRenderLoop();
    },
    detach() {
      viewer = null;
      projection = null;
      hoveredRegion = null;
      resetCursor();
      stopRenderLoop();
    },
    dispose() {
      this.detach();
      if (canvas) {
        canvas.removeEventListener("mousemove", handleMove);
        canvas.removeEventListener("click", handleClick);
        canvas.removeEventListener("mouseleave", handleLeave);
        if (ownsCanvas) {
          canvas.remove();
        }
      }
      currentContainer = null;
    },
    getViewer() {
      return viewer;
    },
  };
}
