const FORMAT_ALIAS = {
  step: "step",
  stp: "step",
  iges: "iges",
  igs: "iges",
  brep: "brep",
  brp: "brep",
};

const FORMAT_METHOD = {
  step: "ReadStepFile",
  iges: "ReadIgesFile",
  brep: "ReadBrepFile",
};

export function normalizeOcctFormat(format) {
  if (typeof format !== "string" || format.trim() === "") {
    throw new Error("CAD format is required.");
  }

  const key = format.trim().toLowerCase().replace(/^\./, "");
  const normalized = FORMAT_ALIAS[key];
  if (!normalized) {
    throw new Error(`Unsupported CAD format: ${format}`);
  }
  return normalized;
}

export function getReadMethodName(format) {
  return FORMAT_METHOD[normalizeOcctFormat(format)];
}

export function listSupportedFormats() {
  return Object.keys(FORMAT_METHOD);
}
