import test from "node:test";
import assert from "node:assert/strict";
import { getSampleModelCandidates } from "../src/lib/sample-model.js";

test("desktop sample uses bundled local asset only", () => {
  assert.deepEqual(
    getSampleModelCandidates({ desktopPlatform: "windows" }),
    ["./samples/analysis-io1-cm-214.stp"]
  );
});

test("web sample prefers bundled local asset and keeps remote fallback", () => {
  assert.deepEqual(
    getSampleModelCandidates({ desktopPlatform: "web" }),
    [
      "./samples/analysis-io1-cm-214.stp",
      "https://raw.githubusercontent.com/tx-code/occt-js/master/demo/public/samples/analysis-io1-cm-214.stp",
    ]
  );
});
