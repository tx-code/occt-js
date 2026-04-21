# Retrospective

## Milestone: v1.9 — Generic Profile Solids

**Shipped:** 2026-04-21

### What shipped

- The root Wasm carrier now exposes one shared `Profile2D` validation kernel reused across revolved and extruded generated-solid families.
- The runtime now supports additive linear extruded-shape validate/build/exact-open flows with canonical scene payloads and retained exact handles.
- Extruded generated output now preserves stable wall/cap semantics plus deterministic runtime-owned appearance grouping derived from segment tags and roles.
- `@tx-code/occt-core` now ships package-first wrappers, typings, and normalized additive metadata for the shared-profile and extruded-shape surface.
- Root/package docs, tarball checks, planning audit, and the authoritative root release gate now lock the shipped profile-solid contract end to end.

### What worked

- Keeping the geometry contract generic-first and explicitly downstreaming tool-library ownership prevented the runtime from slipping back into app-coupled semantics.
- Splitting the milestone into kernel, generated-family runtime, and package/governance phases made it straightforward to isolate regressions and prove additive behavior.
- Root contract tests plus package/governance checks provided strong coverage without widening unconditional demo, Babylon, or Tauri gates.

### What to revisit

- Milestone closeout still needed explicit backfill of `VERIFICATION.md` and summary frontmatter before the archive was fully GSD-complete.
- The dormant seed `SEED-001-web-exact-brep-measurement` remains open and still requires an explicit future milestone decision instead of implicit carry-over.

### Carry-forward ideas

- If the next geometry milestone expands beyond linear extrusion, keep one shared profile kernel and add family-specific constraints only where the math genuinely differs.
- Promote sweep, loft, or richer exact-measurement work only through a fresh milestone definition so the runtime boundary stays explicit.

## Milestone: v1.8 — Wasm+JS Revolved Shape Generation

**Shipped:** 2026-04-21

### What shipped

- The root Wasm carrier now exposes one generic revolved-shape contract with additive validate, build, and exact-open flows.
- Generated revolved shapes now preserve stable segment-to-face bindings, explicit runtime-owned roles, deterministic semantic colors, and exact/mesh validation metadata.
- `@tx-code/occt-core` now ships package-first wrappers and typings for revolved-shape validation, build, and exact-open flows.
- Root/package docs and release governance now lock the generic revolved-shape surface while keeping downstream tool presets demo-local.

### What worked

- Pulling tool semantics back out of the root runtime and naming the surface generically kept the Wasm carrier aligned with its intended boundary.
- Root contract tests plus package-wrapper tests were enough to stabilize exact-open, face binding, and governance behavior without widening demo checks into the root gate.
- Treating demo presets as downstream-only let the repo show realistic samples without letting app-specific schemas pollute the runtime contract.

### What to revisit

- Milestone closeout still needed manual backfill because planning artifacts lagged behind code reality for Phase 28 and Phase 29.
- Dedicated milestone audit coverage was missing at closeout time; the repo relied on phase evidence plus contract tests instead of a formal `v1.8` milestone audit.

### Carry-forward ideas

- Keep future geometry milestones generic-first at the root/package boundary and push app/vendor semantics outward unless there is a compelling kernel reason not to.
- If a future milestone expands beyond revolved shapes, define the next normalized geometry contract explicitly before touching demo presets or app-owned abstractions.

## Milestone: v1.7 — Exact Lifecycle & Performance

**Shipped:** 2026-04-20

### What shipped

- Root lifecycle governance now includes additive diagnostics snapshots and deterministic released-handle behavior across retained exact-query entry points.
- `@tx-code/occt-core` now provides package-first managed exact-model wrappers with explicit idempotent disposal and best-effort finalizer fallback.
- Phase 25 removed avoidable retained-query/store copy overhead, unified IGES staging across import/orientation, and added explicit perf visibility with `npm run test:perf:exact`.
- Phase 26 locked lifecycle/performance docs and command routing through governance tests and added explicit long-session soak coverage via `npm run test:soak:exact`.

### What worked

- Keeping lifecycle ownership explicit (`retain/release` and package-level `dispose`) preserved deterministic behavior while still improving ergonomics.
- Narrow, additive runtime changes paired with package-first wrappers kept API compatibility stable for downstream consumers.
- Contract-first governance and optional perf/soak lanes improved confidence without bloating the authoritative `npm run test:release:root` boundary.

### What to revisit

- Milestone closeout is still partially manual: archive generation, roadmap collapse, project/state evolution, and tagging remain operator work.
- Open-seed handling still needs explicit human acknowledgement during closeout, even when all milestone requirements are complete.

### Carry-forward ideas

- Start `v1.8` by formalizing `ECO-01` and `ECO-02` into concrete phases before expanding semantics.
- Keep future ecosystem and secondary-surface checks manifest-first and conditional so the root runtime release gate stays focused.

## Milestone: v1.6 — Exact Semantics Helpers

**Shipped:** 2026-04-18

### What shipped

- Package-first exact hole and chamfer helpers now ship through `@tx-code/occt-core`, with the root carrier only adding narrow selected-ref semantics where package composition required them.
- Package-only midpoint, equal-distance, and narrow midplane-style symmetry helpers now compose over the shipped exact placement and relation surface.
- `@tx-code/occt-core` now publishes explicit typings, and the authoritative root release gate now includes helper-aware governance coverage.

### What worked

- Keeping the root carrier narrow while composing higher-level helper semantics in package land preserved the runtime boundary and still delivered downstream value.
- Contract-first tests across root, package, docs, tarball, and governance layers kept the helper family coherent without reopening viewer behavior.
- Reusing the same runtime-first release gate let the milestone ship without adding unconditional secondary-surface verification creep.

### What to revisit

- `gsd-tools milestone complete` still leaves manual cleanup work for `ROADMAP.md`, `PROJECT.md`, `STATE.md`, `MILESTONES.md`, `RETROSPECTIVE.md`, and tag sequencing.
- Nyquist validation artifacts are still absent for Phases 21-23, so `v1.6` closes without phase-level validation records.

### Carry-forward ideas

- Promote deeper semantics only if they stay package-first, additive, and downstream-consumable without reopening viewer ownership.
- The next milestone should focus on lifecycle and performance before broader semantic discovery or ecosystem widening.

## Milestone: v1.5 — Root Release Hardening

**Shipped:** 2026-04-18

### What shipped

- Root preflight and the maintained demo dev runtime now share one concrete `dist/occt-js.js` / `dist/occt-js.wasm` contract.
- `npm run test:release:root` no longer depends on live `.planning` archive-state drift, and `npm run test:planning:audit` remains a separate process lane.
- Demo and Babylon verification is now manifest-first, package-owned, and explicitly conditional through touched-path docs plus `npm run test:secondary:contracts`.

### What worked

- Splitting the milestone into runtime-path, governance, and secondary-surface phases kept the corrective work narrow and avoided reopening unrelated CAD runtime behavior.
- Contract-first tests continued to be the fastest way to align implementation, docs, and release boundaries without turning demo or Babylon surfaces into unconditional blockers.
- Using a dedicated milestone audit before archival made the final closeout simpler and forced the requirement traceability back into one place.

### What to revisit

- `gsd-tools milestone complete` still leaves manual cleanup work for `ROADMAP.md`, `PROJECT.md`, `STATE.md`, `RETROSPECTIVE.md`, and final tag sequencing.
- Nyquist validation artifacts are still absent for Phases 18-20, so `v1.5` closes with optional follow-up validation rather than phase-level validation records.

### Carry-forward ideas

- Keep future secondary-surface work manifest-first and path-conditional instead of allowing demo, Babylon, or Tauri checks to creep into the authoritative root release gate.
- Review the deferred seed `001-web-exact-brep-measurement` against `v1.6` planning, but only promote it if the resulting scope stays package-first and additive.

## Milestone: v1.4 — Exact Measurement Placement & Relation SDK

**Shipped:** 2026-04-16

### What shipped

- The root Wasm carrier now exposes stable placement helpers for exact distance, angle, thickness, radius, and diameter.
- `@tx-code/occt-core` now provides package-first placement and relation wrappers that preserve occurrence transforms and explicit `none` semantics.
- The root runtime now exposes exact relation classification for `parallel`, `perpendicular`, `concentric`, `tangent`, and `none`.
- Package-first SDK docs, packaged typings, tarball checks, and `npm run test:release:root` now lock the exact placement/relation surface end to end.

### What worked

- Splitting the milestone into placement, relation, and docs/governance phases kept the surface area understandable and prevented viewer concerns from leaking into the runtime/package contract.
- Contract-first tests made the root carrier, `occt-core`, docs, tarball expectations, and release gate converge without reopening unrelated CAD import logic.
- Reusing the runtime-first release gate meant the new measurement SDK shipped without adding unconditional demo, Babylon, or Tauri verification creep.

### What to revisit

- `gsd-tools audit-open` still crashes with `ReferenceError: output is not defined` in this environment, so milestone-close preflight still requires manual fallback.
- `gsd-tools milestone complete` still leaves manual cleanup work for `ROADMAP.md`, `PROJECT.md`, `STATE.md`, phase archival, and release-governance assertions.

### Carry-forward ideas

- Only add richer measurement semantics if they remain package-first and additive, such as higher-level relation helpers or semantic classifiers built on top of the current placement/relation primitives.
- Keep selection UX, overlay rendering, label layout, and feature-recognition behavior explicitly downstream unless a future milestone intentionally changes that boundary.

## Milestone: v1.3 — Appearance Expansion

**Shipped:** 2026-04-15

### What shipped

- The root Wasm carrier now exposes explicit `defaultOpacity` import controls across read and exact-open APIs.
- Named `cad-solid` and `cad-ghosted` appearance presets now ship as part of the root import contract.
- `@tx-code/occt-core` now forwards preset/defaultOpacity input, promotes caller-friendly alpha when appropriate, and preserves root raw opacity.
- Root docs, packaged typings, tarball checks, and `npm run test:release:root` now lock the expanded appearance contract as a first-class package surface.

### What worked

- Splitting the milestone into runtime, adapter, and governance phases kept the surface area understandable and prevented viewer concerns from leaking into the root package.
- Contract-first tests let docs, typings, tarball checks, and runtime behavior converge without reopening unrelated CAD import logic.
- The runtime-first release gate stayed stable even while the public import appearance surface expanded materially.

### What to revisit

- `gsd-tools audit-open` still crashes with `ReferenceError: output is not defined` in this environment, so milestone-close preflight still requires manual fallback.
- `gsd-tools milestone complete` still leaves manual cleanup work for `ROADMAP.md`, `PROJECT.md`, `STATE.md`, and release-governance assertions.

### Carry-forward ideas

- Only add richer import-time appearance policy if it remains package-first, such as separate face/edge defaults or metadata-driven preset mapping.
- Keep app-side settings persistence, viewer overrides, and post-import display policy explicitly downstream unless a future milestone intentionally changes that boundary.

## Milestone: v1.2 — Import Appearance Contract

**Shipped:** 2026-04-15

### What shipped

- The root Wasm carrier now exposes `colorMode: "source" | "default"` with a documented built-in CAD fallback across STEP, IGES, and BREP imports.
- The runtime and `occt-core` now share one `defaultColor` contract, including explicit forwarding, normalization, and fallback-material behavior.
- Root docs, packaged typings, tarball checks, and `npm run test:release:root` now treat import appearance as a first-class package contract.

### What worked

- Keeping the milestone boundary at import-time runtime behavior prevented viewer repaint policy from leaking into the root package.
- Contract-first tests made the runtime, adapter, package, and docs layers converge without reopening unrelated CAD import behavior.
- The existing runtime-first release gate absorbed the new appearance surface without adding secondary-surface verification creep.

### What to revisit

- `gsd-tools audit-open` currently throws a CLI error in this environment, so milestone-close preflight still needs manual fallback.
- The next milestone should justify any further appearance expansion before broadening the public contract beyond default-color control.

### Carry-forward ideas

- Add richer import-time appearance controls only if they stay package-first, such as alpha/opacity fallback or curated appearance presets.
- Keep app-side settings persistence, viewer overrides, and post-import theme switching explicitly downstream unless a future milestone changes that boundary.

## Milestone: v1.1 — Exact BRep Measurement Foundation

**Shipped:** 2026-04-15

### What shipped

- Exact-model lifecycle handles were added to the root Wasm carrier with explicit invalid-after-release behavior.
- `occt-core` gained occurrence-scoped exact reference resolution over the existing exported topology ids.
- The runtime now exposes exact primitive geometry queries plus pairwise distance, angle, and thickness measurements with JS-friendly DTOs.
- Root docs, typings, and release governance now treat exact measurement as a first-class runtime contract.

### What worked

- Keeping the milestone boundary at wasm/core primitives avoided dragging viewer semantics into the root package.
- Runtime-first release gates stayed stable while the exact-measurement surface expanded.
- `imos-app` and `SceneGraph.net` remained useful downstream references without forcing their app-layer concerns into the runtime.

### What to revisit

- `gsd-tools milestone complete` still leaves manual cleanup work in `STATE.md`, `ROADMAP.md`, and `REQUIREMENTS.md`; closeout is not fully one-shot yet.
- The next milestone should decide whether additional runtime features are justified before taking on app-side measurement semantics.

### Carry-forward ideas

- Add an explicit import option that ignores source colors and uses the default CAD color.
- Keep future measurement work honest about the boundary between exact-kernel APIs and downstream UX or semantic interpretation.
