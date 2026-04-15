# Roadmap: occt-js

## Milestones

- ✅ [v1.2 Import Appearance Contract](./milestones/v1.2-ROADMAP.md) — Phases 9-11, shipped 2026-04-15
- ✅ [v1.1 Exact BRep Measurement Foundation](./milestones/v1.1-ROADMAP.md) — Phases 5-8, shipped 2026-04-15
- ✅ [v1.0 OCCT Wasm Runtime Hardening](./milestones/v1.0-ROADMAP.md) — Phases 1-4, shipped 2026-04-14

## Current Status

No active milestone is currently planned.

Run `/gsd-new-milestone` to define the next active requirements and roadmap phases.

## Product Direction

The root Wasm carrier remains the primary surface. Future milestones should extend downstream-consumable runtime contracts without turning `occt-js` into a viewer-first product, and should keep app-side settings persistence plus viewer overrides outside the root release boundary unless scope changes explicitly.
