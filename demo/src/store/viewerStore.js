import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

export const useViewerStore = create(subscribeWithSelector((set, get) => ({
  // Model
  model: null,
  rawModel: null,
  autoOrientModel: null,
  fileName: "",
  loading: false,
  loadingMessage: "",  // "Loading engine...", "Parsing model...", etc.

  // View
  facesVisible: true,
  edgesVisible: true,
  gridVisible: true,
  projectionMode: "perspective", // "perspective" | "orthographic"
  treeOpen: false,
  theme: "dark", // "dark" | "light"
  orientationMode: "auto-orient", // "raw" | "auto-orient"

  // Selection (serializable summary)
  pickMode: "face",
  selectedItems: [],
  selectedDetail: null, // { mode, items: [{ id, meshUniqueId, info: {...} }] } or null

  // Actions
  setModel: (model, fileName) => set({
    model,
    rawModel: model,
    autoOrientModel: null,
    fileName,
    orientationMode: "raw",
  }),
  setImportedModels: (rawModel, autoOrientModel, fileName) => set((state) => {
    const nextMode = state.orientationMode === "auto-orient" && autoOrientModel
      ? "auto-orient"
      : "raw";

    return {
      rawModel,
      autoOrientModel,
      model: nextMode === "auto-orient" ? autoOrientModel : rawModel,
      fileName,
      orientationMode: nextMode,
    };
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
  setProjection: (mode) => set({ projectionMode: mode }),
  setPickMode: (mode) => set({ pickMode: mode, selectedItems: [], selectedDetail: null }),
  setTreeOpen: (open) => set({ treeOpen: open }),
  toggleTheme: () => set((s) => ({ theme: s.theme === "dark" ? "light" : "dark" })),
  setSelectedItems: (items) => set({ selectedItems: items }),
  setSelectedDetail: (detail) => set({ selectedDetail: detail }),
  reset: () => set({
    model: null,
    rawModel: null,
    autoOrientModel: null,
    fileName: "",
    loading: false,
    loadingMessage: "",
    selectedItems: [],
    selectedDetail: null,
  }),
})));
