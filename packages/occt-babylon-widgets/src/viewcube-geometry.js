const PI = Math.PI;

export const VIEWS = {
  front: { alpha: PI / 2, beta: PI / 2 },
  back: { alpha: -PI / 2, beta: PI / 2 },
  top: { alpha: 0, beta: 0.01 },
  bottom: { alpha: 0, beta: PI - 0.01 },
  left: { alpha: PI, beta: PI / 2 },
  right: { alpha: 0, beta: PI / 2 },
  "front-top": { alpha: PI / 2, beta: PI / 4 },
  "front-bottom": { alpha: PI / 2, beta: (3 * PI) / 4 },
  "front-left": { alpha: (3 * PI) / 4, beta: PI / 2 },
  "front-right": { alpha: PI / 4, beta: PI / 2 },
  "back-top": { alpha: -PI / 2, beta: PI / 4 },
  "back-bottom": { alpha: -PI / 2, beta: (3 * PI) / 4 },
  "back-left": { alpha: (-3 * PI) / 4, beta: PI / 2 },
  "back-right": { alpha: -PI / 4, beta: PI / 2 },
  "top-left": { alpha: PI, beta: PI / 4 },
  "top-right": { alpha: 0, beta: PI / 4 },
  "bottom-left": { alpha: PI, beta: (3 * PI) / 4 },
  "bottom-right": { alpha: 0, beta: (3 * PI) / 4 },
  "front-top-left": { alpha: (3 * PI) / 4, beta: PI / 4 },
  "front-top-right": { alpha: PI / 4, beta: PI / 4 },
  "front-bottom-left": { alpha: (3 * PI) / 4, beta: (3 * PI) / 4 },
  "front-bottom-right": { alpha: PI / 4, beta: (3 * PI) / 4 },
  "back-top-left": { alpha: (-3 * PI) / 4, beta: PI / 4 },
  "back-top-right": { alpha: -PI / 4, beta: PI / 4 },
  "back-bottom-left": { alpha: (-3 * PI) / 4, beta: (3 * PI) / 4 },
  "back-bottom-right": { alpha: -PI / 4, beta: (3 * PI) / 4 },
};

const VERTICES = [
  [-0.5, -0.5, -0.5],
  [0.5, -0.5, -0.5],
  [-0.5, 0.5, -0.5],
  [0.5, 0.5, -0.5],
  [-0.5, -0.5, 0.5],
  [0.5, -0.5, 0.5],
  [-0.5, 0.5, 0.5],
  [0.5, 0.5, 0.5],
];

const FACE_INDICES = [
  [0, 1, 5, 4],
  [3, 2, 6, 7],
  [4, 5, 7, 6],
  [0, 2, 3, 1],
  [0, 4, 6, 2],
  [1, 3, 7, 5],
];

const FACE_NORMALS = [
  [0, -1, 0],
  [0, 1, 0],
  [0, 0, 1],
  [0, 0, -1],
  [-1, 0, 0],
  [1, 0, 0],
];

export const FACE_LABELS = ["FRONT", "BACK", "TOP", "BOTTOM", "LEFT", "RIGHT"];

export const EDGE_DEFS = [
  [4, 5, 0, 2],
  [0, 1, 0, 3],
  [0, 4, 0, 4],
  [1, 5, 0, 5],
  [6, 7, 1, 2],
  [2, 3, 1, 3],
  [2, 6, 1, 4],
  [3, 7, 1, 5],
  [4, 6, 2, 4],
  [5, 7, 2, 5],
  [0, 2, 3, 4],
  [1, 3, 3, 5],
];

export const EDGE_NAMES = [
  "front-top",
  "front-bottom",
  "front-left",
  "front-right",
  "back-top",
  "back-bottom",
  "back-left",
  "back-right",
  "top-left",
  "top-right",
  "bottom-left",
  "bottom-right",
];

export const CORNER_ADJ_FACES = [
  [0, 3, 4],
  [0, 3, 5],
  [1, 3, 4],
  [1, 3, 5],
  [0, 2, 4],
  [0, 2, 5],
  [1, 2, 4],
  [1, 2, 5],
];

export const CORNER_NAMES = [
  "front-bottom-left",
  "front-bottom-right",
  "back-bottom-left",
  "back-bottom-right",
  "front-top-left",
  "front-top-right",
  "back-top-left",
  "back-top-right",
];

export const VERTEX_TO_CORNER = [...CORNER_NAMES];

export const FACE_SUBREGIONS = [
  {
    edges: { 0: "front-left", 1: "front-top", 2: "front-right", 3: "front-bottom" },
    corners: { 0: "front-bottom-left", 1: "front-top-left", 2: "front-top-right", 3: "front-bottom-right" },
    center: "front",
  },
  {
    edges: { 0: "back-right", 1: "back-top", 2: "back-left", 3: "back-bottom" },
    corners: { 0: "back-bottom-right", 1: "back-top-right", 2: "back-top-left", 3: "back-bottom-left" },
    center: "back",
  },
  {
    edges: { 0: "top-left", 1: "back-top", 2: "top-right", 3: "front-top" },
    corners: { 0: "front-top-left", 1: "back-top-left", 2: "back-top-right", 3: "front-top-right" },
    center: "top",
  },
  {
    edges: { 0: "front-bottom", 1: "bottom-right", 2: "back-bottom", 3: "bottom-left" },
    corners: { 0: "front-bottom-left", 1: "front-bottom-right", 2: "back-bottom-right", 3: "back-bottom-left" },
    center: "bottom",
  },
  {
    edges: { 0: "bottom-left", 1: "back-left", 2: "top-left", 3: "front-left" },
    corners: { 0: "front-bottom-left", 1: "back-bottom-left", 2: "back-top-left", 3: "front-top-left" },
    center: "left",
  },
  {
    edges: { 0: "front-right", 1: "top-right", 2: "back-right", 3: "bottom-right" },
    corners: { 0: "front-bottom-right", 1: "front-top-right", 2: "back-top-right", 3: "back-bottom-right" },
    center: "right",
  },
];

const FACE_NAMES = ["front", "back", "top", "bottom", "left", "right"];

export const FACE_NAME_TO_INDEX = Object.freeze(
  Object.fromEntries(FACE_NAMES.map((name, index) => [name, index])),
);

export const EDGE_NAME_TO_INDEX = Object.freeze(
  Object.fromEntries(EDGE_NAMES.map((name, index) => [name, index])),
);

export const CORNER_NAME_TO_INDEX = Object.freeze(
  Object.fromEntries(CORNER_NAMES.map((name, index) => [name, index])),
);

const FACE_NAME_SET = new Set(FACE_NAMES);
const EDGE_NAME_SET = new Set(EDGE_NAMES);
const CORNER_NAME_SET = new Set(CORNER_NAMES);

export function regionCategory(name) {
  if (!name) return "none";
  if (FACE_NAME_SET.has(name)) return "face";
  if (EDGE_NAME_SET.has(name)) return "edge";
  if (CORNER_NAME_SET.has(name)) return "corner";
  return "none";
}

export function transformNormal(vector, matrixValues) {
  return [
    vector[0] * matrixValues[0] + vector[1] * matrixValues[4] + vector[2] * matrixValues[8],
    vector[0] * matrixValues[1] + vector[1] * matrixValues[5] + vector[2] * matrixValues[9],
    vector[0] * matrixValues[2] + vector[1] * matrixValues[6] + vector[2] * matrixValues[10],
  ];
}

export function projectCube(viewMatrixValues, cx, cy, size) {
  const projected = new Array(8);
  const depths = new Array(8);

  for (let index = 0; index < VERTICES.length; index += 1) {
    const projectedNormal = transformNormal(VERTICES[index], viewMatrixValues);
    projected[index] = [cx + projectedNormal[0] * size, cy - projectedNormal[1] * size];
    depths[index] = projectedNormal[2];
  }

  const faceFrontFacing = new Array(FACE_INDICES.length);
  const faces = FACE_INDICES.map((indices, index) => {
    const verts = indices.map((vertexIndex) => projected[vertexIndex]);
    const viewNormal = transformNormal(FACE_NORMALS[index], viewMatrixValues);
    const depth = viewNormal[2];
    const isFrontFacing = depth < 0;
    faceFrontFacing[index] = isFrontFacing;
    return { index, verts, depth, isFrontFacing, viewNormal };
  });

  const edges = EDGE_DEFS.map(([startIndex, endIndex, firstFace, secondFace], index) => ({
    index,
    start: projected[startIndex],
    end: projected[endIndex],
    depth: (depths[startIndex] + depths[endIndex]) / 2,
    isVisible: faceFrontFacing[firstFace] || faceFrontFacing[secondFace],
    adjFaces: [firstFace, secondFace],
  }));

  const corners = CORNER_ADJ_FACES.map((adjacentFaces, index) => ({
    index,
    pos: projected[index],
    depth: depths[index],
    isVisible: adjacentFaces.some((faceIndex) => faceFrontFacing[faceIndex]),
  }));

  return { faces, edges, corners, projected, depths };
}
