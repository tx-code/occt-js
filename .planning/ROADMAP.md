# Roadmap: occt-js

## Milestones

- 🚧 **v1.10 Exact Measurement Demo Loop** - Phases 33-35 plus inserted 33.1 (active)
- ✅ [v1.9 Generic Profile Solids](./milestones/v1.9-ROADMAP.md) — Phases 30-32, shipped 2026-04-21
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

`v1.10` reuses the shipped exact measurement kernel and package-first wrappers, but the demo target has now widened from a single-model loop to a workpiece-plus-tool workflow. The milestone keeps retained exact state alive beside rendered scene data, introduces a multi-actor workspace for imported models plus generated tools, bridges Babylon selections into actor-scoped occurrence-safe exact refs, runs supported measurements, and verifies a minimal placement-backed demo experience without widening the authoritative root release boundary unnecessarily.

## Phases

<details>
<summary>Phase Numbering</summary>

- Integer phases (33, 34, 35): Planned milestone work
- Decimal phases (33.1, 33.2): Urgent insertions (marked with INSERTED)

</details>

- [x] **Phase 33: Demo Exact Session Bridge** - Retain managed exact models in the demo load path and dispose or replace them cleanly across reset and model changes.
- [ ] **Phase 33.1 (INSERTED): Multi-Actor Exact Workspace** - Keep an imported workpiece and generated tool alive in one actor-scoped workspace, support movable tool pose, and unblock cross-model exact measurement.
- [ ] **Phase 34: Measurement Commands & Overlay MVP** - Execute supported exact measurements from actor-scoped demo selections and expose typed results plus minimal placement-backed inspection output.
- [ ] **Phase 35: Demo Docs & Verification** - Lock the demo measurement workflow through docs, tests, and conditional secondary-surface governance.

## Phase Details

### Phase 33: Demo Exact Session Bridge
**Goal**: The browser demo retains a managed exact model alongside rendered scene data and replaces or clears it deterministically across import, generated-shape, and reset flows.
**Depends on**: Phase 32
**Requirements**: DEMO-01
**Success Criteria** (what must be TRUE):
  1. The demo import or generated-shape load path retains a managed exact model and disposes or replaces it cleanly on reload, reset, or model switch.
  2. Imported CAD and generated revolved shapes converge on one demo-owned retained-session contract instead of splitting lifecycle by source family.
  3. Orientation changes remain presentation-only and do not silently reopen the exact model or leak stale handles.
**Plans**: 1 plan

Plans:
- [x] 33-01-PLAN.md — Retain managed exact models across demo import and reset lifecycle

### Phase 33.1 (INSERTED): Multi-Actor Exact Workspace
**Goal**: The browser demo can keep an imported workpiece and generated tool alive in one shared workspace, move the tool independently, and prepare actor-scoped exact refs for cross-model measurement.
**Depends on**: Phase 33
**Requirements**: DEMO-02, DEMO-03, MEAS-04
**Success Criteria** (what must be TRUE):
  1. The demo can hold at least two actor types simultaneously, with separate retained exact sessions, actor ids, and pose state for an imported workpiece and a generated tool.
  2. Tool movement updates actor-scoped transforms used by both rendering and downstream exact measurement flows rather than creating a Babylon-only pose shortcut.
  3. The runtime or package surface grows only as needed to support pairwise exact measurements across different retained exact models, while preserving existing same-model behavior.
**Plans**: 2 plans

Plans:
- [ ] 33.1-01-PLAN.md — Introduce a multi-actor demo workspace and actor-scoped retained exact-session state
- [ ] 33.1-02-PLAN.md — Add additive cross-model exact pairwise support and actor-aware selection bridging

### Phase 34: Measurement Commands & Overlay MVP
**Goal**: The browser demo can run supported exact measurements from current actor-scoped selections and surface both typed results and minimal placement-backed inspection output.
**Depends on**: Phase 33.1
**Requirements**: MEAS-01, MEAS-02, MEAS-03
**Success Criteria** (what must be TRUE):
  1. Supported single-actor and workpiece-tool selection combinations can execute exact distance, angle, thickness, radius or diameter, edge-length, and face-area workflows from the demo UI and surface typed results or explicit unsupported feedback.
  2. Placement-backed measurements expose anchors, frames, or guide geometry through a demo-owned overlay or inspection MVP without changing the shipped root DTO contracts.
  3. Users can clear, rerun, and compare measurements during one loaded-model session without leaked handles, stale selections, or orphaned overlay state.
**Plans**: 2 plans

Plans:
- [ ] 34-01-PLAN.md — Add measurement action runner and typed results panel for supported exact workflows
- [ ] 34-02-PLAN.md — Render placement-backed measurement overlay and inspection state in the demo scene

### Phase 35: Demo Docs & Verification
**Goal**: The measurement demo loop is documented, tested, and explicitly governed as a secondary-surface workflow.
**Depends on**: Phase 34
**Requirements**: DOCS-05, E2E-01, GOV-03
**Success Criteria** (what must be TRUE):
  1. Demo and package docs explain the measurement workflow, supported selection-to-measure mappings, and exact-model lifecycle expectations.
  2. Automated demo coverage exercises import or generated-shape load, selection, measurement execution, and reset or disposal behavior.
  3. Secondary-surface verification stays explicit and conditional; `npm run test:release:root` remains the authoritative root release gate.
**Plans**: 2 plans

Plans:
- [ ] 35-01-PLAN.md — Document the measurement demo workflow, supported mappings, and lifecycle constraints
- [ ] 35-02-PLAN.md — Add demo verification and conditional governance coverage for measurement integration

## Progress

**Execution Order:**
Phases execute in numeric order: 33 → 33.1 → 34 → 35

| Milestone | Phases | Status | Shipped |
|-----------|--------|--------|---------|
| v1.10 Exact Measurement Demo Loop | 33-35 plus inserted 33.1 | Active | — |
| v1.9 Generic Profile Solids | 30-32 | Complete | 2026-04-21 |
| v1.8 Wasm+JS Revolved Shape Generation | 27-29 | Complete | 2026-04-21 |
| v1.7 Exact Lifecycle & Performance | 24-26 | Complete | 2026-04-20 |
| v1.6 Exact Semantics Helpers | 21-23 | Complete | 2026-04-18 |
| v1.5 Root Release Hardening | 18-20 | Complete | 2026-04-18 |
| v1.4 Exact Measurement Placement & Relation SDK | 15-17 | Complete | 2026-04-16 |
| v1.3 Appearance Expansion | 12-14 | Complete | 2026-04-15 |
| v1.2 Import Appearance Contract | 9-11 | Complete | 2026-04-15 |
| v1.1 Exact BRep Measurement Foundation | 5-8 | Complete | 2026-04-15 |
| v1.0 OCCT Wasm Runtime Hardening | 1-4 | Complete | 2026-04-14 |

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 33. Demo Exact Session Bridge | v1.10 | 1/1 | Complete | 2026-04-21 |
| 33.1. Multi-Actor Exact Workspace | v1.10 | 0/2 | Planned | — |
| 34. Measurement Commands & Overlay MVP | v1.10 | 0/2 | Planned | — |
| 35. Demo Docs & Verification | v1.10 | 0/2 | Planned | — |
| 30. Shared Profile Kernel | v1.9 | 2/2 | Complete | 2026-04-21 |
| 31. Linear Extruded Shape Runtime | v1.9 | 2/2 | Complete | 2026-04-21 |
| 32. occt-core SDK & Governance for Profile Solids | v1.9 | 2/2 | Complete | 2026-04-21 |
