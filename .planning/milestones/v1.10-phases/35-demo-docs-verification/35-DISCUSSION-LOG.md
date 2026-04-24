# Phase 35: Demo Docs & Verification - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `35-CONTEXT.md`; this log preserves the alternatives considered.

**Date:** 2026-04-21
**Phase:** 35-demo-docs-verification
**Mode:** Non-interactive fallback during `$gsd-next`; default recommended decisions were selected because this session is running in Default mode without interactive question prompts.
**Areas discussed:** demo doc venue, browser verification routing, lifecycle proof point, governance boundary

---

## Demo Doc Venue

| Option | Description | Selected |
|--------|-------------|----------|
| Dedicated demo workflow guide plus README links | Keep one downstream demo guide as the canonical walkthrough and link to it from root/package docs | ✓ |
| Expand README only | Put the full demo workflow directly in the root README | |
| Add `demo/README.md` only | Keep all workflow docs local to the demo folder and avoid top-level links | |

**User's choice:** Dedicated demo workflow guide plus README links
**Notes:** Recommended default because the repo already separates runtime/package docs from downstream behavior. One dedicated guide keeps the workflow discoverable without bloating root/package references.

---

## Browser Verification Routing

| Option | Description | Selected |
|--------|-------------|----------|
| Manifest-driven demo E2E includes measurement interaction | Make `npm --prefix demo run test:e2e` cover both app-shell smoke and interaction-level measurement regression | ✓ |
| Keep app-home smoke only and document an extra direct Playwright command | Leave `demo/package.json` narrow and rely on docs for the measurement suite | |
| Move measurement browser coverage to root scripts | Add demo Playwright coverage to root release or root test commands | |

**User's choice:** Manifest-driven demo E2E includes measurement interaction
**Notes:** Recommended default because the current gap is routing drift, not missing tests. The lane should be explicit and runnable from the demo manifest while remaining outside the authoritative root gate.

---

## Lifecycle Proof Point

| Option | Description | Selected |
|--------|-------------|----------|
| Browser coverage includes invalidation on replacement or pose change | Prove measurement state is cleared when exact-session or actor-pose ownership changes | ✓ |
| Browser coverage stays happy-path only | Rely on node tests for lifecycle invalidation and keep browser tests limited to run/clear | |
| Browser coverage uses internal test-only hooks | Trigger reset/disposal through hidden test APIs instead of user-visible flows | |

**User's choice:** Browser coverage includes invalidation on replacement or pose change
**Notes:** Recommended default because `E2E-01` explicitly calls for reset or disposal behavior, and the user has repeatedly pushed for correctness around stale state and invalid geometry.

---

## Governance Boundary

| Option | Description | Selected |
|--------|-------------|----------|
| Keep measurement demo governance in `test:secondary:contracts` | Enforce demo docs and verification routing through the secondary-surface contract suite | ✓ |
| Add demo governance to root release gate | Make demo browser coverage part of `npm run test:release:root` | |
| Leave governance implicit in docs only | Update READMEs but do not lock the routing with tests | |

**User's choice:** Keep measurement demo governance in `test:secondary:contracts`
**Notes:** Recommended default because the repo’s central boundary rule is already settled: demo verification is explicit and conditional, not part of the authoritative root release gate.

---

## the agent's Discretion

- Exact demo doc filename and section split
- Whether the demo-browser manifest runs two explicit spec files or a tightly scoped glob
- Which invalidation browser scenario is most stable first: workpiece replacement, tool replacement, or tool-pose change

## Deferred Ideas

- Desktop/Tauri-specific measurement verification routing
- Rich tutorial content or media
- Additional governance around optional performance or soak evidence for demo-only flows

