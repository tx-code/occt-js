import test from "node:test";
import assert from "node:assert/strict";
import {
  buildFaceDetail,
  resolveActorScopedSelectionContext,
} from "../src/hooks/usePicking.js";

function createTranslationMatrix(tx = 0, ty = 0, tz = 0) {
  return [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    tx, ty, tz, 1,
  ];
}

function multiplyMatrices(left, right) {
  const output = new Array(16).fill(0);
  for (let row = 0; row < 4; row += 1) {
    for (let column = 0; column < 4; column += 1) {
      let sum = 0;
      for (let index = 0; index < 4; index += 1) {
        sum += left[index * 4 + row] * right[column * 4 + index];
      }
      output[column * 4 + row] = sum;
    }
  }
  return output;
}

function createExactModel({
  exactModelId = 29,
  nodeId = "node:tool",
  geometryId = "geo:tool",
  occurrenceTransform = createTranslationMatrix(1, 2, 3),
} = {}) {
  return {
    exactModelId,
    rootNodes: [{
      id: nodeId,
      nodeId,
      name: "Part",
      kind: "part",
      geometryIds: [geometryId],
      materialIds: [],
      transform: occurrenceTransform,
      children: [],
    }],
    geometries: [{
      id: geometryId,
      geometryId,
      faces: [{
        id: 1,
        firstIndex: 0,
        indexCount: 3,
        edgeIndices: [],
        adjacentFaces: [],
        color: [0.9, 0.2, 0.2, 1],
      }],
      edges: [],
      vertices: [],
      positions: [0, 0, 0, 1, 0, 0, 0, 1, 0],
      indices: [0, 1, 2],
      triangleToFaceMap: [1],
      color: [0.8, 0.8, 0.8, 1],
    }],
    exactGeometryBindings: [{
      geometryId,
      exactShapeHandle: 41,
    }],
  };
}

function createWorkspaceActors({
  actorId = "tool",
  actorRole = "tool",
  label = "Bullnose",
  exactModelId = 29,
  actorPoseMatrix = createTranslationMatrix(40, -5, 12),
  occurrenceTransform = createTranslationMatrix(1, 2, 3),
} = {}) {
  const exactModel = createExactModel({
    exactModelId,
    nodeId: "node:tool",
    geometryId: "geo:tool",
    occurrenceTransform,
  });

  return {
    [actorId]: {
      actorId,
      actorRole,
      label,
      exactSession: {
        exactModelId,
        exactModel,
      },
      actorPose: {
        translation: {
          x: actorPoseMatrix[12],
          y: actorPoseMatrix[13],
          z: actorPoseMatrix[14],
        },
        matrix: actorPoseMatrix,
      },
    },
  };
}

test("actorId exactRef transform composition resolves through the selected actor exact model", () => {
  const actorPoseMatrix = createTranslationMatrix(40, -5, 12);
  const occurrenceTransform = createTranslationMatrix(1, 2, 3);
  const workspaceActors = createWorkspaceActors({
    actorPoseMatrix,
    occurrenceTransform,
  });

  const result = resolveActorScopedSelectionContext({
    workspaceActors,
    workspaceNodeId: "actor:tool:node:tool",
    workspaceGeometryId: "actor:tool:geo:tool",
    kind: "face",
    elementId: 1,
  });

  assert.equal(result?.ok, true);
  assert.equal(result.actorId, "tool");
  assert.equal(result.actorNodeId, "node:tool");
  assert.equal(result.actorGeometryId, "geo:tool");
  assert.equal(result.exactRef.exactModelId, 29);
  assert.equal(result.exactRef.nodeId, "node:tool");
  assert.equal(result.exactRef.geometryId, "geo:tool");
  assert.deepEqual(result.occurrenceTransform, occurrenceTransform);
  assert.deepEqual(result.actorPoseTransform, actorPoseMatrix);
  assert.deepEqual(
    result.exactRef.transform,
    multiplyMatrices(actorPoseMatrix, occurrenceTransform),
  );
});

test("selection records carry actorId and exactRef instead of only Babylon mesh ids", () => {
  const workspaceActors = createWorkspaceActors();
  const selectionContext = resolveActorScopedSelectionContext({
    workspaceActors,
    workspaceNodeId: "actor:tool:node:tool",
    workspaceGeometryId: "actor:tool:geo:tool",
    kind: "face",
    elementId: 1,
  });
  const detail = buildFaceDetail({
    id: "actor:tool:geo:tool",
    faces: [{
      id: 1,
      firstIndex: 0,
      indexCount: 3,
      edgeIndices: [],
      adjacentFaces: [],
      color: [0.9, 0.2, 0.2, 1],
    }],
    color: [0.8, 0.8, 0.8, 1],
  }, 1, 101, selectionContext);

  assert.equal(detail.mode, "face");
  assert.equal(detail.actorId, "tool");
  assert.equal(detail.geometryId, "actor:tool:geo:tool");
  assert.equal(detail.actorGeometryId, "geo:tool");
  assert.equal(detail.exactRef.exactModelId, 29);
  assert.equal(detail.exactRef.geometryId, "geo:tool");
  assert.equal(detail.meshUniqueId, 101);
});

test("actorId exactRef invalidation fails fast when workspace actor state no longer matches", () => {
  const workspaceActors = createWorkspaceActors();

  assert.deepEqual(resolveActorScopedSelectionContext({
    workspaceActors,
    workspaceNodeId: "actor:tool:node:tool",
    workspaceGeometryId: "actor:workpiece:geo:tool",
    kind: "face",
    elementId: 1,
  }), {
    ok: false,
    code: "actor-mismatch",
    message: "Workspace nodeId and geometryId must resolve to the same actorId.",
  });

  assert.deepEqual(resolveActorScopedSelectionContext({
    workspaceActors: {
      tool: {
        ...workspaceActors.tool,
        exactSession: null,
      },
    },
    workspaceNodeId: "actor:tool:node:tool",
    workspaceGeometryId: "actor:tool:geo:tool",
    kind: "face",
    elementId: 1,
  }), {
    ok: false,
    code: "missing-exact-session",
    message: 'Actor "tool" does not have a live exact session.',
  });
});
