import { detectDesktopPlatform } from "./desktop-runtime.js";

const BUNDLED_SAMPLE = "./samples/simple_part.step";
const REMOTE_SAMPLE = "https://raw.githubusercontent.com/tx-code/occt-js/master/test/simple_part.step";

export function getSampleModelCandidates({
  desktopPlatform = detectDesktopPlatform(),
} = {}) {
  if (desktopPlatform === "windows" || desktopPlatform === "macos" || desktopPlatform === "desktop") {
    return [BUNDLED_SAMPLE];
  }

  return [BUNDLED_SAMPLE, REMOTE_SAMPLE];
}
