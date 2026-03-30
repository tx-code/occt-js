import {
  CORNER_ADJ_FACES,
  EDGE_DEFS,
  EDGE_NAMES,
  FACE_SUBREGIONS,
  VERTEX_TO_CORNER,
} from "./viewcube-geometry.js";
import { VIEWCUBE_EDGE_RATIO } from "./viewcube-style.js";

function isPointInQuad(px, py, quad) {
  let expectedSign = null;

  for (let index = 0; index < quad.length; index += 1) {
    const start = quad[index];
    const end = quad[(index + 1) % quad.length];
    const cross = (end[0] - start[0]) * (py - start[1]) - (end[1] - start[1]) * (px - start[0]);

    if (Math.abs(cross) < 0.001) continue;

    const sign = cross > 0;
    if (expectedSign === null) {
      expectedSign = sign;
      continue;
    }

    if (expectedSign !== sign) return false;
  }

  return true;
}

function toFaceLocalCoords(px, py, quad) {
  const e0x = quad[3][0] - quad[0][0];
  const e0y = quad[3][1] - quad[0][1];
  const e1x = quad[1][0] - quad[0][0];
  const e1y = quad[1][1] - quad[0][1];
  const px0 = px - quad[0][0];
  const py0 = py - quad[0][1];
  const determinant = e0x * e1y - e0y * e1x;

  if (Math.abs(determinant) < 0.001) {
    return [0.5, 0.5];
  }

  const u = (px0 * e1y - py0 * e1x) / determinant;
  const v = (e0x * py0 - e0y * px0) / determinant;
  return [Math.max(0, Math.min(1, u)), Math.max(0, Math.min(1, v))];
}

function getSubRegion(faceIndex, u, v) {
  const region = FACE_SUBREGIONS[faceIndex];
  const clampedU = Math.max(0, Math.min(1, u));
  const clampedV = Math.max(0, Math.min(1, v));
  const isLeft = clampedU < VIEWCUBE_EDGE_RATIO;
  const isRight = clampedU > 1 - VIEWCUBE_EDGE_RATIO;
  const isBottom = clampedV < VIEWCUBE_EDGE_RATIO;
  const isTop = clampedV > 1 - VIEWCUBE_EDGE_RATIO;

  if (isBottom && isLeft) return { type: "corner", name: region.corners[0] };
  if (isTop && isLeft) return { type: "corner", name: region.corners[1] };
  if (isTop && isRight) return { type: "corner", name: region.corners[2] };
  if (isBottom && isRight) return { type: "corner", name: region.corners[3] };
  if (isLeft) return { type: "edge", name: region.edges[0] };
  if (isTop) return { type: "edge", name: region.edges[1] };
  if (isRight) return { type: "edge", name: region.edges[2] };
  if (isBottom) return { type: "edge", name: region.edges[3] };
  return { type: "face", name: region.center };
}

function pointToSegmentDistance(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared < 0.001) {
    return Math.hypot(px - ax, py - ay);
  }

  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSquared));
  return Math.hypot(ax + t * dx - px, ay + t * dy - py);
}

export function hitTest(px, py, projection, cx, cy, size) {
  if (!projection) return null;

  if (Math.hypot(px - cx, py - cy) > size * 1.1) {
    return null;
  }

  const sortedFaces = projection.faces
    .filter((face) => face.isFrontFacing)
    .sort((left, right) => left.depth - right.depth);

  for (const face of sortedFaces) {
    if (!isPointInQuad(px, py, face.verts)) continue;
    const [u, v] = toFaceLocalCoords(px, py, face.verts);
    return getSubRegion(face.index, u, v);
  }

  let bestCorner = null;
  let bestCornerDistance = size * 0.25;

  for (let index = 0; index < projection.projected.length; index += 1) {
    const visible = CORNER_ADJ_FACES[index].some((faceIndex) => projection.faces[faceIndex].isFrontFacing);
    if (!visible) continue;

    const point = projection.projected[index];
    const distance = Math.hypot(px - point[0], py - point[1]);
    if (distance < bestCornerDistance) {
      bestCornerDistance = distance;
      bestCorner = index;
    }
  }

  if (bestCorner !== null) {
    return { type: "corner", name: VERTEX_TO_CORNER[bestCorner] };
  }

  let bestEdge = null;
  let bestEdgeDistance = size * 0.15;

  for (let index = 0; index < EDGE_DEFS.length; index += 1) {
    const [startIndex, endIndex, firstFace, secondFace] = EDGE_DEFS[index];
    if (!projection.faces[firstFace].isFrontFacing && !projection.faces[secondFace].isFrontFacing) {
      continue;
    }

    const start = projection.projected[startIndex];
    const end = projection.projected[endIndex];
    const distance = pointToSegmentDistance(px, py, start[0], start[1], end[0], end[1]);
    if (distance < bestEdgeDistance) {
      bestEdgeDistance = distance;
      bestEdge = index;
    }
  }

  return bestEdge === null ? null : { type: "edge", name: EDGE_NAMES[bestEdge] };
}
