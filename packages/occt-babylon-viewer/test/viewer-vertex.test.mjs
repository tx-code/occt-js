import test from "node:test";
import assert from "node:assert/strict";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine.js";
import { Scene } from "@babylonjs/core/scene.js";
import { Mesh } from "@babylonjs/core/Meshes/mesh.js";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData.js";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial.js";
import { Vector3 } from "@babylonjs/core/Maths/math.vector.js";
import { Color3 } from "@babylonjs/core/Maths/math.color.js";
import {
  createOcctVertexPreviewPoints,
  getOcctVertexCoords,
  pickOcctClosestVertex,
} from "../src/viewer-vertex.js";

test("getOcctVertexCoords supports plain xyz and position arrays", () => {
  assert.deepEqual(getOcctVertexCoords({ x: 1, y: 2, z: 3 }), { x: 1, y: 2, z: 3 });
  assert.deepEqual(getOcctVertexCoords({ position: [4, 5, 6] }), { x: 4, y: 5, z: 6 });
  assert.equal(getOcctVertexCoords({ x: 1, y: 2 }), null);
});

test("pickOcctClosestVertex prefers world-space result and falls back to screen-space", () => {
  class StubVector3 {
    constructor(x, y, z) {
      this.x = x;
      this.y = y;
      this.z = z;
    }

    static TransformCoordinates(vector) {
      return new StubVector3(vector.x, vector.y, vector.z);
    }

    static Project(world) {
      return { x: world.x * 100 + 400, y: world.y * 100 + 300, z: 0.5 };
    }
  }

  const BABYLON = {
    Vector3: StubVector3,
    Matrix: {
      Identity() {
        return {};
      },
    },
  };
  const geometry = { vertices: [{ x: 0, y: 0, z: 0 }, { x: 2, y: 0, z: 0 }] };
  const pickedMesh = {
    getWorldMatrix() {
      return {};
    },
  };
  const scene = {
    getTransformMatrix() {
      return {};
    },
  };
  const camera = {
    radius: 10,
    viewport: {
      toGlobal() {
        return {};
      },
    },
  };
  const engine = {
    getRenderingCanvas() {
      return { clientWidth: 1000, clientHeight: 600 };
    },
    getRenderWidth() {
      return 1000;
    },
    getRenderHeight() {
      return 600;
    },
  };

  const worldResult = pickOcctClosestVertex({
    pickedMesh,
    geometry,
    localPoint: { x: 0.05, y: 0, z: 0 },
    pointerX: 401,
    pointerY: 299,
    scene,
    camera,
    engine,
    BABYLON,
  });
  assert.ok(worldResult);
  assert.equal(worldResult.index, 0);
  assert.equal(worldResult.source, "world");

  const screenResult = pickOcctClosestVertex({
    pickedMesh,
    geometry,
    localPoint: { x: 100, y: 100, z: 100 },
    pointerX: 398,
    pointerY: 302,
    scene,
    camera,
    engine,
    BABYLON,
  });
  assert.ok(screenResult);
  assert.equal(screenResult.index, 0);
  assert.equal(screenResult.source, "screen");
});

test("createOcctVertexPreviewPoints builds a point cloud marker mesh", () => {
  const scene = new Scene(new NullEngine());
  const sourceMesh = new Mesh("part", scene);
  sourceMesh.isVisible = true;

  const BABYLON = {
    Mesh,
    VertexData,
    StandardMaterial,
    Vector3,
    Color3,
  };
  const geometry = {
    vertices: [
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 0, z: 0 },
      { x: 0, y: 1, z: 0 },
    ],
  };

  const preview = createOcctVertexPreviewPoints(
    scene,
    [sourceMesh],
    () => geometry,
    BABYLON,
    { pointSizeCssPx: 3.0 },
  );

  assert.equal(preview.length, 3);
  const markerMesh = preview[0];
  const markerMaterial = preview[1];
  assert.equal(markerMesh.name, "__vertex_preview__");
  assert.equal(markerMaterial.pointsCloud, true);
  assert.ok(markerMaterial.pointSize > 0);

  for (const disposable of preview) {
    if (typeof disposable?.dispose === "function") {
      disposable.dispose();
    }
  }
});
