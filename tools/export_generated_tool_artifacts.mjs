import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdir, readdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  GENERATED_TOOL_PRESET_GROUPS,
  GENERATED_TOOL_PRESETS,
  formatGeneratedToolJson,
  getGeneratedToolPresetGroup,
} from "../demo/src/lib/generated-tool-presets.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const artifactsDir = path.join(repoRoot, "artifacts", "generated-tools");
const screenshotsDir = path.join(artifactsDir, "screenshots");
const specsDir = path.join(artifactsDir, "specs");
const defaultBaseUrl = process.env.OCCT_JS_ARTIFACT_BASE_URL ?? "http://127.0.0.1:4176";
const screenshotViewport = { width: 1117, height: 768 };
const screenshotVariants = [
  {
    id: "hero",
    fileName: (presetId) => `${presetId}.png`,
    label: "Perspective iso",
    prepare: async (page) => {
      await page.click("[data-testid='proj-persp']");
      await page.click("[data-testid='fit-all']");
      await page.click("[data-testid='view-iso']");
      await page.waitForTimeout(900);
    },
  },
  {
    id: "front",
    fileName: (presetId) => `${presetId}-front.png`,
    label: "Perspective front",
    prepare: async (page) => {
      await page.click("[data-testid='proj-persp']");
      await page.click("[data-testid='fit-all']");
      await page.click("[data-testid='view-front']");
      await page.waitForTimeout(900);
    },
  },
  {
    id: "right-ortho",
    fileName: (presetId) => `${presetId}-right-ortho.png`,
    label: "Orthographic right",
    prepare: async (page) => {
      await page.click("[data-testid='proj-ortho']");
      await page.click("[data-testid='fit-all']");
      await page.click("[data-testid='view-right']");
      await page.waitForTimeout(900);
    },
  },
  {
    id: "top-ortho",
    fileName: (presetId) => `${presetId}-top-ortho.png`,
    label: "Orthographic top",
    prepare: async (page) => {
      await page.click("[data-testid='proj-ortho']");
      await page.click("[data-testid='fit-all']");
      await page.click("[data-testid='view-top']");
      await page.waitForTimeout(900);
    },
  },
];

function isViewerHtml(html) {
  return typeof html === "string" && html.includes("<title>occt-js Viewer</title>");
}

async function probeBaseUrl(baseUrl) {
  try {
    const response = await fetch(baseUrl);
    if (!response.ok) {
      return false;
    }

    return isViewerHtml(await response.text());
  } catch {
    return false;
  }
}

async function waitForBaseUrl(baseUrl, timeoutMs, processHandle) {
  const startedAt = Date.now();
  while ((Date.now() - startedAt) < timeoutMs) {
    if (await probeBaseUrl(baseUrl)) {
      return;
    }

    if (processHandle && processHandle.exitCode !== null) {
      throw new Error("Demo dev server exited before becoming ready.");
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Timed out waiting for ${baseUrl}.`);
}

function launchDemoServer(baseUrl) {
  const parsed = new URL(baseUrl);
  const port = parsed.port || (parsed.protocol === "https:" ? "443" : "80");
  const host = parsed.hostname;
  const child = process.platform === "win32"
    ? spawn(
        `npm --prefix demo run dev -- --host ${host} --port ${port} --strictPort`,
        {
          cwd: repoRoot,
          stdio: ["ignore", "pipe", "pipe"],
          shell: true,
        },
      )
    : spawn(
        "npm",
        ["--prefix", "demo", "run", "dev", "--", "--host", host, "--port", port, "--strictPort"],
        {
          cwd: repoRoot,
          stdio: ["ignore", "pipe", "pipe"],
        },
      );

  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => {
    stdout += chunk.toString();
  });
  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  return {
    child,
    readLogs() {
      return { stdout, stderr };
    },
  };
}

async function ensureArtifactDirectories() {
  await mkdir(screenshotsDir, { recursive: true });
  await mkdir(specsDir, { recursive: true });
}

function expectedScreenshotNames() {
  const names = new Set();
  for (const preset of GENERATED_TOOL_PRESETS) {
    for (const variant of screenshotVariants) {
      names.add(variant.fileName(preset.id));
    }
    names.add(`${preset.id}-semantic-active.png`);
  }
  return names;
}

function expectedSpecNames() {
  return new Set(GENERATED_TOOL_PRESETS.map((preset) => `${preset.id}.json`));
}

async function pruneDirectoryFiles(directoryPath, allowedNames) {
  const entries = await readdir(directoryPath, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }
    if (allowedNames.has(entry.name)) {
      continue;
    }
    await unlink(path.join(directoryPath, entry.name));
  }
}

async function pruneGeneratedArtifacts() {
  await pruneDirectoryFiles(screenshotsDir, expectedScreenshotNames());
  await pruneDirectoryFiles(specsDir, expectedSpecNames());
}

async function terminateSpawnedServer(server) {
  if (!server?.child?.pid) {
    return;
  }

  if (process.platform === "win32") {
    const killer = spawn("taskkill", ["/pid", String(server.child.pid), "/t", "/f"], {
      cwd: repoRoot,
      stdio: ["ignore", "ignore", "ignore"],
    });
    await once(killer, "exit");
  } else {
    server.child.kill("SIGTERM");
    await once(server.child, "exit");
  }

  server.child.stdout?.destroy();
  server.child.stderr?.destroy();
}

function screenshotPathForVariant(presetId, fileName) {
  return path.join(screenshotsDir, fileName(presetId));
}

async function captureScreenshotVariant(page, presetId, variant) {
  await variant.prepare(page);
  const screenshotPath = screenshotPathForVariant(presetId, variant.fileName);
  await page.screenshot({
    path: screenshotPath,
    type: "png",
  });

  return {
    id: variant.id,
    label: variant.label,
    path: `screenshots/${path.basename(screenshotPath)}`,
  };
}

async function capturePreset(page, baseUrl, preset) {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.click("[data-testid='open-generated-tool-panel-empty']");
  await page.click(`[data-testid='generated-tool-preset-${preset.id}']`);
  await page.click("[data-testid='generated-tool-build']");
  await page.waitForSelector("[data-testid='toolbar']", { state: "visible", timeout: 30_000 });
  await page.waitForSelector("[data-testid='generated-tool-legend']", { state: "visible", timeout: 30_000 });
  await page.waitForTimeout(1200);
  const screenshots = [];
  for (const variant of screenshotVariants) {
    screenshots.push(await captureScreenshotVariant(page, preset.id, variant));
  }

  const firstLegendEntry = page.locator("[data-testid='generated-tool-legend-entry-0']");
  if (await firstLegendEntry.count()) {
    await firstLegendEntry.first().click();
    await page.waitForTimeout(600);
    const detailScreenshotPath = path.join(screenshotsDir, `${preset.id}-semantic-active.png`);
    await page.screenshot({
      path: detailScreenshotPath,
      type: "png",
    });
    screenshots.push({
      id: "semantic-active",
      label: "Semantic face highlight",
      path: `screenshots/${path.basename(detailScreenshotPath)}`,
    });
  }

  return page.evaluate(() => {
    const textOf = (selector) => document.querySelector(selector)?.textContent?.replace(/\s+/g, " ").trim() ?? null;
    const scene = window.BABYLON?.EngineStore?.LastCreatedScene;
    const visibleMeshes = (scene?.meshes ?? [])
      .filter((candidate) =>
        candidate?.isVisible
        && !candidate?.metadata?.occtLinePassManaged
        && typeof candidate.getTotalVertices === "function"
        && candidate.getTotalVertices() > 0)
      .map((mesh) => ({
        name: mesh.name ?? null,
        vertexCount: mesh.getTotalVertices(),
        indexCount: mesh.getTotalIndices(),
        materialName: mesh.material?.name ?? null,
        usesVertexColors: mesh.useVertexColors === true,
      }));

    return {
      fileName: textOf("[data-testid='file-name']"),
      statsText: textOf("[data-testid='stats-panel']"),
      legendText: textOf("[data-testid='generated-tool-legend']"),
      sceneSummary: {
        visibleMeshCount: visibleMeshes.length,
        meshes: visibleMeshes,
      },
    };
  }).then((summary) => ({
    ...summary,
    screenshots,
  }));
}

async function writePresetSpecs() {
  for (const preset of GENERATED_TOOL_PRESETS) {
    const specPath = path.join(specsDir, `${preset.id}.json`);
    await writeFile(specPath, `${formatGeneratedToolJson(preset.spec)}\n`, "utf8");
  }
}

async function writeManifest(baseUrl, presets) {
  const manifest = {
    generatedAt: new Date().toISOString(),
    baseUrl,
    groups: GENERATED_TOOL_PRESET_GROUPS,
    presets: presets.map((preset) => {
      const presetDefinition = GENERATED_TOOL_PRESETS.find((entry) => entry.id === preset.id);
      const presetGroup = getGeneratedToolPresetGroup(presetDefinition?.groupId);
      return {
        groupId: presetDefinition?.groupId ?? presetGroup.id,
        groupLabel: presetGroup.label,
        groupDescription: presetGroup.description,
        label: presetDefinition?.label ?? preset.id,
        description: presetDefinition?.description ?? null,
        parameters: presetDefinition?.parameters ?? [],
        presetId: preset.id,
        fileName: preset.fileName,
        screenshot: preset.screenshots.find((entry) => entry.id === "hero")?.path ?? `screenshots/${preset.id}.png`,
        screenshots: preset.screenshots,
        spec: `specs/${preset.id}.json`,
        statsText: preset.statsText,
        legendText: preset.legendText,
        sceneSummary: preset.sceneSummary,
      };
    }),
  };

  await writeFile(
    path.join(artifactsDir, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );
}

async function main() {
  await ensureArtifactDirectories();
  await pruneGeneratedArtifacts();

  let launchedServer = null;
  let baseUrl = defaultBaseUrl;
  if (!(await probeBaseUrl(baseUrl))) {
    launchedServer = launchDemoServer(baseUrl);
    try {
      await waitForBaseUrl(baseUrl, 30_000, launchedServer.child);
    } catch (error) {
      const logs = launchedServer.readLogs();
      throw new Error(`${error.message}\nSTDOUT:\n${logs.stdout}\nSTDERR:\n${logs.stderr}`);
    }
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: screenshotViewport, deviceScaleFactor: 1 });

  try {
    const presetResults = [];
    for (const preset of GENERATED_TOOL_PRESETS) {
      const summary = await capturePreset(page, baseUrl, preset);
      presetResults.push({
        id: preset.id,
        ...summary,
      });
    }

    await writePresetSpecs();
    await writeManifest(baseUrl, presetResults);
    process.stdout.write(`${JSON.stringify({ baseUrl, presets: presetResults }, null, 2)}\n`);
  } finally {
    await page.close();
    await browser.close();
    if (launchedServer) {
      await terminateSpawnedServer(launchedServer);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
