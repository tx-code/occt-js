# Roadmap: occt-js

## Milestones

- 🚧 **v1.9 Generic Profile Solids** - Phases 30-32 (active)
- ✅ [v1.8 Wasm+JS Revolved Shape Generation](./milestones/v1.8-ROADMAP.md) — Phases 27-29, shipped 2026-04-21
- ✅ [v1.7 Exact Lifecycle & Performance](./milestones/v1.7-ROADMAP.md) — Phases 24-26, shipped 2026-04-20
- ✅ [v1.6 Exact Semantics Helpers](./milestones/v1.6-ROADMAP.md) — Phases 21-23, shipped 2026-04-18
- ✅ [v1.5 Root Release Hardening](./milestones/v1.5-ROADMAP.md) — Phases 18-20, shipped 2026-04-18
- ✅ [v1.4 Exact Measurement Placement & Relation SDK](./milestones/v1.4-ROADMAP.md) — Phases 15-17, shipped 2026-04-16
- ✅ [v1.3 Appearance Expansion](./milestones/v1.3-ROADMAP.md) — Phases 12-14, shipped 2026-04-15
- ✅ [v1.2 Import Appearance Contract](./milestones/v1.2-ROADMAP.md) — Phases 9-11, shipped 2026-04-15
- ✅ [v1.1 Exact BRep Measurement Foundation](./milestones/v1.1-ROADMAP.md) — Phases 5-8, shipped 2026-04-15
- ✅ [v1.0 OCCT Wasm Runtime Hardening](./milestones/v1.0-ROADMAP.md) — Phases 1-4, shipped 2026-04-14

## Overview

`v1.9` extends the generic geometry contract beyond revolve without reopening tool ownership. The milestone introduces one shared 2D profile kernel, linear extruded-shape validate/build/exact-open flows, and package-first SDK/governance coverage while keeping sketch UX, feature stacks, and app-specific schemas downstream.

## Phases

<details>
<summary>Phase Numbering</summary>

- Integer phases (30, 31, 32): Planned milestone work
- Decimal phases (30.1, 30.2): Urgent insertions (marked with INSERTED)

</details>

- [x] **Phase 30: Shared Profile Kernel** - Define one reusable 2D profile contract and validation seam that multiple generated-solid families can share.
- [ ] **Phase 31: Linear Extruded Shape Runtime** - Add additive root Wasm APIs for validating, building, and exact-opening linear extruded solids with stable semantic face bindings.
- [ ] **Phase 32: occt-core SDK & Governance for Profile Solids** - Publish package-first wrappers, typings, docs, and release coverage for the shared-profile and extruded-shape contract.

## Phase Details

### Phase 30: Shared Profile Kernel
**Goal**: Downstream JS can define one reusable 2D profile contract for profile-driven solids while existing revolved-shape behavior stays stable.
**Depends on**: Phase 29
**Requirements**: PROF-01, PROF-02, PROF-03
**Success Criteria** (what must be TRUE):
  1. The root runtime owns one shared line/arc profile normalization and validation seam reused by revolved shapes and ready for future solid families.
  2. Typed diagnostics cover continuity, closure, unsupported segment data, and degenerate profile input before OCCT construction runs.
  3. Existing revolved-shape APIs reuse the shared profile kernel without public contract drift or validation regressions.
**Plans**: 2 plans

Plans:
- [x] 30-01-PLAN.md — Define shared 2D profile DTOs, diagnostics, and root/runtime validation seam
- [x] 30-02-PLAN.md — Refactor revolved-shape runtime to consume the shared profile kernel without public API regressions

### Phase 31: Linear Extruded Shape Runtime
**Goal**: Downstream JS can validate, build, and exact-open linear extruded solids from shared profiles with stable semantic face bindings.
**Depends on**: Phase 30
**Requirements**: EXTR-01, EXTR-02, MAP-03, MAP-04
**Success Criteria** (what must be TRUE):
  1. The root runtime exposes additive extruded-shape validate/build/exact-open flows that return canonical scene payloads and retained exact handles.
  2. Stable face bindings preserve profile segment provenance and explicit `wall`, `start_cap`, and `end_cap` roles instead of face-order assumptions.
  3. Deterministic default appearance groups derive from runtime segment tags and roles for representative prismatic profiles without caller-supplied colors.
**Plans**: 2 plans

Plans:
- [ ] 31-01-PLAN.md — Add linear extruded-shape build and exact-open flows on top of the shared profile kernel
- [ ] 31-02-PLAN.md — Capture stable extruded face bindings, runtime roles, and semantic appearance groups

### Phase 32: occt-core SDK & Governance for Profile Solids
**Goal**: Shared profiles and extruded shapes ship package-first through `@tx-code/occt-core`, published typings, docs, and authoritative release coverage.
**Depends on**: Phase 31
**Requirements**: SDK-02, GOV-02
**Success Criteria** (what must be TRUE):
  1. `@tx-code/occt-core` exposes typed wrappers for shared profile validation and extruded-shape validate, build, and exact-open flows suitable for downstream JS consumers.
  2. Root and package docs describe the shared-profile/profile-solid contract generically while keeping app-specific schema ownership downstream.
  3. Tarball, typings, and authoritative release-governance coverage fail on drift in the shared-profile or extruded-shape surface without widening unconditional secondary-surface checks.
**Plans**: 2 plans

Plans:
- [ ] 32-01-PLAN.md — Add package-first `occt-core` wrappers and published typings for shared profiles and extruded shapes
- [ ] 32-02-PLAN.md — Lock docs, packaged contract tests, and release-governance coverage for profile solids

## Progress

**Execution Order:**
Phases execute in numeric order: 30 → 31 → 32

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 30. Shared Profile Kernel | v1.9 | 2/2 | Complete | 2026-04-21 |
| 31. Linear Extruded Shape Runtime | v1.9 | 0/2 | Not started | — |
| 32. occt-core SDK & Governance for Profile Solids | v1.9 | 0/2 | Not started | — |
| 27. Revolved Shape Spec & Wasm Builder | v1.8 | 2/2 | Complete | 2026-04-20 |
| 28. Exact Revolved Shapes & Binding Semantics | v1.8 | 2/2 | Complete | 2026-04-21 |
| 29. occt-core SDK & Governance for Revolved Shapes | v1.8 | 2/2 | Complete | 2026-04-21 |
