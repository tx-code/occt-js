import { createOcctCore } from "@tx-code/occt-core";
import { useCallback, useRef, useState } from "react";
import { useViewerStore } from "../store/viewerStore.js";
import {
  deriveDemoMeasurementActions,
  runDemoMeasurementAction,
} from "../lib/measurement-actions.js";
import { buildMeasurementOverlayState } from "../lib/measurement-overlay.js";

export function useMeasurement({ ensureModule } = {}) {
  const selectedDetail = useViewerStore((state) => state.selectedDetail);
  const currentMeasurement = useViewerStore((state) => state.currentMeasurement);
  const setCurrentMeasurement = useViewerStore((state) => state.setCurrentMeasurement);
  const clearMeasurements = useViewerStore((state) => state.clearMeasurements);
  const [runningActionId, setRunningActionId] = useState("");
  const coreRef = useRef(null);
  const corePromiseRef = useRef(null);

  const items = Array.isArray(selectedDetail?.items) ? selectedDetail.items : [];

  const ensureCore = useCallback(async () => {
    if (coreRef.current) {
      return coreRef.current;
    }
    if (corePromiseRef.current) {
      return corePromiseRef.current;
    }

    corePromiseRef.current = (async () => {
      if (typeof ensureModule !== "function") {
        throw new Error("Measurement runtime requires ensureModule().");
      }
      const module = await ensureModule();
      const core = createOcctCore({
        factory: async () => module,
      });
      coreRef.current = core;
      return core;
    })().catch((error) => {
      corePromiseRef.current = null;
      throw error;
    });

    return corePromiseRef.current;
  }, [ensureModule]);

  const availability = deriveDemoMeasurementActions({
    items,
  });
  const activeMeasurement = currentMeasurement ?? null;
  const activeMeasurementOverlay = activeMeasurement?.overlay
    ?? buildMeasurementOverlayState(activeMeasurement);

  const handleRunMeasurement = useCallback(async (actionId) => {
    setRunningActionId(actionId);
    try {
      const itemsSnapshot = Array.isArray(useViewerStore.getState().selectedDetail?.items)
        ? useViewerStore.getState().selectedDetail.items
        : [];
      const availabilitySnapshot = deriveDemoMeasurementActions({
        items: itemsSnapshot,
      });
      const core = await ensureCore();
      const result = await runDemoMeasurementAction({
        core,
        actionId,
        items: itemsSnapshot,
        availability: availabilitySnapshot,
      });
      const nextMeasurement = {
        ...result,
        overlay: buildMeasurementOverlayState(result),
      };
      setCurrentMeasurement(nextMeasurement);
      return nextMeasurement;
    } finally {
      setRunningActionId("");
    }
  }, [ensureCore, setCurrentMeasurement]);

  return {
    actions: availability.actions,
    unsupportedReason: availability.unsupportedReason,
    runningActionId,
    activeMeasurement,
    activeMeasurementOverlay,
    runMeasurement: handleRunMeasurement,
    clearMeasurements,
  };
}
