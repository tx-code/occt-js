// demo/src/hooks/useViewer.js
import { useRef, useEffect, useCallback } from "react";
import { useViewerStore } from "../store/viewerStore";
import { getCameraAttachOptions } from "../lib/camera-input.js";
import { buildOcctScene } from "@tx-code/occt-babylon-loader";
import {
  createCadPartMaterial,
  createCadVertexColorMaterial,
  createOcctBabylonViewer,
  getCadMaterialKey,
  getCadVertexColorDefault,
  resolveShadingNormals,
} from "@tx-code/occt-babylon-viewer";

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
    for (const edgeMesh of edgeLinesRef.current) {
      if (edgeMesh && !edgeMesh.isDisposed?.()) {
        edgeMesh.dispose(false, true);
      }
    }

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
    const viewerRuntime = createOcctBabylonViewer(scene, {
      sceneBuilder: buildOcctScene,
      theme: useViewerStore.getState().theme,
    });
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
    const applyTheme = (theme) => {
      if (theme === "dark") {
        document.documentElement.classList.add("dark");
        document.documentElement.classList.remove("light");
      } else {
        document.documentElement.classList.add("light");
        document.documentElement.classList.remove("dark");
      }
      const scene = sceneRef.current;
      if (scene) {
        viewerRuntimeRef.current?.setTheme(theme);
      }
    };

    applyTheme(useViewerStore.getState().theme);

    const unsub = useViewerStore.subscribe(
      (state) => state.theme,
      applyTheme
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

    const edgeColor = new BABYLON.Color3(0.1, 0.1, 0.12);

    // Material cache
    const matCache = new Map();
    const fallbackCadColor = getCadVertexColorDefault();
    const resolveCadColor = (color) => {
      if (!color) return fallbackCadColor;
      if (typeof color.r !== "number" || typeof color.g !== "number" || typeof color.b !== "number") {
        return fallbackCadColor;
      }
      return color;
    };
    const getMat = (color) => {
      const safeColor = resolveCadColor(color);
      const key = getCadMaterialKey(safeColor);
      if (matCache.has(key)) return matCache.get(key);
      const mat = createCadPartMaterial(scene, "mat_" + key, safeColor);
      matCache.set(key, mat);
      return mat;
    };

    const edgeTubeMaterial = new BABYLON.StandardMaterial("edge_tube_mat", scene);
    edgeTubeMaterial.diffuseColor = edgeColor;
    edgeTubeMaterial.emissiveColor = edgeColor.scale(0.92);
    edgeTubeMaterial.specularColor = BABYLON.Color3.Black();
    edgeTubeMaterial.backFaceCulling = false;
    edgeTubeMaterial.disableLighting = true;

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

      const positions = geo.positions || [];
      let minX = Number.POSITIVE_INFINITY;
      let minY = Number.POSITIVE_INFINITY;
      let minZ = Number.POSITIVE_INFINITY;
      let maxX = Number.NEGATIVE_INFINITY;
      let maxY = Number.NEGATIVE_INFINITY;
      let maxZ = Number.NEGATIVE_INFINITY;
      for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i];
        const y = positions[i + 1];
        const z = positions[i + 2];
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (z < minZ) minZ = z;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
        if (z > maxZ) maxZ = z;
      }

      const hasBounds = Number.isFinite(minX) && Number.isFinite(maxX);
      const cx = hasBounds ? (minX + maxX) * 0.5 : 0;
      const cy = hasBounds ? (minY + maxY) * 0.5 : 0;
      const cz = hasBounds ? (minZ + maxZ) * 0.5 : 0;
      const dx = hasBounds ? (maxX - minX) : 1;
      const dy = hasBounds ? (maxY - minY) : 1;
      const dz = hasBounds ? (maxZ - minZ) : 1;
      const diagonal = Math.max(Math.sqrt(dx * dx + dy * dy + dz * dz), 1);
      const edgeOffset = diagonal * 0.00016;
      const tubeRadius = Math.max(diagonal / 9000, 0.0004);
      const tubeTessellation = diagonal > 3000 ? 4 : 6;

      const lines = [];
      let segmentCount = 0;

      for (let edgeIndex = 0; edgeIndex < geo.edges.length; edgeIndex++) {
        const edge = geo.edges[edgeIndex];
        const pts = edge.points;
        if (!pts || pts.length < 6) continue;

        const path = [];
        for (let i = 0; i < pts.length; i += 3) {
          const px = pts[i];
          const py = pts[i + 1];
          const pz = pts[i + 2];

          const ox = px - cx;
          const oy = py - cy;
          const oz = pz - cz;
          const len = Math.sqrt(ox * ox + oy * oy + oz * oz);
          if (len > 1e-8) {
            const scale = edgeOffset / len;
            path.push(new BABYLON.Vector3(px + ox * scale, py + oy * scale, pz + oz * scale));
          } else {
            path.push(new BABYLON.Vector3(px, py, pz));
          }
        }

        if (path.length >= 2) {
          lines.push(path);
          segmentCount += path.length - 1;
        }
      }

      if (lines.length === 0) return;

      // Keep tubes for medium-size models; fall back for heavy geometry to preserve import latency.
      const canUseTube = segmentCount <= 6000 && lines.length <= 1200;
      if (!canUseTube) {
        const ls = BABYLON.MeshBuilder.CreateLineSystem("edges", { lines, updatable: false }, scene);
        ls.color = edgeColor;
        ls.parent = parent;
        ls.isPickable = false;
        ls.alpha = 0.95;
        ls.renderingGroupId = 1;
        ls.alwaysSelectAsActiveMesh = true;
        edgeLinesRef.current.push(ls);
        return;
      }

      const mergedBatches = [];
      let batch = [];
      const mergeBatch = () => {
        if (batch.length === 0) return;
        const merged = batch.length === 1
          ? batch[0]
          : BABYLON.Mesh.MergeMeshes(batch, true, true, undefined, false, true);
        if (merged) {
          mergedBatches.push(merged);
        } else {
          mergedBatches.push(...batch);
        }
        batch = [];
      };

      for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        const tube = BABYLON.MeshBuilder.CreateTube(
          `edge_tube_${lineIndex}`,
          {
            path: lines[lineIndex],
            radius: tubeRadius,
            tessellation: tubeTessellation,
            cap: BABYLON.Mesh.NO_CAP,
            sideOrientation: BABYLON.Mesh.DOUBLESIDE,
            updatable: false,
          },
          scene,
        );
        tube.material = edgeTubeMaterial;
        tube.isPickable = false;
        batch.push(tube);
        if (batch.length >= 180) {
          mergeBatch();
        }
      }
      mergeBatch();

      for (const mesh of mergedBatches) {
        mesh.parent = parent;
        mesh.isPickable = false;
        mesh.alwaysSelectAsActiveMesh = true;
        mesh.renderingGroupId = 1;
        edgeLinesRef.current.push(mesh);
      }
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
        vd.normals = resolveShadingNormals(positions, indices, geo.normals, { mode: "recompute" });

        if (hasMultiColor && geo.faces) {
          const vertexCount = positions.length / 3;
          const colors = new Float32Array(vertexCount * 4);
          const fallbackColor = getCadVertexColorDefault();
          for (let v = 0; v < vertexCount; v++) {
            colors[v * 4] = fallbackColor.r;
            colors[v * 4 + 1] = fallbackColor.g;
            colors[v * 4 + 2] = fallbackColor.b;
            colors[v * 4 + 3] = 1;
          }
          for (const face of geo.faces) {
            const c = face.color || geo.color || null;
            const cr = c ? c.r : fallbackColor.r;
            const cg = c ? c.g : fallbackColor.g;
            const cb = c ? c.b : fallbackColor.b;
            for (let i = face.firstIndex; i < face.firstIndex + face.indexCount; i++) {
              const vi = indices[i];
              colors[vi * 4] = cr; colors[vi * 4 + 1] = cg; colors[vi * 4 + 2] = cb; colors[vi * 4 + 3] = 1;
            }
          }
          vd.colors = colors;
        }

        vd.applyToMesh(mesh);

        if (hasMultiColor) {
          const mat = createCadVertexColorMaterial(scene, "mat_vcolor_" + geoIdx);
          mesh.material = mat;
          mesh.useVertexColors = true;
        } else {
          let meshColor = geo.color;
          if (geo.faces) {
            for (const face of geo.faces) {
              if (face.color) { meshColor = face.color; break; }
            }
          }
          mesh.material = getMat(resolveCadColor(meshColor));
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
