function formatBooleanStatus(value, positiveLabel = "Pass", negativeLabel = "Fail") {
  return value ? positiveLabel : negativeLabel;
}

function formatShapeType(shapeType) {
  if (typeof shapeType !== "string" || shapeType.trim().length === 0) {
    return "Unknown";
  }

  return shapeType
    .trim()
    .split(/[_\-\s]+/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function buildGeneratedToolValidationRows(model) {
  const validation = model?.revolvedShape?.shapeValidation
    ?? model?.helicalSweep?.shapeValidation
    ?? model?.extrudedShape?.shapeValidation
    ?? model?.compositeShape?.shapeValidation;
  if (!validation || typeof validation !== "object") {
    return [];
  }

  const exact = validation.exact ?? {};
  const mesh = validation.mesh ?? {};

  return [
    ["Exact", formatBooleanStatus(exact.isValid === true)],
    ["Closed", formatBooleanStatus(exact.isClosed === true, "Yes", "No")],
    ["Solid", formatBooleanStatus(exact.isSolid === true, "Yes", "No")],
    ["Shape Type", formatShapeType(exact.shapeType)],
    ["Watertight", formatBooleanStatus(mesh.isWatertight === true, "Yes", "No")],
    ["Manifold", formatBooleanStatus(mesh.isManifold === true, "Yes", "No")],
    ["Boundary Edges", Number.isFinite(mesh.boundaryEdgeCount) ? mesh.boundaryEdgeCount : 0],
    ["Non-Manifold", Number.isFinite(mesh.nonManifoldEdgeCount) ? mesh.nonManifoldEdgeCount : 0],
  ];
}
