import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createOcctCore } from "../src/index.js";
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
