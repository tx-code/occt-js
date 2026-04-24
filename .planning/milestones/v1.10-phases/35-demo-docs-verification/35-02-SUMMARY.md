---
phase: 35-demo-docs-verification
plan: "02"
subsystem: demo-measurement-verification-routing
tags: [demo, e2e, governance, measurement, tdd]
requires:
  - phase: 35-demo-docs-verification
    provides: Phase 35 context and docs baseline
  - file: .planning/phases/35-demo-docs-verification/35-02-PLAN.md
    provides: Manifest-routed demo verification and lifecycle-coverage requirements
provides:
  - Manifest-routed demo browser verification that includes measurement interaction coverage
  - Playwright regression proving measurement invalidation after tool pose change
  - Secondary-surface docs and contracts aligned to the improved demo-browser lane
affects: [phase-35, demo, browser-verification, secondary-surface-contracts]
tech-stack:
  added: []
  patterns: [manifest-routed-playwright-lane, lifecycle-invalidation-e2e, conditional-governance-lock]
key-files:
  modified:
    - demo/package.json
    - demo/tests/demo.spec.mjs
    - test/secondary_surface_contract.test.mjs
    - README.md
    - AGENTS.md
key-decisions:
  - "`npm --prefix demo run test:e2e` is now the authoritative demo-browser lane for app-home smoke plus measurement interaction regression."
  - "Measurement invalidation is now proven in Playwright through a real tool pose change instead of remaining only a store-level contract."
  - "The improved demo-browser lane stays explicitly conditional and outside `npm run test:release:root`."
requirements-completed: [E2E-01, GOV-03]
duration: n/a
completed: 2026-04-21
---

# Phase 35 Plan 02 Summary

**The repo’s documented `demo` browser lane now actually covers the shipped measurement loop, including a real invalidation case, while keeping the root release gate unchanged.**

## Accomplishments

- Tightened [demo/package.json](/E:/Coding/occt-js/demo/package.json:1) so `npm --prefix demo run test:e2e` now runs both:
  - `demo/tests/app-home.spec.mjs`
  - `demo/tests/demo.spec.mjs`
- Extended [demo/tests/demo.spec.mjs](/E:/Coding/occt-js/demo/tests/demo.spec.mjs:579) with a browser regression that proves measurement state clears after a tool pose change invalidates the active run.
- Extended [test/secondary_surface_contract.test.mjs](/E:/Coding/occt-js/test/secondary_surface_contract.test.mjs:28) so governance now fails if the demo manifest stops routing measurement interaction coverage through `test:e2e`.
- Updated the top-level verification matrix in [README.md](/E:/Coding/occt-js/README.md:396) so the `demo` E2E lane is described as browser smoke and measurement interaction verification.
- Updated [AGENTS.md](/E:/Coding/occt-js/AGENTS.md:195) so repository-level agent guidance matches the same conditional demo-browser lane and continues to keep it outside the authoritative root release gate.

## Verification

- `npm run test:secondary:contracts`
- `npm --prefix demo test`
- `npm --prefix demo run build`
- `npm --prefix demo run test:e2e`

All commands passed on 2026-04-21.

## Process Notes

- `superpowers:test-driven-development` was followed for this plan: contract assertions for manifest routing were added first, verified red, then driven green by updating the demo manifest and docs. The new Playwright invalidation coverage was added before the final verification lane was rerun.
- `superpowers:verification-before-completion` was satisfied with fresh `test:secondary:contracts`, demo node tests, demo build, and manifest-routed Playwright output before closeout.
- `superpowers:requesting-code-review` was intentionally skipped because no explicit user permission was given for delegated review subagents.
