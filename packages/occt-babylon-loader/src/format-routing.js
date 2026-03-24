export function inferOcctFormatFromFileName(fileName) {
  if (typeof fileName !== "string" || fileName.trim() === "") {
    return null;
  }

  const match = /\.([^.]+)$/.exec(fileName.trim());
  if (!match) {
    return null;
  }

  const ext = match[1].toLowerCase();
  if (ext === "step" || ext === "stp") {
    return "step";
  }
  if (ext === "iges" || ext === "igs") {
    return "iges";
  }
  if (ext === "brep" || ext === "brp") {
    return "brep";
  }
  return null;
}

export function getOcctSupportedExtensions() {
  return [".step", ".stp", ".iges", ".igs", ".brep", ".brp"];
}
