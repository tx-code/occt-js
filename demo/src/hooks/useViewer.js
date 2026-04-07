// demo/src/hooks/useViewer.js
import { useRef, useEffect, useCallback } from "react";
import { useViewerStore } from "../store/viewerStore";
import { getCameraAttachOptions } from "../lib/camera-input.js";
import { createMockToolpathBatches } from "../lib/mock-toolpath.js";
import { buildOcctScene } from "@tx-code/occt-babylon-loader";
import {
  buildOcctEdgeLinePassBatch,
  createOcctBabylonViewer,
  createViewerLinePass,
} from "@tx-code/occt-babylon-viewer";

const LINE_PASS_LAYER_STYLES = Object.freeze({
  "cad-edges": Object.freeze({
    mode: "base",
    capExtension: 0,
    widthScale: 1,
    renderingGroupId: 0,
    alphaIndex: 0,
    depthFunction: "lequal",
    blending: false,
    zOffset: -1,
    zOffsetUnits: -2,
  }),
  toolpath: Object.freeze({
    mode: "base",
    capExtension: 0,
    widthScale: 1,
    renderingGroupId: 0,
    alphaIndex: 1,
    depthFunction: "lequal",
    blending: false,
    zOffset: -1,
    zOffsetUnits: -2,
  }),
  "cad-highlight-select-visible": Object.freeze({
    mode: "base",
    capExtension: 0,
    widthScale: 1.22,
    renderingGroupId: 1,
    alphaIndex: 22,
    depthFunction: "lequal",
    blending: false,
    zOffset: -3,
    zOffsetUnits: -4,
  }),
  "cad-highlight-select-xray": Object.freeze({
    mode: "base",
    capExtension: 0,
    widthScale: 1.08,
    renderingGroupId: 1,
    alphaIndex: 21,
    depthFunction: "always",
    blending: true,
    zOffset: 0,
    zOffsetUnits: 0,
  }),
  "cad-highlight-hover-visible": Object.freeze({
    mode: "base",
    capExtension: 0,
    widthScale: 1.12,
    renderingGroupId: 1,
    alphaIndex: 24,
    depthFunction: "lequal",
    blending: true,
    zOffset: -2,
    zOffsetUnits: -3,
  }),
  "cad-highlight-hover-xray": Object.freeze({
    mode: "base",
    capExtension: 0,
    widthScale: 1.08,
    renderingGroupId: 1,
    alphaIndex: 23,
    depthFunction: "always",
    blending: true,
    zOffset: 0,
    zOffsetUnits: 0,
  }),
});

function rgba(color, alpha) {
  return [color[0], color[1], color[2], alpha];
}

function buildPolylineHighlightBatch({
  id,
  layer,
  lines,
  color,
  width = 1.5,
}) {
  const points = [];
  const segmentColors = [];
  const segmentDashPeriods = [];
  const breakSegmentIndices = [];
  let hasAnyLine = false;

  for (const line of lines || []) {
    if (!line || line.length < 6 || line.length % 3 !== 0) {
      continue;
    }

    if (hasAnyLine) {
      const bridgeSegmentIndex = points.length / 3 - 1;
      breakSegmentIndices.push(bridgeSegmentIndex);
      segmentColors.push(...color);
      segmentDashPeriods.push(0);
    }

    for (let index = 0; index < line.length; index += 3) {
      points.push(line[index], line[index + 1], line[index + 2]);
    }

    const segmentCount = line.length / 3 - 1;
    for (let segmentIndex = 0; segmentIndex < segmentCount; segmentIndex += 1) {
      segmentColors.push(...color);
      segmentDashPeriods.push(0);
    }

    hasAnyLine = true;
  }

  if (points.length < 6) {
    return null;
  }

  return {
    id,
    layer,
    points,
    segmentColors,
    segmentDashPeriods,
    breakSegmentIndices,
    width,
  };
}

function buildHighlightBatchSet(kind, token, lines, config) {
  const visibleBatch = buildPolylineHighlightBatch({
    id: `${token}:visible`,
    layer: config.visibleLayer,
    lines,
    color: rgba(config.color, config.visibleAlpha),
    width: config.width,
  });
  const xrayBatch = config.xrayAlpha > 0
    ? buildPolylineHighlightBatch({
      id: `${token}:xray`,
      layer: config.xrayLayer,
      lines,
      color: rgba(config.color, config.xrayAlpha),
      width: config.width,
    })
    : null;

  const batches = [];
  if (visibleBatch) {
    batches.push(visibleBatch);
  }
  if (xrayBatch) {
    batches.push(xrayBatch);
  }
  return batches;
}

export function useViewer(canvasRef) {
  const engineRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const viewerRuntimeRef = useRef(null);
  const meshGeoMapRef = useRef(new Map());
  const meshesRef = useRef([]);
  const edgeLinesRef = useRef([]);
  const linePassRef = useRef(null);
  const cadEdgeBatchesRef = useRef([]);
  const edgeHighlightBatchesRef = useRef({
    hover: new Map(),
    select: new Map(),
  });

  const edgeHighlightConfig = useRef({
    hover: {
      visibleLayer: "cad-highlight-hover-visible",
      xrayLayer: "cad-highlight-hover-xray",
      color: [0, 0.8, 1.0],
      visibleAlpha: 0.92,
      xrayAlpha: 0.36,
      width: 1.45,
    },
    select: {
      visibleLayer: "cad-highlight-select-visible",
      xrayLayer: "cad-highlight-select-xray",
      color: [0, 1.0, 0.3],
      visibleAlpha: 1.0,
      xrayAlpha: 0,
      width: 1.55,
    },
  });

  const applyLinePassBatches = useCallback(() => {
    const scene = sceneRef.current;
    const linePass = linePassRef.current;
    if (!scene || !linePass) {
      return;
    }

    const batches = [...cadEdgeBatchesRef.current];
    for (const highlightMap of [edgeHighlightBatchesRef.current.select, edgeHighlightBatchesRef.current.hover]) {
      for (const highlightBatches of highlightMap.values()) {
        batches.push(...highlightBatches);
      }
    }
    if (useViewerStore.getState().toolpathVisible) {
      batches.push(...createMockToolpathBatches());
    }

    linePass.updateBatches(batches);
    edgeLinesRef.current = scene.meshes.filter((mesh) =>
      mesh.metadata?.occtLinePassLayer === "cad-edges" ||
      mesh.metadata?.occtLinePassLayer === "toolpath"
    );
    linePass.setVisible("cad-edges", useViewerStore.getState().edgesVisible);
    linePass.setVisible("toolpath", useViewerStore.getState().toolpathVisible);
  }, []);

  const clearScene = useCallback(() => {
    linePassRef.current?.dispose?.();
    linePassRef.current = null;
    cadEdgeBatchesRef.current = [];
    edgeHighlightBatchesRef.current.hover.clear();
    edgeHighlightBatchesRef.current.select.clear();

    const viewerRuntime = viewerRuntimeRef.current;
    if (viewerRuntime) {
      viewerRuntime.clearModel();
    }

    meshesRef.current = [];
    edgeLinesRef.current = [];
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
      linePassRef.current?.setTheme?.(theme);
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
        linePassRef.current?.setVisible?.("cad-edges", edgesVisible);
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

  useEffect(() => {
    const unsub = useViewerStore.subscribe(
      (state) => state.toolpathVisible,
      () => {
        applyLinePassBatches();
      }
    );
    return unsub;
  }, [applyLinePassBatches]);

  // Build scene from normalized OCCT model.
  const buildScene = useCallback((result) => {
    const scene = sceneRef.current;
    const viewerRuntime = viewerRuntimeRef.current;
    if (!scene || !viewerRuntime || !result) {
      return;
    }

    clearScene();

    linePassRef.current = createViewerLinePass(scene, {
      theme: useViewerStore.getState().theme,
      layerStyles: LINE_PASS_LAYER_STYLES,
    });

    const loaded = viewerRuntime.loadOcctModel(result, {
      sceneBuilder: buildOcctScene,
    });
    const geometryMap = new Map((result.geometries || []).map((geo) => [geo.id, geo]));
    const cadEdgeBatches = [];
    const renderedMeshes = [];

    for (const mesh of loaded?.meshes || []) {
      if (!mesh || typeof mesh !== "object") {
        continue;
      }

      const sourceMesh = mesh.sourceMesh || mesh;
      const metadata = (mesh.metadata && typeof mesh.metadata === "object" ? mesh.metadata : null) ||
        (sourceMesh.metadata && typeof sourceMesh.metadata === "object" ? sourceMesh.metadata : null);
      const occtMeta = metadata?.occt && typeof metadata.occt === "object" ? metadata.occt : null;
      const geometryId = typeof occtMeta?.geometryId === "string" ? occtMeta.geometryId : null;
      if (!geometryId) {
        continue;
      }

      const geometry = geometryMap.get(geometryId);
      if (!geometry) {
        continue;
      }

      meshGeoMapRef.current.set(sourceMesh, geometry);
      meshGeoMapRef.current.set(mesh, geometry);
      renderedMeshes.push(mesh);

      const worldMatrix = mesh.computeWorldMatrix?.(true)?.toArray?.() ?? null;
      const batch = buildOcctEdgeLinePassBatch(geometry, {
        theme: useViewerStore.getState().theme,
        transformMatrix: worldMatrix,
      });
      if (batch) {
        cadEdgeBatches.push(batch);
      }
    }

    meshesRef.current = renderedMeshes;
    cadEdgeBatchesRef.current = cadEdgeBatches;
    applyLinePassBatches();

    const { facesVisible, gridVisible } = useViewerStore.getState();
    for (const mesh of meshesRef.current) {
      mesh.isVisible = facesVisible;
    }
    viewerRuntime.setGridVisible(gridVisible);
    viewerRuntime.setAxesVisible(gridVisible);
    viewerRuntime.refreshHelpers?.();
    viewerRuntime.fitAll();
  }, [applyLinePassBatches, clearScene]);

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
    const root = viewerRuntimeRef.current?.getRootNode?.();
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

  const setEdgeHighlight = useCallback((kind, token, lines) => {
    if (kind !== "hover" && kind !== "select") {
      return;
    }

    const map = edgeHighlightBatchesRef.current[kind];
    const config = edgeHighlightConfig.current[kind];
    const batches = buildHighlightBatchSet(kind, token, lines, config);
    if (batches.length === 0) {
      map.delete(token);
    } else {
      map.set(token, batches);
    }
    applyLinePassBatches();
  }, [applyLinePassBatches]);

  const clearEdgeHighlight = useCallback((kind, token) => {
    if (kind !== "hover" && kind !== "select") {
      return;
    }

    const map = edgeHighlightBatchesRef.current[kind];
    if (map.delete(token)) {
      applyLinePassBatches();
    }
  }, [applyLinePassBatches]);

  const clearAllEdgeHighlights = useCallback(() => {
    const hoverCount = edgeHighlightBatchesRef.current.hover.size;
    const selectCount = edgeHighlightBatchesRef.current.select.size;
    edgeHighlightBatchesRef.current.hover.clear();
    edgeHighlightBatchesRef.current.select.clear();
    if (hoverCount > 0 || selectCount > 0) {
      applyLinePassBatches();
    }
  }, [applyLinePassBatches]);

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
    setEdgeHighlight,
    clearEdgeHighlight,
    clearAllEdgeHighlights,
  };
}
