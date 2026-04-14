---
phase: 4
slug: release-governance-flow
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-14
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node built-in test runner |
| **Config file** | none — direct `node --test` invocation |
| **Quick run command** | `node --test test/release_governance_contract.test.mjs` |
| **Full suite command** | `npm run build:wasm:win && node --test test/wasm_build_contract.test.mjs test/package_tarball_contract.test.mjs test/release_governance_contract.test.mjs && npm run test:wasm:preflight && npm --prefix packages/occt-core test && npm test` |
| **Estimated runtime** | ~900 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node --test test/release_governance_contract.test.mjs`
- **After every plan wave:** Run `node --test test/wasm_build_contract.test.mjs test/package_tarball_contract.test.mjs test/release_governance_contract.test.mjs && npm run test:wasm:preflight && npm --prefix packages/occt-core test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | DIST-01 | T-04-01 | Root release guidance points to one runtime-first command surface that covers build contract, package contract, `occt-core`, and root runtime verification. | static + cli | `node --test test/release_governance_contract.test.mjs` | ❌ W0 | ⬜ pending |
| 04-02-01 | 02 | 1 | CONS-03 | T-04-02 | Docs and release skill keep demo/Babylon/Tauri checks conditional and never make them unconditional root publish gates. | static | `node --test test/release_governance_contract.test.mjs` | ❌ W0 | ⬜ pending |
| 04-03-01 | 03 | 2 | DIST-02 | T-04-03 | Planning artifacts, requirement status, and next-step routing all identify the root Wasm carrier as authoritative. | static | `node --test test/release_governance_contract.test.mjs` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `test/release_governance_contract.test.mjs` — cover `CONS-03`, `DIST-01`, and `DIST-02` across `AGENTS.md`, `.codex/skills/releasing-occt-js/SKILL.md`, `.planning/PROJECT.md`, `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`, and `.planning/STATE.md`
- [ ] `package.json` — expose one canonical runtime-first governance/release verification script

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| npm publish token handling remains ephemeral during a real release | DIST-01 | Actual publish credentials must not be stored in tests or fixtures | Follow `.codex/skills/releasing-occt-js/SKILL.md`; verify a temporary `.npmrc` is created only for publish and removed immediately afterward |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 10s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
