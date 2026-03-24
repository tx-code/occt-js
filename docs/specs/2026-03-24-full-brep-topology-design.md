# Full B-Rep Topology Output for CAD-Grade Rendering & Interaction

**Date**: 2026-03-24
**Status**: Approved

## Goal

Upgrade occt-js Wasm output from flat mesh + simple face ranges to complete B-Rep topology (Face/Edge/Vertex with stable IDs and adjacency), enabling CAD-grade rendering and interaction (face selection, edge highlight, face-edge association) in downstream consumers.

This is Phase A of a larger vision. Phase B (shape persistence, measurement APIs, LOD re-triangulation) will be added incrementally as needed.

## Scope

- **Formats**: All three — STEP, IGES, BREP — share the same extraction pipeline.
- **Compatibility**: Direct replacement of old `faceRanges` and `edges` fields (no backward compat shim). All consumers updated in the same change.
- **Reference model**: SceneGraph.net's `BrepData` / Native API topology output.

## C++ Data Structures (`importer.hpp`)

### Removed

- `OcctFaceData` (old per-face struct with its own positions/normals/indices)
- `OcctMeshData::FaceRange`
- `OcctMeshData::EdgeData` (old: positionIndices only)

### New Topology Structs

```cpp
struct OcctFaceTopoData {
    int         id;                  // 1-based, from TopExp::MapShapes
    std::string name;                // optional (STEP/IGES may have names)
    uint32_t    firstIndex;          // start offset in mesh.indices[]
    uint32_t    indexCount;          // number of indices (triangles × 3)
    std::vector<int> edgeIndices;    // 0-based index into edges[]
    OcctColor   color;               // per-face color (may be invalid)
};

struct OcctEdgeTopoData {
    int         id;                  // 1-based
    std::string name;
    std::vector<float> points;       // independent polyline [x,y,z, ...]
    std::vector<int> ownerFaceIds;   // 1-based face IDs
    bool        isFreeEdge = false;
    OcctColor   color;
};

struct OcctVertexTopoData {
    int   id;                        // 1-based
    float position[3];
};
```

### Updated `OcctMeshData`

```cpp
struct OcctMeshData {
    std::string            name;
    OcctColor              color;
    std::vector<float>     positions;   // merged [x,y,z, ...]
    std::vector<float>     normals;     // merged [nx,ny,nz, ...]
    std::vector<uint32_t>  indices;     // triangle indices

    // Full topology (replaces old faceRanges + edges)
    std::vector<OcctFaceTopoData>   faces;
    std::vector<OcctEdgeTopoData>   edges;
    std::vector<OcctVertexTopoData> vertices;
    std::vector<int>                triangleToFaceMap; // per-triangle → face id (1-based)
};
```

### Unchanged

- `OcctNodeData`, `OcctSceneData`, `ImportParams`, `OcctColor`

## C++ Extraction Logic (`importer-utils.cpp`)

New flow for `ExtractMeshFromShape`:

1. **Build index maps** via `TopExp::MapShapes` for Face, Edge, Vertex
2. **Extract face meshes**: iterate `faceMap` 1..N, call existing `ExtractFace()`, record `firstIndex`/`indexCount`, build `triangleToFaceMap` entries. **All faces are included** — faces with no triangulation get `indexCount=0`. This guarantees `faces[faceId-1].id == faceId` (contiguous 1-based IDs, direct indexing).
3. **Extract edges**: iterate `edgeMap` 1..N. **All edges are included** — edges without polyline data get empty `points[]`. This guarantees `edges[edgeId-1].id == edgeId` (direct indexing). For edges with geometry: get polyline via `PolygonOnTriangulation` (preferred) or `Polygon3D` (fallback). For `PolygonOnTriangulation`-sourced edges, read node positions from the triangulation and apply the face's `faceLoc.Transformation()` — same transform used in `ExtractFace()`. For `Polygon3D`-sourced edges, apply the edge's own `TopLoc_Location`. Determine `isFreeEdge` (edge not on any face), collect `ownerFaceIds`.
4. **Backfill face edgeIndices**: for each face, explore its edges via `TopExp_Explorer(face, TopAbs_EDGE)`, look up in `edgeMap` → `edgeIndices[i] = edgeMapIndex - 1` (0-based). Since all edges are included, the conversion is always `mapIndex - 1`.
5. **Extract B-Rep vertices**: iterate `vertexMap` 1..N, get position via `BRep_Tool::Pnt`. All vertices included, guaranteeing `vertices[vertexId-1].id == vertexId`.

### Face color population

`ExtractMeshFromShape` does **not** assign face colors — it has no access to XDE color tools. Color assignment is the caller's responsibility:
- **STEP/IGES**: `importer-xde.cpp` assigns `faces[].color` post-extraction, using `XCAFDoc_ColorTool::GetColor()` per face label. The existing color loop (which wrote to `faceRanges[].color`) is updated to write to `faces[].color` instead.
- **BREP**: No color available — `faces[].color` remains invalid (default).

Key changes from current code:
- Face iteration driven by `faceMap` (ensures Id = map index)
- Edge extraction from global `edgeMap` (not per-face with dedup set)
- Edge coordinates are independent (not referencing mesh positions)
- All map entries included (no skipping), guaranteeing contiguous IDs
- New steps 4 and 5

## JS Output Format (`js-interface.cpp` + `occt-js.d.ts`)

```typescript
interface OcctJSGeometry {
  name: string;
  color: OcctJSColor | null;

  // Merged mesh (unchanged)
  positions: Float32Array;
  normals: Float32Array;
  indices: Uint32Array;

  // Full topology (replaces faceRanges + old edges)
  faces: OcctJSFace[];
  edges: OcctJSEdge[];
  vertices: OcctJSVertex[];
  triangleToFaceMap: Int32Array;
}

interface OcctJSFace {
  id: number;              // 1-based
  name: string;
  firstIndex: number;
  indexCount: number;
  edgeIndices: number[];   // 0-based into edges[]
  color: OcctJSColor | null;
}

interface OcctJSEdge {
  id: number;              // 1-based
  name: string;
  points: Float32Array;    // independent polyline [x,y,z, ...]
  ownerFaceIds: number[];  // 1-based face IDs
  isFreeEdge: boolean;
  color: OcctJSColor | null;
}

interface OcctJSVertex {
  id: number;              // 1-based
  position: [number, number, number];
}
```

### Embind notes

- `faces[]`, `edges[]`, `vertices[]`: built via `emscripten::val::array()` with per-item objects
- `triangleToFaceMap`, `points`: transferred as typed arrays (Int32Array, Float32Array)
- `edgeIndices`, `ownerFaceIds`: plain JS arrays (small cardinality)

## Files Changed

| File | Change |
|------|--------|
| `src/importer.hpp` | Replace old structs with new topology structs |
| `src/importer-utils.hpp` | Update function signatures if needed |
| `src/importer-utils.cpp` | Rewrite `ExtractMeshFromShape` with topology extraction |
| `src/js-interface.cpp` | Update Embind conversion for new topology fields |
| `dist/occt-js.d.ts` | Update TypeScript definitions |
| `packages/occt-core/` | Update tests for new structure |
| `packages/occt-babylon-loader/` | Update consumer to read new fields |
| `test/test_mvp_acceptance.mjs` | Update geometry assertions |
| `test/test_multi_format_exports.mjs` | Update format validation |
| `test/debug_edge_transform.mjs` | Update edge data assertions |
| `src/importer-xde.cpp` | Update face color assignment: write to `faces[].color` instead of old `faceRanges[].color` |

## Files NOT Changed

- `src/importer-step.cpp`, `src/importer-iges.cpp`, `src/importer-brep.cpp` — callers of shared extraction, no change needed
- `CMakeLists.txt` — no new OCCT modules needed
- `ImportParams` — unchanged

## Test Plan

### Topology correctness (all formats)

Using `as1_pe_203.brep`:
- `faces[].id` is sequential 1-based, `faces[i].id === i + 1`
- `edges[].id` is sequential 1-based, `edges[i].id === i + 1`
- `vertices[].id` is sequential 1-based, `vertices[i].id === i + 1`
- Sum of all `faces[].indexCount` equals `indices.length`
- `triangleToFaceMap.length` equals `indices.length / 3`
- Every value in `triangleToFaceMap` maps to a valid face id
- `edges[].ownerFaceIds` reference valid face ids
- Non-free edges have ≥1 ownerFaceId; free edges have 0
- `faces[].edgeIndices` reference valid edges[] indices
- **Bidirectional consistency**: for every face F listing edge index E in `edgeIndices`, `edges[E].ownerFaceIds` contains `F.id`; conversely, for every edge E listing faceId F in `ownerFaceIds`, `faces[F-1].edgeIndices` contains E's index

Using `simple_part.step`:
- STEP files output full topology
- Face colors propagated via `faces[].color`

Using `cube_10x10.igs`:
- IGES files output full topology

### Regression

- All existing MVP acceptance tests still pass (with updated assertions)
- Triangle counts unchanged for all test assets
- Node tree structure unchanged

## ID Convention

All topology arrays are **dense** (no gaps). Every entry from `TopExp::MapShapes` is included, even if the element has no geometry (empty triangulation or no polyline). This guarantees direct indexing: `faces[faceId - 1]`, `edges[edgeId - 1]`, `vertices[vertexId - 1]`.

| Item | ID style | Notes |
|------|----------|-------|
| Face ID | 1-based | From `TopExp::MapShapes` index. `faces[i].id === i + 1` always holds. |
| Edge ID | 1-based | From `TopExp::MapShapes` index. `edges[i].id === i + 1` always holds. |
| Vertex ID | 1-based | From `TopExp::MapShapes` index. `vertices[i].id === i + 1` always holds. |
| `edgeIndices` in FaceData | 0-based | Array index into `edges[]`. Equal to `edgeId - 1`. |
| `ownerFaceIds` in EdgeData | 1-based | References face `.id` field. Look up via `faces[faceId - 1]`. |
| `triangleToFaceMap` values | 1-based | References face `.id` field. Look up via `faces[faceId - 1]`. |

## Notes

- **Vertex data** provides B-Rep vertex positions and IDs only. Vertex-to-edge and vertex-to-face adjacency is deferred to Phase B. Current use case: vertex display/highlight in downstream renderers.
- **`firstIndex`/`indexCount`** are in raw index units (offsets into `indices[]`), not triangle counts. Triangle count for a face = `indexCount / 3`. This differs from the old `FaceRange.first`/`last` which were triangle-index-based.
- **Material extraction** in `js-interface.cpp` `BuildResult`: the loop that iterates `faceRanges` to collect unique materials must be updated to iterate `faces[]` instead.

## Future (Phase B, not in this change)

- Shape persistence (shapeId + reference counting)
- LOD re-triangulation
- Measurement APIs (distance, angle, radius, etc.)
- Geometry type queries (plane/cylinder/sphere for faces, line/circle for edges)
