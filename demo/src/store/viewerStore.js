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

  // Selection (serializable summary)
  pickMode: "face",
  selectedItems: [],

  // Actions
  setModel: (model, fileName) => set({ model, fileName }),
  setLoading: (loading) => set({ loading }),
  toggleFaces: () => set((s) => ({ facesVisible: !s.facesVisible })),
  toggleEdges: () => set((s) => ({ edgesVisible: !s.edgesVisible })),
  setPickMode: (mode) => set({ pickMode: mode, selectedItems: [] }),
  setSelectedItems: (items) => set({ selectedItems: items }),
  reset: () => set({ model: null, fileName: "", selectedItems: [] }),
})));
