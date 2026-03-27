import { useCallback, useEffect, useMemo } from "react";
import { useViewerStore } from "../store/viewerStore";
import { openNativeModelFile, showDesktopAbout } from "../lib/desktop-file";
import { getSampleModelCandidates } from "../lib/sample-model";
import { getDesktopShortcutAction } from "../lib/desktop-shortcuts";
import { createDesktopActionMap, isEditableTarget } from "../lib/viewer-actions";

export function useViewerActions({
  buildScene,
  clearScene,
  desktopEnabled,
  fileInputRef,
  fitAll,
  importFile,
  setProjection,
} = {}) {
  const resetViewer = useViewerStore((s) => s.reset);
  const setProjectionMode = useViewerStore((s) => s.setProjection);
  const toggleTheme = useViewerStore((s) => s.toggleTheme);

  const importModelFile = useCallback(async (file) => {
    try {
      const result = await importFile(file);
      buildScene(result);
    } catch (err) {
      alert("Error: " + err.message);
    }
  }, [buildScene, importFile]);

  const openSample = useCallback(async () => {
    try {
      let blob = null;

      for (const candidate of getSampleModelCandidates()) {
        try {
          const resp = await fetch(candidate);
          if (!resp.ok) continue;
          blob = await resp.blob();
          break;
        } catch {
          // Keep trying other sample sources.
        }
      }

      if (!blob) throw new Error("Sample file is unavailable in this runtime");

      const file = new File([blob], "simple_part.step");
      await importModelFile(file);
    } catch (err) {
      alert("Error loading sample: " + err.message);
    }
  }, [importModelFile]);

  const openFile = useCallback(() => {
    if (!desktopEnabled) {
      if (fileInputRef.current) fileInputRef.current.click();
      return;
    }

    openNativeModelFile()
      .then(async (file) => {
        if (file) await importModelFile(file);
      })
      .catch((err) => {
        alert("Error: " + err.message);
      });
  }, [desktopEnabled, fileInputRef, importModelFile]);

  const closeModel = useCallback(() => {
    clearScene();
    resetViewer();
  }, [clearScene, resetViewer]);

  const setProjectionAction = useCallback((mode) => {
    setProjection(mode);
    setProjectionMode(mode);
  }, [setProjection, setProjectionMode]);

  const toggleThemeAction = useCallback(() => {
    toggleTheme();
  }, [toggleTheme]);

  const aboutAction = useCallback(() => {
    showDesktopAbout().catch((err) => {
      alert("Error: " + err.message);
    });
  }, []);

  const desktopActionMap = useMemo(() => createDesktopActionMap({
    openFile,
    closeModel,
    fitAll,
    setPerspective: () => setProjectionAction("perspective"),
    setOrthographic: () => setProjectionAction("orthographic"),
  }), [closeModel, fitAll, openFile, setProjectionAction]);

  useEffect(() => {
    if (!desktopEnabled) return;

    function handleKeyDown(event) {
      const actionId = getDesktopShortcutAction({
        key: event.key,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        altKey: event.altKey,
        shiftKey: event.shiftKey,
        isEditableTarget: isEditableTarget(event.target),
      });

      if (!actionId) return;

      event.preventDefault();
      desktopActionMap[actionId]?.();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [desktopActionMap, desktopEnabled]);

  return {
    aboutAction,
    closeModel,
    desktopActionMap,
    importModelFile,
    openFile,
    openSample,
    setProjectionAction,
    toggleThemeAction,
  };
}
