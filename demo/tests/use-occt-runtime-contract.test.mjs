import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const useOcctSource = readFileSync(resolve(__dirname, "..", "src", "hooks", "useOcct.js"), "utf8");
const useViewerActionsSource = readFileSync(resolve(__dirname, "..", "src", "hooks", "useViewerActions.js"), "utf8");

test("dev local dist lookup targets concrete repo-root runtime files instead of a directory base", () => {
  assert.match(useOcctSource, /new URL\(\s*"\.\.\/\.\.\/\.\.\/dist\/occt-js\.js",\s*import\.meta\.url\s*\)/);
  assert.match(useOcctSource, /new URL\(\s*"\.\.\/\.\.\/\.\.\/dist\/occt-js\.wasm",\s*import\.meta\.url\s*\)/);
  assert.doesNotMatch(useOcctSource, /new URL\(\s*\/\*\s*@vite-ignore\s*\*\/\s*"\.\.\/\.\.\/\.\.\/dist\/"/);
  assert.doesNotMatch(useOcctSource, /new URL\(\s*"\.\.\/\.\.\/\.\.\/dist\/",\s*import\.meta\.url\s*\)/);
});

test("demo runtime hook wires generated tool MVP methods to the retained exact-open lane", () => {
  assert.match(useOcctSource, /ValidateRevolvedShapeSpec/);
  assert.match(useOcctSource, /openExactRevolvedShape/);
  assert.match(useOcctSource, /const buildGeneratedTool = useCallback/);
  assert.match(useOcctSource, /const validateGeneratedToolSpec = useCallback/);
});

test("demo runtime hook provisions one exact-session contract across imported and generated model flows", () => {
  assert.match(useOcctSource, /openManagedExactModel/);
  assert.match(useOcctSource, /openExactRevolvedShape/);
  assert.match(useOcctSource, /upsertWorkpieceActor/);
  assert.match(useOcctSource, /upsertToolActor/);
  assert.match(useOcctSource, /clearWorkspaceExactSessions/);
});

test("viewer reset path clears the demo exact session before dropping model state", () => {
  assert.match(useViewerActionsSource, /clearExactSession/);
});
