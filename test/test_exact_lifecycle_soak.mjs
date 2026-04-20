import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { loadOcctFactory } from "./load_occt_factory.mjs";

const RELEASED_HANDLE_FAILURE = {
  ok: false,
  code: "released-handle",
  message: "Exact model handle has already been released.",
};

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function toPositiveInteger(value, fallbackValue) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallbackValue;
  }
  return parsed;
}

function getExactRef(result, geometryIndex, kind, elementId) {
  return [
    result.exactModelId,
    result.exactGeometryBindings[geometryIndex].exactShapeHandle,
    kind,
    elementId,
  ];
}

function findRepresentativeRefs(module, result) {
  for (let geometryIndex = 0; geometryIndex < (result.geometries?.length ?? 0); geometryIndex += 1) {
    const geometry = result.geometries[geometryIndex];
    const planeFace = (geometry.faces ?? []).find((face) => {
      const family = module.GetExactGeometryType(...getExactRef(result, geometryIndex, "face", face.id));
      return family?.ok === true && family.family === "plane";
    });
    const lineEdge = (geometry.edges ?? []).find((edge) => {
      const family = module.GetExactGeometryType(...getExactRef(result, geometryIndex, "edge", edge.id));
      return family?.ok === true && family.family === "line";
    });

    if (planeFace && lineEdge) {
      return {
        faceRef: getExactRef(result, geometryIndex, "face", planeFace.id),
        edgeRef: getExactRef(result, geometryIndex, "edge", lineEdge.id),
      };
    }
  }

  return null;
}

function summarizeDurations(values) {
  const sorted = values.slice().sort((left, right) => left - right);
  const total = sorted.reduce((sum, value) => sum + value, 0);
  const count = sorted.length || 1;
  const percentile95Index = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95));
  return {
    minMs: Number((sorted[0] ?? 0).toFixed(3)),
    avgMs: Number((total / count).toFixed(3)),
    p95Ms: Number((sorted[percentile95Index] ?? 0).toFixed(3)),
    maxMs: Number((sorted[sorted.length - 1] ?? 0).toFixed(3)),
  };
}

async function main() {
  const cycles = toPositiveInteger(process.env.EXACT_SOAK_CYCLES, 120);
  const queryIterationsPerCycle = toPositiveInteger(process.env.EXACT_SOAK_QUERY_ITERATIONS, 24);
  const expectedOperationsPerCycle = queryIterationsPerCycle * 3;

  const stepBytes = new Uint8Array(readFileSync(resolve("test", "simple_part.step")));
  const factory = loadOcctFactory();
  const module = await factory();

  const cycleDurations = [];
  let totalOperations = 0;
  let releasedHandleChecks = 0;

  const soakStartedAt = performance.now();
  for (let cycle = 0; cycle < cycles; cycle += 1) {
    const cycleStartedAt = performance.now();
    const opened = module.OpenExactStepModel(stepBytes, {});
    assert(opened?.success === true, `cycle ${cycle}: OpenExactStepModel should succeed`);

    const refs = findRepresentativeRefs(module, opened);
    assert(refs, `cycle ${cycle}: fixture should expose one plane face and one line edge`);

    for (let queryIteration = 0; queryIteration < queryIterationsPerCycle; queryIteration += 1) {
      const faceType = module.GetExactGeometryType(...refs.faceRef);
      const faceArea = module.MeasureExactFaceArea(...refs.faceRef);
      const edgeLength = module.MeasureExactEdgeLength(...refs.edgeRef);

      assert(faceType?.ok === true, `cycle ${cycle}: GetExactGeometryType should succeed`);
      assert(faceArea?.ok === true, `cycle ${cycle}: MeasureExactFaceArea should succeed`);
      assert(edgeLength?.ok === true, `cycle ${cycle}: MeasureExactEdgeLength should succeed`);
    }
    totalOperations += expectedOperationsPerCycle;

    const releaseResult = module.ReleaseExactModel(opened.exactModelId);
    assert(releaseResult?.ok === true, `cycle ${cycle}: ReleaseExactModel should succeed`);

    const releasedType = module.GetExactGeometryType(...refs.faceRef);
    assert(
      releasedType?.ok === RELEASED_HANDLE_FAILURE.ok
        && releasedType?.code === RELEASED_HANDLE_FAILURE.code
        && releasedType?.message === RELEASED_HANDLE_FAILURE.message,
      `cycle ${cycle}: released-handle query result should stay deterministic`,
    );
    releasedHandleChecks += 1;

    const diagnostics = module.GetExactModelDiagnostics();
    assert(
      diagnostics?.liveExactModelCount === 0,
      `cycle ${cycle}: diagnostics liveExactModelCount should return to zero after final release`,
    );

    cycleDurations.push(performance.now() - cycleStartedAt);
  }
  const soakElapsedMs = performance.now() - soakStartedAt;

  const finalDiagnostics = module.GetExactModelDiagnostics();
  assert(finalDiagnostics?.liveExactModelCount === 0, "soak final diagnostics should have zero live exact models");

  const soakSeconds = soakElapsedMs / 1000;
  const report = {
    generatedAt: new Date().toISOString(),
    scenario: "exact-lifecycle-long-session-soak",
    fixture: "simple_part.step",
    cycles,
    queryIterationsPerCycle,
    releasedHandleChecks,
    totalOperations,
    elapsedMs: Number(soakElapsedMs.toFixed(3)),
    operationsPerSecond: Number((soakSeconds > 0 ? totalOperations / soakSeconds : 0).toFixed(2)),
    cycleDurationStats: summarizeDurations(cycleDurations),
    finalDiagnostics: {
      liveExactModelCount: finalDiagnostics.liveExactModelCount,
      releasedHandleCount: finalDiagnostics.releasedHandleCount,
    },
  };

  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error("FAIL:", error.message ?? error);
  process.exit(1);
});
