# Windows Wasm Build Reproducibility Design

**Date**: 2026-03-27
**Status**: Approved

## Goal

Make the repository's Windows Wasm build path reproducible in a clean git worktree without depending on:

- a shared repository-root `emsdk/` directory
- previously built `dist/occt-js.js` and `dist/occt-js.wasm`
- WSL or `bash tools/build_wasm.sh`

The resulting build flow must support future C++ and binding changes without turning Wasm regeneration into a one-off local ritual.

## Problem Statement

The historical `master` workflow was "usable" but not reliably reproducible from a clean checkout.

Observed failure pattern:

- browser and desktop workflows often consumed pre-existing `dist/occt-js.js` and `dist/occt-js.wasm`
- Windows setup depended on a root-level ignored `emsdk/` directory
- clean worktrees did not inherit those ignored artifacts
- documentation described a build path, but not one that was guaranteed to work from zero on Windows

This means the repository could appear healthy while still lacking a dependable way to rebuild Wasm after source changes.

## Non-Negotiable Constraints

- Keep the current repository structure.
- Keep `dist/occt-js.js` and `dist/occt-js.wasm` as the public runtime artifacts consumed by web and desktop workflows.
- Do not reintroduce a repository-root `emsdk/` dependency.
- Do not require WSL for the standard Windows build path.
- Do not make npm release flow depend on desktop tooling.
- Do not mix this work with CI rollout in the same change.

## Reference Baseline

`E:\Coding\occt-import-js` provides the right level of structure for the Wasm toolchain:

- `emsdk` is installed under `build/wasm/emsdk`
- Windows has native batch entry points
- the build contract is explicit: generate `dist/*.js` and `dist/*.wasm`

This repository should follow that model while preserving its current multi-surface layout (`root package + demo + desktop`).

## Recommended Approach

Adopt the `occt-import-js` Wasm build shape, but adapt it to `occt-js` rather than cloning the entire repository layout.

The Wasm system becomes a formal subsystem with four layers:

1. toolchain acquisition
2. native Windows configure/build
3. artifact copy into `dist/`
4. explicit tests for prereqs and runtime loadability

This gives the project one stable answer to the question: "After I change C++ or bindings, how do I regenerate Wasm?"

## Build Contract

### Toolchain Location

The Emscripten SDK must live under:

```text
build/wasm/emsdk
```

This keeps each worktree self-contained and prevents accidental coupling to a shared ignored directory in another checkout.

### Build Output Location

Intermediate and compile outputs live under:

```text
build/wasm
```

Final distributable artifacts remain:

```text
dist/occt-js.js
dist/occt-js.wasm
```

The `dist/` contract must stay stable because:

- root tests consume it
- the web app consumes it in local development
- the Tauri desktop app bundles it as a runtime resource

## Script Contract

### `tools/setup_emscripten_win.bat`

Responsibilities:

- create `build/wasm`
- clone `emsdk` into `build/wasm/emsdk` if missing
- install and activate Emscripten `3.1.69`
- install and activate `mingw-7.1.0-64bit`
- print the activation command for later shell reuse

Non-responsibilities:

- no compile
- no copy into `dist/`

### `tools/build_wasm_win.bat`

Responsibilities:

- verify prerequisites before configure
- activate `build/wasm/emsdk/emsdk_env.bat`
- run `emcmake cmake`
- run `emmake mingw32-make`

Required behavior:

- accept a build type argument, defaulting to `Release`
- respect `BUILD_JOBS`
- fail with clear non-zero exit codes

### `tools/build_wasm_win_release.bat`

Responsibilities:

- wrap `tools/build_wasm_win.bat Release`

### `tools/build_wasm_win_dist.bat`

Responsibilities:

- call the release wrapper
- copy generated `occt-js.js` and `occt-js.wasm` from `build/wasm` into `dist/`
- fail clearly if expected outputs are missing

This is the canonical Windows artifact-producing entry point.

### Root npm Script

The root package must expose:

```json
"build:wasm:win": "tools\\build_wasm_win_dist.bat"
```

This becomes the standard documented answer for Windows developers.

## Diagnostics and Stability

Clean validation already showed that the Windows-native path can bootstrap and reach deep OCCT compilation in a clean worktree, but also exposed one important operational gap:

- a first full clean build failed at a single translation unit during parallel compile
- the same source compiled successfully when retried directly
- an incremental rebuild then proceeded beyond the original failure point

This indicates the build system needs better diagnostics, not just more scripts.

Required hardening:

- support `BUILD_JOBS` overrides for easier repro and isolation
- write build logs to a predictable file under `build/`
- print the log path when the build fails

This is necessary so future failures can be diagnosed from evidence rather than partial terminal output.

## Test Contract

The Wasm subsystem must have explicit root-level verification.

### Prereq Test

`test/wasm_build_prereqs.test.mjs` should validate that missing requirements produce actionable errors, especially:

- missing `occt` submodule content
- missing `build/wasm/emsdk/emsdk_env.bat`

### Dist Load Helper

`test/load_occt_factory.mjs` should centralize loading `dist/occt-js.js` and produce a clear error if artifacts are missing.

This avoids opaque `MODULE_NOT_FOUND` failures in higher-level tests.

### Runtime Tests

Existing root tests should consume the helper rather than resolving `dist/` ad hoc:

- `test/test_multi_format_exports.mjs`
- `test/test_mvp_acceptance.mjs`

## Documentation Contract

`README.md` and local contributor docs must describe a Windows flow that is actually reproducible:

1. initialize submodules
2. run `tools/setup_emscripten_win.bat`
3. run `npm run build:wasm:win`
4. run `npm test`

Documentation must stop implying that a shared root `emsdk/` or WSL path is the normal Windows answer.

## Developer Workflow

After this change, the expected Windows workflow for Wasm-affecting changes is:

1. modify `src/`, bindings, or `CMakeLists.txt`
2. run `tools/setup_emscripten_win.bat` if toolchain is absent
3. run `npm run build:wasm:win`
4. run `npm test`
5. let web and desktop consume the refreshed `dist/` artifacts

This is the workflow future feature work should rely on.

## Out of Scope

- CI integration
- Linux/macOS Wasm parity
- changing the web or desktop runtime contract away from `dist/`
- Tauri-specific build changes
- npm release flow changes beyond keeping docs accurate

## Acceptance Criteria

This work is accepted when all of the following are true on Windows in a clean worktree:

1. `tools/setup_emscripten_win.bat` can provision `build/wasm/emsdk`
2. `npm run build:wasm:win` can produce `dist/occt-js.js` and `dist/occt-js.wasm`
3. failures emit actionable messages and point to a retained log file
4. root Wasm-related tests use a shared `dist` preflight helper
5. contributors no longer need a root-level ignored `emsdk/` directory or pre-existing `dist` leftovers to rebuild Wasm

## Follow-Up

Once this Windows path is stable, the project can decide separately whether to:

- add CI verification
- add non-Windows parity
- tighten release automation around fresh Wasm artifacts

Those are follow-on tasks, not part of this design.
