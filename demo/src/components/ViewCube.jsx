import { useEffect, useRef, useCallback } from "react";
import { useViewerStore } from "../store/viewerStore";

const PI = Math.PI;

const VIEWS = {
  front:  { alpha: -PI/2, beta: PI/2 },
  back:   { alpha: PI/2,  beta: PI/2 },
  top:    { alpha: -PI/2, beta: 0.01 },
  bottom: { alpha: -PI/2, beta: PI - 0.01 },
  left:   { alpha: PI,    beta: PI/2 },
  right:  { alpha: 0,     beta: PI/2 },
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
  "front-top-left":     { alpha: -3*PI/4, beta: PI/4 },
  "front-top-right":    { alpha: -PI/4,   beta: PI/4 },
  "front-bottom-left":  { alpha: -3*PI/4, beta: 3*PI/4 },
  "front-bottom-right": { alpha: -PI/4,   beta: 3*PI/4 },
  "back-top-left":      { alpha: 3*PI/4,  beta: PI/4 },
  "back-top-right":     { alpha: PI/4,    beta: PI/4 },
  "back-bottom-left":   { alpha: 3*PI/4,  beta: 3*PI/4 },
  "back-bottom-right":  { alpha: PI/4,    beta: 3*PI/4 },
};

// Actual Babylon CreateBox face indices (verified by picking):
const FACE_MAP = { 1: "front", 0: "back", 4: "top", 5: "bottom", 3: "left", 2: "right" };
const FACE_NAMES = ["back", "front", "right", "left", "top", "bottom"];

const EDGE_T = 0.25;
const FACE_REGIONS = {
  front:  { t:"front-top",    b:"front-bottom", l:"front-left",   r:"front-right",  tl:"front-top-left",    tr:"front-top-right",    bl:"front-bottom-left",  br:"front-bottom-right" },
  back:   { t:"back-top",     b:"back-bottom",  l:"back-right",   r:"back-left",    tl:"back-top-right",    tr:"back-top-left",      bl:"back-bottom-right",  br:"back-bottom-left" },
  top:    { t:"back-top",     b:"front-top",    l:"top-left",     r:"top-right",    tl:"back-top-left",     tr:"back-top-right",     bl:"front-top-left",     br:"front-top-right" },
  bottom: { t:"front-bottom", b:"back-bottom",  l:"bottom-left",  r:"bottom-right", tl:"front-bottom-left", tr:"front-bottom-right", bl:"back-bottom-left",   br:"back-bottom-right" },
  left:   { t:"top-left",     b:"bottom-left",  l:"back-left",    r:"front-left",   tl:"back-top-left",     tr:"front-top-left",     bl:"back-bottom-left",   br:"front-bottom-left" },
  right:  { t:"top-right",    b:"bottom-right",  l:"front-right", r:"back-right",   tl:"front-top-right",   tr:"back-top-right",     bl:"front-bottom-right", br:"back-bottom-right" },
};

// UV atlas: 2 cols × 3 rows. Row0: RIGHT,LEFT. Row1: TOP,BOTTOM. Row2: FRONT,BACK
// Babylon face order: [0]=back, [1]=front, [2]=right, [3]=left, [4]=top, [5]=bottom
const FACE_UVS = [
  new BABYLON.Vector4(1,   1/3, 0.5, 0),     // [0] back
  new BABYLON.Vector4(0,   0,   0.5, 1/3),   // [1] front
  new BABYLON.Vector4(0,   2/3, 0.5, 1),     // [2] right
  new BABYLON.Vector4(0.5, 2/3, 1,   1),     // [3] left
  new BABYLON.Vector4(0,   1/3, 0.5, 2/3),   // [4] top
  new BABYLON.Vector4(1,   2/3, 0.5, 1/3),   // [5] bottom
];

const SIZE = 140;

export default function ViewCube({ onCameraView, cameraRef }) {
  const canvasRef = useRef(null);
  const miniEngineRef = useRef(null);
  const miniSceneRef = useRef(null);
  const miniCameraRef = useRef(null);
  const boxRef = useRef(null);
  const matsRef = useRef([]); // per-face materials
  const texturesRef = useRef({ default: null, sides: null, edges: null });
  const hoveredRef = useRef(null);
  const model = useViewerStore((s) => s.model);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (miniEngineRef.current) {
      miniEngineRef.current.dispose();
      miniEngineRef.current = null;
    }

    const engine = new BABYLON.Engine(canvas, true, { antialias: true, alpha: true, premultipliedAlpha: true });
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0, 0, 0, 0);

    const camera = new BABYLON.ArcRotateCamera("vcCam", PI/4, PI/3, 3.2, BABYLON.Vector3.Zero(), scene);
    camera.minZ = 0.1;
    camera.maxZ = 100;
    camera.inputs.clear();

    const hemi = new BABYLON.HemisphericLight("vcHemi", new BABYLON.Vector3(0.3, 1, 0.2), scene);
    hemi.intensity = 1.5;
    hemi.groundColor = new BABYLON.Color3(0.5, 0.5, 0.55);

    // Load textures
    const texDefault = new BABYLON.Texture("/textures/controller_cube_default.png", scene, false, true, BABYLON.Texture.BILINEAR_SAMPLINGMODE);
    const texSides = new BABYLON.Texture("/textures/controller_cube_sides.png", scene, false, true, BABYLON.Texture.BILINEAR_SAMPLINGMODE);
    const texEdges = new BABYLON.Texture("/textures/controller_cube_edges.png", scene, false, true, BABYLON.Texture.BILINEAR_SAMPLINGMODE);
    texturesRef.current = { default: texDefault, sides: texSides, edges: texEdges };

    // Create box with per-face multi-material
    const box = BABYLON.MeshBuilder.CreateBox("vcBox", { size: 1.5, faceUV: FACE_UVS }, scene);

    const multiMat = new BABYLON.MultiMaterial("vcMulti", scene);
    const faceMats = [];
    for (let i = 0; i < 6; i++) {
      const mat = new BABYLON.StandardMaterial("vcFace_" + i, scene);
      mat.diffuseTexture = texDefault.clone();
      mat.diffuseColor = new BABYLON.Color3(1, 1, 1);
      mat.emissiveColor = new BABYLON.Color3(0.5, 0.5, 0.55);
      mat.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
      multiMat.subMaterials.push(mat);
      faceMats.push(mat);
    }
    box.material = multiMat;
    box.subMeshes = [];
    const vertCount = box.getTotalVertices();
    for (let i = 0; i < 6; i++) {
      box.subMeshes.push(new BABYLON.SubMesh(i, 0, vertCount, i * 6, 6, box));
    }
    boxRef.current = box;
    matsRef.current = faceMats;

    // Edge wireframe
    box.enableEdgesRendering();
    box.edgesWidth = 4;
    box.edgesColor = new BABYLON.Color4(1, 1, 1, 0.5);

    // Axis lines
    const axisLen = 1.3;
    for (const [pts, color] of [
      [[BABYLON.Vector3.Zero(), new BABYLON.Vector3(axisLen, 0, 0)], new BABYLON.Color3(0.9, 0.25, 0.25)],
      [[BABYLON.Vector3.Zero(), new BABYLON.Vector3(0, axisLen, 0)], new BABYLON.Color3(0.25, 0.8, 0.3)],
      [[BABYLON.Vector3.Zero(), new BABYLON.Vector3(0, 0, axisLen)], new BABYLON.Color3(0.3, 0.4, 0.95)],
    ]) {
      const line = BABYLON.MeshBuilder.CreateLines("vcAxis", { points: pts }, scene);
      line.color = color;
      line.isPickable = false;
    }

    miniEngineRef.current = engine;
    miniSceneRef.current = scene;
    miniCameraRef.current = camera;

    engine.runRenderLoop(() => scene.render());
    return () => { engine.dispose(); miniEngineRef.current = null; };
  }, [model]);

  // Sync rotation
  useEffect(() => {
    if (!model) return;
    const scene = miniSceneRef.current;
    if (!scene) return;
    const obs = scene.onBeforeRenderObservable.add(() => {
      const mainCam = cameraRef?.current;
      const miniCam = miniCameraRef.current;
      if (mainCam && miniCam) {
        miniCam.alpha = mainCam.alpha;
        miniCam.beta = mainCam.beta;
      }
    });
    return () => { scene.onBeforeRenderObservable.remove(obs); };
  }, [model, cameraRef]);

  function doPick(x, y) {
    const scene = miniSceneRef.current;
    if (!scene) return null;
    const pick = scene.pick(x, y);
    if (!pick.hit || pick.pickedMesh?.name !== "vcBox") return null;

    const faceIdx = Math.floor(pick.faceId / 2);
    const faceName = FACE_MAP[faceIdx];
    if (!faceName) return null;

    let viewName = faceName;
    const uv = pick.getTextureCoordinates?.();
    if (uv) {
      const regions = FACE_REGIONS[faceName];
      if (regions) {
        const atlasUV = FACE_UVS[faceIdx];
        const uMin = Math.min(atlasUV.x, atlasUV.z), uMax = Math.max(atlasUV.x, atlasUV.z);
        const vMin = Math.min(atlasUV.y, atlasUV.w), vMax = Math.max(atlasUV.y, atlasUV.w);
        const lu = (uMax - uMin) > 0.001 ? (uv.x - uMin) / (uMax - uMin) : 0.5;
        const lv = (vMax - vMin) > 0.001 ? (uv.y - vMin) / (vMax - vMin) : 0.5;
        const isTop = lv > 1 - EDGE_T, isBot = lv < EDGE_T;
        const isLeft = lu < EDGE_T, isRight = lu > 1 - EDGE_T;
        if (isTop && isLeft) viewName = regions.tl;
        else if (isTop && isRight) viewName = regions.tr;
        else if (isBot && isLeft) viewName = regions.bl;
        else if (isBot && isRight) viewName = regions.br;
        else if (isTop) viewName = regions.t;
        else if (isBot) viewName = regions.b;
        else if (isLeft) viewName = regions.l;
        else if (isRight) viewName = regions.r;
      }
    }
    return { faceName, viewName, faceIdx };
  }

  // Reset all faces to default texture
  function resetFaces() {
    const tex = texturesRef.current;
    const mats = matsRef.current;
    if (!tex.default || mats.length === 0) return;
    for (const mat of mats) {
      mat.diffuseTexture = tex.default;
      mat.emissiveColor = new BABYLON.Color3(0.5, 0.5, 0.55);
    }
  }

  const handleMove = useCallback((e) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const result = doPick(e.clientX - rect.left, e.clientY - rect.top);
    const tex = texturesRef.current;
    const mats = matsRef.current;

    resetFaces();

    if (result && tex.sides && mats.length > 0) {
      hoveredRef.current = result.viewName;
      canvasRef.current.style.cursor = "pointer";

      // Only highlight the hovered face
      const isEdgeOrCorner = result.viewName !== result.faceName;
      const hoveredMat = mats[result.faceIdx];
      if (hoveredMat) {
        hoveredMat.diffuseTexture = isEdgeOrCorner ? tex.edges : tex.sides;
        hoveredMat.emissiveColor = new BABYLON.Color3(0.3, 0.45, 0.6);
      }
    } else {
      hoveredRef.current = null;
      if (canvasRef.current) canvasRef.current.style.cursor = "default";
    }
  }, []);

  const handleClick = useCallback((e) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect || !onCameraView) return;
    const result = doPick(e.clientX - rect.left, e.clientY - rect.top);
    if (result && VIEWS[result.viewName]) {
      onCameraView(result.viewName, VIEWS[result.viewName]);
    }
  }, [onCameraView]);

  const handleLeave = useCallback(() => {
    hoveredRef.current = null;
    if (canvasRef.current) canvasRef.current.style.cursor = "default";
    resetFaces();
  }, []);

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
      onMouseLeave={handleLeave}
      data-testid="viewcube"
    />
  );
}
