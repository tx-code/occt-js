# Phase 27: Revolved Tool Spec & Wasm Builder - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `27-CONTEXT.md`; this log preserves the alternatives considered.

**Date:** 2026-04-20
**Phase:** 27-revolved-tool-spec-wasm-builder
**Areas discussed:** Spec strictness, Wasm API shape, Metadata placement, Appearance ownership, Phase boundary, Error semantics

---

## Spec Strictness

| Option | Description | Selected |
|--------|-------------|----------|
| Strict v1 | Support only `line`, `arc_center`, `arc_3pt`; fixed `XZ` plane; units `mm/inch`; closure `explicit/auto_axis`; fail invalid input with typed diagnostics | ✓ |
| Permissive/coercing | Auto-fix unsupported shapes, closure, or orientation where possible | |

**User's choice:** Accepted the recommended default (`默认推进`).
**Notes:** The user approved a strict normalized spec rather than a forgiving adapter-style contract.

---

## Wasm API Shape

| Option | Description | Selected |
|--------|-------------|----------|
| Separate validate/build APIs | Add `ValidateRevolvedToolSpec(spec)` and `BuildRevolvedTool(spec, options)` now; defer exact-open to Phase 28 | ✓ |
| Generic generated-model API | Start with one broader `BuildGeneratedModel(kind, spec, options)` surface | |

**User's choice:** Accepted the recommended default (`默认推进`).
**Notes:** The additive API shape should mirror existing explicit runtime entry points.

---

## Metadata Placement

| Option | Description | Selected |
|--------|-------------|----------|
| Top-level generated-tool metadata | Keep current face DTO minimal; place segment/role/binding semantics in additive top-level metadata | ✓ |
| Extend face DTO directly | Add `segmentId`, `tag`, `role`, or other generated-tool fields onto each face | |

**User's choice:** Accepted the recommended default (`默认推进`).
**Notes:** This avoids fighting the current `model-normalizer.js` boundary, which only preserves the minimal face schema.

---

## Appearance Ownership

| Option | Description | Selected |
|--------|-------------|----------|
| Runtime-owned appearance semantics | Caller does not provide colors; runtime returns semantic grouping and may use neutral fallback rendering colors | ✓ |
| C++ face-color assignment as the primary contract | Root builder assigns final per-face default colors directly in the raw result | |

**User's choice:** Accepted the recommended default (`默认推进`).
**Notes:** Earlier discussion already established that upper layers should not be required to supply colors.

---

## Phase Boundary

| Option | Description | Selected |
|--------|-------------|----------|
| Phase 27 stops at validation + scene build | Leave retained exact generated models and stable history bindings to Phase 28 | ✓ |
| Pull exact-open and full binding semantics into Phase 27 | Implement retained exact path and mapping semantics immediately | |

**User's choice:** Accepted the recommended default (`默认推进`).
**Notes:** This keeps Phase 27 focused and prevents exact/history work from collapsing the current planning boundary.

---

## Error Semantics

| Option | Description | Selected |
|--------|-------------|----------|
| Structured diagnostics plus wrapper throws on hard failure | Raw Wasm returns typed validation/build diagnostics; `occt-core` may throw for hard invocation/build failure | ✓ |
| Never throw | Return result objects only, even for hard failures | |

**User's choice:** Accepted the recommended default (`默认推进`).
**Notes:** This aligns the new surface with current `occt-core` wrapper behavior.

---

## the agent's Discretion

- Exact JSON field naming for `RevolvedToolSpec`.
- Exact layout of the additive `generatedTool` metadata block.
- Whether render-tuning knobs belong in `spec` or a separate `options` bag.

## Deferred Ideas

- App-specific adapter layers and `.fctb` support.
- Retained exact generated-tool flow and stable history-aware bindings before Phase 28.
- Package docs/governance publication before Phase 29.
