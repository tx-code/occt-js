#pragma once

#include "importer.hpp"

#include <TopoDS_Shape.hxx>

/// Triangulate a shape using BRepMesh. Uses bounding-box-ratio deflection.
/// Returns false if the shape has no valid bounding box.
bool TriangulateShape(TopoDS_Shape& shape, const ImportParams& params);

/// Extract triangulated mesh data from an already-meshed shape.
/// Uses each face's own location — no external location parameter needed.
OcctMeshData ExtractMeshFromShape(const TopoDS_Shape& shape);
