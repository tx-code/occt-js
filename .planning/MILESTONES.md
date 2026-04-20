# Milestones

## v1.7 Exact Lifecycle & Performance (Shipped: 2026-04-20)

**Phases completed:** 3 phases, 6 plans, 6 tasks
**Known deferred items at close:** 1 (see `STATE.md` Deferred Items)

**Key accomplishments:**

- The root runtime now exposes additive lifecycle diagnostics and deterministic released-handle behavior across representative exact-query paths.
- `@tx-code/occt-core` now ships managed exact-model wrappers with explicit idempotent `dispose()` semantics and package-first diagnostics access.
- Retained exact-query/store hot paths now avoid avoidable full-entry copy overhead while preserving deterministic failure semantics.
- IGES import and orientation now share one staging implementation, and large-model visibility is exposed through `npm run test:perf:exact`.
- Lifecycle and performance docs are now package-first across root/package/sdk/agent surfaces, with governance tests locking command and contract drift.
- Long-session lifecycle/performance soak evidence now ships through `npm run test:soak:exact` and a committed phase report, without widening the authoritative root release gate.

---

## v1.6 Exact Semantics Helpers (Shipped: 2026-04-18)

**Phases completed:** 3 phases, 6 plans, 8 tasks
**Known deferred items at close:** 1 (see `STATE.md` Deferred Items)

**Key accomplishments:**

- Supported cylindrical hole semantics now ship package-first through `@tx-code/occt-core`, with the root carrier only growing by one narrow selected-ref query where package composition needed it.
- Supported planar chamfer semantics plus midpoint, equal-distance, and narrow midplane-style symmetry helpers now compose over the shipped exact placement/relation surface.
- Helper SDK docs are now package-first through `@tx-code/occt-core`, with the root Wasm carrier kept as the lower-level reference.
- `@tx-code/occt-core` now publishes an explicit typed entrypoint aligned with its shipped helper barrel.
- Root tarball, governance, and consumer contract suites now lock the helper family and the release-boundary wording end to end.
- `npm run test:release:root` now includes hole and chamfer contract coverage without widening unconditional demo, Babylon, or Tauri release gates.

---

## v1.5 Root Release Hardening (Shipped: 2026-04-18)

**Phases completed:** 3 phases, 6 plans, 6 tasks
**Known deferred items at close:** 1 (see `STATE.md` Deferred Items)

**Key accomplishments:**

- The root preflight contract now asserts the same concrete `dist/occt-js.js` and `dist/occt-js.wasm` paths already used by maintained runtime consumers.
- The demo-side runtime contract already matched the intended concrete-file loader behavior, so this plan completed by verification-only confirmation instead of source changes.
- The authoritative root release governance lane now ignores live `.planning` archive-state drift, and any retained planning audit runs from a separate explicit maintainer command.
- Release-facing docs now tell one consistent story: `npm run test:release:root` is the authoritative runtime-first gate, and `npm run test:planning:audit` is a separate optional planning/process audit.
- The demo now exposes explicit non-Tauri verification commands, and both its node-style lane and browser smoke lane run against the current repo state.
- Secondary-surface verification is now codified as an explicit conditional contract: the loader owns its direct imports, root/docs routing is discoverable, and none of it polluted `npm run test:release:root`.

---

## v1.4 Exact Measurement Placement & Relation SDK (Shipped: 2026-04-16)

**Phases completed:** 3 phases, 6 plans, 12 tasks

**Key accomplishments:**

- The root Wasm carrier now exposes additive pairwise placement helpers for distance, angle, and thickness, with stable anchors and full working frames suitable for downstream overlay code.
- The exact placement surface now covers circular geometry and package-first wrappers, so downstream JS can consume pairwise and circular placement data directly through `@tx-code/occt-core` in occurrence space.
- The root Wasm carrier now exposes an additive exact relation classifier that can return `parallel`, `perpendicular`, `concentric`, `tangent`, or `none` with stable supporting geometry and explicit failures.
- `@tx-code/occt-core` now exposes package-first exact relation classification with occurrence-safe wrapper behavior, explicit `none`, and live repeated-geometry proof against the built root carrier.
- The exact measurement SDK is now documented package-first through `@tx-code/occt-core`, with the root Wasm carrier kept as the lower-level reference and downstream viewer concerns kept out of scope.
- The packaged exact measurement SDK surface is now enforced by the authoritative root test and release gates, including placement and relation contract coverage.

---

## v1.3 Appearance Expansion (Shipped: 2026-04-15)

**Phases completed:** 3 phases, 6 plans, 12 tasks

**Key accomplishments:**

- The root Wasm carrier now accepts explicit default-opacity fallback and can expose that policy directly on raw colors and materials without downstream repaint work.
- `defaultOpacity` now stays explicit and deterministic across read/exact lanes, colorless fixtures, and legacy/source compatibility paths.
- The root Wasm carrier now supports named appearance presets while preserving the shipped primitive contract and exact-open parity.
- `@tx-code/occt-core` now preserves the expanded preset/opacity contract instead of dropping root appearance information during normalization.
- The expanded appearance contract is now documented and governed as a root/package import surface instead of an implicit runtime detail.
- The packaged root contract now explicitly locks the final preset and opacity guidance, and the authoritative root release gate is green against that completed surface.

---

## v1.2 Import Appearance Contract (Shipped: 2026-04-15)

**Phases completed:** 3 phases, 6 plans, 12 tasks

**Key accomplishments:**

- The root wasm carrier now understands an explicit import appearance mode and can collapse imported output onto one built-in CAD color across STEP, IGES, and BREP.
- Legacy `readColors` compatibility and exact-open appearance parity are now explicit, typed, and part of the default root runtime test chain.
- The root Wasm carrier now accepts caller-provided `defaultColor` overrides and applies them consistently across stateless reads and exact-open imports.
- `@tx-code/occt-core` now forwards a canonical appearance contract and no longer hides colorless runtime output behind unconditional fallback materials.
- The shipped import appearance contract is now documented and typed where downstream consumers actually consume it: the root package, the `occt-core` adapter, and the public `.d.ts` surface.
- The import appearance contract is now locked into the packaged root tarball and the authoritative runtime-first release gate, and Phase 11 is fully reflected in milestone traceability.

---

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
