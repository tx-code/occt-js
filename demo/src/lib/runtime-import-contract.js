export async function verifyOcctPackageImportContract() {
  const [{ default: OcctJS }, { default: wasmUrl }] = await Promise.all([
    import("@tx-code/occt-js"),
    import("@tx-code/occt-js/dist/occt-js.wasm?url"),
  ]);

  if (typeof OcctJS !== "function") {
    return {
      ok: false,
      reason: "default-not-function",
      defaultType: typeof OcctJS,
      wasmUrl: typeof wasmUrl,
    };
  }

  const occt = await OcctJS({
    locateFile(fileName) {
      return fileName.endsWith(".wasm") ? wasmUrl : fileName;
    },
  });

  return {
    ok: true,
    defaultType: typeof OcctJS,
    wasmUrl,
    hasReadStepFile: typeof occt?.ReadStepFile === "function",
    hasReadIgesFile: typeof occt?.ReadIgesFile === "function",
    hasReadBrepFile: typeof occt?.ReadBrepFile === "function",
  };
}
