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
// faceIdx 0=back, 1=front, 2=right, 3=left, 4=top, 5=bottom
const FACE_MAP = { 1: "front", 0: "back", 4: "top", 5: "bottom", 3: "left", 2: "right" };

const EDGE_T = 0.25;
const FACE_REGIONS = {
  front:  { t:"front-top",    b:"front-bottom", l:"front-left",   r:"front-right",  tl:"front-top-left",    tr:"front-top-right",    bl:"front-bottom-left",  br:"front-bottom-right" },
  back:   { t:"back-top",     b:"back-bottom",  l:"back-right",   r:"back-left",    tl:"back-top-right",    tr:"back-top-left",      bl:"back-bottom-right",  br:"back-bottom-left" },
  top:    { t:"back-top",     b:"front-top",    l:"top-left",     r:"top-right",    tl:"back-top-left",     tr:"back-top-right",     bl:"front-top-left",     br:"front-top-right" },
  bottom: { t:"front-bottom", b:"back-bottom",  l:"bottom-left",  r:"bottom-right", tl:"front-bottom-left", tr:"front-bottom-right", bl:"back-bottom-left",   br:"back-bottom-right" },
  left:   { t:"top-left",     b:"bottom-left",  l:"back-left",    r:"front-left",   tl:"back-top-left",     tr:"front-top-left",     bl:"back-bottom-left",   br:"front-bottom-left" },
  right:  { t:"top-right",    b:"bottom-right",  l:"front-right", r:"back-right",   tl:"front-top-right",   tr:"back-top-right",     bl:"front-bottom-right", br:"back-bottom-right" },
};

// Texture atlas UV mapping: 2 columns × 3 rows
// Col 0: RIGHT, TOP, FRONT | Col 1: LEFT, BOTTOM, BACK
// Babylon face order: right(0), left(1), top(2), bottom(3), back(4), front(5)
// faceUV = Vector4(uMin, vMin, uMax, vMax)
// Babylon face order: [0]=back, [1]=front, [2]=right, [3]=left, [4]=top, [5]=bottom
// Atlas layout: row0=RIGHT,LEFT  row1=TOP,BOTTOM  row2=FRONT,BACK
const FACE_UVS = [
  new BABYLON.Vector4(1,   1/3, 0.5, 0),     // [0] back   → col1, row2 (U+V flipped)
  new BABYLON.Vector4(0,   0,   0.5, 1/3),   // [1] front  → col0, row2
  new BABYLON.Vector4(0,   2/3, 0.5, 1),     // [2] right  → col0, row0
  new BABYLON.Vector4(0.5, 2/3, 1,   1),     // [3] left   → col1, row0
  new BABYLON.Vector4(0,   1/3, 0.5, 2/3),   // [4] top    → col0, row1
  new BABYLON.Vector4(1,   2/3, 0.5, 1/3),   // [5] bottom → col1, row1 (U+V flipped)
];

const SIZE = 140;

export default function ViewCube({ onCameraView, cameraRef }) {
  const canvasRef = useRef(null);
  const miniEngineRef = useRef(null);
  const miniSceneRef = useRef(null);
  const miniCameraRef = useRef(null);
  const boxRef = useRef(null);
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
    hemi.intensity = 1.3;
    hemi.groundColor = new BABYLON.Color3(0.4, 0.4, 0.45);

    // Load textures
    const texDefault = new BABYLON.Texture("/textures/controller_cube_default.png", scene, false, true, BABYLON.Texture.BILINEAR_SAMPLINGMODE);
    const texSides = new BABYLON.Texture("/textures/controller_cube_sides.png", scene, false, true, BABYLON.Texture.BILINEAR_SAMPLINGMODE);
    const texEdges = new BABYLON.Texture("/textures/controller_cube_edges.png", scene, false, true, BABYLON.Texture.BILINEAR_SAMPLINGMODE);
    texturesRef.current = { default: texDefault, sides: texSides, edges: texEdges };

    // Create box with atlas UVs
    const box = BABYLON.MeshBuilder.CreateBox("vcBox", { size: 1.5, faceUV: FACE_UVS }, scene);
    const mat = new BABYLON.StandardMaterial("vcMat", scene);
    mat.diffuseTexture = texDefault;
    mat.diffuseColor = new BABYLON.Color3(1, 1, 1);
    mat.emissiveColor = new BABYLON.Color3(0.3, 0.3, 0.33);
    mat.specularColor = new BABYLON.Color3(0.15, 0.15, 0.15);
    box.material = mat;
    boxRef.current = box;

    // Edge wireframe
    box.enableEdgesRendering();
    box.edgesWidth = 3;
    box.edgesColor = new BABYLON.Color4(1, 1, 1, 0.35);

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

  // Pick helper — returns { faceName, viewName }
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
        const u = uv.x, v = uv.y;
        // Remap UV from atlas to face-local 0-1
        const atlasUV = FACE_UVS[faceIdx];
        const lu = (u - atlasUV.x) / (atlasUV.z - atlasUV.x);
        const lv = (v - atlasUV.y) / (atlasUV.w - atlasUV.y);
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
    return { faceName, viewName };
  }

  const handleMove = useCallback((e) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const result = doPick(e.clientX - rect.left, e.clientY - rect.top);
    const box = boxRef.current;
    const tex = texturesRef.current;

    if (result && box && tex.default) {
      hoveredRef.current = result.viewName;
      canvasRef.current.style.cursor = "pointer";
      // Switch texture based on what's hovered
      if (result.viewName === result.faceName) {
        box.material.diffuseTexture = tex.sides; // face hover → blue faces
      } else {
        box.material.diffuseTexture = tex.edges; // edge/corner hover → blue grid + white corners
      }
    } else {
      hoveredRef.current = null;
      if (canvasRef.current) canvasRef.current.style.cursor = "default";
      if (box && tex.default) box.material.diffuseTexture = tex.default;
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
    const box = boxRef.current;
    const tex = texturesRef.current;
    if (box && tex.default) box.material.diffuseTexture = tex.default;
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
