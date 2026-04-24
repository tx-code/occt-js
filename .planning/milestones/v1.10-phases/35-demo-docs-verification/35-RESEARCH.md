# Phase 35: Demo Docs & Verification - Research

**Researched:** 2026-04-21
**Domain:** Demo workflow docs, demo-browser verification routing, and conditional governance for the shipped measurement MVP
**Confidence:** HIGH

<user_constraints>
## User Constraints

Use the active milestone and the already shipped Phase 33 / 33.1 / 34 outputs:

- Keep the measurement demo loop downstream and demo-owned; do not reopen runtime/package semantics for this closeout phase. [VERIFIED: `.planning/PROJECT.md`] [VERIFIED: `AGENTS.md`]
- Keep `npm run test:release:root` authoritative for the root Wasm/runtime carrier and keep demo verification conditional. [VERIFIED: `AGENTS.md`] [VERIFIED: `README.md`] [VERIFIED: `package.json`]
- Lock the actual workpiece-plus-tool measurement workflow that now exists in the demo instead of inventing new behavior. [VERIFIED: `.planning/phases/34-measurement-commands-overlay-mvp/34-01-SUMMARY.md`] [VERIFIED: `.planning/phases/34-measurement-commands-overlay-mvp/34-02-SUMMARY.md`]
- Stay inside GSD for milestone/phase tracking and use supporting rigor inside that boundary. [VERIFIED: `AGENTS.md`]
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DOCS-05 | Demo and package docs explain the exact measurement workflow, supported selection-to-measure mappings, and exact-model lifecycle expectations. | Current package/root docs already describe the SDK and lifecycle primitives, but there is no dedicated downstream demo workflow guide and no published selection-to-measure mapping table for the shipped browser workflow. |
| E2E-01 | Automated demo verification covers load, select, measure, and reset or disposal behavior for the measurement MVP. | `demo/tests/demo.spec.mjs` already covers load/select/measure/clear flows, but `demo/package.json` routes `test:e2e` only to `app-home.spec.mjs`, so the automated manifest lane still misses the measurement loop and invalidation coverage. |
| GOV-03 | Demo measurement integration remains a conditional secondary-surface verification lane and does not widen the authoritative `npm run test:release:root` gate. | `test/secondary_surface_contract.test.mjs` is already the right contract suite for this routing, and root release scripts already exclude demo/browser checks. The gap is tightening the conditional lane, not widening the root one. |
</phase_requirements>

## Project Constraints

- Root runtime/package verification remains authoritative and runtime-first. [VERIFIED: `AGENTS.md`] [VERIFIED: `package.json`]
- Demo, Babylon, and Tauri checks stay conditional secondary-surface lanes. [VERIFIED: `AGENTS.md`] [VERIFIED: `test/secondary_surface_contract.test.mjs`]
- Phase 35 should close the milestone rather than introduce new kernel or viewer scope. [VERIFIED: `.planning/ROADMAP.md`]

## Summary

Phase 35 is a focused docs-and-governance closeout. The measurement workflow itself already exists: the demo can load a workpiece, build a generated tool, resolve actor-scoped selections, run supported measurements, store typed results, and render one active placement-backed overlay. [VERIFIED: `demo/tests/demo.spec.mjs`] [VERIFIED: `.planning/phases/34-measurement-commands-overlay-mvp/34-01-SUMMARY.md`] [VERIFIED: `.planning/phases/34-measurement-commands-overlay-mvp/34-02-SUMMARY.md`]

The remaining gaps are all around truth and routing:

- There is no dedicated demo workflow doc explaining the shipped measurement loop end to end. `README.md`, `packages/occt-core/README.md`, and `docs/sdk/measurement.md` explain runtime/package APIs and lifecycle ownership, but they do not currently publish the demo’s supported selection-to-measure mapping or its invalidation rules in one discoverable place. [VERIFIED: `README.md`] [VERIFIED: `packages/occt-core/README.md`] [VERIFIED: `docs/sdk/measurement.md`]
- The repo already has interaction-level browser coverage in `demo/tests/demo.spec.mjs`, including measurement run, rerun, panel-only fallback, overlay switching, and clear-all behavior. But the manifest-routed demo E2E command still only runs `demo/tests/app-home.spec.mjs`, which is a shell-entry smoke test. [VERIFIED: `demo/tests/demo.spec.mjs`] [VERIFIED: `demo/tests/app-home.spec.mjs`] [VERIFIED: `demo/package.json`]
- `test/secondary_surface_contract.test.mjs` currently asserts that narrow app-home-only route, so governance still codifies the incomplete browser lane. [VERIFIED: `test/secondary_surface_contract.test.mjs`]

**Primary recommendation:** split Phase 35 into two steps. First, add failing secondary-surface contract assertions and publish one dedicated demo workflow guide plus root/package cross-links. Second, upgrade the demo manifest browser lane and governance so `npm --prefix demo run test:e2e` actually covers the shipped measurement loop, including one invalidation or disposal case. [ASSUMED]

## Current Code Facts

- `demo/tests/demo.spec.mjs` already includes a user-visible measurement workflow test named `selection inspector can run, rerun, and clear a cross-model exact distance measurement`. [VERIFIED: `demo/tests/demo.spec.mjs`]
- `demo/tests/viewer-store.test.mjs` already proves measurement runs clear on actor replacement, pose changes, and reset at the store level. [VERIFIED: `demo/tests/viewer-store.test.mjs`]
- `demo/src/hooks/useOcct.js` already owns exact-session disposal and replacement, so browser invalidation coverage can reuse real app flows instead of synthetic test-only hooks. [VERIFIED: `demo/src/hooks/useOcct.js`]
- `demo/src/hooks/useViewerActions.js` already exposes `closeModel` / reset behavior for user-facing app actions. [VERIFIED: `demo/src/hooks/useViewerActions.js`]
- `demo/package.json` currently defines `"test:e2e": "cd .. && npx playwright test --config playwright.config.mjs demo/tests/app-home.spec.mjs"`. [VERIFIED: `demo/package.json`]
- `test/secondary_surface_contract.test.mjs` currently locks that app-home-only route. [VERIFIED: `test/secondary_surface_contract.test.mjs`]
- `package.json` already keeps `npm run test:release:root` free of demo/browser/Tauri checks, and that must remain true after Phase 35. [VERIFIED: `package.json`] [VERIFIED: `test/release_governance_contract.test.mjs`]

## Recommended 2-Plan Split

### 35-01 — Document the measurement demo workflow, supported mappings, and lifecycle constraints

- Add failing secondary-surface contract assertions for measurement-loop docs.
- Publish one dedicated demo workflow guide.
- Update root/package/sdk docs to point to the demo guide while restating the package/runtime boundary and lifecycle rules.

### 35-02 — Add demo verification and conditional governance coverage for measurement integration

- Add failing contract/browser tests for the manifest-routed measurement lane and lifecycle invalidation.
- Update `demo/package.json` so `npm --prefix demo run test:e2e` covers both app-home smoke and measurement interaction regression.
- Extend browser coverage with at least one reset, replacement, or pose-change invalidation scenario.
- Keep all of this locked under `npm run test:secondary:contracts`, not `npm run test:release:root`.

## Common Pitfalls

### Pitfall 1: putting the whole demo workflow only in the root README

That would blur the runtime/package reference role of the root docs and make the downstream measurement workflow harder to keep focused.

**Avoidance:** create one dedicated demo workflow guide and link to it from the root/package docs.

### Pitfall 2: leaving `demo/tests/demo.spec.mjs` outside the manifest-routed demo E2E lane

That would keep the measurement loop tested only by ad hoc knowledge and let the documented `demo` browser command drift from the real supported workflow.

**Avoidance:** update `demo/package.json` and `test/secondary_surface_contract.test.mjs` together.

### Pitfall 3: widening the authoritative root release gate

If Phase 35 adds Playwright or demo commands to `npm run test:release:root`, it would break the repo’s settled runtime-first boundary.

**Avoidance:** keep measurement-demo governance inside `test:secondary:contracts` and the demo-local verification commands.

### Pitfall 4: documenting selection mappings that do not match the shipped action matrix

That would reintroduce semantic drift and mislead downstream users about what the demo really supports.

**Avoidance:** copy the conservative Phase 34 command matrix exactly and keep unsupported combinations explicit.

---

*Phase: 35-demo-docs-verification*
*Research completed: 2026-04-21*
