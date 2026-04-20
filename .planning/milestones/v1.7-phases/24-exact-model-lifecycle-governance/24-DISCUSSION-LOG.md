# Phase 24: Exact Model Lifecycle Governance - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-18
**Phase:** 24-exact-model-lifecycle-governance
**Areas discussed:** Ownership model, Diagnostics surface, Finalizer policy

---

## Ownership Model

| Option | Description | Selected |
|--------|-------------|----------|
| Additive package-first managed wrapper over the existing numeric handle APIs | Keep `exactModelId` plus `RetainExactModel` / `ReleaseExactModel` authoritative; add opt-in disposal helpers in `@tx-code/occt-core` without breaking existing callers. | ✓ |
| Replace the current surface with opaque ownership objects | Push callers onto a new object-shaped lifetime contract and stop treating raw numeric handles as the primary surface. | |
| Keep the raw API only and rely on hidden cleanup behavior | Avoid adding helper ownership surfaces and treat forgotten release as an implementation detail instead of a governed contract. | |

**Auto-selected choice:** Additive package-first managed wrapper over the existing numeric handle APIs.
**Notes:** Recommended default because it preserves the shipped root contract, aligns with the package-first boundary used in prior phases, and keeps deterministic explicit release semantics intact for downstream consumers.

---

## Diagnostics Surface

| Option | Description | Selected |
|--------|-------------|----------|
| Explicit pull-based diagnostics/snapshot DTOs | Add lifecycle inspection APIs or DTOs that callers can query when they need leak or live-handle visibility, without noisy implicit logging. | ✓ |
| Wrapper-only warnings with no root diagnostics | Let `@tx-code/occt-core` emit warnings or bookkeeping without exposing authoritative runtime lifecycle state. | |
| Implicit logging on open/release/query paths | Emit automatic logs or warnings as part of normal runtime lifecycle operations. | |

**Auto-selected choice:** Explicit pull-based diagnostics/snapshot DTOs.
**Notes:** Recommended default because the root runtime already owns authoritative handle truth, and explicit diagnostics are easier to test and document than ambient logging behavior.

---

## Finalizer Policy

| Option | Description | Selected |
|--------|-------------|----------|
| Best-effort package-level `FinalizationRegistry` only | If added, use finalizers only as a safety net behind package helpers; explicit release/dispose remains the guaranteed cleanup path. | ✓ |
| No finalizer support at all | Require explicit release only and provide no best-effort forgotten-handle fallback. | |
| Treat GC/finalizers as the primary cleanup guarantee | Allow callers to rely on garbage collection rather than explicit release semantics. | |

**Auto-selected choice:** Best-effort package-level `FinalizationRegistry` only.
**Notes:** Recommended default because it improves ergonomics without weakening the explicit cleanup contract or forcing the root release gate to rely on nondeterministic GC behavior.

---

## the agent's Discretion

- Exact helper/wrapper naming in `@tx-code/occt-core`
- Whether diagnostics ship as one snapshot API or a small pair of additive APIs
- Whether finalizer support lands in the first lifecycle helper pass or a follow-up plan within the same phase

## Deferred Ideas

- `ExactModelStore::GetEntry` copy reduction and related hot-path performance work — Phase 25
- IGES temp-file staging reduction and shared staging utilities — Phase 25
- Babylon ecosystem cleanup / secondary-surface alignment — `v1.8`
