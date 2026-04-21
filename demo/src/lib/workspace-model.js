const IDENTITY_MATRIX = Object.freeze([
  1, 0, 0, 0,
  0, 1, 0, 0,
  0, 0, 1, 0,
  0, 0, 0, 1,
]);

const ROLE_ORDER = Object.freeze({
  workpiece: 0,
  tool: 1,
});

const ROLE_LABEL = Object.freeze({
  workpiece: "Workpiece",
  tool: "Tool",
});

function cloneMatrix(matrix = IDENTITY_MATRIX) {
  if (!Array.isArray(matrix) || matrix.length !== 16) {
    return Array.from(IDENTITY_MATRIX);
  }
  return Array.from(matrix);
}

function normalizeAxisValue(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function normalizeTranslation(translation = {}, fallback = { x: 0, y: 0, z: 0 }) {
  return {
    x: normalizeAxisValue(translation.x, fallback.x),
    y: normalizeAxisValue(translation.y, fallback.y),
    z: normalizeAxisValue(translation.z, fallback.z),
  };
}

function buildTranslationMatrix(translation) {
  return [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    translation.x, translation.y, translation.z, 1,
  ];
}

function prefixIdentifier(prefix, value, fallback) {
  if (typeof value === "string" && value.length > 0) {
    return `${prefix}${value}`;
  }
  if (Number.isFinite(value)) {
    return `${prefix}${value}`;
  }
  return `${prefix}${fallback}`;
}

function prefixStringArray(values, prefix) {
  if (!Array.isArray(values)) {
    return [];
  }
  return values.map((value, index) => prefixIdentifier(prefix, value, index));
}

function prefixNode(node, prefix, index = 0) {
  const children = Array.isArray(node?.children)
    ? node.children.map((child, childIndex) => prefixNode(child, prefix, childIndex))
    : [];

  return {
    ...node,
    id: prefixIdentifier(prefix, node?.id ?? node?.nodeId, `node-${index}`),
    nodeId: typeof node?.nodeId === "string"
      ? `${prefix}${node.nodeId}`
      : node?.nodeId,
    geometryIds: prefixStringArray(node?.geometryIds, prefix),
    materialIds: prefixStringArray(node?.materialIds, prefix),
    children,
  };
}

function prefixGeometry(geometry, prefix, index = 0) {
  return {
    ...geometry,
    id: prefixIdentifier(prefix, geometry?.id, `geometry-${index}`),
  };
}

function prefixMaterial(material, prefix, index = 0) {
  return {
    ...material,
    id: prefixIdentifier(prefix, material?.id, `material-${index}`),
  };
}

function prefixRevolvedShapeMetadata(revolvedShape, prefix) {
  if (!revolvedShape || typeof revolvedShape !== "object") {
    return null;
  }

  return {
    ...revolvedShape,
    faceBindings: Array.isArray(revolvedShape.faceBindings)
      ? revolvedShape.faceBindings.map((binding) => ({
        ...binding,
        geometryId: typeof binding?.geometryId === "string"
          ? `${prefix}${binding.geometryId}`
          : binding?.geometryId,
      }))
      : [],
  };
}

function sumStats(actorModels) {
  const totals = {};
  for (const model of actorModels) {
    const stats = model?.stats ?? {};
    for (const [key, value] of Object.entries(stats)) {
      if (!Number.isFinite(value)) {
        continue;
      }
      totals[key] = (totals[key] ?? 0) + value;
    }
  }
  return totals;
}

function resolveActorSortValue(actor) {
  return ROLE_ORDER[actor?.actorRole] ?? 99;
}

function resolveActorLabel(actor) {
  if (typeof actor?.label === "string" && actor.label.length > 0) {
    return actor.label;
  }
  if (typeof actor?.fileName === "string" && actor.fileName.length > 0) {
    return actor.fileName;
  }
  return actor?.actorId ?? "Actor";
}

function resolveActorDisplayModel(actor, orientationMode) {
  if (!actor || typeof actor !== "object") {
    return null;
  }

  if (actor.actorRole === "workpiece") {
    if (orientationMode === "auto-orient" && actor.autoOrientModel) {
      return actor.autoOrientModel;
    }
    return actor.rawModel ?? null;
  }

  return actor.model ?? actor.rawModel ?? null;
}

export function createIdentityActorPose() {
  const translation = { x: 0, y: 0, z: 0 };
  return {
    translation,
    matrix: cloneMatrix(IDENTITY_MATRIX),
  };
}

export function patchActorPose(actorPose, patch = {}) {
  const currentTranslation = normalizeTranslation(actorPose?.translation);
  const translation = patch?.matrix
    ? currentTranslation
    : normalizeTranslation(patch.translation, currentTranslation);

  return {
    translation,
    matrix: Array.isArray(patch?.matrix) && patch.matrix.length === 16
      ? cloneMatrix(patch.matrix)
      : buildTranslationMatrix(translation),
  };
}

export function nudgeActorPose(actorPose, translationDelta = {}) {
  const currentTranslation = normalizeTranslation(actorPose?.translation);
  return patchActorPose(actorPose, {
    translation: {
      x: currentTranslation.x + normalizeAxisValue(translationDelta.x, 0),
      y: currentTranslation.y + normalizeAxisValue(translationDelta.y, 0),
      z: currentTranslation.z + normalizeAxisValue(translationDelta.z, 0),
    },
  });
}

export function getOrderedWorkspaceActors(workspaceActors = {}) {
  return Object.entries(workspaceActors)
    .map(([actorId, actor]) => ({
      ...actor,
      actorId,
    }))
    .sort((left, right) => resolveActorSortValue(left) - resolveActorSortValue(right));
}

export function buildWorkspaceLabel(workspaceActors = {}) {
  const orderedActors = getOrderedWorkspaceActors(workspaceActors);
  if (orderedActors.length === 0) {
    return "";
  }
  return orderedActors.map((actor) => resolveActorLabel(actor)).join(" + ");
}

export function buildWorkspaceModel(workspaceActors = {}, orientationMode = "auto-orient") {
  const orderedActors = getOrderedWorkspaceActors(workspaceActors)
    .map((actor) => ({
      actor,
      model: resolveActorDisplayModel(actor, orientationMode),
    }))
    .filter((entry) => entry.model);

  if (orderedActors.length === 0) {
    return null;
  }

  const geometries = [];
  const materials = [];
  const rootNodes = [];
  const warnings = [];
  const actorModels = [];
  let revolvedShape = null;

  for (const { actor, model } of orderedActors) {
    const actorPrefix = `actor:${actor.actorId}:`;
    const actorPose = patchActorPose(actor.actorPose);
    const actorLabel = resolveActorLabel(actor);
    const roleLabel = ROLE_LABEL[actor.actorRole] ?? actor.actorRole ?? "Actor";

    geometries.push(
      ...(model.geometries ?? []).map((geometry, index) => prefixGeometry(geometry, actorPrefix, index)),
    );
    materials.push(
      ...(model.materials ?? []).map((material, index) => prefixMaterial(material, actorPrefix, index)),
    );
    warnings.push(...(model.warnings ?? []));
    actorModels.push(model);

    const actorChildren = Array.isArray(model.rootNodes)
      ? model.rootNodes.map((node, index) => prefixNode(node, actorPrefix, index))
      : [];

    rootNodes.push({
      id: `workspace:${actor.actorId}`,
      name: `${roleLabel} · ${actorLabel}`,
      kind: "assembly",
      geometryIds: [],
      materialIds: [],
      transform: cloneMatrix(actorPose.matrix),
      children: actorChildren,
    });

    if (actor.actorRole === "tool" && !revolvedShape) {
      revolvedShape = prefixRevolvedShapeMetadata(model.revolvedShape, actorPrefix);
    }
  }

  const singleActorModel = orderedActors.length === 1 ? orderedActors[0].model : null;

  return {
    sourceFormat: singleActorModel?.sourceFormat ?? "workspace",
    rootNodes,
    geometries,
    materials,
    warnings,
    stats: sumStats(actorModels),
    revolvedShape,
  };
}
