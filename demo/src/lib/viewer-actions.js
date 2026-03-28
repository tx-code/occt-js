export function createDesktopActionMap({
  openFile,
  closeModel,
  fitAll,
  setPerspective,
  setOrthographic,
} = {}) {
  return {
    "open-file": openFile,
    "close-model": closeModel,
    "fit-all": fitAll,
    "projection-perspective": setPerspective,
    "projection-orthographic": setOrthographic,
  };
}

export function isEditableTarget(target) {
  if (!target) return false;
  if (target.isContentEditable) return true;
  return ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}
