import { applyOrientationToModel, resolveAutoOrientedModel } from "@tx-code/occt-core";

const FORMAT_ALIAS = {
  step: "step",
  stp: "step",
  iges: "iges",
  igs: "iges",
  brep: "brep",
  brp: "brep",
};

export function getOcctFormatFromFileName(fileName) {
  if (typeof fileName !== "string" || fileName.trim() === "") {
    return null;
  }

  const match = /\.([^.]+)$/.exec(fileName.trim());
  if (!match) {
    return null;
  }

  return FORMAT_ALIAS[match[1].toLowerCase()] ?? null;
}

export function applyOrientationToResult(result, orientation) {
  return applyOrientationToModel(result, orientation);
}

export async function resolveAutoOrientedResult({
  bytes,
  format,
  mode,
  occt,
  result,
} = {}) {
  return resolveAutoOrientedModel({
    bytes,
    format,
    mode,
    model: result,
    occt,
  });
}
