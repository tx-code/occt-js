export function getAppShellLayout(useWindowsCustomChrome) {
  if (!useWindowsCustomChrome) {
    return {
      rootClassName: "relative h-screen w-screen",
      viewportClassName: "relative h-full",
    };
  }

  return {
    rootClassName: "relative h-screen w-screen overflow-hidden",
    viewportClassName: "h-full box-border pt-[42px]",
  };
}
