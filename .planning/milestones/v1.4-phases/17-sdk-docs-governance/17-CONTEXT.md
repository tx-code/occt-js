# Phase 17: SDK Docs & Governance - Context

**Gathered:** 2026-04-16  
**Status:** Ready for planning  
**Source:** Active `v1.4` milestone docs plus shipped Phase 15 and Phase 16 outputs

<domain>
## Phase Boundary

Phase 17 closes `v1.4 Exact Measurement Placement & Relation SDK`.

This phase delivers:

- package-first SDK docs for exact placement and relation workflows
- root README guidance for lower-level Wasm entrypoints and release boundaries
- release-gate and tarball checks that lock the finalized placement/relation SDK surface

This phase does not deliver:

- new runtime measurement behavior or new exact geometry algorithms
- viewer overlays, label layout, selection sessions, or feature semantics
- Babylon-, demo-, or Tauri-specific measurement UX

</domain>

<decisions>
## Implementation Decisions

### Docs Boundary
- Keep `@tx-code/occt-core` as the primary SDK entrypoint for downstream JS docs.
- Keep the root Wasm carrier documented as the lower-level reference surface and authoritative release boundary.
- Document placement and relation APIs package-first, then explicitly state that overlay rendering and measurement UX remain downstream concerns.

### Governance Boundary
- The authoritative release gate stays `npm run test:release:root`.
- Placement and relation contract tests must become part of the canonical root test/release surface instead of living only as ad hoc test files.
- Packaged README/type/tarball checks must prove the measurement SDK contract without adding unconditional demo, Babylon, or Tauri gates.

### Scope Guards
- Keep Phase 17 focused on docs, package metadata, test surfaces, and planning/governance alignment.
- Do not reopen the shipped `MeasureExact*`, `SuggestExact*Placement`, or `ClassifyExactRelation` semantics unless a docs/governance check reveals an actual contract mismatch.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone And Repo Rules
- `AGENTS.md`
- `.planning/PROJECT.md`
- `.planning/REQUIREMENTS.md`
- `.planning/ROADMAP.md`
- `.planning/STATE.md`

### Prior Phase Outputs
- `.planning/phases/15-placement-contract-hardening/15-01-SUMMARY.md`
- `.planning/phases/15-placement-contract-hardening/15-02-SUMMARY.md`
- `.planning/phases/16-exact-relation-classifier-contract/16-01-SUMMARY.md`
- `.planning/phases/16-exact-relation-classifier-contract/16-02-SUMMARY.md`

### Public SDK Surface
- `README.md`
- `packages/occt-core/README.md`
- `dist/occt-js.d.ts`
- `packages/occt-core/src/occt-core.js`
- `test/exact_placement_contract.test.mjs`
- `test/exact_relation_contract.test.mjs`

### Packaging And Governance
- `package.json`
- `test/package_tarball_contract.test.mjs`
- `test/release_governance_contract.test.mjs`

</canonical_refs>

<specifics>
## Specific Ideas

- Add a dedicated SDK doc such as `docs/sdk/measurement.md` for placement/relation guidance to keep the READMEs concise.
- Update `README.md` and `packages/occt-core/README.md` so they mention `SuggestExact*Placement`, `ClassifyExactRelation`, and `core.classifyExactRelation(...)`.
- Extend `package.json` scripts so `npm test` and `npm run test:release:root` include `test/exact_placement_contract.test.mjs` and `test/exact_relation_contract.test.mjs`.
- Extend tarball/governance checks so docs, typings, and packaged surfaces cannot drift from the shipped SDK contract.

</specifics>

<deferred>
## Deferred Ideas

- Higher-level measurement semantics such as hole, chamfer, equal-distance, or symmetry remain future work.
- Viewer-side measurement overlays, widgets, and interaction flows remain downstream app concerns.

</deferred>

---

*Phase: 17-sdk-docs-governance*  
*Context gathered: 2026-04-16 via active v1.4 planning inputs*
