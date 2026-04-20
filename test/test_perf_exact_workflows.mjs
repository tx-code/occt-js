import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { loadOcctFactory } from "./load_occt_factory.mjs";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
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

function benchmarkScenario(scenario, iterations, operationsPerIteration, fn) {
  const startedAt = performance.now();
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    fn(iteration);
  }
  const elapsedMs = performance.now() - startedAt;
  const operationCount = iterations * operationsPerIteration;
  const seconds = elapsedMs / 1000;
  const opsPerSecond = seconds > 0 ? operationCount / seconds : 0;

  return {
    scenario,
    iterations,
    operationCount,
    elapsedMs: Number(elapsedMs.toFixed(3)),
    opsPerSecond: Number(opsPerSecond.toFixed(2)),
  };
}

function toPositiveInteger(value, fallbackValue) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallbackValue;
  }
  return parsed;
}

async function main() {
  const factory = loadOcctFactory();
  const module = await factory();

  const stepBytes = new Uint8Array(readFileSync(resolve("test", "simple_part.step")));
  const igesBytes = new Uint8Array(readFileSync(resolve("test", "cube_10x10.igs")));

  const queryIterations = toPositiveInteger(process.env.EXACT_QUERY_ITERATIONS, 500);
  const igesImportIterations = toPositiveInteger(process.env.EXACT_IGES_IMPORT_ITERATIONS, 60);
  const igesOrientationIterations = toPositiveInteger(process.env.EXACT_IGES_ORIENTATION_ITERATIONS, 30);

  const opened = module.OpenExactStepModel(stepBytes, {});
  assert(opened?.success, "OpenExactStepModel(simple_part.step) should succeed");
  const refs = findRepresentativeRefs(module, opened);
  assert(refs, "simple_part.step should expose one plane face and one line edge");

  const metrics = [];

  metrics.push(benchmarkScenario(
    "exact-query-loop",
    queryIterations,
    3,
    () => {
      const type = module.GetExactGeometryType(...refs.faceRef);
      const faceArea = module.MeasureExactFaceArea(...refs.faceRef);
      const edgeLength = module.MeasureExactEdgeLength(...refs.edgeRef);
      assert(type?.ok === true, "GetExactGeometryType should stay successful in perf lane");
      assert(faceArea?.ok === true, "MeasureExactFaceArea should stay successful in perf lane");
      assert(edgeLength?.ok === true, "MeasureExactEdgeLength should stay successful in perf lane");
    },
  ));

  metrics.push(benchmarkScenario(
    "iges-import-loop",
    igesImportIterations,
    1,
    () => {
      const imported = module.ReadIgesFile(igesBytes, {});
      assert(imported?.success === true, "ReadIgesFile should succeed in perf lane");
      assert((imported?.geometries?.length ?? 0) > 0, "ReadIgesFile should return at least one geometry");
    },
  ));

  metrics.push(benchmarkScenario(
    "iges-orientation-loop",
    igesOrientationIterations,
    1,
    () => {
      const orientation = module.AnalyzeOptimalOrientation("iges", igesBytes, { mode: "manufacturing" });
      assert(orientation?.success === true, "AnalyzeOptimalOrientation(iges) should succeed in perf lane");
    },
  ));

  const report = {
    generatedAt: new Date().toISOString(),
    fixtureSet: {
      exactQuery: "simple_part.step",
      igesImport: "cube_10x10.igs",
      igesOrientation: "cube_10x10.igs",
    },
    metrics,
  };

  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error("FAIL:", error.message ?? error);
  process.exit(1);
});
