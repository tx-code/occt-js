function clamp01(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  if (value < 0) {
    return 0;
  }
  if (value > 1) {
    return 1;
  }
  return value;
}

function colorToCss(color, alpha = 1) {
  const r = Math.round(clamp01(color?.r ?? 1) * 255);
  const g = Math.round(clamp01(color?.g ?? 1) * 255);
  const b = Math.round(clamp01(color?.b ?? 1) * 255);
  const a = clamp01(alpha);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function getCanvasCssSize(engine) {
  const canvas = engine?.getRenderingCanvas?.();
  if (
    canvas &&
    Number.isFinite(canvas.clientWidth) &&
    Number.isFinite(canvas.clientHeight) &&
    canvas.clientWidth > 0 &&
    canvas.clientHeight > 0
  ) {
    return {
      width: canvas.clientWidth,
      height: canvas.clientHeight,
    };
  }

  return {
    width: Math.max(engine?.getRenderWidth?.() || 1, 1),
    height: Math.max(engine?.getRenderHeight?.() || 1, 1),
  };
}

function getRenderScale(engine) {
  const cssSize = getCanvasCssSize(engine);
  const renderWidth = Math.max(engine?.getRenderWidth?.() || cssSize.width, 1);
  const renderHeight = Math.max(engine?.getRenderHeight?.() || cssSize.height, 1);
  return {
    x: renderWidth / Math.max(cssSize.width, 1),
    y: renderHeight / Math.max(cssSize.height, 1),
  };
}

export function createScreenSpaceVertexMarker(
  scene,
  worldPoint,
  camera,
  BABYLON,
  {
    markerType = "hover",
    coreColor,
    ringColor,
    corePixelSize = 8,
    ringScale = 1.45,
    ringAlpha = 0.72,
    coreAlpha = 0.96,
    zIndex = 90,
    documentRef,
    parentElement,
  } = {},
) {
  if (!scene || !worldPoint || !camera || !BABYLON) {
    return null;
  }

  const markerCenter = worldPoint.clone ? worldPoint.clone() : worldPoint;
  const engine = scene.getEngine?.();
  const canvas = engine?.getRenderingCanvas?.();
  const documentObject = documentRef || globalThis.document;
  const parent = parentElement || documentObject?.body;
  if (!canvas || !documentObject || !parent) {
    return null;
  }

  const markerRoot = documentObject.createElement("div");
  markerRoot.dataset.vertexMarker = markerType;
  markerRoot.style.position = "fixed";
  markerRoot.style.left = "0px";
  markerRoot.style.top = "0px";
  markerRoot.style.width = "1px";
  markerRoot.style.height = "1px";
  markerRoot.style.transform = "translate(-50%, -50%)";
  markerRoot.style.pointerEvents = "none";
  markerRoot.style.zIndex = String(zIndex);
  markerRoot.style.display = "none";

  const ring = documentObject.createElement("div");
  ring.style.position = "absolute";
  ring.style.left = "50%";
  ring.style.top = "50%";
  ring.style.transform = "translate(-50%, -50%)";
  ring.style.width = `${Math.max(corePixelSize * ringScale, 1)}px`;
  ring.style.height = `${Math.max(corePixelSize * ringScale, 1)}px`;
  ring.style.borderRadius = "9999px";
  ring.style.background = colorToCss(ringColor, ringAlpha);
  ring.style.boxSizing = "border-box";
  markerRoot.appendChild(ring);

  const core = documentObject.createElement("div");
  core.style.position = "absolute";
  core.style.left = "50%";
  core.style.top = "50%";
  core.style.transform = "translate(-50%, -50%)";
  core.style.width = `${Math.max(corePixelSize, 1)}px`;
  core.style.height = `${Math.max(corePixelSize, 1)}px`;
  core.style.borderRadius = "9999px";
  core.style.background = colorToCss(coreColor, coreAlpha);
  core.style.boxSizing = "border-box";
  markerRoot.appendChild(core);

  parent.appendChild(markerRoot);

  const updateOverlayPosition = () => {
    const currentCanvas = engine.getRenderingCanvas?.();
    if (!currentCanvas || !currentCanvas.isConnected) {
      markerRoot.style.display = "none";
      return;
    }

    const viewport = camera.viewport.toGlobal(
      engine.getRenderWidth(),
      engine.getRenderHeight(),
    );
    const projected = BABYLON.Vector3.Project(
      markerCenter,
      BABYLON.Matrix.Identity(),
      scene.getTransformMatrix(),
      viewport,
    );

    if (
      !Number.isFinite(projected.x) ||
      !Number.isFinite(projected.y) ||
      projected.z < 0 ||
      projected.z > 1
    ) {
      markerRoot.style.display = "none";
      return;
    }

    const scale = getRenderScale(engine);
    const rect = currentCanvas.getBoundingClientRect();
    const cssX = rect.left + projected.x / Math.max(scale.x, 1e-6);
    const cssY = rect.top + projected.y / Math.max(scale.y, 1e-6);

    markerRoot.style.left = `${cssX}px`;
    markerRoot.style.top = `${cssY}px`;
    markerRoot.style.display = "block";
  };

  updateOverlayPosition();
  const positionObserver = scene.onBeforeRenderObservable?.add(updateOverlayPosition);

  return {
    dispose() {
      if (positionObserver && scene.onBeforeRenderObservable) {
        scene.onBeforeRenderObservable.remove(positionObserver);
      }
      markerRoot.remove();
    },
  };
}
