# Milestones

## v1.1 Exact BRep Measurement Foundation (Shipped: 2026-04-15)

**Phases completed:** 4 phases, 9 plans, 18 tasks

**Key accomplishments:**

- The root wasm carrier now exposes a retained exact-model lifecycle lane with explicit open, retain, and release APIs alongside the unchanged stateless import surface.
- The exact-model lifecycle contract is now fully typed, exposed through `occt-core`, and verified through both root and live downstream test paths.
- The root exact-open lane now exposes one exact geometry binding per exported geometry definition, giving later phases a stable definition-level exact handle without leaking occurrence state into Wasm.
- `occt-core` can now normalize exact-open results and resolve occurrence-scoped exact refs from the existing scene ids, with explicit failure DTOs for invalid handles, ids, and node/geometry mismatches.
- The runtime now exposes exact geometry classification plus radius and center primitives on retained exact refs, and `occt-core` can adapt those local-space results back into occurrence space.
- The exact-measurement foundation now covers exact edge length, face area, and face-normal-at-point, with `occt-core` adapting world-space query points and normals for repeated geometry occurrences.
- The runtime now exposes exact pairwise distance and angle on retained refs, and `occt-core` can forward occurrence transforms so repeated geometry measures correctly in instance space.
- The exact pairwise surface now includes planar thickness with plane-distance semantics, and the public pairwise typings are explicit enough for downstream measurement handling without guessing at failure shapes.
- The exact pairwise measurement foundation is now a first-class package contract: it is documented at the root/package layer, required by the release gate, and fully reflected in milestone traceability.

---

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
