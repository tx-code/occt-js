import test from "node:test";
import assert from "node:assert/strict";
import { useViewerStore } from "../src/store/viewerStore.js";

function makeModel(id, {
  sourceFormat = "step",
  revolvedShape = null,
} = {}) {
  return {
    id,
    sourceFormat,
    rootNodes: [{
      id: `node:${id}`,
      name: id,
      kind: "part",
      geometryIds: [`geo:${id}`],
      materialIds: [],
      transform: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
      children: [],
    }],
    geometries: [{
      id: `geo:${id}`,
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
    materials: [],
    warnings: [],
    stats: {
      nodeCount: 1,
      partCount: 1,
      triangleCount: 1,
    },
    revolvedShape,
  };
}

function makeExactSession(id) {
  return {
    exactModelId: id,
    exactModel: { exactModelId: id, rootNodes: [], geometries: [] },
    sourceFormat: "step",
    dispose: async () => ({ ok: true }),
  };
}

function restoreInitialState() {
  useViewerStore.getState().reset();
}

test("upsertWorkpieceActor keeps both raw and auto-orient models and defaults to auto-orient display", () => {
  restoreInitialState();
  const rawModel = makeModel("raw");
  const autoOrientModel = makeModel("auto");

  useViewerStore.getState().upsertWorkpieceActor({
    rawModel,
    autoOrientModel,
    fileName: "part.step",
  });

  const state = useViewerStore.getState();
  assert.equal(state.fileName, "part.step");
  assert.equal(state.rawModel, rawModel);
  assert.equal(state.autoOrientModel, autoOrientModel);
  assert.equal(state.orientationMode, "auto-orient");
  assert.equal(state.workspaceActors.workpiece.rawModel, rawModel);
  assert.equal(state.workspaceActors.workpiece.autoOrientModel, autoOrientModel);
  assert.equal(state.workspaceActors.workpiece.actorRole, "workpiece");
  assert.equal(state.model?.sourceFormat, "step");
});

test("setOrientationMode switches the workpiece display model without dropping the tool actor", () => {
  restoreInitialState();
  const rawModel = makeModel("raw");
  const autoOrientModel = makeModel("auto");
  const toolModel = makeModel("tool", {
    sourceFormat: "generated-revolved-shape",
    revolvedShape: {
      faceBindings: [{ geometryId: "geo:tool", faceId: 1 }],
      shapeValidation: { exact: {}, mesh: {} },
    },
  });
  const toolExactSession = makeExactSession(33);

  useViewerStore.getState().upsertWorkpieceActor({
    rawModel,
    autoOrientModel,
    fileName: "part.step",
  });
  useViewerStore.getState().upsertToolActor({
    model: toolModel,
    label: "Generated Tool",
    exactSession: toolExactSession,
  });
  useViewerStore.getState().setOrientationMode("raw");

  let state = useViewerStore.getState();
  assert.equal(state.orientationMode, "raw");
  assert.equal(state.workspaceActors.tool.exactSession, toolExactSession);
  assert.deepEqual(Object.keys(state.workspaceActors).sort(), ["tool", "workpiece"]);
  assert.equal(state.model?.sourceFormat, "workspace");

  useViewerStore.getState().setOrientationMode("auto-orient");
  state = useViewerStore.getState();
  assert.equal(state.orientationMode, "auto-orient");
  assert.equal(state.workspaceActors.tool.exactSession, toolExactSession);
  assert.equal(state.model?.sourceFormat, "workspace");
});

test("upsertWorkpieceActor falls back to raw when auto-orient is unavailable", () => {
  restoreInitialState();
  const rawModel = makeModel("raw");

  useViewerStore.getState().upsertWorkpieceActor({
    rawModel,
    autoOrientModel: null,
    fileName: "part.step",
  });

  const state = useViewerStore.getState();
  assert.equal(state.orientationMode, "raw");
  assert.equal(state.workspaceActors.workpiece.rawModel, rawModel);
  assert.equal(state.autoOrientModel, null);
});

test("workspace actors retain separate exact sessions for workpiece and tool", () => {
  restoreInitialState();
  const rawModel = makeModel("raw");
  const autoOrientModel = makeModel("auto");
  const workpieceExactSession = makeExactSession(17);
  const toolExactSession = makeExactSession(29);
  const toolModel = makeModel("tool", {
    sourceFormat: "generated-revolved-shape",
    revolvedShape: {
      faceBindings: [{ geometryId: "geo:tool", faceId: 1 }],
      shapeValidation: { exact: {}, mesh: {} },
    },
  });

  useViewerStore.getState().upsertWorkpieceActor({
    rawModel,
    autoOrientModel,
    fileName: "part.step",
    exactSession: workpieceExactSession,
  });
  useViewerStore.getState().upsertToolActor({
    model: toolModel,
    label: "Generated Tool",
    exactSession: toolExactSession,
  });

  let state = useViewerStore.getState();
  assert.equal(state.workspaceActors.workpiece.exactSession, workpieceExactSession);
  assert.equal(state.workspaceActors.tool.exactSession, toolExactSession);
  assert.equal(state.fileName, "part.step + Generated Tool");
  assert.equal(state.model?.sourceFormat, "workspace");
  assert.deepEqual(
    state.model?.rootNodes?.map((node) => node.name),
    ["Workpiece · part.step", "Tool · Generated Tool"],
  );

  useViewerStore.getState().setOrientationMode("raw");
  state = useViewerStore.getState();
  assert.equal(state.workspaceActors.workpiece.exactSession, workpieceExactSession);
  assert.equal(state.workspaceActors.tool.exactSession, toolExactSession);

  useViewerStore.getState().setOrientationMode("auto-orient");
  state = useViewerStore.getState();
  assert.equal(state.workspaceActors.workpiece.exactSession, workpieceExactSession);
  assert.equal(state.workspaceActors.tool.exactSession, toolExactSession);
});

test("setActorPose updates the tool actor pose and clears selection-linked state", () => {
  restoreInitialState();
  const model = makeModel("generated", {
    sourceFormat: "generated-revolved-shape",
    revolvedShape: {
      faceBindings: [{ geometryId: "geo:generated", faceId: 1 }],
      shapeValidation: { exact: {}, mesh: {} },
    },
  });
  const exactSession = makeExactSession(29);

  useViewerStore.getState().setSelectedItems([{ id: 1 }]);
  useViewerStore.getState().setSelectedDetail({ mode: "face", items: [{ id: 1 }] });
  useViewerStore.getState().upsertToolActor({
    model,
    label: "Generated Tool",
    exactSession,
  });
  useViewerStore.getState().setActorPose("tool", {
    translation: { x: 12.5 },
  });

  let state = useViewerStore.getState();
  assert.equal(state.workspaceActors.tool.exactSession, exactSession);
  assert.equal(state.workspaceActors.tool.actorPose.translation.x, 12.5);
  assert.deepEqual(
    state.model?.rootNodes?.find((node) => node.id === "workspace:tool")?.transform?.slice(12, 15),
    [12.5, 0, 0],
  );
  assert.deepEqual(state.selectedItems, []);
  assert.equal(state.selectedDetail, null);

  useViewerStore.getState().reset();
  state = useViewerStore.getState();
  assert.deepEqual(state.workspaceActors, {});
  assert.deepEqual(state.selectedItems, []);
  assert.equal(state.selectedDetail, null);
});
