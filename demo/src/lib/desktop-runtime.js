import { isTauri } from "@tauri-apps/api/core";

export function detectDesktopPlatform({
  isTauri: tauri = isTauri(),
  userAgent = globalThis.navigator?.userAgent ?? "",
} = {}) {
  if (!tauri) return "web";
  if (/Windows/i.test(userAgent)) return "windows";
  if (/Macintosh|Mac OS X/i.test(userAgent)) return "macos";
  return "desktop";
}

export function shouldUseWindowsCustomChrome(options) {
  return detectDesktopPlatform(options) === "windows";
}
