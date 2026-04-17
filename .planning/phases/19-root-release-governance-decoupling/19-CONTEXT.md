# Phase 19: Root Release Governance Decoupling - Context

**Gathered:** 2026-04-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 19 removes `.planning` archive-state coupling from the authoritative root release gate while preserving the real root npm release contract: Windows Wasm build, packaged runtime artifacts, published typings, root/package docs, `@tx-code/occt-core`, and the full root runtime suite. This phase is limited to release-governance decoupling and documentation alignment; it must not turn demo, Babylon, or Tauri verification into unconditional root release blockers.

</domain>

<decisions>
## Implementation Decisions

### Root release gate scope
- **D-01:** Keep `npm run test:release:root` focused on the publishable root contract only: the Windows Wasm build, root runtime/package/typings/docs coverage, `@tx-code/occt-core`, and the full root runtime suite. Archived milestone filenames, shipped dates, active `.planning` state strings, and other live planning-lifecycle details are not part of the npm release surface.
- **D-02:** Preserve the existing root-gate coverage that is actually release-relevant, especially `package.json` script governance, packaged tarball/type surface checks, root/package README guidance, `AGENTS.md`, the release skill shim, and the exact-measurement/import-appearance SDK docs already treated as part of the shipped contract.

### Planning audit separation
- **D-03:** If planning/archive audits remain, move them behind a separate explicit maintainer command surfaced from the repo root rather than leaving them embedded in `npm run test:release:root`.
- **D-04:** The planning audit lane should have its own file and failure semantics so maintainers can intentionally validate milestone/archive health without blocking root npm release verification on unrelated process drift.

### Documentation alignment
- **D-05:** Align `README.md`, `AGENTS.md`, `packages/occt-core/README.md`, and `.codex/skills/releasing-occt-js/SKILL.md` to the same split: one authoritative root release gate plus one separate planning/archive audit path when maintainers need process verification.
- **D-06:** Preserve the existing semver-vs-milestone guidance in `AGENTS.md` and any touched release docs. The updated release story must continue to state that GSD milestone markers and archived planning state do not, by themselves, mean npm publish readiness or downstream vendor refresh.

### Scope boundary
- **D-07:** Do not broaden this phase into Phase 20 work such as demo/Babylon command discoverability, hoist-only dependency cleanup, or secondary-surface manifest changes. Phase 19 may only preserve the existing conditional-secondary-surface language while decoupling release governance.

### the agent's Discretion
- Choose the exact name and implementation shape of the separate planning/archive audit command as long as it is explicit, repo-root discoverable, and absent from `npm run test:release:root`.
- Decide whether to split `test/release_governance_contract.test.mjs` into separate root-release and planning-audit files or to extract the planning assertions into another file, as long as the authoritative root gate no longer depends on live `.planning` archive-state details.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone and repository policy
- `.planning/PROJECT.md` — Active milestone framing, root-release boundary, and the decision that release hardening comes before new runtime API expansion.
- `.planning/REQUIREMENTS.md` — `GOV-02`, `GOV-03`, and `DOCS-02` define the required outcome for this phase.
- `.planning/ROADMAP.md` — Phase 19 goal, success criteria, and dependency chain.
- `AGENTS.md` — Repository-level release boundary, conditional secondary-surface policy, and semver-vs-milestone guidance that must survive this phase.

### Root release command and governance tests
- `package.json` — Current `test:release:root`, `test:wasm:preflight`, and `test` command surfaces that Phase 19 must preserve or refine.
- `test/release_governance_contract.test.mjs` — Existing governance suite mixing real release-surface assertions with `.planning` archive-state assertions that need to be decoupled.
- `test/package_tarball_contract.test.mjs` — Release-relevant packaged-surface checks that should remain on the authoritative root gate.

### Release-facing documentation
- `README.md` — Public root release gate guidance and root-vs-secondary-surface verification wording.
- `packages/occt-core/README.md` — Package-first downstream release guidance that references the authoritative root gate.
- `docs/sdk/measurement.md` — SDK guide already treated as part of the shipped exact-measurement contract.
- `.codex/skills/releasing-occt-js/SKILL.md` — Thin release shim that must stay aligned with `AGENTS.md` and the updated gate split.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `test/release_governance_contract.test.mjs`: Existing source-text governance suite already centralizes the release-gate assertions and is the natural place to carve out `.planning`-specific checks.
- `package.json`: Canonical maintainer command surface for root release verification; any new planning-audit entrypoint should live here if it is meant to be discoverable.
- `README.md`, `packages/occt-core/README.md`, `AGENTS.md`, `.codex/skills/releasing-occt-js/SKILL.md`: Existing docs already encode the root-vs-secondary-surface boundary and can be aligned without inventing a new documentation surface.
- `test/package_tarball_contract.test.mjs` and the root exact-contract suites: Existing runtime/package verification that should remain untouched by the governance split except for command wiring.

### Established Patterns
- Release-governance tests use `node:test` plus source-text assertions over package scripts, docs, and skill files instead of invoking workflow tooling directly.
- Root maintainer entrypoints are discoverable through top-level `package.json` scripts, not hidden direct `node` commands.
- `AGENTS.md` is the source of truth for repo policy; thin release skills and package docs are expected to mirror it rather than redefine it.

### Integration Points
- `package.json` `test:release:root` is the authoritative command that must stop depending on live `.planning` archive-state assertions.
- `test/release_governance_contract.test.mjs` is the primary contract file that needs the root-release-vs-planning-audit split.
- `README.md`, `packages/occt-core/README.md`, `AGENTS.md`, and `.codex/skills/releasing-occt-js/SKILL.md` are the documentation surfaces that must describe the updated split consistently.

</code_context>

<specifics>
## Specific Ideas

- The current drift is not about runtime or package breakage; it comes from `test/release_governance_contract.test.mjs` asserting archived-v1.4 and "no active milestone" planning state that became false as soon as `v1.5` started.
- The cleanest Phase 19 outcome is to keep the real release-surface assertions intact while extracting `.planning` archive-state checks into a separate planning audit lane.
- A separate planning audit should be explicit and discoverable from the repo root rather than turning into undocumented maintainer lore.

</specifics>

<deferred>
## Deferred Ideas

- Demo and Babylon verification discoverability plus hoist-only dependency cleanup belong to Phase 20.
- Fixing `gsd-tools` template drift around `phase complete` warnings is tooling/backlog work, not a blocker for Phase 19 release-governance decoupling.
- Actual semver bumping, npm publishing, and downstream vendor refresh remain release-time operations, not part of this phase.

</deferred>

---

*Phase: 19-root-release-governance-decoupling*
*Context gathered: 2026-04-17*
