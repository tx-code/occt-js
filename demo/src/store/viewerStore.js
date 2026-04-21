import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

export const useViewerStore = create(subscribeWithSelector((set, get) => ({
  // Model
  model: null,
  rawModel: null,
  autoOrientModel: null,
  fileName: "",
  exactSession: null,
  loading: false,
  loadingMessage: "",  // "Loading engine...", "Parsing model...", etc.

  // View
  facesVisible: true,
  edgesVisible: true,
  gridVisible: true,
  toolpathVisible: false,
  projectionMode: "perspective", // "perspective" | "orthographic"
  treeOpen: false,
  theme: "dark", // "dark" | "light"
  orientationMode: "auto-orient", // "raw" | "auto-orient"

  // Selection (serializable summary)
  pickMode: "face",
  selectedItems: [],
  selectedDetail: null, // { mode, items: [{ id, meshUniqueId, info: {...} }] } or null
  selectionRequest: null,
  selectionRequestSeq: 0,

  // Actions
  setModel: (model, fileName, exactSession = null) => set({
    model,
    rawModel: model,
    autoOrientModel: null,
    fileName,
    exactSession,
    orientationMode: "raw",
    selectedItems: [],
    selectedDetail: null,
    selectionRequest: null,
    selectionRequestSeq: 0,
  }),
  setImportedModels: (rawModel, autoOrientModel, fileName, exactSession = null) => set((state) => {
    const nextMode = state.orientationMode === "auto-orient" && autoOrientModel
      ? "auto-orient"
      : "raw";

    return {
      rawModel,
      autoOrientModel,
      model: nextMode === "auto-orient" ? autoOrientModel : rawModel,
      fileName,
      exactSession,
      orientationMode: nextMode,
      selectedItems: [],
      selectedDetail: null,
      selectionRequest: null,
      selectionRequestSeq: 0,
    };
  }),
  setExactSession: (exactSession) => set({
    exactSession,
    selectedItems: [],
    selectedDetail: null,
    selectionRequest: null,
    selectionRequestSeq: 0,
  }),
  setOrientationMode: (orientationMode) => set((state) => {
    const nextMode = orientationMode === "raw" ? "raw" : "auto-orient";
    const canUseAutoOrient = !state.fileName || !!state.autoOrientModel;

    if (nextMode === "auto-orient" && !canUseAutoOrient) {
      return {
        orientationMode: "raw",
        model: state.rawModel,
      };
    }

    return {
      orientationMode: nextMode,
      model: nextMode === "auto-orient"
        ? (state.autoOrientModel || state.model)
        : (state.rawModel || state.model),
    };
  }),
  setLoading: (loading, loadingMessage = "") => set({
    loading,
    loadingMessage: loading ? loadingMessage : "",
  }),
  setLoadingMessage: (loadingMessage) => set({ loadingMessage }),
  toggleFaces: () => set((s) => ({ facesVisible: !s.facesVisible })),
  toggleEdges: () => set((s) => ({ edgesVisible: !s.edgesVisible })),
  toggleGrid: () => set((s) => ({ gridVisible: !s.gridVisible })),
  toggleToolpath: () => set((s) => ({ toolpathVisible: !s.toolpathVisible })),
  setProjection: (mode) => set({ projectionMode: mode }),
  setPickMode: (mode) => set({ pickMode: mode, selectedItems: [], selectedDetail: null }),
  setTreeOpen: (open) => set({ treeOpen: open }),
  setTheme: (theme) => set({ theme: theme === "dark" ? "dark" : "light" }),
  toggleTheme: () => set((s) => ({ theme: s.theme === "dark" ? "light" : "dark" })),
  setSelectedItems: (items) => set({ selectedItems: items }),
  setSelectedDetail: (detail) => set({ selectedDetail: detail }),
  requestSelection: (selectionRequest) => set((state) => ({
    selectionRequest,
    selectionRequestSeq: state.selectionRequestSeq + 1,
  })),
  reset: () => set({
    model: null,
    rawModel: null,
    autoOrientModel: null,
    fileName: "",
    exactSession: null,
    loading: false,
    loadingMessage: "",
    selectedItems: [],
    selectedDetail: null,
    selectionRequest: null,
    selectionRequestSeq: 0,
  }),
})));
