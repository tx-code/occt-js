# Roadmap: occt-js

## Milestones

- 🚧 **v1.6 Exact Semantics Helpers** - Phases 21-23 (active)
- ✅ [v1.5 Root Release Hardening](./milestones/v1.5-ROADMAP.md) — Phases 18-20, shipped 2026-04-18
- ✅ [v1.4 Exact Measurement Placement & Relation SDK](./milestones/v1.4-ROADMAP.md) — Phases 15-17, shipped 2026-04-16
- ✅ [v1.3 Appearance Expansion](./milestones/v1.3-ROADMAP.md) — Phases 12-14, shipped 2026-04-15
- ✅ [v1.2 Import Appearance Contract](./milestones/v1.2-ROADMAP.md) — Phases 9-11, shipped 2026-04-15
- ✅ [v1.1 Exact BRep Measurement Foundation](./milestones/v1.1-ROADMAP.md) — Phases 5-8, shipped 2026-04-15
- ✅ [v1.0 OCCT Wasm Runtime Hardening](./milestones/v1.0-ROADMAP.md) — Phases 1-4, shipped 2026-04-14

## Overview

This roadmap moves `occt-js` from exact kernel foundations into package-first helper semantics. `v1.6` focuses on additive helper APIs such as `hole`, `chamfer`, `equal-distance`, `symmetry`, and `midpoint`, while preserving the runtime-first release boundary and keeping viewer/session workflows downstream.

## Phases

**Phase Numbering:**
- Integer phases (21, 22, 23): Planned milestone work
- Decimal phases (21.1, 21.2): Urgent insertions (marked with INSERTED)

- [x] **Phase 21: Hole Helper Foundations** - Add package-first hole helper semantics with occurrence-safe DTOs and only the minimal additive runtime support needed for supported cases.
- [ ] **Phase 22: Chamfer & Constraint Helpers** - Extend the helper surface to supported chamfer cases plus equal-distance, symmetry, midpoint, and similar reusable helper semantics.
- [ ] **Phase 23: Helper SDK Docs & Governance** - Lock the exact helper surface into docs, typings, tarball expectations, and authoritative release governance without widening secondary-surface release gates.

## Phase Details

### Phase 21: Hole Helper Foundations
**Goal**: Downstream JS can request package-first hole helper semantics from exact refs while the runtime/package boundary stays additive, occurrence-safe, and free of viewer/session policy.
**Depends on**: Phase 20
**Requirements**: FEAT-03, ADAPT-09
**Completed**: 2026-04-18
**Success Criteria** (what must be TRUE):
  1. `@tx-code/occt-core` exposes package-first hole helper APIs that return stable typed outputs and explicit unsupported/failure results for supported hole cases.
  2. Hole helper outputs preserve occurrence transforms plus supporting geometry conventions already used by the exact placement/relation surface.
  3. Any new root/runtime support introduced for hole helpers is minimal, additive, and justified by helper composition needs rather than viewer semantics.
**Plans**: 2 plans

Plans:
- [x] 21-01-PLAN.md — Define package-first hole helper DTOs and `occt-core` APIs
- [x] 21-02-PLAN.md — Add only the minimal runtime support required for supported hole helper cases

### Phase 22: Chamfer & Constraint Helpers
**Goal**: Downstream JS can request supported chamfer semantics and higher-level reusable helper relations such as equal-distance, symmetry, and midpoint without inventing viewer policy in the runtime/package layer.
**Depends on**: Phase 21
**Requirements**: FEAT-04, FEAT-05
**Success Criteria** (what must be TRUE):
  1. `@tx-code/occt-core` exposes package-first chamfer helper semantics with stable typed outputs and explicit unsupported/failure results for supported cases.
  2. Downstream JS can request equal-distance, symmetry, midpoint, or similar helper semantics using the shipped exact placement/relation foundation instead of app-side one-off geometry math.
  3. The new helper family remains additive and follows the occurrence-safe DTO and failure conventions established in Phase 21.
**Plans**: 2 plans

Plans:
- [ ] 22-01-PLAN.md — Add package-first chamfer helper semantics over shipped exact refs
- [ ] 22-02-PLAN.md — Add equal-distance, symmetry, midpoint, and similar reusable helper semantics

### Phase 23: Helper SDK Docs & Governance
**Goal**: The exact helper surface is package-first, documented, typed, packaged, and enforced by the authoritative release governance path.
**Depends on**: Phase 22
**Requirements**: DOCS-03, GOV-04
**Success Criteria** (what must be TRUE):
  1. Root and package docs describe the helper workflows package-first through `@tx-code/occt-core`, while keeping viewer workflows and session policy explicitly out of scope.
  2. Public typings and packaged entrypoints expose the finalized helper surface required by downstream consumers.
  3. Governance and release tests fail if helper docs, typings, tarball surfaces, or release-boundary wording drift from the implemented contract.
**Plans**: 2 plans

Plans:
- [ ] 23-01-PLAN.md — Write package-first helper SDK docs and root reference guidance
- [ ] 23-02-PLAN.md — Extend typings, tarball checks, and release governance for exact helper semantics

## Progress

**Execution Order:**
Phases execute in numeric order: 21 → 22 → 23

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 21. Hole Helper Foundations | v1.6 | 2/2 | Complete | 2026-04-18 |
| 22. Chamfer & Constraint Helpers | v1.6 | 0/2 | Not started | - |
| 23. Helper SDK Docs & Governance | v1.6 | 0/2 | Not started | - |
