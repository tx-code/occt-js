import test from "node:test";
import assert from "node:assert/strict";
import { getSampleModelCandidates } from "../src/lib/sample-model.js";

test("desktop sample uses bundled local asset only", () => {
  assert.deepEqual(
    getSampleModelCandidates({ desktopPlatform: "windows" }),
    ["./samples/simple_part.step"]
  );
});

test("web sample prefers bundled local asset and keeps remote fallback", () => {
  assert.deepEqual(
    getSampleModelCandidates({ desktopPlatform: "web" }),
    [
      "./samples/simple_part.step",
      "https://raw.githubusercontent.com/tx-code/occt-js/master/test/simple_part.step",
    ]
  );
});
