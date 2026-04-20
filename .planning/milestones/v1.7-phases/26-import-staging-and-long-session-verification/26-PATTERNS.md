# Phase 26: Import Staging & Long-Session Verification - Pattern Map

**Mapped:** 2026-04-20  
**Files analyzed:** 12 scoped files  
**Analogs found:** 10 / 12

Phase 26 is a docs/governance closeout phase. The safe implementation pattern is to lock Phase 24/25 lifecycle/performance behavior into package-first documentation and regex-style governance tests, then add explicit long-session evidence as a separate maintainers' lane outside unconditional root release gates.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `README.md` | root contract docs | release and runtime command routing | existing release/appearance/helper sections | exact |
| `packages/occt-core/README.md` | package-first docs | lifecycle/perf usage guidance for downstream JS | existing package-first SDK and appearance sections | exact |
| `docs/sdk/measurement.md` | focused SDK guide | package-first measurement/lifecycle guidance | current package-first measurement walkthrough | exact |
| `AGENTS.md` | repo instruction contract | root-vs-secondary verification boundaries | current testing/release boundary sections | exact |
| `test/release_governance_contract.test.mjs` | docs/command governance lock | regex checks for command surface and docs consistency | existing release/docs governance assertions | exact |
| `test/secondary_surface_contract.test.mjs` (optional) | conditional routing lock | secondary-surface command/docs expectations | existing conditional routing assertions | exact |
| `test/test_exact_lifecycle_soak.mjs` (new) | long-session verification lane | repeated open/query/dispose cycles with report output | existing `test/test_perf_exact_workflows.mjs` script-style pattern | partial |
| `package.json` | command routing | discoverable optional soak command | existing `test:perf:exact` and contract script routing | exact |
| `.planning/phases/26-*/26-VERIFICATION.md` | phase verification artifact | must-have truth + command evidence | Phase 24/25 verification report format | exact |
| `.planning/phases/26-*/26-0X-SUMMARY.md` | per-plan closeout artifact | decisions + evidence for follow-on planning | Phase 24/25 summary format | exact |
| `dist/occt-js.d.ts` | root type contract surface | lifecycle/perf API references used by docs/tests | existing lifecycle/query typedefs | not-touched |
| `packages/occt-core/src/index.d.ts` | package type contract surface | managed lifecycle API references used by docs/tests | existing managed helper typings | not-touched |

## Pattern Assignments

### Docs are package-first with root reference fallback

**Scope:** Required.  
**Analog:** existing README/package README SDK sections.

Planner note: lifecycle/performance guidance should start from `@tx-code/occt-core` managed helpers, then point to root low-level APIs as references.

---

### Governance is regex contract locking over command/docs surfaces

**Scope:** Required.  
**Analog:** `test/release_governance_contract.test.mjs`.

Planner note: enforce lifecycle/perf docs and command routing with explicit text/regex assertions to catch drift early.

---

### Long-session verification is explicit and separate from root release gate

**Scope:** Required.  
**Analog:** Phase 25 perf lane (`test/test_perf_exact_workflows.mjs`, `test:perf:exact`).

Planner note: add soak command/reporting as an optional maintainer lane; keep `npm run test:release:root` runtime-first and stable.

## Shared Patterns

### Keep release boundaries explicit

**Source:** `AGENTS.md`, `README.md`, `test/release_governance_contract.test.mjs`

Root release gate remains authoritative and runtime-first; secondary surfaces stay conditional.

### Favor deterministic evidence over flaky thresholds

**Source:** Phase 25 perf script and contract tests

Long-session evidence should be reproducible and report-driven rather than strict wall-clock threshold assertions.

### Keep docs and governance in sync via tests

**Source:** existing release governance contract

Whenever docs add new required lifecycle/perf guidance, governance tests should assert those sections/phrases explicitly.

## No Analog Found

A dedicated long-session exact lifecycle soak script/report currently does not exist. This is the key new pattern for Phase 26.

## Metadata

**Analog search scope:** `README.md`, `packages/occt-core/README.md`, `docs/sdk/measurement.md`, `AGENTS.md`, `test/release_governance_contract.test.mjs`, `test/secondary_surface_contract.test.mjs`, `test/test_perf_exact_workflows.mjs`, `package.json`, `dist/occt-js.d.ts`, `packages/occt-core/src/index.d.ts`
