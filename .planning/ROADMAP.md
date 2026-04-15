# Roadmap: occt-js

## Milestones

- 🚧 **v1.2 Import Appearance Contract** - Phases 9-11 (active)
- ✅ [v1.1 Exact BRep Measurement Foundation](./milestones/v1.1-ROADMAP.md) — Phases 5-8, shipped 2026-04-15
- ✅ [v1.0 OCCT Wasm Runtime Hardening](./milestones/v1.0-ROADMAP.md) — Phases 1-4, shipped 2026-04-14

## Overview

This roadmap keeps `occt-js` centered on the runtime-first Wasm carrier. `v1.2` hardened import appearance into an explicit package contract so downstream apps can choose source colors or a default CAD color through import options instead of patching colors later in viewer code. With Phase 11 complete, docs, typings, package guidance, and the authoritative root release gate now lock the shipped runtime and adapter semantics in place. The milestone is ready for closeout.

## Phases

**Phase Numbering:**
- Integer phases (9, 10, 11): Planned milestone work
- Decimal phases (9.1, 9.2): Urgent insertions (marked with INSERTED)

- [x] **Phase 9: Root Import Appearance Mode** - Add explicit appearance mode parsing and a documented built-in default CAD color to root import APIs.
- [x] **Phase 10: Custom Default Color & Adapter Parity** - Support caller-provided default colors and unify read/openExact/`occt-core` semantics.
- [x] **Phase 11: Appearance Governance & Downstream Contract** - Finalize docs, typings, package guidance, and release governance for the import appearance contract.

## Phase Details

### Phase 9: Root Import Appearance Mode
**Goal**: Add an explicit import appearance mode to the root Wasm carrier and document one built-in default CAD color while keeping legacy `readColors` behavior deterministic.
**Depends on**: Phase 8
**Requirements**: APPR-01, APPR-02, APPR-05
**UI hint**: no
**Canonical refs**: src/importer.hpp, src/js-interface.cpp, src/importer-xde.cpp, src/importer-brep.cpp, dist/occt-js.d.ts, test/import_appearance_contract.test.mjs
**Success Criteria** (what must be TRUE):
  1. `ReadFile`/`Read*` and `OpenExactModel`/`OpenExact*` accept an explicit appearance mode that distinguishes source-color imports from default-color imports.
  2. Default appearance mode without an override uses one documented built-in CAD color consistently across STEP, IGES, and BREP import results, including files that contain source colors.
  3. Existing callers that still use `readColors` keep deterministic behavior, and precedence between legacy and new options is explicit in typings and tests.
**Plans**: 2 plans

Plans:
- [x] 09-01-PLAN.md — Add explicit appearance-mode parsing and built-in default CAD color to root import params
- [x] 09-02-PLAN.md — Lock `readColors` compatibility and read/openExact appearance parity across supported formats

### Phase 10: Custom Default Color & Adapter Parity
**Goal**: Let callers pass a custom default color and make `@tx-code/occt-core` normalize and forward the full appearance contract without viewer-side repaint assumptions.
**Depends on**: Phase 9
**Requirements**: APPR-03, APPR-04, ADAPT-03
**UI hint**: no
**Canonical refs**: packages/occt-core/src/occt-core.js, packages/occt-core/src/model-normalizer.js, dist/occt-js.d.ts, packages/occt-core/test/core.test.mjs, packages/occt-core/test/live-root-integration.test.mjs, test/import_appearance_contract.test.mjs
**Success Criteria** (what must be TRUE):
  1. Callers can provide `defaultColor` and receive consistent imported materials and geometry colors from both the root Wasm result and `occt-core` normalized output.
  2. Stateless read APIs and exact-open APIs honor the same default-color override semantics for supported formats.
  3. `@tx-code/occt-core` forwards normalized appearance options and still presents an engine-agnostic import result without hiding the underlying runtime contract.
**Plans**: 2 plans

Plans:
- [x] 10-01-PLAN.md — Add custom default color parsing and exact-open parity to the root import lanes
- [x] 10-02-PLAN.md — Normalize import appearance options and forwarding in `@tx-code/occt-core`

### Phase 11: Appearance Governance & Downstream Contract
**Goal**: Lock the import appearance contract in docs, package typings, downstream packaging guidance, and the canonical root release gate.
**Depends on**: Phase 10
**Requirements**: ADAPT-04
**UI hint**: no
**Canonical refs**: README.md, packages/occt-core/README.md, dist/occt-js.d.ts, test/release_governance_contract.test.mjs, test/package_tarball_contract.test.mjs, AGENTS.md
**Success Criteria** (what must be TRUE):
  1. Root and package docs describe the appearance contract, the built-in default CAD color, and app-side setting responsibility without making viewer behavior part of the root scope.
  2. Public typings and packaged entrypoints expose the finalized appearance option shape required by downstream consumers.
  3. Governance and release tests fail if appearance-contract docs, typings, or package surfaces drift from the implemented runtime behavior.
**Plans**: 2 plans

Plans:
- [x] 11-01-PLAN.md — Finalize docs and typings for the import appearance contract
- [x] 11-02-PLAN.md — Extend release governance and downstream packaging verification for appearance options

## Progress

**Execution Order:**
Phases execute in numeric order: 9 → 10 → 11

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 9. Root Import Appearance Mode | 2/2 | Complete | 2026-04-15 |
| 10. Custom Default Color & Adapter Parity | 2/2 | Complete | 2026-04-15 |
| 11. Appearance Governance & Downstream Contract | 2/2 | Complete | 2026-04-15 |
