#include "importer-utils.hpp"

#include <BRepMesh_IncrementalMesh.hxx>
#include <BRep_Tool.hxx>
#include <TopExp_Explorer.hxx>
#include <TopoDS.hxx>
#include <TopoDS_Face.hxx>
#include <Poly_Triangulation.hxx>
#include <gp_Pnt.hxx>
#include <gp_Vec.hxx>
#include <gp_Dir.hxx>
#include <gp_Trsf.hxx>
#include <TopAbs.hxx>

// ---------------------------------------------------------------------------
void TriangulateShape(const TopoDS_Shape& shape, const ImportParams& params)
{
    BRepMesh_IncrementalMesh mesher(
        shape,
        params.linearDeflection,
        Standard_False,         // isRelative
        params.angularDeflection,
        Standard_True           // inParallel
    );
    mesher.Perform();
}

// ---------------------------------------------------------------------------
OcctMeshData ExtractMeshFromShape(const TopoDS_Shape& shape,
                                  const TopLoc_Location& loc)
{
    OcctMeshData mesh;

    uint32_t globalVertexOffset = 0;

    for (TopExp_Explorer explorer(shape, TopAbs_FACE); explorer.More(); explorer.Next())
    {
        const TopoDS_Face& face = TopoDS::Face(explorer.Current());
        TopLoc_Location faceLoc;
        Handle(Poly_Triangulation) triangulation = BRep_Tool::Triangulation(face, faceLoc);

        if (triangulation.IsNull()) {
            continue;
        }

        // Compose the locations: outer location * face-local location
        TopLoc_Location combinedLoc = loc * faceLoc;
        gp_Trsf trsf;
        if (!combinedLoc.IsIdentity()) {
            trsf = combinedLoc.Transformation();
        }

        bool isReversed = (face.Orientation() == TopAbs_REVERSED);

        uint32_t faceFirstIndex = static_cast<uint32_t>(mesh.indices.size() / 3);

        int nbNodes = triangulation->NbNodes();
        int nbTriangles = triangulation->NbTriangles();

        // --- Vertices ---
        for (int i = 1; i <= nbNodes; ++i)
        {
            gp_Pnt pt = triangulation->Node(i);
            if (!combinedLoc.IsIdentity()) {
                pt.Transform(trsf);
            }
            mesh.positions.push_back(static_cast<float>(pt.X()));
            mesh.positions.push_back(static_cast<float>(pt.Y()));
            mesh.positions.push_back(static_cast<float>(pt.Z()));
        }

        // --- Normals ---
        bool hasNormals = triangulation->HasNormals();
        if (hasNormals) {
            for (int i = 1; i <= nbNodes; ++i)
            {
                gp_Dir normal = triangulation->Normal(i);
                if (!combinedLoc.IsIdentity()) {
                    normal.Transform(trsf);
                }
                if (isReversed) {
                    normal.Reverse();
                }
                mesh.normals.push_back(static_cast<float>(normal.X()));
                mesh.normals.push_back(static_cast<float>(normal.Y()));
                mesh.normals.push_back(static_cast<float>(normal.Z()));
            }
        } else {
            // Fill with zero normals as placeholder
            for (int i = 0; i < nbNodes; ++i) {
                mesh.normals.push_back(0.0f);
                mesh.normals.push_back(0.0f);
                mesh.normals.push_back(0.0f);
            }
        }

        // --- Triangles ---
        for (int i = 1; i <= nbTriangles; ++i)
        {
            int n1, n2, n3;
            triangulation->Triangle(i).Get(n1, n2, n3);

            // OCCT uses 1-based indexing; convert to 0-based + offset
            uint32_t i1 = globalVertexOffset + static_cast<uint32_t>(n1 - 1);
            uint32_t i2 = globalVertexOffset + static_cast<uint32_t>(n2 - 1);
            uint32_t i3 = globalVertexOffset + static_cast<uint32_t>(n3 - 1);

            if (isReversed) {
                mesh.indices.push_back(i1);
                mesh.indices.push_back(i3);
                mesh.indices.push_back(i2);
            } else {
                mesh.indices.push_back(i1);
                mesh.indices.push_back(i2);
                mesh.indices.push_back(i3);
            }
        }

        uint32_t faceLastIndex = static_cast<uint32_t>(mesh.indices.size() / 3) - 1;

        // Record face range (color will be filled later by the caller)
        OcctMeshData::FaceRange range;
        range.first = faceFirstIndex;
        range.last  = faceLastIndex;
        mesh.faceRanges.push_back(range);

        globalVertexOffset += static_cast<uint32_t>(nbNodes);
    }

    return mesh;
}
