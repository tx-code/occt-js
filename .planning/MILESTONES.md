# Milestones

## v1.0 OCCT Wasm Runtime Hardening (Shipped: 2026-04-14)

**Phases completed:** 4 phases, 12 plans, 21 tasks

**Key accomplishments:**

- Windows Wasm build wrappers now enforce a direct `dist/` runtime-artifact contract backed by a static regression test.
- Fast preflight coverage now validates prerequisite markers, `dist/` runtime presence, and every current consumer of the canonical artifact contract.
- Root npm scripts and repository docs now expose one consistent Windows-first Wasm build flow with an explicit fast preflight gate.
- The root Wasm import contract is now locked down with explicit direct-vs-generic payload parity coverage for STEP, IGES, and BREP.
- Root-mode and unit-metadata semantics are now explicit contract tests for STEP, IGES, and BREP, with fresh Wasm rebuild verification.
- The optimal-orientation contract is now explicit for supported formats, failure modes, preset-axis requests, and golden diagnostics.
- The packed root package contract is now explicit and regression-tested for tarballed or vendored downstream consumers.
- `@tx-code/occt-core` is now explicitly verified as the engine-agnostic downstream adapter over the root Wasm carrier.
- Repository docs now describe one clear downstream package contract, and that story is guarded by automated tests.
- The repository now has one canonical runtime-first root release command, and that command is locked by a governance contract test.
- Runtime-first release guidance is now aligned across public docs, AGENTS, and the repository release skill.
- The planning corpus now matches the implemented runtime-first contract instead of lagging behind completed phases.

---
