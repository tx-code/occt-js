// demo/src/hooks/useViewer.js
import { useRef, useEffect, useCallback } from "react";
import { useViewerStore } from "../store/viewerStore";
import { getCameraAttachOptions } from "../lib/camera-input.js";
import { createOcctBabylonViewer } from "@tx-code/occt-babylon-viewer";

export function useViewer(canvasRef) {
  const engineRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const viewerRuntimeRef = useRef(null);
  const meshGeoMapRef = useRef(new Map());
  const meshesRef = useRef([]);
  const edgeLinesRef = useRef([]);
  const transformNodesRef = useRef([]);

  const clearScene = useCallback(() => {
    const viewerRuntime = viewerRuntimeRef.current;
    if (viewerRuntime) {
      viewerRuntime.clearModel();
    }

    meshesRef.current = [];
    edgeLinesRef.current = [];
    transformNodesRef.current = [];
    meshGeoMapRef.current.clear();
  }, []);

  // Initialize Babylon.js
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Dispose previous engine if exists (React StrictMode double-mount)
    if (engineRef.current) {
      viewerRuntimeRef.current?.dispose();
      viewerRuntimeRef.current = null;
      engineRef.current.dispose();
      engineRef.current = null;
      sceneRef.current = null;
      cameraRef.current = null;
    }

    const engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0.1, 0.1, 0.12, 1);
    const viewerRuntime = createOcctBabylonViewer(scene);
    const camera = viewerRuntime.getCamera();
    const { noPreventDefault } = getCameraAttachOptions();
    camera?.attachControl(canvas, noPreventDefault);

    engineRef.current = engine;
    sceneRef.current = scene;
    cameraRef.current = camera;
    viewerRuntimeRef.current = viewerRuntime;

    engine.runRenderLoop(() => scene.render());
    const onResize = () => engine.resize();
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      viewerRuntimeRef.current?.dispose();
      viewerRuntimeRef.current = null;
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
        const viewerRuntime = viewerRuntimeRef.current;
        viewerRuntime?.setGridVisible(visible);
        viewerRuntime?.setAxesVisible(visible);
      }
    );
    return unsub;
  }, []);

  // Build scene from OCCT result
  const buildScene = useCallback((result) => {
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    if (!scene || !camera) return;

    clearScene();

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

    const viewerRuntime = viewerRuntimeRef.current;
    const root = new BABYLON.TransformNode("__root__", scene);
    root.parent = viewerRuntime?.getRootNode() ?? null;
    transformNodesRef.current.push(root);
    for (const rn of result.rootNodes || []) buildNode(rn, root);

    viewerRuntime?.refreshHelpers?.();
    viewerRuntime?.fitAll();
    const gridVisible = useViewerStore.getState().gridVisible;
    viewerRuntime?.setGridVisible(gridVisible);
    viewerRuntime?.setAxesVisible(gridVisible);
  }, [clearScene]);

  const fitAll = useCallback(() => {
    viewerRuntimeRef.current?.fitAll();
  }, []);

  const setCameraView = useCallback((direction, customView) => {
    if (!customView) {
      try {
        viewerRuntimeRef.current?.setView(direction);
        return;
      } catch {
        // Fall back to the legacy custom-view path below.
      }
    }

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
    viewerRuntimeRef.current?.setProjection(mode);
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

  return {
    engineRef,
    sceneRef,
    cameraRef,
    viewerRuntimeRef,
    meshGeoMapRef,
    meshesRef,
    edgeLinesRef,
    buildScene,
    clearScene,
    fitAll,
    setCameraView,
    setProjection,
    takeSnapshot,
  };
}
