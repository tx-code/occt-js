import test from "node:test";
import assert from "node:assert/strict";
import { useViewerStore } from "../src/store/viewerStore.js";

function makeModel(id) {
  return { id, rootNodes: [], geometries: [] };
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
  useViewerStore.setState({
    model: null,
    rawModel: null,
    autoOrientModel: null,
    fileName: "",
    orientationMode: "auto-orient",
    exactSession: null,
    selectedItems: [],
    selectedDetail: null,
    selectionRequest: null,
    selectionRequestSeq: 0,
  });
}

test("setImportedModels keeps both raw and auto-orient and defaults to auto-orient", () => {
  restoreInitialState();
  const rawModel = makeModel("raw");
  const autoOrientModel = makeModel("auto");

  useViewerStore.getState().setImportedModels(rawModel, autoOrientModel, "part.step");

  const state = useViewerStore.getState();
  assert.equal(state.fileName, "part.step");
  assert.equal(state.rawModel, rawModel);
  assert.equal(state.autoOrientModel, autoOrientModel);
  assert.equal(state.orientationMode, "auto-orient");
  assert.equal(state.model, autoOrientModel);
});

test("setOrientationMode switches between raw and auto-orient without reimporting", () => {
  restoreInitialState();
  const rawModel = makeModel("raw");
  const autoOrientModel = makeModel("auto");

  useViewerStore.getState().setImportedModels(rawModel, autoOrientModel, "part.step");
  useViewerStore.getState().setOrientationMode("raw");

  let state = useViewerStore.getState();
  assert.equal(state.orientationMode, "raw");
  assert.equal(state.model, rawModel);

  useViewerStore.getState().setOrientationMode("auto-orient");
  state = useViewerStore.getState();
  assert.equal(state.orientationMode, "auto-orient");
  assert.equal(state.model, autoOrientModel);
});

test("setImportedModels falls back to raw when auto-orient is unavailable", () => {
  restoreInitialState();
  const rawModel = makeModel("raw");

  useViewerStore.getState().setImportedModels(rawModel, null, "part.step");

  const state = useViewerStore.getState();
  assert.equal(state.orientationMode, "raw");
  assert.equal(state.model, rawModel);
  assert.equal(state.autoOrientModel, null);
});

test("setImportedModels stores one authoritative exact session and keeps it stable across orientation toggles", () => {
  restoreInitialState();
  const rawModel = makeModel("raw");
  const autoOrientModel = makeModel("auto");
  const exactSession = makeExactSession(17);

  useViewerStore.getState().setImportedModels(rawModel, autoOrientModel, "part.step", exactSession);

  let state = useViewerStore.getState();
  assert.equal(state.exactSession, exactSession);

  useViewerStore.getState().setOrientationMode("raw");
  state = useViewerStore.getState();
  assert.equal(state.exactSession, exactSession);

  useViewerStore.getState().setOrientationMode("auto-orient");
  state = useViewerStore.getState();
  assert.equal(state.exactSession, exactSession);
});

test("setModel replacement and reset clear exact-session-linked selection state", () => {
  restoreInitialState();
  const model = makeModel("generated");
  const exactSession = makeExactSession(29);

  useViewerStore.getState().setSelectedItems([{ id: 1 }]);
  useViewerStore.getState().setSelectedDetail({ mode: "face", items: [{ id: 1 }] });
  useViewerStore.getState().setModel(model, "Generated Tool", exactSession);

  let state = useViewerStore.getState();
  assert.equal(state.exactSession, exactSession);
  assert.deepEqual(state.selectedItems, []);
  assert.equal(state.selectedDetail, null);

  useViewerStore.getState().reset();
  state = useViewerStore.getState();
  assert.equal(state.exactSession, null);
  assert.deepEqual(state.selectedItems, []);
  assert.equal(state.selectedDetail, null);
});
