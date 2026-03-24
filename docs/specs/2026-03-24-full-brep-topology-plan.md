# Full B-Rep Topology Output — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace flat `faceRanges` + `edges` with complete B-Rep topology output (Face/Edge/Vertex with stable IDs and adjacency) across all formats.

**Architecture:** Single extraction function (`ExtractMeshFromShape`) in `importer-utils.cpp` builds topology using `TopExp::MapShapes`. XDE callers post-fill face colors. JS interface serializes via Embind. Model normalizer updated to pass through new fields.

**Tech Stack:** C++ (OCCT 7.9.3, Emscripten/Embind), JavaScript (Node.js test runner)

**Spec:** `docs/specs/2026-03-24-full-brep-topology-design.md`

**Build command:** `cmd /c "call emsdk\emsdk_env.bat & cd build & emmake make -j4"` (~2 min incremental)
**Test commands:**
- `npm test`
- `node --test packages/occt-core/test/core.test.mjs packages/occt-babylon-loader/test/format-routing.test.mjs`

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/importer.hpp` | Modify | Replace old structs with `OcctFaceTopoData`, `OcctEdgeTopoData`, `OcctVertexTopoData` |
| `src/importer-utils.cpp` | Rewrite | New `ExtractMeshFromShape` with `TopExp::MapShapes`-driven topology |
| `src/importer-utils.hpp` | No change | Signature unchanged (`OcctMeshData ExtractMeshFromShape(...)`) |
| `src/importer-xde.cpp` | Modify | Color loop: `faceRanges[i].color` → `faces[i].color` |
| `src/js-interface.cpp` | Modify | `MeshToVal`: new topology fields. `BuildResult`: material loop uses `faces[]` |
| `dist/occt-js.d.ts` | Rewrite | New TypeScript interfaces for topology |
| `packages/occt-core/src/model-normalizer.js` | Modify | `normalizeFaces()` replaces `normalizeFaceRanges()`, `normalizeEdges()` updated |
| `packages/occt-core/test/core.test.mjs` | Modify | Test data uses new topology shape |
| `test/test_multi_format_exports.mjs` | Modify | Add topology correctness assertions |
| `test/debug_edge_transform.mjs` | Modify | Edge access: `.positionIndices` → `.points` |
| `test/test_mvp_acceptance.mjs` | Check | Verify no `faceRanges`/`edges` references (likely no change) |
| `packages/occt-babylon-loader/` | No change | Consumes normalized output from `model-normalizer.js`, not raw Wasm fields. No direct `faceRanges`/`edges` references. Listed in spec for completeness. |

---

## Task 1: Update C++ Data Structures (`importer.hpp`)

**Files:**
- Modify: `src/importer.hpp`

- [ ] **Step 1: Replace old structs with new topology structs**

Remove `OcctFaceData` (lines 23-28), `OcctMeshData::FaceRange` (lines 38-43), and `OcctMeshData::EdgeData` (lines 46-48). Replace with:

```cpp
// Topology face — 1-based ID from TopExp::MapShapes
struct OcctFaceTopoData {
    int              id = 0;
    std::string      name;
    uint32_t         firstIndex = 0;   // offset into mesh.indices[]
    uint32_t         indexCount = 0;   // number of indices (triangles × 3)
    std::vector<int> edgeIndices;      // 0-based index into edges[]
    OcctColor        color;
};

// Topology edge — 1-based ID from TopExp::MapShapes
struct OcctEdgeTopoData {
    int              id = 0;
    std::string      name;
    std::vector<float> points;         // independent polyline [x,y,z, ...]
    std::vector<int> ownerFaceIds;     // 1-based face IDs
    bool             isFreeEdge = false;
    OcctColor        color;
};

// Topology vertex — 1-based ID from TopExp::MapShapes
struct OcctVertexTopoData {
    int   id = 0;
    float position[3] = {0, 0, 0};
};
```

Update `OcctMeshData` to replace `faceRanges` + `edges` with:

```cpp
struct OcctMeshData {
    std::string            name;
    OcctColor              color;
    std::vector<float>     positions;
    std::vector<float>     normals;
    std::vector<uint32_t>  indices;

    // Full topology (replaces old faceRanges + edges)
    std::vector<OcctFaceTopoData>   faces;
    std::vector<OcctEdgeTopoData>   edges;
    std::vector<OcctVertexTopoData> vertices;
    std::vector<int>                triangleToFaceMap;
};
```

- [ ] **Step 2: Verify header compiles in isolation**

This step is verified via the full build in Task 5. No standalone compilation possible for Emscripten headers.

- [ ] **Step 3: Commit**

```bash
git add src/importer.hpp
git commit -m "refactor: replace faceRanges/edges with full topology structs in importer.hpp"
```

---

## Task 2: Rewrite Mesh Extraction (`importer-utils.cpp`)

**Files:**
- Modify: `src/importer-utils.cpp`

- [ ] **Step 1: Remove `faceRanges` push from `ExtractFace`**

The existing `ExtractFace` function (lines 84-156) pushes to `mesh.faceRanges` at lines 148-153. Since `FaceRange` no longer exists, remove these lines:

```cpp
// DELETE these lines from ExtractFace (lines 103, 149-153):
uint32_t faceFirstTriIndex = ...;   // line 103 — remove
OcctMeshData::FaceRange range;       // line 150 — remove
range.first = faceFirstTriIndex;     // line 151 — remove
range.last = faceLastTriIndex;       // line 152 — remove
mesh.faceRanges.push_back(range);    // line 153 — remove
```

Also remove the `faceLastTriIndex` variable at line 149. `ExtractFace` should only append positions, normals, and indices — topology tracking is now handled by the caller.

- [ ] **Step 2: Rewrite `ExtractMeshFromShape` with topology extraction**

Replace the current function (lines 164-274) with the new implementation. The key changes:

1. Build index maps at the top:
```cpp
TopTools_IndexedMapOfShape faceMap, edgeMap, vertexMap;
TopExp::MapShapes(shape, TopAbs_FACE, faceMap);
TopExp::MapShapes(shape, TopAbs_EDGE, edgeMap);
TopExp::MapShapes(shape, TopAbs_VERTEX, vertexMap);
```

2. Phase 1 — Extract faces by iterating `faceMap` (1..N):
```cpp
for (int fi = 1; fi <= faceMap.Extent(); ++fi) {
    const TopoDS_Face& face = TopoDS::Face(faceMap(fi));
    OcctFaceTopoData faceData;
    faceData.id = fi;
    faceData.firstIndex = static_cast<uint32_t>(mesh.indices.size());

    ExtractFace(face, mesh, globalVertexOffset);  // existing function, unchanged

    faceData.indexCount = static_cast<uint32_t>(mesh.indices.size()) - faceData.firstIndex;

    // Build triangleToFaceMap entries
    uint32_t triCount = faceData.indexCount / 3;
    for (uint32_t t = 0; t < triCount; ++t) {
        mesh.triangleToFaceMap.push_back(fi);
    }

    mesh.faces.push_back(std::move(faceData));
}
```

3. Phase 2 — Extract edges by iterating `edgeMap` (1..N). All edges included (empty points for edges without polyline). For edges with geometry, find the polyline from the face's triangulation via `PolygonOnTriangulation`, reading node positions from the triangulation and applying `faceLoc.Transformation()`. Fallback to `Polygon3D`. Determine `isFreeEdge` and collect `ownerFaceIds`:

```cpp
for (int ei = 1; ei <= edgeMap.Extent(); ++ei) {
    const TopoDS_Edge& edge = TopoDS::Edge(edgeMap(ei));
    OcctEdgeTopoData edgeData;
    edgeData.id = ei;

    if (BRep_Tool::Degenerated(edge)) {
        mesh.edges.push_back(std::move(edgeData));
        continue;
    }

    // Find ownerFaceIds and extract polyline from first available triangulation
    bool polylineFound = false;
    for (int fi = 1; fi <= faceMap.Extent(); ++fi) {
        const TopoDS_Face& face = TopoDS::Face(faceMap(fi));
        TopLoc_Location faceLoc;
        Handle(Poly_Triangulation) triangulation = BRep_Tool::Triangulation(face, faceLoc);
        if (triangulation.IsNull()) continue;

        // Check if this edge belongs to this face
        bool edgeOnFace = false;
        for (TopExp_Explorer ex(face, TopAbs_EDGE); ex.More(); ex.Next()) {
            if (edgeMap.FindIndex(ex.Current()) == ei) {
                edgeOnFace = true;
                break;
            }
        }
        if (!edgeOnFace) continue;

        edgeData.ownerFaceIds.push_back(fi);

        if (!polylineFound) {
            Handle(Poly_PolygonOnTriangulation) polyOnTri =
                BRep_Tool::PolygonOnTriangulation(edge, triangulation, faceLoc);
            if (!polyOnTri.IsNull()) {
                gp_Trsf trsf = faceLoc.Transformation();
                const TColStd_Array1OfInteger& nodeIndices = polyOnTri->Nodes();
                for (int i = nodeIndices.Lower(); i <= nodeIndices.Upper(); ++i) {
                    gp_Pnt pt = triangulation->Node(nodeIndices(i));
                    pt.Transform(trsf);
                    edgeData.points.push_back(static_cast<float>(pt.X()));
                    edgeData.points.push_back(static_cast<float>(pt.Y()));
                    edgeData.points.push_back(static_cast<float>(pt.Z()));
                }
                polylineFound = true;
            }
        }
    }

    // If no face-based polyline, try Polygon3D (free edges)
    if (!polylineFound) {
        TopLoc_Location loc;
        Handle(Poly_Polygon3D) poly3d = BRep_Tool::Polygon3D(edge, loc);
        if (!poly3d.IsNull()) {
            gp_Trsf trsf = loc.Transformation();
            const TColgp_Array1OfPnt& nodes = poly3d->Nodes();
            for (int i = nodes.Lower(); i <= nodes.Upper(); ++i) {
                gp_Pnt p = nodes(i);
                p.Transform(trsf);
                edgeData.points.push_back(static_cast<float>(p.X()));
                edgeData.points.push_back(static_cast<float>(p.Y()));
                edgeData.points.push_back(static_cast<float>(p.Z()));
            }
        }
    }

    edgeData.isFreeEdge = edgeData.ownerFaceIds.empty();
    mesh.edges.push_back(std::move(edgeData));
}
```

4. Phase 3 — Backfill face `edgeIndices`:
```cpp
for (int fi = 1; fi <= faceMap.Extent(); ++fi) {
    const TopoDS_Face& face = TopoDS::Face(faceMap(fi));
    OcctFaceTopoData& faceData = mesh.faces[fi - 1];
    for (TopExp_Explorer ex(face, TopAbs_EDGE); ex.More(); ex.Next()) {
        int edgeIdx = edgeMap.FindIndex(ex.Current());
        if (edgeIdx >= 1) {
            // Avoid duplicates (same edge may appear twice on a face with different orientations)
            int zeroBasedIdx = edgeIdx - 1;
            if (std::find(faceData.edgeIndices.begin(), faceData.edgeIndices.end(), zeroBasedIdx) == faceData.edgeIndices.end()) {
                faceData.edgeIndices.push_back(zeroBasedIdx);
            }
        }
    }
}
```

5. Phase 4 — Extract B-Rep vertices:
```cpp
for (int vi = 1; vi <= vertexMap.Extent(); ++vi) {
    const TopoDS_Vertex& vertex = TopoDS::Vertex(vertexMap(vi));
    gp_Pnt pt = BRep_Tool::Pnt(vertex);
    OcctVertexTopoData vData;
    vData.id = vi;
    vData.position[0] = static_cast<float>(pt.X());
    vData.position[1] = static_cast<float>(pt.Y());
    vData.position[2] = static_cast<float>(pt.Z());
    mesh.vertices.push_back(std::move(vData));
}
```

Note: Add `#include <TopoDS_Vertex.hxx>` and `#include <algorithm>` to the includes if not already present.

**Behavioral change:** Free edge vertices are no longer appended to `mesh.positions`/`mesh.normals`. Edge points are now stored independently in `edgeData.points`. This means `mesh.positions.size()` may be slightly smaller than before for shapes with free edges.

- [ ] **Step 3: Commit**

```bash
git add src/importer-utils.cpp
git commit -m "feat: rewrite ExtractMeshFromShape with full topology extraction"
```

---

## Task 3: Update XDE Face Color Assignment (`importer-xde.cpp`)

**Files:**
- Modify: `src/importer-xde.cpp` (lines 213-224 in `ExtractShapeMeshes`)

- [ ] **Step 1: Replace `faceRanges` color loop with `faces` color loop**

In the `extractOne` lambda inside `ExtractShapeMeshes` (line 194 onwards), replace:

```cpp
// OLD (lines 213-224):
int faceIdx = 0;
for (TopExp_Explorer ex(subShape, TopAbs_FACE); ex.More(); ex.Next()) {
    if (faceIdx < static_cast<int>(meshData.faceRanges.size())) {
        OcctColor faceColor;
        if (GetShapeColor(ex.Current(), shapeTool, colorTool, faceColor)) {
            meshData.faceRanges[faceIdx].color = faceColor;
        } else {
            meshData.faceRanges[faceIdx].color = shapeColor;
        }
    }
    ++faceIdx;
}
```

With:

```cpp
// NEW: Assign colors to topology faces
// Build a face map for this sub-shape to match face IDs
TopTools_IndexedMapOfShape localFaceMap;
TopExp::MapShapes(subShape, TopAbs_FACE, localFaceMap);
for (int fi = 1; fi <= localFaceMap.Extent(); ++fi) {
    if (fi - 1 < static_cast<int>(meshData.faces.size())) {
        OcctColor faceColor;
        if (GetShapeColor(localFaceMap(fi), shapeTool, colorTool, faceColor)) {
            meshData.faces[fi - 1].color = faceColor;
        } else {
            meshData.faces[fi - 1].color = shapeColor;
        }
    }
}
```

Add `#include <TopTools_IndexedMapOfShape.hxx>` and `#include <TopExp.hxx>` to the includes at the top of the file if not already present.

- [ ] **Step 2: Commit**

```bash
git add src/importer-xde.cpp
git commit -m "fix: update XDE face color assignment to use new faces[] topology"
```

---

## Task 4: Update JS Interface (`js-interface.cpp`)

**Files:**
- Modify: `src/js-interface.cpp`

- [ ] **Step 1: Replace `MeshToVal` topology serialization (lines 64-83)**

Replace the `faceRanges` and `edges` serialization block with:

```cpp
// Topology: faces
val facesArr = val::array();
for (const auto& face : mesh.faces) {
    val fObj = val::object();
    fObj.set("id", face.id);
    fObj.set("name", face.name);
    fObj.set("firstIndex", face.firstIndex);
    fObj.set("indexCount", face.indexCount);

    val edgeIdxArr = val::array();
    for (int idx : face.edgeIndices) {
        edgeIdxArr.call<void>("push", idx);
    }
    fObj.set("edgeIndices", edgeIdxArr);
    fObj.set("color", ColorToVal(face.color));
    facesArr.call<void>("push", fObj);
}
obj.set("faces", facesArr);

// Topology: edges
val edgesArr = val::array();
for (const auto& edge : mesh.edges) {
    val eObj = val::object();
    eObj.set("id", edge.id);
    eObj.set("name", edge.name);
    eObj.set("isFreeEdge", edge.isFreeEdge);

    {
        val points = val::global("Float32Array").new_(edge.points.size());
        if (!edge.points.empty()) {
            val memView = val(typed_memory_view(edge.points.size(), edge.points.data()));
            points.call<void>("set", memView);
        }
        eObj.set("points", points);
    }

    val ownerArr = val::array();
    for (int fid : edge.ownerFaceIds) {
        ownerArr.call<void>("push", fid);
    }
    eObj.set("ownerFaceIds", ownerArr);
    eObj.set("color", ColorToVal(edge.color));
    edgesArr.call<void>("push", eObj);
}
obj.set("edges", edgesArr);

// Topology: vertices
val verticesArr = val::array();
for (const auto& vert : mesh.vertices) {
    val vObj = val::object();
    vObj.set("id", vert.id);
    val pos = val::array();
    pos.call<void>("push", vert.position[0]);
    pos.call<void>("push", vert.position[1]);
    pos.call<void>("push", vert.position[2]);
    vObj.set("position", pos);
    verticesArr.call<void>("push", vObj);
}
obj.set("vertices", verticesArr);

// Topology: triangleToFaceMap
{
    val triMap = val::global("Int32Array").new_(mesh.triangleToFaceMap.size());
    if (!mesh.triangleToFaceMap.empty()) {
        val memView = val(typed_memory_view(mesh.triangleToFaceMap.size(), mesh.triangleToFaceMap.data()));
        triMap.call<void>("set", memView);
    }
    obj.set("triangleToFaceMap", triMap);
}
```

- [ ] **Step 2: Update `BuildResult` material loop (lines 231-236)**

Replace:
```cpp
for (const auto& mesh : scene.meshes) {
    getOrCreateMaterial(mesh.color);
    for (const auto& fr : mesh.faceRanges) {
        getOrCreateMaterial(fr.color);
    }
}
```

With:
```cpp
for (const auto& mesh : scene.meshes) {
    getOrCreateMaterial(mesh.color);
    for (const auto& face : mesh.faces) {
        getOrCreateMaterial(face.color);
    }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/js-interface.cpp
git commit -m "feat: serialize full topology (faces/edges/vertices) via Embind"
```

---

## Task 5: Build and Verify Compilation

- [ ] **Step 1: Run incremental Wasm build**

```bash
cmd /c "call emsdk\emsdk_env.bat & cd build & emmake make -j4"
```

Expected: Build succeeds. If there are compile errors, fix them in the relevant file and rebuild.

- [ ] **Step 2: Smoke test with BREP file**

```bash
emsdk/node/22.16.0_64bit/bin/node -e "
const factory = require('./dist/occt-js.js');
const fs = require('fs');
(async () => {
  const m = await factory();
  const brep = new Uint8Array(fs.readFileSync('test/as1_pe_203.brep'));
  const r = m.ReadBrepFile(brep, {});
  const g = r.geometries[0];
  console.log('success:', r.success);
  console.log('faces:', g.faces.length);
  console.log('edges:', g.edges.length);
  console.log('vertices:', g.vertices.length);
  console.log('triMapLen:', g.triangleToFaceMap.length);
  console.log('face[0]:', JSON.stringify({id: g.faces[0].id, firstIndex: g.faces[0].firstIndex, indexCount: g.faces[0].indexCount, edgeIndices: g.faces[0].edgeIndices}));
  console.log('edge[0] points len:', g.edges[0].points.length, 'ownerFaceIds:', g.edges[0].ownerFaceIds, 'isFreeEdge:', g.edges[0].isFreeEdge);
})();
"
```

Expected: `success: true`, non-zero faces/edges/vertices counts, face[0] has valid fields, edge[0] has points and ownerFaceIds.

- [ ] **Step 3: Smoke test with STEP file**

```bash
emsdk/node/22.16.0_64bit/bin/node -e "
const factory = require('./dist/occt-js.js');
const fs = require('fs');
(async () => {
  const m = await factory();
  const step = new Uint8Array(fs.readFileSync('test/simple_part.step'));
  const r = m.ReadStepFile(step, {});
  const g = r.geometries[0];
  console.log('success:', r.success);
  console.log('faces:', g.faces.length);
  console.log('face[0] color:', g.faces[0].color);
})();
"
```

Expected: `success: true`, faces with color objects (not null).

---

## Task 6: Update TypeScript Definitions (`dist/occt-js.d.ts`)

**Files:**
- Modify: `dist/occt-js.d.ts`

- [ ] **Step 1: Replace old interfaces with new topology types**

Replace `OcctJSEdge`, `OcctJSFaceRange`, and `OcctJSGeometry` with:

```typescript
export interface OcctJSFace {
    id: number;
    name: string;
    firstIndex: number;
    indexCount: number;
    edgeIndices: number[];
    color: OcctJSColor | null;
}

export interface OcctJSEdge {
    id: number;
    name: string;
    points: Float32Array;
    ownerFaceIds: number[];
    isFreeEdge: boolean;
    color: OcctJSColor | null;
}

export interface OcctJSVertex {
    id: number;
    position: [number, number, number];
}

export interface OcctJSGeometry {
    name: string;
    color: OcctJSColor | null;
    positions: Float32Array;
    normals: Float32Array;
    indices: Uint32Array;
    faces: OcctJSFace[];
    edges: OcctJSEdge[];
    vertices: OcctJSVertex[];
    triangleToFaceMap: Int32Array;
}
```

- [ ] **Step 2: Commit**

```bash
git add dist/occt-js.d.ts
git commit -m "types: update TypeScript definitions for full topology output"
```

---

## Task 7: Update Model Normalizer (`packages/occt-core/src/model-normalizer.js`)

**Files:**
- Modify: `packages/occt-core/src/model-normalizer.js`

- [ ] **Step 1: Replace `normalizeFaceRanges` with `normalizeFaces` (lines 84-96)**

```javascript
function normalizeFaces(mesh) {
  if (!Array.isArray(mesh?.faces)) {
    // Backward compat: fall back to old faceRanges if present
    const source = Array.isArray(mesh?.faceRanges)
      ? mesh.faceRanges
      : Array.isArray(mesh?.brep_faces)
        ? mesh.brep_faces
        : [];
    return source.map((range) => ({
      first: Number.isFinite(range?.first) ? range.first : 0,
      last: Number.isFinite(range?.last) ? range.last : 0,
      color: normalizeColor(range?.color),
    }));
  }

  return mesh.faces.map((face) => ({
    id: face?.id ?? 0,
    name: face?.name ?? "",
    firstIndex: face?.firstIndex ?? 0,
    indexCount: face?.indexCount ?? 0,
    edgeIndices: toArray(face?.edgeIndices),
    color: normalizeColor(face?.color),
  }));
}
```

- [ ] **Step 2: Replace `normalizeEdges` (lines 98-120)**

```javascript
function normalizeEdges(mesh) {
  if (!Array.isArray(mesh?.edges)) {
    return [];
  }

  return mesh.edges.map((edge) => {
    if (!edge) return null;

    // New topology format: edge has id, points, ownerFaceIds, isFreeEdge
    if (edge.points !== undefined) {
      return {
        id: edge.id ?? 0,
        name: edge.name ?? "",
        points: toArray(edge.points),
        ownerFaceIds: toArray(edge.ownerFaceIds),
        isFreeEdge: edge.isFreeEdge ?? false,
        color: normalizeColor(edge.color),
      };
    }

    // Backward compat: old positionIndices format
    const source = Array.isArray(edge.positionIndices) || ArrayBuffer.isView(edge.positionIndices)
      ? Array.from(edge.positionIndices)
      : Array.isArray(edge) ? edge : [];
    return source.filter((index) => Number.isInteger(index) && index >= 0);
  }).filter(Boolean);
}
```

- [ ] **Step 3: Add `normalizeVertices` and `normalizeTriangleToFaceMap`**

```javascript
function normalizeVertices(mesh) {
  if (!Array.isArray(mesh?.vertices)) {
    return [];
  }
  return mesh.vertices.map((v) => ({
    id: v?.id ?? 0,
    position: Array.isArray(v?.position) ? v.position.slice(0, 3) : toArray(v?.position).slice(0, 3),
  }));
}

function normalizeTriangleToFaceMap(mesh) {
  return toArray(mesh?.triangleToFaceMap);
}
```

- [ ] **Step 4: Update `normalizeGeometry` (lines 122-137)**

Replace:
```javascript
    faceRanges: normalizeFaceRanges(mesh),
    edges: normalizeEdges(mesh),
```

With:
```javascript
    faces: normalizeFaces(mesh),
    edges: normalizeEdges(mesh),
    vertices: normalizeVertices(mesh),
    triangleToFaceMap: normalizeTriangleToFaceMap(mesh),
```

- [ ] **Step 5: Update `collectMaterialColors` (lines 139-160)**

Replace `geometry.faceRanges` references:
```javascript
// OLD:
for (const faceRange of geometry.faceRanges) {
  if (faceRange.color) {
    colors.push(faceRange.color);
  }
}

// NEW:
for (const face of geometry.faces ?? []) {
  if (face.color) {
    colors.push(face.color);
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add packages/occt-core/src/model-normalizer.js
git commit -m "feat: update model normalizer for full topology output"
```

---

## Task 8: Update Core Tests (`packages/occt-core/test/core.test.mjs`)

**Files:**
- Modify: `packages/occt-core/test/core.test.mjs`

- [ ] **Step 1: Update test data in "normalizes STEP-like occt-js output" (lines 43-57)**

Replace:
```javascript
faceRanges: [{ first: 0, last: 0, color: { r: 0, g: 1, b: 0 } }],
edges: [{ positionIndices: new Uint32Array([0, 1]) }],
```

With:
```javascript
faces: [{
  id: 1,
  name: "",
  firstIndex: 0,
  indexCount: 3,
  edgeIndices: [0],
  color: { r: 0, g: 1, b: 0 },
}],
edges: [{
  id: 1,
  name: "",
  points: new Float32Array([0, 0, 0, 1, 0, 0]),
  ownerFaceIds: [1],
  isFreeEdge: false,
  color: null,
}],
vertices: [{ id: 1, position: [0, 0, 0] }],
triangleToFaceMap: new Int32Array([1]),
```

- [ ] **Step 2: Update assertions (lines 65-66)**

Replace:
```javascript
assert.deepEqual(result.geometries[0].faceRanges[0].color, [0, 1, 0, 1]);
assert.deepEqual(result.geometries[0].edges[0], [0, 1]);
```

With:
```javascript
assert.equal(result.geometries[0].faces[0].id, 1);
assert.deepEqual(result.geometries[0].faces[0].color, [0, 1, 0, 1]);
assert.equal(result.geometries[0].edges[0].id, 1);
assert.deepEqual(result.geometries[0].edges[0].points, [0, 0, 0, 1, 0, 0]);
assert.deepEqual(result.geometries[0].edges[0].ownerFaceIds, [1]);
assert.equal(result.geometries[0].vertices[0].id, 1);
assert.deepEqual(result.geometries[0].triangleToFaceMap, [1]);
```

- [ ] **Step 3: Run unit tests**

```bash
node --test packages/occt-core/test/core.test.mjs
```

Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add packages/occt-core/test/core.test.mjs
git commit -m "test: update core tests for full topology output"
```

---

## Task 9: Update Multi-Format Export Tests (`test/test_multi_format_exports.mjs`)

**Files:**
- Modify: `test/test_multi_format_exports.mjs`

- [ ] **Step 1: Add topology correctness assertions**

After existing assertions for each format (BREP, STEP, IGES), add topology validation:

```javascript
function validateTopology(result, label) {
  const g = result.geometries[0];

  // Faces: sequential 1-based IDs
  assert(g.faces.length > 0, `${label}: should have faces`);
  for (let i = 0; i < g.faces.length; i++) {
    assert.equal(g.faces[i].id, i + 1, `${label}: face[${i}].id should be ${i + 1}`);
  }

  // Edges: sequential 1-based IDs
  assert(g.edges.length > 0, `${label}: should have edges`);
  for (let i = 0; i < g.edges.length; i++) {
    assert.equal(g.edges[i].id, i + 1, `${label}: edge[${i}].id should be ${i + 1}`);
  }

  // Vertices: sequential 1-based IDs
  assert(g.vertices.length > 0, `${label}: should have vertices`);
  for (let i = 0; i < g.vertices.length; i++) {
    assert.equal(g.vertices[i].id, i + 1, `${label}: vertex[${i}].id should be ${i + 1}`);
  }

  // Index coverage: sum of face indexCounts = indices.length
  const totalIndexCount = g.faces.reduce((sum, f) => sum + f.indexCount, 0);
  assert.equal(totalIndexCount, g.indices.length, `${label}: face indexCount sum should equal indices.length`);

  // triangleToFaceMap
  assert.equal(g.triangleToFaceMap.length, g.indices.length / 3, `${label}: triangleToFaceMap length`);
  for (let i = 0; i < g.triangleToFaceMap.length; i++) {
    const fid = g.triangleToFaceMap[i];
    assert(fid >= 1 && fid <= g.faces.length, `${label}: triangleToFaceMap[${i}]=${fid} out of range`);
  }

  // Edge ownerFaceIds validity
  for (const edge of g.edges) {
    for (const fid of edge.ownerFaceIds) {
      assert(fid >= 1 && fid <= g.faces.length, `${label}: edge ${edge.id} ownerFaceId ${fid} out of range`);
    }
    if (edge.isFreeEdge) {
      assert.equal(edge.ownerFaceIds.length, 0, `${label}: free edge ${edge.id} should have no owners`);
    }
  }

  // Face edgeIndices validity
  for (const face of g.faces) {
    for (const ei of face.edgeIndices) {
      assert(ei >= 0 && ei < g.edges.length, `${label}: face ${face.id} edgeIndex ${ei} out of range`);
    }
  }

  // Bidirectional consistency
  for (const face of g.faces) {
    for (const ei of face.edgeIndices) {
      const edge = g.edges[ei];
      assert(edge.ownerFaceIds.includes(face.id),
        `${label}: face ${face.id} lists edge ${ei} but edge's ownerFaceIds doesn't include face`);
    }
  }
  for (let ei = 0; ei < g.edges.length; ei++) {
    const edge = g.edges[ei];
    for (const fid of edge.ownerFaceIds) {
      const face = g.faces[fid - 1];
      assert(face.edgeIndices.includes(ei),
        `${label}: edge ${edge.id} lists face ${fid} but face's edgeIndices doesn't include edge`);
    }
  }
}
```

Call `validateTopology(brepResult, "BREP")`, `validateTopology(stepResult, "STEP")`, `validateTopology(igesResult, "IGES")` after each format import.

- [ ] **Step 2: Run topology tests**

```bash
emsdk/node/22.16.0_64bit/bin/node test/test_multi_format_exports.mjs
```

Expected: All pass.

- [ ] **Step 3: Commit**

```bash
git add test/test_multi_format_exports.mjs
git commit -m "test: add topology correctness and bidirectional consistency tests"
```

---

## Task 10: Update Debug Edge Transform Script (`test/debug_edge_transform.mjs`)

**Files:**
- Modify: `test/debug_edge_transform.mjs`

- [ ] **Step 1: Update edge data access pattern**

Replace all references to `edge.positionIndices` with the new `edge.points` format. The old code indexes into `geo.positions` using `positionIndices`; the new code reads directly from `edge.points`:

Old pattern:
```javascript
for (const edge of geo.edges) {
  for (const idx of edge.positionIndices) {
    const x = geo.positions[idx * 3];
    // ...
  }
}
```

New pattern:
```javascript
for (const edge of geo.edges) {
  for (let i = 0; i < edge.points.length; i += 3) {
    const x = edge.points[i];
    const y = edge.points[i + 1];
    const z = edge.points[i + 2];
    // ...
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add test/debug_edge_transform.mjs
git commit -m "fix: update debug_edge_transform for new edge topology format"
```

---

## Task 11: Run Full Test Suite and Verify

- [ ] **Step 1: Run npm test**

```bash
npm test
```

Expected: All tests pass.

- [ ] **Step 2: Run package tests**

```bash
node --test packages/occt-core/test/core.test.mjs packages/occt-babylon-loader/test/format-routing.test.mjs
```

Expected: All tests pass.

- [ ] **Step 3: Run MVP acceptance tests**

```bash
emsdk/node/22.16.0_64bit/bin/node test/test_mvp_acceptance.mjs
```

Expected: 18/18 pass. If any reference old `faceRanges`/`edges`, fix them.

- [ ] **Step 4: Commit any final fixes**

If any test needed fixing, commit the changes.
