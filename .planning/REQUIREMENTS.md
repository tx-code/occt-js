# Requirements: occt-js

**Defined:** 2026-04-15
**Core Value:** Downstream applications can reliably consume the OCCT Wasm runtime and its root API contract without build drift or packaging surprises.

## v1.2 Requirements

### Import Appearance

- [x] **APPR-01**: Downstream JS code can choose whether STEP, IGES, and BREP imports preserve source colors or use a default CAD color via an explicit import appearance mode.
- [x] **APPR-02**: When default appearance mode is selected without an explicit color override, the root runtime returns one documented built-in CAD color consistently across supported import entry points.
- [x] **APPR-03**: Downstream JS code can provide an explicit default RGB color override so app-level user settings flow through import results without a viewer-side recolor pass.
- [x] **APPR-04**: Stateless `Read*` APIs and exact-open `OpenExact*` APIs honor the same appearance-mode semantics for supported formats.
- [x] **APPR-05**: Existing callers that still pass `readColors` receive deterministic compatibility behavior and explicit precedence relative to the new appearance options.

### Adapter & Governance

- [x] **ADAPT-03**: `@tx-code/occt-core` can accept and normalize the import appearance options, forwarding them to the root Wasm carrier without hiding the runtime contract.
- [x] **ADAPT-04**: Root typings, package docs, and release verification define the import appearance contract and keep app-side settings persistence or viewer overrides out of scope.

## Future Requirements

### Appearance Expansion

- **APPR-06**: Downstream JS code can control transparency or alpha fallback as part of the import appearance contract.
- **APPR-07**: Downstream JS code can select richer import appearance presets such as edge/face split colors or theme palettes.

### App Integration

- **UX-03**: Downstream apps can persist user import appearance presets per workspace, file source, or project.
- **UX-04**: Downstream apps can switch post-import display themes without reimporting CAD data.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Viewer-side repaint or theme switching after import | This milestone is about import-time color semantics, not post-import presentation pipelines |
| Persisting user settings in the runtime | Apps own settings storage and only pass import options into Wasm/core |
| Expanding to transparency, edge-style, or theme-preset contracts immediately | The base color contract needs to stabilize first |
| Semantic appearance mapping from layers, metadata, or feature types | That is a higher-level app concern beyond the core import contract |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| APPR-01 | Phase 9 | Completed |
| APPR-02 | Phase 9 | Completed |
| APPR-05 | Phase 9 | Completed |
| APPR-03 | Phase 10 | Completed |
| APPR-04 | Phase 10 | Completed |
| ADAPT-03 | Phase 10 | Completed |
| ADAPT-04 | Phase 11 | Completed |

**Coverage:**
- v1.2 requirements: 7 total
- Mapped to phases: 7
- Unmapped: 0

---
*Requirements defined: 2026-04-15*
*Last updated: 2026-04-15 after Phase 11 completion*
