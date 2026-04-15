# Requirements: occt-js

**Defined:** 2026-04-15
**Core Value:** Downstream applications can reliably consume the OCCT Wasm runtime and its root API contract without build drift or packaging surprises.

## v1.3 Requirements

### Import Appearance Expansion

- [x] **APPR-06**: Downstream JS code can control import-time alpha or opacity fallback as part of the appearance contract instead of hardcoding opacity in downstream viewers.
- [x] **APPR-07**: Downstream JS code can select named import appearance presets that map fallback color and opacity policy without requiring a viewer-side recolor pass.
- [x] **APPR-08**: Stateless `Read*` APIs and exact-open `OpenExact*` APIs honor the same expanded appearance semantics for supported formats.

### Adapter & Governance

- [x] **ADAPT-05**: `@tx-code/occt-core` can accept and normalize the expanded appearance options, forwarding them to the root Wasm carrier without hiding the runtime contract.
- [ ] **ADAPT-06**: Root typings, package docs, tarball checks, and release verification define the expanded appearance contract while keeping app-side preset persistence or display overrides out of scope.

## Future Requirements

### App Integration

- **UX-03**: Downstream apps can persist user import appearance presets per workspace, file source, or project.
- **UX-04**: Downstream apps can switch post-import display themes without reimporting CAD data.

### Extended Appearance Policy

- **APPR-09**: Downstream JS code can define richer fallback palettes, such as separate face and edge defaults, without depending on viewer-specific packages.
- **APPR-10**: Downstream JS code can map source metadata into appearance presets through a documented import-time policy hook.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Viewer-side repaint, theme switching, or display overrides after import | This milestone stays at import-time appearance semantics, not post-import presentation pipelines |
| Persisting user settings in the runtime | Apps own settings storage and only pass import options into Wasm/core |
| Theme editors, preset UIs, or per-workspace appearance management | Those are downstream UX concerns above the package contract |
| Expanding to semantic appearance mapping from layers, features, or app metadata immediately | The base opacity/preset contract needs to stabilize first |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| APPR-06 | Phase 12 | Completed |
| APPR-07 | Phase 13 | Completed |
| APPR-08 | Phase 13 | Completed |
| ADAPT-05 | Phase 13 | Completed |
| ADAPT-06 | Phase 14 | Pending |

**Coverage:**
- v1.3 requirements: 5 total
- Mapped to phases: 5
- Unmapped: 0

---
*Requirements defined: 2026-04-15*
*Last updated: 2026-04-15 after completing Phase 13 Appearance Preset & Adapter Parity*
