# Wasm Build Reproducibility Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the repository's Windows Wasm build path reproducible in a clean worktree and verify it end-to-end without relying on a root-level `emsdk/` or pre-existing `dist` artifacts.

**Architecture:** Keep the current repository structure and formalize Wasm as a root subsystem with explicit Windows setup/build/copy scripts, shared runtime preflight helpers, and documented artifact expectations. Preserve `dist/occt-js.js` and `dist/occt-js.wasm` as the runtime contract, while also preventing `dist/occt-js.d.ts` from getting accidentally dropped during clean validation or release preparation.

**Tech Stack:** Node.js built-in test runner, PowerShell/cmd batch scripts, CMake, Emscripten 3.1.69, MinGW Makefiles, git worktrees

---

## File Map

| Path | Action | Responsibility |
|------|--------|----------------|
| `package.json` | Modify | Expose the canonical Windows Wasm entry point and keep root test commands aligned with the shared preflight helper |
| `package-lock.json` | Modify if needed | Keep root package metadata consistent if script metadata changes require lock refresh |
| `CMakeLists.txt` | Modify | Preserve build-time generated headers needed by clean worktree OCCT compilation |
| `README.md` | Modify | Document a reproducible Windows build and test flow |
| `CLAUDE.md` | Modify only if current Wasm notes must stay accurate | Keep compatibility text aligned with `AGENTS.md` and the current Wasm workflow |
| `AGENTS.md` | Modify only if Wasm contract wording needs to stay synchronized | Keep repo-level build guidance accurate |
| `tools/build_wasm.sh` | Modify | Keep non-Windows guidance and artifact contract aligned with the Windows path |
| `tools/setup_emscripten_win.bat` | Modify | Install the toolchain into `build/wasm/emsdk` and remain worktree-local |
| `tools/check_wasm_prereqs.mjs` | Modify | Centralize actionable prerequisite errors and any needed artifact checks |
| `tools/build_wasm_win.bat` | Modify | Configure/build Wasm, support `BUILD_JOBS`, and retain a log path on failure |
| `tools/build_wasm_win_release.bat` | Modify if needed | Wrap the release build cleanly |
| `tools/build_wasm_win_dist.bat` | Modify | Copy build outputs into `dist/`, preserve `occt-js.d.ts`, and emit log guidance on failure |
| `test/load_occt_factory.mjs` | Modify if needed | Shared loader/preflight helper for `dist/occt-js.js` |
| `test/load_occt_factory.test.mjs` | Modify if needed | Lock error wording and helper behavior |
| `test/wasm_build_prereqs.test.mjs` | Modify if needed | Lock actionable prereq errors |
| `test/test_multi_format_exports.mjs` | Modify | Consume the shared preflight helper only |
| `test/test_mvp_acceptance.mjs` | Modify | Consume the shared preflight helper only |
| `dist/occt-js.d.ts` | Preserve or restore | Keep published type definitions intact even though Windows Wasm build does not regenerate them |
| `docs/specs/2026-03-27-wasm-build-reproducibility-design.md` | Reference only | Approved design input |

## Chunk 1: Harden The Windows Wasm Script Contract

### Task 1: Lock the artifact and prereq policy

**Files:**
- Modify: `package.json`
- Modify: `tools/check_wasm_prereqs.mjs`
- Modify: `tools/build_wasm_win_dist.bat`
- Test: `test/load_occt_factory.test.mjs`
- Test: `test/wasm_build_prereqs.test.mjs`

- [ ] **Step 1: Extend the helper tests for current contract gaps**

Add coverage for:

- `load_occt_factory` error wording still pointing to `npm run build:wasm:win`
- missing local emsdk error wording
- `dist/occt-js.d.ts` policy if the build script now preserves rather than rebuilds it

- [ ] **Step 2: Run the helper tests before changing implementation**

Run:

```powershell
node --test test/load_occt_factory.test.mjs test/wasm_build_prereqs.test.mjs
```

Expected:

- either pass as baseline
- or fail with the exact contract mismatch that will be fixed next

- [ ] **Step 3: Keep the root npm contract explicit**

Verify `package.json` keeps:

```json
{
  "scripts": {
    "build:wasm:win": "tools\\build_wasm_win_dist.bat",
    "test": "node --test test/load_occt_factory.test.mjs test/wasm_build_prereqs.test.mjs && node test/test_multi_format_exports.mjs && node test/test_mvp_acceptance.mjs"
  }
}
```

Only change this if test orchestration needs a minimal correction.

- [ ] **Step 4: Decide and encode the `occt-js.d.ts` rule**

Current problem:

- clean validation removed `dist/occt-js.d.ts`
- Windows Wasm build does not regenerate it
- the root package still publishes it

Implement one clear policy:

- either preserve the tracked `dist/occt-js.d.ts` during clean/build flows
- or explicitly restore/copy it from a stable tracked source

Do not leave the package in a state where a clean Windows rebuild silently drops published types.

- [ ] **Step 5: Re-run the helper tests**

Run:

```powershell
node --test test/load_occt_factory.test.mjs test/wasm_build_prereqs.test.mjs
```

Expected: PASS

### Task 2: Make the Windows scripts diagnosable

**Files:**
- Modify: `tools/build_wasm_win.bat`
- Modify: `tools/build_wasm_win_release.bat`
- Modify: `tools/build_wasm_win_dist.bat`

- [ ] **Step 1: Add retained build logging**

Implement a predictable log path, for example:

```text
build/wasm-build.log
```

or a similarly stable location under `build/`.

- [ ] **Step 2: Preserve `BUILD_JOBS` behavior**

Keep:

- default parallelism for normal builds
- override via `BUILD_JOBS`

This is required because the clean validation already showed at least one transient parallel-compile failure pattern.

- [ ] **Step 3: Make failure output actionable**

On script failure, print:

- which step failed
- where the retained log file is
- what command should be re-run for a focused retry

- [ ] **Step 4: Smoke-test the script layer without full rebuild assumptions**

Run:

```powershell
cmd /c tools\build_wasm_win.bat Release
```

Expected:

- either proceeds into configure/build
- or fails with explicit prereq/log guidance rather than opaque batch output

## Chunk 2: Keep Root Tests And Docs Honest

### Task 3: Keep root runtime tests using the shared loader helper

**Files:**
- Modify: `test/test_multi_format_exports.mjs`
- Modify: `test/test_mvp_acceptance.mjs`
- Modify: `test/load_occt_factory.mjs` if needed

- [ ] **Step 1: Verify both runtime tests import only via `load_occt_factory.mjs`**

The tests should not resolve `dist/occt-js.js` ad hoc in multiple places.

- [ ] **Step 2: Normalize any remaining direct `dist` loading**

If any direct resolution remains, move it behind the shared helper.

- [ ] **Step 3: Run the root helper tests again**

Run:

```powershell
node --test test/load_occt_factory.test.mjs test/wasm_build_prereqs.test.mjs
```

Expected: PASS

### Task 4: Update documentation to match the actual Windows workflow

**Files:**
- Modify: `README.md`
- Modify: `AGENTS.md` if Wasm wording drifts
- Modify: `CLAUDE.md` only if its compatibility text must mention the authoritative file differently
- Modify: `tools/build_wasm.sh` if comments/examples drift

- [ ] **Step 1: Update README to describe the real Windows flow**

Required sequence:

```bash
git submodule update --init --recursive occt
tools\setup_emscripten_win.bat
npm run build:wasm:win
npm test
```

- [ ] **Step 2: Remove stale assumptions**

Documentation must no longer imply:

- a root-level `emsdk/`
- WSL as the standard Windows route
- root tests can run without `dist` artifacts

- [ ] **Step 3: Re-read the docs for consistency**

Verify the Windows instructions in:

- `README.md`
- `AGENTS.md`
- `CLAUDE.md`

all describe the same contract.

## Chunk 3: Verify In A Clean Worktree

### Task 5: Re-run a true clean Windows validation

**Files:**
- Modify only if the verification exposes real defects
- Verify: `build/wasm`
- Verify: `dist/occt-js.js`
- Verify: `dist/occt-js.wasm`
- Verify: `dist/occt-js.d.ts`

- [ ] **Step 1: Delete only worktree-local build artifacts**

Remove:

- `build/wasm`
- generated `dist/occt-js.js`
- generated `dist/occt-js.wasm`

Do not delete unrelated tracked files or user content.

- [ ] **Step 2: Re-provision the local Windows toolchain**

Run:

```powershell
cmd /c tools\setup_emscripten_win.bat
```

Expected: `build/wasm/emsdk/emsdk_env.bat` exists

- [ ] **Step 3: Run the canonical Windows artifact build**

Run:

```powershell
npm run build:wasm:win
```

Expected:

- `dist/occt-js.js` exists
- `dist/occt-js.wasm` exists
- `dist/occt-js.d.ts` still exists according to the chosen policy

- [ ] **Step 4: Run the full root test suite**

Run:

```powershell
npm test
```

Expected: PASS

- [ ] **Step 5: If the build fails, debug from retained evidence only**

Use:

- retained build log
- exact failing translation unit or link step
- focused single-file recompile only when needed

Do not guess fixes without evidence.

### Task 6: Commit the Wasm hardening change set

**Files:**
- Commit only the Wasm hardening files

- [ ] **Step 1: Review git diff scope**

Run:

```powershell
git diff -- package.json package-lock.json CMakeLists.txt README.md AGENTS.md CLAUDE.md tools/setup_emscripten_win.bat tools/build_wasm.sh tools/build_wasm_win.bat tools/build_wasm_win_release.bat tools/build_wasm_win_dist.bat tools/check_wasm_prereqs.mjs test/load_occt_factory.mjs test/load_occt_factory.test.mjs test/wasm_build_prereqs.test.mjs test/test_multi_format_exports.mjs test/test_mvp_acceptance.mjs dist/occt-js.d.ts
```

Expected: only Wasm reproducibility work

- [ ] **Step 2: Commit with a focused message**

Suggested:

```bash
git commit -m "build: harden windows wasm workflow"
```

- [ ] **Step 3: Re-run the proof commands after commit**

Run fresh:

```powershell
npm run build:wasm:win
npm test
```

Expected: PASS on both commands
