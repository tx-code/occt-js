import { useEffect, useRef, useCallback } from "react";
import { useViewerStore } from "../store/viewerStore";

const PI = Math.PI;

// All 26 views
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

// Face name → face index in Babylon's CreateBox (order: +x, -x, +y, -y, +z, -z)
// Babylon face order: [0]=right(+X), [1]=left(-X), [2]=top(+Y), [3]=bottom(-Y), [4]=front(+Z→back in our convention), [5]=back(-Z→front)
const FACE_MAP = {
  5: "front",   // -Z
  4: "back",    // +Z
  2: "top",     // +Y
  3: "bottom",  // -Y
  1: "left",    // -X
  0: "right",   // +X
};

// 3x3 sub-regions per face
const EDGE_T = 0.25;
const FACE_REGIONS = {
  front:  { t:"front-top",    b:"front-bottom", l:"front-left",   r:"front-right",  tl:"front-top-left",    tr:"front-top-right",    bl:"front-bottom-left",  br:"front-bottom-right" },
  back:   { t:"back-top",     b:"back-bottom",  l:"back-right",   r:"back-left",    tl:"back-top-right",    tr:"back-top-left",      bl:"back-bottom-right",  br:"back-bottom-left" },
  top:    { t:"back-top",     b:"front-top",    l:"top-left",     r:"top-right",    tl:"back-top-left",     tr:"back-top-right",     bl:"front-top-left",     br:"front-top-right" },
  bottom: { t:"front-bottom", b:"back-bottom",  l:"bottom-left",  r:"bottom-right", tl:"front-bottom-left", tr:"front-bottom-right", bl:"back-bottom-left",   br:"back-bottom-right" },
  left:   { t:"top-left",     b:"bottom-left",  l:"back-left",    r:"front-left",   tl:"back-top-left",     tr:"front-top-left",     bl:"back-bottom-left",   br:"front-bottom-left" },
  right:  { t:"top-right",    b:"bottom-right",  l:"front-right", r:"back-right",   tl:"front-top-right",   tr:"back-top-right",     bl:"front-bottom-right", br:"back-bottom-right" },
};

const SIZE = 140;

export default function ViewCube({ onCameraView, cameraRef }) {
  const canvasRef = useRef(null);
  const miniEngineRef = useRef(null);
  const miniSceneRef = useRef(null);
  const miniCameraRef = useRef(null);
  const hoveredFaceRef = useRef(null);
  const materialsRef = useRef({});
  const model = useViewerStore((s) => s.model);

  // Initialize mini Babylon scene
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Handle React StrictMode double-mount
    if (miniEngineRef.current) {
      miniEngineRef.current.dispose();
      miniEngineRef.current = null;
      miniSceneRef.current = null;
      miniCameraRef.current = null;
      materialsRef.current = {};
    }

    const engine = new BABYLON.Engine(canvas, true, { antialias: true });
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0.08, 0.08, 0.1, 1); // dark background matching app

    // Camera — fixed distance, syncs rotation with main camera
    const camera = new BABYLON.ArcRotateCamera("vcCam", PI/4, PI/3, 3.5, BABYLON.Vector3.Zero(), scene);
    camera.minZ = 0.1;
    camera.maxZ = 100;
    // Disable all user interaction on this camera
    camera.inputs.clear();

    // Lighting
    const hemi = new BABYLON.HemisphericLight("vcHemi", new BABYLON.Vector3(0, 1, 0), scene);
    hemi.intensity = 1.2;
    hemi.groundColor = new BABYLON.Color3(0.3, 0.3, 0.35);

    // Create cube with per-face materials
    const faceUV = [];
    const faceColors = [];
    for (let i = 0; i < 6; i++) {
      faceUV.push(new BABYLON.Vector4(0, 0, 1, 1));
      faceColors.push(new BABYLON.Color4(0.65, 0.68, 0.78, 1));
    }
    const box = BABYLON.MeshBuilder.CreateBox("vcBox", { size: 1.6, faceUV, faceColors }, scene);

    // Create per-face multi-material
    const multiMat = new BABYLON.MultiMaterial("vcMulti", scene);
    const labels = ["RIGHT", "LEFT", "TOP", "BOTTOM", "BACK", "FRONT"]; // Babylon face order
    const mats = {};

    for (let i = 0; i < 6; i++) {
      const faceName = FACE_MAP[i];
      const mat = new BABYLON.StandardMaterial("vcFace_" + faceName, scene);
      mat.diffuseColor = new BABYLON.Color3(0.65, 0.68, 0.78);
      mat.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
      mat.emissiveColor = new BABYLON.Color3(0.15, 0.16, 0.2); // boost brightness

      // Dynamic texture for label
      const tex = new BABYLON.DynamicTexture("vcTex_" + faceName, { width: 256, height: 256 }, scene, false);
      const ctx = tex.getContext();
      ctx.fillStyle = "#8890a8";
      ctx.fillRect(0, 0, 256, 256);
      ctx.strokeStyle = "rgba(255,255,255,0.15)";
      ctx.lineWidth = 3;
      ctx.strokeRect(2, 2, 252, 252);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 36px system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(labels[i], 128, 128);
      tex.update();
      mat.diffuseTexture = tex;

      multiMat.subMaterials.push(mat);
      mats[faceName] = { mat, tex, index: i };
    }

    box.material = multiMat;
    box.subMeshes = [];
    const verticesCount = box.getTotalVertices();
    for (let i = 0; i < 6; i++) {
      box.subMeshes.push(new BABYLON.SubMesh(i, 0, verticesCount, i * 6, 6, box));
    }

    // Axis lines
    const axisLen = 1.4;
    const xLine = BABYLON.MeshBuilder.CreateLines("vcXAxis", { points: [BABYLON.Vector3.Zero(), new BABYLON.Vector3(axisLen, 0, 0)] }, scene);
    xLine.color = new BABYLON.Color3(0.9, 0.2, 0.2);
    const yLine = BABYLON.MeshBuilder.CreateLines("vcYAxis", { points: [BABYLON.Vector3.Zero(), new BABYLON.Vector3(0, axisLen, 0)] }, scene);
    yLine.color = new BABYLON.Color3(0.2, 0.9, 0.2);
    const zLine = BABYLON.MeshBuilder.CreateLines("vcZAxis", { points: [BABYLON.Vector3.Zero(), new BABYLON.Vector3(0, 0, axisLen)] }, scene);
    zLine.color = new BABYLON.Color3(0.2, 0.3, 0.9);

    // Edge wireframe for the cube
    const edgeBox = BABYLON.MeshBuilder.CreateBox("vcEdges", { size: 1.61 }, scene);
    edgeBox.enableEdgesRendering();
    edgeBox.edgesWidth = 2;
    edgeBox.edgesColor = new BABYLON.Color4(1, 1, 1, 0.3);
    const edgeMat = new BABYLON.StandardMaterial("vcEdgeMat", scene);
    edgeMat.alpha = 0;
    edgeBox.material = edgeMat;
    edgeBox.isPickable = false;

    miniEngineRef.current = engine;
    miniSceneRef.current = scene;
    miniCameraRef.current = camera;
    materialsRef.current = mats;

    engine.runRenderLoop(() => scene.render());

    return () => { engine.dispose(); miniEngineRef.current = null; };
  }, [model]); // re-run when model changes (canvas only exists when model is loaded)

  // Sync rotation with main camera every frame
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

  // Hover — highlight face
  const handleMove = useCallback((e) => {
    const scene = miniSceneRef.current;
    if (!scene) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const pick = scene.pick(x, y);

    // Reset all face colors
    for (const key of Object.keys(materialsRef.current)) {
      const { tex } = materialsRef.current[key];
      const ctx = tex.getContext();
      ctx.fillStyle = "#8890a8";
      ctx.fillRect(0, 0, 256, 256);
      ctx.strokeStyle = "rgba(255,255,255,0.15)";
      ctx.lineWidth = 3;
      ctx.strokeRect(2, 2, 252, 252);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 36px system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const label = key.toUpperCase();
      ctx.fillText(label, 128, 128);
      tex.update();
      materialsRef.current[key].mat.diffuseColor = new BABYLON.Color3(0.65, 0.68, 0.78);
    }

    if (pick.hit && pick.pickedMesh?.name === "vcBox") {
      const faceIdx = Math.floor(pick.faceId / 2); // Babylon: 2 triangles per face
      const faceName = FACE_MAP[faceIdx];
      if (faceName && materialsRef.current[faceName]) {
        const { tex, mat } = materialsRef.current[faceName];
        const ctx = tex.getContext();
        ctx.fillStyle = "#3090c0";
        ctx.fillRect(0, 0, 256, 256);
        ctx.strokeStyle = "rgba(76,201,240,0.9)";
        ctx.lineWidth = 4;
        ctx.strokeRect(4, 4, 248, 248);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 40px system-ui";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(faceName.toUpperCase(), 128, 128);
        tex.update();
        mat.diffuseColor = new BABYLON.Color3(0.4, 0.7, 0.9);
        hoveredFaceRef.current = faceName;
        canvasRef.current.style.cursor = "pointer";

        // Show 3x3 sub-region highlight
        // Get UV from pick
        if (pick.getTextureCoordinates) {
          const uv = pick.getTextureCoordinates();
          if (uv) {
            const regions = FACE_REGIONS[faceName];
            if (regions) {
              const u = uv.x, v = uv.y;
              let subView = faceName;
              const isTop = v > 1 - EDGE_T;
              const isBot = v < EDGE_T;
              const isLeft = u < EDGE_T;
              const isRight = u > 1 - EDGE_T;

              if (isTop && isLeft) subView = regions.tl;
              else if (isTop && isRight) subView = regions.tr;
              else if (isBot && isLeft) subView = regions.bl;
              else if (isBot && isRight) subView = regions.br;
              else if (isTop) subView = regions.t;
              else if (isBot) subView = regions.b;
              else if (isLeft) subView = regions.l;
              else if (isRight) subView = regions.r;

              hoveredFaceRef.current = subView;

              // Draw sub-region highlight on texture
              if (subView !== faceName) {
                const sx = isLeft ? 0 : isRight ? 256 * (1 - EDGE_T) : 256 * EDGE_T;
                const sy = isBot ? 0 : isTop ? 256 * (1 - EDGE_T) : 256 * EDGE_T;
                const sw = (isLeft || isRight) ? 256 * EDGE_T : 256 * (1 - 2 * EDGE_T);
                const sh = (isTop || isBot) ? 256 * EDGE_T : 256 * (1 - 2 * EDGE_T);
                ctx.fillStyle = "rgba(76,201,240,0.5)";
                ctx.fillRect(sx, 256 - sy - sh, sw, sh); // flip Y for texture
                tex.update();
              }
            }
          }
        }
        return;
      }
    }
    hoveredFaceRef.current = null;
    canvasRef.current.style.cursor = "default";
  }, []);

  const handleClick = useCallback((e) => {
    // Do pick directly (don't rely on hover state — click may not be preceded by move)
    const scene = miniSceneRef.current;
    if (!scene || !onCameraView) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const pick = scene.pick(x, y);
    if (!pick.hit || pick.pickedMesh?.name !== "vcBox") return;

    const faceIdx = Math.floor(pick.faceId / 2);
    const faceName = FACE_MAP[faceIdx];
    if (!faceName) return;

    // Determine sub-region via UV
    let viewName = faceName;
    const uv = pick.getTextureCoordinates?.();
    if (uv) {
      const regions = FACE_REGIONS[faceName];
      if (regions) {
        const u = uv.x, v = uv.y;
        const isTop = v > 1 - EDGE_T, isBot = v < EDGE_T;
        const isLeft = u < EDGE_T, isRight = u > 1 - EDGE_T;
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

    if (VIEWS[viewName]) onCameraView(viewName, VIEWS[viewName]);
  }, [onCameraView]);

  if (!model) return null;

  return (
    <canvas
      ref={canvasRef}
      width={SIZE}
      height={SIZE}
      className="absolute bottom-4 right-4 z-20"
      style={{ width: SIZE, height: SIZE, borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)" }}
      onMouseMove={handleMove}
      onClick={handleClick}
      onMouseLeave={() => {
        hoveredFaceRef.current = null;
        if (canvasRef.current) canvasRef.current.style.cursor = "default";
        // Reset face colors
        for (const key of Object.keys(materialsRef.current)) {
          const { tex, mat } = materialsRef.current[key];
          const ctx = tex.getContext();
          ctx.fillStyle = "#8890a8";
          ctx.fillRect(0, 0, 256, 256);
          ctx.strokeStyle = "rgba(255,255,255,0.15)";
          ctx.lineWidth = 2;
          ctx.strokeRect(2, 2, 252, 252);
          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 36px system-ui";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(key.toUpperCase(), 128, 128);
          tex.update();
          mat.diffuseColor = new BABYLON.Color3(0.65, 0.68, 0.78);
        }
      }}
      data-testid="viewcube"
    />
  );
}
