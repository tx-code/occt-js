export function getStepSelectableOccurrences(inspection) {
  if (inspection?.status !== "ok" || !Array.isArray(inspection.selectableOccurrences)) {
    return [];
  }
  return inspection.selectableOccurrences.slice();
}
