import * as BABYLON from "@babylonjs/core/Legacy/legacy";
import "@babylonjs/materials/legacy/legacy-grid";
import "@babylonjs/core/Meshes/instancedMesh";
import { CreateGreasedLine } from "@babylonjs/core/Meshes/Builders/greasedLineBuilder";

globalThis.BABYLON = Object.assign(globalThis.BABYLON ?? {}, BABYLON, {
  CreateGreasedLine,
});

