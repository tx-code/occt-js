#include "importer-utils.hpp"

#include <TopExp_Explorer.hxx>
#include <TopoDS.hxx>
#include <TopoDS_Face.hxx>
#include <BRepTools.hxx>
#include <BRep_Tool.hxx>
#include <BRepMesh_IncrementalMesh.hxx>
#include <BRepBndLib.hxx>
#include <Bnd_Box.hxx>
#include <Poly_Triangulation.hxx>
#include <gp_Pnt.hxx>
#include <gp_Dir.hxx>
#include <gp_Trsf.hxx>
#include <TopAbs.hxx>
#include <Precision.hxx>

// ---------------------------------------------------------------------------
// Triangulate a shape using BRepMesh_IncrementalMesh.
// Matches occt-import-js: uses bounding-box-ratio for linearDeflection.
// ---------------------------------------------------------------------------
bool TriangulateShape(TopoDS_Shape& shape, const ImportParams& params)
{
    Standard_Real linDeflection = params.linearDeflection;
    Standard_Real angDeflection = params.angularDeflection;

    // Use bounding-box ratio mode by default (matches occt-import-js behavior).
    Bnd_Box boundingBox;
    BRepBndLib::Add(shape, boundingBox, false);
    if (boundingBox.IsVoid()) {
        return false;
    }

    Standard_Real xMin, yMin, zMin, xMax, yMax, zMax;
    boundingBox.Get(xMin, yMin, zMin, xMax, yMax, zMax);
    Standard_Real avgSize = ((xMax - xMin) + (yMax - yMin) + (zMax - zMin)) / 3.0;
    linDeflection = avgSize * params.linearDeflection;
    if (linDeflection < Precision::Confusion()) {
        linDeflection = 0.01; // fallback: 0.01 model units
    }

    BRepMesh_IncrementalMesh mesher(shape, linDeflection, Standard_False, angDeflection);
    return true;
}

// ---------------------------------------------------------------------------
// Extract mesh data from a single face.
// Matches occt-import-js: use only face's own location, call ComputeNormals.
// ---------------------------------------------------------------------------
static void ExtractFace(const TopoDS_Face& face,
                        OcctMeshData& mesh,
                        uint32_t& globalVertexOffset)
{
    TopLoc_Location faceLoc;
    Handle(Poly_Triangulation) triangulation = BRep_Tool::Triangulation(face, faceLoc);

    if (triangulation.IsNull() || triangulation->NbNodes() == 0 || triangulation->NbTriangles() == 0) {
        return;
    }

    // Ensure normals are computed (critical — OCCT doesn't always store them).
    if (!triangulation->HasNormals()) {
        triangulation->ComputeNormals();
    }

    gp_Trsf trsf = faceLoc.Transformation();
    bool isReversed = (face.Orientation() == TopAbs_REVERSED);

    uint32_t faceFirstTriIndex = static_cast<uint32_t>(mesh.indices.size() / 3);

    int nbNodes = triangulation->NbNodes();
    int nbTriangles = triangulation->NbTriangles();

    // --- Vertices (apply face location transform) ---
    for (int i = 1; i <= nbNodes; ++i) {
        gp_Pnt pt = triangulation->Node(i);
        pt.Transform(trsf);
        mesh.positions.push_back(static_cast<float>(pt.X()));
        mesh.positions.push_back(static_cast<float>(pt.Y()));
        mesh.positions.push_back(static_cast<float>(pt.Z()));
    }

    // --- Normals ---
    if (triangulation->HasNormals()) {
        for (int i = 1; i <= nbNodes; ++i) {
            gp_Dir normal = triangulation->Normal(i);
            normal.Transform(trsf);
            if (isReversed) {
                mesh.normals.push_back(static_cast<float>(-normal.X()));
                mesh.normals.push_back(static_cast<float>(-normal.Y()));
                mesh.normals.push_back(static_cast<float>(-normal.Z()));
            } else {
                mesh.normals.push_back(static_cast<float>(normal.X()));
                mesh.normals.push_back(static_cast<float>(normal.Y()));
                mesh.normals.push_back(static_cast<float>(normal.Z()));
            }
        }
    }

    // --- Triangles ---
    for (int i = 1; i <= nbTriangles; ++i) {
        Poly_Triangle tri = triangulation->Triangle(i);
        if (isReversed) {
            mesh.indices.push_back(globalVertexOffset + static_cast<uint32_t>(tri(1) - 1));
            mesh.indices.push_back(globalVertexOffset + static_cast<uint32_t>(tri(3) - 1));
            mesh.indices.push_back(globalVertexOffset + static_cast<uint32_t>(tri(2) - 1));
        } else {
            mesh.indices.push_back(globalVertexOffset + static_cast<uint32_t>(tri(1) - 1));
            mesh.indices.push_back(globalVertexOffset + static_cast<uint32_t>(tri(2) - 1));
            mesh.indices.push_back(globalVertexOffset + static_cast<uint32_t>(tri(3) - 1));
        }
    }

    // Face range for sub-material support
    uint32_t faceLastTriIndex = static_cast<uint32_t>(mesh.indices.size() / 3) - 1;
    OcctMeshData::FaceRange range;
    range.first = faceFirstTriIndex;
    range.last = faceLastTriIndex;
    mesh.faceRanges.push_back(range);

    globalVertexOffset += static_cast<uint32_t>(nbNodes);
}

// ---------------------------------------------------------------------------
// Extract mesh from a shape by enumerating its faces.
// No external location parameter — face's own location is used directly.
// ---------------------------------------------------------------------------
OcctMeshData ExtractMeshFromShape(const TopoDS_Shape& shape)
{
    OcctMeshData mesh;
    uint32_t globalVertexOffset = 0;

    for (TopExp_Explorer explorer(shape, TopAbs_FACE); explorer.More(); explorer.Next()) {
        const TopoDS_Face& face = TopoDS::Face(explorer.Current());
        ExtractFace(face, mesh, globalVertexOffset);
    }

    return mesh;
}
