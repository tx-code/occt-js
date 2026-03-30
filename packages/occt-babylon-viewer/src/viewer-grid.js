import { Color3 } from "@babylonjs/core/Maths/math.color.js";
import { Vector3 } from "@babylonjs/core/Maths/math.vector.js";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial.js";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder.js";

export function createGridHelpers(scene, bounds) {
  const extent = bounds.max.subtract(bounds.min);
  const center = bounds.min.add(bounds.max).scale(0.5);
  const modelSize = extent.length();
  const gridSize = Math.max(modelSize * 4, 10);
  const maxDimension = Math.max(extent.x, extent.y, extent.z);

  let gridRatio = 1;
  if (maxDimension > 0) {
    const rawRatio = maxDimension / 20;
    gridRatio = Math.pow(10, Math.round(Math.log10(rawRatio)));
  }

  const ground = MeshBuilder.CreateGround(
    "occt-viewer-grid",
    { width: gridSize, height: gridSize, subdivisions: 1 },
    scene,
  );
  const material = new StandardMaterial("occt-viewer-grid-material", scene);
  material.diffuseColor = new Color3(0.12, 0.12, 0.14);
  material.emissiveColor = new Color3(0.04, 0.04, 0.05).scale(Math.max(1 / gridRatio, 0.1));
  material.alpha = 0.98;
  material.backFaceCulling = false;

  ground.material = material;
  ground.position.x = center.x;
  ground.position.y = bounds.min.y - 0.01;
  ground.position.z = center.z;
  ground.isPickable = false;

  const xAxis = MeshBuilder.CreateLines(
    "occt-viewer-x-axis",
    {
      points: [
        new Vector3(center.x - gridSize / 2, bounds.min.y, center.z),
        new Vector3(center.x + gridSize / 2, bounds.min.y, center.z),
      ],
    },
    scene,
  );
  xAxis.color = new Color3(0.8, 0.2, 0.2);
  xAxis.isPickable = false;

  const zAxis = MeshBuilder.CreateLines(
    "occt-viewer-z-axis",
    {
      points: [
        new Vector3(center.x, bounds.min.y, center.z - gridSize / 2),
        new Vector3(center.x, bounds.min.y, center.z + gridSize / 2),
      ],
    },
    scene,
  );
  zAxis.color = new Color3(0.2, 0.8, 0.2);
  zAxis.isPickable = false;

  return { ground, xAxis, zAxis };
}
