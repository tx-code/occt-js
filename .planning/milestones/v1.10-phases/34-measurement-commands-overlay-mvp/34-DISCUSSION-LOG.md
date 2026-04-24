# Phase 34: Measurement Commands & Overlay MVP - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `34-CONTEXT.md`; this log preserves the alternatives considered.

**Date:** 2026-04-21
**Phase:** 34-measurement-commands-overlay-mvp
**Mode:** Non-interactive fallback during `$gsd-next`; default recommended decisions were selected because this session is running in Default mode without interactive question prompts.
**Areas discussed:** command trigger, supported mapping, result session, failure semantics, overlay representation, invalidation policy

---

## Command Trigger

| Option | Description | Selected |
|--------|-------------|----------|
| Explicit commands from current selection | User chooses a supported measurement action from the current selection; best fit for rerun and compare flows | ✓ |
| Auto-run on selection change | Every compatible selection immediately executes a measurement | |
| Hybrid preview then commit | Auto-preview a candidate result, then let user commit it to history | |

**User's choice:** Explicit commands from current selection
**Notes:** Recommended default for an MVP. This keeps selection, rerun, and compare behavior deliberate instead of surprising the user on every pick change.

---

## Supported Mapping

| Option | Description | Selected |
|--------|-------------|----------|
| Table-driven supported mappings | Show only the actions that the current kind and count of exact refs can run safely | ✓ |
| Show every command and let runtime reject | Present a full command list and surface failures after the fact | |
| Role-aware heuristics | Change action availability based on workpiece versus tool role semantics | |

**User's choice:** Table-driven supported mappings
**Notes:** Recommended default because the user explicitly rejected tool-coupled semantics earlier. The demo should stay generic and actor-scoped.

---

## Result Session

| Option | Description | Selected |
|--------|-------------|----------|
| History list with one active overlay | Keep multiple measurement runs for comparison, but only one result owns visible overlay state at a time | ✓ |
| Last result only | Replace the previous result every time and keep no comparison history | |
| Multi-overlay authoring board | Keep multiple overlays visible simultaneously and treat the demo like a dimension editor | |

**User's choice:** History list with one active overlay
**Notes:** Recommended default because `MEAS-03` requires clear, rerun, and compare flows, but the milestone is still an MVP rather than a full authoring system.

---

## Failure Semantics

| Option | Description | Selected |
|--------|-------------|----------|
| Typed result rows | Record unsupported, invalid, and released-handle outcomes as explicit typed rows in the measurement panel | ✓ |
| Toasts only | Surface failures as transient notifications and keep the result panel success-only | |
| Throw to the UI | Let command failures bubble as uncaught UI errors | |

**User's choice:** Typed result rows
**Notes:** Recommended default because the demo is proving measurement correctness and error transparency. Unsupported geometry should be visible and inspectable, not transient or hidden.

---

## Overlay Representation

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal scene geometry plus panel values | Use line and point overlays for anchors, guides, and axes while keeping numeric text in the panel | ✓ |
| Full 3D labels and widgets | Add text labels, dimension leaders, and richer interactive dimension affordances | |
| Panel only | Show values in the UI but render no scene overlay even when placement data exists | |

**User's choice:** Minimal scene geometry plus panel values
**Notes:** Recommended default because placement DTOs already exist, and the demo should visualize them without growing into a full dimension-rendering product.

---

## Invalidation Policy

| Option | Description | Selected |
|--------|-------------|----------|
| Clear on model, exact-session, or pose changes | Preserve history across selection changes, but clear runs when workspace geometry or actor pose changes | ✓ |
| Preserve across pose changes and mark stale | Keep historical runs after actor motion and ask the UI to explain that they are stale | |
| Clear on every selection change | Treat measurement results as ephemeral and discard them whenever the current selection changes | |

**User's choice:** Clear on model, exact-session, or pose changes
**Notes:** Recommended default because it avoids stale or orphaned overlays while still allowing compare flows within one stable workspace pose.

---

## the agent's Discretion

- Exact module split between a measurement hook, store slice, and result components
- Overlay color styling and active-result emphasis
- History truncation policy for in-memory result rows

## Deferred Ideas

- Whole-model measurement suggestions and discovery
- Persistent reporting or export
- 3D text labels and full dimension widgets
- Richer semantic measurement families beyond the shipped exact primitives
