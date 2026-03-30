import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Scene } from "@babylonjs/core/scene.js";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine.js";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera.js";
import { Vector3 } from "@babylonjs/core/Maths/math.vector.js";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode.js";
import { createOcctBabylonViewer } from "../src/index.js";

const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");

test("createOcctBabylonViewer attaches to a supplied scene", () => {
  const engine = new NullEngine();
  const scene = new Scene(engine);

  const viewer = createOcctBabylonViewer(scene);

  assert.equal(viewer.getScene(), scene);
  assert.equal(typeof viewer.dispose, "function");
  assert.equal(typeof viewer.loadOcctModel, "function");
});

test("viewer manages a dedicated OCCT root node and clears it", () => {
  const engine = new NullEngine();
  const scene = new Scene(engine);
  const viewer = createOcctBabylonViewer(scene);

  const root = viewer.getRootNode();
  assert.ok(root instanceof TransformNode);
  assert.equal(root.parent, null);

  viewer.clearModel();
  assert.equal(viewer.getRootNode(), root);
});

test("viewer dispose restores the prior active camera", () => {
  const engine = new NullEngine();
  const scene = new Scene(engine);
  const hostCamera = new ArcRotateCamera(
    "host-camera",
    Math.PI / 4,
    Math.PI / 3,
    30,
    Vector3.Zero(),
    scene,
  );
  scene.activeCamera = hostCamera;

  const viewer = createOcctBabylonViewer(scene);
  assert.notEqual(scene.activeCamera, hostCamera);

  viewer.dispose();
  assert.equal(scene.activeCamera, hostCamera);
  assert.equal(hostCamera.isDisposed(), false);

  hostCamera.dispose();
});

test("viewer loads an OCCT model into its root node", () => {
  const scene = new Scene(new NullEngine());
  const viewer = createOcctBabylonViewer(scene);
  const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  const model = {
    sourceFormat: "step",
    rootNodes: [
      {
        id: "node-1",
        kind: "part",
        name: "part-1",
        transform: identity,
        geometryIds: ["geom-1"],
        materialIds: ["mat-1"],
      },
    ],
    geometries: [
      {
        id: "geom-1",
        positions: [0, 0, 0, 1, 0, 0, 0, 1, 0],
        indices: [0, 1, 2],
        normals: [0, 0, 1, 0, 0, 1, 0, 0, 1],
      },
    ],
    materials: [{ id: "mat-1", baseColor: [0.6, 0.6, 0.8, 1] }],
    warnings: [],
    stats: {},
  };
  const emptyModel = {
    sourceFormat: "step",
    rootNodes: [],
    geometries: [],
    materials: [],
    warnings: [],
    stats: {},
  };

  const firstLoad = viewer.loadOcctModel(model);
  assert.equal(firstLoad.meshes.length, 1);
  assert.equal(firstLoad.meshes[0].parent, viewer.getRootNode());

  const firstMesh = firstLoad.meshes[0];
  const secondLoad = viewer.loadOcctModel(emptyModel);
  assert.equal(firstMesh.isDisposed(), true);
  assert.equal(secondLoad.meshes.length, 0);

  assert.ok(viewer.getSceneState());
  assert.ok(viewer.getRootNode());
});

test("package exports resolve to the shipped entry file", () => {
  const packageJsonPath = resolve(packageDir, "package.json");
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
  const exportEntry = packageJson?.exports?.["."];

  assert.equal(packageJson.main, "./src/index.js");
  assert.equal(exportEntry, "./src/index.js");
  assert.equal(existsSync(resolve(packageDir, exportEntry)), true);
});
