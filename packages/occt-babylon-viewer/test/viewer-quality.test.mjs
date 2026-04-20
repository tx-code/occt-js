import test from "node:test";
import assert from "node:assert/strict";
import { Scene } from "@babylonjs/core/scene.js";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine.js";
import {
  createCadPartMaterial,
  createCadVertexColorMaterial,
  createOcctBabylonViewer,
  resolveShadingNormals,
} from "../src/index.js";

test("viewer exposes theme control and updates scene state", () => {
  const scene = new Scene(new NullEngine());
  const viewer = createOcctBabylonViewer(scene);

  viewer.setTheme("light");
  const state = viewer.getSceneState();

  assert.equal(state.theme, "light");
  assert.ok(scene.clearColor.r > 0.9);
  assert.ok(scene.clearColor.g > 0.9);
  assert.ok(scene.clearColor.b > 0.9);
});

test("cad material helpers default to pbr-style shading", () => {
  const scene = new Scene(new NullEngine());
  const material = createCadPartMaterial(scene, "part", { r: 0.8, g: 0.82, b: 0.86 });
  const vertexColorMaterial = createCadVertexColorMaterial(scene, "vcolor");

  assert.equal("metallic" in material, true);
  assert.equal("roughness" in material, true);
  assert.equal("metallic" in vertexColorMaterial, true);
  assert.equal(material.backFaceCulling, false);
  assert.equal(material.twoSidedLighting, true);
  assert.equal(vertexColorMaterial.backFaceCulling, false);
});

test("shading normals can be recomputed for stable lighting", () => {
  const positions = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);
  const indices = new Uint32Array([0, 1, 2]);

  const recomputed = resolveShadingNormals(positions, indices, null, { mode: "recompute" });
  assert.equal(recomputed.length, 9);
  assert.ok(Number.isFinite(recomputed[2]));

  const sourced = resolveShadingNormals(positions, indices, [0, 0, 1, 0, 0, 1, 0, 0, 1], { mode: "source" });
  assert.deepEqual(Array.from(sourced), [0, 0, 1, 0, 0, 1, 0, 0, 1]);
});

