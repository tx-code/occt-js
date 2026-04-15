# Roadmap: occt-js

## Milestones

- 🚧 **v1.3 Appearance Expansion** - Phases 12-14 (active)
- ✅ [v1.2 Import Appearance Contract](./milestones/v1.2-ROADMAP.md) — Phases 9-11, shipped 2026-04-15
- ✅ [v1.1 Exact BRep Measurement Foundation](./milestones/v1.1-ROADMAP.md) — Phases 5-8, shipped 2026-04-15
- ✅ [v1.0 OCCT Wasm Runtime Hardening](./milestones/v1.0-ROADMAP.md) — Phases 1-4, shipped 2026-04-14

## Overview

This roadmap keeps `occt-js` centered on the runtime-first Wasm carrier. `v1.3` extends the shipped import appearance contract beyond a single fallback color into package-level opacity and preset controls, so downstream apps can express richer import-time appearance policy without patching materials after import.

## Phases

**Phase Numbering:**
- Integer phases (12, 13, 14): Planned milestone work
- Decimal phases (12.1, 12.2): Urgent insertions (marked with INSERTED)

- [x] **Phase 12: Root Alpha & Opacity Fallback** - Add explicit opacity-fallback controls to the root import APIs while keeping legacy appearance behavior deterministic.
- [ ] **Phase 13: Appearance Preset & Adapter Parity** - Add named appearance presets and align read/openExact/`occt-core` semantics around the expanded contract.
- [ ] **Phase 14: Appearance Expansion Governance** - Finalize docs, typings, tarball guidance, and release governance for the expanded appearance contract.

## Phase Details

### Phase 12: Root Alpha & Opacity Fallback
**Goal**: Add explicit alpha or opacity fallback controls to the root Wasm carrier so default appearance can express transparency policy without viewer-side material patching.
**Depends on**: Phase 11
**Requirements**: APPR-06
**UI hint**: no
**Canonical refs**: src/importer.hpp, src/js-interface.cpp, src/importer-xde.cpp, src/importer-brep.cpp, dist/occt-js.d.ts, test/import_appearance_contract.test.mjs
**Success Criteria** (what must be TRUE):
  1. `ReadFile`/`Read*` and `OpenExactModel`/`OpenExact*` accept an explicit opacity-fallback option alongside the existing color appearance contract.
  2. Default appearance mode can express a documented opacity policy consistently across STEP, IGES, and BREP import results when source transparency is missing or ignored.
  3. Existing callers that still rely on the v1.2 color-only appearance contract keep deterministic compatibility, and precedence between legacy/new options is explicit in typings and tests.
**Plans**: 2 plans

Plans:
- [x] 12-01-PLAN.md — Add explicit opacity-fallback parsing and root import semantics
- [x] 12-02-PLAN.md — Lock opacity fallback parity and compatibility across read/exact lanes

### Phase 13: Appearance Preset & Adapter Parity
**Goal**: Let callers choose named import appearance presets and make `@tx-code/occt-core` normalize and forward the expanded contract without viewer-side repaint assumptions.
**Depends on**: Phase 12
**Requirements**: APPR-07, APPR-08, ADAPT-05
**UI hint**: no
**Canonical refs**: packages/occt-core/src/occt-core.js, packages/occt-core/src/model-normalizer.js, dist/occt-js.d.ts, packages/occt-core/test/core.test.mjs, packages/occt-core/test/live-root-integration.test.mjs, test/import_appearance_contract.test.mjs
**Success Criteria** (what must be TRUE):
  1. Callers can provide named appearance presets and receive consistent imported materials, colors, and opacity policy from both the root Wasm result and `occt-core` normalized output.
  2. Stateless read APIs and exact-open APIs honor the same preset and opacity-fallback semantics for supported formats.
  3. `@tx-code/occt-core` forwards normalized expanded appearance options and still presents an engine-agnostic import result without hiding the underlying runtime contract.
**Plans**: 2 plans

Plans:
- [x] 13-01-PLAN.md — Add named appearance preset parsing and root import parity
- [x] 13-02-PLAN.md — Normalize expanded appearance options and preset forwarding in `@tx-code/occt-core`

### Phase 14: Appearance Expansion Governance
**Goal**: Lock the expanded import appearance contract in docs, package typings, downstream packaging guidance, and the canonical root release gate.
**Depends on**: Phase 13
**Requirements**: ADAPT-06
**UI hint**: no
**Canonical refs**: README.md, packages/occt-core/README.md, dist/occt-js.d.ts, test/release_governance_contract.test.mjs, test/package_tarball_contract.test.mjs, AGENTS.md
**Success Criteria** (what must be TRUE):
  1. Root and package docs describe opacity fallback and preset selection, plus app-side setting responsibility, without making viewer behavior part of the root scope.
  2. Public typings and packaged entrypoints expose the finalized expanded appearance option shape required by downstream consumers.
  3. Governance and release tests fail if expanded appearance docs, typings, or package surfaces drift from the implemented runtime behavior.
**Plans**: 2 plans

Plans:
- [ ] 14-01-PLAN.md — Finalize docs and typings for expanded appearance options
- [ ] 14-02-PLAN.md — Extend release governance and downstream packaging verification for expanded appearance options

## Progress

**Execution Order:**
Phases execute in numeric order: 12 → 13 → 14

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 12. Root Alpha & Opacity Fallback | 2/2 | Complete | 2026-04-15 |
| 13. Appearance Preset & Adapter Parity | 0/2 | Planned | — |
| 14. Appearance Expansion Governance | 0/2 | Planned | — |
