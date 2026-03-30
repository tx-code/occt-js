import { useEffect, useRef } from "react";
import { createViewCubeWidget } from "@tx-code/occt-babylon-widgets";
import { useViewerStore } from "../store/viewerStore";

const SIZE = 140;

export default function ViewCube({ onCameraView, cameraRef }) {
  const containerRef = useRef(null);
  const widgetRef = useRef(null);
  const model = useViewerStore((state) => state.model);
  const selectedDetail = useViewerStore((state) => state.selectedDetail);

  useEffect(() => {
    if (!model || !containerRef.current) return undefined;

    const widget = createViewCubeWidget({ container: containerRef.current });
    widgetRef.current = widget;
    widget.attach({
      getCamera: () => cameraRef?.current ?? null,
      setView: (direction, customView) => onCameraView?.(direction, customView),
    });

    return () => {
      widget.detach();
      widget.dispose();
      if (widgetRef.current === widget) {
        widgetRef.current = null;
      }
    };
  }, [cameraRef, model, onCameraView]);

  if (!model) return null;

  return (
    <div
      ref={containerRef}
      className={`absolute bottom-4 right-4 z-20 ${selectedDetail ? "hidden md:block" : ""}`}
      style={{ width: SIZE, height: SIZE, borderRadius: 10 }}
      data-testid="viewcube"
    />
  );
}
