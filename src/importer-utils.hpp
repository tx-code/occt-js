#pragma once

#include "importer.hpp"

#include <TopoDS_Shape.hxx>
#include <TopLoc_Location.hxx>

/// Run BRepMesh_IncrementalMesh on `shape` using the given tessellation params.
void TriangulateShape(const TopoDS_Shape& shape, const ImportParams& params);

/// Extract triangulated mesh data from an already-meshed shape.
/// `loc` is the accumulated location/transform for this shape.
OcctMeshData ExtractMeshFromShape(const TopoDS_Shape& shape, const TopLoc_Location& loc);
