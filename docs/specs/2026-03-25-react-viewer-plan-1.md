# React CAD Viewer — Plan 1: Scaffold + Core Rendering

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the vanilla HTML demo with a React + Vite app that loads and renders CAD models (STEP/IGES/BREP) with per-face coloring and edge lines.

**Architecture:** Vite scaffolds the React app in `demo/`. Babylon.js loaded from CDN via `<script>` tag (not npm — avoids 10MB+ bundle). Zustand store holds serializable UI state. Babylon.js objects live in refs inside hooks. OCCT Wasm loaded from unpkg CDN.

**Tech Stack:** React 18, Vite 6, Tailwind CSS 4, shadcn/ui, Zustand, Babylon.js (CDN), @tx-code/occt-js (unpkg CDN)

**Spec:** `docs/specs/2026-03-25-react-viewer-design.md`

**Dev server:** `cd demo && npm run dev` (Vite, port 5173)
**Test command:** `npx playwright test`

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `demo/package.json` | Create | React + Vite + Tailwind + Zustand deps |
| `demo/vite.config.js` | Create | Vite config with Babylon.js external |
| `demo/index.html` | Create | Vite entry with Babylon.js CDN `<script>` |
| `demo/postcss.config.js` | Create | PostCSS for Tailwind |
| `demo/tailwind.config.js` | Create | Tailwind config (dark mode, content paths) |
| `demo/components.json` | Create | shadcn/ui config |
| `demo/src/main.jsx` | Create | React root mount |
| `demo/src/globals.css` | Create | Tailwind directives + dark theme CSS vars |
| `demo/src/lib/utils.js` | Create | shadcn `cn()` helper |
| `demo/src/store/viewerStore.js` | Create | Zustand store |
| `demo/src/hooks/useOcct.js` | Create | Wasm load + import |
| `demo/src/hooks/useViewer.js` | Create | Babylon.js lifecycle |
| `demo/src/App.jsx` | Create | Main layout |
| `demo/src/components/ViewCanvas.jsx` | Create | Babylon.js canvas |
| `demo/src/components/DropZone.jsx` | Create | File upload overlay |
| `demo/src/components/Toolbar.jsx` | Create | Top toolbar (basic for Plan 1) |
| `demo/src/components/StatsPanel.jsx` | Create | Floating stats panel |
| `demo/src/components/LoadingOverlay.jsx` | Create | Loading spinner |
| `demo/index.html` (old) | Delete | Replaced by new React app |
| `demo/picking.js` | Delete | Migrated to Plan 2 hooks |
| `demo/server.mjs` | Delete | Replaced by Vite dev server |
| `playwright.config.mjs` | Modify | Update webServer to Vite |
| `demo/tests/demo.spec.mjs` | Rewrite | Updated selectors for React app |

---

## Task 1: Scaffold Vite + React project

**Files:**
- Create: `demo/package.json`, `demo/vite.config.js`, `demo/index.html`, `demo/src/main.jsx`, `demo/src/App.jsx`, `demo/src/globals.css`

- [ ] **Step 1: Back up old demo, then scaffold**

Move old demo files to temp location, create new Vite project:

```bash
# Back up old files
mkdir -p demo-old
mv demo/index.html demo/picking.js demo/server.mjs demo-old/ 2>/dev/null
mv demo/tests demo-old/ 2>/dev/null

# Create package.json
cat > demo/package.json << 'PKGJSON'
{
  "name": "occt-js-demo",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "zustand": "^5.0.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.0",
    "vite": "^6.0.0",
    "tailwindcss": "^4.0.0",
    "@tailwindcss/vite": "^4.0.0"
  }
}
PKGJSON
```

- [ ] **Step 2: Create vite.config.js**

```javascript
// demo/vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: "./",
  server: { port: 5173, fs: { allow: [".."] } }, // allow serving test/ from parent
  build: { outDir: "dist" },
});
```

- [ ] **Step 3: Create index.html with Babylon.js CDN**

```html
<!-- demo/index.html -->
<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>occt-js Viewer</title>
  <script src="https://cdn.babylonjs.com/babylon.js"></script>
</head>
<body class="bg-zinc-950 text-zinc-100 overflow-hidden h-screen">
  <div id="root"></div>
  <script type="module" src="/src/main.jsx"></script>
</body>
</html>
```

- [ ] **Step 4: Create main.jsx and minimal App.jsx**

```jsx
// demo/src/main.jsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./globals.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

```jsx
// demo/src/App.jsx
export default function App() {
  return <div className="h-screen w-screen">occt-js viewer</div>;
}
```

- [ ] **Step 5: Create globals.css**

```css
/* demo/src/globals.css */
@import "tailwindcss";
```

- [ ] **Step 6: Install deps and verify dev server starts**

```bash
cd demo && npm install && npm run dev &
sleep 3 && curl -s -o /dev/null -w "%{http_code}" http://localhost:5173
# Expected: 200
```

- [ ] **Step 7: Commit**

```bash
git add demo/package.json demo/vite.config.js demo/index.html demo/src/ demo/node_modules/.package-lock.json
git commit -m "feat: scaffold Vite + React + Tailwind project for demo"
```

---

## Task 2: Add shadcn/ui foundation

**Files:**
- Create: `demo/src/lib/utils.js`, `demo/components.json`
- Install: `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`

- [ ] **Step 1: Install shadcn deps**

```bash
cd demo && npm install class-variance-authority clsx tailwind-merge lucide-react
```

- [ ] **Step 2: Create cn() utility**

```javascript
// demo/src/lib/utils.js
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 3: Create shadcn/ui Button component manually**

```jsx
// demo/src/components/ui/button.jsx
import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-xs font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-zinc-800 text-zinc-300 hover:bg-zinc-700",
        active: "bg-zinc-700 text-cyan-400 border border-cyan-400/50",
        ghost: "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200",
      },
      size: {
        default: "h-7 px-2.5",
        sm: "h-6 px-2 text-[11px]",
        icon: "h-7 w-7",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

const Button = React.forwardRef(({ className, variant, size, ...props }, ref) => (
  <button className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
));
Button.displayName = "Button";

export { Button, buttonVariants };
```

- [ ] **Step 4: Commit**

```bash
git add demo/src/lib/ demo/src/components/ui/
git commit -m "feat: add shadcn/ui foundation (Button, cn utility)"
```

---

## Task 3: Create Zustand store

**Files:**
- Create: `demo/src/store/viewerStore.js`

- [ ] **Step 1: Create store with all Plan 1 state**

```javascript
// demo/src/store/viewerStore.js
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

export const useViewerStore = create(subscribeWithSelector((set, get) => ({
  // Model
  model: null,
  fileName: "",
  loading: false,

  // View
  facesVisible: true,
  edgesVisible: true,

  // Selection (serializable summary — Babylon objects live in usePicking ref)
  pickMode: "face",
  selectedItems: [],

  // Actions
  setModel: (model, fileName) => set({ model, fileName }),
  setLoading: (loading) => set({ loading }),
  toggleFaces: () => set((s) => ({ facesVisible: !s.facesVisible })),
  toggleEdges: () => set((s) => ({ edgesVisible: !s.edgesVisible })),
  setPickMode: (mode) => set({ pickMode: mode, selectedItems: [] }),
  setSelectedItems: (items) => set({ selectedItems: items }),
  reset: () => set({ model: null, fileName: "", selectedItems: [] }),
})));
```

- [ ] **Step 2: Commit**

```bash
git add demo/src/store/
git commit -m "feat: add Zustand viewer store"
```

---

## Task 4: Create useOcct hook

**Files:**
- Create: `demo/src/hooks/useOcct.js`

- [ ] **Step 1: Implement Wasm loading + import**

```javascript
// demo/src/hooks/useOcct.js
import { useRef, useCallback } from "react";
import { useViewerStore } from "../store/viewerStore";

const CDN = "https://unpkg.com/@tx-code/occt-js@0.1.1/dist/";

export function useOcct() {
  const moduleRef = useRef(null);
  const setModel = useViewerStore((s) => s.setModel);
  const setLoading = useViewerStore((s) => s.setLoading);

  const ensureModule = useCallback(async () => {
    if (moduleRef.current) return moduleRef.current;

    // Load occt-js script if not already loaded
    if (!window.OcctJS) {
      const script = document.createElement("script");
      script.src = CDN + "occt-js.js";
      document.head.appendChild(script);
      await new Promise((resolve, reject) => {
        script.onload = resolve;
        script.onerror = reject;
      });
    }

    moduleRef.current = await window.OcctJS({ locateFile: (f) => CDN + f });
    return moduleRef.current;
  }, []);

  const importFile = useCallback(async (file) => {
    setLoading(true);
    try {
      const occt = await ensureModule();
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);

      const ext = file.name.toLowerCase().split(".").pop();
      const formatMap = { step: "step", stp: "step", iges: "iges", igs: "iges", brep: "brep", brp: "brep" };
      const format = formatMap[ext];
      if (!format) throw new Error("Unsupported format: " + file.name);

      const methods = { step: "ReadStepFile", iges: "ReadIgesFile", brep: "ReadBrepFile" };
      const result = occt[methods[format]](bytes, {});

      if (!result.success) throw new Error(result.error || "Import failed");

      setModel(result, file.name);
      return result;
    } finally {
      setLoading(false);
    }
  }, [ensureModule, setModel, setLoading]);

  return { importFile, ensureModule };
}
```

- [ ] **Step 2: Commit**

```bash
git add demo/src/hooks/useOcct.js
git commit -m "feat: add useOcct hook for Wasm loading and file import"
```

---

## Task 5: Create useViewer hook (Babylon.js lifecycle)

**Files:**
- Create: `demo/src/hooks/useViewer.js`

- [ ] **Step 1: Implement Babylon.js engine/scene/camera setup**

```javascript
// demo/src/hooks/useViewer.js
import { useRef, useEffect, useCallback } from "react";
import { useViewerStore } from "../store/viewerStore";

export function useViewer(canvasRef) {
  const engineRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const meshGeoMapRef = useRef(new Map());
  const meshesRef = useRef([]);
  const edgeLinesRef = useRef([]);
  const transformNodesRef = useRef([]);

  // Initialize Babylon.js
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || engineRef.current) return;

    const engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0.1, 0.1, 0.12, 1);

    const camera = new BABYLON.ArcRotateCamera("cam", Math.PI / 4, Math.PI / 3, 100, BABYLON.Vector3.Zero(), scene);
    camera.attachControl(canvas, true);
    camera.wheelPrecision = 5;
    camera.wheelDeltaPercentage = 0.05;
    camera.minZ = 0.1;
    camera.panningSensibility = 30;

    const hemi = new BABYLON.HemisphericLight("hemi", new BABYLON.Vector3(0, 1, 0), scene);
    hemi.intensity = 0.9;
    hemi.groundColor = new BABYLON.Color3(0.2, 0.2, 0.25);

    const dir = new BABYLON.DirectionalLight("dir", new BABYLON.Vector3(-1, -2, 1), scene);
    dir.intensity = 0.5;

    engineRef.current = engine;
    sceneRef.current = scene;
    cameraRef.current = camera;

    engine.runRenderLoop(() => scene.render());
    const onResize = () => engine.resize();
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      engine.dispose();
    };
  }, [canvasRef]);

  // Sync faces/edges visibility from store
  useEffect(() => {
    const unsub = useViewerStore.subscribe(
      (state) => ({ facesVisible: state.facesVisible, edgesVisible: state.edgesVisible }),
      ({ facesVisible, edgesVisible }) => {
        for (const m of meshesRef.current) m.isVisible = facesVisible;
        for (const l of edgeLinesRef.current) l.isVisible = edgesVisible;
      },
      { equalityFn: (a, b) => a.facesVisible === b.facesVisible && a.edgesVisible === b.edgesVisible }
    );
    return unsub;
  }, []);

  // Build scene from OCCT result
  const buildScene = useCallback((result) => {
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    if (!scene || !camera) return;

    // Clear previous
    for (const m of meshesRef.current) m.dispose();
    for (const l of edgeLinesRef.current) l.dispose();
    for (const t of transformNodesRef.current) t.dispose();
    meshesRef.current = [];
    edgeLinesRef.current = [];
    transformNodesRef.current = [];
    meshGeoMapRef.current.clear();
    scene.materials.slice().forEach((m) => { if (m.name.startsWith("mat_")) m.dispose(); });

    const defaultColor = new BABYLON.Color3(0.7, 0.7, 0.7);
    const edgeColor = new BABYLON.Color3(0.15, 0.15, 0.18);

    // Material cache
    const matCache = new Map();
    const getMat = (color) => {
      if (!color) color = { r: 0.7, g: 0.7, b: 0.7 };
      const key = `${(color.r * 255) | 0},${(color.g * 255) | 0},${(color.b * 255) | 0}`;
      if (matCache.has(key)) return matCache.get(key);
      const mat = new BABYLON.StandardMaterial("mat_" + key, scene);
      mat.diffuseColor = new BABYLON.Color3(color.r, color.g, color.b);
      mat.backFaceCulling = false;
      mat.twoSidedLighting = true;
      matCache.set(key, mat);
      return mat;
    };

    const geoCache = new Map();

    const applyTransform = (node, transform) => {
      if (!transform || transform.length !== 16) return;
      const m = BABYLON.Matrix.FromArray(transform);
      const s = new BABYLON.Vector3();
      const r = BABYLON.Quaternion.Identity();
      const p = new BABYLON.Vector3();
      m.decompose(s, r, p);
      node.position.copyFrom(p);
      node.scaling.copyFrom(s);
      node.rotationQuaternion = r;
    };

    const buildEdgeLines = (geo, parent) => {
      if (!geo.edges || geo.edges.length === 0) return;
      const lines = [];
      for (const edge of geo.edges) {
        const pts = edge.points;
        if (!pts || pts.length < 6) continue;
        const line = [];
        for (let i = 0; i < pts.length; i += 3) {
          line.push(new BABYLON.Vector3(pts[i], pts[i + 1], pts[i + 2]));
        }
        lines.push(line);
      }
      if (lines.length === 0) return;
      const ls = BABYLON.MeshBuilder.CreateLineSystem("edges", { lines }, scene);
      ls.color = edgeColor;
      ls.parent = parent;
      ls.isPickable = false;
      edgeLinesRef.current.push(ls);
    };

    const buildPart = (nodeData, parent) => {
      const meshIndices = nodeData.meshes || [];
      for (let mi = 0; mi < meshIndices.length; mi++) {
        const geoIdx = meshIndices[mi];
        const geo = result.geometries[geoIdx];
        if (!geo || !geo.positions || geo.positions.length === 0) continue;

        const hasMultiColor = geo.faces && geo.faces.some((f) => f.color) &&
          new Set(geo.faces.filter((f) => f.color).map((f) => `${(f.color.r * 255) | 0},${(f.color.g * 255) | 0},${(f.color.b * 255) | 0}`)).size > 1;

        const cacheKey = `${geoIdx}`;
        if (geoCache.has(cacheKey)) {
          const source = geoCache.get(cacheKey);
          const inst = source.createInstance(nodeData.name || "part_inst");
          inst.parent = parent;
          applyTransform(inst, nodeData.transform);
          meshesRef.current.push(inst);
          continue; // not return — there may be more meshIndices for this node
        }

        const mesh = new BABYLON.Mesh(nodeData.name || `part_${geoIdx}`, scene);
        mesh.parent = parent;
        applyTransform(mesh, nodeData.transform);

        const positions = new Float32Array(geo.positions);
        const indices = new Uint32Array(geo.indices);
        const vd = new BABYLON.VertexData();
        vd.positions = positions;
        vd.indices = indices;
        if (geo.normals && geo.normals.length > 0) vd.normals = new Float32Array(geo.normals);

        if (hasMultiColor && geo.faces) {
          const vertexCount = positions.length / 3;
          const colors = new Float32Array(vertexCount * 4);
          for (let v = 0; v < vertexCount; v++) {
            colors[v * 4] = 0.7; colors[v * 4 + 1] = 0.7; colors[v * 4 + 2] = 0.7; colors[v * 4 + 3] = 1;
          }
          for (const face of geo.faces) {
            const c = face.color || geo.color || null;
            const cr = c ? c.r : 0.7, cg = c ? c.g : 0.7, cb = c ? c.b : 0.7;
            for (let i = face.firstIndex; i < face.firstIndex + face.indexCount; i++) {
              const vi = indices[i];
              colors[vi * 4] = cr; colors[vi * 4 + 1] = cg; colors[vi * 4 + 2] = cb; colors[vi * 4 + 3] = 1;
            }
          }
          vd.colors = colors;
        }

        vd.applyToMesh(mesh);

        if (hasMultiColor) {
          const mat = new BABYLON.StandardMaterial("mat_vcolor_" + geoIdx, scene);
          mat.diffuseColor = new BABYLON.Color3(1, 1, 1);
          mat.backFaceCulling = false;
          mat.twoSidedLighting = true;
          mesh.material = mat;
        } else {
          let meshColor = geo.color;
          if (geo.faces) {
            for (const face of geo.faces) {
              if (face.color) { meshColor = face.color; break; }
            }
          }
          mesh.material = getMat(meshColor);
        }

        meshGeoMapRef.current.set(mesh, geo);
        geoCache.set(cacheKey, mesh);
        meshesRef.current.push(mesh);
        buildEdgeLines(geo, mesh);
      }
    };

    const buildNode = (nodeData, parent) => {
      if (nodeData.isAssembly || (nodeData.children && nodeData.children.length > 0)) {
        const tn = new BABYLON.TransformNode(nodeData.name || "assembly", scene);
        tn.parent = parent;
        applyTransform(tn, nodeData.transform);
        transformNodesRef.current.push(tn);
        if (nodeData.children) for (const c of nodeData.children) buildNode(c, tn);
        if (nodeData.meshes && nodeData.meshes.length > 0) buildPart(nodeData, tn);
      } else {
        buildPart(nodeData, parent);
      }
    };

    const root = new BABYLON.TransformNode("__root__", scene);
    transformNodesRef.current.push(root);
    for (const rn of result.rootNodes || []) buildNode(rn, root);

    // Frame camera
    const bounds = root.getHierarchyBoundingVectors(true);
    const center = bounds.min.add(bounds.max).scale(0.5);
    const extent = bounds.max.subtract(bounds.min);
    const modelSize = extent.length();
    const radius = modelSize * 0.8;

    camera.target = center;
    camera.radius = Math.max(radius, 1);
    camera.alpha = Math.PI / 4;
    camera.beta = Math.PI / 3;
    camera.lowerRadiusLimit = modelSize * 0.01;
    camera.upperRadiusLimit = modelSize * 10;
    camera.minZ = modelSize * 0.001;
    camera.maxZ = modelSize * 100;
  }, []);

  const fitAll = useCallback(() => {
    const camera = cameraRef.current;
    const root = transformNodesRef.current[0];
    if (!camera || !root) return;
    const bounds = root.getHierarchyBoundingVectors(true);
    const center = bounds.min.add(bounds.max).scale(0.5);
    const extent = bounds.max.subtract(bounds.min);
    camera.target = center;
    camera.radius = Math.max(extent.length() * 0.8, 1);
    camera.alpha = Math.PI / 4;
    camera.beta = Math.PI / 3;
  }, []);

  return { engineRef, sceneRef, cameraRef, meshGeoMapRef, meshesRef, edgeLinesRef, buildScene, fitAll };
}
```

- [ ] **Step 2: Commit**

```bash
git add demo/src/hooks/useViewer.js
git commit -m "feat: add useViewer hook with Babylon.js lifecycle and scene building"
```

---

## Task 6: Create UI components

**Files:**
- Create: `demo/src/components/ViewCanvas.jsx`, `DropZone.jsx`, `LoadingOverlay.jsx`, `StatsPanel.jsx`, `Toolbar.jsx`

Note: No separate `ViewCanvas.jsx` — the canvas is inlined in `App.jsx` for simplicity (Babylon.js needs direct ref access).

- [ ] **Step 1: DropZone component**

```jsx
// demo/src/components/DropZone.jsx
import { useCallback, useState } from "react";
import { Button } from "./ui/button";

export default function DropZone({ onFile, onSample, visible }) {
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files[0]) onFile(e.dataTransfer.files[0]);
  }, [onFile]);

  if (!visible) return null;

  return (
    <div
      className={`absolute inset-0 z-50 flex items-center justify-center bg-zinc-950/95 transition-opacity ${dragOver ? "bg-zinc-950/98" : ""}`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      data-testid="drop-zone"
    >
      <div className={`border-2 border-dashed rounded-2xl p-12 text-center transition-colors ${dragOver ? "border-cyan-400" : "border-zinc-600"}`}>
        <h2 className="text-xl font-medium mb-3">occt-js Viewer</h2>
        <p className="text-zinc-500 text-sm mb-5">Drop a STEP, IGES, or BREP file here</p>
        <Button onClick={() => document.getElementById("file-input").click()}>
          Browse Files
        </Button>
        <input
          id="file-input"
          type="file"
          accept=".step,.stp,.iges,.igs,.brep,.brp"
          className="hidden"
          onChange={(e) => { if (e.target.files[0]) onFile(e.target.files[0]); e.target.value = ""; }}
          data-testid="file-input"
        />
        <p className="mt-4 text-xs text-zinc-600">
          Or try with a{" "}
          <a href="#" onClick={(e) => { e.preventDefault(); onSample(); }} className="text-cyan-400" data-testid="load-sample">
            sample file
          </a>
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: LoadingOverlay component**

```jsx
// demo/src/components/LoadingOverlay.jsx
import { useViewerStore } from "../store/viewerStore";

export default function LoadingOverlay() {
  const loading = useViewerStore((s) => s.loading);
  if (!loading) return null;

  return (
    <div className="absolute inset-0 z-[200] flex items-center justify-center bg-zinc-950/90" data-testid="loading">
      <div className="w-8 h-8 border-3 border-zinc-700 border-t-cyan-400 rounded-full animate-spin" />
      <span className="ml-3 text-sm">Loading model...</span>
    </div>
  );
}
```

- [ ] **Step 4: StatsPanel component**

```jsx
// demo/src/components/StatsPanel.jsx
import { useViewerStore } from "../store/viewerStore";

export default function StatsPanel() {
  const model = useViewerStore((s) => s.model);
  if (!model) return null;

  const s = model.stats || {};
  const geos = model.geometries || [];
  let totalFaces = 0, totalEdges = 0, totalVerts = 0;
  for (const g of geos) {
    totalFaces += (g.faces || []).length;
    totalEdges += (g.edges || []).length;
    totalVerts += (g.vertices || []).length;
  }

  const rows = [
    ["Format", model.sourceFormat?.toUpperCase() || "—"],
    ["Nodes", s.nodeCount || 0],
    ["Parts", s.partCount || 0],
    ["Triangles", (s.triangleCount || 0).toLocaleString()],
    ["Topo Faces", totalFaces],
    ["Topo Edges", totalEdges],
    ["Topo Vertices", totalVerts],
  ];

  return (
    <div className="absolute bottom-4 left-4 z-10 bg-zinc-950/90 border border-zinc-700 rounded-xl p-3.5 text-xs backdrop-blur-sm min-w-[160px]" data-testid="stats-panel">
      <h3 className="text-cyan-400 font-semibold text-[13px] mb-2">Model Info</h3>
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between py-0.5">
          <span className="text-zinc-500">{label}</span>
          <span className="text-zinc-300 tabular-nums">{value}</span>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Toolbar component (basic for Plan 1)**

```jsx
// demo/src/components/Toolbar.jsx
import { Button } from "./ui/button";
import { useViewerStore } from "../store/viewerStore";

export default function Toolbar({ onOpenFile, onFitAll }) {
  const fileName = useViewerStore((s) => s.fileName);
  const facesVisible = useViewerStore((s) => s.facesVisible);
  const edgesVisible = useViewerStore((s) => s.edgesVisible);
  const toggleFaces = useViewerStore((s) => s.toggleFaces);
  const toggleEdges = useViewerStore((s) => s.toggleEdges);

  if (!fileName) return null;

  return (
    <div className="absolute top-0 left-0 right-0 z-10 flex items-center gap-2 px-3 py-2 bg-zinc-950/85 backdrop-blur-sm border-b border-zinc-800" data-testid="toolbar">
      <span className="text-cyan-400 font-semibold text-sm">occt-js</span>
      <span className="w-px h-5 bg-zinc-700" />
      <span className="text-zinc-500 text-xs" data-testid="file-name">{fileName}</span>

      <span className="flex-1" />

      <Button size="sm" variant="ghost" onClick={onOpenFile} data-testid="open-file">
        Open
      </Button>

      <span className="w-px h-5 bg-zinc-700" />

      <Button size="sm" variant={facesVisible ? "active" : "default"} onClick={toggleFaces} data-testid="toggle-faces">
        Faces
      </Button>
      <Button size="sm" variant={edgesVisible ? "active" : "default"} onClick={toggleEdges} data-testid="toggle-edges">
        Edges
      </Button>

      <span className="w-px h-5 bg-zinc-700" />

      <Button size="sm" variant="ghost" onClick={onFitAll} data-testid="fit-all">
        Fit
      </Button>
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add demo/src/components/
git commit -m "feat: add ViewCanvas, DropZone, LoadingOverlay, StatsPanel, Toolbar components"
```

---

## Task 7: Wire up App.jsx

**Files:**
- Modify: `demo/src/App.jsx`

- [ ] **Step 1: Implement main App layout**

```jsx
// demo/src/App.jsx
import { useRef, useCallback, useState } from "react";
import { useViewerStore } from "./store/viewerStore";
import { useOcct } from "./hooks/useOcct";
import { useViewer } from "./hooks/useViewer";
import ViewCanvas from "./components/ViewCanvas";
import DropZone from "./components/DropZone";
import LoadingOverlay from "./components/LoadingOverlay";
import StatsPanel from "./components/StatsPanel";
import Toolbar from "./components/Toolbar";

export default function App() {
  const canvasRef = useRef(null);
  const model = useViewerStore((s) => s.model);
  const { importFile } = useOcct();
  const { buildScene, fitAll } = useViewer(canvasRef);
  const fileInputRef = useRef(null);

  const handleFile = useCallback(async (file) => {
    try {
      const result = await importFile(file);
      buildScene(result);
    } catch (err) {
      alert("Error: " + err.message);
    }
  }, [importFile, buildScene]);

  const handleSample = useCallback(async () => {
    useViewerStore.getState().setLoading(true);
    try {
      const resp = await fetch("../test/simple_part.step"); // served locally by Vite (fs.allow: ['..'])
      const blob = await resp.blob();
      const file = new File([blob], "simple_part.step");
      await handleFile(file);
    } catch (err) {
      alert("Error loading sample: " + err.message);
    } finally {
      useViewerStore.getState().setLoading(false);
    }
  }, [handleFile]);

  const handleOpenFile = useCallback(() => {
    if (fileInputRef.current) fileInputRef.current.click();
  }, []);

  return (
    <div className="relative h-screen w-screen">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full outline-none"
        data-testid="render-canvas"
      />

      <input
        ref={fileInputRef}
        type="file"
        accept=".step,.stp,.iges,.igs,.brep,.brp"
        className="hidden"
        onChange={(e) => { if (e.target.files[0]) handleFile(e.target.files[0]); e.target.value = ""; }}
      />

      <DropZone visible={!model} onFile={handleFile} onSample={handleSample} />
      <LoadingOverlay />
      <Toolbar onOpenFile={handleOpenFile} onFitAll={fitAll} />
      <StatsPanel />
    </div>
  );
}
```

- [ ] **Step 2: Verify the app loads and renders**

```bash
cd demo && npm run dev &
# Open http://localhost:5173 in browser
# Verify: drop zone shows, can load sample file, model renders
```

- [ ] **Step 3: Commit**

```bash
git add demo/src/App.jsx
git commit -m "feat: wire up App with all components for working viewer"
```

---

## Task 8: Delete old demo files

**Files:**
- Delete: `demo-old/` backup (old demo/index.html, picking.js, server.mjs, tests/)

- [ ] **Step 1: Remove old demo files from git**

```bash
# The old files were already moved to demo-old/ in Task 1
# Now permanently delete them
rm -rf demo-old/
git add -A
git commit -m "chore: remove old vanilla demo files (replaced by React app)"
```

---

## Task 9: Update Playwright config and write basic tests

**Files:**
- Modify: `playwright.config.mjs`
- Create: `demo/tests/demo.spec.mjs`

- [ ] **Step 1: Update playwright config for Vite**

```javascript
// playwright.config.mjs (at project root)
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "demo/tests",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: "http://localhost:5173",
    headless: true,
  },
  webServer: {
    command: "cd demo && npm run dev",
    port: 5173,
    reuseExistingServer: true,
    timeout: 15_000,
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
});
```

- [ ] **Step 2: Write core tests**

```javascript
// demo/tests/demo.spec.mjs
import { test, expect } from "@playwright/test";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const fixtures = resolve(__dirname, "..", "..", "test");

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("shows drop zone on initial load", async ({ page }) => {
  await expect(page.locator("[data-testid='drop-zone']")).toBeVisible();
  await expect(page.locator("[data-testid='toolbar']")).toBeHidden();
  await expect(page.locator("[data-testid='stats-panel']")).not.toBeVisible();
});

test("loads sample STEP file via link", async ({ page }) => {
  await page.click("[data-testid='load-sample']");
  await expect(page.locator("[data-testid='stats-panel']")).toBeVisible({ timeout: 30_000 });
  await expect(page.locator("[data-testid='drop-zone']")).not.toBeVisible();
  await expect(page.locator("[data-testid='file-name']")).toContainText("simple_part.step");
});

test("imports STEP file via file input", async ({ page }) => {
  const fileInput = page.locator("[data-testid='file-input']");
  await fileInput.setInputFiles(resolve(fixtures, "simple_part.step"));
  await expect(page.locator("[data-testid='stats-panel']")).toBeVisible({ timeout: 30_000 });
  await expect(page.locator("[data-testid='file-name']")).toContainText("simple_part.step");
});

test("imports BREP file via file input", async ({ page }) => {
  const fileInput = page.locator("[data-testid='file-input']");
  await fileInput.setInputFiles(resolve(fixtures, "as1_pe_203.brep"));
  await expect(page.locator("[data-testid='stats-panel']")).toBeVisible({ timeout: 30_000 });
  await expect(page.locator("[data-testid='stats-panel']")).toContainText("BREP");
});

test("imports IGES file via file input", async ({ page }) => {
  const fileInput = page.locator("[data-testid='file-input']");
  await fileInput.setInputFiles(resolve(fixtures, "cube_10x10.igs"));
  await expect(page.locator("[data-testid='stats-panel']")).toBeVisible({ timeout: 30_000 });
  await expect(page.locator("[data-testid='stats-panel']")).toContainText("IGES");
});

test("faces and edges toggles work", async ({ page }) => {
  await page.click("[data-testid='load-sample']");
  await expect(page.locator("[data-testid='toolbar']")).toBeVisible({ timeout: 30_000 });

  const facesBtn = page.locator("[data-testid='toggle-faces']");
  const edgesBtn = page.locator("[data-testid='toggle-edges']");

  // Toggle faces off
  await facesBtn.click();
  await expect(facesBtn).not.toHaveClass(/border-cyan/);

  // Toggle faces on
  await facesBtn.click();
  await expect(facesBtn).toHaveClass(/border-cyan/);

  // Toggle edges off
  await edgesBtn.click();
  await expect(edgesBtn).not.toHaveClass(/border-cyan/);
});

test("fit button resets camera", async ({ page }) => {
  await page.click("[data-testid='load-sample']");
  await expect(page.locator("[data-testid='toolbar']")).toBeVisible({ timeout: 30_000 });
  await page.click("[data-testid='fit-all']");
  await expect(page.locator("[data-testid='stats-panel']")).toBeVisible();
});
```

- [ ] **Step 3: Run tests**

```bash
npx playwright test
```

Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add playwright.config.mjs demo/tests/
git commit -m "test: add Playwright tests for React demo viewer"
```

---

## Task 10: Verify full pipeline

- [ ] **Step 1: Run npm test (Wasm tests — should still pass)**

```bash
npm test
```

- [ ] **Step 2: Run package tests**

```bash
node --test packages/occt-core/test/core.test.mjs packages/occt-babylon-loader/test/format-routing.test.mjs
```

- [ ] **Step 3: Run Playwright tests**

```bash
npx playwright test
```

- [ ] **Step 4: Commit any final fixes**

If anything needed fixing, commit it.
