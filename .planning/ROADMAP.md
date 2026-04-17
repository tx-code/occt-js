# Roadmap: occt-js

## Milestones

- 🚧 **v1.5 Root Release Hardening** - Phases 18-20 (active)
- ✅ [v1.4 Exact Measurement Placement & Relation SDK](./milestones/v1.4-ROADMAP.md) — Phases 15-17, shipped 2026-04-16
- ✅ [v1.3 Appearance Expansion](./milestones/v1.3-ROADMAP.md) — Phases 12-14, shipped 2026-04-15
- ✅ [v1.2 Import Appearance Contract](./milestones/v1.2-ROADMAP.md) — Phases 9-11, shipped 2026-04-15
- ✅ [v1.1 Exact BRep Measurement Foundation](./milestones/v1.1-ROADMAP.md) — Phases 5-8, shipped 2026-04-15
- ✅ [v1.0 OCCT Wasm Runtime Hardening](./milestones/v1.0-ROADMAP.md) — Phases 1-4, shipped 2026-04-14

## Overview

This roadmap restores the runtime-first root release boundary after drift between preflight expectations, release-governance assertions, and secondary-surface verification. The milestone first realigns concrete `dist/` loading paths, then removes `.planning` archive coupling from the authoritative root release gate, and finally makes demo and Babylon verification discoverable and conditional without promoting those checks into unconditional npm release blockers.

## Phases

**Phase Numbering:**
- Integer phases (18, 19, 20): Planned milestone work
- Decimal phases (18.1, 18.2): Urgent insertions (marked with INSERTED)

- [ ] **Phase 18: Runtime Path Contract Alignment** - Align root preflight assertions with the shipped `dist/occt-js.js` and `dist/occt-js.wasm` loading contract.
- [ ] **Phase 19: Root Release Governance Decoupling** - Keep the authoritative root release gate focused on runtime, package, typings, and docs contract coverage instead of `.planning` archive state.
- [ ] **Phase 20: Conditional Secondary-Surface Verification** - Make demo and Babylon verification discoverable, runnable, and explicitly conditional outside the root npm release gate.

## Phase Details

### Phase 18: Runtime Path Contract Alignment
**Goal**: Maintainers can validate the shipped root runtime-loading contract through the same concrete `dist/` artifact paths used by root consumers and the demo dev runtime.
**Depends on**: Phase 17
**Requirements**: PATH-01, PATH-02
**Success Criteria** (what must be TRUE):
  1. `npm run test:wasm:preflight` passes when the shipped `dist/occt-js.js` and `dist/occt-js.wasm` artifacts exist at the canonical root locations and fails when those artifacts are missing.
  2. The maintained demo dev/runtime loading path resolves the same concrete root `dist/` artifacts that preflight asserts, so maintainers verify one shared loading contract instead of parallel path conventions.
  3. Root runtime-path assertions no longer depend on stale directory-base assumptions that disagree with shipped artifact consumers.
**Plans**: 2 plans

Plans:
- [ ] 18-01-PLAN.md — Align root preflight assertions with the canonical `dist/` artifact paths
- [ ] 18-02-PLAN.md — Reconcile demo runtime loading with the shipped root artifact contract

### Phase 19: Root Release Governance Decoupling
**Goal**: Maintainers can run the authoritative root release gate without `.planning` archive-state coupling while still enforcing the published runtime, package, typings, and docs contract.
**Depends on**: Phase 18
**Requirements**: GOV-02, GOV-03, DOCS-02
**Success Criteria** (what must be TRUE):
  1. `npm run test:release:root` passes or fails based on published root runtime, package, typings, and docs contract drift, not on archived milestone filenames, shipped dates, or `.planning/STATE.md` strings.
  2. Any retained planning or archive audit runs through a separate explicit command or documented path outside the authoritative root release gate.
  3. `README.md`, `AGENTS.md`, and related package release guidance describe the updated runtime-first gate and separate planning audit path consistently.
**Plans**: 2 plans

Plans:
- [ ] 19-01-PLAN.md — Remove `.planning` archive-state coupling from the authoritative root release governance tests
- [ ] 19-02-PLAN.md — Align root release documentation with the updated gate and separate planning audit path

### Phase 20: Conditional Secondary-Surface Verification
**Goal**: Maintainers can discover and run secondary-surface verification intentionally, with package-local dependency declarations and without turning those checks into unconditional root release prerequisites.
**Depends on**: Phase 19
**Requirements**: SURF-01, SURF-02, SURF-03
**Success Criteria** (what must be TRUE):
  1. Maintainers can find demo and Babylon verification commands from package manifests or top-level docs without relying on ad-hoc maintainer knowledge.
  2. `packages/occt-babylon-loader` verification runs from declared package dependencies instead of undeclared hoisted Babylon installs.
  3. Secondary-surface checks are explicitly documented and organized as conditional follow-up verification for changes under `demo/`, `demo/src-tauri/`, or Babylon package surfaces rather than unconditional root npm release prerequisites.
**Plans**: 2 plans

Plans:
- [ ] 20-01-PLAN.md — Surface demo and Babylon verification commands in the relevant package manifests and top-level guidance
- [ ] 20-02-PLAN.md — Remove hoist-only assumptions and codify conditional secondary-surface coverage

## Progress

**Execution Order:**
Phases execute in numeric order: 18 → 19 → 20

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 18. Runtime Path Contract Alignment | 0/2 | Not started | - |
| 19. Root Release Governance Decoupling | 0/2 | Not started | - |
| 20. Conditional Secondary-Surface Verification | 0/2 | Not started | - |
