import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  createOcctCore,
  normalizeExactOpenResult,
  resolveExactElementRef,
} from "../src/index.js";
import { loadOcctFactory } from "../../../test/load_occt_factory.mjs";

test("createOcctCore imports STEP through the built root carrier", async () => {
  const factory = loadOcctFactory();
  const wasmBinary = new Uint8Array(await readFile(new URL("../../../dist/occt-js.wasm", import.meta.url)));
  const stepBytes = new Uint8Array(await readFile(new URL("../../../test/simple_part.step", import.meta.url)));

  const core = createOcctCore({
    factory,
    wasmBinary,
  });

  const model = await core.importModel(stepBytes, {
    format: "step",
    fileName: "simple_part.step",
  });

  assert.equal(model.sourceFormat, "step");
  assert.ok(model.rootNodes.length > 0);
  assert.ok(model.geometries.length > 0);
  assert.ok(model.stats.partCount > 0);
});

test("createOcctCore opens and disposes an exact STEP handle through the built root carrier", async () => {
  const factory = loadOcctFactory();
  const wasmBinary = new Uint8Array(await readFile(new URL("../../../dist/occt-js.wasm", import.meta.url)));
  const stepBytes = new Uint8Array(await readFile(new URL("../../../test/simple_part.step", import.meta.url)));

  const core = createOcctCore({
    factory,
    wasmBinary,
  });

  const exact = await core.openExactStep(stepBytes, {
    fileName: "simple_part.step",
  });

  assert.equal(exact.sourceFormat, "step");
  assert.equal(typeof exact.exactModelId, "number");
  assert.deepEqual(await core.releaseExactModel(exact.exactModelId), { ok: true });
});

function collectGeometryOccurrences(nodes, parentTransform = [
  1, 0, 0, 0,
  0, 1, 0, 0,
  0, 0, 1, 0,
  0, 0, 0, 1,
]) {
  const results = [];
  for (const node of nodes ?? []) {
    const local = Array.isArray(node.transform) && node.transform.length === 16
      ? node.transform
      : parentTransform;
    const world = multiplyMatrices(parentTransform, local);
    for (const geometryId of node.geometryIds ?? []) {
      results.push({ geometryId, nodeId: node.nodeId, transform: world });
    }
    results.push(...collectGeometryOccurrences(node.children ?? [], world));
  }
  return results;
}

function multiplyMatrices(left, right) {
  const output = new Array(16).fill(0);
  for (let row = 0; row < 4; row += 1) {
    for (let column = 0; column < 4; column += 1) {
      let sum = 0;
      for (let index = 0; index < 4; index += 1) {
        sum += left[index * 4 + row] * right[column * 4 + index];
      }
      output[column * 4 + row] = sum;
    }
  }
  return output;
}

test("createOcctCore resolves repeated geometry occurrences into distinct exact refs", async () => {
  const factory = loadOcctFactory();
  const wasmBinary = new Uint8Array(await readFile(new URL("../../../dist/occt-js.wasm", import.meta.url)));
  const assemblyBytes = new Uint8Array(await readFile(new URL("../../../test/assembly.step", import.meta.url)));

  const core = createOcctCore({
    factory,
    wasmBinary,
  });

  const rawExact = await core.openExactStep(assemblyBytes, {
    fileName: "assembly.step",
  });
  const exactModel = normalizeExactOpenResult(rawExact, {
    sourceFileName: "assembly.step",
  });
  const occurrences = collectGeometryOccurrences(exactModel.rootNodes);
  const repeated = occurrences.find((candidate, index) => (
    occurrences.findIndex((other) => other.geometryId === candidate.geometryId && other.nodeId !== candidate.nodeId) > index
  ));

  assert.ok(repeated, "assembly.step should expose at least one repeated geometry occurrence");

  const matching = occurrences.filter((entry) => entry.geometryId === repeated.geometryId);
  assert.ok(matching.length >= 2, "the repeated geometry should appear under at least two nodes");

  const geometry = exactModel.geometries.find((entry) => entry.geometryId === repeated.geometryId);
  assert.ok(geometry?.faces?.length, "the repeated geometry should expose at least one face");

  const faceId = geometry.faces[0].id;
  const first = resolveExactElementRef(exactModel, {
    nodeId: matching[0].nodeId,
    geometryId: repeated.geometryId,
    kind: "face",
    elementId: faceId,
  });
  const second = resolveExactElementRef(exactModel, {
    nodeId: matching[1].nodeId,
    geometryId: repeated.geometryId,
    kind: "face",
    elementId: faceId,
  });

  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  assert.equal(first.exactShapeHandle, second.exactShapeHandle);
  assert.notEqual(first.nodeId, second.nodeId);
  assert.deepEqual(await core.releaseExactModel(exactModel.exactModelId), { ok: true });
});
