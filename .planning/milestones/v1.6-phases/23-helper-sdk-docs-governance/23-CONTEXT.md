# Phase 23: Helper SDK Docs & Governance - Context

**Gathered:** 2026-04-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 23 locks the shipped `v1.6` helper family into package-first docs, public typings, packaged entrypoints, and authoritative release-governance checks. The phase must document the now-shipped helper surface (`hole`, `chamfer`, `midpoint`, `equal-distance`, and narrow symmetry helpers), add any missing package typing/export surface needed for `@tx-code/occt-core`, and extend release tests so helper docs or contract drift fails the canonical root verification path. This phase must not reopen helper semantics design, widen the root runtime boundary, or add viewer/demo-owned workflows.

</domain>

<decisions>
## Implementation Decisions

### Documentation surface
- **D-01:** Keep the helper SDK documentation package-first through `@tx-code/occt-core`, with the root `@tx-code/occt-js` README remaining the lower-level carrier reference. The root README should summarize the helper family and point to the deeper SDK guide instead of duplicating every package-first example.
- **D-02:** Extend the existing exact SDK docs in place instead of creating a second parallel helper-only guide. `docs/sdk/measurement.md` should remain the stable path, but its title and content should expand to cover the shipped helper semantics rather than still claiming all hole/chamfer semantics are downstream-only.
- **D-03:** Docs must state the shipped helper limits explicitly: `describeExactHole(ref)` only covers supported cylindrical hole cases; `describeExactChamfer(ref)` only covers supported planar chamfer face refs; `suggestExactSymmetryPlacement(refA, refB)` is intentionally limited to a midplane-style helper for supported parallel pairs; midpoint and equal-distance stay package-only compositions.

### Typings and packaged entrypoints
- **D-04:** Phase 23 should add a first-class published typing surface for `@tx-code/occt-core` instead of leaving the package-first helper SDK effectively untyped. That means `packages/occt-core/package.json` should advertise a `types` entry and export the typing file alongside the existing JS entrypoint.
- **D-05:** The new `@tx-code/occt-core` typings should model the package-first API that downstream callers actually use: `createOcctCore`, `OcctCoreClient`, occurrence-scoped exact refs, package-normalized exact results, and the shipped helper methods added through Phases 21-22. The root `dist/occt-js.d.ts` remains the lower-level carrier typing surface and should stay additive.
- **D-06:** Typings should preserve the same product boundary as the runtime/docs: helper DTOs and failures are public; viewer/session state, overlays, labels, and whole-model semantic discovery stay out of scope.

### Release governance coverage
- **D-07:** The authoritative root release gate should start treating exact helper semantics as part of the root/package contract. `npm run test:release:root` should include the retained-model helper contract suites for hole and chamfer, not just pairwise measurement, placement, and relation.
- **D-08:** Governance should split by surface: root tests lock the root README, root `dist/occt-js.d.ts`, and release command wording; `packages/occt-core` tests lock the package README, package typing/export surface, and helper entrypoints. Do not widen governance into demo, Babylon, or Tauri paths.
- **D-09:** Tarball and package-entrypoint assertions should prove that downstream consumers receive the helper docs and typings they need from the surfaces they actually install. For the root package, that means README plus `dist/occt-js.d.ts`; for `@tx-code/occt-core`, that means its README, JS entrypoint, and new typing/export contract.

### SDK examples and wording
- **D-10:** Package docs should show one compact end-to-end exact-model workflow, then layer helper examples on top of the same occurrence-ref vocabulary. Avoid duplicating a separate full setup snippet for every helper.
- **D-11:** Boundary wording must move from “feature semantics such as hole or chamfer recognition remain downstream concerns” to a narrower statement: the shipped helper family is now included, but richer feature recognition, batch discovery, viewer UX, and app-owned presentation policy remain downstream.

### the agent's Discretion
- Choose the final doc titles and section ordering as long as package-first helper guidance is clearly primary and the root README remains a lower-level reference.
- Choose whether `@tx-code/occt-core` typings live in one root file or multiple package-local `.d.ts` files, as long as the published `types`/`exports` surface is explicit and stable.
- Choose the exact governance test split and filenames as long as helper docs, typings, and release-boundary wording drift are caught automatically.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone and repo contract
- `.planning/PROJECT.md` — Active milestone framing, current package/runtime boundary, and the Phase 21-22 helper family now considered shipped.
- `.planning/REQUIREMENTS.md` — `DOCS-03` and `GOV-04` define the required Phase 23 outcome.
- `.planning/ROADMAP.md` — Phase 23 goal, success criteria, and the explicit focus on docs, typings, tarball expectations, and release governance.
- `.planning/STATE.md` — Current milestone position and the carry-forward note that Phase 23 is the last open work in `v1.6`.
- `AGENTS.md` — Repository-level release boundary, package/runtime responsibilities, and the rule that demo/Babylon/Tauri verification remains conditional.

### Prior helper-semantic context
- `.planning/phases/21-hole-helper-foundations/21-CONTEXT.md` — Locked Phase 21 pattern for package-first semantic helpers and narrow root additions.
- `.planning/phases/21-hole-helper-foundations/21-VERIFICATION.md` — Phase 21 completion evidence and package/runtime verification split.
- `.planning/phases/22-chamfer-constraint-helpers/22-CONTEXT.md` — Locked Phase 22 boundary for narrow chamfer semantics plus package-only midpoint/equal-distance/symmetry helpers.
- `.planning/phases/22-chamfer-constraint-helpers/22-VERIFICATION.md` — Phase 22 completion evidence and the helper-family verification lanes now needing governance coverage.

### Existing docs that must be updated
- `README.md` — Root downstream contract, current exact SDK wording, and authoritative release-gate documentation.
- `packages/occt-core/README.md` — Package-first downstream entrypoint that currently stops at placement/relation and needs helper-family docs.
- `docs/sdk/measurement.md` — Current exact SDK guide that still claims hole/chamfer semantics are downstream and therefore must be expanded in place.
- `.codex/skills/releasing-occt-js/SKILL.md` — Thin release workflow shim that must stay aligned with the authoritative release gate wording.

### Typing and package-entrypoint surfaces
- `dist/occt-js.d.ts` — Lower-level carrier typing surface that already includes the additive hole/chamfer carrier DTOs and must stay aligned with docs/governance.
- `package.json` — Root exports, `files`, `types`, and authoritative release/test scripts.
- `packages/occt-core/package.json` — Current package metadata and export surface that Phase 23 likely needs to extend with explicit typings.
- `packages/occt-core/src/index.js` — Current package barrel whose public JS surface the new typings and package-governance checks must match.
- `packages/occt-core/src/occt-core.js` — Actual package-first helper API now including hole, chamfer, midpoint, equal-distance, and symmetry helpers.

### Governance and contract tests
- `test/dist_contract_consumers.test.mjs` — Root doc/consumer contract assertions that currently stop at placement/relation wording.
- `test/package_tarball_contract.test.mjs` — Root tarball and README/type contract assertions that must be expanded for helper semantics.
- `test/release_governance_contract.test.mjs` — Root release command and docs-governance assertions that currently lock only appearance and placement/relation surfaces.
- `test/exact_hole_contract.test.mjs` — Root retained-model helper contract that should join the authoritative helper release surface.
- `test/exact_chamfer_contract.test.mjs` — Root retained-model helper contract for the new chamfer descriptor.
- `packages/occt-core/test/core.test.mjs` — Package-level helper contract coverage already exercising the package-first helper family.
- `packages/occt-core/test/live-root-integration.test.mjs` — Live retained-model package integration coverage that should remain part of the package governance story.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `README.md`, `packages/occt-core/README.md`, and `docs/sdk/measurement.md`: existing exact-SDK docs already share a package-first / lower-level-root split that Phase 23 should extend rather than rewrite from scratch.
- `test/release_governance_contract.test.mjs`, `test/package_tarball_contract.test.mjs`, and `test/dist_contract_consumers.test.mjs`: the repo already has governance-style regex/assertion suites for README wording, type exports, release scripts, and package boundaries.
- `packages/occt-core/src/index.js` and `packages/occt-core/package.json`: the public package barrel is compact, so aligning a package-local typing file and export surface should be straightforward.
- `dist/occt-js.d.ts`: the root carrier typing file already uses rich inline documentation and explicit exact-result type aliases; that style can inform any package-local helper typings.

### Established Patterns
- Root release governance locks contract drift through repository tests that inspect docs, package metadata, and published typings rather than relying on ad hoc manual review.
- Package-first docs consistently treat `@tx-code/occt-core` as the main downstream entry point and the root Wasm carrier as the lower-level reference surface.
- Secondary surfaces remain conditional and are intentionally kept out of `npm run test:release:root`.

### Integration Points
- Phase 23 will primarily touch `README.md`, `packages/occt-core/README.md`, `docs/sdk/measurement.md`, `package.json`, `packages/occt-core/package.json`, package-local typing files, and the governance/contract tests under `test/` plus `packages/occt-core/test/`.
- The new package typing/export surface must line up with the existing `packages/occt-core/src/index.js` barrel and the helper methods implemented in `packages/occt-core/src/occt-core.js`.
- Release governance changes must preserve the current split: root release gate remains authoritative, while secondary-surface verification stays conditional.

</code_context>

<specifics>
## Specific Ideas

- `docs/sdk/measurement.md` currently ends with “feature semantics such as hole or chamfer recognition” remaining downstream. That statement is now stale and should be replaced with wording that keeps only richer feature discovery and viewer-owned semantics downstream.
- `README.md` and `packages/occt-core/README.md` still document placement/relation as the full exact SDK surface. Phase 23 should extend them to name the Phase 21-22 helper family explicitly and document the narrow support boundaries instead of leaving them implicit in tests.
- `packages/occt-core/package.json` currently has no `types` field and exports only `./src/index.js`. That is a gap if `@tx-code/occt-core` is the primary documented SDK entrypoint for exact helpers.
- `npm run test:release:root` currently omits `test/exact_hole_contract.test.mjs` and `test/exact_chamfer_contract.test.mjs`. If helper semantics are part of the shipped runtime/package contract, that omission should be closed in Phase 23.

</specifics>

<deferred>
## Deferred Ideas

- Splitting the helper guide into multiple SDK documents or building a full docs site navigation overhaul — unnecessary scope expansion for this milestone
- Adding batch semantic discovery, richer feature families, or viewer-owned helper UX examples — future deeper-semantics or app-layer work
- Turning demo/Babylon/Tauri docs or verification into part of the authoritative root helper release gate — remains out of scope

</deferred>

---

*Phase: 23-helper-sdk-docs-governance*
*Context gathered: 2026-04-18*
