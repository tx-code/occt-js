# Phase 30: Shared Profile Kernel - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `30-CONTEXT.md` — this log preserves the alternatives considered.

**Date:** 2026-04-21T10:02:49.7264898+08:00
**Phase:** 30-shared-profile-kernel
**Areas discussed:** Contract surface, geometry scope, coordinate model, closure model, diagnostics and provenance
**Mode:** Auto/default progression requested by user; recommended defaults selected and recorded

---

## Contract Surface

| Option | Description | Selected |
|--------|-------------|----------|
| Additive shared profile seam | Introduce a generic shared profile contract/validation seam while keeping current `RevolvedShapeSpec` callers stable | ✓ |
| Break and replace revolved callers now | Replace the current revolved public payload with the new shared profile contract immediately | |
| Keep the shared kernel private for now | Refactor internally only and defer any canonical shared contract surface until extrusion lands | |

**User's choice:** Additive shared profile seam with stable revolved callers.
**Notes:** `PROF-01` needs a real reusable contract, while `PROF-03` explicitly forbids public contract drift for existing revolved-shape consumers.

---

## Geometry Scope

| Option | Description | Selected |
|--------|-------------|----------|
| One outer loop with line/circular arcs only | Limit `v1.9` shared profiles to one ordered closed loop using `line`, `arc_center`, and `arc_3pt` | ✓ |
| Add islands and multi-loop profiles now | Support outer loops plus holes/interior wires in the shared kernel immediately | |
| Add splines/NURBS now | Broaden the kernel to richer sketch curves before extrusion proves the simpler seam | |

**User's choice:** One outer loop with line/circular arcs only.
**Notes:** This matches the current shipped revolved-shape segment set and keeps the first cross-family kernel small enough to stabilize before richer profile geometry is introduced.

---

## Coordinate Model

| Option | Description | Selected |
|--------|-------------|----------|
| Generic local 2D coordinates | Shared profiles use neutral local 2D points and each solid family owns the 3D embedding | ✓ |
| Universalize revolved `radius/z` coordinates | Treat the existing revolved coordinate meaning as the canonical shared profile frame | |
| Add authored 3D sketch frames now | Put workplane/origin/orientation ownership into the Phase 30 shared profile DTO | |

**User's choice:** Generic local 2D coordinates.
**Notes:** This is the narrowest reusable geometry seam. It lets revolve and extrusion share one profile kernel without making extrusion inherit axisymmetric naming.

---

## Closure Model

| Option | Description | Selected |
|--------|-------------|----------|
| Explicit closed-loop kernel | The shared kernel only validates explicit closed contours; family-owned synthetic closure stays outside it | ✓ |
| Kernel owns family closure modes | Put revolved-only modes such as `auto_axis` into the shared profile contract | |
| Kernel auto-heals open contours | Allow the shared kernel to close or repair profiles automatically | |

**User's choice:** Explicit closed-loop kernel with family-owned synthetic closure.
**Notes:** `auto_axis` is revolved-family behavior, not a reusable profile rule. Keeping it outside the shared kernel prevents family-specific leakage and preserves strict validation semantics.

---

## Diagnostics and Provenance

| Option | Description | Selected |
|--------|-------------|----------|
| Preserve current revolved behavior and shared provenance | Keep current revolved public diagnostics stable while the shared kernel owns neutral validation and preserves `id`/`tag` plus runtime-owned synthetic provenance | ✓ |
| Replace revolved diagnostics immediately | Swap current revolved callers to an entirely new generic diagnostic vocabulary now | |
| Strip provenance from the kernel | Reconstruct segment semantics later from built geometry instead of carrying normalized profile provenance through the kernel | |

**User's choice:** Preserve current revolved behavior and shared provenance.
**Notes:** The existing generated-shape and exact-open tests already lock the current revolved contract. Shared provenance is also required so future extruded face bindings can reuse the same normalized segment model instead of inventing another one.

---

## the agent's Discretion

- Exact exported names for the shared profile DTOs and validator.
- Whether to opportunistically rename touched legacy `revolved-tool` internals during the extraction.
- Whether Phase 30 exposes only the root shared-profile seam or also minimal additive typings needed for later family work, as long as Phase 32 still owns the package/governance closeout.

## Deferred Ideas

- Multi-loop profiles and islands
- Spline/NURBS profile curves
- Full sketch-frame/workplane ownership
- Sweep, loft, and boolean feature stacks
- Package-first wrapper/governance closeout before Phase 32
