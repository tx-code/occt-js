---
phase: 19-root-release-governance-decoupling
verified: 2026-04-17T13:15:00Z
status: passed
score: 4/4 must-haves verified
overrides_applied: 0
---

# Phase 19: Root Release Governance Decoupling Verification Report

**Phase Goal:** Maintainers can run the authoritative root release gate without `.planning` archive-state coupling while still enforcing the published runtime, package, typings, and docs contract.
**Verified:** 2026-04-17T13:15:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | `npm run test:release:root` passes or fails based on published root runtime, package, typings, and docs contract drift, not on archived milestone filenames, shipped dates, or `.planning/STATE.md` strings. | ✓ VERIFIED | `test/release_governance_contract.test.mjs` no longer imports `existsSync` or reads `.planning/*`; it keeps release-surface assertions only and adds an explicit guard that `test:release:root` excludes planning-audit coverage; `npm run test:release:root` passed under the active `v1.5` milestone. |
| 2 | Any retained planning or archive audit runs through a separate explicit command or documented path outside the authoritative root release gate. | ✓ VERIFIED | `package.json` now exposes `test:planning:audit`; `test/planning_archive_contract.test.mjs` is wired only to that command; `npm run test:planning:audit` passed separately from the root release gate. |
| 3 | `README.md`, `AGENTS.md`, and related package release guidance describe the updated runtime-first gate and separate planning audit path consistently. | ✓ VERIFIED | `README.md`, `AGENTS.md`, `packages/occt-core/README.md`, and `.codex/skills/releasing-occt-js/SKILL.md` all mention `npm run test:planning:audit` as separate from the authoritative root release gate; `node --test test/release_governance_contract.test.mjs` passed 15/15 including the new docs assertion. |
| 4 | Conditional demo, Babylon, and Tauri verification remains outside the unconditional root release gate after the governance split. | ✓ VERIFIED | `package.json` `test:release:root` remains unchanged in its exclusion of demo/Tauri/Babylon surfaces; `README.md`, `AGENTS.md`, and the release skill still describe those surfaces as conditional secondary-surface verification; the full root release gate passed. |

**Score:** 4/4 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `package.json` | Separate root release and planning-audit command surfaces | ✓ VERIFIED | `test:release:root` remains the authoritative runtime-first gate; `test:planning:audit` now exposes the separate `.planning` audit. |
| `test/release_governance_contract.test.mjs` | Root governance assertions scoped to publishable root contract | ✓ VERIFIED | 15 passing assertions; no live `.planning` archive-state coupling remains. |
| `test/planning_archive_contract.test.mjs` | Separate planning/archive audit outside the root release gate | ✓ VERIFIED | 3 passing assertions covering active milestone consistency, completed phase artifacts, and archived milestone links. |
| `README.md`, `AGENTS.md`, `packages/occt-core/README.md`, `.codex/skills/releasing-occt-js/SKILL.md` | Consistent release guidance for the gate split | ✓ VERIFIED | All four surfaces reference the separate planning-audit path and preserve the root-vs-secondary-surface boundary. |

### Key Link Verification

| From | To | Via | Status | Details |
| --- | --- | --- | --- | --- |
| `package.json` | `test/release_governance_contract.test.mjs` | `test:release:root` script membership | ✓ WIRED | The authoritative release command still routes through the root governance contract test but no longer includes planning-audit coverage. |
| `package.json` | `test/planning_archive_contract.test.mjs` | `test:planning:audit` script membership | ✓ WIRED | The new planning audit is explicit and separate from the root release gate. |
| `README.md`, `AGENTS.md`, `packages/occt-core/README.md`, `.codex/skills/releasing-occt-js/SKILL.md` | `test/release_governance_contract.test.mjs` | source-text governance assertions | ✓ WIRED | The release-governance suite now locks the new planning-audit wording across all touched release-facing docs. |
| `README.md` / `AGENTS.md` / skill | `package.json` | documented command surfaces | ✓ WIRED | Each touched doc points maintainers to the same root release and planning-audit commands. |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| --- | --- | --- | --- |
| Root governance contract test passes after `.planning` split | `node --test test/release_governance_contract.test.mjs` | 15 tests passed, 0 failed | ✓ PASS |
| Separate planning audit passes on current repo state | `npm run test:planning:audit` | 3 tests passed, 0 failed | ✓ PASS |
| Full authoritative root release gate passes under active `v1.5` milestone | `npm run test:release:root` | build, governance, `occt-core`, preflight, and full root runtime suite all passed | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| --- | --- | --- | --- | --- |
| `GOV-02` | `19-01-PLAN.md` | `npm run test:release:root` enforces the published runtime/package/docs contract without hardcoding archived milestone filenames, shipped dates, or `.planning/STATE.md` strings unrelated to the npm release surface. | ✓ SATISFIED | `test/release_governance_contract.test.mjs` no longer reads `.planning/*`; the active `v1.5` repo state still passed the full root release gate. |
| `GOV-03` | `19-01-PLAN.md` | Planning/archive audits, if retained, run outside the authoritative root release gate so repository process drift does not block runtime releases. | ✓ SATISFIED | `package.json` adds `test:planning:audit`; `test/planning_archive_contract.test.mjs` is invoked only from that command; both separate and full-gate executions passed. |
| `DOCS-02` | `19-02-PLAN.md` | Root release guidance in `README.md`, `AGENTS.md`, and related package docs stays aligned with the updated runtime-first gate and any relocated planning audit path. | ✓ SATISFIED | All touched docs and the release skill mention the same gate split, and `test/release_governance_contract.test.mjs` locks that wording in place. |

Orphaned requirements: none. Phase 19 maps exactly to `GOV-02`, `GOV-03`, and `DOCS-02`, and all three are covered by executed plan artifacts.

### Gaps Summary

No blocking gaps found. Phase 19 achieved the release-governance decoupling goal while keeping the authoritative root release gate green on the active milestone state.

---

_Verified: 2026-04-17T13:15:00Z_  
_Verifier: Codex (local verification pass)_
