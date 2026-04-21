# Phase 33: Demo Exact Bridge - Context

**Gathered:** 2026-04-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 33 adds the browser-demo bridge between the already-shipped exact measurement kernel and the existing Babylon selection flow. This phase keeps one managed exact-model session alive beside the rendered scene, resolves picked faces, edges, and vertices into occurrence-safe exact refs, and clears or replaces that bridge cleanly when the loaded model changes.

This phase does not deliver measurement commands, result panels, placement overlays, or broader viewer widgets. Those belong to Phase 34 and later.

</domain>

<decisions>
## Implementation Decisions

### Exact session ownership
- **D-01:** The demo must own exactly one active exact session for the currently loaded model. Loading a new file, generating a new shape, or resetting the viewer must dispose the previous exact session before the next one becomes authoritative.
- **D-02:** Imported CAD and generated shapes should converge on one demo-local `exact session` shape so Phase 34 can consume one bridge API. If the package layer lacks a generic managed wrapper for generated exact results, keep that wrapper demo-local in this phase rather than widening the package boundary.
- **D-03:** Explicit disposal remains the contract path. `FinalizationRegistry` semantics from `occt-core` stay best-effort only and must not be relied on by the demo lifecycle.

### Selection-to-ref mapping
- **D-04:** The bridge must resolve exact refs from stable OCCT-side identifiers such as `geometryId`, `exactGeometryBindings`, element kind, element id, and occurrence transform. Babylon mesh ids, instance ids, and highlight tokens are local UI details and must not become the measurement contract.
- **D-05:** Face, edge, and vertex picks should be enriched into measurement-ready selection records as soon as the user selects them, rather than deferring exact-ref resolution until a later command button is clicked.
- **D-06:** The bridge must preserve occurrence transforms explicitly in the resolved `OcctExactRef`. Exact queries and placements already depend on that transform contract and Phase 33 should not invent a viewer-only shortcut.

### Orientation and invalidation policy
- **D-07:** Orientation mode changes should not force a fresh exact import by default. The exact model remains tied to the loaded source or generated shape, while selection resolution must derive transforms from the currently rendered presentation.
- **D-08:** Any model replacement, exact-open failure, or session disposal must clear selection-derived exact refs and future measurement state immediately so stale handles cannot leak into Phase 34 actions.
- **D-09:** Pick mode changes may continue clearing UI selection summaries, but the bridge state must be invalidated from store-level actions rather than hidden inside Babylon-only objects.

### Scope guards
- **D-10:** Phase 33 stays generic over imported CAD and generated shapes. The user has explicitly rejected tool-coupled runtime design, so the bridge must not encode tool-library semantics beyond demo-only labels already present in the viewer.
- **D-11:** No new root exact APIs should be added in this phase unless planning proves an actual missing primitive. The immediate risk is demo integration correctness, not kernel breadth.

### the agent's Discretion
- The exact shape of the demo-local `exact session` object and whether it lives wholly in `viewerStore` or is split between store and hook-local refs.
- The internal indexing strategy that maps `geometryId` plus subshape ids to exact refs, as long as it does not expose Babylon ids as contract data.
- Whether generated-shape exact sessions use a thin demo-local release wrapper around raw exact-open results or a more generalized helper, as long as the package boundary stays unchanged in Phase 33.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone and repository contract
- `.planning/PROJECT.md` — active `v1.10` framing, demo-first measurement scope, and root/package boundary.
- `.planning/REQUIREMENTS.md` — `DEMO-01` and `DEMO-02` plus milestone-wide out-of-scope limits.
- `.planning/ROADMAP.md` — Phase 33 goal, success criteria, and plan split for the exact bridge.
- `.planning/STATE.md` — current workflow position and the next-step expectation that planning starts from this context.
- `AGENTS.md` — repository rules for GSD workflow, root release boundaries, and conditional demo verification.

### Prior exact-measurement and lifecycle decisions
- `.planning/milestones/v1.4-phases/15-placement-contract-hardening/15-CONTEXT.md` — exact placement DTO boundary and the rule that overlay/rendering stays downstream.
- `.planning/milestones/v1.7-phases/24-exact-model-lifecycle-governance/24-01-SUMMARY.md` — authoritative root lifecycle contract for retained exact-model ids and released-handle behavior.
- `.planning/milestones/v1.7-phases/24-exact-model-lifecycle-governance/24-02-SUMMARY.md` — package-first managed exact-model helpers and explicit `dispose()` semantics.
- `.planning/seeds/SEED-001-web-exact-brep-measurement.md` — dormant seed being resumed as demo-first measurement integration.

### Existing measurement and package contract docs
- `docs/sdk/measurement.md` — shipped package-first measurement, placement, helper, and lifecycle boundaries.
- `packages/occt-core/README.md` — current package-first exact APIs, managed lifecycle helpers, and explicit downstream viewer boundary.
- `dist/occt-js.d.ts` — canonical root typings for exact-open payloads, exact refs, and measurement methods already shipped.

### Demo/runtime integration points
- `demo/src/hooks/useOcct.js` — current import and generated-shape load paths that need exact-session retention.
- `demo/src/hooks/useViewer.js` — geometry-to-Babylon scene build path, `meshGeoMapRef`, and `metadata.occt.geometryId` attachment.
- `demo/src/hooks/usePicking.js` — current face/edge/vertex picking and selection-detail pipeline to extend with exact refs.
- `demo/src/store/viewerStore.js` — central serializable viewer state and reset behavior.
- `demo/src/components/SelectionPanel.jsx` — current consumer of selection detail; relevant because Phase 33 should enrich detail without yet adding measurement commands.
- `packages/occt-babylon-loader/src/occt-scene-builder.js` — metadata attached to meshes and instances, including `geometryId` and `nodeId`.
- `packages/occt-core/src/model-normalizer.js` — normalized geometry ids, root-node transforms, and generated-shape face-binding preservation.
- `packages/occt-core/src/occt-core.js` — managed exact-model helpers plus occurrence-aware exact measurement wrappers.

### Existing demo verification surfaces
- `demo/tests/demo.spec.mjs` — maintained browser interaction suite and current selection behavior coverage.
- `demo/tests/use-occt-runtime-contract.test.mjs` — maintained runtime-hook contract test for the demo import lane.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `demo/src/hooks/useOcct.js`: already owns OCCT runtime bootstrapping, imported-model loading, and generated-shape build entrypoints. It is the natural place to attach exact-session creation and replacement.
- `demo/src/hooks/useViewer.js`: already builds a stable `meshGeoMapRef` and consumes `metadata.occt.geometryId`, which is the key bridge from Babylon picks back to normalized OCCT geometry.
- `demo/src/hooks/usePicking.js`: already resolves face, edge, and vertex selections and writes structured `selectedDetail` records. This is the narrowest insertion point for measurement-ready exact refs.
- `demo/src/store/viewerStore.js`: already centralizes serializable selection state, model lifecycle, and reset actions; it is the correct place for cross-hook exact bridge state that Phase 34 can later consume.
- `packages/occt-core/src/occt-core.js`: already ships `openManagedExactModel(...)`, exact measurement wrappers, and explicit `dispose()` discipline for imported CAD.
- `packages/occt-babylon-loader/src/occt-scene-builder.js`: already stamps rendered meshes and instances with OCCT metadata, including `geometryId` and `nodeId`.

### Established Patterns
- Demo hooks keep Babylon objects in refs and keep store state serializable. Phase 33 should follow that split rather than storing raw Babylon meshes in Zustand.
- Normalized models and rendered meshes already meet through `geometryId`; this should remain the canonical bridge key instead of inventing another viewer-only lookup table.
- Exact refs are explicit occurrence-scoped DTOs with `exactModelId`, `exactShapeHandle`, `kind`, `elementId`, and `transform`. Phase 33 should resolve and store that exact shape directly.
- Managed exact lifecycle is explicit and deterministic: `dispose()` is authoritative, released handles must fail predictably, and fallback finalization is best-effort only.
- Auto-orient is presentation-layer model transformation, not a separate topology family. The exact bridge should account for transforms without forking kernel semantics.

### Integration Points
- `useOcct.importFile(...)` and generated-shape load flows need to produce both a rendered model result and an exact-session result that the store can replace atomically.
- `usePicking` needs enough exact-binding context to attach measurement-ready refs to `selectedDetail.items`.
- `viewerStore.reset()` and any model replacement path need to clear exact-session, selection bridge, and future measurement state together.
- Phase 34 should be able to read the Phase 33 bridge from store state without reaching into Babylon scene internals.

</code_context>

<specifics>
## Specific Ideas

- Keep the bridge generic. The user explicitly rejected tool-coupled runtime design; only the demo surface may still expose tool presets or labels.
- Import and generated-shape paths should converge on the same bridge vocabulary even if the generated-shape exact session needs a demo-local managed wrapper.
- Phase 33 should enrich selection data enough that Phase 34 can add measurement buttons and overlays without reworking picking fundamentals.
- Browser demo is the primary validation surface for this milestone. Tauri-specific measurement behavior is not needed here.

</specifics>

<deferred>
## Deferred Ideas

- Measurement commands, typed result panels, and placement-backed overlay rendering move to Phase 34.
- Demo docs, E2E measurement flows, and governance routing move to Phase 35.
- Whole-model measurement candidate discovery, semantic suggestion flows, and persistent history remain future work outside this phase.
- A generic package-first managed wrapper for generated exact-open results may be worth considering later, but it is not required to start Phase 33.

</deferred>

---

*Phase: 33-demo-exact-bridge*
*Context gathered: 2026-04-21*
