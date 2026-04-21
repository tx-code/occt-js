import { useMemo, useState } from "react";
import { Button } from "./ui/button";
import { cn } from "../lib/utils";
import { useViewerStore } from "../store/viewerStore";
import {
  cloneGeneratedToolPresetOptions,
  cloneGeneratedToolPresetSpec,
  formatGeneratedToolJson,
  GENERATED_TOOL_PRESETS,
  getGeneratedToolPresetCatalog,
  getGeneratedToolPreset,
  getGeneratedToolPresetGroup,
} from "../lib/generated-tool-presets";

function getDiagnosticLabel(diagnostic) {
  const parts = [diagnostic.code];
  if (diagnostic.path) {
    parts.push(diagnostic.path);
  }
  if (typeof diagnostic.segmentIndex === "number") {
    parts.push(`segment ${diagnostic.segmentIndex}`);
  }
  return parts.join(" · ");
}

function renderPresetParameter(parameter, isLight) {
  return (
    <span
      key={`${parameter.label}-${parameter.value}`}
      className={cn(
        "rounded-full border px-2 py-1 text-[10px] tracking-[0.02em]",
        isLight
          ? "border-zinc-200 bg-white text-zinc-700"
          : "border-zinc-700/80 bg-zinc-950/60 text-zinc-300",
      )}
    >
      <span className={cn("font-mono", isLight ? "text-zinc-500" : "text-zinc-500")}>{parameter.label}</span>
      {" "}
      {parameter.value}
    </span>
  );
}

export default function GeneratedToolPanel({
  open,
  onClose,
  validateGeneratedToolSpec,
  buildGeneratedTool,
}) {
  const theme = useViewerStore((s) => s.theme);
  const isLight = theme === "light";
  const [presetId, setPresetId] = useState(GENERATED_TOOL_PRESETS[0].id);
  const [specText, setSpecText] = useState(() => formatGeneratedToolJson(cloneGeneratedToolPresetSpec(GENERATED_TOOL_PRESETS[0].id)));
  const [diagnostics, setDiagnostics] = useState([]);
  const [status, setStatus] = useState("");
  const [localError, setLocalError] = useState("");
  const [busyMode, setBusyMode] = useState("");

  const presetCatalog = useMemo(() => getGeneratedToolPresetCatalog(), []);
  const preset = useMemo(() => getGeneratedToolPreset(presetId), [presetId]);
  const presetGroup = useMemo(() => getGeneratedToolPresetGroup(preset.groupId), [preset.groupId]);

  if (!open) return null;

  function applyPreset(nextPresetId) {
    setPresetId(nextPresetId);
    setSpecText(formatGeneratedToolJson(cloneGeneratedToolPresetSpec(nextPresetId)));
    setDiagnostics([]);
    setStatus("");
    setLocalError("");
  }

  function parseSpec() {
    try {
      return JSON.parse(specText);
    } catch (error) {
      const wrappedError = new Error(`Invalid JSON: ${error.message}`);
      wrappedError.cause = error;
      throw wrappedError;
    }
  }

  async function handleValidate() {
    setBusyMode("validate");
    setLocalError("");
    setStatus("");
    try {
      const spec = parseSpec();
      const result = await validateGeneratedToolSpec(spec);
      setDiagnostics(result?.diagnostics ?? []);
      if (result?.ok) {
        setStatus("Spec is valid. Runtime validation passed.");
      } else {
        setStatus(`Validation returned ${result?.diagnostics?.length ?? 0} diagnostic(s).`);
      }
    } catch (error) {
      setDiagnostics([]);
      setLocalError(error.message);
    } finally {
      setBusyMode("");
    }
  }

  async function handleGenerate() {
    setBusyMode("build");
    setLocalError("");
    setStatus("");
    try {
      const spec = parseSpec();
      const { result } = await buildGeneratedTool({
        spec,
        options: cloneGeneratedToolPresetOptions(presetId),
        label: `Generated · ${preset.label}`,
      });
      setDiagnostics([]);
      setStatus(`Generated ${preset.label} with ${result?.stats?.triangleCount ?? 0} triangles.`);
      onClose?.();
    } catch (error) {
      setDiagnostics(error.diagnostics ?? []);
      setLocalError(error.message);
    } finally {
      setBusyMode("");
    }
  }

  return (
    <div
      className={cn(
        "absolute inset-0 z-[180] flex items-center justify-center p-4 backdrop-blur-sm",
        isLight ? "bg-white/72" : "bg-zinc-950/72",
      )}
      data-testid="generated-tool-panel"
    >
      <div
        className={cn(
          "grid max-h-[min(90vh,54rem)] w-[min(96vw,72rem)] gap-4 overflow-hidden rounded-[2rem] border shadow-2xl md:grid-cols-[17rem,minmax(0,1fr)]",
          isLight
            ? "border-zinc-300 bg-white text-zinc-900 shadow-zinc-300/40"
            : "border-zinc-800 bg-zinc-950 text-zinc-100 shadow-black/40",
        )}
      >
        <aside
          className={cn(
            "flex min-h-0 flex-col border-b p-5 md:border-b-0 md:border-r",
            isLight ? "border-zinc-200 bg-zinc-50/80" : "border-zinc-800 bg-zinc-900/60",
          )}
        >
          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-[0.26em] text-cyan-400">Generated Tool MVP</p>
            <h2 className="text-xl font-semibold">Revolved Tool Builder</h2>
            <p className={cn("text-sm leading-6", isLight ? "text-zinc-600" : "text-zinc-400")}>
              This demo calls the root Wasm runtime directly through <code>ValidateRevolvedShapeSpec</code> and the retained exact-open lane for generated revolved shapes.
            </p>
            <p className={cn("text-[11px] leading-5", isLight ? "text-zinc-500" : "text-zinc-500")}>
              Preset catalog is split between FreeCAD-aligned samples and common demo-only families.
            </p>
          </div>

          <div className="mt-5 flex-1 space-y-4 overflow-y-auto pr-1">
            {presetCatalog.map((group) => (
              <section key={group.id} className="space-y-2" data-testid={`generated-tool-group-${group.id}`}>
                <div className="px-1">
                  <div className={cn("text-[10px] font-medium uppercase tracking-[0.22em]", isLight ? "text-zinc-500" : "text-zinc-500")}>
                    {group.label}
                  </div>
                  <p className={cn("mt-1 text-[11px] leading-5", isLight ? "text-zinc-500" : "text-zinc-500")}>
                    {group.description}
                  </p>
                </div>
                <div className="space-y-2">
                  {group.presets.map((entry) => (
                    <button
                      key={entry.id}
                      type="button"
                      className={cn(
                        "w-full rounded-2xl border p-3 text-left transition-colors",
                        entry.id === presetId
                          ? (isLight ? "border-cyan-500 bg-cyan-50" : "border-cyan-500/60 bg-cyan-500/10")
                          : (isLight ? "border-zinc-200 bg-white hover:border-zinc-300" : "border-zinc-800 bg-zinc-950/70 hover:border-zinc-700"),
                      )}
                      onClick={() => applyPreset(entry.id)}
                      data-testid={`generated-tool-preset-${entry.id}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium">{entry.label}</span>
                        <span className={cn("text-[10px] uppercase tracking-[0.18em]", isLight ? "text-zinc-500" : "text-zinc-500")}>
                          {entry.spec.revolve?.angleDeg === 360 ? "full" : "partial"}
                        </span>
                      </div>
                      <p className={cn("mt-1 text-xs leading-5", isLight ? "text-zinc-600" : "text-zinc-400")}>
                        {entry.description}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {(entry.parameters ?? []).map((parameter) => renderPresetParameter(parameter, isLight))}
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <div className={cn("mt-5 rounded-2xl border p-3 text-xs", isLight ? "border-zinc-200 bg-white/90 text-zinc-600" : "border-zinc-800 bg-zinc-950/80 text-zinc-400")}>
            <div className="font-medium text-zinc-400">Build Options</div>
            <div className="mt-2 space-y-1">
              <div>linearDeflectionType: <code>{preset.buildOptions.linearDeflectionType}</code></div>
              <div>linearDeflection: <code>{preset.buildOptions.linearDeflection}</code></div>
              <div>angularDeflection: <code>{preset.buildOptions.angularDeflection}</code></div>
            </div>
          </div>
        </aside>

        <section className="flex min-h-0 min-w-0 flex-col overflow-hidden">
          <div className={cn("flex items-start justify-between gap-4 border-b px-5 py-4", isLight ? "border-zinc-200" : "border-zinc-800")}>
            <div>
              <div className="text-sm font-medium">{preset.label}</div>
              <div className="mt-2">
                <span
                  className={cn(
                    "inline-flex rounded-full border px-2 py-1 text-[10px] uppercase tracking-[0.18em]",
                    isLight
                      ? "border-zinc-200 bg-zinc-50 text-zinc-600"
                      : "border-zinc-700/80 bg-zinc-900 text-zinc-300",
                  )}
                >
                  {presetGroup.label}
                </span>
              </div>
              <p className={cn("mt-1 text-xs leading-5", isLight ? "text-zinc-600" : "text-zinc-400")}>
                {preset.description}
              </p>
              <p className={cn("mt-2 text-[11px] leading-5", isLight ? "text-zinc-500" : "text-zinc-500")}>
                Edit the normalized revolved-shape spec directly. Presets are starter payloads, not runtime-owned tool types.
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {(preset.parameters ?? []).map((parameter) => renderPresetParameter(parameter, isLight))}
              </div>
            </div>
            <Button variant="ghost" onClick={onClose} data-testid="generated-tool-close">
              Close
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            <label className="mb-2 block text-[11px] uppercase tracking-[0.22em] text-zinc-500" htmlFor="generated-tool-json">
              RevolvedShapeSpec JSON
            </label>
            <textarea
              id="generated-tool-json"
              value={specText}
              onChange={(event) => setSpecText(event.target.value)}
              spellCheck={false}
              className={cn(
                "h-[20rem] w-full resize-none rounded-2xl border px-4 py-3 font-mono text-[12px] leading-6 outline-none transition-colors",
                isLight
                  ? "border-zinc-300 bg-zinc-50 text-zinc-900 focus:border-cyan-500"
                  : "border-zinc-800 bg-zinc-950 text-zinc-100 focus:border-cyan-500",
              )}
              data-testid="generated-tool-json"
            />

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button
                onClick={handleValidate}
                disabled={busyMode === "validate" || busyMode === "build"}
                data-testid="generated-tool-validate"
              >
                {busyMode === "validate" ? "Validating..." : "Validate"}
              </Button>
              <Button
                variant="active"
                onClick={handleGenerate}
                disabled={busyMode === "validate" || busyMode === "build"}
                data-testid="generated-tool-build"
              >
                {busyMode === "build" ? "Generating..." : "Generate"}
              </Button>
              <Button
                variant="ghost"
                onClick={() => applyPreset(presetId)}
                disabled={busyMode === "validate" || busyMode === "build"}
                data-testid="generated-tool-reset"
              >
                Reset Preset
              </Button>
              <span className={cn("text-xs", isLight ? "text-zinc-500" : "text-zinc-500")}>
                Output sourceFormat: <code>generated-revolved-shape</code>
              </span>
            </div>

            {(status || localError || diagnostics.length > 0) && (
              <div className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1fr),minmax(0,1.2fr)]">
                <div
                  className={cn(
                    "rounded-2xl border p-4",
                    localError
                      ? (isLight ? "border-rose-200 bg-rose-50 text-rose-700" : "border-rose-500/30 bg-rose-500/10 text-rose-200")
                      : (isLight ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"),
                  )}
                  data-testid="generated-tool-status"
                >
                  <div className="text-[11px] uppercase tracking-[0.22em]">Status</div>
                  <p className="mt-2 text-sm leading-6">{localError || status}</p>
                </div>

                <div
                  className={cn(
                    "rounded-2xl border p-4",
                    isLight ? "border-zinc-200 bg-zinc-50" : "border-zinc-800 bg-zinc-900/70",
                  )}
                >
                  <div className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Diagnostics</div>
                  {diagnostics.length === 0 ? (
                    <p className={cn("mt-2 text-sm", isLight ? "text-zinc-600" : "text-zinc-400")}>No diagnostics.</p>
                  ) : (
                    <ul className="mt-3 space-y-2" data-testid="generated-tool-diagnostics">
                      {diagnostics.map((diagnostic, index) => (
                        <li
                          key={`${diagnostic.code}-${diagnostic.path ?? index}`}
                          className={cn(
                            "rounded-xl border px-3 py-2 text-sm",
                            isLight ? "border-zinc-200 bg-white text-zinc-800" : "border-zinc-800 bg-zinc-950 text-zinc-200",
                          )}
                        >
                          <div className="font-medium text-cyan-400">{getDiagnosticLabel(diagnostic)}</div>
                          <div className="mt-1 leading-6">{diagnostic.message}</div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
