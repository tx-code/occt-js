# Roadmap: occt-js

## Milestones

- 🚧 **v1.7 Exact Lifecycle & Performance** - Phases 24-26 (active)
- ✅ [v1.6 Exact Semantics Helpers](./milestones/v1.6-ROADMAP.md) — Phases 21-23, shipped 2026-04-18
- ✅ [v1.5 Root Release Hardening](./milestones/v1.5-ROADMAP.md) — Phases 18-20, shipped 2026-04-18
- ✅ [v1.4 Exact Measurement Placement & Relation SDK](./milestones/v1.4-ROADMAP.md) — Phases 15-17, shipped 2026-04-16
- ✅ [v1.3 Appearance Expansion](./milestones/v1.3-ROADMAP.md) — Phases 12-14, shipped 2026-04-15
- ✅ [v1.2 Import Appearance Contract](./milestones/v1.2-ROADMAP.md) — Phases 9-11, shipped 2026-04-15
- ✅ [v1.1 Exact BRep Measurement Foundation](./milestones/v1.1-ROADMAP.md) — Phases 5-8, shipped 2026-04-15
- ✅ [v1.0 OCCT Wasm Runtime Hardening](./milestones/v1.0-ROADMAP.md) — Phases 1-4, shipped 2026-04-14

## Overview

This roadmap hardens the shipped exact runtime and helper surface before any broader expansion. `v1.7` focuses on retained-handle lifecycle safety, retained-query/store and import-staging performance, and long-session governance, while preserving the runtime-first root release boundary and deferring ecosystem cleanup to `v1.8`.

## Phases

<details>
<summary>Phase Numbering</summary>

- Integer phases (24, 25, 26): Planned milestone work
- Decimal phases (24.1, 24.2): Urgent insertions (marked with INSERTED)

</details>

- [ ] **Phase 24: Exact Model Lifecycle Governance** - Harden retained exact-model release semantics, diagnostics, and package-first disposal helpers without adding viewer-owned policy.
- [ ] **Phase 25: Exact Query & Store Performance** - Remove avoidable retained-query/store copies and import-staging overhead that penalize large-model exact workflows.
- [ ] **Phase 26: Import Staging & Long-Session Verification** - Lock lifecycle/performance docs, governance, and long-session verification without widening unconditional secondary-surface release gates.

## Phase Details

### Phase 24: Exact Model Lifecycle Governance
**Goal**: Downstream JS can manage retained exact-model lifetimes safely through explicit release semantics, additive package helpers, and caller-facing diagnostics.
**Depends on**: Phase 23
**Requirements**: LIFE-01, LIFE-02, ADAPT-10
**Success Criteria** (what must be TRUE):
  1. Released, missing, or stale exact-model handles fail deterministically with typed diagnostics or failures that downstream callers can reason about.
  2. `@tx-code/occt-core` exposes additive lifecycle helpers or wrappers that keep explicit release authoritative and avoid viewer-owned or global disposal policy.
  3. Lifecycle hardening remains additive and source-compatible with the shipped exact query and helper APIs.
**Plans**: 2 plans

Plans:
- [ ] 24-01-PLAN.md — Tighten exact-model lifetime semantics and diagnostics in the root/runtime layer
- [ ] 24-02-PLAN.md — Add package-first disposal helpers and lifecycle contract coverage

### Phase 25: Exact Query & Store Performance
**Goal**: Large-model exact workflows pay less avoidable overhead in retained-model access, exact-query execution, and import staging.
**Depends on**: Phase 24
**Requirements**: PERF-01, PERF-02
**Success Criteria** (what must be TRUE):
  1. Avoidable retained-store or exact-query copy costs are reduced in the hot paths used by downstream exact workflows.
  2. Import staging paths such as IGES avoid redundant temp-file work or clearly bound that cost so large-model workflows do not regress silently.
  3. Repeatable regression coverage or benchmarks make lifecycle/performance regressions visible before release.
**Plans**: 2 plans

Plans:
- [ ] 25-01-PLAN.md — Reduce retained-model store and exact-query copy overhead
- [ ] 25-02-PLAN.md — Reduce import staging cost and add large-model performance regression coverage

### Phase 26: Import Staging & Long-Session Verification
**Goal**: Lifecycle and performance expectations are package-first, documented, and enforced by the authoritative governance path plus explicit long-session verification.
**Depends on**: Phase 25
**Requirements**: DOCS-04, GOV-05
**Success Criteria** (what must be TRUE):
  1. Root and package docs explain explicit disposal expectations, diagnostics, and performance-sensitive usage patterns without overpromising GC semantics.
  2. Release governance fails if lifecycle/performance docs, package contracts, or verification routing drift from the implemented surface.
  3. The milestone closes with long-session or soak-style verification evidence suitable for downstream release confidence.
**Plans**: 2 plans

Plans:
- [ ] 26-01-PLAN.md — Publish exact lifecycle and performance guidance package-first
- [ ] 26-02-PLAN.md — Extend release governance and long-session verification for lifecycle/performance

## Progress

**Execution Order:**
Phases execute in numeric order: 24 → 25 → 26

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 24. Exact Model Lifecycle Governance | v1.7 | 0/2 | Not started | - |
| 25. Exact Query & Store Performance | v1.7 | 0/2 | Not started | - |
| 26. Import Staging & Long-Session Verification | v1.7 | 0/2 | Not started | - |
