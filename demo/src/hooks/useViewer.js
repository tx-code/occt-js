// demo/src/hooks/useViewer.js
import { useRef, useEffect, useCallback } from "react";
import { useViewerStore } from "../store/viewerStore";

export function useViewer(canvasRef) {
  const engineRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const meshGeoMapRef = useRef(new Map());
  const meshesRef = useRef([]);
  const edgeLinesRef = useRef([]);
  const transformNodesRef = useRef([]);
  const gridMeshesRef = useRef([]);

  // Initialize Babylon.js
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Dispose previous engine if exists (React StrictMode double-mount)
    if (engineRef.current) {
      engineRef.current.dispose();
      engineRef.current = null;
      sceneRef.current = null;
      cameraRef.current = null;
    }

    const engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0.1, 0.1, 0.12, 1);

    const camera = new BABYLON.ArcRotateCamera("cam", Math.PI / 4, Math.PI / 3, 100, BABYLON.Vector3.Zero(), scene);
    camera.attachControl(canvas, true);
    camera.wheelPrecision = 5;
    camera.wheelDeltaPercentage = 0.05;
    camera.minZ = 0.1;
    camera.panningSensibility = 30;

    const hemi = new BABYLON.HemisphericLight("hemi", new BABYLON.Vector3(0, -1, 0), scene);
    hemi.intensity = 0.8;
    hemi.groundColor = new BABYLON.Color3(0.75, 0.75, 0.8);
    hemi.specular = new BABYLON.Color3(0.1, 0.1, 0.1);

    const dir = new BABYLON.DirectionalLight("dir", new BABYLON.Vector3(-1, -2, 1), scene);
    dir.intensity = 0.3;

    engineRef.current = engine;
    sceneRef.current = scene;
    cameraRef.current = camera;

    engine.runRenderLoop(() => scene.render());
    const onResize = () => engine.resize();
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      engine.dispose();
    };
  }, [canvasRef]);

  // Sync theme from store
  useEffect(() => {
    const unsub = useViewerStore.subscribe(
      (state) => state.theme,
      (theme) => {
        if (theme === "dark") {
          document.documentElement.classList.add("dark");
          document.documentElement.classList.remove("light");
        } else {
          document.documentElement.classList.add("light");
          document.documentElement.classList.remove("dark");
        }
        const scene = sceneRef.current;
        if (scene) {
          scene.clearColor = theme === "dark"
            ? new BABYLON.Color4(0.1, 0.1, 0.12, 1)
            : new BABYLON.Color4(0.92, 0.92, 0.94, 1);
        }
      }
    );
    return unsub;
  }, []);

  // Sync faces/edges visibility from store
  useEffect(() => {
    const unsub = useViewerStore.subscribe(
      (state) => ({ facesVisible: state.facesVisible, edgesVisible: state.edgesVisible }),
      ({ facesVisible, edgesVisible }) => {
        for (const m of meshesRef.current) m.isVisible = facesVisible;
        for (const l of edgeLinesRef.current) l.isVisible = edgesVisible;
      },
      { equalityFn: (a, b) => a.facesVisible === b.facesVisible && a.edgesVisible === b.edgesVisible }
    );
    return unsub;
  }, []);

  // Sync grid visibility from store
  useEffect(() => {
    const unsub = useViewerStore.subscribe(
      (state) => state.gridVisible,
      (visible) => {
        for (const m of gridMeshesRef.current) m.isVisible = visible;
      }
    );
    return unsub;
  }, []);

  // Build scene from OCCT result
  const buildScene = useCallback((result) => {
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    if (!scene || !camera) return;

    // Clear previous
    for (const m of meshesRef.current) m.dispose();
    for (const l of edgeLinesRef.current) l.dispose();
    for (const t of transformNodesRef.current) t.dispose();
    for (const g of gridMeshesRef.current) g.dispose();
    meshesRef.current = [];
    edgeLinesRef.current = [];
    transformNodesRef.current = [];
    gridMeshesRef.current = [];
    meshGeoMapRef.current.clear();
    scene.materials.slice().forEach((m) => { if (m.name.startsWith("mat_")) m.dispose(); });

    const defaultColor = new BABYLON.Color3(0.7, 0.7, 0.7);
    const edgeColor = new BABYLON.Color3(0.15, 0.15, 0.18);

    // Material cache
    const matCache = new Map();
    const getMat = (color) => {
      if (!color) color = { r: 0.7, g: 0.7, b: 0.7 };
      const key = `${(color.r * 255) | 0},${(color.g * 255) | 0},${(color.b * 255) | 0}`;
      if (matCache.has(key)) return matCache.get(key);
      const mat = new BABYLON.StandardMaterial("mat_" + key, scene);
      mat.diffuseColor = new BABYLON.Color3(color.r, color.g, color.b);
      mat.backFaceCulling = false;
      mat.twoSidedLighting = true;
      matCache.set(key, mat);
      return mat;
    };

    const geoCache = new Map();

    const applyTransform = (node, transform) => {
      if (!transform || transform.length !== 16) return;
      const m = BABYLON.Matrix.FromArray(transform);
      const s = new BABYLON.Vector3();
      const r = BABYLON.Quaternion.Identity();
      const p = new BABYLON.Vector3();
      m.decompose(s, r, p);
      node.position.copyFrom(p);
      node.scaling.copyFrom(s);
      node.rotationQuaternion = r;
    };

    const buildEdgeLines = (geo, parent) => {
      if (!geo.edges || geo.edges.length === 0) return;
      const lines = [];
      for (const edge of geo.edges) {
        const pts = edge.points;
        if (!pts || pts.length < 6) continue;
        const line = [];
        for (let i = 0; i < pts.length; i += 3) {
          line.push(new BABYLON.Vector3(pts[i], pts[i + 1], pts[i + 2]));
        }
        lines.push(line);
      }
      if (lines.length === 0) return;
      const ls = BABYLON.MeshBuilder.CreateLineSystem("edges", { lines }, scene);
      ls.color = edgeColor;
      ls.parent = parent;
      ls.isPickable = false;
      edgeLinesRef.current.push(ls);
    };

    const buildPart = (nodeData, parent) => {
      const meshIndices = nodeData.meshes || [];
      for (let mi = 0; mi < meshIndices.length; mi++) {
        const geoIdx = meshIndices[mi];
        const geo = result.geometries[geoIdx];
        if (!geo || !geo.positions || geo.positions.length === 0) continue;

        const hasMultiColor = geo.faces && geo.faces.some((f) => f.color) &&
          new Set(geo.faces.filter((f) => f.color).map((f) => `${(f.color.r * 255) | 0},${(f.color.g * 255) | 0},${(f.color.b * 255) | 0}`)).size > 1;

        const cacheKey = `${geoIdx}`;
        if (geoCache.has(cacheKey)) {
          const source = geoCache.get(cacheKey);
          const inst = source.createInstance(nodeData.name || "part_inst");
          inst.parent = parent;
          applyTransform(inst, nodeData.transform);
          meshesRef.current.push(inst);
          // Edge lines for instances (createInstance doesn't copy children)
          buildEdgeLines(geo, inst);
          continue; // not return — there may be more meshIndices for this node
        }

        const mesh = new BABYLON.Mesh(nodeData.name || `part_${geoIdx}`, scene);
        mesh.parent = parent;
        applyTransform(mesh, nodeData.transform);

        const positions = new Float32Array(geo.positions);
        const indices = new Uint32Array(geo.indices);
        const vd = new BABYLON.VertexData();
        vd.positions = positions;
        vd.indices = indices;
        if (geo.normals && geo.normals.length > 0) vd.normals = new Float32Array(geo.normals);

        if (hasMultiColor && geo.faces) {
          const vertexCount = positions.length / 3;
          const colors = new Float32Array(vertexCount * 4);
          for (let v = 0; v < vertexCount; v++) {
            colors[v * 4] = 0.7; colors[v * 4 + 1] = 0.7; colors[v * 4 + 2] = 0.7; colors[v * 4 + 3] = 1;
          }
          for (const face of geo.faces) {
            const c = face.color || geo.color || null;
            const cr = c ? c.r : 0.7, cg = c ? c.g : 0.7, cb = c ? c.b : 0.7;
            for (let i = face.firstIndex; i < face.firstIndex + face.indexCount; i++) {
              const vi = indices[i];
              colors[vi * 4] = cr; colors[vi * 4 + 1] = cg; colors[vi * 4 + 2] = cb; colors[vi * 4 + 3] = 1;
            }
          }
          vd.colors = colors;
        }

        vd.applyToMesh(mesh);

        if (hasMultiColor) {
          const mat = new BABYLON.StandardMaterial("mat_vcolor_" + geoIdx, scene);
          mat.diffuseColor = new BABYLON.Color3(1, 1, 1);
          mat.backFaceCulling = false;
          mat.twoSidedLighting = true;
          mesh.material = mat;
        } else {
          let meshColor = geo.color;
          if (geo.faces) {
            for (const face of geo.faces) {
              if (face.color) { meshColor = face.color; break; }
            }
          }
          mesh.material = getMat(meshColor);
        }

        meshGeoMapRef.current.set(mesh, geo);
        geoCache.set(cacheKey, mesh);
        meshesRef.current.push(mesh);
        buildEdgeLines(geo, mesh);
      }
    };

    const buildNode = (nodeData, parent) => {
      if (nodeData.isAssembly || (nodeData.children && nodeData.children.length > 0)) {
        const tn = new BABYLON.TransformNode(nodeData.name || "assembly", scene);
        tn.parent = parent;
        applyTransform(tn, nodeData.transform);
        transformNodesRef.current.push(tn);
        if (nodeData.children) for (const c of nodeData.children) buildNode(c, tn);
        if (nodeData.meshes && nodeData.meshes.length > 0) buildPart(nodeData, tn);
      } else {
        buildPart(nodeData, parent);
      }
    };

    const root = new BABYLON.TransformNode("__root__", scene);
    transformNodesRef.current.push(root);
    for (const rn of result.rootNodes || []) buildNode(rn, root);

    // Frame camera — calculate radius to fit model in viewport
    const bounds = root.getHierarchyBoundingVectors(true);
    const center = bounds.min.add(bounds.max).scale(0.5);
    const extent = bounds.max.subtract(bounds.min);
    const modelSize = extent.length();
    const fov = camera.fov || 0.8;
    const radius = (modelSize * 0.5) / Math.tan(fov * 0.5) * 1.2; // 1.2 = padding

    camera.target = center;
    camera.radius = Math.max(radius, 1);
    camera.alpha = Math.PI / 4;
    camera.beta = Math.PI / 3;
    camera.lowerRadiusLimit = modelSize * 0.01;
    camera.upperRadiusLimit = modelSize * 10;
    camera.minZ = modelSize * 0.001;
    camera.maxZ = modelSize * 100;

    // --- Ground grid ---
    const gridSize = modelSize * 4;
    const ground = BABYLON.MeshBuilder.CreateGround("grid", {
      width: gridSize,
      height: gridSize,
      subdivisions: 1,
    }, scene);

    // Adaptive grid ratio: pick a ratio so there are ~10-50 visible grid cells
    const maxDim = Math.max(extent.x, extent.y, extent.z);
    let gridRatio = 1;
    if (maxDim > 0) {
      // Target ~20 grid lines across the largest dimension
      const raw = maxDim / 20;
      // Snap to nearest power of 10: 0.01, 0.1, 1, 10, 100, 1000
      gridRatio = Math.pow(10, Math.round(Math.log10(raw)));
    }

    const gridMat = new BABYLON.GridMaterial("gridMat", scene);
    gridMat.mainColor = new BABYLON.Color3(0, 0, 0);
    gridMat.lineColor = new BABYLON.Color3(0.3, 0.3, 0.35);
    gridMat.opacity = 0.98;
    gridMat.gridRatio = gridRatio;
    gridMat.majorUnitFrequency = 10;
    gridMat.minorUnitVisibility = 0.3;
    gridMat.backFaceCulling = false;

    ground.material = gridMat;
    ground.position.y = bounds.min.y - 0.01;
    ground.isPickable = false;

    // X-axis line (red)
    const xAxis = BABYLON.MeshBuilder.CreateLines("xAxis", {
      points: [
        new BABYLON.Vector3(-gridSize / 2, bounds.min.y, 0),
        new BABYLON.Vector3(gridSize / 2, bounds.min.y, 0),
      ],
    }, scene);
    xAxis.color = new BABYLON.Color3(0.8, 0.2, 0.2);
    xAxis.isPickable = false;

    // Z-axis line (green — Babylon Y-up, Z is forward)
    const zAxis = BABYLON.MeshBuilder.CreateLines("zAxis", {
      points: [
        new BABYLON.Vector3(0, bounds.min.y, -gridSize / 2),
        new BABYLON.Vector3(0, bounds.min.y, gridSize / 2),
      ],
    }, scene);
    zAxis.color = new BABYLON.Color3(0.2, 0.8, 0.2);
    zAxis.isPickable = false;

    // Apply current visibility state
    const gridVisible = useViewerStore.getState().gridVisible;
    ground.isVisible = gridVisible;
    xAxis.isVisible = gridVisible;
    zAxis.isVisible = gridVisible;

    gridMeshesRef.current.push(ground, xAxis, zAxis);
  }, []);

  const fitAll = useCallback(() => {
    const camera = cameraRef.current;
    const root = transformNodesRef.current[0];
    if (!camera || !root) return;
    const bounds = root.getHierarchyBoundingVectors(true);
    const center = bounds.min.add(bounds.max).scale(0.5);
    const extent = bounds.max.subtract(bounds.min);
    const modelSize = extent.length();
    const fov = camera.fov || 0.8;
    const radius = (modelSize * 0.5) / Math.tan(fov * 0.5) * 1.2;
    camera.target = center;
    camera.radius = Math.max(radius, 1);
    camera.alpha = Math.PI / 4;
    camera.beta = Math.PI / 3;
  }, []);

  const setCameraView = useCallback((direction, customView) => {
    const camera = cameraRef.current;
    const root = transformNodesRef.current[0];
    if (!camera || !root) return;

    const bounds = root.getHierarchyBoundingVectors(true);
    const center = bounds.min.add(bounds.max).scale(0.5);
    const extent = bounds.max.subtract(bounds.min);
    const modelSize = extent.length();
    const fov = camera.fov || 0.8;
    const radius = Math.max((modelSize * 0.5) / Math.tan(fov * 0.5) * 1.2, 1);

    // ArcRotateCamera: alpha = rotation around Y from +X, beta = angle from +Y
    const views = {
      front:  { alpha: -Math.PI / 2, beta: Math.PI / 2 },
      back:   { alpha: Math.PI / 2,  beta: Math.PI / 2 },
      top:    { alpha: -Math.PI / 2, beta: 0.01 },
      bottom: { alpha: -Math.PI / 2, beta: Math.PI - 0.01 },
      left:   { alpha: Math.PI,      beta: Math.PI / 2 },
      right:  { alpha: 0,            beta: Math.PI / 2 },
      iso:    { alpha: Math.PI / 4,  beta: Math.PI / 3 },
    };

    const view = customView || views[direction];
    if (!view) return;

    // Animate camera transition (0.3s)
    BABYLON.Animation.CreateAndStartAnimation("camAlpha", camera, "alpha", 30, 9, camera.alpha, view.alpha, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
    BABYLON.Animation.CreateAndStartAnimation("camBeta", camera, "beta", 30, 9, camera.beta, view.beta, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);

    camera.target = center;
    camera.radius = radius;

    // Update ortho bounds if in orthographic mode
    if (camera.mode === BABYLON.Camera.ORTHOGRAPHIC_CAMERA) {
      const size = Math.max(extent.length() * 0.5, 1);
      const aspect = camera.getEngine().getAspectRatio(camera);
      camera.orthoLeft = -size * aspect;
      camera.orthoRight = size * aspect;
      camera.orthoTop = size;
      camera.orthoBottom = -size;
    }
  }, []);

  const setProjection = useCallback((mode) => {
    const camera = cameraRef.current;
    const root = transformNodesRef.current[0];
    if (!camera) return;

    if (mode === "orthographic") {
      camera.mode = BABYLON.Camera.ORTHOGRAPHIC_CAMERA;
      // Calculate ortho bounds from model extent
      if (root) {
        const bounds = root.getHierarchyBoundingVectors(true);
        const extent = bounds.max.subtract(bounds.min);
        const size = Math.max(extent.length() * 0.5, 1);
        const aspect = camera.getEngine().getAspectRatio(camera);
        camera.orthoLeft = -size * aspect;
        camera.orthoRight = size * aspect;
        camera.orthoTop = size;
        camera.orthoBottom = -size;
      }
    } else {
      camera.mode = BABYLON.Camera.PERSPECTIVE_CAMERA;
    }
  }, []);

  const takeSnapshot = useCallback(() => {
    const engine = engineRef.current;
    const camera = cameraRef.current;
    if (!engine || !camera) return;
    BABYLON.Tools.CreateScreenshot(engine, camera, { width: 1920, height: 1080 }, (data) => {
      const link = document.createElement("a");
      link.href = data;
      link.download = "occt-js-snapshot.png";
      link.click();
    });
  }, []);

  return { engineRef, sceneRef, cameraRef, meshGeoMapRef, meshesRef, edgeLinesRef, buildScene, fitAll, setCameraView, setProjection, takeSnapshot };
}
