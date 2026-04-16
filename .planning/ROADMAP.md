# Roadmap: occt-js

## Milestones

- 🚧 **v1.4 Exact Measurement Placement & Relation SDK** - Phases 15-17 (active)
- ✅ [v1.3 Appearance Expansion](./milestones/v1.3-ROADMAP.md) — Phases 12-14, shipped 2026-04-15
- ✅ [v1.2 Import Appearance Contract](./milestones/v1.2-ROADMAP.md) — Phases 9-11, shipped 2026-04-15
- ✅ [v1.1 Exact BRep Measurement Foundation](./milestones/v1.1-ROADMAP.md) — Phases 5-8, shipped 2026-04-15
- ✅ [v1.0 OCCT Wasm Runtime Hardening](./milestones/v1.0-ROADMAP.md) — Phases 1-4, shipped 2026-04-14

## Overview

This roadmap keeps `occt-js` centered on the runtime-first Wasm carrier. `v1.4` extends the shipped exact measurement foundation into a reusable placement and relation SDK so downstream apps can build measurement overlays and workflows on top of stable geometry-support DTOs instead of re-deriving `PrsDim` behavior themselves.

## Phases

**Phase Numbering:**
- Integer phases (15, 16, 17): Planned milestone work
- Decimal phases (15.1, 15.2): Urgent insertions (marked with INSERTED)

- [x] **Phase 15: Placement Contract Hardening** - Add exact placement helpers and package parity for distance, angle, radius, diameter, and thickness.
- [ ] **Phase 16: Exact Relation Classifier Contract** - Add exact relation classification for common geometric relations and package parity for supporting geometry DTOs.
- [ ] **Phase 17: SDK Docs & Governance** - Finalize package-first SDK docs, typings, tarball guidance, and release governance for the placement/relation surface.

## Phase Details

### Phase 15: Placement Contract Hardening
**Goal**: Expose stable exact placement helpers at the root Wasm and `occt-core` layers so downstream apps can consume anchors, frames, and axis data without depending on viewer-specific code.
**Depends on**: Phase 14
**Requirements**: PLCT-01, PLCT-02, PLCT-03, PLCT-04, ADAPT-07
**UI hint**: no
**Canonical refs**: src/exact-query.cpp, src/js-interface.cpp, dist/occt-js.d.ts, packages/occt-core/src/occt-core.js, test/exact_placement_contract.test.mjs, packages/occt-core/test/core.test.mjs
**Success Criteria** (what must be TRUE):
  1. Root Wasm exposes placement helpers for exact distance, angle, and thickness that return stable anchors plus full working-plane frames for occurrence-aware refs.
  2. Root Wasm exposes placement helpers for exact radius and diameter that return stable center, anchor, axis, and frame data for supported circular geometry.
  3. `@tx-code/occt-core` wraps the placement helpers with package-first exact-ref APIs and preserves occurrence transforms without inventing viewer-specific abstractions.
**Plans**: 2 plans

Plans:
- [x] 15-01-PLAN.md — Add root placement helper DTOs and pairwise placement bindings
- [x] 15-02-PLAN.md — Add circular placement helpers and `occt-core` placement adapter parity

### Phase 16: Exact Relation Classifier Contract
**Goal**: Add a unified exact relation classifier so downstream apps can consume stable relation semantics and supporting geometry without embedding `PrsDim`-style logic in app code.
**Depends on**: Phase 15
**Requirements**: REL-01, REL-02, REL-03, ADAPT-08
**UI hint**: no
**Canonical refs**: src/exact-query.cpp, src/js-interface.cpp, dist/occt-js.d.ts, packages/occt-core/src/occt-core.js, test/exact_relation_contract.test.mjs, packages/occt-core/test/core.test.mjs
**Success Criteria** (what must be TRUE):
  1. Root Wasm can classify `parallel`, `perpendicular`, `concentric`, `tangent`, and `none` for supported exact-ref combinations and return supporting geometry where meaningful.
  2. Valid non-related refs return `none`, while invalid or unsupported inputs use shared typed failures instead of ambiguous empty payloads.
  3. `@tx-code/occt-core` exposes package-first relation classification that preserves occurrence transforms and normalizes supporting geometry DTOs for downstream JS consumers.
**Plans**: 2 plans

Plans:
- [ ] 16-01-PLAN.md — Add root exact relation classifier semantics and supporting geometry DTOs
- [ ] 16-02-PLAN.md — Normalize relation classifier adapters and failure parity in `occt-core`

### Phase 17: SDK Docs & Governance
**Goal**: Lock the exact placement and relation SDK contract into package-first docs, public typings, packaged surfaces, and the authoritative root release gate.
**Depends on**: Phase 16
**Requirements**: DOCS-01, GOV-01
**UI hint**: no
**Canonical refs**: README.md, packages/occt-core/README.md, docs/sdk/measurement.md, dist/occt-js.d.ts, test/release_governance_contract.test.mjs, test/package_tarball_contract.test.mjs, AGENTS.md
**Success Criteria** (what must be TRUE):
  1. Root and package docs describe placement and relation workflows package-first, while keeping overlay rendering and measurement UX outside the runtime/package boundary.
  2. Public typings and packaged entrypoints expose the finalized placement/relation surface required by downstream consumers.
  3. Governance and release tests fail if placement/relation docs, typings, tarball surfaces, or milestone-state expectations drift from the implemented contract.
**Plans**: 2 plans

Plans:
- [ ] 17-01-PLAN.md — Write package-first SDK docs and root reference guidance for placement and relations
- [ ] 17-02-PLAN.md — Extend typings, tarball checks, and release governance for the measurement SDK contract

## Progress

**Execution Order:**
Phases execute in numeric order: 15 → 16 → 17

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 15. Placement Contract Hardening | 2/2 | Complete | 2026-04-16 |
| 16. Exact Relation Classifier Contract | 0/2 | Planned | — |
| 17. SDK Docs & Governance | 0/2 | Planned | — |
