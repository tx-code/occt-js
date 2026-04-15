# Retrospective

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
