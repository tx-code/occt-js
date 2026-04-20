# Phase 25: Exact Query & Store Performance - Context

**Gathered:** 2026-04-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 25 reduces avoidable overhead in retained exact-query/store access and IGES import staging for large-model workflows. Scope is limited to internal performance architecture and regression visibility: remove per-query retained-entry copies, centralize IGES temp-file staging behavior, and add repeatable regression coverage or benchmark visibility. This phase must stay additive for public runtime/package contracts and must not drift into new helper families, viewer-owned behavior, or Phase 26 docs/governance routing.

</domain>

<decisions>
## Implementation Decisions

### Retained store access path
- **D-01:** Replace the copy-out `ExactModelStore::GetEntry(int, ExactModelEntry&)` hot path with a non-copy access strategy so exact queries stop cloning `ExactModelEntry` (including `exactGeometryShapes`) on every operation.
- **D-02:** Keep exact lifecycle semantics unchanged while optimizing internals: numeric `exactModelId` ownership, retain/release behavior, and typed failure codes (`released-handle`, `invalid-handle`, `invalid-id`, etc.) remain contract-stable.
- **D-03:** The optimized lookup must preserve concurrency safety without holding the store mutex across heavy OCCT query work. In-flight queries should use stable entry access that remains valid even if final release happens concurrently.

### Exact-query optimization boundary
- **D-04:** Focus optimization on lookup/shape-resolution plumbing, not on geometry math semantics. Distance/angle/thickness/relation/helper DTO logic should remain behaviorally equivalent except for performance.
- **D-05:** Keep Phase 25 runtime-facing API changes minimal. Prefer internal C++ changes first; only add public surface if required for robust regression visibility.

### IGES import staging strategy
- **D-06:** Keep file-based IGES staging in Phase 25 because `ReadStream` reliability for IGES in this OCCT toolchain is still considered unsafe.
- **D-07:** Remove duplicated IGES temp-file staging logic between `src/importer-xde.cpp` and `src/orientation.cpp` by introducing a shared utility path with identical failure/cleanup semantics.
- **D-08:** Shared staging must use collision-safe temporary file naming and guaranteed cleanup on both success and failure, avoiding predictable `*.tmp.igs` naming collisions.

### Performance regression evidence
- **D-09:** Add repeatable regression coverage for the optimized store/query and IGES staging paths using deterministic contract-style checks where possible (structural/behavioral guarantees), plus explicit benchmark visibility for maintainers.
- **D-10:** Keep timing-based performance evidence as an explicit performance lane (benchmark/perf command and artifacts), not a brittle default runtime contract assertion. Governance wiring for release routing remains Phase 26 scope.

### the agent's Discretion
- Choose the exact non-copy store entry mechanism (e.g., shared entry handles vs immutable views) as long as query hot-path copies are removed and lifecycle semantics remain stable.
- Choose the exact shared IGES staging helper location and API shape, as long as importer and orientation paths converge on one implementation.
- Choose benchmark fixture set and reporting format, as long as Phase 25 produces repeatable, reviewable regression evidence for large-model workflows.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone and requirement contracts
- `.planning/ROADMAP.md` — Phase 25 goal, success criteria, and two-plan split (`25-01`, `25-02`).
- `.planning/REQUIREMENTS.md` — `PERF-01` and `PERF-02` requirements and traceability expectations.
- `.planning/PROJECT.md` — Active milestone boundary, additive compatibility rules, and release-boundary constraints.
- `.planning/STATE.md` — Current milestone position and pending phase workflow state.
- `AGENTS.md` — Runtime-first release boundary, testing expectations, and non-expansion constraints.

### Prior phase context and boundaries
- `.planning/phases/24-exact-model-lifecycle-governance/24-CONTEXT.md` — Explicit deferral of `GetEntry` copy optimization and IGES staging performance into Phase 25.
- `.planning/phases/24-exact-model-lifecycle-governance/24-VERIFICATION.md` — Current lifecycle behavior that Phase 25 must preserve while optimizing.
- `.planning/milestones/v1.6-phases/23-helper-sdk-docs-governance/23-CONTEXT.md` — Package/runtime governance boundary that must remain intact.

### Existing concern and testing analysis
- `.planning/codebase/CONCERNS.md` — Documents exact-query copy hotspot and IGES staging duplication/performance costs.
- `.planning/codebase/TESTING.md` — Existing runtime/package test lanes and patterns for adding deterministic contract coverage.

### Source hotspots
- `src/exact-model-store.hpp` — Current copy-out store API (`GetEntry`) and lifecycle store contracts.
- `src/exact-model-store.cpp` — Live/released entry storage and mutex-guarded access implementation.
- `src/exact-query.cpp` — Query-side `LookupGeometryShape` and repeated retained-entry lookup usage.
- `src/importer-xde.cpp` — Current IGES temporary-file staging and transfer path for import.
- `src/orientation.cpp` — Duplicate IGES temporary-file staging path for orientation analysis.
- `src/importer-iges.cpp` — IGES import entrypoint routing through XDE path.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ExactModelStore` already centralizes retained entry ownership and lifecycle codes, so Phase 25 can optimize data access without changing higher-level API contracts.
- `exact-query.cpp` already funnels retained lookup through `LookupGeometryShape`, giving one narrow integration seam for hot-path copy removal.
- `ReadAndTransferXde(...)` exists in both `importer-xde.cpp` and `orientation.cpp` with nearly identical IGES staging flow, making shared utility extraction straightforward.

### Established Patterns
- Lifecycle and query failures are explicit typed DTO-style results, not exceptions or implicit warnings.
- Phase 24 locked lifecycle diagnostics and managed disposal behavior; Phase 25 optimizations must not regress those semantics.
- Root release boundary remains runtime-first, while extra performance/governance routing decisions are intentionally separated.

### Integration Points
- Store/query optimization work will touch `src/exact-model-store.*` and `src/exact-query.cpp`, with potential helper declarations in nearby headers.
- IGES staging deduplication work will touch `src/importer-xde.cpp` and `src/orientation.cpp`, likely via a shared internal utility module.
- Regression evidence will touch root test/perf surfaces under `test/` and possibly package integration checks where query paths are exercised through `@tx-code/occt-core`.

</code_context>

<specifics>
## Specific Ideas

- The most visible hotspot is full-entry copying under store lookup before every exact query call; this should be treated as a primary `25-01` target.
- IGES staging currently performs duplicated temp-file write/read/cleanup logic in two separate paths; Phase 25 should converge this into one shared behavior to reduce drift and overhead.
- Performance validation should emphasize repeatability and signal quality over fragile micro-thresholds in default gates.

</specifics>

<deferred>
## Deferred Ideas

- Lifecycle/performance docs and release-governance routing details remain Phase 26 (`DOCS-04`, `GOV-05`).
- New helper families, feature discovery, viewer/session behavior, and package ecosystem cleanup remain out of Phase 25 scope.
- Reopening IGES `ReadStream` feasibility beyond temp-file fallback remains future work unless new OCCT evidence is introduced.

</deferred>

---

*Phase: 25-exact-query-store-performance*
*Context gathered: 2026-04-20*
