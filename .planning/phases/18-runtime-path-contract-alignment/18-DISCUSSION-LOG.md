# Phase 18: Runtime Path Contract Alignment - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-17
**Phase:** 18-runtime-path-contract-alignment
**Mode:** auto
**Areas discussed:** Runtime contract anchor, phase scope boundary, verification strategy, runtime variant handling

---

## Runtime contract anchor

| Option | Description | Selected |
|--------|-------------|----------|
| Concrete file paths | Use explicit `dist/occt-js.js` and `dist/occt-js.wasm` file URLs as the shared local/dev contract across root tests and the demo hook | ✓ |
| Directory base | Revert to a shared `dist/` directory-base lookup and infer the JS/Wasm files from it | |
| Let the agent decide | Planner may choose either direction later | |

**User's choice:** Auto-selected recommended option: concrete file paths
**Notes:** Chosen because `demo/src/hooks/useOcct.js` and `demo/tests/use-occt-runtime-contract.test.mjs` already enforce this behavior, while `test/dist_contract_consumers.test.mjs` is the stale side of the drift.

---

## Phase scope boundary

| Option | Description | Selected |
|--------|-------------|----------|
| Runtime-path only | Limit Phase 18 to reconciling preflight/runtime-path drift and restoring a green `test:wasm:preflight` gate | ✓ |
| Broaden into governance | Also decouple `.planning` archive-state governance assertions in this phase | |
| Let the agent decide | Planner may expand or compress the phase boundary later | |

**User's choice:** Auto-selected recommended option: runtime-path only
**Notes:** Chosen to preserve the roadmap split where governance decoupling is Phase 19 and secondary-surface cleanup is Phase 20.

---

## Verification strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Preflight-first | Use `npm run test:wasm:preflight` and targeted contract tests as the Phase 18 success gate while keeping negative `dist/` checks intact | ✓ |
| Full root suite only | Treat `npm test` as the only meaningful validation target for this phase | |
| Let the agent decide | Planner may choose between targeted and broad verification later | |

**User's choice:** Auto-selected recommended option: preflight-first
**Notes:** Chosen because the phase requirements are specifically about `PATH-01` / `PATH-02` drift in the preflight contract, not full milestone verification breadth.

---

## Runtime variant handling

| Option | Description | Selected |
|--------|-------------|----------|
| Preserve variants | Keep local dev, Tauri, and production-web runtime branches intact; only reconcile the local/dev contract touched by this phase | ✓ |
| Redesign all loading modes | Rework dev, Tauri, and production runtime resolution together in one phase | |
| Let the agent decide | Planner may widen the loader scope later | |

**User's choice:** Auto-selected recommended option: preserve variants
**Notes:** Chosen to avoid dragging CDN/offline or Tauri packaging policy into a phase scoped to local/dev runtime-path alignment.

---

## the agent's Discretion

- Remove duplicate runtime-path coverage if two tests are asserting the same concrete-file behavior with no extra value.
- Choose the narrowest code-change surface that restores a coherent shared contract.

## Deferred Ideas

- `.planning`-coupled release-governance cleanup — Phase 19
- Demo/Babylon command discoverability and package-local verification fixes — Phase 20
- Production web fallback/CDN hardening — future work outside Phase 18
