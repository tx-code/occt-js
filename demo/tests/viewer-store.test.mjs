import test from "node:test";
import assert from "node:assert/strict";
import { useViewerStore } from "../src/store/viewerStore.js";

function makeModel(id) {
  return { id, rootNodes: [], geometries: [] };
}

function restoreInitialState() {
  useViewerStore.setState({
    model: null,
    rawModel: null,
    autoOrientModel: null,
    fileName: "",
    orientationMode: "auto-orient",
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
