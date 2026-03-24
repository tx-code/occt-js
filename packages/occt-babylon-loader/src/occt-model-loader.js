import { inferOcctFormatFromFileName } from "./format-routing.js";

function toUint8Array(data) {
  if (data instanceof Uint8Array) {
    return data;
  }
  if (data instanceof ArrayBuffer) {
    return new Uint8Array(data);
  }
  if (ArrayBuffer.isView(data)) {
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  }
  if (typeof data === "string") {
    return new TextEncoder().encode(data);
  }
  throw new Error("Unsupported model payload type.");
}

export async function loadWithOcctCore(core, data, options = {}) {
  if (!core || typeof core.importModel !== "function") {
    throw new Error("loadWithOcctCore requires a core instance exposing importModel().");
  }

  const format = options.format ?? inferOcctFormatFromFileName(options.fileName);
  if (!format) {
    throw new Error("Unable to infer CAD format. Provide options.format or a fileName with extension.");
  }

  return core.importModel(toUint8Array(data), {
    format,
    fileName: options.fileName,
    importParams: options.importParams,
  });
}
