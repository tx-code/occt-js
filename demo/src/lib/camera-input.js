import { detectDesktopPlatform } from "./desktop-runtime.js";

export function getCameraAttachOptions({
  desktopPlatform = detectDesktopPlatform(),
} = {}) {
  return {
    noPreventDefault: desktopPlatform === "web",
  };
}
