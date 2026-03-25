// demo/src/components/LoadingOverlay.jsx
import { useViewerStore } from "../store/viewerStore";

export default function LoadingOverlay() {
  const loading = useViewerStore((s) => s.loading);
  if (!loading) return null;

  return (
    <div className="absolute inset-0 z-[200] flex items-center justify-center bg-zinc-950/90" data-testid="loading">
      <div className="w-8 h-8 border-3 border-zinc-700 border-t-cyan-400 rounded-full animate-spin" />
      <span className="ml-3 text-sm">Loading model...</span>
    </div>
  );
}
