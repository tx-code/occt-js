# occt-js

WebAssembly build of [OpenCASCADE Technology (OCCT)](https://dev.opencascade.org/) v7.9.3 for CAD import and triangulation. Designed for use in browser-based CAD viewers (e.g., Babylon.js).

**[Live Demo](https://tx-code.github.io/occt-js/demo/index.html)** — drag and drop STEP/IGES/BREP files, face/edge/vertex picking, hover preview

## Features

- Import STEP / IGES / BREP files from memory (`Uint8Array`)
- Full B-Rep topology output (Face/Edge/Vertex with stable IDs and adjacency)
- XDE assembly tree traversal with names and per-face colors
- BRepMesh triangulation with configurable deflection
- Embind-based API returning a structured scene graph
- Babylon.js demo with interactive face/edge/vertex selection

## Prerequisites

| Tool | Version |
|------|---------|
| Emscripten SDK | 3.1.69 |
| CMake | 3.20+ |
| Git | (for OCCT submodule) |

## Setup

```bash
# Clone with submodule
git clone --recurse-submodules <repo-url>
cd occt-js

# Windows: install Emscripten
tools\setup_emscripten_win.bat
call emsdk\emsdk_env.bat

# Linux/macOS: install Emscripten manually or use emsdk
```

## Build

```bash
# Activate Emscripten environment first, then:
bash tools/build_wasm.sh
```

Output files are written to `dist/`:
- `occt-js.js` — ES module loader
- `occt-js.wasm` — WebAssembly binary

## Repository Layout (2026-03-24)

This stays a single `occt-js` repository without Babylon fork maintenance.  
Within this repository we keep two maintained modules:

- `@tx-code/occt-core` (`packages/occt-core`)
  - OCCT Wasm runtime binding and normalized CAD model output.
  - Unified import API for `step` / `iges` / `brep`.
- `@tx-code/occt-babylon-loader` (`packages/occt-babylon-loader`)
  - Babylon-facing model loader and scene builder.
  - Delegates CAD parsing to `occt-core`.

## API

```js
import OcctJS from './dist/occt-js.js';

const occt = await OcctJS();

const buffer = new Uint8Array(/* ... CAD file bytes ... */);
const result = occt.ReadFile("step", buffer, {
    linearUnit: "millimeter",
    linearDeflectionType: "bounding_box_ratio",
    linearDeflection: 0.1,
    angularDeflection: 0.5,
    readNames: true,
    readColors: true
});

// Also available:
// occt.ReadIgesFile(buffer, options)
// occt.ReadBrepFile(buffer, options)

// result.success       — boolean
// result.sourceFormat  — "step"
// result.rootNodes     — tree of nodes with children, transforms, meshes[]
// result.geometries    — array of { positions, normals, indices, faces, edges, vertices, triangleToFaceMap }
// result.materials     — deduplicated color list
// result.stats         — { rootCount, nodeCount, partCount, triangleCount, ... }
```

## License

This project links against OCCT which is licensed under the [GNU Lesser General Public License v2.1](https://www.gnu.org/licenses/old-licenses/lgpl-2.1.html).
