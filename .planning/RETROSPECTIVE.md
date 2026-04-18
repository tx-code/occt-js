# Retrospective

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
