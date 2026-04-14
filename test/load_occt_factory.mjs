import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

export function resolveFactoryPath(defaultPath = fileURLToPath(new URL("../dist/occt-js.js", import.meta.url))) {
  return defaultPath;
}

export function resolveWasmPath(defaultPath = fileURLToPath(new URL("../dist/occt-js.wasm", import.meta.url))) {
  return defaultPath;
}

export function createOcctRequireError(factoryPath) {
  return new Error(
    `Missing ${factoryPath}. Build the Wasm artifacts first with "npm run build:wasm:win" on Windows or "bash tools/build_wasm.sh" on Linux/macOS.`
  );
}

export function assertDistRuntimeArtifactsPresent(
  factoryPath = resolveFactoryPath(),
  wasmPath = resolveWasmPath(path.join(path.dirname(factoryPath), "occt-js.wasm"))
) {
  if (!existsSync(factoryPath)) {
    throw createOcctRequireError(factoryPath);
  }
  if (!existsSync(wasmPath)) {
    throw createOcctRequireError(wasmPath);
  }
}

export function loadOcctFactory(
  factoryPath = resolveFactoryPath(),
  wasmPath = resolveWasmPath(path.join(path.dirname(factoryPath), "occt-js.wasm"))
) {
  assertDistRuntimeArtifactsPresent(factoryPath, wasmPath);
  const require = createRequire(import.meta.url);
  return require(factoryPath);
}
