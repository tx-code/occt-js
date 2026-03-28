import test from "node:test";
import assert from "node:assert/strict";
import { getDesktopChromeMenus } from "../src/lib/desktop-menu.js";

test("desktop chrome exposes File View Help menus in stable order", () => {
  const menus = getDesktopChromeMenus();

  assert.deepEqual(
    menus.map((menu) => menu.id),
    ["file", "view", "help"]
  );
  assert.deepEqual(
    menus.map((menu) => menu.label),
    ["File", "View", "Help"]
  );
});

test("desktop chrome File menu exposes desktop workflow actions", () => {
  const fileMenu = getDesktopChromeMenus().find((menu) => menu.id === "file");

  assert.deepEqual(
    fileMenu.items.map((item) => item.id),
    ["open-file", "open-sample", "close-model"]
  );
});

test("desktop chrome View menu exposes projection, fit, and theme actions", () => {
  const viewMenu = getDesktopChromeMenus().find((menu) => menu.id === "view");

  assert.deepEqual(
    viewMenu.items.map((item) => item.id),
    ["fit-all", "projection-perspective", "projection-orthographic", "toggle-theme"]
  );
});

test("desktop chrome Help menu exposes About", () => {
  const helpMenu = getDesktopChromeMenus().find((menu) => menu.id === "help");

  assert.deepEqual(
    helpMenu.items.map((item) => item.id),
    ["about"]
  );
});
