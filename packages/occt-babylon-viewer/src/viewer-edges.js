import { Color3 } from "@babylonjs/core/Maths/math.color.js";
import { Vector3 } from "@babylonjs/core/Maths/math.vector.js";
import { Mesh } from "@babylonjs/core/Meshes/mesh.js";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder.js";
import { CreateGreasedLine } from "@babylonjs/core/Meshes/Builders/greasedLineBuilder.js";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial.js";

function toColor3(colorLike, fallback) {
  if (!colorLike || typeof colorLike !== "object") {
    return fallback;
  }
  const { r, g, b } = colorLike;
  if (typeof r !== "number" || typeof g !== "number" || typeof b !== "number") {
    return fallback;
  }
  return new Color3(r, g, b);
}

function computeBounds(positionsLike) {
  const positions = positionsLike || [];
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;

  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i];
    const y = positions[i + 1];
    const z = positions[i + 2];
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (z < minZ) minZ = z;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
    if (z > maxZ) maxZ = z;
  }

  const hasBounds = Number.isFinite(minX) && Number.isFinite(maxX);
  if (!hasBounds) {
    return {
      center: { x: 0, y: 0, z: 0 },
      diagonal: 1,
    };
  }

  const cx = (minX + maxX) * 0.5;
  const cy = (minY + maxY) * 0.5;
  const cz = (minZ + maxZ) * 0.5;
  const dx = maxX - minX;
  const dy = maxY - minY;
  const dz = maxZ - minZ;
  const diagonal = Math.max(Math.sqrt(dx * dx + dy * dy + dz * dz), 1);

  return {
    center: { x: cx, y: cy, z: cz },
    diagonal,
  };
}

function normalizeTheme(themeLike) {
  return themeLike === "light" ? "light" : "dark";
}

function resolveThemeEdgeColor(theme) {
  if (theme === "light") {
    return new Color3(0.064, 0.072, 0.084);
  }
  return new Color3(0.128, 0.136, 0.15);
}

function resolveThemeEmissiveScale(theme) {
  return theme === "light" ? 0.62 : 0.8;
}

export function createOcctEdgeOverlayBuilder(scene, options = {}) {
  if (!scene) {
    throw new TypeError("createOcctEdgeOverlayBuilder requires a Babylon scene");
  }

  let activeTheme = normalizeTheme(options.theme);
  let edgeColor = toColor3(options.color, resolveThemeEdgeColor(activeTheme));
  let emissiveScale = resolveThemeEmissiveScale(activeTheme);
  const edgeOffsetRatio = typeof options.edgeOffsetRatio === "number" ? options.edgeOffsetRatio : 0.00012;
  const tubeRadiusDivisor = typeof options.tubeRadiusDivisor === "number" ? options.tubeRadiusDivisor : 11000;
  const minTubeRadius = typeof options.minTubeRadius === "number" ? options.minTubeRadius : 0.00025;
  const tubeBatchSize = typeof options.tubeBatchSize === "number" ? options.tubeBatchSize : 180;
  const tubeMaxSegments = typeof options.tubeMaxSegments === "number" ? options.tubeMaxSegments : 0;
  const tubeMaxLines = typeof options.tubeMaxLines === "number" ? options.tubeMaxLines : 0;
  const greasedMaxSegments = typeof options.greasedMaxSegments === "number" ? options.greasedMaxSegments : 90000;
  const greasedMaxLines = typeof options.greasedMaxLines === "number" ? options.greasedMaxLines : 12000;
  const greasedWidth = typeof options.greasedWidth === "number" ? options.greasedWidth : 1.1;

  const tubeMaterial = new StandardMaterial("occt_edge_tube_mat", scene);
  tubeMaterial.diffuseColor = edgeColor;
  tubeMaterial.emissiveColor = edgeColor.scale(emissiveScale);
  tubeMaterial.specularColor = Color3.Black();
  tubeMaterial.backFaceCulling = false;
  tubeMaterial.disableLighting = true;
  tubeMaterial.disableDepthWrite = true;

  function applyEdgeMeshColor(mesh) {
    if (!mesh || mesh.isDisposed?.()) {
      return;
    }

    if ("color" in mesh) {
      mesh.color = edgeColor.clone();
    }

    const material = mesh.material;
    if (!material || material.isDisposed?.()) {
      return;
    }

    if ("disableDepthWrite" in material) {
      material.disableDepthWrite = true;
    }

    if (typeof material.setColor === "function") {
      material.setColor(edgeColor.clone(), true);
    }

    if ("color" in material) {
      material.color = edgeColor.clone();
    }

    if ("diffuseColor" in material) {
      material.diffuseColor = edgeColor.clone();
    }

    if ("emissiveColor" in material) {
      material.emissiveColor = edgeColor.scale(emissiveScale);
    }
  }

  function createLines(geometry) {
    const { center, diagonal } = computeBounds(geometry?.positions);
    const edgeOffset = diagonal * edgeOffsetRatio;
    const tubeRadius = Math.max(diagonal / tubeRadiusDivisor, minTubeRadius);
    const tubeTessellation = diagonal > 3000 ? 4 : 6;
    const lines = [];
    let segmentCount = 0;

    for (let edgeIndex = 0; edgeIndex < (geometry?.edges?.length || 0); edgeIndex++) {
      const edge = geometry.edges[edgeIndex];
      const pts = edge?.points;
      if (!pts || pts.length < 6) {
        continue;
      }

      const path = [];
      for (let i = 0; i < pts.length; i += 3) {
        const px = pts[i];
        const py = pts[i + 1];
        const pz = pts[i + 2];
        const ox = px - center.x;
        const oy = py - center.y;
        const oz = pz - center.z;
        const len = Math.sqrt(ox * ox + oy * oy + oz * oz);
        if (len > 1e-8) {
          const s = edgeOffset / len;
          path.push(new Vector3(px + ox * s, py + oy * s, pz + oz * s));
        } else {
          path.push(new Vector3(px, py, pz));
        }
      }

      if (path.length >= 2) {
        lines.push(path);
        segmentCount += path.length - 1;
      }
    }

    return {
      lines,
      segmentCount,
      tubeRadius,
      tubeTessellation,
    };
  }

  function build(geometry, parent) {
    if (!geometry?.edges?.length) {
      return [];
    }

    const {
      lines,
      segmentCount,
      tubeRadius,
      tubeTessellation,
    } = createLines(geometry);
    if (lines.length === 0) {
      return [];
    }

    const useTube = segmentCount <= tubeMaxSegments && lines.length <= tubeMaxLines;
    if (useTube) {
      const mergedBatches = [];
      let batch = [];
      const mergeBatch = () => {
        if (batch.length === 0) {
          return;
        }
        const merged = batch.length === 1
          ? batch[0]
          : Mesh.MergeMeshes(batch, true, true, undefined, false, true);
        if (merged) {
          mergedBatches.push(merged);
        } else {
          mergedBatches.push(...batch);
        }
        batch = [];
      };

      for (let i = 0; i < lines.length; i++) {
        const tube = MeshBuilder.CreateTube(
          `edge_tube_${i}`,
          {
            path: lines[i],
            radius: tubeRadius,
            tessellation: tubeTessellation,
            cap: Mesh.NO_CAP,
            sideOrientation: Mesh.DOUBLESIDE,
            updatable: false,
          },
          scene,
        );
        tube.material = tubeMaterial;
        tube.isPickable = false;
        batch.push(tube);
        if (batch.length >= tubeBatchSize) {
          mergeBatch();
        }
      }
      mergeBatch();

      for (const mesh of mergedBatches) {
        mesh.parent = parent ?? null;
        mesh.isPickable = false;
        mesh.alwaysSelectAsActiveMesh = true;
        mesh.renderingGroupId = 1;
        applyEdgeMeshColor(mesh);
      }
      return mergedBatches;
    }

    const useGreasedLine = segmentCount <= greasedMaxSegments && lines.length <= greasedMaxLines;
    if (useGreasedLine) {
      try {
        const edgeMesh = CreateGreasedLine(
          "edges_greased",
          {
            points: lines,
            updatable: false,
          },
          {
            materialType: 2,
            color: edgeColor,
            colorMode: 0,
            useColors: false,
            useDash: false,
            cameraFacing: true,
            sizeAttenuation: true,
            width: greasedWidth,
          },
          scene,
        );
        if (edgeMesh) {
          edgeMesh.parent = parent ?? null;
          edgeMesh.isPickable = false;
          edgeMesh.renderingGroupId = 1;
          edgeMesh.alwaysSelectAsActiveMesh = true;
          applyEdgeMeshColor(edgeMesh);
          return [edgeMesh];
        }
      } catch {
        // Fall through to line system.
      }
    }

    const lineSystem = MeshBuilder.CreateLineSystem("edges", { lines, updatable: false }, scene);
    lineSystem.color = edgeColor;
    lineSystem.parent = parent ?? null;
    lineSystem.isPickable = false;
    lineSystem.alpha = 1;
    lineSystem.renderingGroupId = 1;
    lineSystem.alwaysSelectAsActiveMesh = true;
    applyEdgeMeshColor(lineSystem);
    return [lineSystem];
  }

  function setTheme(theme, edgeMeshes = []) {
    activeTheme = normalizeTheme(theme);
    edgeColor = toColor3(options.color, resolveThemeEdgeColor(activeTheme));
    emissiveScale = resolveThemeEmissiveScale(activeTheme);
    tubeMaterial.diffuseColor = edgeColor;
    tubeMaterial.emissiveColor = edgeColor.scale(emissiveScale);

    for (const mesh of edgeMeshes) {
      applyEdgeMeshColor(mesh);
    }
  }

  function dispose() {
    const disposed = typeof tubeMaterial?.isDisposed === "function" ? tubeMaterial.isDisposed() : false;
    if (!disposed) {
      tubeMaterial.dispose();
    }
  }

  return {
    build,
    setTheme,
    dispose,
  };
}
