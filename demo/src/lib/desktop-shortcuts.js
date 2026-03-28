function isCommandModifierPressed({ ctrlKey = false, metaKey = false } = {}) {
  return ctrlKey || metaKey;
}

export function getDesktopShortcutAction({
  key = "",
  ctrlKey = false,
  metaKey = false,
  altKey = false,
  shiftKey = false,
  isEditableTarget = false,
} = {}) {
  if (isEditableTarget || altKey) return null;

  const normalizedKey = key.toLowerCase();
  const hasCommandModifier = isCommandModifierPressed({ ctrlKey, metaKey });

  if (hasCommandModifier && !shiftKey) {
    if (normalizedKey === "o") return "open-file";
    if (normalizedKey === "w") return "close-model";
    return null;
  }

  if (ctrlKey || metaKey || shiftKey) return null;

  if (normalizedKey === "f") return "fit-all";
  if (normalizedKey === "p") return "projection-perspective";
  if (normalizedKey === "o") return "projection-orthographic";

  return null;
}
