import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData.js";

export function resolveShadingNormals(positions, indices, sourceNormals, options = {}) {
  const mode = options.mode ?? "recompute";

  if (mode === "source" && Array.isArray(sourceNormals) && sourceNormals.length > 0) {
    return new Float32Array(sourceNormals);
  }

  if (mode !== "recompute" && mode !== "source") {
    throw new Error(`Unknown normals mode: ${mode}`);
  }

  const computed = [];
  VertexData.ComputeNormals(Array.from(positions), Array.from(indices), computed);
  return new Float32Array(computed);
}

