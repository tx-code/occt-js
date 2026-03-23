# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

occt-js is a WebAssembly build of OpenCASCADE Technology (OCCT) v7.9.3, providing STEP file import and triangulation for browser-based CAD viewers. It produces a `.wasm` + `.js` pair consumed by the Babylon.js STEP loader (`StepWasmBridge`).

## Build Commands

```bash
# Prerequisites: Emscripten SDK 3.1.69, CMake 3.20+

# Windows: install Emscripten (one-time)
tools\setup_emscripten_win.bat
call emsdk\emsdk_env.bat

# Build Wasm
bash tools/build_wasm.sh

# Or manually:
mkdir -p build && cd build
emcmake cmake .. -DCMAKE_BUILD_TYPE=Release
emmake make -j$(nproc)

# Run tests (requires Node.js from emsdk)
emsdk/node/22.16.0_64bit/bin/node test/test_read.mjs
emsdk/node/22.16.0_64bit/bin/node test/test_mvp_acceptance.mjs
```

Output: `dist/occt-js.js` (109KB) + `dist/occt-js.wasm` (~11MB)

First build takes 30-40 minutes (compiling ~200 OCCT modules). Incremental rebuilds of bridge code take ~2 minutes (relink only).

## Architecture

```
STEP bytes (Uint8Array)
    ↓  Embind
js-interface.cpp         → ReadStepFile() entry point
    ↓
importer-step.cpp        → STEPCAFControl_Reader + XDE tree traversal
    ↓
importer-utils.cpp       → BRepMesh_IncrementalMesh + mesh extraction
    ↓
OcctSceneData (C++ struct)
    ↓  Embind val conversion
JS object (StepSceneDto-compatible)
```

### Key Files

- `src/importer.hpp` — Core data structures (OcctSceneData, OcctNodeData, OcctMeshData, ImportParams)
- `src/importer-step.cpp` — STEP reading via STEPCAFControl_Reader, XDE assembly traversal, color/name extraction
- `src/importer-utils.cpp` — BRepMesh triangulation, vertex/normal/index extraction from TopoDS_Shape
- `src/js-interface.cpp` — Embind bindings, JS↔C++ type conversion, output format aligned with StepSceneDto
- `CMakeLists.txt` — ~200 OCCT modules compiled from source, Emscripten flags

### OCCT Submodule

OCCT v7.9.3 source lives at `occt/` as a git submodule. Modules are compiled directly from `occt/src/{ModuleName}/*.cxx`. No prebuilt libraries or third-party dependencies (no FreeType, TCL, TBB).

### CMake Module Selection

`AddOcctModule(name)` collects `.cxx` files from `occt/src/{name}/` and adds include paths. Modules that don't exist in the OCCT checkout are skipped with a warning. This makes the build resilient to OCCT version differences.

### Emscripten Configuration

- Binding: Embind (`--bind`), not cwrap/ccall
- Optimization: `-Oz` (size), `-fwasm-exceptions`
- Memory: `-sALLOW_MEMORY_GROWTH=1`, `-sSTACK_SIZE=10MB`
- Module: `-sMODULARIZE=1`, `-sEXPORT_NAME='OcctJS'`
- No OCCT plugins: `-DOCCT_NO_PLUGINS`

## Output Format

`ReadStepFile()` returns a JS object matching the Babylon.js `StepSceneDto` interface:

```
{ sourceFormat, rootNodes[], geometries[], materials[], warnings[], stats }
```

- `geometries[].positions/normals` → Float32Array
- `geometries[].indices` → Uint32Array
- `rootNodes` → tree structure (children nested, not flat)
- Transform matrices are 16 floats in **column-major** order (Babylon.js compatible)

## Relationship to Babylon.js

This project is consumed by `packages/dev/loaders/src/STEP/stepWasmBridge.ts` in the Babylon.js fork. The bridge loads `occt-js.wasm`/`occt-js.js` and calls `ReadStepFile()`. The returned object is then converted to `StepSceneDto` format via `_toStepSceneDto()` (mapping `isAssembly`→`kind`, `meshIndex`→`geometryId`, color objects→`baseColor` arrays, etc.).

## Test Assets

- `test/simple_part.step` — single cube (NX export, 12 triangles, orange color)
- `test/assembly.step` — CAX-IF AS1 assembly (28 nodes, 5 geometries, 13 reused, 5 colors)
- `test/ANC101.stp` — mechanical part (5584 triangles, no colors)

## Current Status

MVP complete. 18/18 acceptance criteria passed. See `test/test_mvp_acceptance.mjs`.

## License

OCCT: LGPL-2.1. Bridge code (src/): same license to maintain compatibility.
