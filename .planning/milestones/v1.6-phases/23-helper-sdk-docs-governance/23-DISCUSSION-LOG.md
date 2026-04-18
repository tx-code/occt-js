# Phase 23: Helper SDK Docs & Governance - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `23-CONTEXT.md` — this log preserves the alternatives considered.

**Date:** 2026-04-18T04:10:00Z
**Phase:** 23-helper-sdk-docs-governance
**Areas discussed:** Documentation surface, Typings and packaged entrypoints, Release governance coverage, SDK wording

---

## Documentation Surface

| Option | Description | Selected |
|--------|-------------|----------|
| Extend existing SDK guide | Keep `docs/sdk/measurement.md` as the stable path and expand it to include the shipped helper family | ✓ |
| Create a new helper-only guide | Split helper semantics into a new docs path and keep measurement docs unchanged | |
| Root README duplicates everything | Put full helper walkthroughs into the root README instead of treating it as the lower-level reference | |

**User's choice:** `[auto]` Extend the existing SDK guide and keep docs package-first through `@tx-code/occt-core`.
**Notes:** The repo already has a stable package-first docs split. Reusing the existing path avoids link churn and reduces doc drift across root/package surfaces.

---

## Typings And Packaged Entrypoints

| Option | Description | Selected |
|--------|-------------|----------|
| Add explicit `@tx-code/occt-core` typings | Publish a package-local typing surface and export it from `packages/occt-core/package.json` | ✓ |
| Keep package untyped | Continue documenting `@tx-code/occt-core` package-first while leaving the helper SDK effectively JS-only | |
| Point package users at root types only | Rely on `dist/occt-js.d.ts` as the only formal typing surface | |

**User's choice:** `[auto]` Add explicit `@tx-code/occt-core` typings.
**Notes:** The package is the primary documented SDK entrypoint, so leaving it untyped would undermine `DOCS-03` / `GOV-04` and create a mismatch between docs and package reality.

---

## Release Governance Coverage

| Option | Description | Selected |
|--------|-------------|----------|
| Expand root/package governance for helpers | Add helper docs/type checks and include hole/chamfer root contracts in the authoritative release gate | ✓ |
| Docs-only update | Update wording but leave release/test coverage unchanged | |
| Secondary-surface expansion | Broaden governance into demo/Babylon/Tauri helper examples and checks | |

**User's choice:** `[auto]` Expand root/package governance for helpers while keeping secondary surfaces conditional.
**Notes:** The authoritative root release gate should fail on helper drift once the helper family is documented as shipped. Demo/Babylon/Tauri remain outside that gate.

---

## SDK Wording

| Option | Description | Selected |
|--------|-------------|----------|
| Document narrow shipped helper limits explicitly | Call out the exact supported hole/chamfer/symmetry boundaries and keep richer feature recognition downstream | ✓ |
| Keep broad “feature semantics” wording | Avoid documenting narrow limits and leave helper boundaries implicit | |
| Present helpers as generic feature recognition | Phrase hole/chamfer helpers as open-ended feature recognition support | |

**User's choice:** `[auto]` Document narrow shipped helper limits explicitly.
**Notes:** Phase 21-22 intentionally shipped a constrained helper family. The docs should say that directly so downstream consumers do not infer broader discovery or viewer-owned behavior.

---

## the agent's Discretion

- Choose the exact package typing file layout and governance test split.
- Choose final heading/title wording as long as package-first guidance stays primary.

## Deferred Ideas

- Full docs-site restructuring
- Batch feature discovery or richer semantic helper families
- Secondary-surface gate expansion
