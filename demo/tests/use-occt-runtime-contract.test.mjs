import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const useOcctSource = readFileSync(resolve(__dirname, "..", "src", "hooks", "useOcct.js"), "utf8");
const useViewerActionsSource = readFileSync(resolve(__dirname, "..", "src", "hooks", "useViewerActions.js"), "utf8");

test("web runtime imports the package ESM factory and wasm URL without CDN fallbacks", () => {
  assert.match(useOcctSource, /import\("@tx-code\/occt-js"\)/);
  assert.match(useOcctSource, /import\("@tx-code\/occt-js\/dist\/occt-js\.wasm\?url"\)/);
  assert.match(useOcctSource, /default export must be a factory function/);
  assert.doesNotMatch(useOcctSource, /unpkg\.com/);
  assert.doesNotMatch(useOcctSource, /fallbackModuleUrl/);
});

test("demo runtime hook wires generated tool MVP methods to the retained exact-open lane", () => {
  assert.match(useOcctSource, /ValidateRevolvedShapeSpec/);
  assert.match(useOcctSource, /ValidateHelicalSweepSpec/);
  assert.match(useOcctSource, /ValidateCompositeShapeSpec/);
  assert.match(useOcctSource, /openExactRevolvedShape/);
  assert.match(useOcctSource, /openExactHelicalSweep/);
  assert.match(useOcctSource, /openExactCompositeShape/);
  assert.match(useOcctSource, /const buildGeneratedTool = useCallback/);
  assert.match(useOcctSource, /const validateGeneratedToolSpec = useCallback/);
});

test("demo runtime hook provisions one exact-session contract across imported and generated model flows", () => {
  assert.match(useOcctSource, /openManagedExactModel/);
  assert.match(useOcctSource, /openExactRevolvedShape/);
  assert.match(useOcctSource, /openExactHelicalSweep/);
  assert.match(useOcctSource, /openExactCompositeShape/);
  assert.match(useOcctSource, /upsertWorkpieceActor/);
  assert.match(useOcctSource, /upsertToolActor/);
  assert.match(useOcctSource, /clearWorkspaceExactSessions/);
});

test("viewer reset path clears the demo exact session before dropping model state", () => {
  assert.match(useViewerActionsSource, /clearExactSession/);
});
