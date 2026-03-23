# occt-js

WebAssembly build of [OpenCASCADE Technology (OCCT)](https://dev.opencascade.org/) v7.9.3 for STEP file import and triangulation. Designed for use in browser-based CAD viewers (e.g., Babylon.js).

## Features

- Import STEP files from memory (Uint8Array)
- XDE assembly tree traversal with names and colors
- BRepMesh triangulation with configurable deflection
- Embind-based API returning a structured scene graph

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

## API

```js
import OcctJS from './dist/occt-js.js';

const occt = await OcctJS();

const buffer = new Uint8Array(/* ... STEP file bytes ... */);
const result = occt.ReadStepFile(buffer, {
    linearDeflection: 0.1,
    angularDeflection: 0.5,
    readNames: true,
    readColors: true
});

// result.success       — boolean
// result.sourceFormat  — "step"
// result.rootNodes     — tree of nodes with children, transforms, meshIndex
// result.geometries    — array of { positions, normals, indices, faceRanges }
// result.materials     — deduplicated color list
// result.stats         — { rootCount, nodeCount, partCount, ... }
```

## License

This project links against OCCT which is licensed under the [GNU Lesser General Public License v2.1](https://www.gnu.org/licenses/old-licenses/lgpl-2.1.html).
