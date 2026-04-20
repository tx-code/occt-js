# Roadmap: occt-js

## Milestones

- 🚧 **v1.8 Wasm+JS Revolved Tool Generation** - Phases 27-29 (active)
- ✅ [v1.7 Exact Lifecycle & Performance](./milestones/v1.7-ROADMAP.md) — Phases 24-26, shipped 2026-04-20
- ✅ [v1.6 Exact Semantics Helpers](./milestones/v1.6-ROADMAP.md) — Phases 21-23, shipped 2026-04-18
- ✅ [v1.5 Root Release Hardening](./milestones/v1.5-ROADMAP.md) — Phases 18-20, shipped 2026-04-18
- ✅ [v1.4 Exact Measurement Placement & Relation SDK](./milestones/v1.4-ROADMAP.md) — Phases 15-17, shipped 2026-04-16
- ✅ [v1.3 Appearance Expansion](./milestones/v1.3-ROADMAP.md) — Phases 12-14, shipped 2026-04-15
- ✅ [v1.2 Import Appearance Contract](./milestones/v1.2-ROADMAP.md) — Phases 9-11, shipped 2026-04-15
- ✅ [v1.1 Exact BRep Measurement Foundation](./milestones/v1.1-ROADMAP.md) — Phases 5-8, shipped 2026-04-15
- ✅ [v1.0 OCCT Wasm Runtime Hardening](./milestones/v1.0-ROADMAP.md) — Phases 1-4, shipped 2026-04-14

## Overview

`v1.7` is now shipped and archived. `v1.8` adds a package-first Wasm+JS surface for app-neutral revolved tool generation. The milestone centers on one normalized revolved profile spec, additive build and exact-open flows, stable segment-to-face binding semantics, and governance-locked `occt-core` wrappers without turning the runtime into a tool-library manager or viewer framework.

## Phases

<details>
<summary>Phase Numbering</summary>

- Integer phases (27, 28, 29): Planned milestone work
- Decimal phases (27.1, 27.2): Urgent insertions (marked with INSERTED)

</details>

- [ ] **Phase 27: Revolved Tool Spec & Wasm Builder** - Add additive root Wasm APIs for validating an app-neutral revolved tool spec and building scene-compatible generated tool geometry.
- [ ] **Phase 28: Exact Generated Tools & Binding Semantics** - Preserve exact generated tool state plus stable segment-to-face, closure, and cap semantics for downstream reasoning.
- [ ] **Phase 29: occt-core SDK & Governance for Generated Tools** - Publish package-first wrappers, typings, docs, and release coverage for the revolved tool contract.

## Phase Details

### Phase 27: Revolved Tool Spec & Wasm Builder
**Goal**: Downstream JS can validate and build generated revolved tool geometry from one app-neutral profile contract without importing app-specific tool schemas into the root runtime.
**Depends on**: Phase 26
**Requirements**: TOOL-01, TOOL-02, TOOL-03, GEOM-01
**Success Criteria** (what must be TRUE):
  1. The root Wasm carrier exposes additive validate and build entry points that accept the agreed revolved profile spec and return typed diagnostics for malformed input.
  2. Supported line and circular-arc profile segments, unit normalization, explicit or auto-axis closure, and full or partial revolve produce structured scene data compatible with existing runtime consumers.
  3. Representative endmill-like and drill-like profiles build successfully without introducing app-specific schema ownership or adapter logic into the root runtime.
**Plans**: 2 plans

Plans:
- [ ] 27-01-PLAN.md — Define the revolved tool spec, validation rules, and JS/Wasm binding surface
- [ ] 27-02-PLAN.md — Implement OCCT revolve construction, triangulation, and scene export for generated tools

### Phase 28: Exact Generated Tools & Binding Semantics
**Goal**: Generated revolved tools preserve exact-model utility and explicit face-binding semantics that downstream apps can consume deterministically.
**Depends on**: Phase 27
**Requirements**: GEOM-02, GEOM-03, MAP-01, MAP-02
**Success Criteria** (what must be TRUE):
  1. Generated tool flows can return retained exact-model handles and geometry bindings compatible with the existing exact query and lifecycle surface.
  2. Segment-to-face bindings include segment index plus optional id or tag, and closure, axis, cap, or degenerated surfaces are reported with explicit system roles instead of relying on face order.
  3. Generated tool meshes expose deterministic default appearance or material grouping derived from runtime-side segment tags and roles without caller-supplied colors.
**Plans**: 2 plans

Plans:
- [ ] 28-01-PLAN.md — Add exact-open generated tool flows and retained exact-model bindings
- [ ] 28-02-PLAN.md — Capture OCCT revolve history into stable segment-to-face and role-aware result DTOs

### Phase 29: occt-core SDK & Governance for Generated Tools
**Goal**: The revolved tool surface ships package-first through `@tx-code/occt-core`, published typings, docs, and authoritative release coverage.
**Depends on**: Phase 28
**Requirements**: SDK-01, GOV-01
**Success Criteria** (what must be TRUE):
  1. `@tx-code/occt-core` exposes typed wrappers for revolved tool validation, build, and exact-open flows suitable for downstream JS consumers.
  2. Root and package docs describe the generated tool contract package-first while preserving the runtime-first product boundary.
  3. Tarball, typings, and authoritative release-governance coverage fail on drift in the revolved tool surface without widening unconditional secondary-surface checks.
**Plans**: 2 plans

Plans:
- [ ] 29-01-PLAN.md — Add package-first `occt-core` wrappers and published typings for generated tools
- [ ] 29-02-PLAN.md — Lock docs, packaged contract tests, and release-governance coverage for generated tools

## Progress

**Execution Order:**
Phases execute in numeric order: 27 → 28 → 29

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 27. Revolved Tool Spec & Wasm Builder | v1.8 | 0/2 | Pending | — |
| 28. Exact Generated Tools & Binding Semantics | v1.8 | 0/2 | Pending | — |
| 29. occt-core SDK & Governance for Generated Tools | v1.8 | 0/2 | Pending | — |
| 24. Exact Model Lifecycle Governance | v1.7 | 2/2 | Complete | 2026-04-20 |
| 25. Exact Query & Store Performance | v1.7 | 2/2 | Complete | 2026-04-20 |
| 26. Import Staging & Long-Session Verification | v1.7 | 2/2 | Complete | 2026-04-20 |
