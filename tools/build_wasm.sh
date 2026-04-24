#!/bin/bash
# ---------------------------------------------------------------------------
#  Build occt-js WebAssembly module
#  Prerequisites: Emscripten SDK activated (emcmake / emmake in PATH)
# ---------------------------------------------------------------------------
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

BUILD_DIR="$PROJECT_DIR/build"
DIST_DIR="$PROJECT_DIR/dist"

mkdir -p "$BUILD_DIR"
mkdir -p "$DIST_DIR"

node "$PROJECT_DIR/tools/check_wasm_prereqs.mjs" unix dist-types

echo "=== Configuring with emcmake ==="
cd "$BUILD_DIR"
emcmake cmake "$PROJECT_DIR" -DCMAKE_BUILD_TYPE=Release

echo "=== Building with emmake ==="
emmake make -j$(nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo 4)

echo "=== Copying output to dist/ ==="
# Emscripten output goes to dist/ via CMake RUNTIME_OUTPUT_DIRECTORY,
# but copy explicitly in case CMake config differs.
if [ -f "$BUILD_DIR/occt-js.js" ]; then
    cp "$BUILD_DIR/occt-js.js"   "$DIST_DIR/"
fi
if [ -f "$BUILD_DIR/occt-js.wasm" ]; then
    cp "$BUILD_DIR/occt-js.wasm" "$DIST_DIR/"
fi

echo "=== Generating ESM runtime entry ==="
node "$PROJECT_DIR/tools/generate_esm_runtime_entry.mjs"

echo "=== Build complete ==="
echo "Output: $DIST_DIR/occt-js.js"
echo "Output: $DIST_DIR/occt-js.mjs"
echo "Output: $DIST_DIR/occt-js.wasm"
echo "Tracked types: $DIST_DIR/occt-js.d.ts"
