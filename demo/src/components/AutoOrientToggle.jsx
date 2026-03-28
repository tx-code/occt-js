import { useViewerStore } from "../store/viewerStore";

export default function AutoOrientToggle({ className = "", testId = "auto-orient-checkbox" }) {
  const autoOrientEnabled = useViewerStore((s) => s.autoOrientEnabled);
  const setAutoOrientEnabled = useViewerStore((s) => s.setAutoOrientEnabled);

  return (
    <label className={`inline-flex items-center gap-2 text-xs text-zinc-300 ${className}`.trim()}>
      <input
        type="checkbox"
        checked={autoOrientEnabled}
        onChange={(event) => setAutoOrientEnabled(event.target.checked)}
        data-testid={testId}
      />
      <span>Auto Orient</span>
    </label>
  );
}
