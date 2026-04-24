# Phase 36: Semantic Helper Foundations - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `36-CONTEXT.md`; this log preserves the alternatives considered.
> Historical note (2026-04-21): the candidate-analysis direction discussed here was later dropped before acceptance when `v1.11` was narrowed back to helper-only scope. The retained active scope keeps only Plan `36-01`.

**Date:** 2026-04-21
**Phase:** 36-semantic-helper-foundations
**Mode:** Non-interactive fallback during `$gsd-next`; default recommended decisions were selected because this session is running in Default mode without interactive question prompts.
**Areas discussed:** semantic family scope, package/runtime boundary, candidate-analysis scope, verification boundary

---

## Semantic Family Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Compound hole variants first | Extend the shipped hole helper family with supported `counterbore` / `countersink` semantics over selected exact refs before broader groove or solver-style helpers | ✓ |
| Slot-width or groove semantics first | Reopen slot-width families and broader profile-style groove recognition in Phase 36 | |
| Richer symmetry variants first | Spend the phase extending the already shipped midpoint / symmetry helper family before adding new single-ref semantics | |

**User's choice:** Auto-selected recommended option: compound hole variants first
**Notes:** Existing helper surfaces already cover `describeExactHole(ref)`, `describeExactChamfer(ref)`, `suggestExactMidpointPlacement(...)`, `describeExactEqualDistance(...)`, and `suggestExactSymmetryPlacement(...)`. The highest-signal gap is therefore a new single-ref semantic family that deepens measurement value without reopening viewer policy or redoing shipped pairwise helpers.

---

## Package/Runtime Boundary

| Option | Description | Selected |
|--------|-------------|----------|
| Package-first family helpers with one shared narrow carrier descriptor if needed | Expose additive package helpers such as `describeExactCounterbore(ref)` / `describeExactCountersink(ref)`, and only add one selected-ref root descriptor when current hole primitives are insufficient | ✓ |
| Expand `describeExactHole(ref)` in place | Fold all new semantics into the existing hole helper surface and root DTO | |
| Root-first generic feature discovery API | Add broad topology traversal or feature discovery to the carrier and let packages wrap it later | |

**User's choice:** Auto-selected recommended option: package-first family helpers with one shared narrow carrier descriptor if needed
**Notes:** This keeps public downstream APIs package-first and additive while preserving the established rule that new root support must be justified by unavoidable topology insight rather than demo UX.

---

## Candidate-Analysis Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Deterministic analysis over caller-supplied exact refs | Add package-first selection analysis that derives supported measurement or helper candidates from exact refs and shipped helper surfaces | ✓ |
| Whole-model feature discovery | Scan full models or actors for semantic candidates without an explicit caller selection | |
| Demo-only inspector DTOs | Put candidate logic directly in the demo and defer any package API until later | |

**User's choice:** Auto-selected recommended option: deterministic analysis over caller-supplied exact refs
**Notes:** Phase 37 needs a reusable building block for supported suggestions, but Phase 36 should stay free of viewer ids, session state, and whole-model recognition scope. Selection-driven candidate descriptors are the narrowest reusable contract.

---

## Verification Boundary

| Option | Description | Selected |
|--------|-------------|----------|
| Root/package contract-first, no demo/browser work in Phase 36 | Prove any compound-hole carrier support with focused root tests and keep candidate analysis package-tested and live-integration-tested | ✓ |
| Demo-first validation | Start by wiring suggestions in the browser demo before locking package/runtime contracts | |
| Widen the authoritative root gate | Make candidate-analysis or demo suggestion work part of `npm run test:release:root` | |

**User's choice:** Auto-selected recommended option: root/package contract-first, no demo/browser work in Phase 36
**Notes:** The repo boundary is already settled: Phase 36 should prepare exact package/runtime surfaces, while Phase 37 owns demo suggestion UX and Phase 38 owns docs/governance.

---

## the agent's Discretion

- Choose the exact shared carrier descriptor name for compound-hole semantics as long as it stays selected-ref-based, additive, and internal to package-first public helpers.
- Choose the final candidate-descriptor field names as long as they remain deterministic, occurrence-safe, and free of viewer/session policy.
- Decide whether existing shipped fixtures are stable enough for compound-hole tests before adding a new dedicated fixture.

## Deferred Ideas

- Slot-width or groove semantics, richer symmetry families, and solver-style constraints
- Whole-model semantic discovery or batch feature recognition
- Demo inspector labels, icons, ranking policy, or session-owned suggestion state
