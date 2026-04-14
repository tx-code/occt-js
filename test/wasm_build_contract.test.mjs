import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const cmake = readFileSync(new URL("../CMakeLists.txt", import.meta.url), "utf8");
const buildScript = readFileSync(new URL("../tools/build_wasm_win.bat", import.meta.url), "utf8");
const distScript = readFileSync(new URL("../tools/build_wasm_win_dist.bat", import.meta.url), "utf8");

test("CMake and Windows build scripts encode the canonical dist runtime artifacts", () => {
  assert.match(cmake, /OUTPUT_NAME "occt-js"/);
  assert.match(cmake, /RUNTIME_OUTPUT_DIRECTORY "\$\{CMAKE_CURRENT_SOURCE_DIR\}\/dist"/);
  assert.match(buildScript, /dist\\occt-js\.js/);
  assert.match(buildScript, /dist\\occt-js\.wasm/);
  assert.match(distScript, /dist\\occt-js\.js/);
  assert.match(distScript, /dist\\occt-js\.wasm/);
});

test("the main Windows build wrapper retains the log path and retry guidance", () => {
  assert.match(buildScript, /build\\wasm-build\.log/);
  assert.match(buildScript, /BUILD_JOBS=1/);
});

test("the dist wrapper does not treat build\\\\wasm artifacts as a competing runtime origin", () => {
  assert.match(distScript, /dist\\occt-js\.js/);
  assert.match(distScript, /dist\\occt-js\.wasm/);
  assert.doesNotMatch(distScript, /build\\wasm\\occt-js\.(js|wasm)/);
});
