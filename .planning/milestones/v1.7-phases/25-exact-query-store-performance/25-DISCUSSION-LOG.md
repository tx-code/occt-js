# Phase 25: Exact Query & Store Performance - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-20
**Phase:** 25-exact-query-store-performance
**Areas discussed:** retained store access path, IGES staging strategy, performance regression evidence

---

## Retained Store Access Path

| Option | Description | Selected |
|--------|-------------|----------|
| Keep `GetEntry` copy-out unchanged | Lowest implementation risk, no hot-path improvement | |
| Move to non-copy stable entry access | Remove per-query `ExactModelEntry` copy overhead while preserving lifecycle semantics | ✓ |
| Hold store mutex through query execution | Avoid entry copies by serializing heavy query work under lock | |

**User's choice:** Continue with non-copy stable entry access.
**Notes:** This continuation follows Phase 25 roadmap intent and the Phase 24 deferred performance boundary. Lifecycle contracts stay unchanged.

---

## IGES Staging Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Keep duplicated temp-file staging logic in each path | Minimal edits but preserves drift and repeated overhead | |
| Extract shared IGES staging helper with safe temp lifecycle | Single behavior for import/orientation with consistent cleanup and reduced drift | ✓ |
| Switch IGES to `ReadStream` now | Potentially removes temp files but conflicts with known reliability caveat in current OCCT toolchain | |

**User's choice:** Continue with shared staging helper while keeping file-based fallback.
**Notes:** Existing comments and concerns documentation already mark `ReadStream` as unreliable for IGES in this toolchain.

---

## Performance Regression Evidence

| Option | Description | Selected |
|--------|-------------|----------|
| Defer all perf evidence to Phase 26 | Simplifies Phase 25 scope but leaves PERF-02 under-specified | |
| Add deterministic regression coverage plus explicit perf benchmark lane | Balances stable contract checks with measurable performance visibility | ✓ |
| Add strict wall-clock thresholds to default root tests immediately | High signal when stable, but high flake risk across environments | |

**User's choice:** Continue with deterministic regression coverage plus explicit benchmark visibility.
**Notes:** Release-governance routing and long-session policy remain Phase 26 concerns.

---

## the agent's Discretion

- Exact non-copy store access primitive and data structure.
- Shared IGES staging helper file location/API shape.
- Benchmark output format and reporting details.

## Deferred Ideas

- Performance docs/governance routing into authoritative release gates (Phase 26).
- New helper families and broader semantic surface expansion (future milestone scope).

