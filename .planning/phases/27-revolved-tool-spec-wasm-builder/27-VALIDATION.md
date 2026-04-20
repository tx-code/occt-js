---
phase: 27
slug: revolved-tool-spec-wasm-builder
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-20
---

# Phase 27 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node built-in test runner plus existing root npm script orchestration |
| **Config file** | none - direct `node --test` invocation plus root package scripts |
| **Quick run command** | `npm run build:wasm:win && node --test test/revolved_tool_spec_contract.test.mjs test/generated_revolved_tool_contract.test.mjs` |
| **Full suite command** | `npm run build:wasm:win && node --test test/revolved_tool_spec_contract.test.mjs test/generated_revolved_tool_contract.test.mjs && npm test` |
| **Estimated runtime** | ~1800 seconds |

---

## Sampling Rate

- **After every task commit:** Run the most local generated-tool command that covers the changed seam.
- **After every plan wave:** Run `npm run build:wasm:win && node --test test/revolved_tool_spec_contract.test.mjs test/generated_revolved_tool_contract.test.mjs`.
- **Before phase completion:** Run the full suite command.
- **Max feedback latency:** 900 seconds for generated-tool-specific feedback after a rebuild.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 27-01-01 | 01 | 1 | TOOL-01, TOOL-02, TOOL-03 | T-27-01-01 | Strict validation rejects malformed revolved-tool specs before they reach OCCT construction. | integration | `npm run build:wasm:win && node --test test/revolved_tool_spec_contract.test.mjs` | ❌ W0 | ⬜ pending |
| 27-01-02 | 01 | 1 | TOOL-01, TOOL-03 | T-27-01-02 | Published root typings and Embind bindings stay aligned with the strict validation result shape and diagnostics vocabulary. | integration | `npm run build:wasm:win && node --test test/revolved_tool_spec_contract.test.mjs` | ❌ W0 | ⬜ pending |
| 27-02-01 | 02 | 2 | GEOM-01, TOOL-02 | T-27-02-01 | Supported endmill-like and drill-like specs build into canonical scene payloads with valid topology and deterministic neutral rendering fallback. | integration | `npm run build:wasm:win && node --test test/generated_revolved_tool_contract.test.mjs` | ❌ W0 | ⬜ pending |
| 27-02-02 | 02 | 2 | GEOM-01, TOOL-03 | T-27-02-02 | Build failures stay explicit and root command routing includes the generated-tool contract tests without widening secondary-surface gates. | integration | `npm run build:wasm:win && node --test test/generated_revolved_tool_contract.test.mjs && npm test` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending - ✅ green - ❌ red - ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `test/revolved_tool_spec_contract.test.mjs` - new root validation contract test
- [ ] `test/generated_revolved_tool_contract.test.mjs` - new root build contract test
- [ ] `src/revolved-tool.hpp` / `src/revolved-tool.cpp` - generated-tool validation/build seam
- [ ] `dist/occt-js.d.ts` - revolved-tool spec, diagnostics, and build typings
- [ ] `package.json` - generated-tool contract test routing in root scripts

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| One full revolve and one partial revolve produce visually sane caps/seams and do not obviously invert normals on representative tool silhouettes | GEOM-01 | Root tests can prove topology counts and canonical DTO shape, but they cannot fully judge visual seam quality from raw arrays alone | After implementation, inspect one endmill-like and one drill-like `BuildRevolvedTool(...)` result from a live caller path and confirm the generated geometry renders with sane silhouette, cap closure, and no obvious missing seam/cap surfaces |
| `auto_axis` closure matches intended caller expectation for an open lathe-style profile | TOOL-02, TOOL-03 | Tests can lock one deterministic closure algorithm, but they cannot decide whether a human caller would interpret a borderline open profile the same way | Inspect one representative open profile that relies on `auto_axis` and verify the generated body closes to the axis exactly where the normalized profile contract intends |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 900s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
