export function getDesktopChromeMenus({
  hasModel = false,
  projectionMode = "perspective",
  theme = "dark",
} = {}) {
  return [
    {
      id: "file",
      label: "File",
      items: [
        { id: "open-file", label: "Open..." },
        { id: "open-sample", label: "Open Sample" },
        { id: "close-model", label: "Close Model", disabled: !hasModel },
      ],
    },
    {
      id: "view",
      label: "View",
      items: [
        { id: "fit-all", label: "Fit All", disabled: !hasModel },
        { id: "projection-perspective", label: "Perspective", checked: projectionMode === "perspective" },
        { id: "projection-orthographic", label: "Orthographic", checked: projectionMode === "orthographic" },
        { id: "toggle-theme", label: theme === "dark" ? "Switch To Light Theme" : "Switch To Dark Theme" },
      ],
    },
    {
      id: "help",
      label: "Help",
      items: [
        { id: "about", label: "About occt-js Viewer" },
      ],
    },
  ];
}
