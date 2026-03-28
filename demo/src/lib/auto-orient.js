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

const FORMAT_MAP = {
  step: "step",
  stp: "step",
  iges: "iges",
  igs: "iges",
  brep: "brep",
  brp: "brep",
};

export function getOcctFormatFromFileName(fileName = "") {
  const ext = fileName.toLowerCase().split(".").pop();
  return FORMAT_MAP[ext] || null;
}

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

export function applyOrientationToResult(result, orientation) {
  const transform = orientation?.transform;
  const rootNodes = result?.rootNodes;

  if (!Array.isArray(transform) || transform.length !== 16 || !Array.isArray(rootNodes) || rootNodes.length === 0) {
    return result;
  }

  return {
    ...result,
    rootNodes: rootNodes.map((node) => ({
      ...node,
      transform: multiplyMatrices(transform, Array.isArray(node.transform) && node.transform.length === 16
        ? node.transform
        : IDENTITY_MATRIX),
    })),
  };
}

function normalizeOrientationForBabylon(orientation) {
  const transform = orientation?.transform;
  if (!Array.isArray(transform) || transform.length !== 16) {
    return orientation;
  }

  return {
    ...orientation,
    transform: multiplyMatrices(ANALYSIS_Z_UP_TO_BABYLON_Y_UP, transform),
  };
}

export async function resolveAutoOrientedResult({
  occt,
  format,
  bytes,
  result,
} = {}) {
  if (!occt || typeof occt.AnalyzeOptimalOrientation !== "function") {
    return result;
  }

  const orientation = occt.AnalyzeOptimalOrientation(format, bytes, { mode: "manufacturing" });
  if (!orientation?.success) {
    return result;
  }

  return applyOrientationToResult(result, normalizeOrientationForBabylon(orientation));
}
