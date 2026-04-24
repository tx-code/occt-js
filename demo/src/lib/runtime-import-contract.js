import occtWasmUrl from "../../../dist/occt-js.wasm?url";

export async function verifyOcctPackageImportContract() {
  const { default: OcctJS } = await import("@tx-code/occt-js");

  if (typeof OcctJS !== "function") {
    return {
      ok: false,
      reason: "default-not-function",
      defaultType: typeof OcctJS,
      wasmUrl: typeof occtWasmUrl,
    };
  }

  const occt = await OcctJS({
    locateFile(fileName) {
      return fileName.endsWith(".wasm") ? occtWasmUrl : fileName;
    },
  });

  return {
    ok: true,
    defaultType: typeof OcctJS,
    wasmUrl: occtWasmUrl,
    hasReadStepFile: typeof occt?.ReadStepFile === "function",
    hasReadIgesFile: typeof occt?.ReadIgesFile === "function",
    hasReadBrepFile: typeof occt?.ReadBrepFile === "function",
  };
}
