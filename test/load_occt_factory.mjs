import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

export function resolveFactoryPath(defaultPath = fileURLToPath(new URL("../dist/occt-js.js", import.meta.url))) {
  return defaultPath;
}

export function createOcctRequireError(factoryPath) {
  return new Error(
    `Missing ${factoryPath}. Build the Wasm artifacts first with "npm run build:wasm:win" on Windows or "bash tools/build_wasm.sh" on Linux/macOS.`
  );
}

export function loadOcctFactory(factoryPath = resolveFactoryPath()) {
  if (!existsSync(factoryPath)) {
    throw createOcctRequireError(factoryPath);
  }
  const require = createRequire(import.meta.url);
  return require(factoryPath);
}
