# Phase 20: Conditional Secondary-Surface Verification - Context

**Gathered:** 2026-04-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 20 makes secondary-surface verification discoverable and runnable on purpose for `demo/`, `demo/src-tauri/`, and the Babylon package surfaces, while keeping those checks explicitly outside the unconditional root npm release gate. This phase is limited to command discoverability, package-local dependency ownership, and documentation/routing clarity; it must not turn secondary surfaces into first-order root release blockers.

</domain>

<decisions>
## Implementation Decisions

### Command discoverability
- **D-01:** Prefer manifest-first discoverability for secondary surfaces. `demo/package.json` and the relevant Babylon package manifests should expose runnable verification commands directly instead of relying on maintainers to memorize raw `node --test` or Playwright invocations.
- **D-02:** Top-level docs may summarize which touched paths should trigger which secondary-surface commands, but package-local manifests should remain the primary place maintainers discover how to run each surface.

### Demo verification surface
- **D-03:** The demo surface should expose explicit non-Tauri verification entrypoints in `demo/package.json`, with browser/unit-style checks and browser E2E checks kept distinct from `tauri:dev` / `tauri:build`.
- **D-04:** Desktop/Tauri commands remain desktop-only and conditional. Phase 20 should not make Tauri packaging or desktop runtime checks a prerequisite for root npm release verification.

### Babylon package dependency ownership
- **D-05:** `packages/occt-babylon-loader` must stop relying on undeclared or repo-hoisted Babylon dependencies for its standalone runtime/test surface. Dependencies imported directly by loader source or tests should be declared by the loader package itself.
- **D-06:** Because `packages/occt-babylon-loader/src/occt-scene-builder.js` imports `@tx-code/occt-babylon-viewer` and `@babylonjs/core` directly, those imports should be treated as package-owned dependencies rather than hidden hoist assumptions. `@tx-code/occt-core` can remain caller-supplied because loader APIs accept a core instance instead of importing the package directly.

### Conditional verification policy
- **D-07:** Secondary-surface commands should be documented as follow-up verification keyed to touched paths such as `demo/`, `demo/src-tauri/`, and Babylon package directories. They should remain outside `npm run test:release:root` and outside any unconditional root release checklist.

### the agent's Discretion
- Choose the exact script names for demo and Babylon verification as long as they are obvious from the relevant manifests.
- Choose the most compact documentation shape for the touched-path-to-command matrix as long as the conditional policy stays explicit and easy to follow.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone and repo policy
- `.planning/PROJECT.md` — Active milestone framing and the already-completed runtime-path/release-governance hardening work that Phase 20 must not undo.
- `.planning/REQUIREMENTS.md` — `SURF-01`, `SURF-02`, and `SURF-03` define the required outcome for this phase.
- `.planning/ROADMAP.md` — Phase 20 goal, success criteria, and planned split between command discoverability and hoist-assumption cleanup.
- `AGENTS.md` — Canonical root-vs-secondary-surface release boundary and testing expectations.
- `README.md` — Public release-gate guidance that already keeps secondary surfaces conditional.

### Demo verification surfaces
- `demo/package.json` — Current demo command surface; notably missing a `test` command today.
- `playwright.config.mjs` — Existing browser E2E harness configuration targeting `demo/tests/`.
- `demo/tests/demo.spec.mjs` — Existing browser E2E surface proving the demo already has a maintained test lane.
- `demo/tests/use-occt-runtime-contract.test.mjs` — Existing demo-side Node test showing there is also a non-Playwright demo test surface.

### Babylon package manifests and evidence
- `packages/occt-babylon-loader/package.json` — Current loader dependencies/peers/test surface with the hoist issue.
- `packages/occt-babylon-loader/src/occt-scene-builder.js` — Direct imports from `@babylonjs/core` and `@tx-code/occt-babylon-viewer` that establish actual package dependency ownership.
- `packages/occt-babylon-loader/test/occt-scene-builder.test.mjs` — Standalone test that currently fails when `@babylonjs/core` is not installed locally.
- `packages/occt-babylon-loader/README.md` — Package-facing guidance that currently does not surface its verification path.
- `packages/occt-babylon-viewer/package.json` — Viewer package dependency/test surface that loader currently relies on.
- `packages/occt-babylon-widgets/package.json` — Widgets package test surface for the broader secondary-surface command picture.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `playwright.config.mjs` already defines the demo E2E harness, including the Vite web server command and `demo/tests` location.
- `demo/tests/` already contains both Playwright E2E coverage (`demo.spec.mjs`) and multiple Node-based helper tests, so Phase 20 can expose existing verification surfaces rather than inventing them.
- Every Babylon package already has a `test` script in its own `package.json`; this phase can preserve that manifest-first pattern while fixing missing dependencies and surfacing commands more clearly.

### Established Patterns
- Repo-local package tests use `node --test test/*.test.mjs` in package manifests.
- Browser E2E lives at repo root through `playwright.config.mjs`, but the actual tests belong to `demo/tests/`.
- Root release docs and policy already describe secondary surfaces as conditional; Phase 20 should extend that discoverability, not redefine the release boundary.

### Integration Points
- `demo/package.json` is the main missing command surface for `SURF-01` because `npm --prefix demo test` currently fails with `Missing script: "test"`.
- `packages/occt-babylon-loader/package.json` plus `src/occt-scene-builder.js` are the main `SURF-02` integration points because the package imports `@babylonjs/core` and `@tx-code/occt-babylon-viewer` directly.
- README / AGENTS / package READMEs are the right places to document which touched paths should trigger which secondary-surface commands while keeping them conditional.

</code_context>

<specifics>
## Specific Ideas

- Direct evidence for `SURF-01`: `npm --prefix demo test` currently fails with `Missing script: "test"`, even though `demo/tests/` and `playwright.config.mjs` already provide maintained test surfaces.
- Direct evidence for `SURF-02`: `npm --prefix packages/occt-babylon-loader test` currently fails with `ERR_MODULE_NOT_FOUND` for `@babylonjs/core`, proving the package still depends on undeclared/hoisted installs.
- `packages/occt-babylon-loader/src/occt-scene-builder.js` imports `@tx-code/occt-babylon-viewer` directly, so treating viewer as a purely optional peer does not match the actual package runtime shape.
- The cleanest Phase 20 outcome is to expose the existing secondary-surface commands more clearly, fix the loader dependency ownership, and document the touched-path routing without adding any of these checks to `npm run test:release:root`.

</specifics>

<deferred>
## Deferred Ideas

- Wider Babylon package version alignment across the whole ecosystem belongs to the future `v1.8 Package Ecosystem & Secondary Surfaces` milestone unless a minimal fix is required for Phase 20.
- Any CI expansion or always-on secondary-surface gating remains out of scope; this phase is about intentional discoverability and standalone correctness, not unconditional promotion.
- Tauri product/runtime feature work remains outside this phase boundary.

</deferred>

---

*Phase: 20-conditional-secondary-surface-verification*
*Context gathered: 2026-04-17*
