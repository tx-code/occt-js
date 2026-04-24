---
phase: 35-demo-docs-verification
plan: "01"
subsystem: measurement-demo-docs
tags: [demo, docs, governance, measurement, tdd]
requires:
  - phase: 35-demo-docs-verification
    provides: Phase 35 context and research baseline
  - file: .planning/phases/35-demo-docs-verification/35-01-PLAN.md
    provides: Demo workflow docs and secondary-surface contract requirements
provides:
  - Canonical downstream guide for the browser exact-measurement demo workflow
  - Root/package/sdk doc links that keep the runtime/package boundary explicit
  - Secondary-surface contract coverage for workflow discovery and lifecycle boundary docs
affects: [phase-35, docs, governance, secondary-surface-contracts]
tech-stack:
  added: []
  patterns: [canonical-demo-guide, linked-runtime-package-docs, docs-first-governance]
key-files:
  modified:
    - README.md
    - packages/occt-core/README.md
    - docs/sdk/measurement.md
    - test/secondary_surface_contract.test.mjs
  added:
    - docs/demo/exact-measurement-workflow.md
key-decisions:
  - "The browser measurement loop now has one canonical downstream guide instead of being spread across root/package references."
  - "Root and package docs link to the demo workflow but continue to state that measurement UI policy, overlay rendering, and command availability remain downstream concerns."
  - "Secondary-surface contract tests now lock the demo workflow guide, supported selection-to-measure terminology, and explicit invalidation rules."
requirements-completed: [DOCS-05, GOV-03]
duration: n/a
completed: 2026-04-21
---

# Phase 35 Plan 01 Summary

**The repo now has one canonical browser-demo measurement workflow guide, linked from root/package/sdk docs and locked by the secondary-surface contract suite.**

## Accomplishments

- Added [docs/demo/exact-measurement-workflow.md](/E:/Coding/occt-js/docs/demo/exact-measurement-workflow.md:1) as the canonical downstream guide:
  - workpiece-plus-tool setup
  - actor-scoped selection-to-measure mapping
  - panel-only fallback semantics
  - invalidation on replacement, reset, and tool pose change
- Updated the root exact-measurement reference in [README.md](/E:/Coding/occt-js/README.md:149) so it now points directly at the shipped browser-demo workflow and states the invalidation boundary.
- Updated the package-first SDK reference in [packages/occt-core/README.md](/E:/Coding/occt-js/packages/occt-core/README.md:168) so downstream consumers can discover the demo workflow without confusing package APIs with measurement UI ownership.
- Updated the SDK guide in [docs/sdk/measurement.md](/E:/Coding/occt-js/docs/sdk/measurement.md:1) with a direct link to the browser-demo workflow guide and the same downstream boundary language.
- Extended [test/secondary_surface_contract.test.mjs](/E:/Coding/occt-js/test/secondary_surface_contract.test.mjs:75) so the repo now fails if:
  - the canonical demo workflow guide disappears
  - supported selection-to-measure language drifts
  - replacement/reset/pose-change invalidation notes disappear from the published docs

## Verification

- `npm run test:secondary:contracts`

The command passed on 2026-04-21.

## Process Notes

- `superpowers:test-driven-development` was followed for this plan: failing secondary-surface contract assertions were added first, verified red, then driven green through doc updates.
- `superpowers:verification-before-completion` was satisfied with a fresh `npm run test:secondary:contracts` run before closeout.
- `superpowers:requesting-code-review` was intentionally skipped because this plan was docs/governance-only and no explicit user permission was given for delegated review subagents.
