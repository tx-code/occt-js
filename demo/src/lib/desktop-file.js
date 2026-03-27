import { open, message } from "@tauri-apps/plugin-dialog";
import { readFile } from "@tauri-apps/plugin-fs";
import { detectDesktopPlatform } from "./desktop-runtime.js";

const MODEL_EXTENSIONS = ["step", "stp", "iges", "igs", "brep", "brp"];

export function canUseNativeOpenDialog({
  desktopPlatform = detectDesktopPlatform(),
} = {}) {
  return desktopPlatform === "windows";
}

export function getModelFileDialogOptions() {
  return {
    multiple: false,
    directory: false,
    filters: [
      {
        name: "CAD Models",
        extensions: MODEL_EXTENSIONS,
      },
    ],
  };
}

export function extractFileNameFromPath(path) {
  if (!path) return "";
  return path.split(/[\\/]/).pop() ?? "";
}

export function isModelFileName(fileName) {
  const ext = fileName.toLowerCase().split(".").pop();
  return MODEL_EXTENSIONS.includes(ext);
}

export async function openNativeModelFile({
  desktopPlatform = detectDesktopPlatform(),
  openDialog = open,
  readBinaryFile = readFile,
} = {}) {
  if (!canUseNativeOpenDialog({ desktopPlatform })) return null;

  const selectedPath = await openDialog(getModelFileDialogOptions());
  if (!selectedPath || Array.isArray(selectedPath)) return null;

  const fileName = extractFileNameFromPath(selectedPath);
  if (!isModelFileName(fileName)) {
    throw new Error(`Unsupported format: ${fileName}`);
  }

  const bytes = await readBinaryFile(selectedPath);
  return new File([bytes], fileName);
}

export async function showDesktopAbout({
  desktopPlatform = detectDesktopPlatform(),
  showMessage = message,
} = {}) {
  if (!canUseNativeOpenDialog({ desktopPlatform })) {
    alert("occt-js Viewer\nWindows Desktop MVP");
    return;
  }

  await showMessage("Windows Desktop MVP", {
    title: "occt-js Viewer",
    kind: "info",
  });
}
