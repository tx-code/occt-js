import { detectDesktopPlatform } from "./desktop-runtime.js";

const BUNDLED_SAMPLE = "./samples/analysis-io1-cm-214.stp";
const REMOTE_SAMPLE = "https://raw.githubusercontent.com/tx-code/occt-js/master/demo/public/samples/analysis-io1-cm-214.stp";

export function getSampleModelCandidates({
  desktopPlatform = detectDesktopPlatform(),
} = {}) {
  if (desktopPlatform === "windows" || desktopPlatform === "macos" || desktopPlatform === "desktop") {
    return [BUNDLED_SAMPLE];
  }

  return [BUNDLED_SAMPLE, REMOTE_SAMPLE];
}
