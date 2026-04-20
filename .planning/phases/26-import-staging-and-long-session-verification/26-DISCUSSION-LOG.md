# Phase 26 Discussion Log

**Date:** 2026-04-20  
**Phase:** 26 - Import Staging & Long-Session Verification

## Scope Framing

- Confirmed Phase 26 is milestone-closeout work for `DOCS-04` and `GOV-05`, not new runtime feature expansion.
- Locked boundary to docs, governance assertions, and long-session/soak verification evidence.

## Evidence Reviewed

- Current roadmap/requirements/state for Phase 26 readiness.
- Phase 24/25 summaries and verification artifacts to identify the exact lifecycle/performance behavior that must now be documented and governed.
- Current docs (`README.md`, `packages/occt-core/README.md`, `docs/sdk/measurement.md`) for lifecycle/perf guidance coverage.
- Current governance tests (`test/release_governance_contract.test.mjs`, `test/secondary_surface_contract.test.mjs`) for contract drift protection.

## Gaps Identified

1. Root/package docs do not yet provide a focused lifecycle contract section covering managed disposal and diagnostics usage.
2. Docs do not currently route maintainers through explicit long-session/soak verification for lifecycle/performance confidence.
3. Governance tests lock many existing docs/contracts, but Phase 24/25 lifecycle/perf closeout expectations are not yet fully asserted.

## Decisions Locked

- Document lifecycle/disposal expectations package-first (`@tx-code/occt-core`) while keeping root APIs as lower-level references.
- State explicitly that finalizers are best-effort and explicit `dispose/release` is authoritative.
- Keep long-session/soak verification as an explicit optional lane (not an unconditional root release gate).
- Extend governance assertions so docs/command routing drift for lifecycle/perf is caught automatically.

## Next Step

- Create `26-01` and `26-02` executable plans covering:
  - docs publication and package-first lifecycle/performance guidance,
  - governance extension plus long-session verification/reporting.
