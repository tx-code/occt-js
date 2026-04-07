import { Color3 } from "@babylonjs/core/Maths/math.color.js";
import { Vector3 } from "@babylonjs/core/Maths/math.vector.js";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial.js";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder.js";
import { GridMaterial } from "@babylonjs/materials/grid/gridMaterial.js";

export function applyGridTheme(material, theme = "dark") {
  if (!material) {
    return;
  }

  const isDarkTheme = theme !== "light";
  const main = isDarkTheme
    ? new Color3(0, 0, 0)
    : new Color3(1, 1, 1);
  const line = isDarkTheme
    ? new Color3(0.24, 0.24, 0.27)
    : new Color3(0.74, 0.75, 0.78);

  if ("mainColor" in material) {
    material.mainColor = main;
  }
  if ("lineColor" in material) {
    material.lineColor = line;
  }
  if ("opacity" in material) {
    material.opacity = isDarkTheme ? 0.8 : 0.9;
  }
  if ("minorUnitVisibility" in material) {
    material.minorUnitVisibility = isDarkTheme ? 0.1 : 0.22;
  }
}

function createGridMaterial(scene, gridRatio, theme = "dark") {
  try {
    const gridMat = new GridMaterial("gridMat", scene);
    applyGridTheme(gridMat, theme);
    gridMat.gridRatio = gridRatio;
    gridMat.majorUnitFrequency = 10;
    gridMat.backFaceCulling = false;
    gridMat.disableLighting = true;
    return gridMat;
  } catch {
    const fallback = new StandardMaterial("gridMatFallback", scene);
    fallback.diffuseColor = theme === "light"
      ? new Color3(0.9, 0.91, 0.94)
      : new Color3(0.16, 0.16, 0.2);
    fallback.emissiveColor = theme === "light"
      ? new Color3(0.72, 0.74, 0.78).scale(0.2)
      : new Color3(0.12, 0.12, 0.16).scale(Math.max(1 / gridRatio, 0.2));
    fallback.alpha = theme === "light" ? 0.9 : 0.8;
    fallback.backFaceCulling = false;
    return fallback;
  }
}

export function createGridHelpers(scene, bounds, options = {}) {
  const theme = options.theme ?? "dark";
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
  ground.material = createGridMaterial(scene, gridRatio, theme);
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
