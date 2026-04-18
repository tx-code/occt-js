# Phase 19: Root Release Governance Decoupling - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-17
**Phase:** 19-root-release-governance-decoupling
**Mode:** auto
**Areas discussed:** Root release gate scope, planning audit path, documentation alignment, scope boundary

---

## Root release gate scope

| Option | Description | Selected |
|--------|-------------|----------|
| Publishable root contract only | Keep `npm run test:release:root` on build, runtime, package, typings, docs, `occt-core`, and root tests only | ✓ |
| Keep live planning state in gate | Continue asserting archived milestone filenames, shipped dates, and `.planning/STATE.md` text inside the root release gate | |
| Let the agent decide | Planner may choose how much `.planning` state stays in the root gate later | |

**User's choice:** Auto-selected recommended option: publishable root contract only
**Notes:** Chosen because `GOV-02` explicitly excludes archived milestone filenames, shipped dates, and `.planning` state strings from the authoritative npm release surface.

---

## Planning audit path

| Option | Description | Selected |
|--------|-------------|----------|
| Separate explicit command | Retain planning/archive audits behind a dedicated maintainer command outside `npm run test:release:root` | ✓ |
| Drop planning audit entirely | Remove planning/archive checks instead of relocating them | |
| Prose only | Describe the audit in docs without a runnable command surface | |

**User's choice:** Auto-selected recommended option: separate explicit command
**Notes:** Chosen because `GOV-03` requires any retained planning audit to live outside the authoritative root gate, and an explicit command is more discoverable than prose-only guidance.

---

## Documentation alignment

| Option | Description | Selected |
|--------|-------------|----------|
| Align all release-facing docs | Keep `README.md`, `AGENTS.md`, `packages/occt-core/README.md`, and the release skill on the same gate split | ✓ |
| AGENTS only | Update repo policy only and leave other docs to drift temporarily | |
| Let the agent decide | Planner may pick whichever docs seem easiest later | |

**User's choice:** Auto-selected recommended option: align all release-facing docs
**Notes:** Chosen because `DOCS-02` explicitly names root release guidance across multiple maintainer and downstream documentation surfaces.

---

## Scope boundary

| Option | Description | Selected |
|--------|-------------|----------|
| Governance only | Keep Phase 19 on release-governance decoupling and preserve conditional-secondary-surface wording without pulling in Phase 20 fixes | ✓ |
| Fold in Phase 20 cleanup | Also solve demo/Babylon discoverability and hoist-only dependency issues now | |
| Let the agent decide | Planner may expand or compress the phase boundary later | |

**User's choice:** Auto-selected recommended option: governance only
**Notes:** Chosen to preserve the roadmap split: Phase 19 decouples root release governance, while Phase 20 handles conditional secondary-surface verification and package-surface cleanup.

---

## the agent's Discretion

- Choose the exact script/test naming for the separate planning audit lane.
- Choose whether the split is implemented by extracting `.planning` assertions into a new file or by otherwise restructuring `test/release_governance_contract.test.mjs`, as long as the authoritative root gate no longer depends on live planning state.

## Deferred Ideas

- Demo/Babylon command discoverability and package-local dependency cleanup — Phase 20
- `gsd-tools` transition/template cleanup — future tooling/backlog work
- Release-time semver bump and npm publish mechanics — separate release workflow
