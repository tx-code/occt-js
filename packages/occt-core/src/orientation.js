const IDENTITY_MATRIX = [
  1, 0, 0, 0,
  0, 1, 0, 0,
  0, 0, 1, 0,
  0, 0, 0, 1,
];

const ANALYSIS_Z_UP_TO_BABYLON_Y_UP = [
  1, 0, 0, 0,
  0, 0, -1, 0,
  0, 1, 0, 0,
  0, 0, 0, 1,
];

function multiplyMatrices(a, b) {
  const out = new Array(16).fill(0);
  for (let row = 0; row < 4; row += 1) {
    for (let col = 0; col < 4; col += 1) {
      let sum = 0;
      for (let k = 0; k < 4; k += 1) {
        sum += a[k * 4 + row] * b[col * 4 + k];
      }
      out[col * 4 + row] = sum;
    }
  }
  return out;
}

function normalizeOrientationForBabylon(orientation) {
  const transform = orientation?.transform;
  if (!Array.isArray(transform) || transform.length !== 16) {
    return null;
  }

  return {
    ...orientation,
    transform: multiplyMatrices(ANALYSIS_Z_UP_TO_BABYLON_Y_UP, transform),
  };
}

export function applyOrientationToModel(model, orientation) {
  const transform = orientation?.transform;
  const rootNodes = model?.rootNodes;
  if (!Array.isArray(transform) || transform.length !== 16 || !Array.isArray(rootNodes) || rootNodes.length === 0) {
    return model;
  }

  return {
    ...model,
    rootNodes: rootNodes.map((node) => ({
      ...node,
      transform: multiplyMatrices(
        transform,
        Array.isArray(node?.transform) && node.transform.length === 16
          ? node.transform
          : IDENTITY_MATRIX,
      ),
    })),
  };
}

export async function resolveAutoOrientedModel({
  bytes,
  format,
  mode = "manufacturing",
  model,
  occt,
} = {}) {
  if (!occt || typeof occt.AnalyzeOptimalOrientation !== "function") {
    return model;
  }

  const orientation = occt.AnalyzeOptimalOrientation(format, bytes, { mode });
  if (!orientation?.success) {
    return model;
  }

  return applyOrientationToModel(model, normalizeOrientationForBabylon(orientation));
}
