# Phase 31: Linear Extruded Shape Runtime - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-21
**Phase:** 31-linear-extruded-shape-runtime
**Areas discussed:** runtime surface, local coordinate model, binding semantics, appearance semantics

---

## Runtime Surface

| Option | Description | Selected |
|--------|-------------|----------|
| Additive generic extruded family | Ship `ValidateExtrudedShapeSpec`, `BuildExtrudedShape`, `OpenExactExtrudedShape` with a new `generated-extruded-shape` payload identity | ✓ |
| Reuse revolved names/metadata | Hide extrusion behind the revolved family or overload existing entrypoints | |
| Package-first only | Delay the root runtime and start from wrapper APIs | |

**User's choice:** Auto-selected the recommended additive generic family because the user asked to continue in GSD without stopping for questions.
**Notes:** Keeps the root surface generic, parallel to revolved shapes, and avoids reopening tool-coupled naming.

---

## Local Coordinate Model

| Option | Description | Selected |
|--------|-------------|----------|
| Local `XY` profile + positive `+Z` depth | Keep one simple canonical extrusion space and defer richer placement semantics | ✓ |
| Arbitrary path / sweep-like contract | Allow general direction/path semantics now | |
| Symmetric/bidirectional extrusion modes | Add centered or two-sided depth controls in Phase 31 | |

**User's choice:** Auto-selected the simplest canonical local-space model.
**Notes:** This keeps Phase 31 inside the milestone boundary and leaves richer placement/features for future phases.

---

## Binding Semantics

| Option | Description | Selected |
|--------|-------------|----------|
| Stable wall provenance + runtime-owned caps | Lateral faces bind to profile segments; caps use explicit runtime roles `start_cap` and `end_cap` | ✓ |
| Face-order contract | Let downstream apps infer semantics from exported face order | |
| Caller-owned cap provenance | Let caps claim caller segments when the profile closes on itself | |

**User's choice:** Auto-selected stable semantic bindings.
**Notes:** Matches the existing generated-family direction from the revolved runtime and keeps downstream code off fragile face-order assumptions.

---

## Appearance Semantics

| Option | Description | Selected |
|--------|-------------|----------|
| Runtime-owned tag/role grouping | Collapse matching wall semantics and keep cap appearances distinct without caller colors | ✓ |
| Caller-supplied colors | Require face/material colors in the family spec | |
| Neutral-only appearance | Emit no semantic grouping and leave all faces with the same default color | |

**User's choice:** Auto-selected runtime-owned semantic grouping.
**Notes:** Preserves the lightweight Wasm boundary and mirrors the revolved-family deterministic appearance model.

---

## the agent's Discretion

- Exact extrusion-spec field names for depth and optional placement/orientation.
- Internal file factoring strategy between a new extruded family file and reusable generated-family helpers.

## Deferred Ideas

- Symmetric/bidirectional extrusion modes
- Draft/taper/shell feature expansion
- Multi-loop profiles and cutout-aware extrusion
- Sweep/pipe and loft families
- Package-first wrappers/governance before Phase 32
