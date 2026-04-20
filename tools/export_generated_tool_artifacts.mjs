import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  GENERATED_TOOL_PRESETS,
  formatGeneratedToolJson,
} from "../demo/src/lib/generated-tool-presets.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const artifactsDir = path.join(repoRoot, "artifacts", "generated-tools");
const screenshotsDir = path.join(artifactsDir, "screenshots");
const specsDir = path.join(artifactsDir, "specs");
const defaultBaseUrl = process.env.OCCT_JS_ARTIFACT_BASE_URL ?? "http://127.0.0.1:4176";
const screenshotViewport = { width: 1117, height: 768 };

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

function screenshotPathForPreset(presetId) {
  return path.join(screenshotsDir, `${presetId}.png`);
}

async function capturePreset(page, baseUrl, preset) {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.click("[data-testid='open-generated-tool-panel-empty']");
  await page.click(`[data-testid='generated-tool-preset-${preset.id}']`);
  await page.click("[data-testid='generated-tool-build']");
  await page.waitForSelector("[data-testid='toolbar']", { state: "visible", timeout: 30_000 });
  await page.waitForSelector("[data-testid='generated-tool-legend']", { state: "visible", timeout: 30_000 });
  await page.waitForTimeout(1200);

  await page.screenshot({
    path: screenshotPathForPreset(preset.id),
    type: "png",
  });

  if (preset.id === "flat-endmill") {
    const cornerLegend = page.getByRole("button", { name: /^Corner$/i });
    await cornerLegend.click();
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(screenshotsDir, "flat-endmill-legend-active.png"),
      type: "png",
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
  });
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
    presets: presets.map((preset) => ({
      presetId: preset.id,
      fileName: preset.fileName,
      screenshot: `screenshots/${preset.id}.png`,
      spec: `specs/${preset.id}.json`,
      statsText: preset.statsText,
      legendText: preset.legendText,
      sceneSummary: preset.sceneSummary,
    })),
  };

  await writeFile(
    path.join(artifactsDir, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );
}

async function main() {
  await ensureArtifactDirectories();

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
