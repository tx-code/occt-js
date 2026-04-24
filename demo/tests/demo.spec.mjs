import { test, expect, devices } from "@playwright/test";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const fixtures = resolve(__dirname, "..", "..", "test");
const iphone12 = devices["iPhone 12"];
const viewcubeGeometryFsUrl = toViteFsUrl(resolve(__dirname, "..", "..", "packages", "occt-babylon-widgets", "src", "viewcube-geometry.js"));
const viewcubeHitTestFsUrl = toViteFsUrl(resolve(__dirname, "..", "..", "packages", "occt-babylon-widgets", "src", "viewcube-hit-test.js"));

function toViteFsUrl(absolutePath) {
  return `/@fs/${absolutePath.replace(/\\/g, "/")}`;
}

function boxesOverlap(a, b) {
  if (!a || !b) return false;
  return !(
    a.x + a.width <= b.x ||
    b.x + b.width <= a.x ||
    a.y + a.height <= b.y ||
    b.y + b.height <= a.y
  );
}

async function loadFixture(page, fileName = "simple_part.step") {
  await page.locator("[data-testid='file-input']").setInputFiles(resolve(fixtures, fileName));
  await expect(page.locator("[data-testid='toolbar']")).toBeVisible({ timeout: 30_000 });
}

function trackViewerErrors(page) {
  const errors = [];
  page.on("pageerror", (error) => {
    errors.push(`pageerror:${error.message}`);
  });
  page.on("console", (message) => {
    const text = message.text();
    if (text.includes("GL_INVALID_ENUM")) {
      errors.push(`console:${text}`);
    }
  });
  return errors;
}

async function getLinePassLayerStats(page, layer) {
  return page.evaluate((targetLayer) => {
    const scene = window.BABYLON?.EngineStore?.LastCreatedScene;
    if (!scene) return null;
    const mesh = scene.meshes.find((candidate) => candidate.metadata?.occtLinePassLayer === targetLayer);
    return mesh?.metadata?.occtLinePassStats ?? null;
  }, layer);
}

async function getWorkspaceSnapshot(page) {
  return page.evaluate(async () => {
    const { useViewerStore } = await import("/src/store/viewerStore.js");
    const workspaceActors = useViewerStore.getState().workspaceActors ?? {};
    return {
      fileName: useViewerStore.getState().fileName ?? "",
      actorIds: Object.keys(workspaceActors),
      actors: Object.fromEntries(Object.entries(workspaceActors).map(([actorId, actor]) => [
        actorId,
        {
          actorRole: actor?.actorRole ?? null,
          exactModelId: actor?.exactSession?.exactModelId ?? null,
          sourceFormat: actor?.exactSession?.sourceFormat ?? null,
          label: actor?.label ?? "",
          pose: actor?.actorPose ?? null,
        },
      ])),
    };
  });
}

async function getWorkspaceDisplaySnapshot(page) {
  return page.evaluate(async () => {
    const { useViewerStore } = await import("/src/store/viewerStore.js");
    const state = useViewerStore.getState();
    const workpieceRoot = state.model?.rootNodes?.find((node) => node.id === "workspace:workpiece") ?? null;
    const toolRoot = state.model?.rootNodes?.find((node) => node.id === "workspace:tool") ?? null;
    return {
      orientationMode: state.orientationMode ?? null,
      workpieceChildTransform: workpieceRoot?.children?.[0]?.transform ?? null,
      toolRootTransform: toolRoot?.transform ?? null,
    };
  });
}

async function getCameraPoseSnapshot(page) {
  return page.evaluate(() => {
    const scene = window.BABYLON?.EngineStore?.LastCreatedScene;
    const camera = scene?.activeCamera;
    const position = camera?.position?.asArray?.() ?? null;
    const target = camera?.target?.asArray?.() ?? null;
    const up = camera?.upVector?.asArray?.() ?? null;
    if (!position || !target || !up) {
      return null;
    }
    return {
      position,
      target,
      up,
      delta: position.map((value, index) => value - target[index]),
    };
  });
}

async function getSelectionSnapshot(page) {
  return page.evaluate(async () => {
    const { useViewerStore } = await import("/src/store/viewerStore.js");
    const selectedDetail = useViewerStore.getState().selectedDetail;
    return {
      mode: selectedDetail?.mode ?? null,
      items: (selectedDetail?.items ?? []).map((item) => ({
        mode: item?.mode ?? null,
        actorId: item?.actorId ?? null,
        geometryId: item?.geometryId ?? null,
        actorGeometryId: item?.actorGeometryId ?? null,
        meshUniqueId: item?.meshUniqueId ?? null,
        exactModelId: item?.exactRef?.exactModelId ?? null,
        exactGeometryId: item?.exactRef?.geometryId ?? null,
        exactNodeId: item?.exactRef?.nodeId ?? null,
      })),
    };
  });
}

async function getMeasurementSnapshot(page) {
  return page.evaluate(async () => {
    const { useViewerStore } = await import("/src/store/viewerStore.js");
    const state = useViewerStore.getState();
    return {
      currentMeasurement: state.currentMeasurement
        ? {
          actionId: state.currentMeasurement.actionId ?? null,
          status: state.currentMeasurement.status ?? null,
          summary: state.currentMeasurement.summary ?? null,
        }
        : null,
    };
  });
}

async function getProjectedVisibleActorPoint(page, actorId) {
  const canvas = page.locator("[data-testid='render-canvas']");
  const box = await canvas.boundingBox();
  const uv = await page.evaluate((targetActorId) => {
    const scene = window.BABYLON?.EngineStore?.LastCreatedScene;
    const BABYLON = window.BABYLON;
    if (!scene || !BABYLON || !scene.activeCamera) {
      return null;
    }

    const engine = scene.getEngine();
    const camera = scene.activeCamera;
    const viewport = camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight());
    const meshes = scene.meshes.filter((candidate) => (
      candidate?.isVisible &&
      !candidate?.metadata?.occtLinePassManaged &&
      typeof candidate.getTotalVertices === "function" &&
      candidate.getTotalVertices() > 0
    ));
    const matchesActor = (mesh) => {
      const metadata = mesh?.metadata?.occt
        || mesh?.sourceMesh?.metadata?.occt
        || null;
      const geometryId = typeof metadata?.geometryId === "string" ? metadata.geometryId : "";
      const nodeId = typeof metadata?.nodeId === "string" ? metadata.nodeId : "";
      return geometryId.startsWith(`actor:${targetActorId}:`) || nodeId.startsWith(`actor:${targetActorId}:`);
    };

    for (const mesh of meshes) {
      if (!matchesActor(mesh)) {
        continue;
      }

      const candidates = [
        mesh.getBoundingInfo().boundingSphere.centerWorld,
        ...mesh.getBoundingInfo().boundingBox.vectorsWorld,
      ];

      for (const point of candidates) {
        const projected = BABYLON.Vector3.Project(
          point,
          BABYLON.Matrix.Identity(),
          scene.getTransformMatrix(),
          viewport,
        );
        const u = projected.x / engine.getRenderWidth();
        const v = projected.y / engine.getRenderHeight();
        if (u < 0.08 || u > 0.92 || v < 0.08 || v > 0.92) {
          continue;
        }

        const picked = scene.pick(projected.x, projected.y, (candidate) => {
          if (!candidate?.isVisible || candidate?.metadata?.occtLinePassManaged) {
            return false;
          }
          return typeof candidate.getTotalVertices === "function" && candidate.getTotalVertices() > 0;
        });
        if (!picked?.hit) {
          continue;
        }

        if (matchesActor(picked.pickedMesh)) {
          return { u, v };
        }
      }
    }

    return null;
  }, actorId);

  if (!box || !uv) {
    return null;
  }

  return {
    x: box.x + uv.u * box.width,
    y: box.y + uv.v * box.height,
  };
}

async function getViewcubeRegionPoint(page, regionName) {
  const viewcube = page.locator("[data-testid='viewcube']");
  const box = await viewcube.boundingBox();
  const point = await page.evaluate(async ({ regionName: targetRegion, geometryUrl, hitTestUrl }) => {
    const [{ projectCube }, { hitTest }] = await Promise.all([
      import(geometryUrl),
      import(hitTestUrl),
    ]);
    const scene = window.BABYLON?.EngineStore?.LastCreatedScene;
    const camera = scene?.activeCamera;
    const container = document.querySelector("[data-testid='viewcube']");
    const canvas = container?.querySelector("canvas");
    if (!camera?.getViewMatrix || !container || !canvas) {
      return null;
    }

    const rect = canvas.getBoundingClientRect();
    const pixelRatio = rect.width > 0 ? canvas.width / rect.width : 1;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const cubeHalf = 50 * pixelRatio;
    const projection = projectCube(camera.getViewMatrix().m, centerX, centerY, cubeHalf);

    for (let y = 0; y < canvas.height; y += 2) {
      for (let x = 0; x < canvas.width; x += 2) {
        const result = hitTest(x, y, projection, centerX, centerY, cubeHalf);
        if (result?.name === targetRegion) {
          return { x: x / pixelRatio, y: y / pixelRatio };
        }
      }
    }

    return null;
  }, {
    regionName,
    geometryUrl: viewcubeGeometryFsUrl,
    hitTestUrl: viewcubeHitTestFsUrl,
  });

  if (!box || !point) {
    return null;
  }

  return {
    x: box.x + point.x,
    y: box.y + point.y,
  };
}

async function getProjectedModelCornerPoint(page) {
  const canvas = page.locator("[data-testid='render-canvas']");
  const box = await canvas.boundingBox();
  const uv = await page.evaluate(() => {
    const scene = window.BABYLON?.EngineStore?.LastCreatedScene;
    const BABYLON = window.BABYLON;
    if (!scene || !BABYLON || !scene.activeCamera) return null;

    const engine = scene.getEngine();
    const camera = scene.activeCamera;
    const mesh = scene.meshes.find((candidate) =>
      candidate?.isVisible &&
      !candidate.metadata?.occtLinePassManaged &&
      typeof candidate.getTotalVertices === "function" &&
      candidate.getTotalVertices() > 0
    );
    if (!mesh) return null;

    const viewport = camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight());
    const corners = mesh.getBoundingInfo().boundingBox.vectorsWorld;
    let best = null;
    for (const corner of corners) {
      const projected = BABYLON.Vector3.Project(
        corner,
        BABYLON.Matrix.Identity(),
        scene.getTransformMatrix(),
        viewport
      );
      const u = projected.x / engine.getRenderWidth();
      const v = projected.y / engine.getRenderHeight();
      if (u < 0.05 || u > 0.95 || v < 0.05 || v > 0.95) {
        continue;
      }
      if (!best || projected.z < best.z) {
        best = { u, v, z: projected.z };
      }
    }
    return best ? { u: best.u, v: best.v } : null;
  });

  if (!box || !uv) {
    return null;
  }

  return {
    x: box.x + uv.u * box.width,
    y: box.y + uv.v * box.height,
  };
}

async function getProjectedVisibleModelPoint(page) {
  const canvas = page.locator("[data-testid='render-canvas']");
  const box = await canvas.boundingBox();
  const uv = await page.evaluate(() => {
    const scene = window.BABYLON?.EngineStore?.LastCreatedScene;
    if (!scene) return null;

    const engine = scene.getEngine();
    const candidates = [
      [0.5, 0.5],
      [0.45, 0.5],
      [0.55, 0.5],
      [0.5, 0.45],
      [0.5, 0.55],
      [0.42, 0.42],
      [0.58, 0.42],
      [0.42, 0.58],
      [0.58, 0.58],
      [0.35, 0.5],
      [0.65, 0.5],
    ];

    for (const [u, v] of candidates) {
      const picked = scene.pick(
        u * engine.getRenderWidth(),
        v * engine.getRenderHeight(),
        (mesh) =>
          mesh?.isVisible &&
          !mesh?.metadata?.occtLinePassManaged &&
          typeof mesh.getTotalVertices === "function" &&
          mesh.getTotalVertices() > 0,
      );
      if (picked?.hit) {
        return { u, v };
      }
    }

    return null;
  });

  if (!box || !uv) {
    return null;
  }

  return {
    x: box.x + uv.u * box.width,
    y: box.y + uv.v * box.height,
  };
}

async function getProjectedPreviewVertexPoint(page) {
  const canvas = page.locator("[data-testid='render-canvas']");
  const box = await canvas.boundingBox();
  const uv = await page.evaluate(() => {
    const scene = window.BABYLON?.EngineStore?.LastCreatedScene;
    const BABYLON = window.BABYLON;
    if (!scene || !BABYLON || !scene.activeCamera) return null;

    const engine = scene.getEngine();
    const camera = scene.activeCamera;
    const viewport = camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight());
    const preview = scene.meshes.find((candidate) =>
      candidate?.name === "__vertex_preview__" &&
      candidate?.isVisible &&
      !candidate?.isDisposed?.()
    );
    if (!preview) return null;

    const positions = preview.getVerticesData(BABYLON.VertexBuffer.PositionKind);
    if (!positions || positions.length < 3) return null;

    const stride = Math.max(1, Math.floor((positions.length / 3) / 4000));
    let best = null;
    const threshold = (5 / Math.max(engine.getRenderHeight(), 1)) * (camera.radius || 1) * 2 * 3.0;

    for (let i = 0; i < positions.length; i += stride * 3) {
      const world = new BABYLON.Vector3(positions[i], positions[i + 1], positions[i + 2]);
      const projected = BABYLON.Vector3.Project(
        world,
        BABYLON.Matrix.Identity(),
        scene.getTransformMatrix(),
        viewport
      );

      const u = projected.x / engine.getRenderWidth();
      const v = projected.y / engine.getRenderHeight();
      if (u < 0.12 || u > 0.88 || v < 0.12 || v > 0.88) {
        continue;
      }
      if (projected.z < 0 || projected.z > 1) {
        continue;
      }

      const picked = scene.pick(projected.x, projected.y, (mesh) =>
        mesh?.isVisible &&
        !mesh?.metadata?.occtLinePassManaged &&
        mesh?.name !== "__vertex_preview__"
      );
      if (!picked?.hit || !picked?.pickedPoint) {
        continue;
      }

      const worldDist = BABYLON.Vector3.Distance(world, picked.pickedPoint);
      if (!Number.isFinite(worldDist) || worldDist > threshold * 1.2) {
        continue;
      }

      const centerDist = (u - 0.5) * (u - 0.5) + (v - 0.5) * (v - 0.5);
      if (!best || centerDist < best.centerDist) {
        best = { u, v, centerDist };
      }
    }
    return best ? { u: best.u, v: best.v } : null;
  });

  if (!box || !uv) {
    return null;
  }

  return {
    x: box.x + uv.u * box.width,
    y: box.y + uv.v * box.height,
  };
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  const enterDemo = page.getByRole("button", { name: "Enter Demo" });
  if (await enterDemo.count()) {
    await enterDemo.first().click();
  }
});

test("viewer shell still renders after package extraction", async ({ page }) => {
  await expect(page.getByTestId("render-canvas")).toBeVisible();
  await expect(page.getByTestId("drop-zone")).toBeVisible();

  await loadFixture(page);
  const viewcube = page.getByTestId("viewcube");
  await expect(viewcube).toBeVisible();
  await viewcube.click();
  await expect(page.getByTestId("stats-panel")).toBeVisible();
});

test("shows drop zone on initial load", async ({ page }) => {
  await expect(page.locator("[data-testid='drop-zone']")).toBeVisible();
  await expect(page.locator("[data-testid='toolbar']")).toBeHidden();
});

test("vite browser import contract resolves default factory + wasm url with no fallback branches", async ({ page }) => {
  const contract = await page.evaluate(async () => {
    const { verifyOcctPackageImportContract } = await import("/src/lib/runtime-import-contract.js");
    return verifyOcctPackageImportContract();
  });

  expect(contract.ok).toBeTruthy();
  expect(contract.defaultType).toBe("function");
  expect(contract.wasmUrl).toContain("occt-js.wasm");
  expect(contract.hasReadStepFile).toBeTruthy();
  expect(contract.hasReadIgesFile).toBeTruthy();
  expect(contract.hasReadBrepFile).toBeTruthy();
});

test("generated tool MVP can build a preset directly in the viewer", async ({ page }) => {
  await page.click("[data-testid='open-generated-tool-panel-empty']");
  await expect(page.locator("[data-testid='generated-tool-panel']")).toBeVisible();
  await expect(page.locator("[data-testid='generated-tool-group-freecad-aligned']")).toContainText("FreeCAD-aligned");
  await expect(page.locator("[data-testid='generated-tool-group-common-derived']")).toContainText("Common / demo-only");

  await page.click("[data-testid='generated-tool-preset-bullnose']");
  await page.click("[data-testid='generated-tool-build']");

  await expect(page.locator("[data-testid='toolbar']")).toBeVisible({ timeout: 30_000 });
  await expect(page.locator("[data-testid='file-name']")).toContainText("Generated");
  await expect(page.locator("[data-testid='generated-tool-panel']")).toBeHidden();
  await expect(page.locator("[data-testid='measurement-panel']")).toHaveCount(0);
  await expect(page.locator("[data-testid='stats-panel']")).toBeVisible();
  await expect(page.locator("[data-testid='generated-tool-validation']")).toBeVisible();
  await expect(page.locator("[data-testid='stats-panel']")).toContainText("Closed");
  await expect(page.locator("[data-testid='stats-panel']")).toContainText("Watertight");
  await expect(page.locator("[data-testid='stats-panel']")).toContainText("Manifold");
  await expect(page.locator("[data-testid='generated-tool-legend']")).toBeVisible();
  await expect(page.locator("[data-testid='generated-tool-legend']")).toContainText("Cutting");
  await expect(page.locator("[data-testid='generated-tool-legend']")).toContainText("Closure");

  const cornerLegend = page.getByRole("button", { name: /^Corner$/i });
  await cornerLegend.click();
  await expect(cornerLegend).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("[data-testid='selection-panel']")).toBeVisible({ timeout: 5000 });

  const canvas = page.locator("[data-testid='render-canvas']");
  const box = await canvas.boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect(page.locator("[data-testid='selection-panel']")).toBeVisible({ timeout: 5000 });
  await expect(page.locator("[data-testid='generated-tool-legend'] button[aria-pressed='true']")).toHaveCount(1);

  const modelSummary = await page.evaluate(() => {
    const scene = window.BABYLON?.EngineStore?.LastCreatedScene;
    const visibleMesh = scene?.meshes?.find((candidate) =>
      candidate?.isVisible &&
      !candidate?.metadata?.occtLinePassManaged &&
      typeof candidate.getTotalVertices === "function" &&
      candidate.getTotalVertices() > 0
    );
    return {
      hasVisibleMesh: !!visibleMesh,
      name: visibleMesh?.name ?? null,
    };
  });

  expect(modelSummary.hasVisibleMesh).toBeTruthy();
});

test("generated tool MVP can build the composite thread-mill preset through the retained exact lane", async ({ page }) => {
  await page.click("[data-testid='open-generated-tool-panel-empty']");
  await expect(page.locator("[data-testid='generated-tool-panel']")).toBeVisible();

  await page.click("[data-testid='generated-tool-preset-thread-mill-m6x1']");
  await page.click("[data-testid='generated-tool-build']");

  await expect(page.locator("[data-testid='toolbar']")).toBeVisible({ timeout: 30_000 });
  await expect(page.locator("[data-testid='generated-tool-panel']")).toBeHidden();
  await expect(page.locator("[data-testid='file-name']")).toContainText("Thread");
  await expect(page.locator("[data-testid='stats-panel']")).toContainText("COMPOSITE");

  const workspaceSnapshot = await getWorkspaceSnapshot(page);
  expect(workspaceSnapshot.actors.tool.sourceFormat).toBe("generated-composite-shape");
});

test("generated tool panel keeps desktop columns and internal scroll", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 560 });
  await page.click("[data-testid='open-generated-tool-panel-empty']");
  await expect(page.locator("[data-testid='generated-tool-panel']")).toBeVisible();

  const layout = await page.evaluate(() => {
    const card = document.querySelector("[data-testid='generated-tool-panel'] > div");
    const asideScroll = document.querySelector("[data-testid='generated-tool-panel'] aside > div.mt-5");
    const sectionScroll = document.querySelector("[data-testid='generated-tool-panel'] section > div.flex-1");
    if (!card || !asideScroll || !sectionScroll) {
      return null;
    }

    const cardRect = card.getBoundingClientRect();
    const asideRect = asideScroll.getBoundingClientRect();
    const sectionRect = sectionScroll.getBoundingClientRect();

    return {
      gridColumns: getComputedStyle(card).gridTemplateColumns.trim().split(/\s+/).length,
      asideCanScroll: asideScroll.scrollHeight > asideScroll.clientHeight,
      asideInsideCard: asideRect.top >= cardRect.top - 1 && asideRect.bottom <= cardRect.bottom + 1,
      sectionInsideCard: sectionRect.top >= cardRect.top - 1 && sectionRect.bottom <= cardRect.bottom + 1,
    };
  });

  expect(layout).not.toBeNull();
  expect(layout.gridColumns).toBe(2);
  expect(layout.asideCanScroll).toBeTruthy();
  expect(layout.asideInsideCard).toBeTruthy();
  expect(layout.sectionInsideCard).toBeTruthy();
});

test("auto-orient mode is selected by default", async ({ page }) => {
  await expect(page.locator("[data-testid='orientation-mode-auto-empty']")).toHaveClass(/cyan/);
  await loadFixture(page);
  await expect(page.locator("[data-testid='orientation-mode-auto-toolbar']")).toHaveClass(/cyan/);
});

test("raw and auto-orient modes can be switched after import", async ({ page }) => {
  await loadFixture(page);

  const rawButton = page.locator("[data-testid='orientation-mode-raw-toolbar']");
  const autoButton = page.locator("[data-testid='orientation-mode-auto-toolbar']");
  const initialWorkspace = await getWorkspaceSnapshot(page);
  const initialExactSession = initialWorkspace?.actors?.workpiece ?? null;
  const initialDisplay = await getWorkspaceDisplaySnapshot(page);

  await expect(rawButton).toBeVisible();
  await expect(autoButton).toBeVisible();
  await expect(autoButton).toHaveClass(/cyan/);
  await expect(rawButton).not.toHaveClass(/cyan/);
  expect(initialExactSession?.exactModelId ?? 0).toBeGreaterThan(0);
  expect(initialExactSession?.sourceFormat).toBe("step");
  expect(initialDisplay.orientationMode).toBe("auto-orient");

  await rawButton.click();
  await expect(rawButton).toHaveClass(/cyan/);
  await expect(autoButton).not.toHaveClass(/cyan/);
  const rawDisplay = await getWorkspaceDisplaySnapshot(page);
  expect((await getWorkspaceSnapshot(page)).actors.workpiece).toEqual(initialExactSession);
  expect(rawDisplay.orientationMode).toBe("raw");
  expect(rawDisplay.workpieceChildTransform).not.toEqual(initialDisplay.workpieceChildTransform);

  await autoButton.click();
  await expect(autoButton).toHaveClass(/cyan/);
  await expect(rawButton).not.toHaveClass(/cyan/);
  const restoredDisplay = await getWorkspaceDisplaySnapshot(page);
  expect((await getWorkspaceSnapshot(page)).actors.workpiece).toEqual(initialExactSession);
  expect(restoredDisplay.orientationMode).toBe("auto-orient");
  expect(restoredDisplay.workpieceChildTransform).toEqual(initialDisplay.workpieceChildTransform);
});

test("imported workpiece and generated tool coexist as workspace actors and tool pose can move", async ({ page }) => {
  await loadFixture(page);
  const importedWorkspace = await getWorkspaceSnapshot(page);
  const importedSession = importedWorkspace?.actors?.workpiece ?? null;
  expect(importedSession?.exactModelId ?? 0).toBeGreaterThan(0);
  expect(importedSession?.sourceFormat).toBe("step");
  expect(importedWorkspace.actorIds.sort()).toEqual(["workpiece"]);

  await page.click("[data-testid='open-generated-tool-panel-toolbar']");
  await page.click("[data-testid='generated-tool-preset-bullnose']");
  await page.click("[data-testid='generated-tool-build']");
  await expect(page.locator("[data-testid='generated-tool-panel']")).toBeHidden({ timeout: 30_000 });

  const workspace = await getWorkspaceSnapshot(page);
  const generatedSession = workspace?.actors?.tool ?? null;
  expect(workspace.actorIds.sort()).toEqual(["tool", "workpiece"]);
  expect(workspace.actors.workpiece.exactModelId).toBe(importedSession?.exactModelId);
  expect(generatedSession?.exactModelId ?? 0).toBeGreaterThan(0);
  expect(generatedSession?.exactModelId).not.toBe(importedSession?.exactModelId);
  expect(generatedSession?.sourceFormat).toBe("generated-revolved-shape");

  await expect(page.locator("[data-testid='tool-pose-panel']")).toBeVisible();
  await page.click("[data-testid='tool-pose-nudge-x-plus']");

  const movedWorkspace = await getWorkspaceSnapshot(page);
  expect(movedWorkspace.actors.tool.exactModelId).toBe(generatedSession?.exactModelId);
  expect(movedWorkspace.actors.tool.pose.translation.x).toBeGreaterThan(0);
});

test("orientation toggles preserve the edited tool frame while switching workpiece display transforms", async ({ page }) => {
  await loadFixture(page);
  await page.click("[data-testid='open-generated-tool-panel-toolbar']");
  await page.click("[data-testid='generated-tool-preset-bullnose']");
  await page.click("[data-testid='generated-tool-build']");
  await expect(page.locator("[data-testid='generated-tool-panel']")).toBeHidden({ timeout: 30_000 });

  await page.click("[data-testid='tool-pose-nudge-x-plus']");
  await page.click("[data-testid='tool-pose-nudge-y-plus']");
  await page.click("[data-testid='tool-pose-nudge-z-minus']");

  const autoDisplay = await getWorkspaceDisplaySnapshot(page);
  expect(autoDisplay.orientationMode).toBe("auto-orient");
  expect(autoDisplay.toolRootTransform?.slice(12, 15)).toEqual([5, 5, -5]);

  await page.click("[data-testid='orientation-mode-raw-toolbar']");
  const rawDisplay = await getWorkspaceDisplaySnapshot(page);
  expect(rawDisplay.orientationMode).toBe("raw");
  expect(rawDisplay.workpieceChildTransform).not.toEqual(autoDisplay.workpieceChildTransform);
  expect(rawDisplay.toolRootTransform).toEqual(autoDisplay.toolRootTransform);

  await page.click("[data-testid='orientation-mode-auto-toolbar']");
  const restoredDisplay = await getWorkspaceDisplaySnapshot(page);
  expect(restoredDisplay.orientationMode).toBe("auto-orient");
  expect(restoredDisplay.workpieceChildTransform).toEqual(autoDisplay.workpieceChildTransform);
  expect(restoredDisplay.toolRootTransform).toEqual(autoDisplay.toolRootTransform);
});

test("cross-model selection state exposes actorId and exactRef for workpiece plus tool picks", async ({ page }) => {
  await loadFixture(page);
  await page.click("[data-testid='open-generated-tool-panel-toolbar']");
  await page.click("[data-testid='generated-tool-preset-bullnose']");
  await page.click("[data-testid='generated-tool-build']");
  await expect(page.locator("[data-testid='generated-tool-panel']")).toBeHidden({ timeout: 30_000 });

  for (let index = 0; index < 4; index += 1) {
    await page.click("[data-testid='tool-pose-nudge-x-plus']");
  }

  const workpiecePoint = await getProjectedVisibleActorPoint(page, "workpiece");
  expect(workpiecePoint).not.toBeNull();
  await page.mouse.click(workpiecePoint.x, workpiecePoint.y);
  await expect(page.locator("[data-testid='selection-panel']")).toBeVisible({ timeout: 5000 });

  let selection = await getSelectionSnapshot(page);
  expect(selection.items.some((item) => item.actorId === "workpiece")).toBeTruthy();
  expect(selection.items.some((item) => item.exactModelId > 0)).toBeTruthy();

  await page.locator("[data-testid='generated-tool-legend-entry-0']").click({ modifiers: ["Control"] });
  selection = await getSelectionSnapshot(page);

  const actorIds = new Set(selection.items.map((item) => item.actorId).filter(Boolean));
  expect(actorIds.has("workpiece")).toBeTruthy();
  expect(actorIds.has("tool")).toBeTruthy();
  expect(selection.items.every((item) => item.exactModelId > 0)).toBeTruthy();
  expect(selection.items.every((item) => item.exactGeometryId && !item.exactGeometryId.startsWith("actor:"))).toBeTruthy();
});

test("selection inspector can run and clear a cross-model exact distance measurement as one current result", async ({ page }) => {
  await loadFixture(page);
  await page.click("[data-testid='open-generated-tool-panel-toolbar']");
  await page.click("[data-testid='generated-tool-preset-bullnose']");
  await page.click("[data-testid='generated-tool-build']");
  await expect(page.locator("[data-testid='generated-tool-panel']")).toBeHidden({ timeout: 30_000 });

  for (let index = 0; index < 4; index += 1) {
    await page.click("[data-testid='tool-pose-nudge-x-plus']");
  }

  const workpiecePoint = await getProjectedVisibleActorPoint(page, "workpiece");
  expect(workpiecePoint).not.toBeNull();
  await page.mouse.click(workpiecePoint.x, workpiecePoint.y);
  await page.locator("[data-testid='generated-tool-legend-entry-0']").click({ modifiers: ["Control"] });

  await expect(page.locator("[data-testid='selection-panel']")).toBeVisible({ timeout: 5000 });
  await expect(page.locator("[data-testid='measurement-panel']")).toContainText("Supported exact actions and CAM sample checks");
  await expect(page.locator("[data-testid='measurement-panel']")).not.toContainText("demo-owned exact actions");
  await expect(page.locator("[data-testid='measurement-action-distance']")).toBeVisible();
  await expect(page.locator("[data-testid='measurement-action-distance']")).toContainText("Distance");

  await page.click("[data-testid='measurement-action-distance']");

  let measurement = await getMeasurementSnapshot(page);
  expect(measurement.currentMeasurement?.actionId).toBe("distance");
  expect(measurement.currentMeasurement?.status).toBe("success");
  await expect(page.locator("[data-testid='measurement-current-result']")).toBeVisible();
  await expect(page.locator("[data-testid='measurement-current-result']")).toContainText("Current Check");
  await expect(page.locator("[data-testid='measurement-current-summary']")).toContainText(measurement.currentMeasurement?.summary ?? "Distance");
  let overlayStats = await getLinePassLayerStats(page, "measurement-overlay-visible");
  expect(overlayStats).not.toBeNull();
  expect(overlayStats.visibleSegments).toBeGreaterThan(0);

  await page.mouse.click(workpiecePoint.x, workpiecePoint.y);
  await expect(page.locator("[data-testid='measurement-action-face-area']")).toBeVisible();
  await page.click("[data-testid='measurement-action-face-area']");
  measurement = await getMeasurementSnapshot(page);
  expect(measurement.currentMeasurement?.actionId).toBe("face-area");
  await expect(page.locator("[data-testid='measurement-overlay-status']")).toContainText(/panel-only/i);
  await expect(page.locator("[data-testid='measurement-current-summary']")).toContainText(measurement.currentMeasurement?.summary ?? "Face Area");
  overlayStats = await getLinePassLayerStats(page, "measurement-overlay-visible");
  expect(overlayStats).toBeNull();

  await page.click("[data-testid='measurement-clear-current']");
  measurement = await getMeasurementSnapshot(page);
  expect(measurement.currentMeasurement).toBeNull();
  await expect(page.locator("[data-testid='measurement-current-result']")).toHaveCount(0);
  await expect(page.locator("[data-testid='measurement-current-empty']")).toBeVisible();
  await expect(page.locator("[data-testid='measurement-current-empty']")).toContainText("Run one supported action to inspect the current result.");
  overlayStats = await getLinePassLayerStats(page, "measurement-overlay-visible");
  expect(overlayStats).toBeNull();
});

test("selection inspector surfaces CAM sample actions and runs clearance plus surface-to-center in a workpiece-tool scenario", async ({ page }) => {
  await loadFixture(page);
  await expect(page.locator("[data-testid='open-generated-tool-panel-toolbar']").first()).toContainText("Optional Tool");
  await page.click("[data-testid='open-generated-tool-panel-toolbar']");
  await page.click("[data-testid='generated-tool-preset-bullnose']");
  await page.click("[data-testid='generated-tool-build']");
  await expect(page.locator("[data-testid='generated-tool-panel']")).toBeHidden({ timeout: 30_000 });

  for (let index = 0; index < 4; index += 1) {
    await page.click("[data-testid='tool-pose-nudge-x-plus']");
  }

  const workpiecePoint = await getProjectedVisibleActorPoint(page, "workpiece");
  expect(workpiecePoint).not.toBeNull();
  await page.mouse.click(workpiecePoint.x, workpiecePoint.y);
  await page.getByRole("button", { name: /^Cutting$/i }).click({ modifiers: ["Control"] });

  await expect(page.locator("[data-testid='selection-panel']")).toBeVisible({ timeout: 5000 });
  const measurementPanel = page.locator("[data-testid='measurement-panel']");
  await expect(measurementPanel).toContainText("Supported exact actions and CAM sample checks");
  await expect(page.locator("[data-testid='measurement-action-clearance']")).toBeVisible();
  await expect(page.locator("[data-testid='measurement-action-clearance']")).toContainText("Clearance Check");
  await expect(page.locator("[data-testid='measurement-action-step-depth']")).toBeVisible();
  await expect(page.locator("[data-testid='measurement-action-step-depth']")).toContainText("Step Depth Check");
  await expect(page.locator("[data-testid='measurement-action-center-to-center']")).toBeVisible();
  await expect(page.locator("[data-testid='measurement-action-center-to-center']")).toContainText("Center Spacing");
  await expect(page.locator("[data-testid='measurement-action-surface-to-center']")).toBeVisible();
  await expect(measurementPanel).toContainText("Measurements");
  await expect(measurementPanel).not.toContainText("Sample Checks");
  await expect(measurementPanel).not.toContainText(/History/i);
  await expect(measurementPanel).not.toContainText(/Report/i);
  await expect(measurementPanel).not.toContainText(/Tolerance/i);
  await expect(page.locator("[data-testid='measurement-current-empty']")).toContainText("Run one exact action or CAM sample check to inspect the current check.");

  await page.click("[data-testid='measurement-action-clearance']");

  let measurement = await getMeasurementSnapshot(page);
  expect(measurement.currentMeasurement?.actionId).toBe("clearance");
  expect(measurement.currentMeasurement?.status).toBe("success");
  await expect(page.locator("[data-testid='measurement-current-result']")).toContainText("Current Check");
  await expect(page.locator("[data-testid='measurement-current-summary']")).toContainText("Clearance check");
  let overlayStats = await getLinePassLayerStats(page, "measurement-overlay-visible");
  expect(overlayStats).not.toBeNull();
  expect(overlayStats.visibleSegments).toBeGreaterThan(0);

  await page.click("[data-testid='measurement-action-surface-to-center']");

  measurement = await getMeasurementSnapshot(page);
  expect(measurement.currentMeasurement?.actionId).toBe("surface-to-center");
  expect(measurement.currentMeasurement?.status).toBe("success");
  await expect(page.locator("[data-testid='measurement-current-summary']")).toContainText("Surface-to-center offset");
  await expect(page.locator("[data-testid='measurement-overlay-status']")).toContainText(/overlay active/i);
  overlayStats = await getLinePassLayerStats(page, "measurement-overlay-visible");
  expect(overlayStats).not.toBeNull();
  expect(overlayStats.visibleSegments).toBeGreaterThan(0);

  await page.click("[data-testid='measurement-action-step-depth']");

  measurement = await getMeasurementSnapshot(page);
  expect(measurement.currentMeasurement?.actionId).toBe("step-depth");
  expect(measurement.currentMeasurement?.status).toBe("unsupported");
  await expect(page.locator("[data-testid='measurement-current-result']")).toHaveCount(1);
  await expect(page.locator("[data-testid='measurement-current-result']")).toContainText("Current Check");
  await expect(page.locator("[data-testid='measurement-current-summary']")).toContainText("Step Depth Check unsupported");
  await expect(page.locator("[data-testid='measurement-current-summary']")).toContainText(/parallel planar face pairs/i);
  await expect(page.locator("[data-testid='measurement-overlay-status']")).toContainText(/panel-only/i);
  overlayStats = await getLinePassLayerStats(page, "measurement-overlay-visible");
  expect(overlayStats).toBeNull();
});

test("selection inspector surfaces and runs a midpoint helper from the current workpiece-tool selection", async ({ page }) => {
  await loadFixture(page);
  await page.click("[data-testid='open-generated-tool-panel-toolbar']");
  await page.click("[data-testid='generated-tool-preset-bullnose']");
  await page.click("[data-testid='generated-tool-build']");
  await expect(page.locator("[data-testid='generated-tool-panel']")).toBeHidden({ timeout: 30_000 });

  for (let index = 0; index < 4; index += 1) {
    await page.click("[data-testid='tool-pose-nudge-x-plus']");
  }

  const workpiecePoint = await getProjectedVisibleActorPoint(page, "workpiece");
  expect(workpiecePoint).not.toBeNull();
  await page.mouse.click(workpiecePoint.x, workpiecePoint.y);
  await page.locator("[data-testid='generated-tool-legend-entry-0']").click({ modifiers: ["Control"] });

  await expect(page.locator("[data-testid='selection-panel']")).toBeVisible({ timeout: 5000 });
  await expect(page.locator("[data-testid='measurement-action-midpoint']")).toBeVisible();

  await page.click("[data-testid='measurement-action-midpoint']");

  const measurement = await getMeasurementSnapshot(page);
  expect(measurement.currentMeasurement?.actionId).toBe("midpoint");
  expect(measurement.currentMeasurement?.status).toBe("success");
  await expect(page.locator("[data-testid='measurement-overlay-status']")).toContainText(/overlay active/i);
  const overlayStats = await getLinePassLayerStats(page, "measurement-overlay-visible");
  expect(overlayStats).not.toBeNull();
  expect(overlayStats.visibleSegments).toBeGreaterThan(0);
});

test("measurement state clears after a tool pose change invalidates the current run", async ({ page }) => {
  await loadFixture(page);
  await page.click("[data-testid='open-generated-tool-panel-toolbar']");
  await page.click("[data-testid='generated-tool-preset-bullnose']");
  await page.click("[data-testid='generated-tool-build']");
  await expect(page.locator("[data-testid='generated-tool-panel']")).toBeHidden({ timeout: 30_000 });

  for (let index = 0; index < 4; index += 1) {
    await page.click("[data-testid='tool-pose-nudge-x-plus']");
  }

  const workpiecePoint = await getProjectedVisibleActorPoint(page, "workpiece");
  expect(workpiecePoint).not.toBeNull();
  await page.mouse.click(workpiecePoint.x, workpiecePoint.y);
  await page.locator("[data-testid='generated-tool-legend-entry-0']").click({ modifiers: ["Control"] });
  await expect(page.locator("[data-testid='measurement-action-distance']")).toBeVisible();

  await page.click("[data-testid='measurement-action-distance']");

  let measurement = await getMeasurementSnapshot(page);
  expect(measurement.currentMeasurement?.actionId).toBe("distance");
  let overlayStats = await getLinePassLayerStats(page, "measurement-overlay-visible");
  expect(overlayStats).not.toBeNull();
  expect(overlayStats.visibleSegments).toBeGreaterThan(0);

  await page.click("[data-testid='tool-pose-nudge-y-plus']");

  measurement = await getMeasurementSnapshot(page);
  expect(measurement.currentMeasurement).toBeNull();
  await expect(page.locator("[data-testid='measurement-current-result']")).toHaveCount(0);
  await expect(page.locator("[data-testid='measurement-panel']")).toHaveCount(0);
  overlayStats = await getLinePassLayerStats(page, "measurement-overlay-visible");
  expect(overlayStats).toBeNull();
});

test("CAM current-result state also clears after a tool pose change invalidates the current run", async ({ page }) => {
  await loadFixture(page);
  await page.click("[data-testid='open-generated-tool-panel-toolbar']");
  await page.click("[data-testid='generated-tool-preset-bullnose']");
  await page.click("[data-testid='generated-tool-build']");
  await expect(page.locator("[data-testid='generated-tool-panel']")).toBeHidden({ timeout: 30_000 });

  for (let index = 0; index < 4; index += 1) {
    await page.click("[data-testid='tool-pose-nudge-x-plus']");
  }

  const workpiecePoint = await getProjectedVisibleActorPoint(page, "workpiece");
  expect(workpiecePoint).not.toBeNull();
  await page.mouse.click(workpiecePoint.x, workpiecePoint.y);
  await page.getByRole("button", { name: /^Cutting$/i }).click({ modifiers: ["Control"] });
  await expect(page.locator("[data-testid='measurement-action-clearance']")).toBeVisible();

  await page.click("[data-testid='measurement-action-clearance']");

  let measurement = await getMeasurementSnapshot(page);
  expect(measurement.currentMeasurement?.actionId).toBe("clearance");
  let overlayStats = await getLinePassLayerStats(page, "measurement-overlay-visible");
  expect(overlayStats).not.toBeNull();
  expect(overlayStats.visibleSegments).toBeGreaterThan(0);

  await page.click("[data-testid='tool-pose-nudge-y-plus']");

  measurement = await getMeasurementSnapshot(page);
  expect(measurement.currentMeasurement).toBeNull();
  await expect(page.locator("[data-testid='measurement-current-result']")).toHaveCount(0);
  await expect(page.locator("[data-testid='measurement-panel']")).toHaveCount(0);
  overlayStats = await getLinePassLayerStats(page, "measurement-overlay-visible");
  expect(overlayStats).toBeNull();
});

test("raw and auto-orient keep CAD edge line-pass meshes alive", async ({ page }) => {
  await loadFixture(page, "ANC101.stp");

  const getCadEdgeStats = async () => page.evaluate(() => {
    const scene = window.BABYLON?.EngineStore?.LastCreatedScene;
    const meshes = scene.meshes.filter((mesh) => mesh.metadata?.occtLinePassLayer === "cad-edges");
    return {
      meshCount: meshes.length,
      visible: meshes.every((mesh) => mesh.isVisible),
    };
  });

  expect((await getCadEdgeStats()).meshCount).toBeGreaterThan(0);

  await page.click("[data-testid='orientation-mode-raw-toolbar']");
  expect((await getCadEdgeStats()).meshCount).toBeGreaterThan(0);

  await page.click("[data-testid='orientation-mode-auto-toolbar']");
  expect((await getCadEdgeStats()).meshCount).toBeGreaterThan(0);
});

test("mock toolpath layer renders both solid and dashed segments", async ({ page }) => {
  await loadFixture(page, "simple_part.step");
  await page.click("[data-testid='toggle-toolpath']");

  const toolpathStats = await page.evaluate(() => {
    const scene = window.BABYLON?.EngineStore?.LastCreatedScene;
    const mesh = scene.meshes.find((candidate) => candidate.metadata?.occtLinePassLayer === "toolpath");
    return mesh?.metadata?.occtLinePassStats ?? null;
  });

  expect(toolpathStats).not.toBeNull();
  expect(toolpathStats.visibleSegments).toBeGreaterThan(0);
  expect(toolpathStats.dashedSegments).toBeGreaterThan(0);
  expect(toolpathStats.solidSegments).toBeGreaterThan(0);
});

test("initial load does not attach CDN runtime scripts", async ({ page }) => {
  await expect(page.locator("script[src*='unpkg.com']")).toHaveCount(0);
  await expect(page.locator("script[src*='@tx-code/occt-js']")).toHaveCount(0);
});

test("toolbar and stats hidden initially", async ({ page }) => {
  await expect(page.locator("[data-testid='toolbar']")).toBeHidden();
  const statsPanel = page.locator("[data-testid='stats-panel']");
  await expect(statsPanel).not.toBeVisible();
});

test("drop zone keeps import flow focused", async ({ page }) => {
  await expect(page.locator("[data-testid='load-sample']")).toBeVisible();
  await expect(page.locator("[data-testid='load-sample']")).toContainText(/Open Sample Model/i);
  await expect(page.locator("[data-testid='orientation-mode-raw-empty']")).toBeVisible();
  await expect(page.locator("[data-testid='orientation-mode-auto-empty']")).toBeVisible();
  await expect(page.locator("[data-testid='open-generated-tool-panel-empty']")).toContainText(/Generate Optional Tool/i);
  await expect(page.locator("[data-testid='drop-zone']")).toContainText(/Most CAM samples start with a workpiece/i);
  await expect(page.locator("[data-testid='drop-zone']")).toContainText(/optional tool/i);
  await expect(page.locator("[data-testid='drop-zone']")).toContainText(/run one exact action or CAM sample check/i);
});

test("opens bundled sample from empty state", async ({ page }) => {
  await page.click("[data-testid='load-sample']");
  await expect(page.locator("[data-testid='stats-panel']")).toBeVisible({ timeout: 30_000 });
  await expect(page.locator("[data-testid='file-name']")).toContainText("analysis-io1-cm-214.stp");
});

test("imports STEP file via file input", async ({ page }) => {
  const fileInput = page.locator("[data-testid='file-input']");
  await fileInput.setInputFiles(resolve(fixtures, "simple_part.step"));
  await expect(page.locator("[data-testid='stats-panel']")).toBeVisible({ timeout: 30_000 });
  await expect(page.locator("[data-testid='file-name']")).toContainText("simple_part.step");
});

test("imports BREP file", async ({ page }) => {
  const fileInput = page.locator("[data-testid='file-input']");
  await fileInput.setInputFiles(resolve(fixtures, "as1_pe_203.brep"));
  await expect(page.locator("[data-testid='stats-panel']")).toBeVisible({ timeout: 30_000 });
  await expect(page.locator("[data-testid='stats-panel']")).toContainText("BREP");
});

test("imports IGES file", async ({ page }) => {
  const fileInput = page.locator("[data-testid='file-input']");
  await fileInput.setInputFiles(resolve(fixtures, "cube_10x10.igs"));
  await expect(page.locator("[data-testid='stats-panel']")).toBeVisible({ timeout: 30_000 });
  await expect(page.locator("[data-testid='stats-panel']")).toContainText("IGES");
});

test("imports assembly STEP with stats", async ({ page }) => {
  const fileInput = page.locator("[data-testid='file-input']");
  await fileInput.setInputFiles(resolve(fixtures, "assembly.step"));
  await expect(page.locator("[data-testid='stats-panel']")).toBeVisible({ timeout: 30_000 });
  await expect(page.locator("[data-testid='stats-panel']")).toContainText("28");
});

test("faces and edges toggles work", async ({ page }) => {
  await loadFixture(page);

  const facesBtn = page.locator("[data-testid='toggle-faces']");
  const edgesBtn = page.locator("[data-testid='toggle-edges']");

  // Faces starts active (has cyan border)
  await expect(facesBtn).toHaveClass(/cyan/);

  // Toggle off
  await facesBtn.click();
  await expect(facesBtn).not.toHaveClass(/cyan/);

  // Toggle back on
  await facesBtn.click();
  await expect(facesBtn).toHaveClass(/cyan/);

  // Toggle edges off
  await edgesBtn.click();
  await expect(edgesBtn).not.toHaveClass(/cyan/);
});

test("fit button works", async ({ page }) => {
  await loadFixture(page);
  await page.click("[data-testid='fit-all']");
  // Should not crash, stats still visible
  await expect(page.locator("[data-testid='stats-panel']")).toBeVisible();
});

// ---------------------------------------------------------------------------
// Face picking
// ---------------------------------------------------------------------------

test("clicking on model shows face selection panel", async ({ page }) => {
  const errors = trackViewerErrors(page);
  await loadFixture(page);
  await expect(page.locator("[data-testid='stats-panel']")).toBeVisible();

  const target = await getProjectedVisibleModelPoint(page);
  expect(target).not.toBeNull();
  await page.mouse.click(target.x, target.y);

  await expect(page.locator("[data-testid='selection-panel']")).toBeVisible({ timeout: 5000 });
  expect(errors).toEqual([]);
});

test("clicking on model does not emit WebGL invalid depth-function errors", async ({ page }) => {
  const errors = trackViewerErrors(page);
  await loadFixture(page);
  await expect(page.locator("[data-testid='stats-panel']")).toBeVisible();

  const target = await getProjectedVisibleModelPoint(page);
  expect(target).not.toBeNull();
  await page.mouse.click(target.x, target.y);
  await page.waitForTimeout(500);

  expect(errors).toEqual([]);
});

// ---------------------------------------------------------------------------
// Pick mode switching
// ---------------------------------------------------------------------------

test("pick mode buttons switch correctly", async ({ page }) => {
  await loadFixture(page);

  await expect(page.locator("[data-testid='pick-face']")).toHaveClass(/cyan/);

  await page.click("[data-testid='pick-edge']");
  await expect(page.locator("[data-testid='pick-edge']")).toHaveClass(/cyan/);
  await expect(page.locator("[data-testid='pick-face']")).not.toHaveClass(/cyan/);

  await page.click("[data-testid='pick-vertex']");
  await expect(page.locator("[data-testid='pick-vertex']")).toHaveClass(/cyan/);
  await expect(page.locator("[data-testid='pick-edge']")).not.toHaveClass(/cyan/);
});

// ---------------------------------------------------------------------------
// Camera view presets
// ---------------------------------------------------------------------------

test("view preset buttons drive camera poses using Z-up conventions", async ({ page }) => {
  await loadFixture(page);

  const topButton = page.locator("[data-testid='view-top']");
  await expect(topButton).toBeVisible();
  await topButton.click();
  await page.waitForTimeout(450);

  let pose = await getCameraPoseSnapshot(page);
  expect(pose).not.toBeNull();
  expect(pose.up).toEqual([0, 0, 1]);
  expect(Math.abs(pose.delta[0])).toBeLessThan(Math.abs(pose.delta[2]) * 0.05);
  expect(Math.abs(pose.delta[1])).toBeLessThan(Math.abs(pose.delta[2]) * 0.05);
  expect(pose.delta[2]).toBeGreaterThan(0);

  const frontButton = page.locator("[data-testid='view-front']");
  await expect(frontButton).toBeVisible();
  await frontButton.click();
  await page.waitForTimeout(450);

  pose = await getCameraPoseSnapshot(page);
  expect(pose).not.toBeNull();
  expect(pose.up).toEqual([0, 0, 1]);
  expect(Math.abs(pose.delta[0])).toBeLessThan(Math.abs(pose.delta[1]) * 0.05);
  expect(Math.abs(pose.delta[2])).toBeLessThan(Math.abs(pose.delta[1]) * 0.05);
  expect(pose.delta[1]).toBeLessThan(0);
});

test("viewcube drives the same Z-up top and front camera poses", async ({ page }) => {
  await loadFixture(page);
  await expect(page.locator("[data-testid='viewcube']")).toBeVisible();

  let point = await getViewcubeRegionPoint(page, "front");
  expect(point).not.toBeNull();
  await page.mouse.click(point.x, point.y);
  await page.waitForTimeout(450);

  let pose = await getCameraPoseSnapshot(page);
  expect(pose).not.toBeNull();
  expect(pose.up).toEqual([0, 0, 1]);
  expect(Math.abs(pose.delta[0])).toBeLessThan(Math.abs(pose.delta[1]) * 0.05);
  expect(Math.abs(pose.delta[2])).toBeLessThan(Math.abs(pose.delta[1]) * 0.05);
  expect(pose.delta[1]).toBeLessThan(0);

  await page.click("[data-testid='view-iso']");
  await page.waitForTimeout(450);

  point = await getViewcubeRegionPoint(page, "top");
  expect(point).not.toBeNull();
  await page.mouse.click(point.x, point.y);
  await page.waitForTimeout(450);

  pose = await getCameraPoseSnapshot(page);
  expect(pose).not.toBeNull();
  expect(pose.up).toEqual([0, 0, 1]);
  expect(Math.abs(pose.delta[0])).toBeLessThan(Math.abs(pose.delta[2]) * 0.05);
  expect(Math.abs(pose.delta[1])).toBeLessThan(Math.abs(pose.delta[2]) * 0.05);
  expect(pose.delta[2]).toBeGreaterThan(0);
});

// ---------------------------------------------------------------------------
// Ortho / Perspective toggle
// ---------------------------------------------------------------------------

test("ortho/perspective toggle works", async ({ page }) => {
  await loadFixture(page);

  // Default is perspective (active)
  await expect(page.locator("[data-testid='proj-persp']")).toHaveClass(/cyan/);
  await expect(page.locator("[data-testid='proj-ortho']")).not.toHaveClass(/cyan/);

  // Switch to ortho
  await page.click("[data-testid='proj-ortho']");
  await expect(page.locator("[data-testid='proj-ortho']")).toHaveClass(/cyan/);
  await expect(page.locator("[data-testid='proj-persp']")).not.toHaveClass(/cyan/);

  // Switch back to perspective
  await page.click("[data-testid='proj-persp']");
  await expect(page.locator("[data-testid='proj-persp']")).toHaveClass(/cyan/);
});

// ---------------------------------------------------------------------------
// Model tree drawer
// ---------------------------------------------------------------------------

test("model tree drawer opens and closes", async ({ page }) => {
  await loadFixture(page);

  // Tree should be closed initially
  const tree = page.locator("[data-testid='model-tree']");
  await expect(tree).toHaveClass(/-translate-x-full/);

  // Open tree
  await page.click("[data-testid='toggle-tree']");
  await expect(tree).not.toHaveClass(/-translate-x-full/);

  // Close tree
  await page.click("[data-testid='close-tree']");
  await expect(tree).toHaveClass(/-translate-x-full/);
});

test("assembly model tree shows hierarchy", async ({ page }) => {
  const fileInput = page.locator("[data-testid='file-input']");
  await fileInput.setInputFiles(resolve(fixtures, "assembly.step"));
  await expect(page.locator("[data-testid='stats-panel']")).toBeVisible({ timeout: 30_000 });

  await page.click("[data-testid='toggle-tree']");
  const tree = page.locator("[data-testid='model-tree']");
  await expect(tree).not.toHaveClass(/-translate-x-full/);

  // Tree should contain node names from the assembly
  await expect(tree).toContainText("as1");
});

// ---------------------------------------------------------------------------
// Hover changes cursor
// ---------------------------------------------------------------------------

test("hovering over model changes cursor", async ({ page }) => {
  await loadFixture(page);
  await expect(page.locator("[data-testid='stats-panel']")).toBeVisible();

  const canvas = page.locator("[data-testid='render-canvas']");
  const target = await getProjectedVisibleModelPoint(page);
  expect(target).not.toBeNull();

  await page.mouse.move(target.x, target.y);
  await page.waitForTimeout(300);

  const cursor = await canvas.evaluate(el => el.style.cursor);
  expect(cursor).toBe("pointer");
});

test("hover on an already selected face does not add duplicate face outlines", async ({ page }) => {
  await loadFixture(page);
  await expect(page.locator("[data-testid='stats-panel']")).toBeVisible();

  const target = await getProjectedVisibleModelPoint(page);
  expect(target).not.toBeNull();

  await page.mouse.click(target.x, target.y);
  await expect(page.locator("[data-testid='selection-panel']")).toBeVisible({ timeout: 5000 });

  await page.mouse.move(target.x, target.y);
  await page.waitForTimeout(300);

  const selectStats = await getLinePassLayerStats(page, "cad-highlight-select-visible");
  const hoverStats = await getLinePassLayerStats(page, "cad-highlight-hover-visible");

  expect(selectStats).not.toBeNull();
  expect(selectStats.visibleSegments).toBeGreaterThan(0);
  expect(hoverStats?.visibleSegments ?? 0).toBe(0);
});

test("hover highlight keeps xray layer alive", async ({ page }) => {
  await loadFixture(page);
  await expect(page.locator("[data-testid='stats-panel']")).toBeVisible();

  const target = await getProjectedVisibleModelPoint(page);
  expect(target).not.toBeNull();

  await page.mouse.move(target.x, target.y);
  await page.waitForTimeout(300);

  const xrayStats = await getLinePassLayerStats(page, "cad-highlight-hover-xray");

  expect(xrayStats).not.toBeNull();
  expect(xrayStats.visibleSegments).toBeGreaterThan(0);
});

test("edge pick mode creates selection highlight batches", async ({ page }) => {
  await loadFixture(page);
  await expect(page.locator("[data-testid='stats-panel']")).toBeVisible();

  await page.click("[data-testid='pick-edge']");
  await expect(page.locator("[data-testid='pick-edge']")).toHaveClass(/cyan/);

  const target = await getProjectedModelCornerPoint(page);
  expect(target).not.toBeNull();
  await page.mouse.click(target.x + 6, target.y + 6);
  await expect(page.locator("[data-testid='selection-panel']")).toBeVisible({ timeout: 5000 });

  const selectStats = await getLinePassLayerStats(page, "cad-highlight-select-visible");
  expect(selectStats).not.toBeNull();
  expect(selectStats.visibleSegments).toBeGreaterThan(0);
});

test("edge hover keeps xray highlight batches in edge mode", async ({ page }) => {
  await loadFixture(page);
  await expect(page.locator("[data-testid='stats-panel']")).toBeVisible();

  await page.click("[data-testid='pick-edge']");
  const target = await getProjectedModelCornerPoint(page);
  expect(target).not.toBeNull();
  await page.mouse.move(target.x + 8, target.y + 8);
  await page.waitForTimeout(350);

  const hoverVisible = await getLinePassLayerStats(page, "cad-highlight-hover-visible");
  const hoverXray = await getLinePassLayerStats(page, "cad-highlight-hover-xray");
  expect(hoverVisible).not.toBeNull();
  expect(hoverVisible.visibleSegments).toBeGreaterThan(0);
  expect(hoverXray).not.toBeNull();
  expect(hoverXray.visibleSegments).toBeGreaterThan(0);
});

test("vertex pick mode renders preview points and clears them when mode changes", async ({ page }) => {
  await loadFixture(page);
  await expect(page.locator("[data-testid='stats-panel']")).toBeVisible();

  await page.click("[data-testid='pick-vertex']");
  await expect(page.locator("[data-testid='pick-vertex']")).toHaveClass(/cyan/);

  const previewStats = await page.evaluate(() => {
    const scene = window.BABYLON?.EngineStore?.LastCreatedScene;
    const mesh = scene?.meshes?.find((candidate) => candidate?.name === "__vertex_preview__");
    return mesh
      ? {
        visible: mesh.isVisible,
        vertexCount: mesh.getTotalVertices?.() ?? 0,
      }
      : null;
  });
  expect(previewStats).not.toBeNull();
  expect(previewStats.visible).toBe(true);
  expect(previewStats.vertexCount).toBeGreaterThan(0);

  await page.click("[data-testid='pick-face']");
  await expect(page.locator("[data-testid='pick-face']")).toHaveClass(/cyan/);

  const previewAfterSwitch = await page.evaluate(() => {
    const scene = window.BABYLON?.EngineStore?.LastCreatedScene;
    return scene?.meshes?.some((candidate) => candidate?.name === "__vertex_preview__" && !candidate.isDisposed?.()) ?? false;
  });
  expect(previewAfterSwitch).toBe(false);
});

test("vertex pick mode selects a vertex and creates a visible marker", async ({ page }) => {
  await loadFixture(page);
  await expect(page.locator("[data-testid='stats-panel']")).toBeVisible();

  await page.click("[data-testid='pick-vertex']");
  await expect(page.locator("[data-testid='pick-vertex']")).toHaveClass(/cyan/);

  const target = await getProjectedPreviewVertexPoint(page);
  expect(target).not.toBeNull();
  await page.mouse.click(target.x, target.y);

  await expect(page.locator("[data-testid='selection-panel']")).toBeVisible({ timeout: 5000 });
  await expect(page.locator("[data-testid='selection-panel']")).toContainText(/Vertex/i);

  const markerCount = await page.evaluate(() =>
    document.querySelectorAll("[data-vertex-marker='select']").length
  );
  expect(markerCount).toBeGreaterThan(0);
});

// ---------------------------------------------------------------------------
// Drag preserves selection
// ---------------------------------------------------------------------------

test("drag on empty space preserves selection", async ({ page }) => {
  await loadFixture(page);
  await expect(page.locator("[data-testid='stats-panel']")).toBeVisible();

  const canvas = page.locator("[data-testid='render-canvas']");
  const box = await canvas.boundingBox();
  const target = await getProjectedVisibleModelPoint(page);
  expect(target).not.toBeNull();

  // Select a face
  await page.mouse.click(target.x, target.y);
  await expect(page.locator("[data-testid='selection-panel']")).toBeVisible({ timeout: 5000 });

  // Drag on empty space (corner area, away from model)
  const sx = box.x + 30, sy = box.y + box.height - 30;
  await page.mouse.move(sx, sy);
  await page.mouse.down();
  for (let i = 0; i < 10; i++) await page.mouse.move(sx + i * 10, sy - i * 6);
  await page.mouse.up();
  await page.waitForTimeout(300);

  // Selection should remain
  await expect(page.locator("[data-testid='selection-panel']")).toBeVisible();
});

test("short click on empty clears selection", async ({ page }) => {
  await loadFixture(page);
  await expect(page.locator("[data-testid='stats-panel']")).toBeVisible();

  const canvas = page.locator("[data-testid='render-canvas']");
  const box = await canvas.boundingBox();
  const target = await getProjectedVisibleModelPoint(page);
  expect(target).not.toBeNull();

  // Select a face
  await page.mouse.click(target.x, target.y);
  await expect(page.locator("[data-testid='selection-panel']")).toBeVisible({ timeout: 5000 });

  // Short click on empty (corner, away from model)
  await page.mouse.click(box.x + box.width - 10, box.y + box.height - 10);
  await page.waitForTimeout(500);
  await expect(page.locator("[data-testid='selection-panel']")).not.toBeVisible();
});

test.describe("mobile layout", () => {
  test.use({
    viewport: iphone12.viewport,
    userAgent: iphone12.userAgent,
    deviceScaleFactor: iphone12.deviceScaleFactor,
    isMobile: iphone12.isMobile,
    hasTouch: iphone12.hasTouch,
  });

  test("mobile empty state exposes bundled sample action", async ({ page }) => {
    await expect(page.locator("[data-testid='load-sample']")).toBeVisible();
    await expect(page.getByRole("button", { name: "Open Sample Model" })).toBeVisible();
  });

  test("mobile toolbar stays compact when menu is open", async ({ page }) => {
    await page.locator("[data-testid='file-input']").setInputFiles(resolve(fixtures, "simple_part.step"));
    await expect(page.locator("[data-testid='toolbar']")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("button", { name: "Optional Tool" })).toBeVisible();

    await page.click("[data-testid='menu-toggle']");

    const toolbarBox = await page.locator("[data-testid='toolbar']").boundingBox();
    expect(toolbarBox.height).toBeLessThanOrEqual(110);
  });

  test("mobile selection does not overlap utility panels", async ({ page }) => {
    await page.locator("[data-testid='file-input']").setInputFiles(resolve(fixtures, "simple_part.step"));
    await expect(page.locator("[data-testid='stats-panel']")).toBeVisible({ timeout: 30_000 });

    const target = await getProjectedVisibleActorPoint(page, "workpiece");
    expect(target).not.toBeNull();
    await page.touchscreen.tap(target.x, target.y);

    const selection = page.locator("[data-testid='selection-panel']");
    await expect(selection).toBeVisible({ timeout: 5000 });

    const statsBox = await page.locator("[data-testid='stats-panel']").boundingBox();
    const selectionBox = await selection.boundingBox();
    const viewcubeBox = await page.locator("[data-testid='viewcube']").boundingBox();

    expect(boxesOverlap(statsBox, selectionBox)).toBe(false);
    expect(boxesOverlap(viewcubeBox, selectionBox)).toBe(false);
  });
});

