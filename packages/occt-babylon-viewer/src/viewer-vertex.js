const DEFAULT_VERTEX_PICK_THRESHOLD_SCALE = 3.0;
const DEFAULT_VERTEX_SCREEN_PICK_RADIUS_PX = 18;
const DEFAULT_MAX_VERTEX_PREVIEW_POINTS = 16000;
const DEFAULT_VERTEX_PREVIEW_POINT_SIZE_CSS_PX = 2.2;

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

function getCanvasCssHeight(engine) {
  return Math.max(getCanvasCssSize(engine).height, 1);
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

function cssPointToRenderPoint(engine, x, y) {
  const scale = getRenderScale(engine);
  return {
    x: x * scale.x,
    y: y * scale.y,
  };
}

function distanceToVertex(px, py, pz, vx, vy, vz) {
  const dx = px - vx;
  const dy = py - vy;
  const dz = pz - vz;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function getPickThreshold(engine, camera) {
  return (5 / getCanvasCssHeight(engine)) * camera.radius * 2;
}

function resolvePointSizeCssPx(value) {
  if (!Number.isFinite(value)) {
    return DEFAULT_VERTEX_PREVIEW_POINT_SIZE_CSS_PX;
  }
  return Math.max(value, 0.5);
}

function resolveMaxPoints(value) {
  if (!Number.isFinite(value)) {
    return DEFAULT_MAX_VERTEX_PREVIEW_POINTS;
  }
  return Math.max(1, Math.floor(value));
}

function resolveColor3(BABYLON, value, fallback) {
  if (value instanceof BABYLON.Color3) {
    return value.clone();
  }
  if (Array.isArray(value) && value.length >= 3) {
    const r = Number(value[0]);
    const g = Number(value[1]);
    const b = Number(value[2]);
    if (Number.isFinite(r) && Number.isFinite(g) && Number.isFinite(b)) {
      return new BABYLON.Color3(r, g, b);
    }
  }
  if (
    value &&
    Number.isFinite(value.r) &&
    Number.isFinite(value.g) &&
    Number.isFinite(value.b)
  ) {
    return new BABYLON.Color3(value.r, value.g, value.b);
  }
  return fallback.clone();
}

export function getOcctVertexCoords(vertex) {
  if (!vertex) {
    return null;
  }

  if (
    Number.isFinite(vertex.x) &&
    Number.isFinite(vertex.y) &&
    Number.isFinite(vertex.z)
  ) {
    return { x: vertex.x, y: vertex.y, z: vertex.z };
  }

  const position = vertex.position;
  if (
    Array.isArray(position) ||
    (ArrayBuffer.isView(position) && position.length >= 3)
  ) {
    const x = Number(position[0]);
    const y = Number(position[1]);
    const z = Number(position[2]);
    if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z)) {
      return { x, y, z };
    }
  }

  return null;
}

function findClosestVertex(localPoint, vertices, threshold) {
  let best = null;
  let bestDist = Infinity;
  for (let index = 0; index < vertices.length; index += 1) {
    const coords = getOcctVertexCoords(vertices[index]);
    if (!coords) {
      continue;
    }
    const distance = distanceToVertex(
      localPoint.x,
      localPoint.y,
      localPoint.z,
      coords.x,
      coords.y,
      coords.z,
    );
    if (distance < bestDist) {
      bestDist = distance;
      best = {
        index,
        vertex: vertices[index],
        dist: distance,
      };
    }
  }
  if (best && best.dist < threshold) {
    return best;
  }
  return null;
}

function findClosestVertexInScreenSpace({
  pickedMesh,
  vertices,
  pointerX,
  pointerY,
  scene,
  camera,
  engine,
  BABYLON,
  screenPickRadiusPx,
}) {
  if (!Number.isFinite(pointerX) || !Number.isFinite(pointerY)) {
    return null;
  }

  const pointerRender = cssPointToRenderPoint(engine, pointerX, pointerY);
  const worldMatrix = pickedMesh.getWorldMatrix();
  const viewport = camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight());
  const transform = scene.getTransformMatrix();
  const renderScale = getRenderScale(engine);
  const radiusX = Math.max(screenPickRadiusPx * renderScale.x, 1);
  const radiusY = Math.max(screenPickRadiusPx * renderScale.y, 1);
  const identity = BABYLON.Matrix.Identity();

  let best = null;
  for (let index = 0; index < vertices.length; index += 1) {
    const coords = getOcctVertexCoords(vertices[index]);
    if (!coords) {
      continue;
    }

    const world = BABYLON.Vector3.TransformCoordinates(
      new BABYLON.Vector3(coords.x, coords.y, coords.z),
      worldMatrix,
    );
    const projected = BABYLON.Vector3.Project(world, identity, transform, viewport);
    if (!Number.isFinite(projected.x) || !Number.isFinite(projected.y)) {
      continue;
    }
    if (projected.z < 0 || projected.z > 1) {
      continue;
    }

    const dx = projected.x - pointerRender.x;
    const dy = projected.y - pointerRender.y;
    const screenDistSq = (dx * dx) / (radiusX * radiusX) + (dy * dy) / (radiusY * radiusY);
    if (screenDistSq > 1) {
      continue;
    }

    if (
      !best ||
      screenDistSq < best.screenDistSq ||
      (screenDistSq === best.screenDistSq && projected.z < best.depth)
    ) {
      best = {
        index,
        vertex: vertices[index],
        screenDistSq,
        depth: projected.z,
      };
    }
  }

  if (!best) {
    return null;
  }

  return {
    index: best.index,
    vertex: best.vertex,
    dist: Math.sqrt(best.screenDistSq),
  };
}

export function pickOcctClosestVertex({
  pickedMesh,
  geometry,
  localPoint,
  pointerX,
  pointerY,
  scene,
  camera,
  engine,
  BABYLON,
  worldThresholdScale = DEFAULT_VERTEX_PICK_THRESHOLD_SCALE,
  screenPickRadiusPx = DEFAULT_VERTEX_SCREEN_PICK_RADIUS_PX,
}) {
  if (!pickedMesh || !geometry?.vertices || !localPoint || !camera || !engine || !BABYLON) {
    return null;
  }

  const worldThreshold = getPickThreshold(engine, camera) * worldThresholdScale;
  const worldResult = findClosestVertex(localPoint, geometry.vertices, worldThreshold);
  if (worldResult) {
    return {
      ...worldResult,
      source: "world",
    };
  }

  if (!scene) {
    return null;
  }

  const screenResult = findClosestVertexInScreenSpace({
    pickedMesh,
    vertices: geometry.vertices,
    pointerX,
    pointerY,
    scene,
    camera,
    engine,
    BABYLON,
    screenPickRadiusPx,
  });
  if (!screenResult) {
    return null;
  }

  return {
    ...screenResult,
    source: "screen",
  };
}

export function createOcctVertexPreviewPoints(
  scene,
  meshes,
  resolveGeometry,
  BABYLON,
  options = {},
) {
  if (!scene || !Array.isArray(meshes) || typeof resolveGeometry !== "function" || !BABYLON) {
    return [];
  }

  const maxPoints = resolveMaxPoints(options.maxPoints);
  const pointSizeCssPx = resolvePointSizeCssPx(options.pointSizeCssPx);
  const includeMesh = typeof options.includeMesh === "function"
    ? options.includeMesh
    : (mesh) => !mesh.metadata?.occtLinePassManaged;

  const candidates = [];
  let totalVertexCount = 0;
  for (const mesh of meshes) {
    if (!mesh || mesh.isDisposed?.() || !mesh.isVisible || !includeMesh(mesh)) {
      continue;
    }
    const geometry = resolveGeometry(mesh);
    if (!geometry?.vertices || geometry.vertices.length === 0) {
      continue;
    }
    candidates.push({ mesh, vertices: geometry.vertices });
    totalVertexCount += geometry.vertices.length;
  }

  if (candidates.length === 0 || totalVertexCount === 0) {
    return [];
  }

  const stride = Math.max(1, Math.ceil(totalVertexCount / maxPoints));
  const points = [];
  let globalVertexIndex = 0;

  for (const candidate of candidates) {
    const worldMatrix = candidate.mesh.getWorldMatrix();
    for (let index = 0; index < candidate.vertices.length; index += 1) {
      if (globalVertexIndex % stride !== 0) {
        globalVertexIndex += 1;
        continue;
      }

      globalVertexIndex += 1;
      const coords = getOcctVertexCoords(candidate.vertices[index]);
      if (!coords) {
        continue;
      }

      const world = BABYLON.Vector3.TransformCoordinates(
        new BABYLON.Vector3(coords.x, coords.y, coords.z),
        worldMatrix,
      );
      points.push(world.x, world.y, world.z);
    }
  }

  if (points.length < 3) {
    return [];
  }

  const markerMesh = new BABYLON.Mesh(options.meshName || "__vertex_preview__", scene);
  const vertexData = new BABYLON.VertexData();
  vertexData.positions = new Float32Array(points);
  const pointCount = points.length / 3;
  const indices = new Uint32Array(pointCount);
  for (let index = 0; index < pointCount; index += 1) {
    indices[index] = index;
  }
  vertexData.indices = indices;
  vertexData.applyToMesh(markerMesh, true);
  markerMesh.isPickable = false;
  markerMesh.alwaysSelectAsActiveMesh = true;
  markerMesh.renderingGroupId = options.renderingGroupId ?? 1;
  markerMesh.alphaIndex = options.alphaIndex ?? 9;

  const markerMaterial = new BABYLON.StandardMaterial(
    options.materialName || "__vertex_preview_mat__",
    scene,
  );
  markerMaterial.pointsCloud = true;
  markerMaterial.pointSize = pointSizeCssPx * getRenderScale(scene.getEngine()).y;
  markerMaterial.diffuseColor = resolveColor3(
    BABYLON,
    options.diffuseColor,
    new BABYLON.Color3(0.76, 0.82, 0.9),
  );
  markerMaterial.emissiveColor = resolveColor3(
    BABYLON,
    options.emissiveColor,
    new BABYLON.Color3(0.24, 0.3, 0.38),
  );
  markerMaterial.specularColor = resolveColor3(
    BABYLON,
    options.specularColor,
    BABYLON.Color3.Black(),
  );
  markerMaterial.alpha = Number.isFinite(options.alpha) ? options.alpha : 0.48;
  markerMaterial.disableLighting = options.disableLighting ?? true;
  markerMaterial.backFaceCulling = options.backFaceCulling ?? false;
  markerMaterial.disableDepthWrite = options.disableDepthWrite ?? true;
  markerMesh.material = markerMaterial;

  const pointSizeObserver = scene.onBeforeRenderObservable?.add(() => {
    const targetSize = pointSizeCssPx * getRenderScale(scene.getEngine()).y;
    if (Math.abs(markerMaterial.pointSize - targetSize) > 0.01) {
      markerMaterial.pointSize = targetSize;
    }
  });

  return [
    markerMesh,
    markerMaterial,
    {
      dispose() {
        if (pointSizeObserver && scene.onBeforeRenderObservable) {
          scene.onBeforeRenderObservable.remove(pointSizeObserver);
        }
      },
    },
  ];
}
