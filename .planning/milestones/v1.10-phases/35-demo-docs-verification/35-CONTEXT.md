# Phase 35: Demo Docs & Verification - Context

**Gathered:** 2026-04-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 35 closes `v1.10 Exact Measurement Demo Loop` by documenting the shipped demo measurement workflow, tightening the demo browser-verification lane, and locking the measurement integration boundary as a conditional secondary-surface flow.

This phase delivers:

- demo-facing documentation for the workpiece-plus-tool exact measurement loop
- package/root doc cross-links that explain where demo workflow ends and package/runtime contracts begin
- automated demo coverage for load, select, measure, and invalidation or disposal behavior
- secondary-surface governance that keeps measurement-demo verification explicit without widening `npm run test:release:root`

This phase does not deliver:

- new exact-kernel behavior, new measurement DTOs, or new runtime/package APIs
- new viewer interaction semantics beyond small testability or documentation affordances
- desktop/Tauri-specific measurement behavior
- richer discovery, history export, labels, or annotation authoring

</domain>

<decisions>
## Implementation Decisions

### Documentation boundary
- **D-01:** Use one dedicated downstream demo workflow doc as the canonical measurement-loop walkthrough, then link to it from `README.md`, `packages/occt-core/README.md`, and `docs/sdk/measurement.md`. This keeps the runtime/package docs concise while still making the shipped demo path discoverable.
- **D-02:** Document the actual Phase 34 command matrix rather than an aspirational feature list:
  - single face: `face-area`, plus `radius` or `diameter` only when supported by the selected geometry
  - single edge: `edge-length`, plus `radius` or `diameter` only when supported by the selected geometry
  - two refs: `distance`, `angle`, and `thickness` when the current ref kinds are accepted by the shipped exact kernels
  - all other combinations: explicit unsupported feedback
- **D-03:** Exact-model lifecycle expectations must stay explicit in the docs. Measurement runs and overlays are valid only while the underlying actor exact sessions and actor poses remain unchanged; workpiece replacement, tool replacement, workspace reset, and tool-pose changes invalidate prior runs.
- **D-04:** Package docs should explain the downstream boundary clearly: the demo measurement loop consumes package-first exact refs and helpers, but command availability, result presentation, overlay rendering, and actor UX remain demo-owned concerns.

### Verification boundary
- **D-05:** `npm --prefix demo run test:e2e` should become the authoritative demo-browser verification lane for the measurement MVP, not just a project-home smoke path. It should cover both app-shell entry and interaction-level measurement regression.
- **D-06:** Browser verification should prove at least one lifecycle invalidation case in addition to the happy-path measurement flow. The minimum recommended case is measurement-state clearing on exact-session replacement or actor-pose invalidation.
- **D-07:** Secondary-surface governance should live in `test/secondary_surface_contract.test.mjs`, because this phase is explicitly about demo/Babylon/Tauri routing and must stay outside the authoritative root release gate.
- **D-08:** `npm run test:release:root` remains unchanged. Phase 35 may strengthen docs and conditional contracts, but it must not add unconditional demo, Playwright, or Tauri checks to the root release surface.

### Scope guards
- **D-09:** Do not reopen the measurement algorithm or overlay semantics already proven in Phase 34. Phase 35 should lock what exists rather than invent new runtime or demo behavior.
- **D-10:** Prefer manifest-driven verification commands over ad hoc local command knowledge. If measurement interaction coverage is required, it should be reachable through documented demo scripts or an explicitly documented secondary-surface command matrix.
- **D-11:** Demo documentation should stay browser-demo scoped. Do not let this phase drift into desktop packaging guidance or generic product/tutorial copy.

### the agent's Discretion
- The exact file split between root README notes, package README notes, SDK-guide additions, and the dedicated demo workflow guide
- Whether the demo-browser verification lane includes both specs via one command or routes through a narrowly named companion script, as long as the command surface is explicit and governance-locked
- Which lifecycle invalidation browser scenario is used first, as long as it proves measurement state cannot survive stale exact-session or actor-pose changes

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone and repository contract
- `.planning/PROJECT.md` — active `v1.10` framing and the rule that demo measurement UX remains downstream
- `.planning/REQUIREMENTS.md` — `DOCS-05`, `E2E-01`, and `GOV-03`
- `.planning/ROADMAP.md` — Phase 35 goal, success criteria, and 35-01 / 35-02 split
- `.planning/STATE.md` — workflow position after Phase 34 closeout
- `AGENTS.md` — authoritative root release boundary and conditional demo verification rules

### Prior phase outputs that Phase 35 must lock down
- `.planning/phases/33-demo-exact-bridge/33-CONTEXT.md` — exact-session replacement and reset boundary
- `.planning/phases/33.1-multi-actor-exact-workspace/33.1-CONTEXT.md` — actor-scoped workspace and tool-pose ownership
- `.planning/phases/33.1-multi-actor-exact-workspace/33.1-02-SUMMARY.md` — shipped cross-model pairwise bridge and actor-aware selection contract
- `.planning/phases/34-measurement-commands-overlay-mvp/34-CONTEXT.md` — Phase 34 command matrix, overlay rules, and invalidation policy
- `.planning/phases/34-measurement-commands-overlay-mvp/34-01-SUMMARY.md` — shipped typed result history and selection-driven measurement actions
- `.planning/phases/34-measurement-commands-overlay-mvp/34-02-SUMMARY.md` — shipped placement-backed overlay MVP

### Public docs and package/runtime surfaces
- `README.md` — root release boundary and top-level user-facing docs
- `packages/occt-core/README.md` — package-first exact measurement SDK docs
- `docs/sdk/measurement.md` — current package-first measurement guide and lifecycle rules
- `demo/package.json` — manifest-level demo verification entrypoints
- `package.json` — authoritative root release and secondary-surface contract commands

### Existing verification and demo integration points
- `test/secondary_surface_contract.test.mjs` — governance contract for conditional demo/Babylon/Tauri verification
- `demo/tests/app-home.spec.mjs` — current project-home browser smoke
- `demo/tests/demo.spec.mjs` — current interaction regression suite including measurement actions and overlay behavior
- `demo/tests/viewer-store.test.mjs` — node coverage for measurement invalidation boundaries
- `demo/src/hooks/useOcct.js` — exact-session replacement and disposal behavior
- `demo/src/hooks/useViewerActions.js` — user-facing close/reset behavior
- `demo/src/store/viewerStore.js` — measurement history, active result, and reset semantics

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `demo/tests/demo.spec.mjs` already proves the happy-path workpiece-plus-tool measurement loop, including run, rerun, active overlay switching, and clear-all behavior.
- `demo/tests/viewer-store.test.mjs` already locks the store-level rule that measurement runs clear on actor replacement, tool-pose changes, and reset.
- `demo/src/hooks/useOcct.js` already has the exact-session disposal and replacement seams that browser verification can exercise through import or generated-tool replacement flows.
- `test/secondary_surface_contract.test.mjs` is already the contract location for conditional demo verification routing and should absorb Phase 35 governance checks instead of widening root release governance.
- `README.md` and `AGENTS.md` already publish the touched-path verification matrix; Phase 35 should refine that truth rather than create a second competing matrix.

### Established Patterns
- Root docs explain release boundaries and downstream concerns, while package-first SDK details live in `packages/occt-core/README.md` and `docs/sdk/measurement.md`.
- Secondary-surface verification is enforced through one explicit contract suite (`npm run test:secondary:contracts`) rather than folded into `npm run test:release:root`.
- Demo Playwright coverage keeps helper functions in `demo/tests/demo.spec.mjs` and treats user-visible workflows as the primary assertion surface.

### Integration Points
- Docs: root README and package README should link into one demo workflow guide rather than duplicating a large interaction walkthrough three times.
- Manifest routing: `demo/package.json` is the authoritative place to declare which browser specs make up the supported demo E2E lane.
- Governance: `test/secondary_surface_contract.test.mjs` should assert both the docs matrix and the demo manifest routing so the conditional lane cannot drift silently.

</code_context>

<specifics>
## Specific Ideas

- The missing documentation gap is not package/runtime API syntax; that already exists. The real gap is the downstream demo workflow: how a user gets from workpiece import and generated-tool load to actor-scoped selection, supported commands, panel-only fallbacks, and measurement invalidation boundaries.
- The browser-verification gap is also narrow and concrete: the repo already has measurement interaction coverage in `demo/tests/demo.spec.mjs`, but the manifest-routed `demo` E2E command still only points at the project-home smoke.
- Phase 35 should make the conditional demo lane more truthful and usable, not heavier by accident. If a broader Playwright route is added, it must remain explicit demo-only verification outside the root release gate.

</specifics>

<deferred>
## Deferred Ideas

- Full end-user tutorial content, screenshots, or marketing-style walkthrough docs
- Desktop/Tauri measurement workflow docs
- Broad measurement candidate discovery or feature-semantic documentation
- New measurement UI affordances beyond what already shipped in Phase 34

</deferred>

---

*Phase: 35-demo-docs-verification*
*Context gathered: 2026-04-21*
