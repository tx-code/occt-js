import test from "node:test";
import assert from "node:assert/strict";
import { shouldAutoLoadSample } from "../src/lib/sample-autoload.js";

test("sample autoload stays off by default", () => {
  assert.equal(
    shouldAutoLoadSample({
      env: {},
      navigatorObject: { webdriver: false },
    }),
    false,
  );
});

test("sample autoload only enables on explicit opt-in outside webdriver", () => {
  assert.equal(
    shouldAutoLoadSample({
      env: { VITE_OCCT_DEMO_AUTOLOAD_SAMPLE: "true" },
      navigatorObject: { webdriver: false },
    }),
    true,
  );

  assert.equal(
    shouldAutoLoadSample({
      env: { VITE_OCCT_DEMO_AUTOLOAD_SAMPLE: "true" },
      navigatorObject: { webdriver: true },
    }),
    false,
  );
});
