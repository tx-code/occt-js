# Phase 1: Wasm Build & Dist Baseline - Context

**Gathered:** 2026-04-14
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase hardens the reproducible Windows Wasm build path and the canonical `dist/` artifact contract used by root tests, local web development, and desktop packaging. It does not expand format support, redesign package publishing, add CI, or broaden the standard build target beyond the documented Windows clean-worktree path.

</domain>

<decisions>
## Implementation Decisions

### Build scope
- **D-01:** Treat this as a Windows-first reproducibility phase. Linux/macOS parity, CI rollout, and desktop-specific packaging changes are outside this phase unless they are required to preserve the existing `dist/` contract.
- **D-02:** Keep the current repository structure. The build contract remains `build/wasm/*` for intermediates and `dist/occt-js.js` plus `dist/occt-js.wasm` for distributable runtime outputs.

### Artifact policy
- **D-03:** `dist/occt-js.js` and `dist/occt-js.wasm` remain the canonical runtime artifacts consumed by root tests, local web development, and Tauri bundling.
- **D-04:** `dist/occt-js.d.ts` is a tracked package asset and must be preserved or restored from git; phase work must not assume the Wasm build regenerates it.

### Verification bar
- **D-05:** Phase completion must be proven through the documented clean-Windows flow, prerequisite/error-path coverage, and root runtime preflight behavior before claiming the build path is healthy.
- **D-06:** Root verification is primary in this phase. Demo and desktop surfaces remain downstream consumers of the `dist/` contract, but they are not the main verification target for this build-baseline hardening step.

### Failure diagnostics
- **D-07:** Build failures should continue to retain a predictable log file at `build/wasm-build.log` with enough information to retry or diagnose.
- **D-08:** The low-parallel retry path using `BUILD_JOBS=1` stays part of the expected Windows troubleshooting path rather than being treated as an incidental workaround.

### the agent's Discretion
- Planning can decide the exact split between script hardening, prereq validation, and doc reconciliation as long as the phase goal and artifact contract stay intact.
- Minor developer-experience improvements are allowed when they support the existing build contract, but they must not silently widen phase scope into CI, release automation, or cross-platform redesign.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Repo-level contract
- `AGENTS.md` — authoritative repository boundaries, build/test entry points, and surface ownership rules
- `README.md` — public Windows setup/build contract, `dist/` artifact expectations, and retry guidance
- `.planning/PROJECT.md` — brownfield baseline, core value, and explicit release constraints
- `.planning/REQUIREMENTS.md` — Phase 1 maps to `CORE-01`
- `.planning/ROADMAP.md` — Phase 1 goal, success criteria, and canonical refs list

### Windows Wasm scripts
- `tools/setup_emscripten_win.bat` — provisions local Emscripten and MinGW under `build/wasm/emsdk`
- `tools/build_wasm_win.bat` — Windows configure/build flow, retained log path, and retry guidance
- `tools/build_wasm_win_dist.bat` — canonical Windows entrypoint that copies Wasm outputs into `dist/`
- `tools/build_wasm_win_release.bat` — release wrapper invoked by the dist-producing script
- `tools/check_wasm_prereqs.mjs` — shared prerequisite enforcement for submodule, local toolchain, and tracked type definitions

### Root verification
- `package.json` — root `build:wasm:win` and `test` entry points
- `test/wasm_build_prereqs.test.mjs` — expected prerequisite failure messaging contract
- `test/load_occt_factory.mjs` — root dist-loader helper used by runtime tests
- `test/load_occt_factory.test.mjs` — expected missing-dist guidance and loader preflight behavior

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `tools/check_wasm_prereqs.mjs`: already centralizes prerequisite enforcement for missing submodule content, missing local emsdk, and missing tracked type definitions.
- `test/load_occt_factory.mjs`: already centralizes root runtime loading from `dist/` and is the right place to preserve actionable missing-artifact errors.
- Root npm scripts in `package.json`: already expose the main developer entry points and should remain the public commands this phase hardens.

### Established Patterns
- Windows build scripts retain `build/wasm-build.log` and print retry guidance rather than failing silently.
- The repository distinguishes intermediate build output (`build/wasm`) from distributable runtime output (`dist/`).
- Root tests are expected to consume the generated `dist/` artifacts rather than rebuild Wasm implicitly.

### Integration Points
- Any Phase 1 changes should land in `tools/`, `README.md`, root test helpers, and root package scripts first.
- If build-path assumptions change, they must stay aligned with `AGENTS.md` and the root `package.json` command surface.

</code_context>

<specifics>
## Specific Ideas

- Preserve the current clean-Windows story centered on `build/wasm/emsdk`; do not regress to a shared repo-root `emsdk` assumption.
- Keep the developer-facing recovery path explicit: missing prerequisites fail early, and transient parallel failures point to `BUILD_JOBS=1`.

</specifics>

<deferred>
## Deferred Ideas

- Linux/macOS parity improvements — separate phase once the Windows baseline is stable
- CI verification of clean Wasm rebuilds — future release automation work
- Broader release automation or package publishing orchestration — later governance/release phase

</deferred>

---
*Phase: 01-wasm-build-dist-baseline*
*Context gathered: 2026-04-14*
