import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import {
  buildWorkspaceLabel,
  buildWorkspaceModel,
  createIdentityActorPose,
  nudgeActorPose,
  patchActorPose,
} from "../lib/workspace-model.js";

function clearSelectionState() {
  return {
    selectedItems: [],
    selectedDetail: null,
    selectionRequest: null,
    selectionRequestSeq: 0,
  };
}

function clearMeasurementState() {
  return {
    currentMeasurement: null,
  };
}

function resolveOrientationMode(workspaceActors, orientationMode) {
  const actorCount = Object.keys(workspaceActors ?? {}).length;
  const workpieceActor = workspaceActors?.workpiece ?? null;

  if (!workpieceActor) {
    return actorCount === 0
      ? (orientationMode === "raw" ? "raw" : "auto-orient")
      : "raw";
  }

  return orientationMode === "auto-orient" && workpieceActor.autoOrientModel
    ? "auto-orient"
    : "raw";
}

function deriveWorkspaceState(workspaceActors, orientationMode) {
  const nextOrientationMode = resolveOrientationMode(workspaceActors, orientationMode);
  const workpieceActor = workspaceActors?.workpiece ?? null;

  return {
    workspaceActors,
    orientationMode: nextOrientationMode,
    model: buildWorkspaceModel(workspaceActors, nextOrientationMode),
    rawModel: workpieceActor?.rawModel ?? null,
    autoOrientModel: workpieceActor?.autoOrientModel ?? null,
    fileName: buildWorkspaceLabel(workspaceActors),
    exactSession: null,
  };
}

const INITIAL_MODEL_STATE = Object.freeze({
  workspaceActors: {},
  model: null,
  rawModel: null,
  autoOrientModel: null,
  fileName: "",
  exactSession: null,
  loading: false,
  loadingMessage: "",
});

export const useViewerStore = create(subscribeWithSelector((set, get) => ({
  ...INITIAL_MODEL_STATE,

  // View
  facesVisible: true,
  edgesVisible: true,
  gridVisible: true,
  toolpathVisible: false,
  projectionMode: "perspective",
  treeOpen: false,
  theme: "dark",
  orientationMode: "auto-orient",

  // Selection (serializable summary)
  pickMode: "face",
  selectedItems: [],
  selectedDetail: null,
  selectionRequest: null,
  selectionRequestSeq: 0,

  // Measurement state
  currentMeasurement: null,

  // Workspace actions
  upsertWorkpieceActor: ({
    rawModel,
    autoOrientModel = null,
    fileName = "",
    exactSession = null,
  }) => set((state) => {
    const nextWorkspaceActors = {
      ...state.workspaceActors,
      workpiece: {
        actorId: "workpiece",
        actorRole: "workpiece",
        label: fileName,
        fileName,
        rawModel,
        autoOrientModel,
        exactSession,
        actorPose: createIdentityActorPose(),
      },
    };

    return {
      ...deriveWorkspaceState(nextWorkspaceActors, state.orientationMode),
      ...clearSelectionState(),
      ...clearMeasurementState(),
    };
  }),
  upsertToolActor: ({
    model,
    label = "Generated Tool",
    exactSession = null,
  }) => set((state) => {
    const nextWorkspaceActors = {
      ...state.workspaceActors,
      tool: {
        actorId: "tool",
        actorRole: "tool",
        label,
        fileName: label,
        model,
        rawModel: model,
        autoOrientModel: null,
        exactSession,
        actorPose: createIdentityActorPose(),
      },
    };

    return {
      ...deriveWorkspaceState(nextWorkspaceActors, state.orientationMode),
      ...clearSelectionState(),
      ...clearMeasurementState(),
    };
  }),
  clearWorkspaceActors: () => set((state) => ({
    ...INITIAL_MODEL_STATE,
    orientationMode: resolveOrientationMode({}, state.orientationMode),
    ...clearSelectionState(),
    ...clearMeasurementState(),
  })),
  setActorPose: (actorId, patch) => set((state) => {
    const actor = state.workspaceActors?.[actorId];
    if (!actor) {
      return {};
    }

    const nextWorkspaceActors = {
      ...state.workspaceActors,
      [actorId]: {
        ...actor,
        actorPose: patchActorPose(actor.actorPose, patch),
      },
    };

    return {
      ...deriveWorkspaceState(nextWorkspaceActors, state.orientationMode),
      ...clearSelectionState(),
      ...clearMeasurementState(),
    };
  }),
  nudgeActorPose: (actorId, translationDelta) => set((state) => {
    const actor = state.workspaceActors?.[actorId];
    if (!actor) {
      return {};
    }

    const nextWorkspaceActors = {
      ...state.workspaceActors,
      [actorId]: {
        ...actor,
        actorPose: nudgeActorPose(actor.actorPose, translationDelta),
      },
    };

    return {
      ...deriveWorkspaceState(nextWorkspaceActors, state.orientationMode),
      ...clearSelectionState(),
      ...clearMeasurementState(),
    };
  }),

  // Legacy wrappers kept for in-repo compatibility during the workspace transition.
  setModel: (model, fileName, exactSession = null) => {
    get().upsertToolActor({
      model,
      label: fileName,
      exactSession,
    });
  },
  setImportedModels: (rawModel, autoOrientModel, fileName, exactSession = null) => {
    get().upsertWorkpieceActor({
      rawModel,
      autoOrientModel,
      fileName,
      exactSession,
    });
  },

  // View actions
  setOrientationMode: (orientationMode) => set((state) => {
    const nextOrientationMode = orientationMode === "raw" ? "raw" : "auto-orient";
    return {
      ...deriveWorkspaceState(state.workspaceActors, nextOrientationMode),
    };
  }),
  setLoading: (loading, loadingMessage = "") => set({
    loading,
    loadingMessage: loading ? loadingMessage : "",
  }),
  setLoadingMessage: (loadingMessage) => set({ loadingMessage }),
  toggleFaces: () => set((state) => ({ facesVisible: !state.facesVisible })),
  toggleEdges: () => set((state) => ({ edgesVisible: !state.edgesVisible })),
  toggleGrid: () => set((state) => ({ gridVisible: !state.gridVisible })),
  toggleToolpath: () => set((state) => ({ toolpathVisible: !state.toolpathVisible })),
  setProjection: (mode) => set({ projectionMode: mode }),
  setPickMode: (mode) => set({
    pickMode: mode,
    selectedItems: [],
    selectedDetail: null,
  }),
  setTreeOpen: (open) => set({ treeOpen: open }),
  setTheme: (theme) => set({ theme: theme === "dark" ? "dark" : "light" }),
  toggleTheme: () => set((state) => ({ theme: state.theme === "dark" ? "light" : "dark" })),
  setSelectedItems: (items) => set({ selectedItems: items }),
  setSelectedDetail: (detail) => set({ selectedDetail: detail }),
  setCurrentMeasurement: (measurement) => set({
    currentMeasurement: measurement ?? null,
  }),
  clearMeasurements: () => set(clearMeasurementState()),
  requestSelection: (selectionRequest) => set((state) => ({
    selectionRequest,
    selectionRequestSeq: state.selectionRequestSeq + 1,
  })),
  reset: () => set({
    ...INITIAL_MODEL_STATE,
    orientationMode: "auto-orient",
    selectedItems: [],
    selectedDetail: null,
    selectionRequest: null,
    selectionRequestSeq: 0,
    ...clearMeasurementState(),
  }),
})));
