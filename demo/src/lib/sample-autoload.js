const DEFAULT_ENV = import.meta.env ?? {};

function resolveNavigatorObject(navigatorObject) {
  if (navigatorObject !== undefined) {
    return navigatorObject;
  }
  return typeof navigator !== "undefined" ? navigator : null;
}

export function shouldAutoLoadSample({
  env = DEFAULT_ENV,
  navigatorObject,
} = {}) {
  const optIn = String(env?.VITE_OCCT_DEMO_AUTOLOAD_SAMPLE ?? "").trim().toLowerCase() === "true";
  if (!optIn) {
    return false;
  }

  const resolvedNavigator = resolveNavigatorObject(navigatorObject);
  return resolvedNavigator?.webdriver !== true;
}
