# Domain Pitfalls

**Domain:** Exact BRep measurement foundation for an existing Wasm CAD runtime
**Researched:** 2026-04-14
**Overall confidence:** HIGH

## Milestone Answers

### 1. What memory/lifetime hazards are likely once exact model handles exist?

- [HIGH] The biggest hazard is mixing JS-visible C++ object lifetime with OCCT lifetime. Embind requires explicit `delete()` for C++ object handles and warns that finalizers are not reliable enough for RAII-style cleanup, so a handle design that relies on GC will leak or fail nondeterministically.
- [HIGH] Exact topology refs will become dangling immediately if they outlive the owning exact model. The contract must make `modelHandle` ownership explicit and reject any face/edge/vertex ref after release.
- [HIGH] Occurrence context is part of lifetime. The repo currently deduplicates meshes by underlying `TShape*`, so a retained exact ref that forgets assembly occurrence/context can stay "alive" but point at the wrong instance.
- [MEDIUM] STEP/IGES currently flow through XDE and then close the `TDocStd_Document` after scene extraction. If later exact APIs need XDE label or occurrence lookup, that state must be retained inside the exact model handle or precomputed before close.

### 2. What API-design mistakes would make downstream web measurement painful?

- [HIGH] Reusing mesh-local ids as the exact API contract would be a trap. Current `faces`, `edges`, `vertices`, and `geo_<index>` ids are import-result ids, not stable exact-kernel ids.
- [HIGH] Returning embind classes or raw-pointer-like wrappers to downstream JS would make leaks and async misuse routine. Keep the public surface on plain DTOs plus explicit lifecycle calls.
- [HIGH] Shipping under-specified primitives like `getFaceNormal(faceRef)` or `getRadius(edgeRef)` will force downstream apps to reverse-engineer semantics. Normals need a point/UV or a planar-only rule; radius/center only apply to analytic geometry.
- [HIGH] Baking selection heuristics, candidate ranking, or viewer terms into the root API will make the milestone absorb app semantics instead of exposing a reusable kernel.

### 3. What testing/verification gaps are easy to miss for this milestone?

- [HIGH] There is no current root/package/release coverage for open/retain/release, invalid-after-release behavior, double release, or cross-module misuse.
- [HIGH] Reused-instance coverage is absent. The exact path must be tested on assemblies where one prototype geometry appears at multiple transforms.
- [HIGH] Numerical edge-case coverage is absent: unitless BREP, degenerated edges, curved faces with undefined normals, non-analytic curve/surface types, and multi-solution extrema.
- [HIGH] Packaging and typing gates do not yet assert new measurement APIs in `dist/occt-js.d.ts`, tarball exports, and `@tx-code/occt-core`.

### 4. What should be explicitly guarded in docs/contracts to avoid scope creep into app semantics?

- [HIGH] Exact model handles and topology refs are module-local, non-serializable, and only valid until explicit release.
- [HIGH] The root API returns exact geometric primitives and attach/support data, not measurement sessions, overlay placement, or "best guess" UX behavior.
- [HIGH] "Thickness" must be narrowly defined or deferred. The kernel can expose exact minimum-distance primitives on explicit refs; the app owns candidate generation and interpretation.
- [HIGH] Any exact ref must be occurrence-scoped. `geometryId` alone is not enough once reused assemblies exist.

## Critical Pitfalls

### Pitfall 1: Implicit Ownership Between JS, Embind, and OCCT State

**Confidence:** HIGH

**What goes wrong:** Retained exact models, topology refs, or support objects either leak forever or become dangling after unrelated cleanup.

**Why it happens:** The current root API returns plain JS objects only. A naive measurement milestone often introduces embind-bound classes or raw/reference-returned OCCT objects. Emscripten documents that JS must explicitly `delete()` C++ object handles, and that finalizers are not reliable for general resource management. OCCT itself layers more ownership on top of that through reference-counted transient objects and `TopoDS_Shape` wrappers that reference shared underlying topology.

**Consequences:** Hard leaks in long-running browser sessions, use-after-release bugs, async races when one caller releases a model another caller still uses, and a public API that is much easier to misuse than the existing import surface.

**Prevention:** Keep public ownership explicit and centralized. Use an internal model registry with opaque handle ids or a thin JS wrapper with a mandatory `release()`/`dispose()` path. Make every exact ref validate against an owning model handle and generation. Do not rely on GC cleanup or expose OCCT/embind object graphs directly.

**Detection:** A loop that opens, measures, and releases the same model should keep memory flat. Tests should prove that released handles and released topology refs are rejected, and that async callers cannot accidentally keep a dead object alive unless they explicitly retain/clone it.

### Pitfall 2: Losing Occurrence Context by Keying to Prototype Geometry

**Confidence:** HIGH

**What goes wrong:** Measurements resolve against the wrong assembly instance, usually the prototype shape instead of the picked occurrence.

**Why it happens:** The current import path deduplicates meshes by underlying `TShape*` and then reuses them under different node transforms. `packages/occt-core/src/model-normalizer.js` also synthesizes `geo_<index>` ids per normalized import result. That is correct for mesh reuse, but it means `geometryId` is not an occurrence identifier. The SceneGraph reference code explicitly keys retained shapes by `(ContextId, GeometryId)` for this reason.

**Consequences:** A pick on one bolt measures another bolt, mirrored/reused parts return prototype-space attach points, and exact refs become unusable in the very assemblies where downstream apps most need them.

**Prevention:** Make exact refs occurrence-scoped from day one. The conversion API should accept the same pick context downstream apps already have available: at minimum `modelHandle`, occurrence/context identity, geometry identity, and subshape identity. Do not use raw `TShape*`, mesh index, or normalized `geo_<index>` ids as public exact identifiers.

**Detection:** Add fixtures with reused instances under different transforms. The same face id on two different occurrences must map to two different exact refs, and measured points must land in occurrence space, not prototype space.

### Pitfall 3: Mesh Traversal IDs Accidentally Become the Exact Contract

**Confidence:** HIGH

**What goes wrong:** Downstream apps build measurement on today's face/edge/vertex numbering, then a harmless meshing or traversal change silently breaks exact resolution.

**Why it happens:** Current topology ids are generated from import-time traversal order in `src/importer-utils.cpp`. They are useful consumer ids for the triangulated payload, but they are not a durable exact-kernel identity scheme. They are also local to one extracted geometry, not globally unique across a retained model.

**Consequences:** Exact measurement appears to "randomly" drift after importer refactors, direct-vs-generic entrypoint behavior diverges, and consumers end up pinned to accidental ordering guarantees.

**Prevention:** Treat mesh topology ids as one half of a mapping contract, not the final exact ref. Provide an explicit "resolve imported topology id to exact topology ref for this retained model" step. Document scope clearly: same import result, same model handle, same module instance.

**Detection:** Contract tests should prove that exact resolution still works after rebuilding `dist/`, through both direct and generic import entrypoints, and in fixtures with multiple geometries per model.

### Pitfall 4: Ambiguous Geometric Semantics Hidden Behind Scalar-Only APIs

**Confidence:** HIGH

**What goes wrong:** The API looks simple but returns values that downstream apps cannot trust or even interpret consistently.

**Why it happens:** OCCT makes the ambiguity explicit:
- `BRepLProp_SLProps` evaluates normals at `(U, V)` and exposes `IsNormalDefined()`, so a generic face does not have one unconditional normal.
- `BRepAdaptor_Curve::GetType()` and `BRepAdaptor_Surface::GetType()` classify analytic vs non-analytic geometry, so `radius` and `center` are not universal properties.
- `BRepExtrema_DistShapeShape` can return multiple minimum-distance solutions and an `InnerSolution()` state, so "distance" is not always one obvious scalar.

**Consequences:** Curved-face normals become arbitrary, radius/center calls fail mysteriously on BSplines, and downstream apps have no way to explain or visualize exact results.

**Prevention:** Make semantics narrow and explicit. Face-normal evaluation should be point/UV-based or restricted to planar faces. Radius/center should require an analytic classification or return a structured unsupported result. Distance/thickness APIs should state whether they mean minimum distance only, and should return support points/support kinds, not just one number.

**Detection:** Add fixtures for planar vs curved faces, analytic vs spline edges, and multi-solution extrema. Any API that returns a number without support metadata should be treated as suspect.

## Moderate Pitfalls

### Pitfall 1: Unit Contract Drift Between Import and Measurement

**Confidence:** HIGH

**What goes wrong:** Measurements come back in inconsistent units across STEP, IGES, and BREP, or BREP silently inherits a guessed unit it never had.

**Why it happens:** The current root contract preserves `sourceUnit` and `unitScaleToMeters` where the source format provides them, while BREP is often unitless. Measurement APIs are easy to implement against raw OCCT values and forget to carry the same unit contract forward.

**Prevention:** Every measurement result should either inherit the model's existing unit metadata or explicitly state that the source is unitless/unknown. Do not invent a BREP unit.

### Pitfall 2: Hidden XDE Document-Lifetime Assumptions

**Confidence:** MEDIUM

**What goes wrong:** Exact resolution works for BREP but later fails or becomes incomplete for STEP/IGES assemblies that originally depended on XDE structure.

**Why it happens:** `src/importer-xde.cpp` closes the XDE document after scene extraction. That is fine for today's flattened mesh payload, but any future exact API that still needs label, occurrence, or document-derived lookup will fail unless the model handle retains that state or precomputes its own maps.

**Prevention:** Decide early whether retained exact models own an XDE-backed context or a fully flattened exact-resolution table. Do not leave this implicit.

### Pitfall 3: Copy-Heavy, Chatty Wasm APIs

**Confidence:** MEDIUM

**What goes wrong:** Downstream measurement feels slow in the browser even when the kernel results are correct.

**Why it happens:** A naive design exposes one Wasm call per tiny property or returns OCCT objects that force extra bind/unbind work and explicit cleanup. That is the opposite of the current root contract, which aggressively converts import results into plain JS data at the boundary.

**Prevention:** Keep exact results DTO-shaped, batch where the UX will naturally call repeatedly, and avoid exporting raw geometry objects that would need separate lifetime management.

## Minor Pitfalls

### Pitfall 1: Pointer-Like Public IDs

**Confidence:** HIGH

**What goes wrong:** Public handles appear stable until a model is released and a later allocation reuses the same underlying address or index.

**Why it happens:** The repo already uses `TShape*`-derived pointer hashing internally for mesh dedupe. That is a reasonable local cache key inside one import, but it is a bad public identity contract.

**Prevention:** Use opaque ids with generation checks. Never expose raw addresses, raw OCCT handles, or import-local map indices as public exact ids.

### Pitfall 2: Release Boundary Drift Into Viewer Semantics

**Confidence:** HIGH

**What goes wrong:** The milestone quietly turns `occt-js` into a viewer/measurement framework rather than a runtime carrier.

**Why it happens:** The downstream need is real, and local references like SceneGraph include full measurement UX. Without hard boundary docs, kernel primitives expand into selection state machines, candidate generation, overlay placement, and feature recognition.

**Prevention:** Keep docs and tests aligned to the runtime-first boundary. If an API name sounds like widget behavior, it probably belongs downstream.

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Exact model lifecycle handles | Implicit ownership, double release, cross-module misuse | Introduce one owner model registry, explicit release semantics, invalid-after-release tests, and module-local handle docs. |
| Exact topology ref resolution | Occurrence loss and mesh-id coupling | Make refs occurrence-scoped and add a dedicated imported-topology-id -> exact-ref conversion contract. |
| Primitive measurement APIs | Ambiguous normals/radius/thickness semantics | Restrict APIs to explicit supported combinations, return structured support data, and reject unsupported analytic cases cleanly. |
| `occt-core` adapter and typings | Leaky embind objects and DTO drift | Keep JS-facing results plain-data, mirror lifecycle in `occt-core`, and extend `dist/occt-js.d.ts` plus package tests together. |
| Root verification and release gating | Missing lifecycle/regression coverage | Add root tests for handle lifetime, reused instances, units, degenerate geometry, and tarball/type contract drift. |

## Sources

- Local code: `src/js-interface.cpp`, `src/importer-utils.cpp`, `src/importer-brep.cpp`, `src/importer-xde.cpp`
- Local code: `packages/occt-core/src/occt-core.js`, `packages/occt-core/src/model-normalizer.js`
- Local tests: `test/test_multi_format_exports.mjs`, `test/package_tarball_contract.test.mjs`, `test/release_governance_contract.test.mjs`, `packages/occt-core/test/core.test.mjs`, `packages/occt-core/test/live-root-integration.test.mjs`
- Local reference app code: `E:/Coding/SceneGraph.net/src/SceneGraph.OcctInterop/OcctShapeStore.cs`
- Local reference app code: `E:/Coding/SceneGraph.net/src/SceneGraph.Avalonia.Inspect/Widgets/TopologyElementResolver.cs`
- Local reference app tests: `E:/Coding/SceneGraph.net/tests/SceneGraph.Avalonia.Inspect.Tests/Widgets/MeasureWidgetMeshFallbackTests.cs`
- Emscripten embind docs: https://emscripten.org/docs/porting/connecting_cpp_and_javascript/embind.html
- OCCT modeling data docs (`TopoDS_Shape` as reference + orientation/location wrapper): https://dev.opencascade.org/doc/occt-7.7.0/overview/html/occt_user_guides__modeling_data.html
- OCCT `Standard_Transient` reference counting docs: https://dev.opencascade.org/doc/refman/html/class_standard___transient.html
- OCCT `BRepGProp` docs (`SkipShared`, `UseTriangulation`, exact vs triangulated properties): https://dev.opencascade.org/doc/refman/html/class_b_rep_g_prop.html
- OCCT `BRepExtrema_DistShapeShape` docs (multiple solutions, support points, inner solution): https://dev.opencascade.org/doc/refman/html/class_b_rep_extrema___dist_shape_shape.html
- OCCT `BRepAdaptor_Curve` docs (curve typing and analytic-vs-other cases): https://dev.opencascade.org/doc/refman/html/class_b_rep_adaptor___curve.html
- OCCT `BRepAdaptor_Surface` docs (surface evaluation on `(U, V)`): https://dev.opencascade.org/doc/refman/html/class_b_rep_adaptor___surface.html
- OCCT `BRepLProp_SLProps` docs (`IsNormalDefined`, parameterized normal evaluation): https://dev.opencascade.org/doc/refman/html/class_b_rep_l_prop___s_l_props.html

## Phase-Level Watch List

- Lifecycle-handles phase: Watch Pitfall 1, Moderate Pitfall 2, and Minor Pitfall 1. If ownership is vague here, the rest of the milestone is built on a leak-prone contract.
- Topology-ref phase: Watch Pitfall 2 and Pitfall 3. Assembly occurrence identity and mesh-id mapping need to be solved together, not in separate cleanups.
- Primitive-measurement phase: Watch Pitfall 4 and Moderate Pitfall 1. Semantics and units will decide whether downstream apps can trust the numbers.
- Adapter/docs/release phase: Watch Moderate Pitfall 3 and Minor Pitfall 2. Keep the JS surface ergonomic and keep the milestone inside the runtime boundary.
