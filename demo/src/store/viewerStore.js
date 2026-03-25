import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

export const useViewerStore = create(subscribeWithSelector((set, get) => ({
  // Model
  model: null,
  fileName: "",
  loading: false,

  // View
  facesVisible: true,
  edgesVisible: true,
  projectionMode: "perspective", // "perspective" | "orthographic"
  treeOpen: false,

  // Selection (serializable summary)
  pickMode: "face",
  selectedItems: [],
  selectedDetail: null, // { mode, items: [{ id, meshUniqueId, info: {...} }] } or null

  // Actions
  setModel: (model, fileName) => set({ model, fileName }),
  setLoading: (loading) => set({ loading }),
  toggleFaces: () => set((s) => ({ facesVisible: !s.facesVisible })),
  toggleEdges: () => set((s) => ({ edgesVisible: !s.edgesVisible })),
  setProjection: (mode) => set({ projectionMode: mode }),
  setPickMode: (mode) => set({ pickMode: mode, selectedItems: [], selectedDetail: null }),
  setTreeOpen: (open) => set({ treeOpen: open }),
  setSelectedItems: (items) => set({ selectedItems: items }),
  setSelectedDetail: (detail) => set({ selectedDetail: detail }),
  reset: () => set({ model: null, fileName: "", selectedItems: [], selectedDetail: null }),
})));
