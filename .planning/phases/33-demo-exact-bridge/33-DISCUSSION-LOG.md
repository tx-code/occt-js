# Phase 33: Demo Exact Bridge - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `33-CONTEXT.md` — this log preserves the alternatives considered.

**Date:** 2026-04-21
**Phase:** 33-demo-exact-bridge
**Areas discussed:** Exact session ownership, Selection-to-ref mapping, Orientation and invalidation policy, Generated-shape coverage

---

## Exact session ownership

| Option | Description | Selected |
|--------|-------------|----------|
| Single active demo exact session | One authoritative exact session per loaded model, replaced atomically on reload/reset | ✓ |
| Per-rendered-view session | Separate exact sessions for each rendered presentation mode such as raw vs auto-orient | |
| Hook-local ephemeral handles | Keep exact handles only inside Babylon hooks and resolve them lazily later | |

**User's choice:** Single active demo exact session
**Notes:** Auto-selected from current repo direction and prior user guidance. The milestone is demo integration, not viewer-framework proliferation. Lifecycle semantics stay explicit and deterministic.

---

## Selection-to-ref mapping

| Option | Description | Selected |
|--------|-------------|----------|
| Resolve exact refs at selection time | Use `geometryId`, exact bindings, and occurrence transforms to attach measurement-ready refs immediately | ✓ |
| Resolve on demand at measurement time | Keep current UI selection summary only, then rebuild refs later when a command runs | |
| Use Babylon ids as bridge keys | Treat mesh/instance ids as the downstream measurement contract | |

**User's choice:** Resolve exact refs at selection time
**Notes:** This keeps Phase 34 simple and avoids leaking Babylon-local ids into the measurement contract. It also matches the existing explicit-ref design of `occt-core`.

---

## Orientation and invalidation policy

| Option | Description | Selected |
|--------|-------------|----------|
| Keep exact model stable, recompute transforms, clear stale selections on presentation change | Reuse one exact source while respecting current rendered transforms | ✓ |
| Reopen exact model on every orientation change | Treat raw and auto-orient as different exact sessions | |
| Preserve selections across model replacement | Keep selected items alive even when source model changes | |

**User's choice:** Keep exact model stable, recompute transforms, clear stale selections on presentation change
**Notes:** Auto-selected because orientation is already a presentation concern in the demo. Model replacement and exact-open failures still clear bridge state immediately.

---

## Generated-shape coverage

| Option | Description | Selected |
|--------|-------------|----------|
| Same bridge contract for imported CAD and generated shapes | Keep one demo-facing exact-session shape even if generated exact results need a demo-local wrapper | ✓ |
| Import-only in Phase 33 | Leave generated shapes out until later phases | |
| Add a new package-level generic managed wrapper now | Expand `occt-core` before demo integration proves it is necessary | |

**User's choice:** Same bridge contract for imported CAD and generated shapes
**Notes:** Auto-selected because milestone requirements already mention generated shapes and the user has repeatedly insisted on generic design rather than tool coupling. Package expansion stays deferred unless planning proves it necessary.

---

## the agent's Discretion

- Exact shape of the demo-local exact-session record
- Internal indexing structure from `geometryId` and subshape ids to resolved exact refs
- Whether generated exact sessions use a tiny demo-local managed wrapper or a slightly more generalized helper, as long as the package boundary remains unchanged

## Deferred Ideas

- Measurement commands, result UI, and placement overlay MVP belong to Phase 34
- Docs/E2E/governance lock-in belongs to Phase 35
- Candidate discovery, persistent measurement history, and richer semantic suggestion flows remain future phases
